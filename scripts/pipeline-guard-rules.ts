/**
 * The pipeline guard's rules: what a workflow definition may and may not say.
 *
 * Each rule reads a definition the way a reviewer would — as lines in files —
 * and returns the lines that break it, so a report names the cheat instead of
 * describing it. A rule that finds nothing returns an empty list; a definition
 * a rule cannot read fails closed through the reader in `pipeline-guard.ts`.
 *
 * @module
 */

/** The workflow that carries the merge gates the branch protection requires. */
export const MERGE_GATE_WORKFLOW = 'ci.yml'

/** The one workflow a schedule may live in: the audit clock gates no merge. */
export const SCHEDULED_WORKFLOW = 'mutation.yml'

/**
 * Every workflow definition the pipeline may carry, pinned by name.
 *
 * Two workflows cannot run the same job id without one check shadowing the
 * other on the same commit, so a definition added beside these is a definition
 * the rules here were never written for. Widening the set means changing this
 * file, and that change travels through review with the pipeline it adds to.
 */
export const WORKFLOW_FILES: readonly string[] = ['ci.yml', 'mutation.yml', 'pipeline-guard.yml', 'release.yml']

/** Where the review ownership of the pipeline and its gates is declared. */
export const CODE_OWNERS_FILE = '.github/CODEOWNERS'

/**
 * The merge gates, pinned by name.
 *
 * The `validate` chain in `package.json` is the manifest of what decides
 * ship-worthiness; this list is the same chain held still, so a gate dropped
 * from the manifest or from the workflow fails here by name. Changing the
 * chain therefore means changing this file, and that change travels through
 * review with the code it re-points.
 */
export const MERGE_GATES: readonly string[] = [
  'lint',
  'check:tree',
  'check:outdated',
  'check:cargo',
  'lint:ox',
  'check:styles',
  'check:bans',
  'check:entries',
  'check:registry',
  'typecheck',
  'build',
  'test',
  'knip',
  'lint:rust',
  'test:rust',
  'test:browser',
  'a11y',
]

/**
 * Tokens that let a run report without deciding, or run what no review read.
 *
 * `continue-on-error` reports past a failure; `pull_request_target` runs a
 * pull request's head with the base repository's secrets; `paths-ignore`
 * decides whole trees never reached a gate; `docker://` runs an image instead
 * of a reviewed action; `contents: write` arms a pipeline that gates merges
 * with the one permission that can rewrite the repository; the rest launder a
 * failing command into a passing one.
 */
export const FORBIDDEN_IN_WORKFLOWS: readonly string[] = [
  'continue-on-error',
  'pull_request_target',
  'paths-ignore',
  '|| true',
  'passWithNoTests',
  '--no-verify',
  'docker://',
  'contents: write',
]

/** Tokens that turn a package script into one that cannot fail. */
export const FORBIDDEN_IN_SCRIPTS: readonly string[] = ['|| true', '; true', 'exit 0', 'passWithNoTests', '--no-verify']

/** The path prefixes a reviewer of the pipeline and its gates must own. */
export const CODE_OWNED_PATHS: readonly string[] = [
  '.github/',
  '/package.json',
  '/bunfig.toml',
  '/biome.json',
  '/.oxlintrc.json',
  '/knip.json',
  '/stryker.',
  '/tsconfig',
  '/scripts/',
  '/tests/',
]

/** An action reference whose commit cannot move after the fact. */
const IMMUTABLE_ACTION = /^[\w.-]+\/[\w.-]+(?:\/[\w.-]+)?@[0-9a-f]{40}$/u

/** One `uses:` line, which is the only way a workflow runs outside code. */
const ACTION_REFERENCE = /^\s*(?:-\s+)?uses:\s*(\S+)\s*$/gmu

/**
 * Every action reference a definition carries that can change after a review.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry per mutable reference; local reusable workflows are local code.
 */
export function actionRefViolations(name: string, text: string): string[] {
  return [...text.matchAll(ACTION_REFERENCE)].flatMap((match) => {
    const reference = match[1] ?? ''
    if (reference.startsWith('./')) return []
    if (IMMUTABLE_ACTION.test(reference)) return []
    return [
      `workflow ${name}: an action reference must be a full commit sha or a local reusable workflow: ${reference}`,
    ]
  })
}

/**
 * Every place a definition carries a token the pipeline may not carry.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @param tokens - the forbidden tokens.
 * @returns one entry per token that appears.
 */
export function forbiddenTokenViolations(name: string, text: string, tokens: readonly string[]): string[] {
  return tokens.flatMap((token) =>
    text.includes(token) ? [`workflow ${name}: carries ${JSON.stringify(token)}, which lets a run decide nothing`] : [],
  )
}

/**
 * Whether every checkout drops the credentials it does not need.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry when a checkout keeps the token a review never asked for.
 */
export function checkoutCredentialViolations(name: string, text: string): string[] {
  const checkouts = [...text.matchAll(/actions\/checkout@/gu)].length
  const locked = [...text.matchAll(/persist-credentials:\s*false/gu)].length
  return checkouts === locked
    ? []
    : [
        `workflow ${name}: ${String(checkouts)} checkout(s) against ${String(locked)} persist-credentials: false; every checkout drops the token`,
      ]
}

