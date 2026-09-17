/**
 * The dialog contract: what it reports for the frames, the dialogs and the
 * masks built right here.
 *
 * happy-dom paints no box, so a frame laid out past the viewport is painted —
 * through `paintBox`, the way every structure suite paints a rectangle — rather
 * than laid out; the browser suite that drives the real page is the account of
 * what an engine does with the same markup. The shell, the action wiring and the
 * script rules are the other half of these checks and are held in
 * `structure-page-shell.spec.ts`; what a dialog is promised is driven here,
 * where the mutation runs can judge it.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import { checkDialogContract } from '../apps/deeptail/tests/structure-dialog.ts'
import { resetDocument } from './dom.ts'
import { collector, paintBox } from './structure-double.ts'
import { framedDialog, SCOPE, shellWithMain } from './structure-page-fixture.ts'

/** What the dialog contract reads, with the controls one marker reaches. */
const LIMITS = { scope: SCOPE, interactive: 'button' }

beforeEach(() => {
  resetDocument()
})

it('reads one dialog the shared frame built as the contract it holds', () => {
  framedDialog(shellWithMain())
  const { findings, add } = collector()
  checkDialogContract(add, LIMITS)
  expect(findings).toEqual([])
})

it('reports a sibling able to take focus behind an open dialog, and an action off screen in it', () => {
  const shell = shellWithMain()
  const dialog = framedDialog(shell)
  const behind = document.createElement('button')
  behind.id = 'behind'
  shell.append(behind)
  const close = document.createElement('button')
  close.id = 'close'
  close.setAttribute('data-deeptail-action', 'session.spawn')
  dialog.append(close)
  const { findings, add } = collector()
  checkDialogContract(add, LIMITS)
  expect(findings).toEqual([
    { rule: 'dialog-contract', detail: 'div#dialog leaves button#behind able to take focus behind it' },
    { rule: 'dialog-contract', detail: 'button#close is an action off screen inside the open dialog' },
  ])
})

it('reports a second dialog, one the frame did not build, and the promises a frame keeps', () => {
  const rogue = document.createElement('div')
  rogue.id = 'rogue'
  rogue.setAttribute('role', 'dialog')
  rogue.setAttribute('aria-modal', 'true')
  const stalled = document.createElement('div')
  stalled.id = 'stalled'
  stalled.setAttribute('role', 'dialog')
  stalled.setAttribute('data-deeptail-dialog', '')
  document.body.append(rogue, stalled)
  const { findings, add } = collector()
  checkDialogContract(add, LIMITS)
  expect(findings).toEqual([
    { rule: 'dialog-contract', detail: 'the document holds 2 dialogs at once; one frame is open at a time' },
    {
      rule: 'dialog-contract',
      detail:
        'div#rogue is a dialog the shared frame did not build, so nothing holds its mask, its naming and its dismissal together',
    },
    { rule: 'dialog-contract', detail: 'div#stalled is the shared frame without declaring itself modal' },
    { rule: 'dialog-contract', detail: 'div#stalled is a dialog no name inside it reaches' },
    { rule: 'dialog-contract', detail: 'div#stalled is open with focus left outside it' },
    { rule: 'dialog-contract', detail: 'div#stalled is not wholly on screen where the reader can reach it' },
  ])
})

it('reports an element carrying the dialog marker without the dialog role to go with it', () => {
  const lonely = document.createElement('div')
  lonely.id = 'lonely'
  lonely.setAttribute('data-deeptail-dialog', '')
  document.body.append(lonely)
  const { findings, add } = collector()
  checkDialogContract(add, LIMITS)
  expect(findings).toEqual([
    {
      rule: 'dialog-contract',
      detail: 'div#lonely carries the dialog marker without the dialog role to go with it',
    },
  ])
})

it('reports a full-viewport layer no frame owns, and leaves the masks a root owns alone', () => {
  const shell = shellWithMain()
  const drawn = document.createElement('div')
  drawn.id = 'drawn'
  drawn.className = 'fixed-layer'
  shell.append(drawn)
  const mask = document.createElement('div')
  mask.id = 'mask'
  mask.className = 'fixed-layer'
  const small = document.createElement('div')
  small.id = 'small'
  small.className = 'fixed-layer'
  const still = document.createElement('div')
  still.id = 'still'
  still.className = 'fixed-layer still-layer'
  const holder = document.createElement('div')
  const owned = document.createElement('div')
  owned.id = 'owned'
  owned.className = 'fixed-layer'
  holder.append(owned)
  document.body.append(mask, small, still, holder)
  framedDialog(holder)
  const sheet = document.createElement('style')
  sheet.textContent = '.fixed-layer { position: fixed; } .still-layer { position: static; }'
  document.head.append(sheet)
  paintBox(drawn, { top: 0, left: 0, right: 1024, bottom: 768 })
  paintBox(mask, { top: 0, left: 0, right: 1024, bottom: 768 })
  paintBox(small, { top: 0, left: 0, right: 512, bottom: 384 })
  paintBox(still, { top: 0, left: 0, right: 1024, bottom: 768 })
  paintBox(owned, { top: 0, left: 0, right: 1024, bottom: 768 })
  const { findings, add } = collector()
  checkDialogContract(add, LIMITS)
  expect(findings).toEqual([
    {
      rule: 'overlay-contract',
      detail:
        'div#mask.fixed-layer is drawn over the whole viewport outside every product root, and no dialog frame owns it',
    },
  ])
})

it('reads a document holding no dialog at all as nothing to answer for', () => {
  shellWithMain()
  const { findings, add } = collector()
  checkDialogContract(add, LIMITS)
  expect(findings).toEqual([])
})
