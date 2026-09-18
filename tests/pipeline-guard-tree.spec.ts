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

import { describe, expect, it } from 'bun:test'
import { readManifest } from '../scripts/manifest.ts'
import { pipelineViolations } from '../scripts/pipeline-guard.ts'
import { CODE_OWNED_PATHS, WORKFLOW_FILES } from '../scripts/pipeline-guard-rules.ts'
import { ROOT } from '../scripts/source-tree.ts'
import { clearTreesAfterEach, type FixtureTree, fixtureTree } from './fixtures.ts'
import { importRunsNothing, runProgram } from './gate-program.ts'
import { PROGRAMS } from './programs.ts'

/** Where the definitions live, under whichever tree is being read. */
const WORKFLOWS = '.github/workflows'

/** The list naming who must review a change to the pipeline. */
const CODEOWNERS = '.github/CODEOWNERS'

/** The program the merge gate runs. */
const GUARD = PROGRAMS.pipelineGuard

/** This repository's own manifest, which a copied tree is built from. */
const SHIPPED = readManifest(new URL('../package.json', import.meta.url).pathname)

/**
 * The manager pin it carries, which a copied tree carries too.
 * @returns the pin.
 * @throws Error when this repository declares none, which every case below
 * would otherwise read as a pin of no characters.
 */
function shippedPin(): string {
  const pin = SHIPPED['packageManager']
  if (typeof pin !== 'string') throw new Error('this repository declares no packageManager pin')
  return pin
}

/** The manager pin it carries, which a copied tree carries too. */
const SHIPPED_PIN = shippedPin()

/** Trees this suite seated, taken down when each of its cases ends. */
const made: FixtureTree[] = []

clearTreesAfterEach(made)

/**
 * A copy of this repository's own pipeline, in a tree the suite owns.
 *
 * A copy rather than a fabrication: the reader is being asked what it does with
 * a real pipeline, and every case below changes exactly one thing about it, so
 * what a case proves is what that one change did.
 * @param pin - the `packageManager` the copied manifest carries; absent removes
 *   it, and a number is the shape a manifest nobody can read has.
 * @returns the tree.
 */
async function pipelineTree(pin?: string | number): Promise<FixtureTree> {
  const tree = fixtureTree('pipeline-guard')
  made.push(tree)
  await Promise.all(
    WORKFLOW_FILES.map(async (name) =>
      Bun.write(tree.pathOf(`${WORKFLOWS}/${name}`), await Bun.file(`${ROOT}${WORKFLOWS}/${name}`).text()),
    ),
  )
  await Bun.write(tree.pathOf(CODEOWNERS), await Bun.file(`${ROOT}${CODEOWNERS}`).text())
  const rest = Object.fromEntries(Object.entries(SHIPPED).filter(([key]) => key !== 'packageManager'))
  const carried = pin === undefined ? rest : { ...rest, packageManager: pin }
  await Bun.write(tree.pathOf('package.json'), JSON.stringify(carried))
  return tree
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
    const copy = await pipelineTree(SHIPPED_PIN)
    expect(await pipelineViolations(copy.root)).toEqual([])
  })

  it('names a pinned definition that is gone from the tree', async () => {
    const shortened = await pipelineTree(SHIPPED_PIN)
    await Bun.file(shortened.pathOf(`${WORKFLOWS}/mutation.yml`)).delete()
    expect(await pipelineViolations(shortened.root)).toEqual([
      'the workflow definition mutation.yml is gone; the pipeline is shorter than its pinned shape',
    ])
  })

  it('names a definition added beside the pinned set', async () => {
    const added = await pipelineTree(SHIPPED_PIN)
    await Bun.write(added.pathOf(`${WORKFLOWS}/extra.yml`), 'name: extra\n')
    expect(await pipelineViolations(added.root)).toContain(
      'the workflow definition extra.yml is not one of the pinned definitions; two workflows cannot share a check name',
    )
  })

  it('reads a definition written with the other suffix YAML uses', async () => {
    // Both suffixes name a workflow GitHub will run, so a reader that knew only
    // one of them would walk past half a pipeline without saying so.
    const yaml = await pipelineTree(SHIPPED_PIN)
    await Bun.write(yaml.pathOf(`${WORKFLOWS}/extra.yaml`), 'name: extra\n')
    expect(await pipelineViolations(yaml.root)).toContain(
      'the workflow definition extra.yaml is not one of the pinned definitions; two workflows cannot share a check name',
    )
  })

  it('walks past a file in that directory that is not a definition at all', async () => {
    const notes = await pipelineTree(SHIPPED_PIN)
    await Bun.write(notes.pathOf(`${WORKFLOWS}/notes.txt`), 'not a workflow\n')
    expect(await pipelineViolations(notes.root)).toEqual([])
  })
})

