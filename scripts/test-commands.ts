/**
 * What each `bun test` command in this repository actually runs.
 *
 * `bun test` reads a positional argument as a path *filter*, not as a path: the
 * shell expands the glob first, and each expanded entry then matches every file
 * whose path contains it. Two silences follow from that, and both have bitten
 * this repository. A filter that selects nothing runs nothing and exits zero
 * beside the live ones, so a renamed suite turns every command that named it by
 * hand into a command that runs less than it says. And a filter that selects
 * more than it names swept a browser suite into the unit run, which needs a
 * built bundle nothing before it in the chain builds.
 *
 * The commands live in two places — the manifest's scripts and the mutation
 * scopes' command runners — and both name their suites by hand, so both are
 * read here rather than in one of the suites that reads them.
 *
 * @module
 */

import { manifestScripts } from './manifest.ts'
import { scopeConfigs } from './stryker-config.ts'

/** One `bun test` command, and where it is written. */
export interface TestCommand {
  /** The file and key that holds it. */
  readonly where: string
  /** The command as it is written. */
  readonly command: string
}

/** The word that takes the next word as its value rather than as a filter. */
const VALUED_FLAG = '--timeout'

/** The words that end one shell statement and begin the next. */
const SEPARATORS = new Set(['&&', ';', '||', '|'])

/**
 * The paths one shell glob expands to, against the files the repository ships.
 *
 * Only `*` is honoured, which is the whole of what the commands use; a pattern
 * carrying anything else expands to nothing here and is refused by name rather
 * than reading as an empty answer.
 * @param pattern - one positional argument from a command.
 * @param files - every spec the repository ships.
 * @returns the paths the shell would hand bun.
 * @throws Error when the pattern uses a shape this reader does not expand.
 */
export function expand(pattern: string, files: readonly string[]): string[] {
  if (/[?[\]{}]/u.test(pattern)) throw new Error(`this reader cannot expand ${pattern}`)
  if (!pattern.includes('*')) return [pattern]
  const source = `^${pattern
    .split('*')
    .map((part) => part.replaceAll(/[.+^$()|\\]/gu, String.raw`\$&`))
    .join('[^/]*')}$`
  const matcher = new RegExp(source, 'u')
  return files.filter((label) => matcher.test(label))
}

/**
 * The filters a command hands bun, with its flags and their values dropped.
 *
 * A command can hold more than one statement — the browser and axe scripts
 * build first and test after — so every `bun test` in it is read, not the
 * first: reading only the first would leave a later run's filters unread,
 * which is the same silence this module exists to refuse.
 * @param command - the command as it is written.
 * @returns the positional words of every `bun test` statement, in order.
 */
export function filtersOf(command: string): string[] {
  const words = command.trim().split(/\s+/u)
  const positional: string[] = []
  for (const [index, word] of words.entries()) {
    if (word !== 'test' || words[index - 1] !== 'bun') continue
    for (let at = index + 1; at < words.length; at += 1) {
      const next = words[at] ?? ''
      if (SEPARATORS.has(next)) break
      if (next === VALUED_FLAG) {
        at += 1
        continue
      }
      if (next.startsWith('-')) continue
      positional.push(next)
    }
  }
  return positional
}

/**
 * Whether one filter selects at least one spec the repository ships.
 *
 * A glob is expanded the way the shell expands it, before bun ever sees it; a
 * plain word is matched the way bun matches it, as a substring of a path.
 * @param filter - the positional word.
 * @param all - every spec the repository ships.
 * @returns true when the filter selects something.
 */
export function selectsSomething(filter: string, all: readonly string[]): boolean {
  if (filter.includes('*')) return expand(filter, all).length > 0
  return all.some((label) => label.includes(filter))
}

/**
 * The specs one filter selects, the way bun and the shell between them do.
 * @param filter - the positional word.
 * @param all - every spec the repository ships.
 * @returns the specs the command would run for that filter.
 */
export function selected(filter: string, all: readonly string[]): string[] {
  if (filter.includes('*')) return expand(filter, all)
  return all.filter((label) => label.includes(filter))
}

/**
 * Every `bun test` command the repository ships, by where it is written.
 * @returns one entry per command, labelled by the file and key that holds it.
 */
export function testCommands(): TestCommand[] {
  const fromScripts = [...manifestScripts()]
    .filter(([, command]) => command.includes('bun test '))
    .map(([name, command]) => ({ where: `package.json script ${name}`, command }))
  const fromScopes = scopeConfigs()
    .map((scope) => ({ where: scope.label, command: scope.command }))
    .filter((entry) => entry.command.includes('bun test '))
  return [...fromScripts, ...fromScopes]
}
