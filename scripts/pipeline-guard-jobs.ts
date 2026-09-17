/**
 * The pipeline guard's job-graph rule: whether every job the merge gate defines
 * is aggregated into the one check a merge waits on, and whether that aggregate
 * is reached at all.
 *
 * Branch protection requires a check by name, and the name it requires is the
 * aggregate. A job outside that aggregate still runs and still reports, and
 * blocks nothing at all — which is a gate that decides nothing, written as
 * indentation rather than as a softened command. The same is true of an
 * aggregate skipped the moment a job it waits on fails: its refusal is written,
 * and nothing runs it.
 *
 * Split from `pipeline-guard-rules.ts` because reading the graph needs its own
 * readers and that file is at the size the linter allows one. The shape of a
 * definition's lines lives here now, because two readers need it:
 * `pipeline-guard-gates.ts` reads the same job and step indents to tell a step
 * that runs from one whose `if:` says it never does.
 *
 * @module
 */

import { MERGE_GATE_WORKFLOW } from './pipeline-guard-rules.ts'

/**
 * One job id, as a workflow writes it: two spaces of indent, directly under
 * `jobs:`.
 */
export const JOB_ID = /^ {2}[A-Za-z_][\w-]*:\s*$/u

/**
 * How far a job key indents its own settings.
 *
 * `needs:`, `runs-on:` and an `if:` a job states for itself are written here;
 * everything deeper belongs to one of its steps.
 */
export const JOB_SETTING_INDENT = 4

/** The line that opens the block every job is written inside. */
const JOBS_KEY = 'jobs:'

/** A key in the first column, which is where the `jobs:` block ends. */
const TOP_LEVEL_KEY = /^[A-Za-z_]/u

// A colon separates a key from its value only when whitespace or the end of
// the line follows it, and a dash opens a sequence entry only when whitespace
// follows it. `needs:[a]` and `-a` are plain scalars, not a list and not an
// entry, and a reader that took them for one would count a dependency the
// workflow does not have — which is a job reported as waited on that nothing
// waits on.

/** `needs: [a, b]`, the shape that names its jobs on the same line. */
const NEEDS_INLINE = /^\s*needs:\s+\[[^\]]*\]\s*$/u

/** `needs: a`, the shape that names exactly one. */
const NEEDS_ONE = /^\s*needs:\s+[A-Za-z_][\w-]*\s*$/u

/** `needs:` alone, which opens a list written one job to a line. */
const NEEDS_BLOCK = /^\s*needs:\s*$/u

/** `- a`, one job of a list written that way. */
const NEEDS_ITEM = /^\s*-\s+[A-Za-z_][\w-]*\s*$/u

/**
 * The outcomes the aggregating job must refuse, and the exit it must refuse
 * with.
 *
 * Branch protection can require exactly one check, so the aggregate is what a
 * merge waits on. A job that reads only `failure` lets a cancelled or skipped
 * gate through as green — and a job that reads all three and then exits zero
 * has read them for nothing.
 */
const AGGREGATION_TOKENS: readonly string[] = ["'failure'", "'cancelled'", "'skipped'", 'exit 1']

/**
 * The condition that reaches the aggregate when a job it waits on did not
 * report green.
 *
 * A job carrying `needs:` is skipped the moment something it waits on fails or
 * is cancelled, unless its own condition says otherwise — and a skipped job runs
 * no step at all, so the refusal it carries is text nothing executes. What is
 * read here is the job's own condition, never a step's.
 */
const AGGREGATE_REACHES = '!cancelled()'

/**
 * How far one line is indented, in spaces.
 * @param line - the line to measure.
 * @returns the number of spaces before its first other character.
 */
export function indentOf(line: string): number {
  return line.length - line.trimStart().length
}

/**
 * The `jobs:` block of a definition, and nothing above or beside it.
 *
 * `on:` writes its triggers at the same indent a job id is written at, so a
 * read of the whole file counts `push` and `workflow_call` as jobs. The block
 * runs from `jobs:` to the next key in the first column.
 * @param text - the definition's contents.
 * @returns the block's lines, empty when the definition declares no jobs.
 */
export function jobsSection(text: string): string[] {
  const lines = text.split('\n')
  const start = lines.indexOf(JOBS_KEY)
  if (start === -1) return []
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => TOP_LEVEL_KEY.test(line))
  return end === -1 ? rest : rest.slice(0, end)
}

/**
 * Every job id a workflow defines.
 * @param text - the definition's contents.
 * @returns the ids, in the order they are written.
 */
export function jobIds(text: string): string[] {
  // Tested, then read off the line: the id is everything between the indent
  // the shape requires and the colon that ends it, so there is no capture to
  // stand in for when a match is certain to have made one.
  return jobsSection(text)
    .filter((line) => JOB_ID.test(line))
    .map((line) => line.trim().slice(0, -1))
}

