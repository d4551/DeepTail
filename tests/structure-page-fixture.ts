/**
 * The shell and the dialog frame the page-contract suites seat, and the
 * surfaces both of them read.
 *
 * happy-dom paints no box, so the frame's rectangle is painted onto the element
 * instance the check reads; the browser suites remain the account of what a real
 * engine lays out. Held apart from the specs so each is the table of cases and
 * this is the machinery for seating one: the one shell with a main landmark and
 * the frame that keeps every promise of the dialog contract are what two suites
 * read, and a copy in each would drift.
 *
 * @module
 */

import { paintBox } from './structure-double.ts'

/** The product surfaces these checks read. */
export const SCOPE = '[data-deeptail-shell], [data-deeptail-picker]'

/**
 * One shell with an id and one main landmark in it, seated in the document.
 * @returns the shell.
 */
export function shellWithMain(): HTMLElement {
  const shell = document.createElement('div')
  shell.dataset['deeptailShell'] = ''
  shell.id = 'shell'
  shell.append(document.createElement('main'))
  document.body.append(shell)
  return shell
}

/**
 * One dialog the shared frame built inside the surface, keeping every promise
 * the contract names: marked, modal, named by a heading inside itself, holding
 * focus, and seated on screen.
 * @param holder - the element to seat the frame in.
 * @returns the dialog.
 */
export function framedDialog(holder: HTMLElement): HTMLElement {
  const frame = document.createElement('div')
  const dialog = document.createElement('div')
  dialog.id = 'dialog'
  dialog.setAttribute('role', 'dialog')
  dialog.setAttribute('aria-modal', 'true')
  dialog.dataset['deeptailDialog'] = ''
  dialog.setAttribute('aria-labelledby', 'dialog-title')
  const title = document.createElement('h2')
  title.id = 'dialog-title'
  title.textContent = 'New session'
  dialog.append(title)
  frame.append(dialog)
  holder.append(frame)
  paintBox(dialog, { top: 0, left: 0, right: 400, bottom: 300 })
  dialog.tabIndex = 0
  dialog.focus({ preventScroll: true })
  return dialog
}
