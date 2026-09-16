/**
 * Retired-framework markup: daisyUI, Tailwind, HTMX, Bootstrap, Vue.
 *
 * Split from `markup-gate.spec.ts` the day that file outgrew the size the
 * linter holds a module to. The scanner is the same one. Every framework is
 * driven at its current spelling and at the spelling its previous major wrote,
 * because the names a major renamed away from are the ones a page still on that
 * major carries.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { joined, namesWhy, styleOffences } from './fixtures.ts'

/** The reason an hx attribute is refused. */
const HX = 'an hx attribute wires behaviour into the tag'

/** The reason an htmx extension attribute is refused. */
const EXTENSION = 'an htmx extension attribute wires behaviour into the tag'

/** The reason a retired class token is refused. */
const CLASS = 'belongs to a UI framework this product retired'

/** The reason a Vue directive is refused. */
const VUE = 'a Vue directive wires behaviour into the tag'

/** The reason a shorthand binding is refused. */
const WIRED = 'a directive attribute wires behaviour into the tag'

/** The reason a Bootstrap hook is refused. */
const BOOTSTRAP = 'a Bootstrap data-bs attribute is a retired framework hook'

/** The reason a jQuery Mobile hook is refused. */
const JQUERY = 'a jQuery Mobile hook is a retired framework attribute'

/** The reason a Vue 2 slot attribute is refused. */
const SLOT = 'a Vue 2 slot attribute is a retired framework directive'

/** A daisyUI component group, assembled so this file is not the markup it plants. */
const GROUP = joined('btn-', 'group')

