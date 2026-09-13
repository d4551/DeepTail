/**
 * Retired-framework markup: daisyUI, Tailwind, HTMX 4, Bootstrap, Vue.
 *
 * Split from `markup-gate.spec.ts` the day that file outgrew the size the
 * linter holds a module to. The scanner is the same one.
 *
 * @module
 */

import { describe, it } from 'bun:test'
import { joined, namesWhy, styleOffences } from './fixtures.ts'

/** The reason an hx attribute is refused. */
const HX = 'an hx attribute wires behaviour into the tag'

/** The reason a retired class token is refused. */
const CLASS = 'belongs to a UI framework this product retired'

describe('the markup gate rejects a retired framework class or directive', () => {
  it('a daisyUI class, including the v4 leftover and the v5 compound', () => {
    namesWhy(styleOffences(`<div class="${joined('btn-', 'primary')}">x</div>`, 'index.html'), CLASS, 'btn-primary')
    namesWhy(styleOffences(`<div class="${joined('btn-', 'group')}">x</div>`, 'index.html'), CLASS, 'btn-group')
    namesWhy(
      styleOffences(`<div class="${joined('theme-', 'controller')}">x</div>`, 'index.html'),
      CLASS,
      'theme-controller',
    )
    namesWhy(styleOffences(`<div class="${joined('dock-', 'active')}">x</div>`, 'index.html'), CLASS, 'dock-active')
    namesWhy(styleOffences(`<div class="${joined('vali', 'dator')}">x</div>`, 'index.html'), CLASS, 'validator')
    namesWhy(styleOffences(`<input class="${joined('input-', 'sm')}">`, 'index.html'), CLASS, 'input-sm')
    namesWhy(styleOffences(`<div class="${joined('status-', 'error')}">x</div>`, 'index.html'), CLASS, 'status-error')
    namesWhy(styleOffences(`<div class="${joined('list-', 'row')}">x</div>`, 'index.html'), CLASS, 'list-row')
    namesWhy(styleOffences(`<div class="${joined('list-', 'col')}">x</div>`, 'index.html'), CLASS, 'list-col')
    namesWhy(styleOffences(`<div class="${joined('divi', 'der')}">x</div>`, 'index.html'), CLASS, 'divider')
  })

  it('a Tailwind numeric utility, with or without a variant', () => {
    namesWhy(styleOffences(`<div class="${joined('p-', '4')}">x</div>`, 'index.html'), CLASS, 'p-4')
    namesWhy(styleOffences(`<div class="${joined('md:p-', '4')}">x</div>`, 'index.html'), CLASS, 'md:p-4')
    namesWhy(styleOffences(`<div class="${joined('flex-', 'col')}">x</div>`, 'index.html'), CLASS, 'flex-col')
  })
})

describe('the markup gate rejects HTMX 4 wiring', () => {
  it('an attribute, including the data- prefix and the inherited modifier', () => {
    namesWhy(styleOffences(`<div ${joined('data-h', 'x-get')}="/x">x</div>`, 'index.html'), HX, 'data-hx-get')
    namesWhy(
      styleOffences(`<div ${joined('hx-confirm', ':inherited')}="sure?">x</div>`, 'index.html'),
      HX,
      'hx-confirm:inherited',
    )
    namesWhy(styleOffences(`<form ${joined('hx-sta', 'tus')}:422="target:#e"></form>`, 'index.html'), HX, 'hx-status')
    namesWhy(styleOffences(`<div ${joined('hx-act', 'ion')}="/x">x</div>`, 'index.html'), HX, 'hx-action')
    namesWhy(styleOffences(`<div ${joined('hx-met', 'hod')}="GET">x</div>`, 'index.html'), HX, 'hx-method')
    namesWhy(styleOffences(`<div ${joined('hx-con', 'fig')}="timeout:5">x</div>`, 'index.html'), HX, 'hx-config')
    namesWhy(styleOffences(`<div ${joined('hx-optimi', 'stic')}="...">x</div>`, 'index.html'), HX, 'hx-optimistic')
    namesWhy(styleOffences(`<div ${joined('hx-que', 'ry')}="/x">x</div>`, 'index.html'), HX, 'hx-query')
    namesWhy(styleOffences(`<div ${joined('hx-on', ':click')}="go()">x</div>`, 'index.html'), HX, 'hx-on')
    namesWhy(
      styleOffences(`<div ${joined('hx-include', ':append')}=".child">x</div>`, 'index.html'),
      HX,
      'hx-include:append',
    )
  })
})

describe('the markup gate rejects a Bootstrap or Vue directive', () => {
  it('a grid class and a Vue or Bootstrap hook', () => {
    namesWhy(styleOffences(`<div class="${joined('col-md-', '6')}">x</div>`, 'index.html'), CLASS, 'col-md-6')
    namesWhy(
      styleOffences(`<div ${joined('v-', 'if')}="open">x</div>`, 'index.html'),
      'a Vue directive wires behaviour into the tag',
      'v-if',
    )
    namesWhy(
      styleOffences(`<div ${joined('data-bs-', 'toggle')}="modal">x</div>`, 'index.html'),
      'a Bootstrap data-bs attribute is a retired framework hook',
      'data-bs-toggle',
    )
  })
})
