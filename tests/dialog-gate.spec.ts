/**
 * The dialog-ownership rule, driven both ways.
 *
 * `ui/modal.ts` is the product's dialog: portalled, named by its own heading,
 * masked, closed on `Escape`, and opened with every sibling of its root made
 * `inert` so there is nowhere for focus to go. None of that is visible from a
 * call site, so a second dialog assembled from a `div` and a role looks
 * finished on screen while being reachable behind the mask, announced without
 * a name, and closed by nothing.
 *
 * Fixtures are assembled from lines rather than read off the tree, so what each
 * case refuses is the spelling it names.
 */

import { describe, expect, it } from 'bun:test'
import { DIALOG_MODULES, DIALOG_REFUSAL, scanDialogs } from '../scripts/dialog-gate.ts'
import { source } from './fixtures.ts'

/** The reasons one module is rejected for. */
function dialogOffences(...lines: readonly string[]): string[] {
  return scanDialogs('apps/deeptail/src/ui/probe.ts', source(...lines)).map((offence) => offence.why)
}

describe('the dialog rule refuses', () => {
  it('a surface that names itself a dialog to assistive technology', () => {
    expect(dialogOffences("const pane = el('div', { role: 'dialog' })")).toEqual([DIALOG_REFUSAL])
    expect(dialogOffences("const pane = el('div', { role: 'alertdialog' })")).toEqual([DIALOG_REFUSAL])
  })

  it('a surface that claims to hold the page', () => {
    expect(dialogOffences("const pane = el('div', { aria: { modal: 'true' } })")).toEqual([DIALOG_REFUSAL])
  })

  it('the same two written onto an element afterwards', () => {
    expect(dialogOffences("pane.setAttribute('role', 'dialog')")).toEqual([DIALOG_REFUSAL])
    expect(dialogOffences("pane.setAttribute('aria-modal', 'true')")).toEqual([DIALOG_REFUSAL])
    expect(dialogOffences("pane.setAttribute('ARIA-Modal', 'true')")).toEqual([DIALOG_REFUSAL])
  })

  it('a part of the dialog surface drawn by its own class', () => {
    expect(dialogOffences("const pane = el('div', { className: 'modal-dialog' })")).toEqual([DIALOG_REFUSAL])
    expect(dialogOffences("const mask = el('div', { className: 'modal-mask' })")).toEqual([DIALOG_REFUSAL])
  })

  it('a name assembled from constants, which is the name it assembles', () => {
    // A rule that read only literals would miss the same surface written one
    // indirection away.
    expect(dialogOffences("const named = 'dialog'", "const pane = el('div', { role: named })")).toEqual([
      DIALOG_REFUSAL,
    ])
  })
})

describe('the dialog rule allows', () => {
  it('the module’s own opener, which is how a dialog is reached', () => {
    expect(dialogOffences("const held = openDialog(t('shell.newSession'))")).toEqual([])
  })

  it('a role that is not a dialog', () => {
    expect(dialogOffences("const bar = el('div', { role: 'presentation' })")).toEqual([])
    expect(dialogOffences("const menu = el('div', { role: 'menu' })")).toEqual([])
    expect(dialogOffences("bar.setAttribute('role', 'toolbar')")).toEqual([])
  })

  it('a class whose name only begins like the dialog’s', () => {
    expect(dialogOffences("const row = el('div', { className: 'model-row' })")).toEqual([])
    expect(dialogOffences("const row = el('div', { className: 'roster-row' })")).toEqual([])
  })

  it('an attribute that carries neither the role nor the claim', () => {
    expect(dialogOffences("pane.setAttribute('aria-label', label)")).toEqual([])
    expect(dialogOffences("pane.setAttribute('data-deeptail-dialog', '')")).toEqual([])
  })
})

describe('the modules the dialog is made of', () => {
  it('names both by their whole path, so no file can join by its ending', () => {
    expect([...DIALOG_MODULES].toSorted()).toEqual(['apps/deeptail/src/ui/dom.ts', 'apps/deeptail/src/ui/modal.ts'])
  })

  it('would refuse the module that owns the dialog, which is why it is named', () => {
    // The rule has no exemption of its own: the gate narrows the files it
    // reads. Driving the module's own spelling through the rule is what shows
    // the exemption is doing work rather than decorating a list.
    expect(dialogOffences("const dialog = el('div', { role: 'dialog' })")).toEqual([DIALOG_REFUSAL])
  })
})
