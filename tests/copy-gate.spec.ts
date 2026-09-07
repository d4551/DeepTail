/**
 * The copy gate's fixtures: every sentence it must refuse, and every lookalike
 * it must let through.
 *
 * `tests/locales.spec.ts` holds the two dictionaries to the same keys, the same
 * placeholders and no empty entry. Nothing held the other direction: a string
 * written straight onto an element renders in English to every reader, and no
 * dictionary, no suite and no gate would have mentioned it.
 */

import { describe, expect, it } from 'bun:test'
import { scanCopy } from '../scripts/check-copy.ts'
import { joined } from './fixtures.ts'

/** The reasons one module is rejected for. */
function copyOffences(...lines: readonly string[]): string[] {
  return scanCopy('apps/deeptail/src/ui/probe.ts', `${lines.join('\n')}\n`).map((offence) => offence.why)
}

describe('the copy gate rejects', () => {
  it('a sentence written onto the text of a node', () => {
    expect(copyOffences("el.textContent = 'Retry'")).toHaveLength(1)
    expect(copyOffences('el.innerText = `Retry`')).toHaveLength(1)
  })

  it('a name only an assistive technology reads, which is copy all the same', () => {
    expect(copyOffences("el.ariaLabel = 'Close the menu'")).toHaveLength(1)
    expect(copyOffences("el.setAttribute('aria-label', 'Close the menu')")).toHaveLength(1)
    expect(copyOffences("el.setAttribute('ARIA-Label', 'Close the menu')")).toHaveLength(1)
  })

  it('a hint, a tooltip and an image’s alternative', () => {
    expect(copyOffences("field.placeholder = 'Search hosts'")).toHaveLength(1)
    expect(copyOffences("el.title = 'Disconnected'")).toHaveLength(1)
    expect(copyOffences("img.setAttribute('alt', 'A host that is offline')")).toHaveLength(1)
  })

  it('a sentence assembled from constants, which is the sentence it assembles', () => {
    // The engine shows what the constant holds, not the name it was spelled
    // with, so a rule that read only literals would miss the same string
    // written one indirection away.
    expect(copyOffences("const word = 'Retry'", 'el.textContent = word')).toHaveLength(1)
    expect(copyOffences("const verb = 'Re'", "el.textContent = verb + 'try'")).toHaveLength(1)
  })

  it('says what is wrong and what to do instead', () => {
    expect(copyOffences("el.textContent = 'Retry'")).toEqual([
      'this reaches the reader without a dictionary; look it up with the translate function so both locales carry it',
    ])
  })
})

describe('the copy gate allows', () => {
  it('a sentence looked up through the dictionary', () => {
    expect(copyOffences("el.textContent = t('action.retry')")).toEqual([])
    expect(copyOffences("el.setAttribute('aria-label', t('menu.close'))")).toEqual([])
  })

  it('a value decided at run time, which is what a lookup looks like from here', () => {
    expect(copyOffences('el.textContent = label')).toEqual([])
    expect(copyOffences('el.textContent = host.label')).toEqual([])
    // Assembled from parts, so this file's own source carries no interpolation
    // whole and the linter reads it as the fixture text it is.
    expect(copyOffences(joined('el.textContent = `$', '{count} of $', '{total}`'))).toEqual([])
  })

  it('an empty string, which clears a surface rather than saying anything', () => {
    // A rule that refused this would push every reset through a dictionary key
    // that reads as nothing in both locales.
    expect(copyOffences("strip.textContent = ''")).toEqual([])
    expect(copyOffences("field.placeholder = ''")).toEqual([])
  })

  it('an attribute that carries no copy, whatever it carries', () => {
    expect(copyOffences("el.setAttribute('role', 'menu')")).toEqual([])
    expect(copyOffences("el.setAttribute('data-deeptail-action', 'row-stop')")).toEqual([])
    expect(copyOffences("el.setAttribute('href', '#main')")).toEqual([])
  })

  it('a property whose name only resembles one that carries copy', () => {
    expect(copyOffences("el.className = 'roster-row'")).toEqual([])
    expect(copyOffences("el.id = 'deeptail-sidebar'")).toEqual([])
    expect(copyOffences("el.type = 'button'")).toEqual([])
  })

  it('a call with no arguments at all, which writes nothing', () => {
    // The parser's argument list is a field like any other; a gate that read
    // it as present would fail here rather than report anything.
    expect(copyOffences('el.setAttribute()')).toEqual([])
  })
})
