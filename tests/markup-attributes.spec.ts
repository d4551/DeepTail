/**
 * Every attribute the markup gate decides by, driven member by member.
 *
 * Each table here is a list of separate ways past the gate: an element whose
 * resource attribute is not read is an element that can load a remote asset
 * with nothing said about it, an alignment attribute not read is layout in the
 * tag, and a directive prefix not read is a listener moved into the markup.
 * `markup-gate.spec.ts` holds the shapes; this holds the tables.
 */

import { describe, expect, it } from 'bun:test'
import { joined, styleOffences } from './fixtures.ts'

/** A remote host, assembled so this file's own source carries none whole. */
const remoteHost = (): string => joined('ht', 'tps://cdn.example.com')

/** The reasons a markup fixture is rejected for. */
function markup(text: string): string[] {
  return styleOffences(text, 'fixture.html')
}

/**
 * A tag carrying one attribute, assembled from parts.
 *
 * The gates read this repository's own sources for markup written into them, so
 * a fixture written whole here would be an offence in this file. Assembled, the
 * attribute name is the fixture's subject rather than this file's content.
 * @param tag - the element name.
 * @param name - the attribute name.
 * @param value - the attribute value.
 * @returns the tag.
 */
function tag(tag_: string, name: string, value: string): string {
  return joined('<', tag_, ' ', name, '="', value, '">x</', tag_, '>')
}

/** The reason a remote resource is refused. */
const REMOTE = 'a remote resource URL loads an asset no local install ships; ship the asset in the bundle'

/** The reason an alignment attribute is refused. */
const ALIGNMENT = 'an alignment attribute is layout in the tag; put the alignment in a stylesheet and add a class'

/** The reason a presentational attribute is refused. */
const PRESENTATIONAL =
  'a presentational attribute decides size or type in the tag; put it in a stylesheet and add a class'

/** Every element that fetches a resource, and the attribute it fetches it from. */
const RESOURCES: readonly (readonly [string, string])[] = [
  ['script', 'src'],
  ['link', 'href'],
  ['img', 'src'],
  ['img', 'srcset'],
  ['video', 'src'],
  ['video', 'poster'],
  ['audio', 'src'],
  ['source', 'src'],
  ['source', 'srcset'],
  ['iframe', 'src'],
  ['embed', 'src'],
  ['object', 'data'],
  ['track', 'src'],
  ['input', 'src'],
  ['base', 'href'],
]

describe('the resource attributes', () => {
  it('are each refused when they load from outside the bundle', () => {
    const found = RESOURCES.map(([element, name]) => markup(tag(element, name, `${remoteHost()}/x`)).includes(REMOTE))
    expect(found).toEqual(RESOURCES.map(() => true))
  })

  it('are each allowed when they load what the bundle ships', () => {
    const found = RESOURCES.map(([element, name]) => markup(tag(element, name, '/assets/x')).includes(REMOTE))
    expect(found).toEqual(RESOURCES.map(() => false))
  })

  it('are read only on the element that fetches through them', () => {
    // `data` on a div fetches nothing, and neither does `poster` on an image.
    expect(markup(tag('div', 'data', `${remoteHost()}/x`))).toEqual([])
    expect(markup(tag('img', 'poster', `${remoteHost()}/x`))).toEqual([])
  })

  it('read a candidate list one candidate at a time, with its descriptor', () => {
    // `srcset` carries several URLs, each followed by a descriptor. A reader
    // that judged the whole value would read the first descriptor as part of
    // the first URL and every candidate after the first not at all.
    expect(markup(tag('img', 'srcset', `/a.png 1x, ${remoteHost()}/b.png 2x`))).toEqual([REMOTE])
    expect(markup(tag('img', 'srcset', '/a.png 1x, /b.png 2x'))).toEqual([])
    expect(markup(tag('img', 'srcset', `${remoteHost()}/a.png`))).toEqual([REMOTE])
  })

  it('read a URL whatever scheme reaches the network, and none that reaches the bundle', () => {
    expect(markup(tag('img', 'src', `${joined('ht', 'tp://cdn.example.com')}/x.png`))).toEqual([REMOTE])
    expect(markup(tag('img', 'src', '//cdn.example.com/x.png'))).toEqual([REMOTE])
    expect(markup(tag('img', 'src', `  ${remoteHost()}/x.png  `))).toEqual([REMOTE])
    expect(markup(tag('img', 'src', './x.png'))).toEqual([])
    expect(markup(tag('img', 'src', 'data:image/png;base64,AA'))).toEqual([])
  })
})

