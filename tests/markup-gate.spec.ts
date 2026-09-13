/**
 * What the markup gate rejects and allows.
 *
 * These are the refusals that live in the tag itself: a per-page script or
 * handler, a scripted URL, a resource that loads from outside the bundle, a
 * framework directive, a retired utility vocabulary, and layout or type
 * decided by attribute or presentational tag.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { documentFixture, joined, namesWhy, styleOffences } from './fixtures.ts'

/**
 * Assembles a URL scheme from parts, at module scope so the fixtures below
 * stay calls the coverage folder cannot run: this file's own constants then
 * never hold a scheme whole, and the repository stays clean under its gates.
 */
const scheme = (parts: string[], pad: string): string => pad + parts.join('')

/**
 * A remote host, assembled the same way, so no fixture carries one whole.
 */
const remoteHost = (): string => joined('ht', 'tps://cdn.example.com')

/**
 * A tag carrying a named attribute, at module scope for the same reason: the
 * helper captures nothing, and this file's own source carries no attribute
 * name whole.
 */
const moves = (name: string): string => `<div ${name}="center">x</div>`

describe('the markup gate rejects a per-page construct', () => {
  it('an inline event handler, whatever the tag', () => {
    namesWhy(styleOffences(documentFixture('onclick'), 'index.html'), 'an inline event handler is a per-page script', 'onclick')
  })

  it('an inline script with no src, and an inline stylesheet', () => {
    namesWhy(
      styleOffences(joined('<scr', 'ipt>alert(1)</scr', 'ipt>'), 'index.html'),
      'an inline script is a per-page script',
      'script',
    )
    namesWhy(
      styleOffences(joined('<sty', 'le>.a { color: red }</sty', 'le>'), 'index.html'),
      'an inline stylesheet is a per-page sheet',
      'style',
    )
  })

  it('a URL that executes text as code, however the scheme is disguised', () => {
    const js = scheme(['java', 'script:'], '')
    const spaced = scheme(['alert(1)'], '  JavaScript:')
    const tabbed = scheme(['script:alert(1)'], 'java\t')
    const vbs = scheme(['vb', 'script:'], '')
    const dataHtml = scheme(['data:', 'text/html'], '')
    const exec = 'a URL that executes text as code'
    namesWhy(styleOffences(`<a href="${js}alert(1)">go</a>`, 'index.html'), exec, 'javascript')
    namesWhy(styleOffences(`<a href="${spaced}">go</a>`, 'index.html'), exec, 'spaced javascript')
    namesWhy(styleOffences(`<a href="${tabbed}">go</a>`, 'index.html'), exec, 'tabbed javascript')
    namesWhy(styleOffences(`<iframe src="${dataHtml},<b>x</b>"></iframe>`, 'index.html'), exec, 'data-html')
    namesWhy(styleOffences(`<form action="${vbs}go()"></form>`, 'index.html'), exec, 'vbscript')
  })

  it('a handler carried inside markup built in script', () => {
    namesWhy(
      styleOffences(joined('el.insertAdjacentHTML("beforeend", "<div onc', 'lick="go()">x</div>")')),
      'an inline event handler is a per-page script',
      'insertAdjacentHTML onclick',
    )
  })

  it('a resource that loads from outside the bundle', () => {
    const host = remoteHost()
    const remote = 'a remote resource URL loads an asset no local install ships'
    namesWhy(styleOffences(`<script type="module" src="${host}/app.js"></script>`, 'index.html'), remote, 'script src')
    namesWhy(styleOffences(`<link rel="stylesheet" href="${host}/x.css">`, 'index.html'), remote, 'link href')
    namesWhy(styleOffences(`<img src="${host}/logo.svg" alt="">`, 'index.html'), remote, 'img src')
    namesWhy(styleOffences(`<iframe src="${host}/frame"></iframe>`, 'index.html'), remote, 'iframe src')
    namesWhy(styleOffences(`<video poster="${host}/poster.png"></video>`, 'index.html'), remote, 'video poster')
    namesWhy(styleOffences(`<base href="${host}/">`, 'index.html'), remote, 'base href')
    const relative = joined('//', 'cdn.example.com')
    namesWhy(styleOffences(`<img src="${relative}/logo.svg" alt="">`, 'index.html'), remote, 'protocol-relative')
    namesWhy(styleOffences(`<img srcset="logo.svg 1x, ${host}/logo.svg 2x" alt="">`, 'index.html'), remote, 'srcset')
  })
})

