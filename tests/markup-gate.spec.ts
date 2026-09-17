/**
 * What the markup gate rejects and allows.
 *
 * These are the refusals that live in the tag itself: a per-page script or
 * handler, a scripted URL, a resource that loads from outside the bundle, a
 * framework directive, a retired utility vocabulary, and layout or type
 * decided by attribute or presentational tag. The token tables sit at module
 * scope, so each case below reads as the rule it drives.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { documentFixture, joined, namesWhy, styleOffences } from './fixtures.ts'

/** The reason a retired utility class or framework class is refused. */
const CLASS = 'belongs to a UI framework this product retired'
/** The reason a bracketed utility class is refused. */
const BRACKETED = 'a bracketed utility class carries a raw value'
/** The reason a framework directive is refused. */
const DIRECTIVE = 'a directive attribute wires behaviour into the tag'
/** The reason a presentational attribute is refused. */
const PRESENTATIONAL = 'a presentational attribute decides size or type in the tag'
/** The reason a retired presentational element is refused. */
const RETIRED_TAG = 'a retired presentational tag'
/** The reason a second landmark is refused. */
const SPLIT_SHELL = 'a second main splits the shell'
/** The reason an hx attribute is refused. */
const HX = 'an hx attribute wires behaviour into the tag'

/** A tag carrying a named attribute. */
const moves = (name: string): string => `<div ${name}="center">x</div>`
/** A tag pair around one character of text, named at the call site. */
const pair = (name: string): string => joined(`<${name}>`, 'x', `</${name}>`)
/** One tag carrying a class, assembled at the call site. */
const planted = (token: string): string => `<div class="${token}">x</div>`

/** The important marker, which the current major writes as a suffix. */
const TAILWIND4_IMPORTANT = ['p-4!', 'w-full!', 'text-sm!', 'rounded-lg!']
/** The arbitrary values, which the current major spells in parentheses. */
const TAILWIND4_ARBITRARY = [joined('bg-', '[--brand]'), joined('bg-', '(--brand)'), joined('w-', '(--size)')]
/** The families the current major added or renamed into. */
const TAILWIND4_FAMILIES = [
  'outline-hidden',
  'ring-3',
  'size-4',
  'mask-radial',
  'bg-linear-to-r',
  'text-shadow-sm',
  'inset-shadow-sm',
  'field-sizing-content',
  'scrollbar-thin',
]
/** The previous major's marker, written after a variant as well as before it. */
const TAILWIND3_VARIANTS = [
  joined('md:!', 'p-4'),
  joined('hover:!', 'flex-col'),
  joined('md:!', 'btn-', 'primary'),
  joined('flex-', 'grow'),
  joined('overflow-', 'ellipsis'),
  joined('bg-gradient-', 'to-r'),
]
/** The daisyUI 5 classes, including the ones the major renamed out of 4. */
const DAISY5_RENAMED = [
  'card-border',
  'menu-active',
  'menu-disabled',
  'menu-focus',
  'tabs-border',
  'tabs-lift',
  'tabs-box',
  'card-sm',
  'dock-active',
  'fieldset-legend',
  'list-col-wrap',
  'validator-hint',
  'filter-reset',
]
/** The classes this product ships, which every class rule must admit. */
const PRODUCT_TOKENS = [
  'status',
  'label',
  'menu-item',
  'card',
  'modal-dialog',
  'drawer-toggle',
  'session-row',
  'roster-row',
  'picker-field',
  'main-title',
  'roster-seat',
  'visually-hidden',
]
/** The presentational tags the platform retired. */
const RETIRED_TAGS = ['acronym', 'big', 'blink', 'dir', 'nobr', 'strike', 'tt']
/** The alignment attributes, refused on any element. */
const ALIGNMENT_ANY = [joined('al', 'ign'), joined('val', 'ign'), joined('hs', 'pace'), joined('vs', 'pace')]
/** The table chrome, refused on the element that carries it. */
const ALIGNMENT_TABLE = [joined('cell', 'padding'), joined('cell', 'spacing')]

