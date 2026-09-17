/**
 * Stack floors and checker configuration.
 *
 * A toolchain that silently slips back a version, or a checker that is
 * quietly switched off, is a regression no other gate reports: the build still
 * succeeds and every other suite stays green. These assertions read the
 * manifests and the source that actually ship. The policy bans — the retired
 * UI frameworks, the legacy pipeline configs, the one-page shell and the bun
 * pin — live in `stack-policy.spec.ts`, and the retired idioms a correct
 * version number can still carry live in `stack-patterns.spec.ts`.
 *
 * The floors are held to the pins deliberately, at the exact version the
 * manifests declare. A floor written below what is installed can never fail, so
 * it rots into decoration: stated at the major and minor alone it admitted
 * every patch downgrade inside the same minor, and an upgrade said nothing.
 * Holding the two equal means a downgrade of any depth fails here and an
 * upgrade has to be stated here, and every tool the repository installs must
 * appear, so nothing joins without a floor.
 *
 * The floors and the line each tool was on before them are stated once in
 * `stack-policy.ts`, and the readers are in `stack-floors.ts`. The cases here
 * drive both in both directions: the whole table at its floors, and the whole
 * table one step below them.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { coerce, major, maxSatisfying, satisfies } from 'semver'
import { EMPTY_SECTION, isJsonObject, readJsonc } from '../scripts/jsonc.ts'
import { everyDependency } from './manifests.ts'
import { belowFloor, floorsWithNoStep, previousLineGaps, stepBelow, unstatedFloors } from './stack-floors.ts'
import { FLOORS, PREVIOUS_LINES } from './stack-policy.ts'

describe('stack floors', () => {
  it('states a floor for everything it declares, at exactly the version declared', () => {
    const declared = everyDependency()
    expect(unstatedFloors(declared)).toEqual([])
  })

  it('holds every declared version at or above its floor', () => {
    const declared = everyDependency()
    expect(belowFloor(declared)).toEqual([])
  })

  it('holds the floors to the exact set the manifests declare', () => {
    // A floor for something nothing declares is a floor that can never be
    // checked, and a declaration nothing floors is the hole the case above
    // reports. The two sets must name exactly each other.
    const declared = new Set(everyDependency().keys())
    const floored = new Set(Object.keys(FLOORS))
    expect([...declared].filter((name) => !floored.has(name))).toEqual([])
    expect([...floored].filter((name) => !declared.has(name))).toEqual([])
  })

  it('reads a range the way semver does, so a caret and a pin are held alike', () => {
    // The reader is `coerce`, which reads the first version out of a range. The
    // whole floor table is driven, with one entry replaced by each shape the
    // manifests carry: the readable ones sit at their floors, and a shape no
    // version can be read out of is reported rather than silently passing.
    const shapes = new Map([
      ['caret', '^1.2.3'],
      ['tilde', '~2.3.4'],
      ['exact', '3.4.5'],
      ['workspace', 'workspace:*'],
    ])
    for (const [shape, range] of shapes) {
      const driven = new Map([...Object.entries(FLOORS), ['typescript', range]])
      const read = belowFloor(driven)
      if (shape === 'workspace') {
        expect(read).toEqual(['typescript declares an unreadable range: workspace:*'])
      } else {
        expect(read).toEqual([`typescript ${range} is below the 7.0.2 floor`])
      }
    }
  })
})

describe('stack floors report the repository as it stands', () => {
  it('reports nothing when every tool sits at exactly its floor', () => {
    // The other half of every refusal below: the whole table, driven at the
    // version each entry states. A reader that reported one of these would
    // report the shipped toolchain as behind.
    const atTheFloor = new Map(Object.entries(FLOORS))
    expect(belowFloor(atTheFloor)).toEqual([])
    expect(unstatedFloors(atTheFloor)).toEqual([])
  })
})

describe('stack floors refuse the previous line of every tool this stack runs on', () => {
  it('names each one, at the version it would really be declared at', () => {
    // The reintroduction this table exists for: not a number invented here, but
    // the line each tool was on before the one it ships, read from that tool's
    // own feed and stated once in `stack-policy.ts`.
    const driven = new Map([...Object.entries(FLOORS), ...Object.entries(PREVIOUS_LINES)])
    expect(belowFloor(driven)).toEqual([
      '@axe-core/playwright 4.12.1 is below the 4.13.0 floor',
      '@biomejs/biome 1.9.4 is below the 2.5.14 floor',
      '@stryker-mutator/core 9.6.1 is below the 10.0.0 floor',
      '@tauri-apps/api 1.6.0 is below the 2.11.1 floor',
      '@types/bun 1.3.9 is below the 1.4.2 floor',
      'knip 5.63.0 is below the 6.36.0 floor',
      'oxlint 0.16.0 is below the 1.83.0 floor',
      'playwright 1.62.1 is below the 1.63.0 floor',
      'react 18.3.1 is below the 19.3.0 floor',
      'typescript 6.9.2 is below the 7.0.2 floor',
      'vite 7.3.6 is below the 8.3.0 floor',
    ])
  })

  it('states every previous line below the floor of the tool it belongs to', () => {
    // The table is only evidence while it sits behind the floor it names: an
    // entry that drifted to or past the floor would be refused by nothing and
    // would read as a case that passes.
    expect(previousLineGaps()).toEqual([])
    expect(Object.keys(PREVIOUS_LINES).length).toBeGreaterThan(0)
  })
})

describe('stack floors refuse a step back inside the same line', () => {
  it('names a downgrade of a single step for every floor that has one', () => {
    // The gap class the suite's own header describes: a floor stated at the
    // major and minor admitted `7.0.1` against a `7.0` floor, so the pin could
    // walk backwards a patch at a time with every gate green. Every entry in
    // the table is driven one step back, rather than two of them by hand.
    const driven = new Map(Object.entries(FLOORS))
    const expected: string[] = []
    for (const [name, floor] of Object.entries(FLOORS)) {
      const step = stepBelow(floor)
      if (step === undefined) continue
      driven.set(name, step)
      expected.push(`${name} ${step} is below the ${floor} floor`)
    }
    expect(belowFloor(driven)).toEqual(expected)
    // The floor a step cannot be taken from is named rather than passed over:
    // a table where every entry could be stepped back would mean the guard
    // above answers for no entry at all.
    expect(floorsWithNoStep()).toEqual(['@stryker-mutator/core'])
    expect(expected.length).toBeGreaterThan(0)
  })

  it('names the shallowest step of all, which a floor at the major and minor admits', () => {
    // Stated by hand as well, so the derived case above cannot agree with a
    // reader that has drifted: Biome one patch back and TypeScript one patch
    // back are the two the repository itself shipped a floor for.
    const driven = new Map([...Object.entries(FLOORS), ['@biomejs/biome', '2.5.13'], ['typescript', '7.0.1']])
    expect(belowFloor(driven)).toEqual([
      '@biomejs/biome 2.5.13 is below the 2.5.14 floor',
      'typescript 7.0.1 is below the 7.0.2 floor',
    ])
  })
})

describe('stack floors refuse a rollback of the whole major', () => {
  it('names one for every floored tool, which no step inside its own major can', () => {
    // The coarser version of the same cheat, driven over the entire table: the
    // line before this one, whether that is the previous major or — for the
    // packages still on a nought major — the minor before it.
    const driven = new Map(Object.entries(FLOORS))
    const expected: string[] = []
    for (const [name, floor] of Object.entries(FLOORS)) {
      const parts = floor.split('.')
      const head = Number(parts[0] ?? '0')
      const line = head > 0 ? `${head - 1}.0.0` : `0.${Number(parts[1] ?? '0') - 1}.0`
      driven.set(name, line)
      expected.push(`${name} ${line} is below the ${floor} floor`)
    }
    expect(belowFloor(driven)).toEqual(expected)
    expect(expected.length).toBe(Object.keys(FLOORS).length)
  })

  it('holds TypeScript at major 7, not 6', () => {
    const pinned = coerce(everyDependency().get('typescript'))
    if (pinned === null) throw new Error('typescript is not declared')
    expect(major(pinned)).toBe(7)
  })

  it('holds every tool this stack runs on one line below the line its floor states', () => {
    // Each previous line and its floor are adjacent lines of the same tool: the
    // major above it, or the same major where the tool has not moved one in
    // years. An entry naming a version several majors back would be a refusal
    // nothing is at risk of.
    const wrong: string[] = []
    for (const [name, version] of Object.entries(PREVIOUS_LINES)) {
      const floor = FLOORS[name]
      if (floor === undefined) continue
      const before = major(version)
      const now = major(floor)
      if (now !== before + 1 && now !== before) wrong.push(`${name} moved from major ${before} to major ${now}`)
    }
    expect(wrong).toEqual([])
  })
})

describe('stack floors read a range', () => {
  it('reports the highest version a range admits, not the one it names', () => {
    // `maxSatisfying` is what the outdated gate reads, so a range that admits a
    // version above the floor is held by what the range admits, not by the
    // example version inside it.
    expect(maxSatisfying(['1.2.3', '1.9.0'], '^1.2.3')).toBe('1.9.0')
    expect(satisfies('1.9.0', '^1.2.3')).toBe(true)
    expect(satisfies('2.0.0', '^1.2.3')).toBe(false)
  })
})

describe('the Node floor', () => {
  it('admits the versions the manifest states and refuses the ones below them', async () => {
    // Driven off the declared engine range rather than a remembered number: a
    // manifest widened to admit an older runtime fails the first line, and one
    // that drops the current line fails the last.
    const manifest = readJsonc(await readFile('package.json', 'utf8'))
    const engines = isJsonObject(manifest.engines) ? manifest.engines : EMPTY_SECTION
    const node = typeof engines.node === 'string' ? engines.node : ''
    expect(node).not.toBe('')
    expect(satisfies('22.18.0', node)).toBe(false)
    expect(satisfies('22.19.0', node)).toBe(true)
    expect(satisfies('23.5.0', node)).toBe(false)
    expect(satisfies('24.0.0', node)).toBe(true)
    expect(satisfies('26.6.1', node)).toBe(true)
  })
})

describe('the checker configuration', () => {
  it('runs the TypeScript compiler the manifest pins, with no parallel checker', async () => {
    const manifest = readJsonc(await readFile('package.json', 'utf8'))
    const scripts = isJsonObject(manifest.scripts) ? manifest.scripts : EMPTY_SECTION
    const typecheck = typeof scripts.typecheck === 'string' ? scripts.typecheck : ''
    expect(typecheck).toContain('tsc')
    expect(typecheck).not.toContain('tsgo')
  })

  it('reads the bun cache out of the installer configuration, not out of the air', async () => {
    // bunfig.toml is TOML, which the JSONC reader does not read; the line is
    // read where it is written, inside the installer section, so a cache moved
    // outside `[install]` — or off the workspace entirely — fails here.
    const config = await readFile('bunfig.toml', 'utf8')
    const install = config.slice(config.indexOf('[install]'), config.indexOf('[test]'))
    expect(install).toContain('linker = "isolated"')
    expect(install).toContain('dir = ".tmp-bun/cache"')
  })

  it('keeps every linter category enabled', async () => {
    const config = readJsonc(await readFile('.oxlintrc.json', 'utf8'))
    const categories = isJsonObject(config.categories) ? config.categories : EMPTY_SECTION
    const rules = isJsonObject(config.rules) ? config.rules : EMPTY_SECTION
    for (const category of ['correctness', 'suspicious', 'perf', 'pedantic']) {
      expect(categories[category]).toBe('error')
    }
    // A rule dropped to warn or info silences as much as one switched off:
    // `off` alone was the hole this suite's own header describes.
    expect(Object.values(rules).filter((level) => level !== 'error')).toEqual([])
    // The linter carries no ignore list: what it reads is decided by the
    // repository's own ship list, not by a second list here.
    expect(config.ignorePatterns).toBeUndefined()
    expect(config.overrides).toBeUndefined()
  })
})
