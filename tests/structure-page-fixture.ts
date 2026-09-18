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
 * Every marker is written by a function here that names its own attribute as a
 * literal. That is not tidiness: the style gate reads the attribute name at the
 * write, so a helper that took the name as a parameter would be a name the gate
 * cannot read, and it refuses exactly that. The writes go through `dataset`
 * with the member in brackets — `DOMStringMap` is an index signature, and
 * `tsconfig.base.json` sets `noPropertyAccessFromIndexSignature`, so the
 * compiler requires the bracket form of it.
 *
 * @module
 */

import { paintBox } from './structure-double.ts'

/** The product surfaces these checks read. */
export const SCOPE = '[data-deeptail-shell], [data-deeptail-picker]'

/**
 * Mark one element as the shell, so the reader finds it by the attribute.
 *
 * Written through `dataset` with the member in brackets, rather than as a
 * property: `DOMStringMap` is an index signature, and `tsconfig.base.json` sets
 * `noPropertyAccessFromIndexSignature`, so a property write of this name is a
 * compiler error.
 */
function markShell(shell: HTMLElement): void {
  shell.dataset['deeptailShell'] = ''
}

/** Mark one element as the picker, so the reader finds it by the attribute. */
function markPicker(picker: HTMLElement): void {
  picker.dataset['deeptailPicker'] = ''
}

/** Mark one element as a dialog the shared frame built. */
function markDialog(dialog: HTMLElement): void {
  dialog.dataset['deeptailDialog'] = ''
}

/**
 * Mark one element with the action hook, so the shell check reads it.
 * @param element - the control to mark.
 * @param hook - the action names the hook carries.
 */
function markAction(element: HTMLElement, hook: string): void {
  element.dataset['deeptailAction'] = hook
}

/**
 * One element marked as the shell, seated in the document.
 * @param id - the element's id, when a finding's text has to name it.
 * @returns the shell root.
 */
export function bareShell(id = ''): HTMLElement {
  const shell = document.createElement('div')
  if (id !== '') shell.id = id
  markShell(shell)
  document.body.append(shell)
  return shell
}

/**
 * One element marked as the picker, seated in the document.
 * @param id - the element's id, when a finding's text has to name it.
 * @returns the picker surface.
 */
export function barePicker(id = ''): HTMLElement {
  const picker = document.createElement('div')
  if (id !== '') picker.id = id
  markPicker(picker)
  document.body.append(picker)
  return picker
}

/**
 * One element carrying the action hook, seated in the document.
 *
 * The tag is the case's to choose because it is part of what the check reads: a
 * `button` is a control a keyboard reaches and a `div` is not, and a case about
 * an unreachable hook has to be able to say which it made.
 * @param hook - the action names the hook carries.
 * @param id - the element's id, when a finding's text has to name it.
 * @param tag - the element to build, `button` by default.
 * @returns the element.
 */
export function actionControl(hook: string, id = '', tag: 'button' | 'div' = 'button'): HTMLElement {
  const control = document.createElement(tag)
  if (id !== '') control.id = id
  markAction(control, hook)
  document.body.append(control)
  return control
}

/**
 * One shell with an id and one main landmark in it, seated in the document.
 * @returns the shell.
 */
export function shellWithMain(): HTMLElement {
  const shell = bareShell('shell')
  shell.append(document.createElement('main'))
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
  markDialog(dialog)
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
