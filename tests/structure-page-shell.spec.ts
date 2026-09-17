/**
 * Shell integrity, the action wiring, the script rules, and the dialog
 * contract: what they report for markup built right here.
 *
 * happy-dom paints no box and no type, so the geometry and typography findings
 * need a real layout — the browser suites are the account of those, and the
 * geometry halves are held in `structure-helpers.spec.ts`. What a check reads
 * off markup built here is driven here, where the mutation runs can judge it.
 * The class-vocabulary and motion halves live in `structure-vocabulary.spec.ts`.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import {
  checkDialogContract,
  checkInlineScripts,
  checkOneOffScripts,
  checkShell,
} from '../apps/deeptail/tests/structure-shell.ts'
import { resetDocument } from './dom.ts'
import { collector, paintBox } from './structure-double.ts'

/** The product surfaces these checks read. */
const SCOPE = '[data-deeptail-shell], [data-deeptail-picker]'

/** What the dialog contract reads, with the controls one marker reaches. */
const LIMITS = { scope: SCOPE, interactive: 'button' }

/** The one action the registry of a case declares. */
const DECLARED = ['session.spawn']

/**
 * One shell with an id and one main landmark in it, seated in the document.
 * @returns the shell.
 */
function shellWithMain(): HTMLElement {
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
function framedDialog(holder: HTMLElement): HTMLElement {
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

beforeEach(() => {
  resetDocument()
})

it('reports an empty document, which is a first paint that never seated', () => {
  const { findings, add } = collector()
  checkShell(add, { scope: SCOPE })
  expect(findings).toEqual([
    {
      rule: 'empty-root',
      detail: 'the document has no product surface; first paint must seat the shell or the picker',
    },
  ])
})

it('reads one shell with one main as conforming', () => {
  shellWithMain()
  const { findings, add } = collector()
  checkShell(add, { scope: SCOPE })
  expect(findings).toEqual([])
})

it('reports a split shell, a nested shell, and a shell without exactly one main', () => {
  const first = document.createElement('div')
  first.dataset['deeptailShell'] = ''
  const nested = document.createElement('div')
  nested.dataset['deeptailShell'] = ''
  first.append(nested)
  const second = document.createElement('div')
  second.dataset['deeptailShell'] = ''
  const crowded = document.createElement('div')
  crowded.dataset['deeptailShell'] = ''
  crowded.append(document.createElement('main'), document.createElement('main'))
  document.body.append(first, second, crowded)
  const { findings, add } = collector()
  checkShell(add, { scope: SCOPE })
  expect(findings).toEqual([
    { rule: 'split-shell', detail: 'the document has 4 [data-deeptail-shell] roots; a document carries one' },
    { rule: 'nested-shell', detail: 'div contains another shell div' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'split-shell', detail: 'div contains 2 main landmarks' },
  ])
})

it('reports a second surface seated in the first, and a main outside every surface', () => {
  const shell = shellWithMain()
  const picker = document.createElement('div')
  picker.id = 'picker'
  picker.dataset['deeptailPicker'] = ''
  shell.append(picker)
  const stray = document.createElement('main')
  document.body.append(stray)
  const { findings, add } = collector()
  checkShell(add, { scope: SCOPE })
  expect(findings).toEqual([
    {
      rule: 'nested-surface',
      detail: 'div#picker is a product surface seated inside div#shell, which is one as well',
    },
    { rule: 'stray-main', detail: 'main is a main landmark outside every product surface' },
  ])
})

it('reports a shell seated outside the mount the page observes its layout in', () => {
  shellWithMain()
  const { findings, add } = collector()
  checkShell(add, { scope: SCOPE, mount: '#mount' })
  expect(findings).toEqual([
    {
      rule: 'shell-outside-mount',
      detail: "div#shell is seated outside #mount, where the page's layout is observed",
    },
  ])
})

it('reports every way an action hook is unwired, and the press that would run two actions', () => {
  const shell = shellWithMain()
  const blank = document.createElement('div')
  blank.id = 'blank'
  blank.setAttribute('data-deeptail-action', '  ')
  const many = document.createElement('div')
  many.id = 'many'
  many.setAttribute('data-deeptail-action', 'session.spawn session.kill')
  const stranger = document.createElement('button')
  stranger.id = 'stranger'
  stranger.setAttribute('data-deeptail-action', 'session.unknown')
  const unreachable = document.createElement('div')
  unreachable.id = 'unreachable'
  unreachable.setAttribute('data-deeptail-action', 'session.spawn')
  const outer = document.createElement('button')
  outer.id = 'outer'
  outer.setAttribute('data-deeptail-action', 'session.spawn')
  const nested = document.createElement('button')
  nested.id = 'nested'
  nested.setAttribute('data-deeptail-action', 'session.kill')
  outer.append(nested)
  shell.append(blank, many, stranger, unreachable, outer)
  const { findings, add } = collector()
  checkShell(add, { scope: SCOPE, interactive: 'button', actions: DECLARED })
  expect(findings).toEqual([
    { rule: 'unwired-action', detail: 'div#blank carries the action hook without naming an action at all' },
    {
      rule: 'unwired-action',
      detail: 'div#many names 2 actions (session.spawn, session.kill), where a control answers for one',
    },
    {
      rule: 'unwired-action',
      detail: 'button#stranger names action "session.unknown", which the shipped registry does not declare',
    },
    {
      rule: 'unwired-action',
      detail: 'div#unreachable names action "session.spawn" without being a control a keyboard reaches',
    },
    {
      rule: 'nested-action',
      detail: 'button#nested sits inside button#outer, which names an action of its own; one press runs both',
    },
    {
      rule: 'unwired-action',
      detail: 'button#nested names action "session.kill", which the shipped registry does not declare',
    },
  ])
})

it('reports every script hanging off a product surface, inline or sourced', () => {
  const root = document.createElement('div')
  root.dataset['deeptailPicker'] = ''
  const inline = document.createElement('script')
  const sourced = document.createElement('script')
  sourced.setAttribute('src', '/src/injected.ts')
  root.append(inline, sourced)
  document.body.append(root)
  const { findings, add } = collector()
  checkInlineScripts(add, { scope: '[data-deeptail-picker]' })
  expect(findings).toEqual([
    { rule: 'inline-script', detail: 'script is an inline script inside div' },
    { rule: 'inline-script', detail: 'script loads /src/injected.ts from inside div; the page has one module entry' },
  ])
})

it('reads a product surface with no script in it as the one module entry', () => {
  shellWithMain()
  const { findings, add } = collector()
  checkInlineScripts(add, { scope: SCOPE })
  expect(findings).toEqual([])
})

it('reports a sourced one-off outside the product surfaces, and stays silent for harness scripts', () => {
  const root = document.createElement('div')
  root.dataset['deeptailShell'] = ''
  const inside = document.createElement('script')
  inside.setAttribute('src', '/src/other.ts')
  root.append(inside)
  const harness = document.createElement('script')
  const shipped = document.createElement('script')
  shipped.setAttribute('src', '/src/main.ts')
  const chunk = document.createElement('script')
  chunk.setAttribute('src', '/assets/index-B1x2y3.js')
  const oneOff = document.createElement('script')
  oneOff.setAttribute('src', '/src/injected.ts')
  document.body.append(root, harness, shipped, chunk, oneOff)
  const { findings, add } = collector()
  checkOneOffScripts(add, { scope: SCOPE })
  expect(findings).toEqual([
    { rule: 'inline-script', detail: 'script loads /src/injected.ts; the page has one module entry' },
  ])
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
  stalled.dataset['deeptailDialog'] = ''
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
  lonely.dataset['deeptailDialog'] = ''
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
