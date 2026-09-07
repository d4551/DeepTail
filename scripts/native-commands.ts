/**
 * The command names the native half registers, read off the handler list.
 *
 * A command name is spelled on two planes: Rust registers the function in
 * `generate_handler!`, and the page invokes it by name. Nothing held the two
 * together, so a name added on one side, renamed on one side, or misspelled on
 * either type-checks, builds and ships: `invoke` takes a string, and the call
 * fails when a person presses the control.
 *
 * The list is read rather than restated. A gate that carried its own copy of
 * the fifteen names would be a third spelling of the same contract, and the
 * one most likely to be forgotten.
 *
 * @module
 */

/** The macro call that registers every command the native half answers to. */
const HANDLER_LIST = /generate_handler!\s*\[([^\]]*)\]/u

/** One command path inside the list, with whatever module qualifies it. */
const COMMAND_PATH = /(?:^|,)\s*(?:[A-Za-z_][\w]*\s*::\s*)*([A-Za-z_][\w]*)\s*(?=,|$)/gu

/** A line comment, which the macro list may carry between entries. */
const LINE_COMMENT = /\/\/[^\n]*/gu

/**
 * Every command the handler list registers.
 *
 * Returns undefined when the list is not there at all, so a renamed macro or a
 * moved registration is a refusal rather than an empty answer — an empty answer
 * reads exactly like a native half that registers nothing.
 * @param source - the Rust source that registers the commands.
 * @returns the command names in the order registered, or undefined when the
 * source carries no handler list.
 */
export function registeredCommands(source: string): string[] | undefined {
  const list = HANDLER_LIST.exec(source)
  if (list === null) return undefined
  const body = (list[1] ?? '').replaceAll(LINE_COMMENT, '')
  return [...body.matchAll(COMMAND_PATH)].map((found) => found[1] ?? '')
}

/**
 * The names one side registers and the other does not, in both directions.
 * @param registered - what the native half answers to.
 * @param invoked - what the page is able to name.
 * @returns one line per name that lives on only one plane.
 */
export function commandDrift(registered: readonly string[], invoked: readonly string[]): string[] {
  const answered = new Set(registered)
  const named = new Set(invoked)
  return [
    ...registered
      .filter((command) => !named.has(command))
      .map((command) => `${command} is registered natively and the page cannot name it`),
    ...invoked
      .filter((command) => !answered.has(command))
      .map((command) => `${command} is named by the page and the native half does not answer it`),
  ]
}
