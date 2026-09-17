/**
 * The dialog contract, and the layers a root owns: every dialog a document
 * holds and every mask drawn over the whole viewport, as the live tree shows
 * them.
 *
 * A dialog is a contract, not a box: it declares itself modal, it is named by a
 * heading inside itself, everything behind it leaves the tree, it holds focus,
 * it is seated where the reader can see and reach it, and it is dismissed on
 * Escape with focus handed back to whatever opened it. The shared frame is what
 * holds that contract in one place, and it marks what it builds, so a dialog or
 * a mask assembled anywhere else is a second contract — one that will be
 * missing whichever of those promises its author did not think of, and that no
 * rule engine reports while the one it *did* remember keeps axe quiet.
 *
 * Split from `structure-shell.ts` when that file outgrew the size the linter
 * allows one file, the way `structure-pointer.ts` was split from
 * `structure-layout.ts`: what a document *seats*, and what the frames in it
 * *promise*, are two subjects, and only the second one reads the frame.
 *
 * These run inside the page like the rest, so they may only use DOM APIs and
 * what they are handed: each function here is shipped to the page as its own
 * source text, so a value it closed over would arrive as a `ReferenceError`.
 *
 * @module
 */

import { drawnBox } from './structure-pointer.ts'
import { describe, type Report } from './structure-report.ts'

/** What the dialog checks read, as the caller hands it to the page. */
interface DialogLimits {
  /** The product surfaces the check reads, as one selector list. */
  readonly scope: string
  /**
   * Elements that take focus or activation without a `tabindex`.
   *
   * A caller that hands none leaves every element inside the frame able to take
   * the focus, which is the reading a page seated outside a shell has.
   */
  readonly interactive?: string
}

/** The edges of a painted box, as the rules that read one measure it. */
interface PaintedBox {
  readonly top: number
  readonly left: number
  readonly right: number
  readonly bottom: number
}

/**
 * Whether a box is wholly on screen, where the reader can see and reach it.
 *
 * A box with no pixels is a box the reader is not shown, and a frame laid out
 * past any edge of the viewport is one part of it cannot be reached at: both
 * are read here, against the viewport the page is measured in rather than
 * against an ancestor, because every ancestor that clips has already clipped
 * the box the caller measured.
 * @param box - the box's painted edges, in viewport coordinates.
 * @returns true when the box paints pixels and every edge of it is in view.
 */
export function onScreen(box: PaintedBox): boolean {
  return (
    box.right - box.left > 0 &&
    box.bottom - box.top > 0 &&
    box.top >= 0 &&
    box.left >= 0 &&
    box.bottom <= window.innerHeight &&
    box.right <= window.innerWidth
  )
}

/**
 * The promises one dialog frame keeps, read while it is open.
 *
 * Each promise is read here rather than left to the suite that drives the
 * frame: a name that resolves to nothing inside the dialog, focus left outside
 * an open modal, a sibling still able to take that focus, a frame seated past
 * the viewport, and an action the reader cannot see are all defects no rule
 * engine reports, and every one of them exists only while the dialog is open —
 * which is exactly when the page is measured.
 * @param add - collects a finding.
 * @param dialog - the dialog the shared frame built.
 * @param interactive - what takes focus without a `tabindex`, empty when the
 * caller handed none.
 */
