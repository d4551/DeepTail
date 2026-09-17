/**
 * What the contract refuses the painted chrome for.
 *
 * The painter seats the shell in `#root`, and `paint-shell-rules.ts` states
 * what that chrome must be. Every rule it states is driven here: once against a
 * chrome carrying the defect the rule exists for, and once against the chrome
 * this repository really paints, which conforms. The defects are assembled from
 * parts, so this file's own source carries none of them whole.
 *
 * The document half of the contract is driven in `paint-document-rules.spec.ts`,
 * and the painter that seats this chrome in the page in `paint-page.spec.ts`.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { assertPaintedShell, paintOffences } from '../scripts/paint-shell-rules.ts'
import { CHROME, named, PRESENTATIONAL, planted, READING_REGION, STYLED, TITLE_ELEMENT } from './paint-fixture.ts'

describe('the landmarks the shell carries', () => {
  it('reads the shipped chrome as conforming', () => {
    expect(paintOffences(CHROME)).toEqual([])
  })

  it('refuses a chrome carrying no shell root, or more than one', () => {
    expect(named(paintOffences(planted(CHROME, ' data-deeptail-shell=""', '')))).toEqual([
      '1: the chrome carries 0 product shells; a document carries one',
    ])
    expect(named(paintOffences(`${CHROME}<div data-deeptail-shell=""></div>`))).toEqual([
      '1: the chrome carries 2 product shells; a document carries one',
    ])
  })

  it('refuses a shell with no reading region to read', () => {
    expect(named(paintOffences(planted(CHROME, READING_REGION, '<div class="main">')))).toEqual([
      '1: the shell carries no main landmark, so the chrome has no reading region',
    ])
  })

  it('refuses a nav landmark that names nothing, and admits a named one', () => {
    expect(named(paintOffences(planted(CHROME, ' aria-label="Session navigation"', '')))).toEqual([
      '1: the shell carries no nav landmark named for a reader',
    ])
    // A label stated and left blank names nothing either: it reads as no name.
    expect(named(paintOffences(planted(CHROME, 'aria-label="Session navigation"', 'aria-label="  "')))).toEqual([
      '1: the shell carries no nav landmark named for a reader',
    ])
    expect(paintOffences(planted(CHROME, 'aria-label="Session navigation"', 'aria-label="Sessions"'))).toEqual([])
  })

  it('refuses a shell with no live region, and admits one spelled in any case', () => {
    const quiet = '<div class="visually-hidden" role="status" aria-live="polite"></div>'
    expect(named(paintOffences(planted(CHROME, quiet, '')))).toEqual([
      '1: the shell carries no live region, so a change it announces reaches no reader',
    ])
    // `role` and `aria-live` are read as case-insensitive, the way a browser
    // reads them, so neither value is refused for the case it is spelled in.
    const shouted = '<div class="visually-hidden" role="STATUS" aria-live="POLITE"></div>'
    expect(paintOffences(planted(CHROME, quiet, shouted))).toEqual([])
  })

  it('refuses a shell with no control that names what it opens', () => {
    expect(named(paintOffences(planted(CHROME, ' aria-controls="deeptail-sidebar"', '')))).toEqual([
      '1: the shell carries no control that names the region it opens',
    ])
  })
})

describe('the heading the shell names the page with', () => {
  it('refuses a titled heading that names no page', () => {
    expect(named(paintOffences(planted(CHROME, '>Sessions<', '><')))).toEqual([
      '1: the shell carries no titled heading, so the first paint names no page',
    ])
    expect(named(paintOffences(planted(CHROME, TITLE_ELEMENT, '<h1 class="row-title">Sessions</h1>')))).toEqual([
      '1: the shell carries no titled heading, so the first paint names no page',
    ])
  })

  it('reads the titled heading by its class token, so one class more is still the heading', () => {
    expect(paintOffences(planted(CHROME, TITLE_ELEMENT, '<h1 class="main-title row-title">Sessions</h1>'))).toEqual([])
    expect(named(paintOffences(planted(CHROME, 'class="main-title"', 'class="main-title-extra"')))).toEqual([
      '1: the shell carries no titled heading, so the first paint names no page',
    ])
  })

  it('refuses a shell carrying more than one h1, and one whose h1 sits outside main', () => {
    const twice = planted(CHROME, '</main>', '<h1>Also</h1></main>')
    expect(named(paintOffences(twice))).toEqual(['1: the shell carries 2 h1 headings; a page carries one'])
    const outside = planted(planted(CHROME, TITLE_ELEMENT, ''), READING_REGION, `${TITLE_ELEMENT}${READING_REGION}`)
    expect(named(paintOffences(outside))).toEqual([
      '1: the shell carries its one h1 outside its reading region, so the page names itself outside main',
    ])
  })
})

describe('the references the painted chrome carries', () => {
  it('refuses a reference that reaches no id, and an id stated twice', () => {
    const dangling = planted(CHROME, 'aria-controls="deeptail-sidebar"', 'aria-controls="sidebar-gone"')
    expect(named(paintOffences(dangling))).toEqual([
      '1: aria-controls points at sidebar-gone, which is no id on the page',
    ])
    const twice = planted(CHROME, '</nav>', '</nav><span id="deeptail-sidebar"></span>')
    expect(named(paintOffences(twice))).toEqual([
      '1: an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ])
  })

  it('admits references that resolve, however they are spaced', () => {
    const padded = planted(CHROME, 'aria-controls="deeptail-sidebar"', 'aria-controls="  deeptail-sidebar  "')
    expect(paintOffences(padded)).toEqual([])
    const both = 'aria-controls="deeptail-sidebar" aria-describedby="deeptail-sidebar"'
    expect(paintOffences(planted(CHROME, 'aria-controls="deeptail-sidebar"', both))).toEqual([])
    // One more id, stated once and reached once, is not a duplicate.
    const reached = planted(CHROME, '</nav>', '</nav><span id="other"></span><button aria-labelledby="other"></button>')
    expect(paintOffences(reached)).toEqual([])
  })

  it('refuses a chrome the markup gate refuses, through the same read', () => {
    expect(named(paintOffences(planted(CHROME, 'class="shell"', STYLED)))).toEqual([
      '1: a style attribute is an inline style; put the rule in a stylesheet and add a class',
    ])
    expect(named(paintOffences(`${CHROME}${PRESENTATIONAL}`))).toEqual([
      '1: a retired presentational tag is alignment or type in markup; use the stylesheet',
    ])
  })

  it('refuses markup that is not the product shell at all', () => {
    expect(() => assertPaintedShell('')).toThrow('lost the product shell')
    expect(() => assertPaintedShell('<div></div>')).toThrow('lost the product shell')
    expect(() => assertPaintedShell('<main data-deeptail-shell></main>')).toThrow('lost the product shell')
    expect(assertPaintedShell(CHROME)).toBe(CHROME)
  })
})
