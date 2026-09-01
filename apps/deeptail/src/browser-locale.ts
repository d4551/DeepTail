/**
 * Locale selection for a surface that paints before any locale service exists.
 *
 * Mirrors `@deepseek-ai/dsh-browser-locale`: a regional tag still selects its
 * language, so `zh-CN`, `zh-Hant`, and `zh` all take the Chinese dictionary.
 *
 * @module
 */

/** The locales DeepTail ships. */
export type LocaleId = 'en' | 'zh'

/**
 * Resolve the locale from the browser's language preferences.
 * @param tags - language tags to consider; defaults to the browser's own list.
 * @returns the locale whose dictionary should be used.
 */
export function resolveLocale(tags?: readonly string[]): LocaleId {
  const requested =
    tags ??
    (typeof window === 'undefined'
      ? []
      : ((navigator as { readonly languages?: readonly string[]; readonly language: string }).languages ?? [
          navigator.language,
        ]))
  for (const tag of requested) {
    if (tag.toLowerCase().split('-')[0] === 'zh') return 'zh'
  }
  return 'en'
}
