/**
 * Page-side interpreter for the harness's index-injection table: the ordered
 * boot rows a served page carries in its HTML. Mirrors the harness's
 * `renderIndexInjections`, which renders the same table into markup.
 *
 * @module
 */

/** One row of the boot table, as the host serves it. */
export type IndexInjection =
  | { readonly kind: 'global'; readonly name: string; readonly value: unknown }
  | { readonly kind: 'script'; readonly placement: 'head' | 'body'; readonly text: string }
  | { readonly kind: 'script-src'; readonly placement: 'head' | 'body'; readonly src: string }
  | { readonly kind: 'script-preload'; readonly src: string }
  | { readonly kind: 'style'; readonly text: string }
  | { readonly kind: 'html'; readonly placement: 'head' | 'body'; readonly html: string }

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
