/**
 * What each test command actually runs.
 *
 * `bun test` reads a positional argument as a path *filter*, not as a path: the
 * shell expands `tests/*.spec.ts` to a list, and every entry then matches each
 * file whose path contains it. `tests/zz-probe.spec.ts` therefore also
 * selected `apps/deeptail/tests/zz-probe.spec.ts`, so the unit command swept a
 * browser spec that needs a built bundle — a precondition nothing before it in
 * the gate chain established. The suffix below is what keeps the unit command
 * to the suites it can drive from a clean checkout.
 *
 * The browser suites are told apart by name rather than by directory, because
 * a name is what the filter matches. Nothing else holds that apart, so it is
 * held here.
 *
 * A filter that selects nothing is the other half of the same problem, and it
 * is silent: `bun test a b` where `a` names a spec and `b` names nothing exits
 * zero, having run only `a`. So a renamed spec turns every command that named
 * it by hand into a command that runs less than it says, and reports the same
 * green. Every command the repository ships is read here for that, the
 * mutation scopes' included, because they name their suites by hand too.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { repositoryFiles } from '../scripts/source-tree.ts'

/** Where the browser suites live, and the suffix that keeps them out of the unit run. */
const BROWSER_DIRECTORY = 'apps/deeptail/tests/'
const BROWSER_SUFFIX = '.browser.spec.ts'

/** Every spec the repository ships, by directory. */
function specs(): { readonly browser: string[]; readonly unit: string[] } {
  const all = repositoryFiles(['.spec.ts']).map((file) => file.label)
  return {
    browser: all.filter((label) => label.startsWith(BROWSER_DIRECTORY)),
    unit: all.filter((label) => !label.startsWith(BROWSER_DIRECTORY)),
  }
}

/**
 * The positional arguments the `test` script hands bun, read from the manifest
 * rather than restated here.
 *
 * Restating them is what this file was doing, and it made the case below a
 * claim about a command nobody had read: the script could have been changed to
 * `bun test .` and every assertion would still have passed while the unit run
 * swept the whole browser suite.
 * @returns the shell words after `bun test`, flags dropped.
 */
function unitTestArguments(): string[] {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
  const script = manifest.scripts?.['test'] ?? ''
  const words = script.trim().split(/\s+/u)
  const start = words.indexOf('test')
  if (words[0] !== 'bun' || start === -1) throw new Error(`the test script is not a bun test run: ${script}`)
  return words.slice(start + 1).filter((word) => !word.startsWith('-'))
}

/**
 * The paths one shell glob expands to, against the files the repository ships.
 *
 * Only `*` is honoured, which is the whole of what the script uses; a pattern
 * carrying anything else expands to nothing here and is refused by name rather
 * than reading as an empty answer.
 * @param pattern - one positional argument from the script.
 * @param files - every spec the repository ships.
 * @returns the paths the shell would hand bun.
 */
function expand(pattern: string, files: readonly string[]): string[] {
  if (/[?[\]{}]/u.test(pattern)) throw new Error(`this reader cannot expand ${pattern}`)
  if (!pattern.includes('*')) return [pattern]
  const source = `^${pattern
    .split('*')
    .map((part) => part.replaceAll(/[.+^$()|\\]/gu, String.raw`\$&`))
    .join('[^/]*')}$`
  const matcher = new RegExp(source, 'u')
  return files.filter((label) => matcher.test(label))
}

/** The word that takes the next word as its value rather than as a filter. */
const VALUED_FLAG = '--timeout'

/**
 * Every `bun test` command the repository ships, by where it is written.
 *
 * The manifest's scripts and the mutation scopes' command runners are the only
 * two places one lives, and both name their suites by hand.
 * @returns one entry per command, labelled by the file and key that holds it.
 */
function testCommands(): { readonly where: string; readonly command: string }[] {
  const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
  const fromScripts = Object.entries(manifest.scripts ?? {})
    .filter(([, command]) => command.includes('bun test '))
    .map(([name, command]) => ({ where: `package.json script ${name}`, command }))
  const fromScopes = repositoryFiles(['.json'])
    .filter((file) => /^stryker\..*\.json$/u.test(file.label))
    .map((file) => {
      const config = JSON.parse(readFileSync(file.path, 'utf8')) as { commandRunner?: { command?: string } }
      return { where: file.label, command: config.commandRunner?.command ?? '' }
    })
    .filter((entry) => entry.command.includes('bun test '))
  return [...fromScripts, ...fromScopes]
}

/** The words that end one shell statement and begin the next. */
const SEPARATORS = new Set(['&&', ';', '||', '|'])

/**
 * The filters a command hands bun, with its flags and their values dropped.
 *
 * A command can hold more than one statement — the browser and axe scripts
 * build first and test after — so every `bun test` in it is read, not the
 * first: reading only the first would leave a later run's filters unread,
 * which is the same silence this file exists to refuse.
 * @param command - the command as it is written.
 * @returns the positional words of every `bun test` statement, in order.
 */
