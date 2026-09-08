/**
 * Which gates decide a merge, and how a definition is read as running one.
 *
 * The `validate` chain in `package.json` is the manifest of what decides
 * ship-worthiness, and the merge-gate workflow is that chain again as a
 * pipeline. Holding the two to one pinned list is what makes dropping a gate
 * from either of them a change that fails where it is written.
 *
 * Split from the other rules because reading a gate as run is its own problem:
 * a script name is a prefix of every longer one, and a workflow names things it
 * does not run.
 *
 * @module
 */

import { MERGE_GATE_WORKFLOW } from './pipeline-guard-rules.ts'

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

/** A character a script name continues with, so a longer name is another gate. */
const NAME_CHARACTER = /[\w:.-]/u

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
  const run = `bun run ${gate}`
  // Scanned rather than matched through a pattern built per call: a pattern
  // assembled at runtime carries its flags as a value, and the flags on an
  // ASCII pattern decide nothing — a knob with no setting that changes the
  // answer. The boundary is the whole of the rule, so it is what is read.
  for (let at = text.indexOf(run); at !== -1; at = text.indexOf(run, at + 1)) {
    // The end of the text is a boundary like any other: nothing continues the
    // name there, and nothing is not a character a name continues with.
    if (!NAME_CHARACTER.test(text.charAt(at + run.length))) return true
  }
  return false
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