describe('the definitions the reader opens', () => {
  it('reads every definition, not the first one it opens', async () => {
    // A softening in the last file read is the one a reader that stopped early
    // would miss.
    const softened = await pipelineTree(SHIPPED_PIN)
    const path = softened.pathOf(`${WORKFLOWS}/release.yml`)
    await Bun.write(path, `${await Bun.file(path).text()}    continue-on-error: true\n`)
    expect(await pipelineViolations(softened.root)).toContain(
      'workflow release.yml: carries "continue-on-error", which lets a run decide nothing',
    )
  })

  it('refuses a merge gate whose step was commented out in the definition', async () => {
    // The whole point of reading a definition rather than counting the names in
    // it: the gate is still written on the line, and nothing runs it.
    const commented = await pipelineTree(SHIPPED_PIN)
    const path = commented.pathOf(`${WORKFLOWS}/ci.yml`)
    const softened = (await Bun.file(path).text()).replace('        run: bun run knip\n', '        # run: knip\n')
    await Bun.write(path, softened)
    expect(await pipelineViolations(commented.root)).toEqual(['workflow ci.yml: the merge gate does not run knip'])
  })
})

describe('the program each definition is held to run', () => {
  it('refuses an audit clock that stopped mutating, and stopped checking the tree', async () => {
    // `mutation.yml` exists for two commands: the audit, and the check that the
    // audit left the tree alone. A clock that ran neither would report a score
    // for a denominator nothing measured, and would report it green.
    const clock = await pipelineTree(SHIPPED_PIN)
    const path = clock.pathOf(`${WORKFLOWS}/mutation.yml`)
    const stopped = (await Bun.file(path).text())
      .replace('        run: bun run mutate\n', '        run: bun run mutate:gates\n')
      .replace('        run: bun run check:tree\n', '')
    await Bun.write(path, stopped)
    expect(await pipelineViolations(clock.root)).toEqual([
      'workflow mutation.yml: nothing runs bun run mutate, which is what this definition is for',
      'workflow mutation.yml: nothing runs bun run check:tree, which is what this definition is for',
    ])
  })
})

describe('the pin the reader holds every workflow to', () => {
  it('names a manifest that pins no package manager, and nothing else', async () => {
    // The whole list: with no version to hold them to, every workflow that runs
    // setup-bun would otherwise be reported as pinning the wrong one — a report
    // naming four faults where the repository has one.
    const unpinned = await pipelineTree()
    expect(await pipelineViolations(unpinned.root)).toEqual([
      'package.json: no bun@x.y.z packageManager pin for the workflows to match',
    ])
  })

  it('names a pin it cannot read at all, rather than treating it as absent', async () => {
    // A manifest carrying `packageManager: 5` is not a manifest that pins
    // nothing; it is one this reader cannot read, and an unreadable pipeline is
    // a red pipeline. Named once: an unreadable pin and an absent one are the
    // same fact about which bun a workflow can be held to.
    const numeric = await pipelineTree(5)
    expect(await pipelineViolations(numeric.root)).toEqual([
      'package.json: the packageManager pin is not a string, so no workflow can be held to it',
    ])
  })

  it('names a manifest that is gone, and goes on reading the definitions', async () => {
    // The manifest declares the gates and the pins, so a tree without one has
    // nothing holding any workflow to anything. One fact about the tree, named
    // once, with every other rule still answered from what the tree does carry.
    const missing = await pipelineTree(SHIPPED_PIN)
    await Bun.file(missing.pathOf('package.json')).delete()
    expect(await pipelineViolations(missing.root)).toEqual([
      'package.json is gone; nothing declares the gates a merge waits on',
    ])
  })
})

