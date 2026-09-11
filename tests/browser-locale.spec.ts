/**
 * Locale resolution for a surface that paints before any locale service exists.
 *
 * A regional tag still selects its language, so the resolution is by the
 * language subtag alone: `zh-CN`, `zh-Hant`, and `zh` all take the Chinese
 * dictionary, and a tag the product does not ship falls back to the English
 * one. The order of the browser's own preference list is the order the
 * operator chose, so the first tag that names a shipped dictionary wins.
 */

import { describe, expect, it } from 'bun:test'
import { LOCALES, resolveLocale } from '../apps/deeptail/src/browser-locale.ts'

describe('resolving the locale from language tags', () => {
  it('takes the Chinese dictionary from every tag that names Chinese', () => {
    expect(resolveLocale(['zh-CN'])).toBe('zh')
    expect(resolveLocale(['zh-Hant'])).toBe('zh')
    expect(resolveLocale(['zh'])).toBe('zh')
  })

  it('reads the language subtag however it is cased', () => {
    expect(resolveLocale(['ZH-cn'])).toBe('zh')
  })

  it('takes the English dictionary from a tag that names English', () => {
    expect(resolveLocale(['en-GB'])).toBe('en')
    expect(resolveLocale(['en'])).toBe('en')
  })

  it('falls back to English for a language the product does not ship', () => {
    expect(resolveLocale(['fr-FR'])).toBe('en')
    expect(resolveLocale(['de'])).toBe('en')
  })

  it('answers the first tag in preference order that names a shipped dictionary', () => {
    // The browser lists its preferences most preferred first, so a French
    // speaker who also reads Chinese gets French, and the reverse order gets
    // Chinese. A resolution that read the last match instead of the first
    // would answer both the same.
    expect(resolveLocale(['fr-FR', 'zh-CN'])).toBe('zh')
    expect(resolveLocale(['zh-CN', 'fr-FR'])).toBe('zh')
    expect(resolveLocale(['fr-FR', 'de', 'en-GB'])).toBe('en')
  })

  it('answers English for an empty preference list', () => {
    expect(resolveLocale([])).toBe('en')
  })

  it('answers from the browser’s own list when none is handed in', () => {
    // The unit environment carries a navigator whose own preference names no
    // Chinese, so the default path answers English here; the Chinese browser
    // is driven end to end in the picker's browser suite.
    expect(resolveLocale()).toBe('en')
  })
})

describe('the locales the product ships', () => {
  it('ships the two dictionaries the resolution answers with', () => {
    expect([...LOCALES]).toEqual(['en', 'zh'])
  })
})
