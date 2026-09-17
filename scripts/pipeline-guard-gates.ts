/**
 * Which gates decide a merge, and how a definition is read as running one.
 *
 * The `validate` chain in `package.json` is the manifest of what decides
 * ship-worthiness, and the merge-gate workflow is that chain again as a
 * pipeline. Holding the two to one pinned list is what makes dropping a gate
 * from either of them a change that fails where it is written.
 *
 * A gate is read as run only where something really runs it. Four places write a
 * command and execute nothing: a label that names the gate, a line that has been
 * commented out, a step whose `if:` says it never runs — or a job whose `if:`
 * says the same of every step inside it — and a step that only echoes the
 * command. The same reader holds each definition to the program it exists for
 * and each pinned gate to a script that runs a program.
 *
 * Split from the other rules because reading a gate as run is its own problem: a
 * script name is a prefix of every longer one, and a workflow names things it
 * does not run.
 *
 * @module
 */

import { indentOf, JOB_ID, JOB_SETTING_INDENT } from './pipeline-guard-jobs.ts'
import { MERGE_GATE_WORKFLOW } from './pipeline-guard-rules.ts'

/**
 * The merge gates, pinned by name.
 *
 * The `validate` chain in `package.json` is the manifest of what decides
 * ship-worthiness; this list is the same chain held still, so a gate dropped
 * from the manifest or from the workflow fails here by name. Changing the chain
 * therefore means changing this file, and that change travels through review
 * with the code it re-points.
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
  'check:coverage',
  'knip',
  'lint:rust',
  'test:rust',
  'test:browser',
  'a11y',
]

/**
 * The program each definition exists for, pinned by name.
 *
 * The merge gate is not here: `ci.yml` exists to run the pinned merge gates, and
 * `gateCoverageViolations` holds it to every one of them. What is here is the
 * definition whose whole reason to run is one command — the guard's own
 * workflow, the audit clock, and the release carrier. A definition that stopped
 * running its program reports green having done nothing, and nothing else in
 * this repository reads what a workflow is for.
 */
export const WORKFLOW_PROGRAMS: readonly (readonly [string, string])[] = [
  ['pipeline-guard.yml', 'bun scripts/pipeline-guard.ts'],
  ['mutation.yml', 'bun run mutate'],
  ['mutation.yml', 'bun run check:tree'],
  ['release.yml', 'bun run tauri build'],
]

/** A character a script name continues with, so a longer name is another gate. */
const NAME_CHARACTER = /[\w:.-]/u

/** The characters a statement ends on, so the word after one begins the next. */
const STATEMENT_ENDS = new Set(['&', '|', ';', '\n'])

/** A comment: a `#` at the start of a line, or one whitespace precedes. */
const COMMENT = /(?:^|\s)#/u

/** The key that carries a step's command, and the command written after it. */
const RUN_KEY = /^\s*(?:-\s+)?run:\s*(.*)$/u

/** A `run:` value that opens a block rather than carrying its command inline. */
const BLOCK_SCALAR = /^[|>][+-]?\d*$/u

/** A line that opens a step. */
const STEP_OPENS = /^\s*-\s/u

/** An `if:` whose value is a literal false: what it is written under never runs. */
const NEVER_RUNS = /^\s*(?:-\s+)?if:\s*(?:false|\$\{\{\s*false\s*\}\})\s*$/u

/** The words that run no program: a command made of these decides nothing. */
const NO_PROGRAM = new Set([':', 'true', 'false', 'echo', 'printf', 'exit'])

/** The words that end one shell statement and begin the next. */
const STATEMENT_BREAK = /&&|\|\||[;|]/u

/**
 * One line of a definition with any comment on it removed.
 *
 * A commented line is a line a reviewer reads and a runner never reaches, so a
 * command that has been commented out is a command nothing runs.
 * @param line - one line of the definition.
 * @returns the line up to its comment, or the whole line when it carries none.
 */
export function withoutComment(line: string): string {
  const at = line.search(COMMENT)
  return at === -1 ? line : line.slice(0, at)
}

/** The lines a block scalar carries, read from the key that opened it. */
function blockUnder(lines: readonly string[], at: number): string {
  const indent = indentOf(lines[at] ?? '')
  const carried: string[] = []
  for (const under of lines.slice(at + 1)) {
    if (under.trim() === '') continue
    if (indentOf(under) <= indent) break
    carried.push(under.trim())
  }
  return carried.join('; ')
}

/** The commands one step's lines carry, in the order they are written. */
function commandsOf(step: readonly string[]): string[] {
  const carried: string[] = []
  for (const [at, line] of step.entries()) {
    const found = RUN_KEY.exec(line)
    if (found === null) continue
    const command = (found[1] ?? '').trim()
    carried.push(BLOCK_SCALAR.test(command) ? blockUnder(step, at) : command)
  }
  return carried
}

/**
 * Every command a definition really runs.
 *
 * A step's own `if:` and the `if:` of the job it sits in are both read, and a job
 * whose `if:` is false runs none of its steps. What comes back is the text of
 * every command a runner would reach, so a caller may ask what a definition runs
 * without knowing how a workflow is written.
 * @param text - the definition's contents.
 * @returns one entry per command the definition would execute.
 */
