/**
 * Retired-framework markup: daisyUI, Tailwind, HTMX, Bootstrap, Vue.
 *
 * Split from `markup-gate.spec.ts` the day that file outgrew the size the
 * linter holds a module to. The scanner is the same one. Every framework is
 * driven at its current spelling and at the spelling its previous major wrote,
 * because the names a major renamed away from are the ones a page still on that
 * major carries. The tables are stated at module scope, so each case below
 * reads as the rule it drives.
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

/** The daisyUI families the previous major decides with a prefix. */
const DAISY_FAMILIES = [joined('card-', 'bordered'), joined('select-', 'bordered'), joined('textarea-', 'ghost')]
/** The Bulma and Pico modifier namespaces. */
const MODIFIER_FAMILIES = [joined('is-', 'primary'), joined('has-', 'text-centered')]
/** The Bootstrap families, whose member names are the whole family. */
const BOOTSTRAP_FAMILIES = [joined('form-check-', 'label'), joined('fw-', 'bold'), joined('fs-', '4')]
/** The UIKit and Semantic UI widget namespaces. */
const WIDGET_FAMILIES = [joined('uk-', 'grid'), joined('ui-', 'widget')]
/** The Materialize effect namespaces, and the depth scale beside them. */
const EFFECT_FAMILIES = [joined('waves-', 'light'), joined('z-depth-', '2')]
/** The Tailwind 3 gradient family, which the current major renamed. */
const GRADIENT_FAMILY = joined('bg-gradient-', 'to-r')

/** Bulma's component names. */
const BULMA_NAMES = ['columns', 'column', 'tile', 'notification', 'level', 'panel', 'breadcrumb', 'box']
/** Materialize's component names. */
const MATERIALIZE_NAMES = ['chip', 'collection', 'collapsible', joined('input-', 'field'), joined('pre', 'loader')]
/** The previous major's spellings of the utilities the current one renamed. */
const RENAMED_UTILITIES = [joined('flex-', 'grow'), joined('overflow-', 'ellipsis'), joined('modal-', 'open')]

/** The class names a CSS-in-JS runtime generates at build time. */
const GENERATED = [joined('css-', '1a2b3c'), joined('sc-', 'bdVaJa'), joined('jsx-', '1234567')]
/** The SSE and WebSocket extension attributes, which carry no hx prefix. */
const EXTENSIONS = [joined('sse-', 'swap'), joined('sse-', 'connect'), joined('ws-', 'connect'), joined('ws-', 'send')]
/** The shorthand a binding or a slot is written with in the two major versions. */
const SHORTHANDS = [joined(':', 'class'), joined('@', 'click'), joined('#', 'header')]
/** The jQuery Mobile hooks, which decide a transport or a role in the tag. */
const JQUERY_HOOKS = [joined('data-', 'ajax'), joined('data-', 'role'), joined('data-', 'transition')]

/** The core wiring attributes a page writes first. */
const CORE_WIRING = [
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
]

/** Every Vue directive the two major versions spell. */
const VUE_DIRECTIVES = [
  joined('v-', 'for'),
  joined('v-', 'model'),
  joined('v-', 'show'),
  joined('v-', 'html'),
  joined('v-bind:', 'title'),
  joined('v-on:', 'click'),
]

/** The shell's own classes. */
const PRODUCT_SHELL = ['shell', 'session-row', 'roster-row', 'roster-seat', 'drawer-toggle', 'drawer-scrim']
/** The picker's own classes. */
const PRODUCT_PICKER = ['picker-field', 'picker', 'main-title', 'main-body', 'session-title', 'group-title']
/** The dialog, menu and field classes. */
const PRODUCT_DIALOG = ['modal-dialog', 'modal-title', 'modal-body', 'menu-item', 'menu-label', 'field-group']
/** The roster row's own classes. */
const PRODUCT_ROWS = ['row-actions', 'row-label', 'list-seat', 'session-list', 'brand-row', 'section-header']
/** The controls and status strips the sheets select. */
const PRODUCT_CONTROLS = ['button-primary', 'button-outline', 'visually-hidden', 'status', 'label', 'card']
/** The bare words a retired framework also uses, which are this product's first. */
const PRODUCT_BARE = ['link', 'input', 'select', 'textarea', 'radio', 'sidebar', 'dot', 'actions', 'footer', 'form']

