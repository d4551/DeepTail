/**
 * What the contract refuses the built page for.
 *
 * `paint-document-rules.ts` reads the whole document: what it states about
 * itself, the one module entry it loads, the mount it seats the chrome in, and
 * every reference written anywhere on it. Each rule is driven against a page
 * carrying the defect it exists for, built by planting into the shaped page
 * rather than by writing a second document to look like one.
 *
 * The chrome's own rules belong to the shell half, driven in
 * `paint-shell-rules.spec.ts`; here the document's chrome is read through this
 * reading, which is what says the two are one contract rather than two.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { documentOffences } from '../scripts/paint-document-rules.ts'
import {
  CHROME,
  INLINE_SCRIPT,
  mountOf,
  named,
  PAGE,
  planted,
  READING_REGION,
  SEATED,
  SECOND_ENTRY,
} from './paint-fixture.ts'

describe('what the document states about itself', () => {
  it('reads the shaped page as conforming', () => {
    expect(documentOffences(PAGE)).toEqual([])
  })

  it('refuses a document that states no language, no title or no viewport', () => {
    expect(named(documentOffences(planted(PAGE, '<html lang="en">', '<html>')))).toEqual([
      '2: the document states no language, so a reader is given no pronunciation',
    ])
    expect(named(documentOffences(planted(PAGE, '<html lang="en">', '<html lang="">')))).toEqual([
      '2: the document states no language, so a reader is given no pronunciation',
    ])
    expect(named(documentOffences(planted(PAGE, '<title>DeepTail</title>', '<title></title>')))).toEqual([
      '6: the document carries 1 non-empty titles; a document carries one',
    ])
    const fixed = planted(PAGE, 'width=device-width', 'width=1024')
    expect(named(documentOffences(fixed))).toEqual([
      '5: the document carries no viewport meta that states width=device-width',
    ])
    const meta = '    <meta name="viewport" content="width=device-width, initial-scale=1" />\n'
    expect(named(documentOffences(planted(PAGE, meta, '')))).toEqual([
      '2: the document carries no viewport meta that states width=device-width',
    ])
  })
})

describe('the one module entry the document loads', () => {
  it('refuses a document carrying an inline script or a second entry', () => {
    expect(named(documentOffences(planted(PAGE, '<!doctype html>', `${INLINE_SCRIPT}\n<!doctype html>`)))).toEqual([
      '1: an inline script is a per-page script; ship a module and load it by src',
      '1: the document carries 1 scripts that are not one external module entry',
      '1: the document carries 2 scripts; a page carries one module entry',
    ])
    expect(named(documentOffences(planted(PAGE, '<!doctype html>', `${SECOND_ENTRY}\n<!doctype html>`)))).toEqual([
      '1: the document carries 2 scripts; a page carries one module entry',
    ])
  })

  it('refuses a single entry that is not a module', () => {
    expect(named(documentOffences(planted(PAGE, ' type="module" crossorigin', '')))).toEqual([
      '7: the document holds one script entry and it is not a module; a page loads its module by type="module"',
    ])
  })
})

describe('the document’s chrome and its references', () => {
  it('refuses a document whose chrome lost a landmark, through the same chrome rules', () => {
    expect(named(documentOffences(planted(PAGE, ' aria-controls="deeptail-sidebar"', '')))).toEqual([
      '11: the shell carries no control that names the region it opens',
    ])
  })

  it('reads a reference and a duplicate id over the whole document, not only the chrome', () => {
    // A reference written beside the shell, and an id beside the shell that
    // repeats one the shell carries: both are defects of the document.
    const dangling = planted(PAGE, '</body>', '<div aria-labelledby="nowhere"></div></body>')
    expect(named(documentOffences(dangling))).toEqual([
      '12: aria-labelledby points at nowhere, which is no id on the page',
    ])
    const twice = planted(PAGE, '</body>', '<span id="deeptail-sidebar"></span></body>')
    expect(named(documentOffences(twice))).toEqual([
      '12: an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ])
    const late = planted(PAGE, '</body>', '<div aria-controls="late"></div><span id="late"></span></body>')
    expect(documentOffences(late)).toEqual([])
  })
})

describe('the mount the painter seats', () => {
  it('refuses a document with no chrome in its mount', () => {
    expect(named(documentOffences(planted(PAGE, SEATED, mountOf(''))))).toEqual([
      '11: the document carries 0 main landmarks; a page carries one',
      '11: the document carries 0 product shells; a document carries one',
      '11: the mount carries no product shell, so the shipped page is a client-invented tree',
    ])
  })

  it('refuses a document carrying a second mount and a second shell', () => {
    const doubled = [
      '11: a second main splits the shell; a document carries one',
      '11: the document carries 2 mounts; a page carries one',
      '11: the document carries 2 main landmarks; a page carries one',
      '11: the document carries 2 product shells; a document carries one',
      '11: an id is stated twice, so a reference to it reaches neither: root',
      '11: an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ]
    expect(named(documentOffences(planted(PAGE, SEATED, `${SEATED}${SEATED}`)))).toEqual(doubled)
    const shellTwice = [
      '11: a second main splits the shell; a document carries one',
      '11: the document carries 2 main landmarks; a page carries one',
      '11: the document carries 2 product shells; a document carries one',
      '11: an id is stated twice, so a reference to it reaches neither: deeptail-sidebar',
    ]
    expect(named(documentOffences(planted(PAGE, CHROME, `${CHROME}${CHROME}`)))).toEqual(shellTwice)
  })

  it('refuses a shell seated outside the mount, which the client adopts nothing from', () => {
    expect(named(documentOffences(planted(PAGE, SEATED, `${mountOf('')}${CHROME}`)))).toEqual([
      '11: the product shell sits outside the mount, so the client adopts nothing where it looks',
    ])
  })

  it('refuses a document whose shell lost its reading region', () => {
    expect(named(documentOffences(planted(PAGE, READING_REGION, '<div class="main">')))).toEqual([
      '11: the document carries 0 main landmarks; a page carries one',
      '11: the shell carries no main landmark, so the chrome has no reading region',
    ])
  })
})
