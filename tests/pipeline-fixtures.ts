/**
 * The workflow fragments the pipeline-guard suites share.
 *
 * A workflow condition is written in GitHub's own expression syntax, so a
 * fragment that states one carries `${{` literally rather than interpolating
 * anything. Written out in each suite it reads as a template literal that
 * forgot its braces — to a reader and to a linter — so the fragments live here,
 * built from the brace pair once, and a suite composes the definition it needs
 * from them.
 *
 * The definitions themselves stay in the suites: a fixture a rule is driven
 * against belongs beside the case that plants the cheat, and what is shared
 * here is only the vocabulary every one of them writes in.
 *
 * @module
 */

import { MERGE_GATES } from '../scripts/pipeline-guard-gates.ts'

/** The brace pair GitHub's expression syntax opens with, assembled once. */
const OPEN = ['$', '{', '{'].join('')

/**
 * One job- or step-level condition line, at the indent it is written at.
 * @param expression - the expression the condition carries, without its braces.
 * @param indent - the leading spaces the line is written with.
 * @returns the line.
 */
export function condition(expression: string, indent = 4): string {
  return `${' '.repeat(indent)}if: ${OPEN} ${expression} }}`
}

/**
 * The reach an aggregate needs: it is skipped when a job it waits on did not
 * report green, so a refusal written inside it runs only under this condition.
 */
export const AGGREGATE_REACH = condition('!cancelled()')

/**
 * The refusal the aggregate carries: it reads every outcome a waited-on job can
 * report and exits non-zero, so a skipped or cancelled dependency still fails
 * the merge gate.
 */
export const AGGREGATE_REFUSAL = [
  condition("contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')", 4),
  condition("contains(needs.*.result, 'skipped')", 6),
  '    run: exit 1',
].join('\n')

/** One step that runs a pinned gate, as a definition writes it. */
export function gateStep(gate: string): string {
  return `      - run: bun run ${gate}`
}

/**
 * A chain of steps that runs every pinned gate, in the order the gate list
 * declares them, the way the real definition must.
 * @returns the steps, one per line.
 */
export function gateChain(): string {
  return MERGE_GATES.map((gate) => gateStep(gate)).join('\n')
}

/**
 * A step condition that is merely present, and true: the step still runs.
 *
 * A condition that is not one is the shape a reader has to be able to tell
 * apart from a live one, so a suite plants this beside the refusals it refuses.
 */
export const LIVE_STEP_CONDITION = condition("runner.os == 'Linux'", 8)
