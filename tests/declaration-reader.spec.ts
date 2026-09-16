/**
 * The declaration reader the faces go through, driven against a declaration
 * fixture that spells every shape it reads and against the declarations the
 * installed Vite ships.
 *
 * The reader is the half both the Tauri config face and the Playwright face
 * stand on, so a shape it quietly stopped reading would take two refusals down
 * with it.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { interfaceMembers } from '../scripts/declaration-reader.ts'
import { ROOT } from '../scripts/source-tree.ts'
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

/** The installed Vite's declarations, which the config face reads. */
const VITE_DECLARATIONS = 'apps/deeptail/node_modules/vite/dist/node/index.d.ts'

describe('the declaration reader the faces go through', () => {
  it('reads an interface, a type it intersects, and a marker that runs onto the next line', () => {
    const declarations = [
      'interface Base {',
      '  /**',
      '   * Alias to `next`.',
      '   * @deprecated Use `next` instead.',
      '   */',
      '  old?: string;',
      '  current?: string;',
      '}',
      'type Held = Base & {',
      '  nested?: {',
      '    /** @deprecated A one-line marker. */',
      '    inner?: string;',
      '  };',
      '};',
      'interface Child extends Base {',
      '  own?: string;',
      '}',
    ].join('\n')
    const interfaces = interfaceMembers(declarations)
    expect([...(interfaces.get('Base') ?? new Map()).keys()]).toEqual(['old', 'current'])
    expect(interfaces.get('Base')?.get('old')?.deprecated).toBe('Use `next` instead.')
    expect([...(interfaces.get('Held') ?? new Map()).keys()]).toEqual(['old', 'current', 'nested', 'nested.inner'])
    expect(interfaces.get('Held')?.get('nested.inner')?.deprecated).toBe('A one-line marker.')
    // The parent's members come first and the child's own follow; the merge is
    // what makes an inherited member reachable from the child at all.
    expect([...(interfaces.get('Child') ?? new Map()).keys()]).toEqual(['old', 'current', 'own'])
  })

  it(
    'reads the installed Vite the way the config face reads it',
    async () => {
      const interfaces = interfaceMembers(await readFile(`${ROOT}${VITE_DECLARATIONS}`, 'utf8'))
      expect(interfaces.has('UserConfig')).toBe(true)
      expect(interfaces.get('BuildEnvironmentOptions')?.get('rollupOptions')?.deprecated).toBe(
        'Use `rolldownOptions` instead.',
      )
      expect(interfaces.get('DepOptimizationOptions')?.get('rollupOptions')?.deprecated).toBe(
        'Use `rolldownOptions` instead.',
      )
      expect(interfaces.get('HmrOptions')?.get('port')?.deprecated).toBe('Use `server.ws.port` instead.')
      expect(interfaces.get('CSSOptions')?.has('preprocessorOptions.scss')).toBe(true)
    },
    TREE_SCAN_BUDGET_MS,
  )
})
