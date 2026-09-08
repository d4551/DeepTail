/**
 * The faces the registry is compiled into, and the shapes they are written in.
 *
 * `actions.spec.ts` compares the four generated files against what these
 * emitters produce from the shipped registry, which proves the two agree but
 * says nothing about registries the repository does not yet hold. The wrapping
 * rules only ever fire near the formatter's width, the quoting rule only fires
 * on a name carrying an apostrophe, and the native table's pricing rule only
 * fires when two actions reach one route — none of which the shipped document
 * does. Each is driven here on a registry written to reach it.
 *
 * A generated line past the width is a file the formatter would rewrite, which
 * fails the lint gate; a route priced twice is a native boundary that cannot
 * say what a call costs.
 */

import { describe, expect, it } from 'bun:test'
import type { ActionRow, Registry } from '../scripts/action-registry.ts'
import { emitActionTable, emitCapabilities, emitTypeScript, LINE_WIDTH } from '../scripts/action-registry-emit.ts'
import { emitRust } from '../scripts/action-registry-rust.ts'
import { readJsonc } from '../scripts/jsonc.ts'
import { ROOT } from '../scripts/source-tree.ts'

/** An action row every case here starts from. */
const ACTION: ActionRow = {
  id: 'boot.retry',
  capability: 'host.read',
  placement: 'boot',
  kind: 'query',
  pane: 'none',
  marker: 'boot-retry',
  labelKey: undefined,
  labelKeyOn: undefined,
  availability: 'always',
  remote: undefined,
  lane: 'tests/action-registry-emit.spec.ts',
}

/** The declaration the action ids are written under. */
const IDS_DECLARATION = 'export type ActionId ='

/** The declaration the action id list is written under. */
const LIST_DECLARATION = 'export const ACTION_IDS: readonly ActionId[] ='

/**
 * A registry holding the actions given, and the rows they point at.
 * @param actions - the action rows.
 * @returns the registry.
 */
function registryOf(actions: readonly ActionRow[]): Registry {
  return {
    version: 1,
    capabilities: [{ id: 'host.read', subject: 'device', ttlSeconds: 900 }],
    placements: [{ id: 'boot', surface: 'The page before a shell exists.' }],
    actions,
  }
}

/**
 * One action row per id, each carrying that id as its marker too.
 * @param ids - the ids to write.
 * @returns the rows.
 */
function actionsNamed(ids: readonly string[]): readonly ActionRow[] {
  return ids.map((id) => ({ ...ACTION, id, marker: id }))
}

/**
 * The declaration a face opens with, and the lines it continues onto.
 * @param text - the emitted file.
 * @param declaration - what the declaration starts with.
 * @returns the declaration's lines, up to the blank line that ends it.
 */
function declarationLines(text: string, declaration: string): readonly string[] {
  const lines = text.split('\n')
  const at = lines.findIndex((line) => line.startsWith(declaration))
  const rest = lines.slice(at)
  const end = rest.findIndex((line) => line === '')
  return end === -1 ? rest : rest.slice(0, end)
}

describe('the width every generated line is held to', () => {
  it('is the width the formatter is configured to wrap at', async () => {
    // Two numbers in two files. A generated file wider than the formatter
    // wants is one the formatter rewrites, and the lint gate then reports a
    // file nobody may edit as needing an edit.
    const formatter = readJsonc(await Bun.file(`${ROOT}biome.json`).text())['formatter']
    expect(formatter).toEqual({ indentStyle: 'space', indentWidth: 2, lineWidth: LINE_WIDTH })
  })

  it('holds a union that ends exactly at it on one line, and wraps one past it', () => {
    const exact = 'a'.repeat(LINE_WIDTH - IDS_DECLARATION.length - 3)
    expect(declarationLines(emitTypeScript(registryOf(actionsNamed([exact]))), IDS_DECLARATION)).toEqual([
      `${IDS_DECLARATION} '${exact}'`,
    ])
    const past = `${exact}a`
    expect(declarationLines(emitTypeScript(registryOf(actionsNamed([past]))), IDS_DECLARATION)).toEqual([
      IDS_DECLARATION,
      `  | '${past}'`,
    ])
  })

  it('holds a list that ends exactly at it on one line, and wraps one past it', () => {
    const exact = 'a'.repeat(LINE_WIDTH - LIST_DECLARATION.length - 5)
    expect(declarationLines(emitTypeScript(registryOf(actionsNamed([exact]))), LIST_DECLARATION)).toEqual([
      `${LIST_DECLARATION} ['${exact}']`,
    ])
    const past = `${exact}a`
    expect(declarationLines(emitTypeScript(registryOf(actionsNamed([past]))), LIST_DECLARATION)).toEqual([
      `${LIST_DECLARATION} [`,
      `  '${past}',`,
      ']',
    ])
  })

  it('separates the names of a union and the elements of a list', () => {
    const two = registryOf(actionsNamed(['first', 'second']))
    expect(declarationLines(emitTypeScript(two), IDS_DECLARATION)).toEqual([`${IDS_DECLARATION} 'first' | 'second'`])
    expect(declarationLines(emitTypeScript(two), LIST_DECLARATION)).toEqual([`${LIST_DECLARATION} ['first', 'second']`])
  })

  it('wraps a union of many names one to a line, each under the same bar', () => {
    const many = actionsNamed(Array.from({ length: 8 }, (_, index) => `boot.retry.${'x'.repeat(20)}.${String(index)}`))
    const written = declarationLines(emitTypeScript(registryOf(many)), IDS_DECLARATION)
    expect(written.length).toBe(many.length + 1)
    expect(written.slice(1).every((line) => line.startsWith("  | '"))).toBe(true)
  })
})

describe('the quoting of a name', () => {
  it('escapes an apostrophe, which would otherwise close the literal early', () => {
    const written = emitActionTable(registryOf(actionsNamed(["boot.it's"])))
    expect(written).toContain("  'boot.it\\'s': {")
    expect(written).toContain("    id: 'boot.it\\'s',")
  })

  it('leaves a name carrying no apostrophe exactly as the registry wrote it', () => {
    expect(emitCapabilities(registryOf([ACTION]))).toContain("export type CapabilityId = 'host.read'")
  })
})

describe('the native table', () => {
  it('prices a route once when two actions reach it for the same capability', () => {
    const shared = actionsNamed(['boot.retry', 'boot.again']).map((row) => ({ ...row, remote: 'host/retry' }))
    const written = emitRust(registryOf(shared))
    expect(written.split('host/retry').length - 1).toBe(1)
  })

  it('refuses a route two actions price differently, and names both prices', () => {
    const first: ActionRow = { ...ACTION, remote: 'host/retry' }
    const second: ActionRow = {
      ...ACTION,
      id: 'boot.again',
      marker: 'boot-again',
      capability: 'host.write',
      remote: 'host/retry',
    }
    expect(() => emitRust(registryOf([first, second]))).toThrow(
      'actions.bao: route "host/retry" is priced as both host.read and host.write; one route costs one capability',
    )
  })
})
