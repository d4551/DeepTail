/**
 * The boot table, applied in the order the host serves it.
 *
 * `applyIndexInjections` states order as its contract — a `global` row must
 * land before the scripts that read it — and nothing verified it. The browser
 * suite could not: the scripted IPC answered `boot_injections` with an empty
 * list, so the applier was never called from any fixture at all, and the
 * carrier's bundle loader sat behind it unreached.
 *
 * The rows that reach for `document` belong to the browser suite, which has
 * one. The contract that decides whether a host boots correctly — the order,
 * the routing of a `script-src` through the carrier, and what a failed row does
 * to the rows behind it — is decided here, where it can be driven without a
 * page.
 *
 * The applier's `default` branch, which refuses a row kind this build does not
 * know, is not driven here: reaching it means handing the function a row the
 * union does not admit, and the only spellings for that are the type escapes
 * this repository bans. What it stands in for — a host serving a table this
 * build cannot apply — is a boundary this product does not validate, which is
 * a finding about `boot_injections` rather than about this module.
 */

import { describe, expect, it } from 'bun:test'
import {
  applyIndexInjections,
  type IndexInjection,
  isIndexInjection,
  readIndexInjections,
} from '../apps/deeptail/src/injections.ts'

/** A loader that records what it was asked for, in order. */
function recorder(): { readonly loaded: string[]; readonly load: (src: string) => Promise<void> } {
  const loaded: string[] = []
  return {
    loaded,
    load: (src) => {
      loaded.push(src)
      return Promise.resolve()
    },
  }
}

describe('the boot table a host serves', () => {
  it('accepts each row kind this build knows how to apply', () => {
    for (const row of [
      { kind: 'global', name: 'x', value: 1 },
      { kind: 'script', placement: 'head', text: 'a' },
      { kind: 'script-src', placement: 'body', src: '/a.js' },
      { kind: 'script-preload', src: '/a.js' },
      { kind: 'style', text: '.a{}' },
      { kind: 'html', placement: 'body', html: '<b></b>' },
    ]) {
      expect([row.kind, isIndexInjection(row)]).toEqual([row.kind, true])
    }
  })

  it('refuses a global with no name, which assigned to `undefined` on the page', () => {
    // `Object.assign(globalThis, { [row.name]: row.value })` with no name wrote
    // a property called "undefined" and the harness client read nothing.
    expect(isIndexInjection({ kind: 'global', value: 1 })).toBe(false)
  })

  it('refuses a global with no value, because JSON cannot carry one that is absent', () => {
    expect(isIndexInjection({ kind: 'global', name: 'x' })).toBe(false)
  })

  it('refuses markup with no markup, which inserted the string `undefined`', () => {
    expect(isIndexInjection({ kind: 'html', placement: 'body' })).toBe(false)
  })

  it('refuses a placement that is neither end of the document', () => {
    expect(isIndexInjection({ kind: 'script', placement: 'middle', text: 'a' })).toBe(false)
    expect(isIndexInjection({ kind: 'script', text: 'a' })).toBe(false)
  })

  it('refuses a row kind this build cannot apply, and a row that is not one', () => {
    expect(isIndexInjection({ kind: 'teleport', src: '/a.js' })).toBe(false)
    expect(isIndexInjection({ src: '/a.js' })).toBe(false)
    expect(isIndexInjection('script')).toBe(false)
    expect(isIndexInjection(null)).toBe(false)
  })
})

describe('the boot table read whole', () => {
  it('reads a whole table, and refuses one that is not a list at all', () => {
    expect(readIndexInjections([{ kind: 'script-preload', src: '/a.js' }])).toEqual([
      { kind: 'script-preload', src: '/a.js' },
    ])
    expect(readIndexInjections([])).toEqual([])
    expect(readIndexInjections({ kind: 'script-preload', src: '/a.js' })).toBeUndefined()
  })

  it('refuses the whole table when one row is malformed, rather than dropping it', () => {
    // Order is this module's contract. A table with a row removed still
    // applies — just not the boot the host described, and not in any way the
    // rows behind it could notice.
    const table = [
      { kind: 'global', name: 'first', value: 1 },
      { kind: 'html', placement: 'body' },
      { kind: 'script-preload', src: '/a.js' },
    ]
    expect(readIndexInjections(table)).toBeUndefined()
  })
})