describe('the markup gate rejects a remote redirect', () => {
  it('a meta refresh to a remote address, and not a local one', () => {
    const host = remoteHost()
    namesWhy(
      styleOffences(`<meta http-equiv="refresh" content="0; url=${host}/x">`, 'index.html'),
      'a meta refresh to a remote address',
      'remote refresh',
    )
    expect(styleOffences('<meta http-equiv="refresh" content="0; url=/x">', 'index.html')).toEqual([])
  })
})

describe('the markup gate allows', () => {
  it('a URL that navigates by address', () => {
    expect(styleOffences('<a href="https://example.com/x">go</a>', 'index.html')).toEqual([])
    expect(styleOffences('<img src="/logo.svg" alt="">', 'index.html')).toEqual([])
    expect(styleOffences('<img srcset="/logo.svg 1x, /logo@2x.svg 2x" alt="">', 'index.html')).toEqual([])
    expect(styleOffences('<link rel="stylesheet" href="/theme.css">', 'index.html')).toEqual([])
    expect(styleOffences('<base href="/">', 'index.html')).toEqual([])
    expect(styleOffences('<a href="/report#top">top</a>', 'index.html')).toEqual([])
  })

  it('a script loaded by src, which ships a module', () => {
    expect(styleOffences('<script type="module" src="/src/main.ts"></script>', 'index.html')).toEqual([])
  })
})

describe('the markup gate rejects the current spelling of a retired framework', () => {
  it('a Tailwind 4 utility, whose important moved from prefix to suffix', () => {
    // v3 wrote `!p-4` and v4 writes `p-4!`. A reader that peeled only the
    // prefix did not recognise the current spelling of a token it already
    // refused in its old one.
    for (const token of ['p-4!', 'w-full!', 'text-sm!', 'rounded-lg!']) {
      namesWhy(
        styleOffences(`<div class="${token}">x</div>`, 'index.html'),
        'belongs to a UI framework this product retired',
        token,
      )
    }
  })

  it('a Tailwind 4 arbitrary value, which moved from brackets to parentheses', () => {
    // `bg-[--brand]` became `bg-(--brand)`.
    for (const token of ['bg-[--brand]', 'bg-(--brand)', 'w-(--size)', 'text-(--ink)']) {
      namesWhy(
        styleOffences(`<div class="${token}">x</div>`, 'index.html'),
        'a bracketed utility class carries a raw value',
        token,
      )
    }
  })

  it('a Tailwind 4 family that did not exist in 3', () => {
    for (const token of [
      'outline-hidden',
      'ring-3',
      'size-4',
      'mask-radial',
      'bg-linear-to-r',
      'text-shadow-sm',
      'inset-shadow-sm',
      'field-sizing-content',
      'scrollbar-thin',
    ]) {
      namesWhy(
        styleOffences(`<div class="${token}">x</div>`, 'index.html'),
        'belongs to a UI framework this product retired',
        token,
      )
    }
  })
})

describe('the markup gate rejects a class a retired framework renamed', () => {
  it('a daisyUI 5 class, including the ones renamed out of 4', () => {
    for (const token of [
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
    ]) {
      namesWhy(
        styleOffences(`<div class="${token}">x</div>`, 'index.html'),
        'belongs to a UI framework this product retired',
        token,
      )
    }
  })

  it('an htmx element, which an attribute-only reader cannot see', () => {
    // htmx 4 ships tags of its own; the partial tag is the documented
    // replacement for the out-of-band swap attribute. Assembled rather than
    // written out, so this fixture does not read as htmx markup to the scan
    // that reads every file the repository ships — the same reason the remote
    // host above is assembled.
    const tag = joined('hx', '-partial')
    const attribute = joined('data-hx', '-get')
    namesWhy(styleOffences(`<${tag}><span>x</span></${tag}>`, 'index.html'), 'is an htmx element', 'hx-partial')
    namesWhy(
      styleOffences(`<div ${attribute}="/a">x</div>`, 'index.html'),
      'an hx attribute wires behaviour into the tag',
      'data-hx-get',
    )
  })

  it('but allows the product’s own vocabulary, which shares stems with all of it', () => {
    // `.status` is this product's class and daisyUI 5's alike; the sheets are
    // the vocabulary, so the bare word cannot be refused on the framework's
    // account. The modifier form `status-` still is.
    for (const token of ['status', 'label', 'menu-item', 'card', 'modal-dialog', 'drawer-toggle']) {
      expect([token, styleOffences(`<div class="${token}">x</div>`, 'index.html')]).toEqual([token, []])
    }
  })
})

