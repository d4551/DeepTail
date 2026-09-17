/**
 * Reading the built page before its module entry can run.
 *
 * A case that asks whether the live mount adopted the chrome the document
 * shipped has to see that tree before the bundle can touch it, and a case that
 * asks what a reader whose bundle never arrived is left with never lets it run
 * at all. Both are arranged here: the document's own nodes are recorded as the
 * parser creates them, the record is closed before the entry is released, and
 * the entry is held until it is.
 *
 * @module
 */

import type { Page } from 'playwright'

/** What a case does with the page's one module entry. */
export type EntryReading =
  /** Hold it until the document's own tree is recorded, then let it run. */
  | 'hold'
  /** Never let it run, which is the page a reader whose bundle never arrived is left with. */
  | 'block'

/**
 * Record the tree the document itself shipped, before anything can replace it.
 *
 * Evaluated in the page before the parser runs, so the nodes it holds are the
 * ones the built page carried rather than ones a bundle built. Self-contained:
 * a function emitted into a page closes over nothing of this module's.
 *
 * The paint counts as seated once the mount holds the product shell and the
 * shell holds its live region, which is the last region the chrome carries —
 * only closing tags follow it, so the whole painted tree is in the document by
 * then. The record is closed separately, by `readEntryFirst`, so a node the
 * bundle builds after the entry is released is never recorded as shipped.
 */
function installPaintedSnapshot(): void {
  const shipped = new WeakSet<Node>()
  let recorded = false
  const record = (): void => {
    const shell = document.querySelector('#root > [data-deeptail-shell]')
    if (shell === null || shell.querySelector('[role="status"]') === null) return
    for (const node of document.querySelectorAll('#root, #root *')) shipped.add(node)
    recorded = true
  }
  record()
  const watching = new MutationObserver(record)
  watching.observe(document, { childList: true, subtree: true })
  window.deeptailSsrRecorded = () => recorded
  window.deeptailSsrFreeze = () => {
    watching.disconnect()
  }
  window.deeptailSsrShipped = (node: Node) => shipped.has(node)
}

/**
 * The source a page evaluates before its parser sees the document.
 *
 * The recorder's own source is emitted beside the call that starts it, the way
 * `tauri-ipc.ts` emits its scripted IPC: a declaration on its own would define
 * the recorder and never run it.
 * @returns the script that records the shipped tree.
 */
export function paintedSnapshotSource(): string {
  return `${String(installPaintedSnapshot)}\ninstallPaintedSnapshot()`
}

/**
 * The module entry a built page names, read from its own bytes.
 * @param pagePath - the built page.
 * @returns the entry's path within the bundle.
 */
async function entryOf(pagePath: URL): Promise<string> {
  const html = await Bun.file(pagePath).text()
  const src = /<script[^>]*\bsrc="([^"]+)"/u.exec(html)?.[1]
  if (src === undefined) throw new Error('deeptail: the built page names no module entry to hold')
  return src.replace(/^\.\//u, '')
}

/**
 * Hold a page's one module entry back, or refuse it for good.
 *
 * Held, the page waits on nothing but its own document: the record is taken by
 * the parser and closed here, so the entry is released into a tree it cannot
 * have built and cannot be added to.
 * @param page - the page whose entry is held.
 * @param pagePath - the built page that names the entry.
 * @param mode - whether the entry is released once the tree is recorded.
 */
export async function readEntryFirst(page: Page, pagePath: URL, mode: EntryReading): Promise<void> {
  const entry = await entryOf(pagePath)
  await page.route(`**/${entry}`, async (route) => {
    if (mode === 'block') {
      await route.abort()
      return
    }
    await page.waitForFunction(() => window.deeptailSsrRecorded?.() === true)
    await page.evaluate(() => window.deeptailSsrFreeze?.())
    await route.continue()
  })
}

declare global {
  interface Window {
    /** Whether the document's own shell is recorded, in a page that reads its entry first. */
    deeptailSsrRecorded?: () => boolean
    /** Close the record, in a page that reads its entry first, so later nodes are not read as shipped. */
    deeptailSsrFreeze?: () => void
    /** Whether a node is one the document itself shipped, in a page that reads its entry first. */
    deeptailSsrShipped?: (node: Node) => boolean
  }
}
