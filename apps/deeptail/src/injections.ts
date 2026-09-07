/**
 * Page-side interpreter for the harness's index-injection table: the ordered
 * boot rows a served page carries in its HTML. Mirrors the harness's
 * `renderIndexInjections`, which renders the same table into markup.
 *
 * @module
 */

import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { isWireObject, type WireObject, type WireValue } from './wire.ts'

/** One row of the boot table, as the host serves it. */
export type IndexInjection =
  // `value` is `JsonValue`, not `WireValue`: the table arrives as JSON, which
  // has no way to carry `undefined`. A row that omits the field is a row the
  // predicate below refuses rather than one that assigns nothing to a global.
  | { readonly kind: 'global'; readonly name: string; readonly value: JsonValue }
  | { readonly kind: 'script'; readonly placement: 'head' | 'body'; readonly text: string }
  | { readonly kind: 'script-src'; readonly placement: 'head' | 'body'; readonly src: string }
  | { readonly kind: 'script-preload'; readonly src: string }
  | { readonly kind: 'style'; readonly text: string }
  | { readonly kind: 'html'; readonly placement: 'head' | 'body'; readonly html: string }

/** The two ends of the document a row may be placed at. */
const PLACEMENTS: ReadonlySet<string> = new Set(['head', 'body'])

/** The fields a boot row may carry, as the wire object they are read from. */
interface IndexInjectionWire extends WireObject {
  readonly kind?: JsonValue
  readonly name?: JsonValue
  readonly value?: JsonValue
  readonly placement?: JsonValue
  readonly src?: JsonValue
  readonly text?: JsonValue
  readonly html?: JsonValue
}

/**
 * Whether a row names a placement this build can apply.
 * @param row - the row, read by field.
 * @returns true when the placement is one of the two ends.
 */
function placed(row: IndexInjectionWire): boolean {
  return typeof row.placement === 'string' && PLACEMENTS.has(row.placement)
}

/**
 * Whether a value is a boot row this build knows how to apply.
 *
 * Validation is by field rather than by cast, in the shape `wire.ts` uses for
 * every other answer a host sends. Until this existed the table was asserted
 * into shape by the call's own type argument, and a host that served a row
 * missing its `name` reached `Object.assign(globalThis, { undefined: … })`,
 * while one missing its `html` inserted the string `undefined` into the
 * document — both of them silently, and both from a value nothing had read.
 * @param value - any value the host may have sent.
 * @returns whether the value is a row this build can apply.
 */
export function isIndexInjection<T>(value: T | WireValue): value is IndexInjection {
  if (!isWireObject(value)) return false
  const row: IndexInjectionWire = value
  switch (row.kind) {
    case 'global':
      return typeof row.name === 'string' && row.value !== undefined
    case 'script':
      return placed(row) && typeof row.text === 'string'
    case 'script-src':
      return placed(row) && typeof row.src === 'string'
    case 'script-preload':
      return typeof row.src === 'string'
    case 'style':
      return typeof row.text === 'string'
    case 'html':
      return placed(row) && typeof row.html === 'string'
    default:
      return false
  }
}

/**
 * The boot table a host served, or nothing when it served one this build
 * cannot apply.
 *
 * The whole table is refused rather than the offending row dropped. Order is
 * this module's contract, and a table with a row removed still applies — just
 * not the boot the host described, and not in a way anything downstream could
 * notice.
 * @param value - whatever the host answered `boot_injections` with.
 * @returns the rows, or undefined when the answer is not a table of them.
 */
export function readIndexInjections<T>(value: T | WireValue): readonly IndexInjection[] | undefined {
  if (!Array.isArray(value)) return undefined
  const rows: IndexInjection[] = []
  for (const row of value) {
    if (!isIndexInjection(row)) return undefined
    rows.push(row)
  }
  return rows
}

/**
 * Execute every row in table order.
 *
 * Order is the contract: a `global` row must land before the scripts that read
 * it, so this awaits each script row rather than starting them concurrently.
 *
 * @param rows - the boot table, exactly as the host serialized it.
 * @param loadScript - executes one `script-src` row; DeepTail's carrier, because
 * the row URLs are host paths that only an authenticated request can reach.
 */
export function applyIndexInjections(
  rows: readonly IndexInjection[],
  loadScript: (src: string) => Promise<void>,
): Promise<void> {
  // Sequential by construction: each row's promise is chained onto the previous
  // one, so a `global` row always lands before the scripts that read it.
  return rows.reduce<Promise<void>>(
    (previous, row) => previous.then(() => applyRow(row, loadScript)),
    Promise.resolve(),
  )
}

/**
 * Execute one row.
 * @param row - the row to apply.
 * @param loadScript - executes a `script-src` row through the carrier.
 */
async function applyRow(row: IndexInjection, loadScript: (src: string) => Promise<void>): Promise<void> {
  switch (row.kind) {
    case 'global':
      Object.assign(globalThis, { [row.name]: row.value })
      break
    case 'script': {
      const element = document.createElement('script')
      element.textContent = row.text
      ;(row.placement === 'head' ? document.head : document.body).append(element)
      break
    }
    case 'script-src':
      await loadScript(row.src)
      break
    case 'script-preload':
      // Our carrier has no browser-visible URL to warm; the matching
      // `script-src` row performs the real request.
      break
    case 'style': {
      const element = document.createElement('style')
      element.textContent = row.text
      document.head.append(element)
      break
    }
    case 'html':
      ;(row.placement === 'head' ? document.head : document.body).insertAdjacentHTML('beforeend', row.html)
      break
    default:
      throw new Error(`deeptail: unknown index injection row ${JSON.stringify(row)}`)
  }
}
