/**
 * The pipeline guard's job-graph rule: whether every job the merge gate defines
 * is aggregated into the one check a merge waits on.
 *
 * Branch protection requires a check by name, and the name it requires is the
 * aggregate. A job outside that aggregate still runs and still reports, and
 * blocks nothing at all — which is a gate that decides nothing, written as
 * indentation rather than as a softened command. Split from
 * `pipeline-guard-rules.ts` because reading the graph needs its own readers
 * and that file is at the size the linter allows one.
 *
 * @module
 */

import { MERGE_GATE_WORKFLOW } from './pipeline-guard-rules.ts'

/** One job id, as a workflow writes it: two spaces of indent, directly under `jobs:`. */
const JOB_ID = /^ {2}[A-Za-z_][\w-]*:$/u

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
 * Whether the merge-gate workflow aggregates every job it defines into the one
 * check a merge waits on.
 *
 * A job nothing depends on decides nothing: branch protection waits on the
 * aggregate, so a gate added beside it — or dropped out of its `needs` — runs,
 * reports, and blocks no merge at all. Nothing else in this repository reads
 * the shape of the chain, only the commands inside it.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry per job left out of the aggregate, and one per token the
 *   aggregating job stopped refusing on.
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
  if (standalone.length === 1) return refusals
  return standalone.length === 0
    ? [`workflow ${name}: every job is waited on, so none of them is the aggregate`, ...refusals]
    : [
        `workflow ${name}: ${standalone.join(', ')} are each waited on by nothing; exactly one job aggregates the rest`,
        ...refusals,
      ]
}
