/**
 * The stack policy bans: what the workspace must not install, and what it must
 * ship exactly one of.
 *
 * A floor table can only refuse a version below a line; it cannot refuse a
 * framework the design system retired, a config file for a pipeline that no
 * longer runs, a second page shell, or a package manager pin that drifted from
 * the runtime. These are the policies stated as tests, so a reintroduction
 * fails where it is written rather than where a user meets it.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { coerce, gte } from 'semver'
import { readJsonc } from '../scripts/jsonc.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { everyDependency, lockfileNames } from './manifests.ts'

/**
 * The UI frameworks this product retired, by name.
 *
 * The design system is tokens.css and shipped sheets only: a utility pipeline
 * or a component framework is a second vocabulary no gate reads. Installing
 * one — at any version — is the regression, so the check is absence, not a
 * floor. The prefix checks cover the scoped packages each framework publishes.
 */
const RETIRED_FRAMEWORKS = new Set([
  'daisyui',
  'tailwindcss',
  'htmx.org',
  'alpinejs',
  'jquery',
  'bootstrap',
  'bootstrap-icons',
  'bulma',
  'foundation-sites',
  'materialize-css',
  'semantic-ui',
  'uikit',
  'animate.css',
])

/**
 * Whether a package name belongs to a framework the design system retired.
 * @param name - the package name, as a manifest or a lockfile writes it.
 * @returns true when the name is one of the retired frameworks or their scopes.
 */
function isRetiredFramework(name: string): boolean {
  return RETIRED_FRAMEWORKS.has(name) || name.startsWith('@tailwindcss/') || name.startsWith('@daisyui/')
}

describe('the stack policy bans', () => {
  it('installs none of the UI frameworks the design system retired', async () => {
    // Absence, not a floor: a retired framework at its newest version is still
    // a second vocabulary the tokens and the sheets never read. The manifests
    // and the lockfile are both read, so a declaration that never resolves
    // cannot hide in either.
    const declared = [...(await everyDependency()).keys()]
    expect(declared.filter((name) => isRetiredFramework(name))).toEqual([])
    expect([...lockfileNames()].filter((name) => isRetiredFramework(name))).toEqual([])
  })

  it('ships no legacy pipeline configuration file', () => {
    // The v3-and-earlier pipeline was configured by a file; the v4-and-later
    // one compiles away inside the build. Either is a pipeline this product
    // retired, and a config file is the shape a reintroduction takes first.
    const legacy = repositoryFiles(['.js', '.cjs', '.mjs', '.ts', '.json', '.yml', '.yaml', '.toml'])
      .map((file) => file.label)
      .filter((label) =>
        /(?:^|\/)(?:tailwind|postcss|daisyui|purgecss|autoprefixer)\.config\b|\.postcssrc\b/u.test(label),
      )
    expect(legacy).toEqual([])
  })

  it('ships exactly one page, wired to exactly the one module entry', async () => {
    // A second page is a second shell, and a second script entry is a
    // per-page module the design system and the gates never read: the SSOT is
    // one page loading one module.
    const pages = repositoryFiles(['.html', '.htm']).map((file) => file.label)
    expect(pages).toEqual(['apps/deeptail/index.html'])
    const html = await readFile('apps/deeptail/index.html', 'utf8')
    const entries = [...html.matchAll(/<script\b([^>]*)>/gu)].map((match) => match[1] ?? '')
    expect(entries).toEqual([' type="module" src="/src/main.ts"'])
  })

  it('runs on a bun at the floor, and pins the manager to exactly what runs', async () => {
    const manifest = readJsonc(await readFile('package.json', 'utf8'))
    const manager = typeof manifest.packageManager === 'string' ? manifest.packageManager : ''
    const match = /^bun@(\d+\.\d+\.\d+)$/u.exec(manager)
    if (match === null) throw new Error('package.json must pin the package manager as bun@x.y.z')
    if (match[1] === undefined) throw new Error('the bun pin is unreadable')
    const pinned = coerce(match[1] ?? '')
    if (pinned === null) throw new Error('the bun pin is unreadable')
    expect(gte(pinned, '1.4.0')).toBe(true)
    // The pin and the runtime drift apart silently — an upgraded bun with a
    // stale pin, or a pin ahead of the binary — so the pin must say exactly
    // what runs, and moving either is a decision this test witnesses.
    expect(Bun.version).toBe(match[1])
  })
})