describe('the markup gate rejects the current spelling of a retired framework', () => {
  it('a Tailwind 4 utility, whose important moved from prefix to suffix', () => {
    for (const token of TAILWIND4_IMPORTANT) {
      namesWhy(styleOffences(planted(token), 'index.html'), CLASS, token)
    }
  })

  it('a Tailwind 4 arbitrary value, which moved from brackets to parentheses', () => {
    for (const token of TAILWIND4_ARBITRARY) {
      namesWhy(styleOffences(planted(token), 'index.html'), BRACKETED, token)
    }
  })

  it('a Tailwind 4 family that did not exist in 3', () => {
    for (const token of TAILWIND4_FAMILIES) {
      namesWhy(styleOffences(planted(token), 'index.html'), CLASS, token)
    }
  })
})

describe('the markup gate rejects the previous major of a retired framework', () => {
  it('a Tailwind 3 utility under the variant and the importance that major wrote', () => {
    for (const token of TAILWIND3_VARIANTS) {
      namesWhy(styleOffences(planted(token), 'index.html'), CLASS, token)
    }
  })

  it('a daisyUI class the current major renamed, including the ones out of 4', () => {
    for (const token of DAISY5_RENAMED) {
      namesWhy(styleOffences(planted(token), 'index.html'), CLASS, token)
    }
  })
})

describe('the markup gate rejects a class a retired framework renamed', () => {
  it('an htmx element, which an attribute-only reader cannot see', () => {
    // htmx 4 ships tags of its own; the partial tag is the documented
    // replacement for the out-of-band swap attribute. Assembled rather than
    // written out, so this fixture does not read as htmx markup to the scan
    // that reads every file the repository ships.
    const tag = joined('hx', '-partial')
    const attribute = joined('data-hx', '-get')
    namesWhy(styleOffences(`<${tag}><span>x</span></${tag}>`, 'index.html'), 'is an htmx element', 'partial')
    namesWhy(styleOffences(`<div ${attribute}="/a">x</div>`, 'index.html'), HX, attribute)
  })

  it('but allows the product’s own vocabulary, which shares stems with all of it', () => {
    // `.status` is this product's class and daisyUI 5's alike; the sheets are
    // the vocabulary, so the bare word cannot be refused on the framework's
    // account.
    for (const token of PRODUCT_TOKENS) {
      expect([token, styleOffences(planted(token), 'index.html')]).toEqual([token, []])
    }
  })
})

describe('the markup gate rejects the previous generation of the platform itself', () => {
  it('a presentational tag the generation before this one wrote', () => {
    // The family the centering, type and marquee tags belong to: the type
    // sizing, struck-through, non-breaking and acronym tags, and the obsolete
    // list. Each of those decides type or motion where the sheet decides it.
    for (const name of RETIRED_TAGS) {
      namesWhy(styleOffences(pair(name), 'index.html'), RETIRED_TAG, name)
    }
  })

  it('but allows every element the platform kept and this product renders', () => {
    expect(styleOffences('<div class="shell"><p>x</p></div>', 'index.html')).toEqual([])
    expect(styleOffences('<dl><dt>t</dt><dd>d</dd></dl>', 'index.html')).toEqual([])
    expect(
      styleOffences('<table><caption>c</caption><tbody><tr><td>x</td></tr></tbody></table>', 'index.html'),
    ).toEqual([])
    expect(styleOffences('<button type="button"><span>x</span></button>', 'index.html')).toEqual([])
  })
})

describe('the markup gate rejects a wiring attribute and a bracketed utility', () => {
  it('a wiring attribute and a bracketed utility class', () => {
    const wide = joined('w-', '[420px]')
    const ink = joined('bg-', '[#00f]')
    namesWhy(styleOffences(documentFixture(joined('h', 'x-get')), 'index.html'), HX, joined('h', 'x-get'))
    namesWhy(styleOffences(`<div ${joined('cla', 'ss')}="${wide}">x</div>`, 'index.html'), BRACKETED, wide)
    namesWhy(styleOffences(planted(ink), 'index.html'), BRACKETED, ink)
  })
})

