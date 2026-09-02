/**
 * What the inline-style gate rejects and allows.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import {
  badge,
  concatenatedMarkup,
  documentFixture,
  interpolatedMarkup,
  joined,
  markupFixture,
  readsTheName,
  source,
  styleOffences,
} from './fixtures.ts'

/**
 * Assembles a URL scheme from parts, at module scope so the fixtures below
 * stay calls the coverage folder cannot run: this file's own constants then
 * never hold a scheme whole, and the repository stays clean under its gates.
 */
const scheme = (parts: string[], pad: string): string => pad + parts.join('')

describe('the inline-style gate rejects a property write', () => {
  it('the plain property write it exists for', () => {
    expect(styleOffences('el.style.color = "red"')).not.toEqual([])
  })

  it('a style declaration merged onto an element', () => {
    expect(styleOffences("Object.assign(el, { style: 'color: red' })")).not.toEqual([])
    expect(styleOffences('Object.defineProperties(el, { style: { value: 1 } })')).not.toEqual([])
  })

  it('a computed property spelt around', () => {
    expect(styleOffences("el['sty' + 'le'].color = 'red'")).not.toEqual([])
    expect(styleOffences("el['style'].color = 'red'")).not.toEqual([])
  })

  it('the typed style map and the bulk text form', () => {
    expect(styleOffences('el.attributeStyleMap.set("color", "red")')).not.toEqual([])
    expect(styleOffences('el.style.cssText = "color: red"')).not.toEqual([])
  })

  it('the declaration destructured back out of an element', () => {
    expect(styleOffences('const { style } = el')).not.toEqual([])
    expect(styleOffences('const { style: declaration } = el')).not.toEqual([])
    expect(styleOffences('function paint({ style }) { return style }')).not.toEqual([])
  })
})

describe('the inline-style gate rejects a write whose name is assembled', () => {
  it('an attribute named in a case HTML treats as the same name', () => {
    expect(styleOffences("document.body.setAttribute('STYLE', 'color: red')")).not.toEqual([])
  })

  it('an attribute name held in a constant', () => {
    expect(readsTheName(source("const attribute = 'style'", "el.setAttribute(attribute, 'x')"))).toBe(true)
  })

  it('an attribute name assembled from parts', () => {
    // Each of these asserts the name was *read*, not merely that something was
    // reported: an unreadable name is refused too, so asking only whether the
    // source was rejected would pass with every folding rule deleted.
    for (const spelling of [
      "'sty' + 'le'",
      `\`sty\${"le"}\``,
      'String.fromCharCode(115, 116, 121, 108, 101)',
      'String.fromCodePoint(115, 116, 121, 108, 101)',
      "['s', 't', 'y', 'l', 'e'].join('')",
      "['st', 'le'].join('y')",
      "'STYLE'.toLowerCase()",
      "'style'.toUpperCase()",
      "'st'.concat('y', 'le')",
      "('style' as string)",
    ]) {
      expect([spelling, readsTheName(`el.setAttribute(${spelling}, 'x')`)]).toEqual([spelling, true])
    }
  })

  it('a name that two constants disagree about, which it will not guess at', () => {
    // Two declarations of one name, and the gate cannot say which reaches the
    // call. Choosing either would be a guess, so the name is refused as
    // unreadable rather than excused as harmless.
    const contested = source("const attribute = 'role'", "const attribute = 'style'", "el.setAttribute(attribute, 'x')")
    expect(styleOffences(contested)).not.toEqual([])
    expect(readsTheName(contested)).toBe(false)
  })

  it('a method reached through brackets, which is the same method', () => {
    for (const spelling of ["const s = 'setAttribute'\nel[s]('style', 'x')", "el['setAttribute']('style', 'x')"]) {
      expect([spelling, readsTheName(spelling)]).toEqual([spelling, true])
    }
    expect(styleOffences(source("const s = 'setAttributeNode'", 'el[s](node)'))).not.toEqual([])
    expect(styleOffences(source("const k = 'set'", "Reflect[k](el, 'style', 'x')"))).not.toEqual([])
  })
})

describe('the inline-style gate rejects an attribute write', () => {
  it('an attribute node, which never names itself at the call', () => {
    expect(
      styleOffences(source("const node = document.createAttribute('style')", 'el.setAttributeNode(node)')),
    ).not.toEqual([])
    expect(styleOffences('el.attributes.setNamedItem(node)')).not.toEqual([])
  })

  it('a property written through Reflect or Object', () => {
    expect(styleOffences("Reflect.set(document.body, 'style', 'color: red')")).not.toEqual([])
    expect(styleOffences("Object.defineProperty(el, 'style', { value: 1 })")).not.toEqual([])
  })

  it('an attribute name it cannot read at all', () => {
    expect(styleOffences('el.setAttribute(pickName(), "x")')).not.toEqual([])
  })

  it('markup written in the source that carries the attribute', () => {
    expect(styleOffences(markupFixture('style'))).not.toEqual([])
  })

  it('the attribute in the shell document', () => {
    expect(styleOffences(documentFixture('style'), 'index.html')).not.toEqual([])
  })

  it('a write hidden behind a leading slash, which is not a comment', () => {
    expect(styleOffences(source('/**/ el.style.color = "red"'))).not.toEqual([])
  })
})

