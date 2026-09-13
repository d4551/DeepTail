/**
 * Markup-gate refusals that live in a script, a scheme, or a remote load.
 *
 * Split from `markup-gate.spec.ts` the day named-why assertions pushed that
 * file past the size the linter holds a module to.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { documentFixture, joined, markupFixture, namesWhy, styleOffences } from './fixtures.ts'

/**
 * Assembles a URL scheme from parts, at module scope so the fixtures below
 * stay calls the coverage folder cannot run: this file's own constants then
 * never hold a scheme whole, and the repository stays clean under its gates.
 */
const scheme = (parts: string[], pad: string): string => pad + parts.join('')

/** A remote host, assembled the same way, so no fixture carries one whole. */
const remoteHost = (): string => joined('ht', 'tps://cdn.example.com')

describe('the markup gate rejects an inline script or handler', () => {
  it('an inline event handler, whatever the tag', () => {
    namesWhy(
      styleOffences(documentFixture('onclick'), 'index.html'),
      'an inline event handler is a per-page script',
      'onclick',
    )
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

  it('a handler carried inside markup built in script', () => {
    namesWhy(
      styleOffences(markupFixture('onclick')),
      'an inline event handler is a per-page script',
      'insertAdjacentHTML onclick',
    )
  })
})

describe('the markup gate rejects a URL that executes or loads remotely', () => {
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

describe('the markup gate allows a URL that navigates by address', () => {
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
