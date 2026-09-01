/**
 * Page-side interpreter for the harness's index-injection table.
 *
 * TEMPORARY OWNER. The harness already has this interpreter — it is
 * `applyIndexInjections` in `dsh-experimental-webworker-runtime`, the mirror of
 * the served `renderIndexInjections`. That package is under
 * `packages/experimental/`, which the harness marks private and excludes from
 * releases, so it is not on the registry and DeepTail cannot import it.
 *
 * Seam (d) of the harness work this app depends on promotes that function into
 * `@deepseek-ai/dsh-client-modules/client`, beside the `bootInjections`
 * producer. When it lands, delete this file and import it from there: the table
 * must not have two interpreters for longer than it takes to land that PR.
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
export async function applyIndexInjections(
  rows: readonly IndexInjection[],
  loadScript: (src: string) => Promise<void>,
): Promise<void> {
  for (const row of rows) {
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
        // Nothing to warm: our carrier has no browser-visible URL to prefetch,
        // and the matching `script-src` row performs the real request.
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
        // The union is closed by the host that produced it; an unknown tag
        // means the two halves disagree, which must be loud.
        throw new Error(`deeptail: unknown index injection row ${JSON.stringify(row)}`)
    }
  }
}
