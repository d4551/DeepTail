/**
 * Page-side interpreter for the harness's index-injection table: the ordered
 * boot rows a served page carries in its HTML. Mirrors the harness's
 * `renderIndexInjections`, which renders the same table into markup.
 *
 * @module
 */

import type { WireValue } from './wire.ts'

/** One row of the boot table, as the host serves it. */
export type IndexInjection =
  | { readonly kind: 'global'; readonly name: string; readonly value: WireValue }
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

/**
 * Execute every row in table order.
 *
 * Order is the contract: a `global` row must land before the scripts that read
 * it, so this awaits each script row rather than starting them concurrently.
 *
 * @param rows - the boot table, exactly as the host serialized it.
 * @param bundles - how the two bundle rows reach the host.
 */
export function applyIndexInjections(rows: readonly IndexInjection[], bundles: BundleCarrier): Promise<void> {
  // Sequential by construction: each row's promise is chained onto the previous
  // one, so a `global` row always lands before the scripts that read it.
  return rows.reduce<Promise<void>>((previous, row) => previous.then(() => applyRow(row, bundles)), Promise.resolve())
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
    default:
      throw new Error(`deeptail: unknown index injection row ${JSON.stringify(row)}`)
  }
}