describe('what the reader still reports around a pin it cannot read', () => {
  it('goes on reading the rest of the pipeline when the pin is unreadable', async () => {
    // Every violation at once is the whole point of a guard a reviewer reads;
    // stopping at the first one it cannot read turns a report into a headline.
    const unreadable = await pipelineTree(5)
    await Bun.file(unreadable.pathOf(CODEOWNERS)).delete()
    await Bun.file(unreadable.pathOf(`${WORKFLOWS}/mutation.yml`)).delete()
    expect(await pipelineViolations(unreadable.root)).toEqual([
      'package.json: the packageManager pin is not a string, so no workflow can be held to it',
      'the workflow definition mutation.yml is gone; the pipeline is shorter than its pinned shape',
      `${CODEOWNERS} is gone; nothing names who must review the pipeline`,
    ])
  })

  it('names a pin that is a string but not a bun version', async () => {
    // A repository that pins another manager pins no bun at all, and the
    // pattern finds nothing in it — which the reader has to survive rather
    // than read a match out of.
    const foreign = await pipelineTree('pnpm@9.15.4')
    expect(await pipelineViolations(foreign.root)).toEqual([
      'package.json: no bun@x.y.z packageManager pin for the workflows to match',
    ])
  })

  it('reads a pin whose parts are longer than one digit', async () => {
    // `bun@11.44.22` is a version this pattern has to read whole, in all three
    // of its parts; reading one digit of any of them would hold every workflow
    // to a bun nobody pinned.
    const longParts = await pipelineTree('bun@11.44.22')
    const violations = await pipelineViolations(longParts.root)
    expect(violations.filter((line) => line.includes('packageManager'))).toEqual([])
    expect(violations).toContain("workflow ci.yml: setup-bun must pin the manifest's own bun (11.44.22)")
  })
})

describe('the ownership the reader reads', () => {
  it('names a code-owner list that is gone', async () => {
    const unowned = await pipelineTree(SHIPPED_PIN)
    await Bun.file(unowned.pathOf(CODEOWNERS)).delete()
    expect(await pipelineViolations(unowned.root)).toEqual([
      `${CODEOWNERS} is gone; nothing names who must review the pipeline`,
    ])
  })

  it('reads the code-owner list it finds, rather than the fact that it is there', async () => {
    const rewritten = await pipelineTree(SHIPPED_PIN)
    await Bun.write(rewritten.pathOf(CODEOWNERS), '# nobody owns anything\n')
    expect((await pipelineViolations(rewritten.root)).length).toBe(CODE_OWNED_PATHS.length)
  })
})

describe('the pipeline guard as the program the merge gate runs', () => {
  it('says the pipeline is sound, and exits zero', async () => {
    const sound = await pipelineTree(SHIPPED_PIN)
    const gate = await runProgram(GUARD, [], sound.root)
    expect([gate.code, gate.out.trim()]).toEqual([
      0,
      'pipeline guard: every workflow definition is pinned, bounded and unsoftened',
    ])
  })

  it('names every violation it found, counts them, and exits non-zero', async () => {
    const broken = await pipelineTree(SHIPPED_PIN)
    await Bun.file(broken.pathOf(`${WORKFLOWS}/mutation.yml`)).delete()
    await Bun.file(broken.pathOf(CODEOWNERS)).delete()
    const gate = await runProgram(GUARD, [], broken.root)
    expect(gate.code).toBe(1)
    // The whole report, line by line: violations run together on one line carry
    // every word a search would look for and none of the shape a reader needs.
    expect(gate.err).toBe(
      [
        'the pipeline definitions carry 2 violation(s):',
        '  the workflow definition mutation.yml is gone; the pipeline is shorter than its pinned shape',
        `  ${CODEOWNERS} is gone; nothing names who must review the pipeline`,
        '',
      ].join('\n'),
    )
  })

  it('runs nothing when the pipeline guard is imported rather than run', async () => {
    // An empty tree rather than the copied pipeline: a guard that ran on import
    // would read whatever tree it was seated in, and this one has nothing to
    // read — so the import answers, and the module wrote nothing on the way in.
    await importRunsNothing(GUARD, 'pipeline-guard')
  })
})
