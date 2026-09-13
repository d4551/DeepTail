/**
 * What the inline-style gate rejects and allows.
 *
 * The markup gate's suite — the per-page constructs, the retired class
 * vocabulary, the framework directives and the layout attributes — lives in
 * `markup-gate.spec.ts`, next to the rules it drives.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import {
  badge,
  concatenatedMarkup,
  documentFixture,
  interpolatedMarkup,
  markupFixture,
  namesWhy,
  readsTheName,
  source,
  styleOffences,
} from './fixtures.ts'

/** The reason a property write of the style declaration is refused. */
const STYLE_DECL = 'an element style declaration is an inline style'

describe('the inline-style gate rejects a property write', () => {
  it('says so when the source does not parse', () => {
    namesWhy(styleOffences('function ('), 'this file does not parse, so it cannot be checked', 'unparseable')
  })

  it('the plain property write it exists for', () => {
    namesWhy(styleOffences('el.style.color = "red"'), STYLE_DECL, 'plain write')
  })

  it('a style declaration merged onto an element', () => {
    namesWhy(styleOffences("Object.assign(el, { style: 'color: red' })"), STYLE_DECL, 'assign')
    namesWhy(styleOffences('Object.defineProperties(el, { style: { value: 1 } })'), STYLE_DECL, 'defineProperties')
  })

  it('a computed property spelt around', () => {
    namesWhy(styleOffences("el['sty' + 'le'].color = 'red'"), STYLE_DECL, 'concat key')
    namesWhy(styleOffences("el['style'].color = 'red'"), STYLE_DECL, 'bracket key')
  })

  it('the typed style map and the bulk text form', () => {
    namesWhy(
      styleOffences('el.attributeStyleMap.set("color", "red")'),
      'the typed style map is the style attribute',
      'attributeStyleMap',
    )
    namesWhy(
      styleOffences('el.style.cssText = "color: red"'),
      'writing cssText replaces an inline style block',
      'cssText',
    )
  })

  it('the declaration destructured back out of an element', () => {
    namesWhy(styleOffences('const { style } = el'), STYLE_DECL, 'destructure')
    namesWhy(styleOffences('const { style: declaration } = el'), STYLE_DECL, 'renamed destructure')
    namesWhy(styleOffences('function paint({ style }) { return style }'), STYLE_DECL, 'param destructure')
  })
})

describe('the inline-style gate rejects a write whose name is assembled', () => {
  it('an attribute named in a case HTML treats as the same name', () => {
    namesWhy(
      styleOffences("document.body.setAttribute('STYLE', 'color: red')"),
      'setting the attribute named style is an inline style',
      'STYLE case',
    )
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
    namesWhy(styleOffences(contested), 'the attribute name must be written as a literal', 'contested constant')
    expect(readsTheName(contested)).toBe(false)
  })
})

describe('the inline-style gate rejects a method reached through brackets', () => {
  it('which is the same method', () => {
    for (const spelling of ["const s = 'setAttribute'\nel[s]('style', 'x')", "el['setAttribute']('style', 'x')"]) {
      expect([spelling, readsTheName(spelling)]).toEqual([spelling, true])
    }
    namesWhy(
      styleOffences(source("const s = 'setAttributeNode'", 'el[s](node)')),
      'an attribute node hides its name from every checker',
      'bracket setAttributeNode',
    )
    namesWhy(
      styleOffences(source("const k = 'set'", "Reflect[k](el, 'style', 'x')")),
      'setting the property named style is an inline style',
      'bracket Reflect.set',
    )
  })
})

describe('the inline-style gate rejects an attribute write', () => {
  it('an attribute node, which never names itself at the call', () => {
    namesWhy(
      styleOffences(source("const node = document.createAttribute('style')", 'el.setAttributeNode(node)')),
      'an attribute node hides its name from every checker',
      'setAttributeNode',
    )
    namesWhy(
      styleOffences('el.attributes.setNamedItem(node)'),
      'the attribute map hides the name from every checker',
      'setNamedItem',
    )
  })

  it('a property written through Reflect or Object', () => {
    namesWhy(
      styleOffences("Reflect.set(document.body, 'style', 'color: red')"),
      'setting the property named style is an inline style',
      'Reflect.set',
    )
    namesWhy(
      styleOffences("Object.defineProperty(el, 'style', { value: 1 })"),
      'setting the property named style is an inline style',
      'defineProperty',
    )
  })

  it('an attribute name it cannot read at all', () => {
    namesWhy(
      styleOffences('el.setAttribute(pickName(), "x")'),
      'the attribute name must be written as a literal',
      'opaque name',
    )
  })

  it('markup written in the source that carries the attribute', () => {
    namesWhy(styleOffences(markupFixture('style')), 'a style attribute is an inline style', 'markup fixture')
  })

  it('the attribute in the shell document', () => {
    namesWhy(
      styleOffences(documentFixture('style'), 'index.html'),
      'a style attribute is an inline style',
      'document fixture',
    )
  })
})

describe('the inline-style gate rejects a write hidden behind a leading slash', () => {
  it('which is not a comment', () => {
    namesWhy(styleOffences(source('/**/ el.style.color = "red"')), STYLE_DECL, 'not a comment')
  })
})

describe('the inline-style gate rejects markup assembled at runtime', () => {
  it('markup only half written in the source, the rest supplied at runtime', () => {
    // The value is not knowable here, but the attribute is named all the same.
    // Requiring the whole string to fold let every runtime-assembled fragment
    // through — a regression on the gate this replaced.
    namesWhy(styleOffences(interpolatedMarkup('style')), 'a style attribute is an inline style', 'interpolated')
    namesWhy(styleOffences(concatenatedMarkup('style')), 'a style attribute is an inline style', 'concatenated')
    // The same shapes carrying any other attribute are ordinary markup.
    expect(styleOffences(interpolatedMarkup('class'))).toEqual([])
    expect(styleOffences(concatenatedMarkup('class'))).toEqual([])
  })

  it('the attribute written in JSX, in the dialects that carry it', () => {
    namesWhy(styleOffences(badge('style'), 'badge.tsx'), STYLE_DECL, 'jsx style')
    expect(styleOffences(badge('className'), 'badge.tsx')).toEqual([])
  })

  it('a module in any dialect it is written in, not only .ts', () => {
    for (const label of ['a.tsx', 'a.mts', 'a.cts', 'a.js', 'a.mjs', 'a.cjs']) {
      namesWhy(styleOffences('el.style.color = "red"', label), STYLE_DECL, label)
    }
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