describe('the boot table', () => {
  it('routes a script row through the carrier, which is the only way to reach it', async () => {
    // The row URLs are host paths behind authentication, so a browser fetch
    // would be refused; the carrier is what carries the credential.
    const { loaded, load } = recorder()
    await applyIndexInjections([{ kind: 'script-src', placement: 'head', src: '/one.js' }], load)
    expect(loaded).toEqual(['/one.js'])
  })

  it('finishes each row before it starts the next, not merely starts them in order', async () => {
    // Order is the contract this module states, and recording when a row is
    // *asked for* cannot check it: an applier that started every row at once
    // still asks for them in table order. What separates the two is when each
    // row finishes, so the first row here is the slowest — chained, the
    // completions come back in table order; started together, they do not.
    const settled: string[] = []
    const delays: ReadonlyMap<string, number> = new Map([
      ['/first.js', 24],
      ['/second.js', 1],
      ['/third.js', 1],
    ])
    const load = (src: string): Promise<void> =>
      new Promise<void>((resolve) => {
        setTimeout(() => {
          settled.push(src)
          resolve()
        }, delays.get(src) ?? 0)
      })
    await applyIndexInjections(
      [
        { kind: 'script-src', placement: 'head', src: '/first.js' },
        { kind: 'script-src', placement: 'body', src: '/second.js' },
        { kind: 'script-src', placement: 'head', src: '/third.js' },
      ],
      load,
    )
    expect(settled).toEqual(['/first.js', '/second.js', '/third.js'])
  })
})

describe('the boot table’s ordering contract', () => {
  it('lands a global before the script that reads it', async () => {
    // The reason order is the contract: the harness client reads its transport
    // off a global the table sets one row earlier.
    const name = 'deeptailInjectionProbe'
    const seen: string[] = []
    const rows: readonly IndexInjection[] = [
      { kind: 'global', name, value: 'ready' },
      { kind: 'script-src', placement: 'head', src: '/reads-the-global.js' },
    ]
    await applyIndexInjections(rows, (src) => {
      seen.push(`${src}:${String(Reflect.get(globalThis, name))}`)
      return Promise.resolve()
    })
    Reflect.deleteProperty(globalThis, name)
    expect(seen).toEqual(['/reads-the-global.js:ready'])
  })
})

describe('the boot table at its edges', () => {
  it('warms nothing for a preload row, because the carrier has no visible URL', async () => {
    // The matching `script-src` row performs the real request; a preload that
    // also loaded would fetch the bundle twice.
    const { loaded, load } = recorder()
    await applyIndexInjections([{ kind: 'script-preload', src: '/one.js' }], load)
    expect(loaded).toEqual([])
  })

  it('applies nothing for an empty table, rather than refusing it', async () => {
    const { loaded, load } = recorder()
    await applyIndexInjections([], load)
    expect(loaded).toEqual([])
  })

  it('stops at the row that failed, so a later row cannot land out of order', async () => {
    // The chain is sequential, so a rejected row ends the table there. A row
    // that ran anyway would land after the failure it was ordered behind.
    const loaded: string[] = []
    const load = (src: string): Promise<void> => {
      loaded.push(src)
      return src === '/breaks.js' ? Promise.reject(new Error('carrier refused')) : Promise.resolve()
    }
    const rows: readonly IndexInjection[] = [
      { kind: 'script-src', placement: 'head', src: '/first.js' },
      { kind: 'script-src', placement: 'head', src: '/breaks.js' },
      { kind: 'script-src', placement: 'head', src: '/never.js' },
    ]
    await expect(applyIndexInjections(rows, load)).rejects.toThrow('carrier refused')
    expect(loaded).toEqual(['/first.js', '/breaks.js'])
  })
})
