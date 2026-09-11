/**
 * Page-side interpreter for the harness's index-injection table: the ordered
 * boot rows a served page carries in its HTML. Mirrors the harness's
 * `renderIndexInjections`, which renders the same table into markup.
 *
 * @module
 */

import { isWireObject, type JsonValue, type WireObject, type WireValue } from './wire.ts'

/** One row of the boot table, as the host serves it. */
export type IndexInjection =
  | { readonly kind: 'global'; readonly name: string; readonly value: JsonValue }
  | { readonly kind: 'script'; readonly placement: 'head' | 'body'; readonly text: string }
  | { readonly kind: 'script-src'; readonly placement: 'head' | 'body'; readonly src: string }
  | { readonly kind: 'script-preload'; readonly src: string }
  | { readonly kind: 'style'; readonly text: string }
  | { readonly kind: 'html'; readonly placement: 'head' | 'body'; readonly html: string }

/**
 * What the two bundle rows of a table are carried out with.
 *
 * Both are the carrier: the row URLs are host paths behind the device token,
 * which only an authenticated request can reach, so no browser mechanism —
 * neither a `<script src>` nor a preload link — can honour either row.
 */
export interface BundleCarrier {
  /** Fetches a `script-preload` row's bundle so the row that runs it need not. */
  readonly warm: (src: string) => Promise<void>
  /** Fetches, if it was not warmed, and runs a `script-src` row's bundle. */
  readonly run: (src: string) => Promise<void>
}

/** Where a row is placed, when the row names a placement. */
type Placement = 'head' | 'body'

/**
 * The placement a row names, when it names one this build knows.
 * @param value - the row's `placement`, as the host serialized it.
 * @returns the placement, or undefined.
 */
function placementOf(value: WireValue): Placement | undefined {
  return value === 'head' || value === 'body' ? value : undefined
}

/**
 * The text a row carries under one key, when it carries text there.
 * @param row - the row.
 * @param key - the field.
 * @returns the text, or undefined.
 */
function textAt(row: WireObject, key: string): string | undefined {
  const value = row[key]
  return typeof value === 'string' ? value : undefined
}

/**
 * Read one row of the boot table.
 *
 * The table is a contract with a host that may be ahead of this client, so a
 * row is read rather than claimed: a `script` row with no text, or a kind this
 * build does not know, is a row it cannot honour — and honouring it by halves
 * would boot a shell missing whatever the row was for.
 * @param value - one row, exactly as the host serialized it.
 * @returns the row, or undefined when this build cannot honour it.
 */
function readInjection(value: WireValue): IndexInjection | undefined {
  if (!isWireObject(value)) return undefined
  const kind = value.kind
  const placement = placementOf(value.placement)
  const name = textAt(value, 'name')
  const text = textAt(value, 'text')
  const src = textAt(value, 'src')
  const html = textAt(value, 'html')
  // A row that names a global and carries no value carries JSON's own
  // no-value, which is what the page then holds under that name.
  if (kind === 'global' && name !== undefined) return { kind, name, value: value.value ?? null }
  if (kind === 'script' && placement !== undefined && text !== undefined) return { kind, placement, text }
  if (kind === 'script-src' && placement !== undefined && src !== undefined) return { kind, placement, src }
  if (kind === 'script-preload' && src !== undefined) return { kind, src }
  if (kind === 'style' && text !== undefined) return { kind, text }
  if (kind === 'html' && placement !== undefined && html !== undefined) return { kind, placement, html }
  return undefined
}

/**
 * Execute every row in table order.
 *
 * Order is the contract: a `global` row must land before the scripts that read
 * it, so this awaits each script row rather than starting them concurrently.
 *
 * @param rows - the boot table, exactly as the host serialized it.
 * @param bundles - how the two bundle rows reach the host.
 */
export function applyIndexInjections(rows: WireValue, bundles: BundleCarrier): Promise<void> {
  if (!Array.isArray(rows)) {
    return Promise.reject(new Error(`deeptail: the boot table is not a list of rows: ${JSON.stringify(rows)}`))
  }
  // Sequential by construction: each row's promise is chained onto the previous
  // one, so a `global` row always lands before the scripts that read it.
  return rows.reduce<Promise<void>>(
    (previous, row) => previous.then(async () => await applyRow(readRow(row), bundles)),
    Promise.resolve(),
  )
}

/**
 * One row, refused when this build cannot honour it.
 * @param value - one row, exactly as the host serialized it.
 * @returns the row.
 * @throws Error naming the row, so a boot stops rather than missing something.
 */
function readRow(value: WireValue): IndexInjection {
  const row = readInjection(value)
  if (row === undefined) throw new Error(`deeptail: unknown index injection row ${JSON.stringify(value)}`)
  return row
}

/**
 * Execute one row.
 * @param row - the row to apply.
 * @param bundles - how the two bundle rows reach the host.
 */
async function applyRow(row: IndexInjection, bundles: BundleCarrier): Promise<void> {
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
      await bundles.run(row.src)
      break
    case 'script-preload':
      // A served page hands this row to the browser as a preload link. There is
      // no browser-visible URL here, so the fetch the row asks for is made
      // through the carrier and held; the `script-src` row that follows runs
      // what this fetched instead of asking the host a second time.
      await bundles.warm(row.src)
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
  }
}