/**
 * Whether every job is bounded, so a hang cannot hold the gate open.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry when a job runs without a timeout.
 */
export function timeoutViolations(name: string, text: string): string[] {
  const jobs = [...text.matchAll(/runs-on:/gu)].length
  const bounded = [...text.matchAll(/timeout-minutes:/gu)].length
  return jobs === bounded
    ? []
    : [`workflow ${name}: ${String(jobs)} job(s) against ${String(bounded)} timeout(s); every job is bounded`]
}

/**
 * Whether the workflows run the manifest's own bun, not whatever is newest.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @param version - the version the manifest pins.
 * @returns one entry when setup-bun runs without the manifest's version.
 */
export function bunVersionViolations(name: string, text: string, version: string): string[] {
  if (!text.includes('oven-sh/setup-bun')) return []
  return text.includes(`bun-version: ${version}`)
    ? []
    : [`workflow ${name}: setup-bun must pin the manifest's own bun (${version})`]
}

/**
 * Whether an install is locked to the manifest's lockfile.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry when a workflow resolves what the registry carries today.
 */
export function installViolations(name: string, text: string): string[] {
  if (!text.includes('bun install')) return []
  return text.includes('--frozen-lockfile')
    ? []
    : [`workflow ${name}: an install must be locked to the manifest's lockfile with --frozen-lockfile`]
}

/**
 * Whether a schedule appears outside the one workflow that gates no merge.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry when a clock decides something it was never asked to.
 */
export function scheduleViolations(name: string, text: string): string[] {
  return text.includes('schedule:') && name !== SCHEDULED_WORKFLOW
    ? [`workflow ${name}: only ${SCHEDULED_WORKFLOW} may carry a schedule; a clock is not a merge decision`]
    : []
}

/**
 * Whether the text runs exactly this gate, and not a longer name that begins
 * the same way.
 *
 * `bun run lint` is a prefix of `bun run lint:ox`, so a substring read would
 * let the longer gate stand in for the shorter one and a dropped gate would
 * still read as covered. The gate's name must end at a boundary: what follows
 * it may not be a character a script name continues with.
 * @param text - the chain or the definition to read.
 * @param gate - the gate's name in the manifest.
 * @returns true when the text runs exactly this gate.
 */
function runsGate(text: string, gate: string): boolean {
  return new RegExp(`bun run ${gate}(?![\\w:.-])`, 'u').test(text)
}

/**
 * Whether the merge-gate workflow runs every gate the pinned chain declares.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry per gate the workflow stopped running.
 */
export function gateCoverageViolations(name: string, text: string): string[] {
  if (name !== MERGE_GATE_WORKFLOW) return []
  return MERGE_GATES.filter((gate) => !runsGate(text, gate)).map(
    (gate) => `workflow ${name}: the merge gate does not run ${gate}`,
  )
}

/**
 * Whether the manifest's validate chain still carries every pinned gate.
 * @param scripts - the manifest's scripts, by name.
 * @returns one entry per gate the chain stopped running.
 */
export function validateChainViolations(scripts: Readonly<Record<string, string>>): string[] {
  const chain = scripts['validate']
  if (chain === undefined) return ['package.json: the validate chain is gone; nothing decides ship-worthiness']
  return MERGE_GATES.filter((gate) => !runsGate(chain, gate)).map(
    (gate) => `package.json: the validate chain no longer runs ${gate}`,
  )
}

/**
 * Whether any package script carries a token that stops it failing.
 * @param scripts - the manifest's scripts, by name.
 * @returns one entry per laundered script.
 */
export function scriptViolations(scripts: Readonly<Record<string, string>>): string[] {
  return Object.entries(scripts).flatMap(([name, command]) =>
    FORBIDDEN_IN_SCRIPTS.filter((token) => command.includes(token)).map(
      (token) => `package.json script ${name}: carries ${JSON.stringify(token)}`,
    ),
  )
}

/**
 * Whether the pipeline carries exactly its pinned set of workflow definitions.
 * @param names - every workflow definition on disk, by file name.
 * @returns one entry per missing definition, and one per definition that was added.
 */
export function workflowSetViolations(names: readonly string[]): string[] {
  return [
    ...WORKFLOW_FILES.filter((name) => !names.includes(name)).map(
      (name) => `the workflow definition ${name} is gone; the pipeline is shorter than its pinned shape`,
    ),
    ...names
      .filter((name) => !WORKFLOW_FILES.includes(name))
      .map(
        (name) =>
          `the workflow definition ${name} is not one of the pinned definitions; two workflows cannot share a check name`,
      ),
  ]
}

/**
 * Whether the code-owner list still names an owner for the pipeline and gates.
 * @param text - the code-owner list's contents.
 * @returns one entry per path prefix nothing owns.
 */
export function codeOwnersViolations(text: string): string[] {
  return CODE_OWNED_PATHS.filter((path) => !text.includes(path)).map(
    (path) => `${CODE_OWNERS_FILE}: no ownership entry covers ${path}`,
  )
}
