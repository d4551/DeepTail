/**
 * The gates' own suite.
 *
 * Two executed gates carry rules no linter has, and until now nothing checked
 * that either of them could still fail. A rule added but never run against a
 * positive case is a rule nobody has evidence for, which is how both gates came
 * to be bypassable while reporting success. Every rule below is driven both
 * ways: a source that breaks it must be rejected, and a source that resembles
 * it must not be.
 *
 * The attacks are the ones that got through the previous, line-based gates.
 */

import { describe, expect, it } from 'bun:test'
import * as bans from '../scripts/ban-gate.ts'
import * as styles from '../scripts/style-gate.ts'

/**
 * Assemble a fixture out of parts the gates cannot fold, so this file's own
 * fixtures are never read as the constructs they describe.
 * @param parts - the fixture's lines.
 * @returns the source text.
 */
function source(...parts: readonly string[]): string {
  return parts.join('\n')
}

/**
 * The reasons a script is rejected for.
 * @param text - the fixture.
 * @param label - the path to attribute it to, which selects the dialect.
 * @returns one reason per offence.
 */
function styleOffences(text: string, label = 'fixture.ts'): string[] {
  return styles.scanSource(label, text).map((offence) => offence.why)
}

/**
 * Whether the gate read a name and found it to be the style one, rather than
 * refusing a name it could not read.
 *
 * The difference is the whole of the constant folder. Both outcomes reject the
 * source, so a suite that asks only whether something was reported cannot tell
 * a fold that works from a fold that has been deleted — which is exactly what
 * an audit found: every folding rule could be removed with the suite green.
 * @param text - the fixture.
 * @returns true when the offence names the style attribute or property.
 */
function readsTheName(text: string): boolean {
  const why = styleOffences(text)
  return why.length > 0 && why.every((reason) => reason.includes('named style'))
}

/**
 * The reasons a source is rejected by the ban gate.
 * @param text - the fixture.
 * @param label - the path to attribute it to, which selects the reader.
 * @returns one reason per offence.
 */
function banOffences(text: string, label = 'fixture.ts'): string[] {
  return bans.scanSource(label, text).map((offence) => offence.why)
}

/**
 * Markup that carries the attribute, assembled so this file's own source does
 * not contain it.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
function markupFixture(attribute: string): string {
  return `el.insertAdjacentHTML('beforeend', '<b ' + '${attribute}' + '="x">')`
}

/**
 * A shell document carrying the attribute, assembled the same way.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
function documentFixture(attribute: string): string {
  return `<main ${attribute}="color: red"><p>hi</p></main>`
}

describe('the inline-style gate rejects a property write', () => {
  it('the plain property write it exists for', () => {
    expect(styleOffences('el.style.color = "red"')).not.toEqual([])
  })

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
      '`sty${"le"}`',
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

  it('a style declaration merged onto an element', () => {
    expect(styleOffences("Object.assign(el, { style: 'color: red' })")).not.toEqual([])
    expect(styleOffences('Object.defineProperties(el, { style: { value: 1 } })')).not.toEqual([])
  })

  it('a computed property spelt around', () => {
    expect(styleOffences("el['sty' + 'le'].color = 'red'")).not.toEqual([])
    expect(styleOffences("el['style'].color = 'red'")).not.toEqual([])
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

  it('the typed style map and the bulk text form', () => {
    expect(styleOffences('el.attributeStyleMap.set("color", "red")')).not.toEqual([])
    expect(styleOffences('el.style.cssText = "color: red"')).not.toEqual([])
  })

  it('the declaration destructured back out of an element', () => {
    expect(styleOffences('const { style } = el')).not.toEqual([])
    expect(styleOffences('const { style: declaration } = el')).not.toEqual([])
    expect(styleOffences('function paint({ style }) { return style }')).not.toEqual([])
  })

  it('markup written in the source that carries the attribute', () => {
    expect(styleOffences(markupFixture('style'))).not.toEqual([])
  })

  it('markup only half written in the source, the rest supplied at runtime', () => {
    // The value is not knowable here, but the attribute is named all the same.
    // Requiring the whole string to fold let every runtime-assembled fragment
    // through — a regression on the gate this replaced.
    const interpolated = (attribute: string): string =>
      `el.insertAdjacentHTML('beforeend', \`<b ${attribute}="color: \${colour}">!</b>\`)`
    const concatenated = (attribute: string): string =>
      `el.insertAdjacentHTML('beforeend', '<i ${attribute}="' + colour + '"></i>')`
    expect(styleOffences(interpolated('style'))).not.toEqual([])
    expect(styleOffences(concatenated('style'))).not.toEqual([])
    // The same shapes carrying any other attribute are ordinary markup.
    expect(styleOffences(interpolated('class'))).toEqual([])
    expect(styleOffences(concatenated('class'))).toEqual([])
  })

  it('the attribute written in JSX, in the dialects that carry it', () => {
    const badge = (attribute: string): string => `export const Badge = () => <div ${attribute}={{ color: 'red' }} />`
    expect(styleOffences(badge('style'), 'badge.tsx')).not.toEqual([])
    expect(styleOffences(badge('className'), 'badge.tsx')).toEqual([])
  })

  it('the attribute in the shell document', () => {
    expect(styleOffences(documentFixture('style'), 'index.html')).not.toEqual([])
  })

  it('a module in any dialect it is written in, not only .ts', () => {
    for (const label of ['a.tsx', 'a.mts', 'a.cts', 'a.js', 'a.mjs', 'a.cjs']) {
      expect([label, styleOffences('el.style.color = "red"', label)]).not.toEqual([label, []])
    }
  })

  it('a write hidden behind a leading slash, which is not a comment', () => {
    expect(styleOffences(source('/**/ el.style.color = "red"'))).not.toEqual([])
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

