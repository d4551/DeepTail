/**
 * The pipeline's own gate: the reader that walks every workflow definition and
 * reports the rules it breaks, by name.
 *
 * A pipeline that decides whether the repository ships is text that nothing
 * else re-reads, so it is exactly the text worth rewriting first. This module
 * reads the definitions under `.github/workflows`, the package manifest and
 * the code-owner list, applies every rule in `pipeline-guard-rules.ts` and
 * `pipeline-guard-jobs.ts`, and
 * fails closed: a definition the rules cannot read is a violation, never an
 * absence of one. The suite in `tests/pipeline-guard.spec.ts` drives each rule
 * against synthetic definitions that carry the cheat, then drives every rule
 * at once against the repository's own pipeline.
 *
 * @module
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { aggregationViolations } from './pipeline-guard-jobs.ts'
import {
  actionRefViolations,
  bunVersionViolations,
  checkoutCredentialViolations,
  codeOwnersViolations,
  FORBIDDEN_IN_WORKFLOWS,
  forbiddenTokenViolations,
  gateCoverageViolations,
  installViolations,
  scheduleViolations,
  scriptViolations,
  timeoutViolations,
  validateChainViolations,
  workflowSetViolations,
} from './pipeline-guard-rules.ts'

/** Where every workflow definition lives. */
const WORKFLOW_DIRECTORY = '.github/workflows'

/** The manifest's own bun pin, which is the version every workflow must run. */
const PACKAGE_MANAGER_BUN = /bun@(\d+\.\d+\.\d+)/u

/** One workflow definition read as text. */
interface WorkflowFile {
  readonly name: string
  readonly text: string
}

/**
 * Every violation the pipeline definitions carry, by name.
 * @param root - the repository root the definitions live under.
 * @returns one entry per rule a definition breaks; empty when the pipeline is sound.
 */
export async function pipelineViolations(root: string = '.'): Promise<readonly string[]> {
  const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')) as {
    packageManager?: string
    scripts?: Record<string, string>
  }
  const version = PACKAGE_MANAGER_BUN.exec(manifest.packageManager ?? '')?.[1]
  const scripts = manifest.scripts ?? {}
  const violations = [
    ...validateChainViolations(scripts),
    ...scriptViolations(scripts),
    ...(version === undefined ? ['package.json: no bun@x.y.z packageManager pin for the workflows to match'] : []),
  ]
  const names = (await readdir(join(root, WORKFLOW_DIRECTORY)))
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .toSorted()
  violations.push(...workflowSetViolations(names))
  const files: readonly WorkflowFile[] = await Promise.all(
    names.map(async (name) => ({ name, text: await readFile(join(root, WORKFLOW_DIRECTORY, name), 'utf8') })),
  )
  for (const file of files) {
    violations.push(...workflowViolations(file, version))
  }
  violations.push(...(await ownershipViolations(root)))
  return violations
}

/**
 * Every rule one workflow definition breaks.
 * @param file - the definition, read as text.
 * @param version - the bun version the manifest pins, when it pins one.
 * @returns one entry per broken rule.
 */
function workflowViolations(file: WorkflowFile, version: string | undefined): string[] {
  return [
    ...actionRefViolations(file.name, file.text),
    ...forbiddenTokenViolations(file.name, file.text, FORBIDDEN_IN_WORKFLOWS),
    ...checkoutCredentialViolations(file.name, file.text),
    ...timeoutViolations(file.name, file.text),
    ...installViolations(file.name, file.text),
    ...scheduleViolations(file.name, file.text),
    ...gateCoverageViolations(file.name, file.text),
    ...aggregationViolations(file.name, file.text),
    ...(version === undefined ? [] : bunVersionViolations(file.name, file.text, version)),
  ]
}

/**
 * Whether the code-owner list still exists and still owns the pipeline.
 * @param root - the repository root the list lives under.
 * @returns one entry when the list is gone or leaves a path unowned.
 */
async function ownershipViolations(root: string): Promise<string[]> {
  const present = (await readdir(join(root, '.github'))).includes('CODEOWNERS')
  if (!present) return [`${join('.github', 'CODEOWNERS')} is gone; nothing names who must review the pipeline`]
  return codeOwnersViolations(await readFile(join(root, '.github', 'CODEOWNERS'), 'utf8'))
}

/** Guarded, as every runnable script here is: importing a module must run nothing. */
if (import.meta.main) {
  const violations = await pipelineViolations()
  if (violations.length > 0) {
    process.stderr.write(
      `the pipeline definitions carry ${String(violations.length)} violation(s):\n${violations
        .map((line) => `  ${line}`)
        .join('\n')}\n`,
    )
    process.exit(1)
  }
  process.stdout.write('pipeline guard: every workflow definition is pinned, bounded and unsoftened\n')
}