/**
 * The lines one job is written on, and nothing beside them.
 *
 * A job's own settings and every step inside it are what a rule about that job
 * reads; the jobs beside it are held to their own.
 * @param text - the definition's contents.
 * @param id - the job's id.
 * @returns the job's own lines, empty when no job carries that id.
 */
export function jobSection(text: string, id: string): string[] {
  const lines = jobsSection(text)
  const start = lines.findIndex((line) => JOB_ID.test(line) && line.trim().slice(0, -1) === id)
  if (start === -1) return []
  const rest = lines.slice(start + 1)
  const end = rest.findIndex((line) => JOB_ID.test(line))
  return end === -1 ? rest : rest.slice(0, end)
}

/** The value written after the first colon on a line. */
function afterColon(line: string): string {
  return line.slice(line.indexOf(':') + 1).trim()
}

/**
 * Every job named by a `needs:`, in either shape YAML writes one.
 *
 * Both the inline list and the block list are read: a rule that knew only one
 * shape would be a rule a rewrite could step around by changing punctuation.
 * @param text - the definition's contents.
 * @returns every job id some job depends on.
 */
export function neededJobs(text: string): string[] {
  const lines = jobsSection(text)
  const named: string[] = []
  for (const [index, line] of lines.entries()) {
    if (NEEDS_INLINE.test(line)) {
      named.push(
        ...line
          .slice(line.indexOf('[') + 1, line.indexOf(']'))
          .split(',')
          .map((word) => word.trim())
          .filter((word) => word !== ''),
      )
      continue
    }
    if (NEEDS_ONE.test(line)) {
      named.push(afterColon(line))
      continue
    }
    if (!NEEDS_BLOCK.test(line)) continue
    // The list runs from the key to the first line that is not one of its
    // items, so a job written after it is not read as one of its dependencies.
    for (const item of lines.slice(index + 1)) {
      if (!NEEDS_ITEM.test(item)) break
      named.push(item.trim().slice(1).trim())
    }
  }
  return named
}

/**
 * Whether a job's own condition reaches it even when something above it did not
 * report green.
 *
 * Only the job's own `if:` is read: a step's condition cannot reach a job that
 * was skipped, so a refusal written inside a skipped job is text nothing runs.
 * @param block - the job's own lines.
 * @returns true when the job carries the condition that reaches it.
 */
function reachedAnyway(block: readonly string[]): boolean {
  return block.some(
    (line) =>
      indentOf(line) <= JOB_SETTING_INDENT && line.trimStart().startsWith('if:') && line.includes(AGGREGATE_REACHES),
  )
}

/**
 * Whether the merge-gate workflow aggregates every job it defines into the one
 * check a merge waits on, and reaches that aggregate when a gate failed.
 *
 * A job nothing depends on decides nothing: branch protection waits on the
 * aggregate, so a gate added beside it — or dropped out of its `needs` — runs,
 * reports, and blocks no merge at all. The aggregate is read for its own
 * condition for the same reason: an aggregate skipped by the failure it exists
 * to report carries a refusal that never runs. Nothing else in this repository
 * reads the shape of the chain, only the commands inside it.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry per job left out of the aggregate, one per token the
 *   aggregating job stopped refusing on, and one when the aggregate is skipped
 *   by the failure it reports.
 */
export function aggregationViolations(name: string, text: string): string[] {
  if (name !== MERGE_GATE_WORKFLOW) return []
  const jobs = jobIds(text)
  if (jobs.length === 0) return [`workflow ${name}: no job is defined, so nothing decides the merge`]
  const needed = neededJobs(text)
  const refusals = AGGREGATION_TOKENS.filter((token) => !text.includes(token)).map(
    (token) => `workflow ${name}: the aggregate does not refuse on ${token}`,
  )
  // A dependency on a name no job carries is read first, because it is also
  // what leaves the job it meant to name standing alone: reporting the graph
  // as ambiguous would name the symptom and hide the typo that caused it.
  const unknown = needed
    .filter((job) => !jobs.includes(job))
    .map((job) => `workflow ${name}: the aggregate waits on ${job}, which is not a job here`)
  if (unknown.length > 0) return [...unknown, ...refusals]
  // Exactly one job may stand outside the dependency graph: the aggregate the
  // merge waits on. Every other job is one it waits for. Two such jobs is a
  // gate branch protection never sees; none is a graph with no aggregate at
  // all.
  const standalone = jobs.filter((job) => !needed.includes(job))
  if (standalone.length === 1) {
    const aggregate = standalone[0] ?? ''
    const unreached = reachedAnyway(jobSection(text, aggregate))
      ? []
      : [
          `workflow ${name}: the aggregate ${aggregate} is skipped when a job it waits on did not report green, so the refusal it carries never runs`,
        ]
    return [...refusals, ...unreached]
  }
  return standalone.length === 0
    ? [`workflow ${name}: every job is waited on, so none of them is the aggregate`, ...refusals]
    : [
        `workflow ${name}: ${standalone.join(', ')} are each waited on by nothing; exactly one job aggregates the rest`,
        ...refusals,
      ]
}