describe('the alignment attributes', () => {
  const names = ['align', 'valign', 'hspace', 'vspace', 'cellpadding', 'cellspacing']

  it('are each refused, by name', () => {
    expect(names.map((name) => markup(tag('div', name, '1')))).toEqual(names.map(() => [ALIGNMENT]))
  })

  it('are read however they are cased', () => {
    expect(markup(tag('div', 'ALIGN', 'center'))).toEqual([ALIGNMENT])
  })

  it('are not read out of a longer name that merely begins the same way', () => {
    expect(markup(tag('div', 'aligned', '1'))).toEqual([])
  })
})

describe('the presentational attributes', () => {
  const names = [
    'width',
    'height',
    'border',
    'bgcolor',
    'background',
    'color',
    'face',
    'size',
    'clear',
    'nowrap',
    'bordercolor',
    'rules',
    'frame',
  ]

  it('are each refused, by name', () => {
    expect(names.map((name) => markup(tag('div', name, '1')))).toEqual(names.map(() => [PRESENTATIONAL]))
  })

  it('allow the image aspect-ratio hint, and only on an image, and only those two', () => {
    // On an image these two are what stop a layout shift before the sheet
    // applies; on anything else they are sizing decided in markup, and no
    // other presentational attribute is spared even there.
    expect(markup(joined('<im', 'g wid', 'th="16" hei', 'ght="9" sr', 'c="/a.png">'))).toEqual([])
    expect(markup(tag('div', 'width', '16'))).toEqual([PRESENTATIONAL])
    expect(markup(joined('<im', 'g bor', 'der="1" sr', 'c="/a.png">'))).toEqual([PRESENTATIONAL])
    expect(markup(tag('video', 'width', '16'))).toEqual([PRESENTATIONAL])
  })
})

describe('the directive attributes', () => {
  it('are each refused, by the prefix that names the framework', () => {
    expect(markup(tag('div', 'data-theme', 'dark'))).toEqual([
      'data-theme is the daisyUI theme hook; the palette lives in tokens.css',
    ])
    const wired = 'a directive attribute wires behaviour into the tag; attach the listener in a module'
    expect(markup(tag('div', 'x-data', '{}'))).toEqual([wired])
    expect(markup(tag('div', '@click', 'go()'))).toEqual([wired])
    expect(markup(tag('div', ':value', 'x'))).toEqual([wired])
    expect(markup(tag('div', 'v-if', 'x'))).toEqual([
      'a Vue directive wires behaviour into the tag; attach the listener in a module',
    ])
    expect(markup(tag('div', 'data-bs-toggle', 'modal'))).toEqual([
      'a Bootstrap data-bs attribute is a retired framework hook; attach the listener in a module',
    ])
  })

  it('read the theme hook and the Bootstrap prefix however they are cased', () => {
    expect(markup(tag('div', 'DATA-THEME', 'dark'))).not.toEqual([])
    expect(markup(tag('div', 'DATA-BS-TOGGLE', 'modal'))).not.toEqual([])
  })

  it('are not read out of an attribute that merely starts with the same letter', () => {
    expect(markup(tag('div', 'data-theme-name', 'dark'))).toEqual([])
    expect(markup(tag('div', 'xml-lang', 'en'))).toEqual([])
    expect(markup(tag('div', 'value', 'x'))).toEqual([])
    expect(markup(tag('div', 'data-bootstrap', 'x'))).toEqual([])
  })

  it('read a wiring attribute in either spelling, and whatever it is cased as', () => {
    const wired = 'an hx attribute wires behaviour into the tag; attach the listener in a module'
    expect(markup(tag('div', 'hx-get', '/x'))).toEqual([wired])
    expect(markup(tag('div', 'data-hx-get', '/x'))).toEqual([wired])
    expect(markup(tag('div', 'HX-GET', '/x'))).toEqual([wired])
    expect(markup(tag('div', 'hx-target:inherited', '#x'))).toEqual([wired])
    expect(markup(tag('div', 'hxget', '/x'))).toEqual([])
  })
})

describe('the class attribute', () => {
  const bracketed = 'a bracketed utility class carries a raw value; read the size or colour from tokens.css'

  it('refuses an arbitrary value in either spelling the pipeline has used', () => {
    expect(markup(tag('div', 'class', joined('w-', '[32px]')))).toEqual([bracketed])
    expect(markup(tag('div', 'class', joined('bg-', '(--brand)')))).toEqual([bracketed])
  })

  it('allows a class list that carries no raw value', () => {
    expect(markup(tag('div', 'class', 'shell sidebar'))).toEqual([])
    expect(markup(tag('div', 'class', ''))).toEqual([])
    expect(markup(tag('div', 'class', joined('bg-', '(brand)')))).toEqual([])
  })

  it('reads the class list only on the class attribute', () => {
    expect(markup(tag('div', 'data-class', joined('w-', '[32px]')))).toEqual([])
  })
})