/** Every class this product ships, which no rule above may refuse. */
const PRODUCT_VOCABULARY = [
  ...PRODUCT_SHELL,
  ...PRODUCT_PICKER,
  ...PRODUCT_DIALOG,
  ...PRODUCT_ROWS,
  ...PRODUCT_CONTROLS,
  ...PRODUCT_BARE,
]

/**
 * One tag carrying a class, assembled at the call site.
 * @param token - the class token to plant.
 * @returns the fixture.
 */
const planted = (token: string): string => `<div class="${token}">x</div>`

/**
 * One tag carrying a named attribute.
 * @param name - the attribute name to plant.
 * @returns the fixture.
 */
const attributed = (name: string): string => `<div ${name}="/x">x</div>`

describe('the markup gate rejects a retired framework class or directive', () => {
  it('a daisyUI class, including the v4 leftover and the v5 compound', () => {
    namesWhy(styleOffences(planted(joined('btn-', 'primary')), 'index.html'), CLASS, 'btn-primary')
    namesWhy(styleOffences(planted(GROUP), 'index.html'), CLASS, GROUP)
    namesWhy(styleOffences(planted(joined('theme-', 'controller')), 'index.html'), CLASS, 'theme-controller')
    namesWhy(styleOffences(planted(joined('divi', 'der')), 'index.html'), CLASS, 'divider')
  })

  it('a Tailwind numeric utility, with or without a variant', () => {
    namesWhy(styleOffences(planted(joined('p-', '4')), 'index.html'), CLASS, 'p-4')
    namesWhy(styleOffences(planted(joined('md:p-', '4')), 'index.html'), CLASS, 'md:p-4')
    namesWhy(styleOffences(planted(joined('flex-', 'col')), 'index.html'), CLASS, 'flex-col')
  })

  it('a daisyUI 5 modifier the exact-name list cannot see', () => {
    for (const token of [joined('stack-', 'top'), joined('file-', 'input'), joined('floating-', 'label')]) {
      namesWhy(styleOffences(planted(token), 'index.html'), CLASS, token)
    }
  })
})

describe('the markup gate rejects the previous major of a retired framework', () => {
  it('a component family the previous major decides with a prefix', () => {
    // A family named by a prefix is a different token from the bare component,
    // so the bare name this product uses is admitted while the family is not.
    const families = [
      ...DAISY_FAMILIES,
      ...MODIFIER_FAMILIES,
      ...BOOTSTRAP_FAMILIES,
      ...WIDGET_FAMILIES,
      ...EFFECT_FAMILIES,
      GRADIENT_FAMILY,
    ]
    for (const token of families) {
      namesWhy(styleOffences(planted(token), 'index.html'), CLASS, token)
    }
  })

  it('a bare component name the previous major owns alone', () => {
    for (const token of [...BULMA_NAMES, ...MATERIALIZE_NAMES, ...RENAMED_UTILITIES]) {
      namesWhy(styleOffences(planted(token), 'index.html'), CLASS, token)
    }
  })

  it('a class a CSS-in-JS runtime generates, which has no sheet behind it', () => {
    // A styled-components or emotion build writes a hashed class into the markup
    // and ships the rule from JavaScript. The hash is the tell: it carries a
    // digit, or two capitals inside one word, where a class written by hand is
    // lowercase words.
    for (const token of GENERATED) {
      namesWhy(styleOffences(planted(token), 'index.html'), CLASS, token)
    }
  })

  it('but allows the product’s own vocabulary, which shares those stems', () => {
    for (const token of PRODUCT_VOCABULARY) {
      expect([token, styleOffences(planted(`shell ${token}`), 'index.html')]).toEqual([token, []])
    }
  })
})

