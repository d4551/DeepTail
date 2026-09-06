/**
 * What each test command actually runs.
 *
 * `bun test` reads a positional argument as a path *filter*, not as a path: the
 * shell expands `tests/*.spec.ts` to a list, and every entry then matches any
 * file whose path merely contains it. `tests/zz-probe.spec.ts` therefore also
 * selected `apps/deeptail/tests/zz-probe.spec.ts`, so the unit command silently
 * ran a browser spec — one that needs a built bundle, which nothing before it
 * in the gate chain produced. It passed only on a machine that had already
 * built, and `bun run validate` could not pass from a clean checkout at all.
 *
 * The browser suites are told apart by name rather than by directory, because
 * a name is what the filter matches. Nothing else holds that apart, so it is
 * held here.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
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

  it('runs no browser spec under the unit command’s own filters', () => {
    // The filters the `test` script expands to, matched the way bun matches
    // them: a browser spec selected by any of them is one the unit run would
    // execute without a bundle to serve.
    const { browser, unit } = specs()
    const filters = unit.filter((label) => label.startsWith('tests/') || label.startsWith('packages/'))
    const selected = browser.filter((label) => filters.some((filter) => label.includes(filter)))
    expect(selected).toEqual([])
  })
})
