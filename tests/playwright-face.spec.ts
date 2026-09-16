/**
 * The Playwright API the installed release superseded, driven against the exact
 * cheat it exists for and against every browser suite this repository ships.
 *
 * The face is read from the installed release's own declarations, and each case
 * below names an API that release replaced — so the check cannot be answered by
 * remembering a list of names.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { playwrightFaceOffences } from './playwright-face.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** The installed Playwright's declarations, and where the browser suites live. */
const PLAYWRIGHT_TYPES = 'apps/deeptail/node_modules/playwright-core/types/types.d.ts'
const BROWSER_DIRECTORY = 'apps/deeptail/tests/'

describe('the Playwright API the installed release superseded', () => {
  it('names a superseded call, a superseded option key written either way, and a live member', async () => {
    const declarations = await readFile(PLAYWRIGHT_TYPES, 'utf8')
    expect(playwrightFaceOffences(declarations, 'a.spec.ts', 'await page.waitForNavigation()\n')).toEqual([
      {
        label: 'a.spec.ts',
        line: 1,
        why: 'waitForNavigation is a Playwright ≤1.62 API; This method is inherently racy, please use [page.waitForURL(url[, options])](https://playwright.dev/docs/api/class-page#page-wait-for-url) instead.',
      },
    ])
    expect(playwrightFaceOffences(declarations, 'a.spec.ts', 'await page.type("input", "x")\n')).toEqual([
      {
        label: 'a.spec.ts',
        line: 1,
        why: 'type is a Playwright ≤1.62 API; it is @deprecated on every interface a browser suite drives (use fill or pressSequentially)',
      },
    ])
    const logger =
      'logger is a Playwright ≤1.62 API; The logs received by the logger are incomplete. Please use tracing instead.'
    // An option key is a key however it is quoted, and a key nothing marks is
    // left alone: the quoted half is the branch a bare identifier never reaches.
    expect(playwrightFaceOffences(declarations, 'a.spec.ts', 'await browserType.launch({ logger: sink })\n')).toEqual([
      { label: 'a.spec.ts', line: 1, why: logger },
    ])
    expect(playwrightFaceOffences(declarations, 'a.spec.ts', "await browserType.launch({ 'logger': sink })\n")).toEqual(
      [{ label: 'a.spec.ts', line: 1, why: logger }],
    )
    expect(
      playwrightFaceOffences(declarations, 'a.spec.ts', "await browserType.launch({ 'headless': false })\n"),
    ).toEqual([])
    // `first` is deprecated on `FrameLocator` and current on `Locator`: a reader
    // that went by name alone would refuse this click.
    expect(playwrightFaceOffences(declarations, 'a.spec.ts', 'await page.locator("a").first().click()\n')).toEqual([])
    expect(playwrightFaceOffences(declarations, 'a.spec.ts', 'const broken = defineConfig({\n')).toEqual([
      { label: 'a.spec.ts', line: 1, why: 'it does not parse, so no API it uses can be read' },
    ])
  })
})

describe('the installed Playwright face in the tree', () => {
  it(
    'holds every browser suite this repository ships',
    async () => {
      const declarations = await readFile(PLAYWRIGHT_TYPES, 'utf8')
      const suites = repositoryFiles(['.ts']).filter((file) => file.label.startsWith(BROWSER_DIRECTORY))
      expect(suites.length).toBeGreaterThan(0)
      const offences = await Promise.all(
        suites.map(async (suite) =>
          playwrightFaceOffences(declarations, suite.label, await readFile(suite.path, 'utf8')),
        ),
      )
      expect(offences.flat()).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})
