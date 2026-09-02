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
import { DICTIONARIES } from '../apps/deeptail/src/locales.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'

/** The locales the product ships, the first standing as the key-set reference. */
function locales(): [LocaleId, ...LocaleId[]] {
  const [first, ...rest] = Object.keys(DICTIONARIES) as LocaleId[]
  if (first === undefined) throw new Error('the product ships no dictionary')
  return [first, ...rest]
}

/** The `{name}` placeholders one sentence carries, in order. */
function placeholders(value: string): string[] {
  return [...value.matchAll(/\{(\w+)\}/gu)].map((found) => found[1] ?? '')
}

describe('translations', () => {
  it('keeps every dictionary on exactly the same keys', () => {
    const [first, ...rest] = locales()
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

  it('fills the same placeholders in every dictionary', () => {
    // A sentence that drops a placeholder in translation renders `{message}`
    // to the reader, or silently loses what it was carrying.
    const [first, ...rest] = locales()
    const reference = DICTIONARIES[first]
    const drift: string[] = []
    for (const locale of rest) {
      const dictionary = DICTIONARIES[locale]
      for (const key of Object.keys(reference) as (keyof typeof reference)[]) {
        const wanted = placeholders(reference[key])
        if (JSON.stringify(wanted) !== JSON.stringify(placeholders(dictionary[key])))
          drift.push(`${locale}:${String(key)}`)
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