describe('the markup gate rejects retired class vocabulary', () => {
  it('a wiring attribute and a bracketed utility class', () => {
    // Spelt in parts so this file's own source carries neither whole.
    namesWhy(styleOffences(documentFixture(joined('h', 'x-get')), 'index.html'), 'an hx attribute wires behaviour into the tag', 'hx-get')
    namesWhy(
      styleOffences(`<div ${joined('cla', 'ss')}="${joined('w-', '[420px]')}">x</div>`, 'index.html'),
      'a bracketed utility class carries a raw value',
      'w-[420px]',
    )
    namesWhy(
      styleOffences(`<div class="${joined('bg-', '[#00f]')}">x</div>`, 'index.html'),
      'a bracketed utility class carries a raw value',
      'bg-[#00f]',
    )
  })

  it('a framework directive, the theme hook and the shorthand bindings', () => {
    const theme = joined('data-', 'theme')
    const click = joined('@', 'click')
    const bind = joined(':c', 'lass')
    const data = joined('x-', 'data')
    namesWhy(styleOffences(`<html ${theme}="dark">x</html>`, 'index.html'), 'data-theme is the daisyUI theme hook', 'data-theme')
    namesWhy(
      styleOffences(`<html ${theme.toUpperCase()}="dark">x</html>`, 'index.html'),
      'data-theme is the daisyUI theme hook',
      'DATA-THEME',
    )
    namesWhy(
      styleOffences(`<button ${click}="go()">x</button>`, 'index.html'),
      'a directive attribute wires behaviour into the tag',
      '@click',
    )
    namesWhy(
      styleOffences(`<div ${bind}="shell">x</div>`, 'index.html'),
      'a directive attribute wires behaviour into the tag',
      ':class',
    )
    namesWhy(
      styleOffences(`<div ${data}="{ open: false }">x</div>`, 'index.html'),
      'a directive attribute wires behaviour into the tag',
      'x-data',
    )
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
    const align = 'an alignment attribute is layout in the tag'
    namesWhy(styleOffences(moves(joined('al', 'ign')), 'index.html'), align, 'align')
    namesWhy(styleOffences(moves(joined('val', 'ign')), 'index.html'), align, 'valign')
    namesWhy(styleOffences(moves(joined('hs', 'pace')), 'index.html'), align, 'hspace')
    namesWhy(styleOffences(moves(joined('vs', 'pace')), 'index.html'), align, 'vspace')
    namesWhy(styleOffences(`<table ${joined('cell', 'padding')}="0">x</table>`, 'index.html'), align, 'cellpadding')
    namesWhy(styleOffences(`<table ${joined('cell', 'spacing')}="0">x</table>`, 'index.html'), align, 'cellspacing')
  })

  it('a size or a colour decided in the tag', () => {
    // The banned attribute names are assembled, so this file's own source
    // stays clean under the gate that reads string fixtures.
    const width = joined('wid', 'th')
    const height = joined('hei', 'ght')
    const border = joined('bor', 'der')
    const colour = joined('bgc', 'olor')
    const hex = joined('#ff', 'f')
    const present = 'a presentational attribute decides size or type in the tag'
    namesWhy(styleOffences(`<table ${width}="100%"><tr><td>x</td></tr></table>`, 'index.html'), present, 'table width')
    namesWhy(styleOffences(`<div ${width}="100">x</div>`, 'index.html'), present, 'div width')
    namesWhy(styleOffences(`<iframe ${height}="300"></iframe>`, 'index.html'), present, 'iframe height')
    namesWhy(styleOffences(`<table><tr><td ${border}="1">x</td></tr></table>`, 'index.html'), present, 'td border')
    namesWhy(styleOffences(`<body ${colour}="${hex}">x</body>`, 'index.html'), present, 'bgcolor')
  })

  it('but allows the image aspect-ratio hint, which stops a layout shift', () => {
    expect(styleOffences('<img src="/logo.svg" width="32" height="32" alt="">', 'index.html')).toEqual([])
  })

  it('a retired presentational element', () => {
    const tag = 'a retired presentational tag'
    namesWhy(styleOffences(joined('<cen', 'ter><p>x</p></cen', 'ter>'), 'index.html'), tag, 'center')
    namesWhy(styleOffences(joined('<fo', 'nt face="x">x</fo', 'nt>'), 'index.html'), tag, 'font')
    namesWhy(styleOffences(joined('<mar', 'quee>x</mar', 'quee>'), 'index.html'), tag, 'marquee')
  })

  it('a second landmark, which splits the shell', () => {
    const extra = joined('<ma', 'in><p>one</p></ma', 'in><ma', 'in><p>two</p></ma', 'in>')
    namesWhy(styleOffences(extra, 'index.html'), 'a second main splits the shell', 'two main')
    expect(styleOffences(documentFixture('class="card"'), 'index.html')).toEqual([])
  })

  it('but allows the one landmark a document carries', () => {
    expect(styleOffences('<main><p>x</p></main>', 'index.html')).toEqual([])
  })
})