function filtersOf(command: string): string[] {
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
function selectsSomething(filter: string, all: readonly string[]): boolean {
  if (filter.includes('*')) return expand(filter, all).length > 0
  return all.some((label) => label.includes(filter))
}

describe('the suites the gate chain runs', () => {
  it('names every browser spec so the unit command cannot select it', () => {
    const { browser } = specs()
    expect(browser.length).toBeGreaterThan(0)
    expect(browser.filter((label) => !label.endsWith(BROWSER_SUFFIX))).toEqual([])
  })

  it('shares no file name between a unit spec and a browser spec', () => {
    // The filter matches on the whole path, so two specs of the same name in
    // different trees are one filter that selects both. The suffix above makes
    // that impossible; this is what says so when it stops being true.
    const { browser, unit } = specs()
    const browserNames = new Set(browser.map((label) => label.slice(label.lastIndexOf('/') + 1)))
    const collisions = unit.filter((label) => browserNames.has(label.slice(label.lastIndexOf('/') + 1)))
    expect(collisions).toEqual([])
  })

  it('selects no browser spec when the script’s own arguments are expanded and matched', () => {
    // The arguments the manifest actually carries, expanded the way the shell
    // expands them, then matched the way bun matches them: as substrings of a
    // path, not as paths.
    const { browser } = specs()
    const all = [...browser, ...specs().unit]
    const filters = unitTestArguments().flatMap((pattern) => expand(pattern, all))
    expect(filters.length).toBeGreaterThan(0)
    const selected = browser.filter((label) => filters.some((filter) => label.includes(filter)))
    expect(selected).toEqual([])
  })
})

describe('the filters each command hands bun', () => {
  it('hands bun no filter that selects nothing, in any command the repository ships', () => {
    // A dead filter is silent: bun runs the live ones, exits zero, and the
    // command reports the same green while running less than it names.
    const all = repositoryFiles(['.spec.ts']).map((file) => file.label)
    const dead = testCommands().flatMap(({ where, command }) =>
      filtersOf(command)
        .filter((filter) => !selectsSomething(filter, all))
        .map((filter) => `${where}: ${filter}`),
    )
    expect(dead).toEqual([])
  })

  it('finds a command in every place one is written, rather than reading none', () => {
    // The case above passes over an empty list, which is what it would read if
    // either reader stopped finding commands. Both places must answer.
    const commands = testCommands()
    expect(commands.filter(({ where }) => where.startsWith('package.json')).length).toBeGreaterThan(0)
    expect(commands.filter(({ where }) => where.startsWith('stryker.')).length).toBeGreaterThan(0)
    expect(commands.filter(({ command }) => filtersOf(command).length === 0)).toEqual([])
  })
})

describe('the readers that decide what a command runs', () => {
  it('names a dead filter when it is given one, rather than only ever being green', () => {
    // The case above has only ever been seen green, which makes it a claim
    // until the predicate under it is driven against the cheat it must catch.
    const all = ['tests/pins.spec.ts', 'apps/deeptail/tests/a11y.browser.spec.ts']
    expect(selectsSomething('tests/pins.spec.ts', all)).toBe(true)
    expect(selectsSomething('apps/deeptail/tests', all)).toBe(true)
    expect(selectsSomething('tests/*.spec.ts', all)).toBe(true)
    // The two shapes a rename leaves behind: a name that matches nothing, and
    // a glob that expands to nothing. `bun test` runs the live filters beside
    // either of these and exits zero, which is the silence being refused.
    expect(selectsSomething('tests/renamed-away.spec.ts', all)).toBe(false)
    expect(selectsSomething('tests/renamed-*.spec.ts', all)).toBe(false)
  })

  it('reads the filters of every statement in a command, past its flags', () => {
    // The build-then-test shape the browser and axe scripts use, with the flag
    // that takes a value: reading `60000` as a filter, or stopping at the
    // first statement, would each turn this reader into one that reports on a
    // command nobody runs.
    const command = 'bun run --filter @app build && bun test a.spec.ts --timeout 60000 b.spec.ts && echo done'
    expect(filtersOf(command)).toEqual(['a.spec.ts', 'b.spec.ts'])
    expect(filtersOf('bun test x.spec.ts && bun test y.spec.ts')).toEqual(['x.spec.ts', 'y.spec.ts'])
    expect(filtersOf('bun run test:browser')).toEqual([])
  })

  it('reads arguments out of the script rather than assuming them', () => {
    // If this returned nothing, the case above would be green whatever the
    // script said, because an empty filter list selects nothing.
    const args = unitTestArguments()
    expect(args.length).toBeGreaterThan(0)
    expect(args.every((word) => word.endsWith('.spec.ts'))).toBe(true)
  })
})

describe('the gates the chain runs', () => {
  it('runs every gate script the manifest declares', () => {
    // A gate script that exists and is not in `validate` is a gate nobody
    // runs. Two of these were suites until the mutation runs made that
    // impossible — a suite that reads the whole tree cannot judge a mutation
    // of the modules it reads — so the chain is where they live now, and this
    // is what says so when one falls out of it.
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
    const scripts = manifest.scripts ?? {}
    const gates = Object.keys(scripts).filter((name) => name.startsWith('check:'))
    expect(gates.length).toBeGreaterThan(0)
    const chain = scripts['validate'] ?? ''
    expect(gates.filter((gate) => !chain.includes(`bun run ${gate}`))).toEqual([])
  })

  it('names a reader that ships, for each gate script it declares', () => {
    // Each names a module in `scripts/`, so the rule it enforces is the rule
    // that module's own fixtures prove: one gate, read twice, never two. That
    // the named module exists is what is checked; what it does is checked
    // where it is driven.
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
    const scripts = manifest.scripts ?? {}
    const shipped = new Set(repositoryFiles(['.ts']).map((file) => file.label))
    const missing = Object.entries(scripts)
      .filter(([name]) => name.startsWith('check:'))
      .flatMap(([name, command]) => {
        const path = /bun\s+(scripts\/[\w-]+\.ts)/u.exec(command)?.[1]
        return path !== undefined && shipped.has(path) ? [] : [`${name}: ${command}`]
      })
    expect(missing).toEqual([])
  })
})
