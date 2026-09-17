/**
 * Shell integrity, the action wiring, and the script rules: what they report
 * for markup built right here.
 *
 * happy-dom paints no box and no type, so the geometry and typography findings
 * need a real layout — the browser suites are the account of those, and the
 * geometry halves are held in `structure-helpers.spec.ts`. What a check reads
 * off markup built here is driven here, where the mutation runs can judge it.
 * The dialog contract is the other half of what a document seats and lives in
 * `structure-page-dialog.spec.ts`; the class-vocabulary and motion halves live
 * in `structure-vocabulary.spec.ts`.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import { checkInlineScripts, checkOneOffScripts, checkShell } from '../apps/deeptail/tests/structure-shell.ts'
import { resetDocument } from './dom.ts'
import { collector } from './structure-double.ts'
import { SCOPE, shellWithMain } from './structure-page-fixture.ts'

/** The one action the registry of a case declares. */
const DECLARED = ['session.spawn']

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
  first.dataset.deeptailShell = ''
  const nested = document.createElement('div')
  nested.dataset.deeptailShell = ''
  first.append(nested)
  const second = document.createElement('div')
  second.dataset.deeptailShell = ''
  const crowded = document.createElement('div')
  crowded.dataset.deeptailShell = ''
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
  picker.dataset.deeptailPicker = ''
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
  blank.dataset.deeptailAction = '  '
  const many = document.createElement('div')
  many.id = 'many'
  many.dataset.deeptailAction = 'session.spawn session.kill'
  const stranger = document.createElement('button')
  stranger.id = 'stranger'
  stranger.dataset.deeptailAction = 'session.unknown'
  const unreachable = document.createElement('div')
  unreachable.id = 'unreachable'
  unreachable.dataset.deeptailAction = 'session.spawn'
  const outer = document.createElement('button')
  outer.id = 'outer'
  outer.dataset.deeptailAction = 'session.spawn'
  const nested = document.createElement('button')
  nested.id = 'nested'
  nested.dataset.deeptailAction = 'session.kill'
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
  root.dataset.deeptailPicker = ''
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
  root.dataset.deeptailShell = ''
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
