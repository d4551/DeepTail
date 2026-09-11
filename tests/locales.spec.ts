/**
 * The shipped dictionaries: same keys, no empty entries, same placeholders,
 * no key that nothing reads.
 *
 * A sentence that drops a placeholder in translation renders `{message}` to
 * the reader, or silently loses what it was carrying; a key kept after its
 * surface is gone is copy nobody maintains. These read the dictionaries the
 * product actually ships.
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import type { LocaleId } from '../apps/deeptail/src/browser-locale.ts'
import { LOCALES } from '../apps/deeptail/src/browser-locale.ts'
import { DICTIONARIES } from '../apps/deeptail/src/locales.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'

/**
 * The locales the product declares, the first standing as the key-set
 * reference.
 *
 * Read off the declaration rather than off the dictionaries' own keys, which
 * `Object.keys` answers with as strings: a string claimed to be a locale is a
 * dictionary this suite would look up and not find. That the two agree is a
 * case of its own below, so a locale declared with nothing behind it is
 * reported rather than passed over.
 */
const DECLARED: readonly [LocaleId, ...LocaleId[]] = LOCALES

/** The `{name}` placeholders one sentence carries, in order. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/gu)].map((found) => found[1] ?? '')
}

describe('the dictionaries the product ships', () => {
  it('covers exactly the locales it declares', () => {
    expect(Object.keys(DICTIONARIES).toSorted()).toEqual([...DECLARED].toSorted())
  })

  it('keeps every dictionary on exactly the same keys', () => {
    const [first, ...rest] = DECLARED
    expect(rest.length).toBeGreaterThan(0)
    const reference = Object.keys(DICTIONARIES[first]).toSorted()
    expect(reference.length).toBeGreaterThan(20)
    for (const locale of rest) {
      expect([locale, Object.keys(DICTIONARIES[locale]).toSorted()]).toEqual([locale, reference])
    }
  })

  it('leaves no entry empty in any dictionary', () => {
    const empty = Object.entries(DICTIONARIES).flatMap(([locale, dictionary]) =>
      Object.entries(dictionary)
        .filter(([, value]) => value.trim() === '')
        .map(([key]) => `${locale}:${key}`),
    )
    expect(empty).toEqual([])
  })
})

describe('translations', () => {
  it('fills the same placeholders in every dictionary', () => {
    // A sentence that drops a placeholder in translation renders `{message}`
    // to the reader, or silently loses what it was carrying.
    const [first, ...rest] = DECLARED
    const reference = DICTIONARIES[first]
    const drift: string[] = []
    for (const locale of rest) {
      const dictionary = new Map(Object.entries(DICTIONARIES[locale]))
      for (const [key, sentence] of Object.entries(reference)) {
        const held = dictionary.get(key)
        // A key a dictionary does not carry is a sentence the reader would see
        // in another language, not a placeholder mismatch; reading it as empty
        // would report it only where the reference happened to carry one.
        if (held === undefined) drift.push(`${locale}:${key} is missing`)
        else if (JSON.stringify(placeholders(sentence)) !== JSON.stringify(placeholders(held))) {
          drift.push(`${locale}:${key}`)
        }
      }
    }
    expect(drift).toEqual([])
  })

  it('carries no key nothing reads', () => {
    // A key kept after its surface is gone is copy nobody maintains, and a
    // dictionary that only grows is one no translator can prioritize.
    const sources = repositoryFiles(['.ts']).filter(
      (file) => file.label.startsWith('apps/deeptail/src/') && !file.label.endsWith('locales.ts'),
    )
    const text = sources.map((file) => readFileSync(file.path, 'utf8')).join('\n')
    const unread = Object.keys(DICTIONARIES.en).filter((key) => !text.includes(`'${key}'`))
    expect(unread).toEqual([])
  })
})
