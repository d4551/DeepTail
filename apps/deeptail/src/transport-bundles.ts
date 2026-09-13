/**
 * Fetch and run one client plugin bundle through Rust.
 *
 * Split from the carrier: the boot table asks for the two separately, and the
 * mux socket is a different surface.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'

/**
 * Read a settled bundle fetch, naming the URL a refusal belongs to.
 * @param fetched - the settled outcome, or missing when the tuple was empty.
 * @param url - bundle URL the boot table named.
 * @returns the bundle's source.
 */
export function bundleFromSettled(fetched: PromiseSettledResult<string> | undefined, url: string): string {
  if (fetched === undefined || fetched.status === 'rejected') {
    const detail = fetched === undefined ? '' : `: ${String(fetched.reason)}`
    const cause = fetched?.status === 'rejected' && fetched.reason instanceof Error ? fetched.reason : undefined
    throw new Error(
      `deeptail: bundle ${url} could not be fetched${detail}`,
      cause === undefined ? undefined : { cause },
    )
  }
  return fetched.value
}

/**
 * Fetch one client plugin bundle's source through Rust.
 *
 * A host that refuses one bundle rejects with its own reason, and that reason
 * names no bundle. The boot table can carry several `script-src` rows, so a
 * failure that does not say which of them failed leaves the operator reading
 * a message about a request they cannot identify.
 * @param host - paired host id.
 * @param url - bundle URL the boot table named, absolute on the host.
 * @returns the bundle's source.
 */
export async function fetchBundle(host: string, url: string): Promise<string> {
  const path = new URL(url, 'http://dsh.internal')
  const [fetched] = await Promise.allSettled([
    invoke<string>('carrier_load_bundle', { host, path: `${path.pathname}${path.search}` }),
  ])
  return bundleFromSettled(fetched, url)
}

/**
 * Run one bundle's source as a page script, exactly as the served shell loads
 * its own same-origin bundles.
 *
 * A blob URL is used rather than `eval` so the app's CSP can stay at
 * `script-src 'self' blob:` instead of allowing arbitrary evaluation.
 * @param url - the bundle URL, for the failure a refusal reports.
 * @param source - the source fetched for it.
 */
export async function executeBundle(url: string, source: string): Promise<void> {
  const blob = URL.createObjectURL(new Blob([source], { type: 'text/javascript' }))
  await new Promise<void>((resolve, reject) => {
    const element = document.createElement('script')
    element.src = blob
    element.addEventListener(
      'load',
      () => {
        element.remove()
        resolve()
      },
      { once: true },
    )
    element.addEventListener(
      'error',
      () => {
        element.remove()
        reject(new Error(`deeptail: bundle ${url} failed to execute`))
      },
      { once: true },
    )
    document.head.append(element)
  }).finally(() => {
    URL.revokeObjectURL(blob)
  })
}