describe('the markup gate rejects a retired framework class or directive', () => {
  it('a daisyUI class, including the v4 leftover and the v5 compound', () => {
    namesWhy(styleOffences(`<div class="${joined('btn-', 'primary')}">x</div>`, 'index.html'), CLASS, 'btn-primary')
    namesWhy(styleOffences(`<div class="${GROUP}">x</div>`, 'index.html'), CLASS, GROUP)
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

  it('a daisyUI 5 modifier the exact-name list cannot see', () => {
    for (const token of [joined('stack-', 'top'), joined('file-', 'input'), joined('floating-', 'label')]) {
      namesWhy(styleOffences(`<div class="${token}">x</div>`, 'index.html'), CLASS, token)
    }
  })
})

describe('the markup gate rejects the previous major of a retired framework', () => {
  it('a component family the previous major decides with a prefix', () => {
    // A component family named by a prefix is a different token from the bare
    // component, so the bare name this product uses is admitted while the family
    // is not.
    for (const token of [
      joined('card-', 'body'),
      joined('card-', 'bordered'),
      joined('select-', 'bordered'),
      joined('textarea-', 'ghost'),
      joined('indicator-', 'item'),
      joined('link-', 'hover'),
      joined('is-', 'primary'),
      joined('has-', 'text-centered'),
      joined('uk-', 'grid'),
      joined('ui-', 'widget'),
      joined('waves-', 'light'),
      joined('z-depth-', '2'),
      joined('justify-content-', 'center'),
      joined('align-items-', 'start'),
      joined('form-check-', 'label'),
      joined('fw-', 'bold'),
      joined('fs-', '4'),
      joined('bg-gradient-', 'to-r'),
    ]) {
      namesWhy(styleOffences(`<div class="${token}">x</div>`, 'index.html'), CLASS, token)
    }
  })

  it('a bare component name the previous major owns alone', () => {
    for (const token of [
      'columns',
      'column',
      'tile',
      'notification',
      'level',
      'media',
      'message',
      'panel',
      'breadcrumb',
      'control',
      'segment',
      joined('input-', 'field'),
      joined('flex-', 'grow'),
      joined('overflow-', 'ellipsis'),
      joined('modal-', 'open'),
      joined('text-', 'center'),
      joined('float-', 'start'),
      joined('sticky-', 'top'),
    ]) {
      namesWhy(styleOffences(`<div class="${token}">x</div>`, 'index.html'), CLASS, token)
    }
  })

  it('a class a CSS-in-JS runtime generates, which has no sheet behind it', () => {
    // A styled-components or emotion build writes a hashed class into the markup
    // and ships the rule from JavaScript. The hash is the tell: a generated name
    // carries a digit or a capital, where a class written by hand is lowercase
    // words.
    for (const token of [
      joined('css-', '1a2b3c'),
      joined('sc-', 'bdVaJa'),
      joined('emotion-', '1x2y3z'),
      joined('jsx-', '1234567'),
    ]) {
      namesWhy(styleOffences(`<div class="${token}">x</div>`, 'index.html'), CLASS, token)
    }
  })

  it('but allows the product’s own vocabulary, which shares those stems', () => {
    // Every token here is a class this product ships: the bare components the
    // framework families are built on, the `-field`, `-row` and `-title` words
    // its own sheets select, and the screen-reader-only name it spells the way
    // Bootstrap spells one. A stem match refuses every one of them.
    for (const token of [
      'shell',
      'session-row',
      'roster-row',
      'roster-seat',
      'drawer-toggle',
      'drawer-scrim',
      'drawer-dismiss',
      'picker-field',
      'picker',
      'main-title',
      'main-body',
      'main-header',
      'session-title',
      'group-title',
      'modal-dialog',
      'modal-title',
      'modal-body',
      'modal-mask',
      'menu-item',
      'menu-label',
      'menu-footer',
      'field',
      'field-group',
      'row',
      'row-actions',
      'row-label',
      'row-origin',
      'list-seat',
      'session-list',
      'brand-row',
      'section-header',
      'button-primary',
      'button-outline',
      'visually-hidden',
      'status',
      'label',
      'card',
      'link',
      'input',
      'select',
      'textarea',
      'radio',
      'sidebar',
      'lede',
      'wordmark',
      'dot',
      'actions',
      'footer',
      'form',
      'main',
    ]) {
      expect([token, styleOffences(`<div class="shell ${token}">x</div>`, 'index.html')]).toEqual([token, []])
    }
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

  it('the core wiring attributes a page writes first', () => {
    for (const name of [
      joined('hx-', 'get'),
      joined('hx-', 'post'),
      joined('hx-', 'put'),
      joined('hx-', 'delete'),
      joined('hx-', 'patch'),
      joined('hx-', 'swap'),
      joined('hx-', 'trigger'),
      joined('hx-', 'target'),
      joined('hx-', 'boost'),
      joined('hx-', 'push-url'),
      joined('hx-', 'select'),
    ]) {
      namesWhy(styleOffences(`<div ${name}="/x">x</div>`, 'index.html'), HX, name)
    }
  })

  it('the SSE and WebSocket extensions, which carry no hx prefix at all', () => {
    // The extensions wire an element to a server-pushed stream under names of
    // their own, so the refusal is stated about those names as well as about
    // the core prefix.
    for (const name of [
      joined('sse-', 'swap'),
      joined('sse-', 'connect'),
      joined('ws-', 'connect'),
      joined('ws-', 'send'),
    ]) {
      namesWhy(styleOffences(`<div ${name}="stream">x</div>`, 'index.html'), EXTENSION, name)
    }
    expect(styleOffences('<div class="stream">x</div>', 'index.html')).toEqual([])
  })

  it('the template form HTMX 4 documents when custom elements are stripped', () => {
    // `<template hx type="partial">` is the published fallback, where `hx` is a
    // boolean attribute with no hyphen, and the runtime's internal spelling is
    // the `htmx-partial` attribute on the same tag. Assembled so this file is
    // not the markup it plants.
    const flag = joined('h', 'x')
    const kind = joined('par', 'tial')
    const internal = joined('htmx', '-partial')
    namesWhy(
      styleOffences(`<template ${flag} type="${kind}"><span>x</span></template>`, 'index.html'),
      HX,
      'template hx',
    )
    namesWhy(styleOffences(`<template ${internal}><span>x</span></template>`, 'index.html'), HX, 'htmx-partial')
    namesWhy(styleOffences(`<div ${flag}>x</div>`, 'index.html'), HX, 'boolean hx')
  })

  it('but allows a template that carries no htmx wiring', () => {
    expect(styleOffences('<template><span>x</span></template>', 'index.html')).toEqual([])
  })
})

describe('the markup gate rejects a Bootstrap, Vue or jQuery directive', () => {
  it('a grid class and a Vue or Bootstrap hook', () => {
    namesWhy(styleOffences(`<div class="${joined('col-md-', '6')}">x</div>`, 'index.html'), CLASS, 'col-md-6')
    namesWhy(styleOffences(`<div ${joined('v-', 'if')}="open">x</div>`, 'index.html'), VUE, 'v-if')
    namesWhy(
      styleOffences(`<div ${joined('data-bs-', 'toggle')}="modal">x</div>`, 'index.html'),
      BOOTSTRAP,
      'data-bs-toggle',
    )
  })

  it('every Vue directive and shorthand the two majors spell', () => {
    for (const name of [
      joined('v-', 'for'),
      joined('v-', 'model'),
      joined('v-', 'show'),
      joined('v-', 'html'),
      joined('v-bind:', 'title'),
      joined('v-on:', 'click'),
    ]) {
      namesWhy(styleOffences(`<div ${name}="x">x</div>`, 'index.html'), VUE, name)
    }
    for (const name of [joined(':', 'class'), joined('@', 'click'), joined('#', 'header')]) {
      namesWhy(styleOffences(`<div ${name}="x">x</div>`, 'index.html'), WIRED, name)
    }
  })

  it('every Alpine directive the two majors spell', () => {
    for (const name of [
      joined('x-', 'data'),
      joined('x-', 'show'),
      joined('x-', 'bind:value'),
      joined('x-', 'on:click'),
    ]) {
      namesWhy(styleOffences(`<div ${name}="x">x</div>`, 'index.html'), WIRED, name)
    }
  })

  it('the Vue 2 slot attribute the current major replaced with a directive', () => {
    // The scoped slot moved to `v-slot`, and the attribute carries no `v-`
    // prefix for the directive rule to read.
    namesWhy(
      styleOffences(`<template ${joined('slot-', 'scope')}="props">x</template>`, 'index.html'),
      SLOT,
      'slot-scope',
    )
  })

  it('the jQuery Mobile hooks, and not the ARIA role beside them', () => {
    for (const name of [joined('data-', 'ajax'), joined('data-', 'role'), joined('data-', 'transition')]) {
      namesWhy(styleOffences(`<a ${name}="false">x</a>`, 'index.html'), JQUERY, name)
    }
    // `role` is the platform's attribute and `data-deeptail-*` is this
    // product's, so both are admitted.
    expect(styleOffences('<div role="list" data-deeptail-state="loading">x</div>', 'index.html')).toEqual([])
    expect(styleOffences('<div data-deeptail-shell="true" data-deeptail-host="h">x</div>', 'index.html')).toEqual([])
  })
})