describe('the inline-style gate rejects markup assembled at runtime', () => {
  it('markup only half written in the source, the rest supplied at runtime', () => {
    // The value is not knowable here, but the attribute is named all the same.
    // Requiring the whole string to fold let every runtime-assembled fragment
    // through — a regression on the gate this replaced.
    expect(styleOffences(interpolatedMarkup('style'))).not.toEqual([])
    expect(styleOffences(concatenatedMarkup('style'))).not.toEqual([])
    // The same shapes carrying any other attribute are ordinary markup.
    expect(styleOffences(interpolatedMarkup('class'))).toEqual([])
    expect(styleOffences(concatenatedMarkup('class'))).toEqual([])
  })

  it('the attribute written in JSX, in the dialects that carry it', () => {
    expect(styleOffences(badge('style'), 'badge.tsx')).not.toEqual([])
    expect(styleOffences(badge('className'), 'badge.tsx')).toEqual([])
  })

  it('a module in any dialect it is written in, not only .ts', () => {
    for (const label of ['a.tsx', 'a.mts', 'a.cts', 'a.js', 'a.mjs', 'a.cjs']) {
      expect([label, styleOffences('el.style.color = "red"', label)]).not.toEqual([label, []])
    }
  })
})

describe('the markup gate rejects a per-page construct', () => {
  it('an inline event handler, whatever the tag', () => {
    expect(styleOffences(documentFixture('onclick'), 'index.html')).not.toEqual([])
  })

  it('an inline script with no src, and an inline stylesheet', () => {
    expect(styleOffences(joined('<scr', 'ipt>alert(1)</scr', 'ipt>'), 'index.html')).not.toEqual([])
    expect(styleOffences(joined('<sty', 'le>.a { color: red }</sty', 'le>'), 'index.html')).not.toEqual([])
  })

  it('a wiring attribute and a bracketed utility class, retired markup vocabulary', () => {
    // Spelt in parts so this file's own source carries neither whole.
    expect(styleOffences(documentFixture(joined('h', 'x-get')), 'index.html')).not.toEqual([])
    expect(
      styleOffences(`<div ${joined('cla', 'ss')}="${joined('w-', '[420px]')}">x</div>`, 'index.html'),
    ).not.toEqual([])
    expect(styleOffences(`<div class="${joined('bg-', '[#00f]')}">x</div>`, 'index.html')).not.toEqual([])
  })

  it('a class list the design system names, which is the shipped vocabulary', () => {
    expect(styleOffences('<div class="shell card">x</div>', 'index.html')).toEqual([])
    expect(styleOffences('<a class="link" href="/x">go</a>', 'index.html')).toEqual([])
  })

  it('a URL that executes text as code, however the scheme is disguised', () => {
    // The schemes come from the module-level `scheme` below, a function the
    // folder cannot run, so this file's own text never carries one whole: the
    // fixtures are data about markup, not a URL anyone navigates.
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

  it('but allows a URL that navigates by address', () => {
    expect(styleOffences('<a href="https://example.com/x">go</a>', 'index.html')).toEqual([])
    expect(styleOffences('<img src="/logo.svg" alt="">', 'index.html')).toEqual([])
    expect(styleOffences('<a href="/report#top">top</a>', 'index.html')).toEqual([])
  })

  it('but allows a script loaded by src, which ships a module', () => {
    expect(styleOffences('<script type="module" src="/src/main.ts"></script>', 'index.html')).toEqual([])
  })
})

describe('the inline-style gate allows', () => {
  it('an attribute that is not the style one', () => {
    expect(styleOffences("el.setAttribute('role', 'menu')")).toEqual([])
    expect(styleOffences(source("const attribute = 'role'", "el.setAttribute(attribute, 'menu')"))).toEqual([])
  })

  it('a stylesheet, which is not an inline style', () => {
    expect(
      styleOffences(
        source(
          "const sheet = document.createElement('style')",
          'sheet.textContent = rule',
          'document.head.append(sheet)',
        ),
      ),
    ).toEqual([])
  })

  it('a data attribute written under a name from the caller', () => {
    expect(styleOffences('node.dataset[name] = value')).toEqual([])
  })

  it('markup in the source that carries no style attribute', () => {
    expect(styleOffences('el.insertAdjacentHTML("beforeend", "<b class=\\"dot\\"></b>")')).toEqual([])
  })

  it('an option some platform formatter happens to call style', () => {
    // A key of that name on an options object is not a style declaration, and
    // an object carrying one can only become an inline style by passing through
    // a write this gate already refuses.
    expect(styleOffences("new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'narrow' })")).toEqual([])
    expect(styleOffences("format(value, { style: 'currency' })")).toEqual([])
  })

  it('a name that merely reads like the banned one', () => {
    expect(styleOffences(source('const stylesheet = read()', 'apply(stylesheet)'))).toEqual([])
  })
})
