/**
 * The reader that walks a pipeline, and the program the merge gate runs.
 *
 * `pipeline-guard.spec.ts` drives every rule against text. This drives what
 * turns a tree into that text: which files are read, which are walked past,
 * what happens when one is missing, and what a reader and a shell are told when
 * the answer is not empty. Between the repository, which is clean, and a path
 * that does not exist, nothing said any of it.
 *
 * Every case works on a copy of this repository's own pipeline with exactly one
 * thing changed, so what a case proves is what that one change did.
 *
 * @module
 */

import { afterEach, describe, expect, it } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readManifest } from '../scripts/manifest.ts'
import { pipelineViolations } from '../scripts/pipeline-guard.ts'
import { CODE_OWNED_PATHS, WORKFLOW_FILES } from '../scripts/pipeline-guard-rules.ts'
import { ROOT } from '../scripts/source-tree.ts'

/** Where the definitions live, under whichever tree is being read. */
const WORKFLOWS = join('.github', 'workflows')

/** The program the merge gate runs, by absolute path. */
const GUARD = new URL('../scripts/pipeline-guard.ts', import.meta.url).pathname

/** This repository's own manifest, which a copied tree is built from. */
const SHIPPED = readManifest(new URL('../package.json', import.meta.url).pathname)

/**
 * The manager pin it carries, which a copied tree carries too.
 * @returns the pin.
 * @throws Error when this repository declares none, which every case below
 * would otherwise read as a pin of no characters.
 */
function shippedPin(): string {
  const pin = SHIPPED.packageManager
  if (typeof pin !== 'string') throw new Error('this repository declares no packageManager pin')
  return pin
}

/** The manager pin it carries, which a copied tree carries too. */
const SHIPPED_PIN = shippedPin()

/** Trees this suite made, removed when it ends. */
const made: string[] = []

afterEach(async () => {
  await Promise.all(made.splice(0).map(async (root) => await rm(root, { recursive: true, force: true })))
})

/**
 * A copy of this repository's own pipeline, in a tree the suite owns.
 *
 * A copy rather than a fabrication: the reader is being asked what it does with
 * a real pipeline, and every case below changes exactly one thing about it, so
 * what a case proves is what that one change did.
 * @param pin - the `packageManager` the copied manifest carries; absent removes
 *   it, and a number is the shape a manifest nobody can read has.
 * @returns the tree's root.
 */
async function pipelineTree(pin?: string | number): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'pipeline-guard-'))
  made.push(root)
  await mkdir(join(root, WORKFLOWS), { recursive: true })
  await Promise.all(
    WORKFLOW_FILES.map(async (name) =>
      Bun.write(join(root, WORKFLOWS, name), await Bun.file(join(ROOT, WORKFLOWS, name)).text()),
    ),
  )
  await Bun.write(join(root, '.github', 'CODEOWNERS'), await Bun.file(join(ROOT, '.github', 'CODEOWNERS')).text())
  const rest = Object.fromEntries(Object.entries(SHIPPED).filter(([key]) => key !== 'packageManager'))
  const carried = pin === undefined ? rest : { ...rest, packageManager: pin }
  await Bun.write(join(root, 'package.json'), JSON.stringify(carried))
  return root
}

describe('the pipeline this repository ships', () => {
  it('is clean under every rule at once', async () => {
    expect(await pipelineViolations(ROOT)).toEqual([])
  })

  it('fails closed when the definitions it must read are missing', async () => {
    // A tree it cannot read stops the reader instead of reporting green: an
    // unreadable pipeline is a red pipeline, never a silent pass.
    await expect(pipelineViolations('/nonexistent-repository')).rejects.toThrow()
  })
})

describe('the reader that walks a pipeline', () => {
  // The rules above are driven against text. What walks a tree — which files it
  // reads, which it ignores, and what it does when one is missing — was driven
  // against exactly two trees: this repository, which is clean, and a path that
  // does not exist. Between them, nothing said what the reader reads.
  it('finds nothing wrong with a copy of the pipeline this repository ships', async () => {
    expect(await pipelineViolations(await pipelineTree(SHIPPED_PIN))).toEqual([])
  })

  it('names a pinned definition that is gone from the tree', async () => {
    const root = await pipelineTree(SHIPPED_PIN)
    await rm(join(root, WORKFLOWS, 'mutation.yml'))
    expect(await pipelineViolations(root)).toEqual([
      'the workflow definition mutation.yml is gone; the pipeline is shorter than its pinned shape',
    ])
  })

  it('names a definition added beside the pinned set', async () => {
    const root = await pipelineTree(SHIPPED_PIN)
    await writeFile(join(root, WORKFLOWS, 'extra.yml'), 'name: extra\n')
    expect(await pipelineViolations(root)).toContain(
      'the workflow definition extra.yml is not one of the pinned definitions; two workflows cannot share a check name',
    )
  })

  it('reads a definition written with the other suffix YAML uses', async () => {
    // Both suffixes name a workflow GitHub will run, so a reader that knew only
    // one of them would walk past half a pipeline without saying so.
    const root = await pipelineTree(SHIPPED_PIN)
    await writeFile(join(root, WORKFLOWS, 'extra.yaml'), 'name: extra\n')
    expect(await pipelineViolations(root)).toContain(
      'the workflow definition extra.yaml is not one of the pinned definitions; two workflows cannot share a check name',
    )
  })

  it('walks past a file in that directory that is not a definition at all', async () => {
    const root = await pipelineTree(SHIPPED_PIN)
    await writeFile(join(root, WORKFLOWS, 'notes.txt'), 'not a workflow\n')
    expect(await pipelineViolations(root)).toEqual([])
  })
})

