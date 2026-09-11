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
import { TREE_SCAN_BUDGET_MS } from './tree-budget.ts'

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

/**
 * The `{name}` placeholders one sentence carries, in order.
 * @param sentence - the sentence.
 * @returns each placeholder's name, in the order it appears.
 */
function placeholders(sentence: string): string[] {
  return [...sentence.matchAll(/\{(\w+)\}/gu)].map((found) => found[1] ?? '')
}

describe('the dictionaries the product ships', () => {
  it('covers exactly the locales it declares', () => {
    expect(Object.keys(DICTIONARIES).toSorted()).toEqual([...DECLARED].toSorted())
  })

  it('keeps every dictionary on exactly the same keys', () => {
    const reference = Object.keys(DICTIONARIES[DECLARED[0]]).toSorted()
    for (const locale of DECLARED) {
      expect([locale, Object.keys(DICTIONARIES[locale]).toSorted()]).toEqual([locale, reference])
    }
  })

  it('leaves no entry empty in any dictionary', () => {
    const empty: string[] = []
    for (const locale of DECLARED) {
      for (const [key, sentence] of Object.entries(DICTIONARIES[locale])) {
        if (sentence.trim() === '') empty.push(`${locale}:${key}`)
      }
    }
    expect(empty).toEqual([])
  })
})

describe('translations', () => {
  it('fills the same placeholders in every dictionary', () => {
    const drift: string[] = []
    const reference = new Map(Object.entries(DICTIONARIES[DECLARED[0]]))
    for (const locale of DECLARED) {
      for (const [key, sentence] of Object.entries(DICTIONARIES[locale])) {
        const held = reference.get(key)
        if (held === undefined) {
          drift.push(`${locale}:${key}`)
        } else if (JSON.stringify(placeholders(sentence)) !== JSON.stringify(placeholders(held))) {
          drift.push(`${locale}:${key}`)
        }
      }
    }
    expect(drift).toEqual([])
  })

  it(
    'carries no key nothing reads',
    () => {
      // A key kept after its surface is gone is copy nobody maintains, and a
      // dictionary that only grows is one no translator can prioritize.
      const sources = repositoryFiles(['.ts']).filter(
        (file) => file.label.startsWith('apps/deeptail/src/') && !file.label.endsWith('locales.ts'),
      )
      const text = sources.map((file) => readFileSync(file.path, 'utf8')).join('\n')
      const unread = Object.keys(DICTIONARIES.en).filter((key) => !text.includes(`'${key}'`))
      expect(unread).toEqual([])
    },
    TREE_SCAN_BUDGET_MS,
  )
})
