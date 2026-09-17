/**
 * The shell, script and class-vocabulary halves of the page-contract checks:
 * what they report for markup built right here.
 *
 * happy-dom paints no box and no type, so the geometry and typography findings
 * need a real layout — the browser suites are the account of those, and the
 * geometry halves are held in `structure-helpers.spec.ts`. What a check reads
 * off markup built here is driven here, where the mutation runs can judge it.
 * The type and motion halves live in `structure-page.spec.ts`.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import { checkInlineScripts, checkOneOffScripts, checkShell } from '../apps/deeptail/tests/structure-shell.ts'
import { checkClassVocabulary } from '../apps/deeptail/tests/structure-vocabulary.ts'
import { resetDocument } from './dom.ts'
import { collector, surface } from './structure-double.ts'

beforeEach(() => {
  resetDocument()
})

it('reports an empty document, which is a first paint that never seated', () => {
  const { findings, add } = collector()
  checkShell(add, { scope: '[data-deeptail-shell], [data-deeptail-picker]' })
  expect(findings).toEqual([
    {
      rule: 'empty-root',
      detail: 'the document has no product surface; first paint must seat the shell or the picker',
    },
  ])
})

it('reads one shell with one main as conforming', () => {
  const shell = document.createElement('div')
  shell.dataset['deeptailShell'] = ''
  shell.append(document.createElement('main'))
  document.body.append(shell)
  const { findings, add } = collector()
  checkShell(add, { scope: '[data-deeptail-shell]' })
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
  checkShell(add, { scope: '[data-deeptail-shell]' })
  expect(findings).toEqual([
    { rule: 'split-shell', detail: 'the document has 4 [data-deeptail-shell] roots; a document carries one' },
    { rule: 'nested-shell', detail: 'div contains another shell div' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'shell-without-main', detail: 'div has no main landmark' },
    { rule: 'split-shell', detail: 'div contains 2 main landmarks' },
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
  checkOneOffScripts(add, { scope: '[data-deeptail-shell]' })
  expect(findings).toEqual([
    { rule: 'inline-script', detail: 'script loads /src/injected.ts; the page has one module entry' },
  ])
})

it('reports every class no shipped sheet defines, and stays silent for the vocabulary', () => {
  const root = surface('div')
  root.className = 'session-row'
  const child = document.createElement('button')
  child.className = 'picker-field one-off'
  root.append(child)
  document.body.append(root)
  const { findings, add } = collector()
  checkClassVocabulary(add, { scope: '[data-structure-scope]', vocabulary: ['session-row', 'picker-field'] })
  expect(findings).toEqual([
    {
      rule: 'unknown-class',
      detail: 'button.picker-field.one-off carries class "one-off", which no shipped sheet defines',
    },
  ])
})