describe('the suppression ban rejects', () => {
  it('every directive, in a line comment and in a block comment', () => {
    for (const directive of [
      '@ts-expect-error',
      '@ts-ignore',
      '@ts-nocheck',
      'oxlint-disable-next-line',
      'eslint-disable',
      'biome-ignore lint: shipping',
      'knip-ignore',
      'istanbul ignore next',
      '@public',
    ]) {
      expect([directive, banOffences(`// ${directive}\nconst a = 1`)]).not.toEqual([directive, []])
      expect([directive, banOffences(`/* ${directive} */\nconst a = 1`)]).not.toEqual([directive, []])
    }
  })

  it('a directive that follows a line the old gate read as a table', () => {
    // `] as const` closed the previous gate's declaration skip only if it was
    // exactly `]`, so one idiomatic line switched every ban off below it.
    const text = source(
      "const BANNED_STATUSES = [ 'archived' ] as const",
      '// @ts-expect-error',
      'export function probe(value: unknown): string {',
      '  return String(value)',
      '}',
    )
    expect(banOffences(text)).not.toEqual([])
  })

  it('a Rust lint suppression, which the .ts-only walk never reached', () => {
    expect(banOffences('#[allow(dead_code)]', 'lib.rs')).not.toEqual([])
    expect(banOffences('#![allow(dead_code)]', 'lib.rs')).not.toEqual([])
    expect(banOffences('#[expect(dead_code)]', 'lib.rs')).not.toEqual([])
    expect(banOffences('#[ allow ( dead_code ) ]', 'lib.rs')).not.toEqual([])
  })

  it('a test taken out of the run', () => {
    expect(banOffences("it.skip('does the thing', () => {})")).not.toEqual([])
    expect(banOffences("describe.only('a group', () => {})")).not.toEqual([])
    expect(banOffences("it.todo('later')")).not.toEqual([])
  })
})

describe('the suppression ban allows', () => {
  it('a directive named in code as data, which is what the rule table is', () => {
    expect(
      banOffences(source("const directives = ['@ts-expect-error', 'biome-ignore']", 'export { directives }')),
    ).toEqual([])
  })
})