export function workflowCommands(text: string): string[] {
  const lines = text.split('\n').map((line) => withoutComment(line))
  const commands: string[] = []
  let jobRuns = true
  let at = 0
  while (at < lines.length) {
    const line = lines[at] ?? ''
    if (JOB_ID.test(line)) {
      jobRuns = true
      at += 1
      continue
    }
    if (!STEP_OPENS.test(line)) {
      // A job states its own settings at one indent and a step states its own
      // deeper than that, which is what tells a disabled job from a step a
      // later line disables.
      if (indentOf(line) <= JOB_SETTING_INDENT && NEVER_RUNS.test(line)) jobRuns = false
      at += 1
      continue
    }
    let end = at + 1
    while (end < lines.length && !STEP_OPENS.test(lines[end] ?? '') && !JOB_ID.test(lines[end] ?? '')) end += 1
    const step = lines.slice(at, end)
    if (jobRuns && !step.some((one) => NEVER_RUNS.test(one))) commands.push(...commandsOf(step))
    at = end
  }
  return commands
}

/** Whether the word at `at` begins a statement rather than sitting inside one. */
function beginsStatement(text: string, at: number): boolean {
  let back = at - 1
  while (back >= 0 && (text.charAt(back) === ' ' || text.charAt(back) === '\t')) back -= 1
  // Nothing precedes the first command of a text, and nothing is a boundary.
  if (back < 0) return true
  if (STATEMENT_ENDS.has(text.charAt(back))) return true
  return text.charAt(back) === ':' && text.slice(0, back).trimEnd().endsWith('run')
}

/**
 * Whether a text runs exactly this command, from the start of a statement.
 *
 * `bun run lint` is a prefix of `bun run lint:ox`, so a substring read would let
 * the longer gate stand in for the shorter one and a dropped gate would still
 * read as covered. The name must end at a boundary: what follows it may not be a
 * character a script name continues with.
 * @param text - the command text to read.
 * @param command - the command to look for, whole.
 * @returns true when the text runs exactly this command.
 */
export function runsProgram(text: string, command: string): boolean {
  // Scanned rather than matched through a pattern built per call: a pattern
  // assembled at runtime carries its flags as a value, and the flags on an
  // ASCII pattern decide nothing — a knob with no setting that changes the
  // answer. The boundary is the whole of the rule, so it is what is read.
  for (let at = text.indexOf(command); at !== -1; at = text.indexOf(command, at + 1)) {
    // The end of the text is a boundary like any other: nothing continues the
    // name there, and nothing is not a character a name continues with.
    if (NAME_CHARACTER.test(text.charAt(at + command.length))) continue
    if (!beginsStatement(text, at)) continue
    return true
  }
  return false
}

/**
 * Whether a package script carries a statement that runs a program.
 *
 * `"check:tree": ":"` is a pinned gate whose script exits zero having read
 * nothing: the chain runs it, it reports green, and no file was ever opened. A
 * gate that prints a verdict after its work still runs something, which is why
 * every statement of the command is read.
 * @param command - the script's command, as the manifest writes it.
 * @returns true when at least one statement of it runs something.
 */
function runsAProgram(command: string): boolean {
  const firsts = command.split(STATEMENT_BREAK).map((statement) =>
    statement
      .trim()
      .split(/\s+/u)
      .find((word) => word !== '' && !word.includes('=')),
  )
  return firsts.some((program) => program !== undefined && !NO_PROGRAM.has(program))
}

/**
 * Whether each definition runs the program it exists for.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry per program this definition stopped running.
 */
export function workflowProgramViolations(name: string, text: string): string[] {
  const commands = workflowCommands(text)
  return WORKFLOW_PROGRAMS.filter(([workflow]) => workflow === name)
    .filter(([, program]) => !commands.some((command) => runsProgram(command, program)))
    .map(([, program]) => `workflow ${name}: nothing runs ${program}, which is what this definition is for`)
}

/**
 * Whether the merge-gate workflow runs every gate the pinned chain declares.
 * @param name - the definition's file name, for the report.
 * @param text - the definition's contents.
 * @returns one entry per gate the workflow stopped running.
 */
export function gateCoverageViolations(name: string, text: string): string[] {
  if (name !== MERGE_GATE_WORKFLOW) return []
  const commands = workflowCommands(text)
  return MERGE_GATES.filter((gate) => !commands.some((command) => runsProgram(command, `bun run ${gate}`))).map(
    (gate) => `workflow ${name}: the merge gate does not run ${gate}`,
  )
}

/**
 * Whether the manifest declares every pinned gate, and each one runs something.
 * @param scripts - the manifest's scripts, by name.
 * @returns one entry per pinned gate no script declares, and one per gate whose
 *   script runs no program.
 */
export function gateScriptViolations(scripts: ReadonlyMap<string, string>): string[] {
  return MERGE_GATES.flatMap((gate) => {
    const command = scripts.get(gate)
    if (command === undefined) return [`package.json: the gate ${gate} is pinned and no script declares it`]
    return runsAProgram(command)
      ? []
      : [`package.json script ${gate}: runs no program, so the gate it is pinned as decides nothing`]
  })
}

/**
 * Whether the manifest's validate chain still carries every pinned gate.
 * @param scripts - the manifest's scripts, by name.
 * @returns one entry per gate the chain stopped running.
 */
export function validateChainViolations(scripts: ReadonlyMap<string, string>): string[] {
  const chain = scripts.get('validate')
  if (chain === undefined) return ['package.json: the validate chain is gone; nothing decides ship-worthiness']
  return MERGE_GATES.filter((gate) => !runsProgram(chain, `bun run ${gate}`)).map(
    (gate) => `package.json: the validate chain no longer runs ${gate}`,
  )
}
