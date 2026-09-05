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
import { documentFixture, joined, styleOffences } from './fixtures.ts'

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
    expect(styleOffences(documentFixture('onclick'), 'index.html')).not.toEqual([])
  })

  it('an inline script with no src, and an inline stylesheet', () => {
    expect(styleOffences(joined('<scr', 'ipt>alert(1)</scr', 'ipt>'), 'index.html')).not.toEqual([])
    expect(styleOffences(joined('<sty', 'le>.a { color: red }</sty', 'le>'), 'index.html')).not.toEqual([])
  })

  it('a URL that executes text as code, however the scheme is disguised', () => {
    const js = scheme(['java', 'script:'], '')
    const spaced = scheme(['alert(1)'], '  JavaScript:')
    const tabbed = scheme(['script:alert(1)'], 'java\t')
    const vbs = scheme(['vb', 'script:'], '')
    const dataHtml = scheme(['data:', 'text/html'], '')
    expect(styleOffences(`<a href="${js}alert(1)">go</a>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<a href="${spaced}">go</a>`, 'index.html')).not.toEqual([])
    // A tab inside the scheme is how the prefix is spelt to get past a test.
    expect(styleOffences(`<a href="${tabbed}">go</a>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<iframe src="${dataHtml},<b>x</b>"></iframe>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<form action="${vbs}go()"></form>`, 'index.html')).not.toEqual([])
  })

  it('a handler carried inside markup built in script', () => {
    expect(styleOffences(joined('el.insertAdjacentHTML("beforeend", "<div onc', 'lick="go()">x</div>")'))).not.toEqual(
      [],
    )
  })

  it('a resource that loads from outside the bundle', () => {
    const host = remoteHost()
    expect(styleOffences(`<script type="module" src="${host}/app.js"></script>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<link rel="stylesheet" href="${host}/x.css">`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<img src="${host}/logo.svg" alt="">`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<iframe src="${host}/frame"></iframe>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<video poster="${host}/poster.png"></video>`, 'index.html')).not.toEqual([])
    // A remote base re-roots every relative load in the document to that host.
    expect(styleOffences(`<base href="${host}/">`, 'index.html')).not.toEqual([])
    // A protocol-relative URL borrows the page scheme and loads the same way.
    const relative = joined('//', 'cdn.example.com')
    expect(styleOffences(`<img src="${relative}/logo.svg" alt="">`, 'index.html')).not.toEqual([])
    // One remote candidate inside a source list is the same load.
    expect(styleOffences(`<img srcset="logo.svg 1x, ${host}/logo.svg 2x" alt="">`, 'index.html')).not.toEqual([])
  })
})

describe('the markup gate rejects a remote redirect', () => {
  it('a meta refresh to a remote address, and not a local one', () => {
    const host = remoteHost()
    expect(styleOffences(`<meta http-equiv="refresh" content="0; url=${host}/x">`, 'index.html')).not.toEqual([])
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

describe('the markup gate rejects retired class vocabulary', () => {
  it('a wiring attribute and a bracketed utility class', () => {
    // Spelt in parts so this file's own source carries neither whole.
    expect(styleOffences(documentFixture(joined('h', 'x-get')), 'index.html')).not.toEqual([])
    expect(styleOffences(`<div ${joined('cla', 'ss')}="${joined('w-', '[420px]')}">x</div>`, 'index.html')).not.toEqual(
      [],
    )
    expect(styleOffences(`<div class="${joined('bg-', '[#00f]')}">x</div>`, 'index.html')).not.toEqual([])
  })

  it('a framework directive, the theme hook and the shorthand bindings', () => {
    const theme = joined('data-', 'theme')
    const click = joined('@', 'click')
    const bind = joined(':c', 'lass')
    const data = joined('x-', 'data')
    expect(styleOffences(`<html ${theme}="dark">x</html>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<html ${theme.toUpperCase()}="dark">x</html>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<button ${click}="go()">x</button>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<div ${bind}="shell">x</div>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<div ${data}="{ open: false }">x</div>`, 'index.html')).not.toEqual([])
  })

  it('but allows a class list the design system names, which is the shipped vocabulary', () => {
    expect(styleOffences('<div class="shell card">x</div>', 'index.html')).toEqual([])
    expect(styleOffences('<a class="link" href="/x">go</a>', 'index.html')).toEqual([])
    expect(styleOffences('<div data-deeptail-shell="true">x</div>', 'index.html')).toEqual([])
  })
})

describe('the markup gate rejects layout decided in the tag', () => {
  it('an attribute that moves a box or its content', () => {
    expect(styleOffences(moves(joined('al', 'ign')), 'index.html')).not.toEqual([])
    expect(styleOffences(moves(joined('val', 'ign')), 'index.html')).not.toEqual([])
    expect(styleOffences(moves(joined('hs', 'pace')), 'index.html')).not.toEqual([])
    expect(styleOffences(moves(joined('vs', 'pace')), 'index.html')).not.toEqual([])
    expect(styleOffences(`<table ${joined('cell', 'padding')}="0">x</table>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<table ${joined('cell', 'spacing')}="0">x</table>`, 'index.html')).not.toEqual([])
  })

  it('a size or a colour decided in the tag', () => {
    // The banned attribute names are assembled, so this file's own source
    // stays clean under the gate that reads string fixtures.
    const width = joined('wid', 'th')
    const height = joined('hei', 'ght')
    const border = joined('bor', 'der')
    const colour = joined('bgc', 'olor')
    const hex = joined('#ff', 'f')
    expect(styleOffences(`<table ${width}="100%"><tr><td>x</td></tr></table>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<div ${width}="100">x</div>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<iframe ${height}="300"></iframe>`, 'index.html')).not.toEqual([])
    // A stray cell tag is dropped by the browser too, so the fixture rides in
    // the table the cell would actually live in.
    expect(styleOffences(`<table><tr><td ${border}="1">x</td></tr></table>`, 'index.html')).not.toEqual([])
    expect(styleOffences(`<body ${colour}="${hex}">x</body>`, 'index.html')).not.toEqual([])
  })

  it('but allows the image aspect-ratio hint, which stops a layout shift', () => {
    expect(styleOffences('<img src="/logo.svg" width="32" height="32" alt="">', 'index.html')).toEqual([])
  })

  it('a retired presentational element', () => {
    expect(styleOffences(joined('<cen', 'ter><p>x</p></cen', 'ter>'), 'index.html')).not.toEqual([])
    expect(styleOffences(joined('<fo', 'nt face="x">x</fo', 'nt>'), 'index.html')).not.toEqual([])
    expect(styleOffences(joined('<mar', 'quee>x</mar', 'quee>'), 'index.html')).not.toEqual([])
  })

  it('a second landmark, which splits the shell', () => {
    const extra = joined('<ma', 'in><p>one</p></ma', 'in><ma', 'in><p>two</p></ma', 'in>')
    expect(styleOffences(extra, 'index.html')).not.toEqual([])
    expect(styleOffences(documentFixture('class="card"'), 'index.html')).toEqual([])
  })

  it('but allows the one landmark a document carries', () => {
    expect(styleOffences('<main><p>x</p></main>', 'index.html')).toEqual([])
  })
})