describe('the definitions the reader opens', () => {
  it('reads every definition, not the first one it opens', async () => {
    // A softening in the last file read is the one a reader that stopped early
    // would miss.
    const root = await pipelineTree(SHIPPED_PIN)
    const path = join(root, WORKFLOWS, 'release.yml')
    await writeFile(path, `${await Bun.file(path).text()}    continue-on-error: true\n`)
    expect(await pipelineViolations(root)).toContain(
      'workflow release.yml: carries "continue-on-error", which lets a run decide nothing',
    )
  })
})

describe('the pin the reader holds every workflow to', () => {
  it('names a manifest that pins no package manager, and nothing else', async () => {
    // The whole list: with no version to hold them to, every workflow that runs
    // setup-bun would otherwise be reported as pinning the wrong one — a report
    // naming four faults where the repository has one.
    expect(await pipelineViolations(await pipelineTree())).toEqual([
      'package.json: no bun@x.y.z packageManager pin for the workflows to match',
    ])
  })

  it('names a pin it cannot read at all, rather than treating it as absent', async () => {
    // A manifest carrying `packageManager: 5` is not a manifest that pins
    // nothing; it is one this reader cannot read, and an unreadable pipeline is
    // a red pipeline. Named once: an unreadable pin and an absent one are the
    // same fact about which bun a workflow can be held to.
    expect(await pipelineViolations(await pipelineTree(5))).toEqual([
      'package.json: the packageManager pin is not a string, so no workflow can be held to it',
    ])
  })
})

describe('what the reader still reports around a pin it cannot read', () => {
  it('goes on reading the rest of the pipeline when the pin is unreadable', async () => {
    // Every violation at once is the whole point of a guard a reviewer reads;
    // stopping at the first one it cannot read turns a report into a headline.
    const root = await pipelineTree(5)
    await rm(join(root, '.github', 'CODEOWNERS'))
    await rm(join(root, WORKFLOWS, 'mutation.yml'))
    expect(await pipelineViolations(root)).toEqual([
      'package.json: the packageManager pin is not a string, so no workflow can be held to it',
      'the workflow definition mutation.yml is gone; the pipeline is shorter than its pinned shape',
      `${join('.github', 'CODEOWNERS')} is gone; nothing names who must review the pipeline`,
    ])
  })

  it('names a pin that is a string but not a bun version', async () => {
    // A repository that pins another manager pins no bun at all, and the
    // pattern finds nothing in it — which the reader has to survive rather
    // than read a match out of.
    expect(await pipelineViolations(await pipelineTree('pnpm@9.15.4'))).toEqual([
      'package.json: no bun@x.y.z packageManager pin for the workflows to match',
    ])
  })

  it('reads a pin whose parts are longer than one digit', async () => {
    // `bun@11.44.22` is a version this pattern has to read whole, in all three
    // of its parts; reading one digit of any of them would hold every workflow
    // to a bun nobody pinned.
    const violations = await pipelineViolations(await pipelineTree('bun@11.44.22'))
    expect(violations.filter((line) => line.includes('packageManager'))).toEqual([])
    expect(violations).toContain("workflow ci.yml: setup-bun must pin the manifest's own bun (11.44.22)")
  })
})

describe('the ownership the reader reads', () => {
  it('names a code-owner list that is gone', async () => {
    const root = await pipelineTree(SHIPPED_PIN)
    await rm(join(root, '.github', 'CODEOWNERS'))
    expect(await pipelineViolations(root)).toEqual([
      `${join('.github', 'CODEOWNERS')} is gone; nothing names who must review the pipeline`,
    ])
  })

  it('reads the code-owner list it finds, rather than the fact that it is there', async () => {
    const root = await pipelineTree(SHIPPED_PIN)
    await writeFile(join(root, '.github', 'CODEOWNERS'), '# nobody owns anything\n')
    expect((await pipelineViolations(root)).length).toBe(CODE_OWNED_PATHS.length)
  })
})

describe('the pipeline guard as the program the merge gate runs', () => {
  it('says the pipeline is sound, and exits zero', async () => {
    const root = await pipelineTree(SHIPPED_PIN)
    const run = Bun.spawn([process.execPath, GUARD], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    const printed = await new Response(run.stdout).text()
    expect([await run.exited, printed.trim()]).toEqual([
      0,
      'pipeline guard: every workflow definition is pinned, bounded and unsoftened',
    ])
  })

  it('names every violation it found, counts them, and exits non-zero', async () => {
    const root = await pipelineTree(SHIPPED_PIN)
    await rm(join(root, WORKFLOWS, 'mutation.yml'))
    await rm(join(root, '.github', 'CODEOWNERS'))
    const run = Bun.spawn([process.execPath, GUARD], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    const complaint = await new Response(run.stderr).text()
    expect(await run.exited).toBe(1)
    // The whole report, line by line: violations run together on one line carry
    // every word a search would look for and none of the shape a reader needs.
    expect(complaint).toBe(
      [
        'the pipeline definitions carry 2 violation(s):',
        '  the workflow definition mutation.yml is gone; the pipeline is shorter than its pinned shape',
        `  ${join('.github', 'CODEOWNERS')} is gone; nothing names who must review the pipeline`,
        '',
      ].join('\n'),
    )
  })

  it('runs nothing when it is imported rather than run', async () => {
    const root = await pipelineTree(SHIPPED_PIN)
    const source = `await import(${JSON.stringify(GUARD)})\nprocess.stdout.write('imported')\n`
    const run = Bun.spawn([process.execPath, '-e', source], { cwd: root, stdout: 'pipe', stderr: 'pipe' })
    expect([await run.exited, await new Response(run.stdout).text()]).toEqual([0, 'imported'])
  })
})