describe('the legacy ban rejects', () => {
  it('every idiom the project has moved past', () => {
    const cases: readonly [string, string][] = [
      ['var', 'var legacy = 1'],
      ['require', "const x = require('node:fs')"],
      ['innerHTML', 'el.innerHTML = markup'],
      ['document.write', "document.write('x')"],
      ['substr', 'name.substr(0, 3)'],
      ['new Array', 'const xs = new Array(3)'],
      ['escape', "escape('x')"],
      ['unescape', "unescape('x')"],
      ['__proto__', 'const p = value.__proto__'],
      ['any', 'let value: any = 1'],
      ['any in a generic', 'const xs: Array<any> = []'],
      ['any in an assertion', 'const x = value as any'],
      ['non-null assertion', 'const x = value!.length'],
      ['eval', "eval('1 + 1')"],
    ]
    for (const [name, text] of cases) {
      expect([name, banOffences(text)]).not.toEqual([name, []])
    }
  })
})

describe('the legacy ban allows', () => {
  it('the selector escape, which is a method rather than the global', () => {
    expect(banOffences("CSS.escape('#a b')")).toEqual([])
  })

  it('an idiom named in prose, which is a mention rather than a use', () => {
    expect(banOffences(source('// var is not used here; prefer const', 'const a = 1'))).toEqual([])
    expect(banOffences(source('/** Uses slice rather than substr. */', 'const a = 1'))).toEqual([])
  })

  it('an idiom named in a string, which is data', () => {
    expect(banOffences("const why = 'use const or let rather than var'")).toEqual([])
  })
})

describe('neither gate is fooled by a wrapper that changes nothing', () => {
  it('reads through parentheses and type assertions', () => {
    // oxc keeps parentheses in the tree and a type assertion is a node of its
    // own, so a rule written about what they wrap sees the wrapper instead —
    // one pair of brackets was enough to hide a call from every rule.
    expect(readsTheName("el.setAttribute(('style'), 'x')")).toBe(true)
    expect(readsTheName("el.setAttribute('style' as string, 'x')")).toBe(true)
    expect(readsTheName("el.setAttribute((('sty') + ('le')), 'x')")).toBe(true)
    expect(styleOffences("(el).style.color = 'red'")).not.toEqual([])
    expect(banOffences("(document).write('x')")).not.toEqual([])
    expect(banOffences(source('const d = (document)', "d.write('x')"))).not.toEqual([])
    expect(banOffences('new (Array)(3)')).not.toEqual([])
  })
})

describe('the ban gate reads a name however it is reached', () => {
  it('through brackets', () => {
    expect(banOffences("name['substr'](0, 3)")).not.toEqual([])
    expect(banOffences("it['skip']('x', () => {})")).not.toEqual([])
  })

  it('through a rename', () => {
    // A `const` and an import alias both change the written name without
    // changing what runs, so a rule matching the written name is one line away
    // from being switched off.
    expect(banOffences(source('const d = document', "d.write('x')"))).not.toEqual([])
    expect(banOffences(source("import { it as check } from 'bun:test'", "check.skip('x', () => {})"))).not.toEqual([])
    expect(banOffences(source('const list = Array', 'new list(3)'))).not.toEqual([])
  })

  it('through the global object', () => {
    expect(banOffences("globalThis.eval('1 + 1')")).not.toEqual([])
    expect(banOffences("window.eval('1 + 1')")).not.toEqual([])
  })

  it('through a property write rather than an assignment', () => {
    expect(banOffences("Reflect.set(el, 'innerHTML', '<b>x</b>')")).not.toEqual([])
    expect(banOffences('Object.assign(el, { innerHTML: markup })')).not.toEqual([])
    expect(banOffences('Reflect.construct(Array, [3])')).not.toEqual([])
  })

  it('but not a merge that carries none of them', () => {
    expect(banOffences('Object.assign(page, { recorded, commands })')).toEqual([])
    expect(banOffences("const d = drawer\nd.write = null")).toEqual([])
  })

  it('in a Rust attribute however it is laid out', () => {
    // Neither of these has `#[` and `allow(` adjacent on one line, which is all
    // the line reader ever looked for.
    expect(banOffences('#[cfg_attr(all(), allow(dead_code))]\nfn x() {}', 'lib.rs')).not.toEqual([])
    expect(banOffences('#[\n    allow(dead_code)\n]\nfn x() {}', 'lib.rs')).not.toEqual([])
    expect(banOffences('// this crate does not allow (any) suppressions', 'lib.rs')).toEqual([])
  })
})
