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
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readManifest, scriptChain } from '../scripts/manifest.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'

/** Where the browser suites live, and the suffix that keeps them out of the unit run. */
const BROWSER_DIRECTORY = 'apps/deeptail/tests/'
const BROWSER_SUFFIX = '.browser.spec.ts'

/** The manifest whose scripts this suite is written about. */
const MANIFEST = 'package.json'

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
  const script = readManifest(MANIFEST).scripts.get('test') ?? ''
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
    const scripts = readManifest(MANIFEST).scripts
    const gates = [...scripts.keys()].filter((name) => name.startsWith('check:'))
    expect(gates.length).toBeGreaterThan(0)
    // Followed through the scripts it names rather than read as one line: the
    // entry point delegates, and a reader that only looked at its own text
    // would have reported every gate missing the moment it did.
    const chain = scriptChain((name) => scripts.get(name), 'validate')
    expect(gates.filter((gate) => !chain.has(gate))).toEqual([])
  })

  it('names a reader that ships, for each gate script it declares', () => {
    // Each names a module in `scripts/`, so the rule it enforces is the rule
    // that module's own fixtures prove: one gate, read twice, never two. That
    // the named module exists is what is checked; what it does is checked
    // where it is driven.
    const shipped = new Set(repositoryFiles(['.ts']).map((file) => file.label))
    const missing = [...readManifest(MANIFEST).scripts]
      .filter(([name]) => name.startsWith('check:'))
      .flatMap(([name, command]) => {
        // Every module the command names, not the first one: `check:styles`
        // runs two, and reading one of them left the other free to be renamed
        // out of existence with this still green.
        const named = [...command.matchAll(/bun\s+(scripts\/[\w-]+\.ts)/gu)].map((found) => found[1] ?? '')
        const unshipped = named.filter((path) => !shipped.has(path))
        return named.length > 0 && unshipped.length === 0 ? [] : [`${name}: ${command}`]
      })
    expect(missing).toEqual([])
  })
})
