/**
 * The shared dialog.
 *
 * Follows the harness's `Modal` primitive: portalled to `document.body`, named
 * through `aria-label`, masked, and closed on `Escape` by a listener installed
 * only while it is open. The application root is made `inert` for the dialog's
 * lifetime — the harness's `OnboardingSurface` trick — so assistive technology
 * sees one named surface owning the interaction instead of loose content beside
 * an inactive page. The repo has no focus-trap implementation and this needs
 * none.
 *
 * @module
 */

import { el } from './dom.ts'

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

/**
 * Open a dialog.
 * @param title - accessible name and visible heading.
 * @param onClose - called after the dialog closes, however it closed.
 * @returns the dialog's seats and its close handle.
 */
export function openDialog(title: string, onClose: () => void): Dialog {
  const root = el('div', { className: 'modal-root', attrs: { role: 'presentation' } })
  const mask = el('div', { className: 'modal-mask', attrs: { 'aria-hidden': 'true' } })
  const dialog = el('div', {
    className: 'modal-dialog',
    attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': title },
    data: { deeptailDialog: '' },
  })
  const heading = el('h2', { className: 'modal-title', text: title })
  const body = el('div', { className: 'modal-body' })
  const actions = el('div', { className: 'actions' })
  dialog.append(heading, body, actions)
  root.append(mask, dialog)

  const appRoot = document.getElementById('root')
  // Focus is moved into the dialog, so the control that opened it has to be
  // remembered or a keyboard user is returned to the top of the document.
  const opener = document.activeElement
  let closed = false

  const close = (): void => {
    if (closed) return
    closed = true
    document.removeEventListener('keydown', onKeyDown)
    root.remove()
    if (appRoot !== null) appRoot.inert = false
    if (opener instanceof HTMLElement && opener.isConnected) opener.focus()
    onClose()
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') close()
  }

  mask.addEventListener('click', close)
  document.addEventListener('keydown', onKeyDown)
  if (appRoot !== null) appRoot.inert = true
  document.body.append(root)

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