export function checkDialogPromises(add: Report, dialog: Element, interactive: string): void {
  const takesFocus = (node: Element): boolean =>
    interactive === '' || node.matches(interactive) || node.querySelector(interactive) !== null
  if (dialog.getAttribute('aria-modal') !== 'true') {
    add('dialog-contract', `${describe(dialog)} is the shared frame without declaring itself modal`)
  }
  // An empty attribute splits to an empty id, which names no element and is no
  // selector to ask for: the ids are read the way every other ARIA reference in
  // this pass reads them, so a blank list is a list naming nothing.
  const labelled = (dialog.getAttribute('aria-labelledby') ?? '').split(/\s+/u).filter((id) => id !== '')
  const named = labelled.some((id) => {
    const node = document.querySelector(`#${CSS.escape(id)}`)
    return node !== null && dialog.contains(node) && (node.textContent ?? '').trim() !== ''
  })
  if (!named && (dialog.getAttribute('aria-label') ?? '').trim() === '') {
    add('dialog-contract', `${describe(dialog)} is a dialog no name inside it reaches`)
  }
  const held = document.activeElement
  if (held === null || !dialog.contains(held)) {
    add('dialog-contract', `${describe(dialog)} is open with focus left outside it`)
  }
  const frame = dialog.parentElement ?? dialog
  const behind = frame.parentElement
  if (behind !== null) {
    for (const sibling of behind.children) {
      if (sibling === frame) continue
      if (sibling instanceof HTMLElement && sibling.inert) continue
      if (!takesFocus(sibling)) continue
      add('dialog-contract', `${describe(dialog)} leaves ${describe(sibling)} able to take focus behind it`)
    }
  }
  if (!onScreen(drawnBox(dialog))) {
    add('dialog-contract', `${describe(dialog)} is not wholly on screen where the reader can reach it`)
  }
  for (const control of dialog.querySelectorAll('[data-deeptail-action]')) {
    if (!onScreen(drawnBox(control))) {
      add('dialog-contract', `${describe(control)} is an action off screen inside the open dialog`)
    }
  }
}

/**
 * A layer drawn over the whole viewport belongs to a root that owns it.
 *
 * The mask is found by where it is drawn rather than by a colour: an element
 * laid out over the whole viewport, outside every product surface, that no
 * frame holding a marked dialog contains. A page may paint a mask — the shell
 * paints one behind its drawer — so the rule is not that masks are forbidden,
 * only that each one belongs to a root that owns it.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
export function checkOverlayMasks(add: Report, limits: DialogLimits): void {
  const marker = '[data-deeptail-dialog]'
  const owned = (node: Element): boolean => {
    if (node.closest(limits.scope) !== null) return true
    let held: Element | null = node
    while (held !== null && held !== document.body) {
      if (held.querySelector(marker) !== null) return true
      held = held.parentElement
    }
    return false
  }
  for (const node of document.querySelectorAll('body *')) {
    const style = getComputedStyle(node)
    if (style.position !== 'fixed' && style.position !== 'absolute') continue
    const box = node.getBoundingClientRect()
    if (box.width < window.innerWidth * 0.9 || box.height < window.innerHeight * 0.9) continue
    if (owned(node)) continue
    add(
      'overlay-contract',
      `${describe(node)} is drawn over the whole viewport outside every product root, and no dialog frame owns it`,
    )
  }
}

/**
 * Every dialog the document holds, and every promise the frames in it keep.
 *
 * The document carries one dialog at a time, the shared frame builds every one
 * of them, and an element carrying the frame's marker carries the role that
 * goes with it. Each marked dialog is then read against the contract above,
 * while the masks the page draws are read against the roots that own them.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read and what takes focus inside them.
 */
export function checkDialogContract(add: Report, limits: DialogLimits): void {
  const marker = '[data-deeptail-dialog]'
  const roles = '[role="dialog"], [role="alertdialog"]'
  const dialogs = [...document.querySelectorAll(roles)]
  if (dialogs.length > 1) {
    add('dialog-contract', `the document holds ${String(dialogs.length)} dialogs at once; one frame is open at a time`)
  }
  for (const dialog of dialogs) {
    if (!dialog.matches(marker)) {
      add(
        'dialog-contract',
        `${describe(dialog)} is a dialog the shared frame did not build, so nothing holds its mask, its naming and its dismissal together`,
      )
      continue
    }
    checkDialogPromises(add, dialog, limits.interactive ?? '')
  }
  for (const marked of document.querySelectorAll(marker)) {
    if (!marked.matches(roles)) {
      add('dialog-contract', `${describe(marked)} carries the dialog marker without the dialog role to go with it`)
    }
  }
  checkOverlayMasks(add, limits)
}
