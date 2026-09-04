/**
 * The shared dialog.
 *
 * Follows the harness's `Modal` primitive: portalled to `document.body`, named
 * by its own heading, masked, and closed on `Escape` by a listener installed
 * only while it is open. Every sibling of the dialog's own root is made
 * `inert` for its lifetime — the harness's `OnboardingSurface` trick, widened:
 * `#root` alone left the return bar, which is a `document.body` sibling, in the
 * tab order behind the mask. With the rest of the document out of the tree
 * there is nowhere for focus to go, so no focus-trap implementation is needed.
 *
 * @module
 */

import { type Disposer, el } from './dom.ts'

/** The id the open dialog's heading carries, which names the dialog. */
const HEADING_ID = 'deeptail-dialog-title'

/** A mounted dialog. */
export interface Dialog {
  /** The body to fill. */
  readonly body: HTMLElement
  /** The footer that holds the actions. */
  readonly actions: HTMLElement
  /** Whether the dialog is still on the page. */
  isOpen(): boolean
  /** Close and restore the page. */
  close(): void
}

/** The dialog's parts, before any of them reach the page. */
interface DialogFrame {
  /** The portalled root holding the mask and the dialog. */
  readonly root: HTMLElement
  /** The backdrop, which closes the dialog when it is clicked. */
  readonly mask: HTMLElement
  /** The named surface that takes focus. */
  readonly dialog: HTMLElement
  /** The body to fill. */
  readonly body: HTMLElement
  /** The footer that holds the actions. */
  readonly actions: HTMLElement
}

/**
 * Build the dialog's structure.
 *
 * The root is presentational and the mask is hidden, so the one thing
 * assistive technology finds inside is the named `role="dialog"`.
 * @param title - accessible name and visible heading.
 * @returns the parts to mount and fill.
 */
function buildDialogFrame(title: string): DialogFrame {
  const root = el('div', { className: 'modal-root', role: 'presentation' })
  const mask = el('div', { className: 'modal-mask', aria: { hidden: 'true' } })
  const dialog = el('div', {
    className: 'modal-dialog',
    role: 'dialog',
    aria: { modal: 'true', labelledby: HEADING_ID },
    data: { deeptailDialog: '' },
  })
  // Named by the heading it already shows, rather than by a label repeating it:
  // one dialog is open at a time, so the id is fixed.
  const heading = el('h2', { className: 'modal-title', text: title })
  heading.id = HEADING_ID
  const body = el('div', { className: 'modal-body' })
  const actions = el('div', { className: 'actions' })
  dialog.append(heading, body, actions)
  root.append(mask, dialog)
  return { root, mask, dialog, body, actions }
}

/**
 * Take everything beside the dialog out of the tree.
 *
 * `#root` was made inert on its own, which covers the application but not the
 * return bar the shell appends beside it: `aria-modal` hides a sibling from
 * assistive technology and leaves it in the tab order, so a keyboard user could
 * still reach a control behind the mask.
 * @param root - the dialog's own root, which stays live.
 * @returns a call that puts every sibling back.
 */
function inertSiblings(root: HTMLElement): Disposer {
  const held = [...document.body.children].filter(
    (node): node is HTMLElement => node instanceof HTMLElement && node !== root && !node.inert,
  )
  for (const node of held) node.inert = true
  return () => {
    for (const node of held) node.inert = false
  }
}

/**
 * Open a dialog.
 * @param title - accessible name and visible heading.
 * @returns the dialog's seats and its close handle.
 */
export function openDialog(title: string): Dialog {
  const { root, mask, dialog, body, actions } = buildDialogFrame(title)

  // Focus is moved into the dialog, so the control that opened it has to be
  // remembered or a keyboard user is returned to the top of the document.
  const opener = document.activeElement
  let closed = false
  let restore: Disposer | undefined

  const close = (): void => {
    if (closed) return
    closed = true
    document.removeEventListener('keydown', onKeyDown)
    root.remove()
    restore?.()
    restore = undefined
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close()
  }

  mask.addEventListener('click', close)
  document.addEventListener('keydown', onKeyDown)
  document.body.append(root)
  restore = inertSiblings(root)

  // The dialog owns the interaction, so focus moves into it rather than being
  // left behind on the control that opened it.
  dialog.tabIndex = -1
  dialog.focus()

  return {
    body,
    actions,
    isOpen: () => !closed,
    close,
  }
}