describe('the markup gate rejects a framework directive', () => {
  it('a framework directive, the theme hook and the shorthand bindings', () => {
    const theme = joined('data-', 'theme')
    const click = joined('@', 'click')
    const bind = joined(':c', 'lass')
    const data = joined('x-', 'data')
    namesWhy(styleOffences(`<html ${theme}="dark">x</html>`, 'index.html'), theme, theme)
    namesWhy(styleOffences(`<html ${theme.toUpperCase()}="dark">x</html>`, 'index.html'), theme, theme)
    namesWhy(styleOffences(`<button ${click}="go()">x</button>`, 'index.html'), DIRECTIVE, click)
    namesWhy(styleOffences(`<div ${bind}="shell">x</div>`, 'index.html'), DIRECTIVE, bind)
    namesWhy(styleOffences(`<div ${data}="{ open: false }">x</div>`, 'index.html'), DIRECTIVE, data)
  })

  it('but allows a class list the design system names, which is the shipped vocabulary', () => {
    expect(styleOffences('<div class="shell card">x</div>', 'index.html')).toEqual([])
    expect(styleOffences('<a class="link" href="/x">go</a>', 'index.html')).toEqual([])
    expect(styleOffences('<div data-deeptail-shell="true">x</div>', 'index.html')).toEqual([])
    expect(styleOffences('<button class="button-primary drawer-toggle menu-item">x</button>', 'index.html')).toEqual([])
    expect(styleOffences('<input class="input">', 'index.html')).toEqual([])
    expect(styleOffences('<div class="list status label">x</div>', 'index.html')).toEqual([])
  })
})

describe('the markup gate rejects layout decided in the tag', () => {
  it('an attribute that moves a box or its content', () => {
    for (const name of ALIGNMENT_ANY) {
      namesWhy(styleOffences(moves(name), 'index.html'), 'an alignment attribute is layout in the tag', name)
    }
    for (const name of ALIGNMENT_TABLE) {
      namesWhy(styleOffences(`<table ${name}="0">x</table>`, 'index.html'), 'an alignment attribute', name)
    }
  })

  it('a size or a colour decided in the tag', () => {
    // The banned attribute names are assembled, so this file's own source
    // stays clean under the gate that reads string fixtures.
    const width = joined('wid', 'th')
    const height = joined('hei', 'ght')
    const border = joined('bor', 'der')
    const tone = joined('bgc', 'olor')
    const hex = joined('#ff', 'f')
    namesWhy(styleOffences(`<table ${width}="100%"><tr><td>x</td></tr></table>`, 'index.html'), PRESENTATIONAL, width)
    namesWhy(styleOffences(`<div ${width}="100">x</div>`, 'index.html'), PRESENTATIONAL, width)
    namesWhy(styleOffences(`<iframe ${height}="300"></iframe>`, 'index.html'), PRESENTATIONAL, height)
    namesWhy(styleOffences(`<table><tr><td ${border}="1">x</td></tr></table>`, 'index.html'), PRESENTATIONAL, border)
    namesWhy(styleOffences(`<body ${tone}="${hex}">x</body>`, 'index.html'), PRESENTATIONAL, tone)
  })

  it('but allows the image aspect-ratio hint, which stops a layout shift', () => {
    expect(styleOffences('<img src="/logo.svg" width="32" height="32" alt="">', 'index.html')).toEqual([])
  })

  it('a retired presentational element', () => {
    namesWhy(styleOffences(joined('<cen', 'ter><p>x</p></cen', 'ter>'), 'index.html'), RETIRED_TAG, 'center')
    namesWhy(styleOffences(joined('<fo', 'nt face="x">x</fo', 'nt>'), 'index.html'), RETIRED_TAG, 'font')
    namesWhy(styleOffences(joined('<mar', 'quee>x</mar', 'quee>'), 'index.html'), RETIRED_TAG, 'marquee')
  })

  it('a second landmark, which splits the shell', () => {
    const extra = joined('<ma', 'in><p>one</p></ma', 'in><ma', 'in><p>two</p></ma', 'in>')
    namesWhy(styleOffences(extra, 'index.html'), SPLIT_SHELL, 'two main')
    expect(styleOffences(documentFixture('class="card"'), 'index.html')).toEqual([])
  })

  it('but allows the one landmark a document carries', () => {
    expect(styleOffences('<main><p>x</p></main>', 'index.html')).toEqual([])
  })
})
