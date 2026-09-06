/**
 * Every call that can write a styling attribute or property, and every name
 * such a call can carry.
 *
 * The inline-style ban is stated about calls, and each entry in each table is
 * a separate call the gate has to know: an attribute setter it does not know is
 * a way to write the style attribute with nothing said about it, and a keyed
 * write it does not know is the same for a property. The tables are driven
 * member by member here; `style-gate.spec.ts` holds the shapes.
 */

import { describe, expect, it } from 'bun:test'
import { STYLE_PROPERTIES } from '../scripts/style-writes.ts'
import { styleOffences } from './fixtures.ts'

/** The reason a named write is refused. */
const named = (kind: string): string =>
  `setting the ${kind} named style is an inline style; put the rule in a stylesheet and add a class`

/** The reason an unreadable name is refused. */
const unreadable = (kind: string): string =>
  `the ${kind} name must be written as a literal, so this gate and the next reader can both read it`

describe('the attribute setters', () => {
  it('are each refused when they name the style attribute, at the argument that names it', () => {
    // Each setter names the attribute at its own argument; a gate that read
    // the wrong one would read a namespace as a name and say nothing.
    expect(styleOffences('el.setAttribute("style", "color:red")')).toEqual([named('attribute')])
    expect(styleOffences('el.setAttributeNS(null, "style", "color:red")')).toEqual([named('attribute')])
    expect(styleOffences('document.createAttribute("style")')).toEqual([named('attribute')])
    expect(styleOffences('document.createAttributeNS(null, "style")')).toEqual([named('attribute')])
    expect(styleOffences('el.toggleAttribute("style")')).toEqual([named('attribute')])
  })

  it('are each refused when the name cannot be read at all', () => {
    for (const call of [
      'el.setAttribute(name, value)',
      'el.setAttributeNS(null, name, value)',
      'document.createAttribute(name)',
      'document.createAttributeNS(null, name)',
      'el.toggleAttribute(name)',
    ]) {
      expect(styleOffences(call)).toEqual([unreadable('attribute')])
    }
  })

  it('are each allowed when they name something else', () => {
    for (const call of [
      'el.setAttribute("hidden", "")',
      'el.setAttributeNS(null, "hidden", "")',
      'document.createAttribute("hidden")',
      'document.createAttributeNS(null, "hidden")',
      'el.toggleAttribute("hidden")',
    ]) {
      expect(styleOffences(call)).toEqual([])
    }
  })

  it('are read at the argument that names the attribute, not at any other', () => {
    // The namespaced forms name the attribute second; reading the first would
    // read the namespace and miss every namespaced write.
    expect(styleOffences('el.setAttributeNS("style", "hidden", "")')).toEqual([])
    expect(styleOffences('document.createAttributeNS("style", "hidden")')).toEqual([])
  })

  it('are refused with no argument at all in the naming position', () => {
    // Nothing names the attribute, so nothing can be judged; the call is left
    // to the compiler rather than reported as a style write.
    expect(styleOffences('el.setAttribute()')).toEqual([])
  })
})

describe('the calls that hide the name they set', () => {
  it('are each refused by name, with the form to use instead', () => {
    expect(styleOffences('el.setAttributeNode(node)')).toEqual([
      'an attribute node hides its name from every checker; use setAttribute with a literal name',
    ])
    expect(styleOffences('el.setAttributeNodeNS(node)')).toEqual([
      'an attribute node hides its name from every checker; use setAttributeNS with a literal name',
    ])
    expect(styleOffences('el.attributes.setNamedItem(node)')).toEqual([
      'the attribute map hides the name from every checker; use setAttribute with a literal name',
    ])
  })
})

describe('the keyed writes', () => {
  it('are refused on each host that reaches an object’s own properties', () => {
    for (const host of ['Reflect', 'Object']) {
      expect(styleOffences(`${host}.set(el, "style", value)`)).toEqual([named('property')])
      expect(styleOffences(`${host}.defineProperty(el, "style", spec)`)).toEqual([named('property')])
    }
  })

  it('are refused when the key cannot be read', () => {
    expect(styleOffences('Reflect.set(el, key, value)')).toEqual([unreadable('property')])
    expect(styleOffences('Object.defineProperty(el, key, spec)')).toEqual([unreadable('property')])
  })

  it('are allowed when they name something else, or go through another host', () => {
    expect(styleOffences('Reflect.set(el, "hidden", value)')).toEqual([])
    expect(styleOffences('store.set(el, "style", value)')).toEqual([])
    expect(styleOffences('map.set("style", value)')).toEqual([])
  })

  it('are read at the key argument, not at the target', () => {
    expect(styleOffences('Reflect.set(style, "hidden", value)')).toEqual([])
  })
})

describe('the merged writes', () => {
  it('read every object merged onto something, not only the first', () => {
    expect(styleOffences('Object.assign(el, first, { style: "color:red" })')).toEqual([
      STYLE_PROPERTIES.get('style') ?? '',
    ])
    expect(styleOffences('Object.defineProperties(el, { style: spec })')).toEqual([STYLE_PROPERTIES.get('style') ?? ''])
  })

  it('read the target as a target rather than as a merged object', () => {
    // The first argument is what is being written to, and its own keys are
    // not being written anywhere.
    expect(styleOffences('Object.assign({ style: "x" }, source)')).toEqual([])
  })

  it('read a key however it is written', () => {
    expect(styleOffences('Object.assign(el, { style: "x" })')).toEqual([STYLE_PROPERTIES.get('style') ?? ''])
    expect(styleOffences('Object.assign(el, { "style": "x" })')).toEqual([STYLE_PROPERTIES.get('style') ?? ''])
    expect(styleOffences('const key = "style"\nObject.assign(el, { [key]: "x" })')).toEqual([
      STYLE_PROPERTIES.get('style') ?? '',
    ])
    expect(styleOffences('Object.assign(el, { STYLE: "x" })')).toEqual([STYLE_PROPERTIES.get('style') ?? ''])
  })

  it('read every property the style declaration is reached by', () => {
    for (const [key, why] of STYLE_PROPERTIES) {
      expect([key, styleOffences(`Object.assign(el, { ${key}: value })`)]).toEqual([key, [why]])
    }
  })

  it('read nothing out of a merge that names none of them', () => {
    expect(styleOffences('Object.assign(el, { hidden: true })')).toEqual([])
    expect(styleOffences('Object.assign(el, source)')).toEqual([])
    expect(styleOffences('Object.assign(el, { ...source })')).toEqual([])
    expect(styleOffences('Object.assign(el, { [key]: "x" })')).toEqual([])
  })
})