describe('the markup gate rejects HTMX wiring', () => {
  it('an attribute, including the data- prefix and the inherited modifier', () => {
    namesWhy(styleOffences(attributed(joined('data-h', 'x-get')), 'index.html'), HX, 'data-hx-get')
    namesWhy(styleOffences(attributed(joined('hx-confirm', ':inherited')), 'index.html'), HX, 'hx-confirm:inherited')
    namesWhy(styleOffences(`<form ${joined('hx-sta', 'tus')}:422="target:#e"></form>`, 'index.html'), HX, 'hx-status')
    namesWhy(styleOffences(attributed(joined('hx-on', ':click')), 'index.html'), HX, 'hx-on')
  })

  it('every core wiring attribute a page writes', () => {
    for (const name of CORE_WIRING) {
      namesWhy(styleOffences(attributed(name), 'index.html'), HX, name)
    }
  })

  it('the SSE and WebSocket extensions, which carry no hx prefix at all', () => {
    // The extensions wire an element to a server-pushed stream under names of
    // their own, so the refusal is stated about those names as well as about
    // the core prefix.
    for (const name of EXTENSIONS) {
      namesWhy(styleOffences(attributed(name), 'index.html'), EXTENSION, name)
    }
    expect(styleOffences('<div class="stream">x</div>', 'index.html')).toEqual([])
  })

  it('the template form HTMX 4 documents when custom elements are stripped', () => {
    // `<template hx type="partial">` is the published fallback, where `hx` is a
    // boolean attribute with no hyphen, and the runtime's internal spelling is
    // the partial attribute on the same tag. Assembled so this file is not the
    // markup it plants.
    const flag = joined('h', 'x')
    const kind = joined('par', 'tial')
    const internal = joined('htmx-', 'partial')
    namesWhy(styleOffences(`<template ${flag} type="${kind}"><span>x</span></template>`, 'index.html'), HX, flag)
    namesWhy(styleOffences(`<template ${internal}></template>`, 'index.html'), HX, 'partial')
    namesWhy(styleOffences(`<div ${flag}>x</div>`, 'index.html'), HX, flag)
    expect(styleOffences('<template><span>x</span></template>', 'index.html')).toEqual([])
  })
})

describe('the markup gate rejects a Bootstrap, Vue or jQuery directive', () => {
  it('a Bootstrap grid class and a Bootstrap hook', () => {
    namesWhy(styleOffences(planted(joined('col-', 'md-6')), 'index.html'), CLASS, 'col-md')
    namesWhy(styleOffences(attributed(joined('data-bs-', 'toggle')), 'index.html'), BOOTSTRAP, 'data-bs')
  })

  it('every Vue directive and shorthand the two major versions spell', () => {
    namesWhy(styleOffences(attributed(joined('v-', 'if')), 'index.html'), VUE, 'v-if')
    for (const name of VUE_DIRECTIVES) {
      namesWhy(styleOffences(attributed(name), 'index.html'), VUE, name)
    }
    for (const name of SHORTHANDS) {
      namesWhy(styleOffences(attributed(name), 'index.html'), WIRED, name)
    }
    // The scoped slot moved to `v-slot`, and the previous major's attribute
    // carries no `v-` prefix for the directive rule to read.
    namesWhy(styleOffences(`<template ${joined('slot-', 'scope')}="p">x</template>`, 'index.html'), SLOT, 'slot')
  })

  it('every Alpine directive the two major versions spell', () => {
    const directives = [joined('x-', 'data'), joined('x-', 'show'), joined('x-', 'bind:v'), joined('x-', 'on:c')]
    for (const name of directives) {
      namesWhy(styleOffences(attributed(name), 'index.html'), WIRED, name)
    }
  })

  it('the jQuery Mobile hooks, and not the ARIA role beside them', () => {
    for (const name of JQUERY_HOOKS) {
      namesWhy(styleOffences(`<a ${name}="false">x</a>`, 'index.html'), JQUERY, name)
    }
    // `role` is the platform's attribute and `data-deeptail-*` is this
    // product's, so both are admitted.
    expect(styleOffences('<div role="list" data-deeptail-state="loading">x</div>', 'index.html')).toEqual([])
  })
})
