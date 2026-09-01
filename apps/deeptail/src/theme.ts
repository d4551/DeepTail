/**
 * Light/dark resolution, matching the harness mechanism: `prefers-color-scheme`
 * is consulted once to resolve the `system` preference into the
 * `body[data-ds-dark-theme]` attribute the token sheet keys off, and
 * `html { color-scheme }` drives native UA chrome.
 *
 * @module
 */

/** What the viewer asked for; `system` follows the OS. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** The attribute the token sheet keys its dark palette off. */
const DARK_ATTRIBUTE = 'data-ds-dark-theme'

/**
 * Apply a theme preference to the document.
 * @param preference - the viewer's choice.
 * @returns the resolved scheme actually applied.
 */
export function applyTheme(preference: ThemePreference = 'system'): 'light' | 'dark' {
  const systemDark =
    preference === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  const dark = preference === 'dark' || systemDark
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
  document.body.toggleAttribute(DARK_ATTRIBUTE, dark)
  // The mobile browser chrome takes its colour from the computed background,
  // so the meta tag is synced after the palette has switched.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') ?? document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = getComputedStyle(document.body).backgroundColor
  if (!meta.isConnected) document.head.append(meta)
  return dark ? 'dark' : 'light'
}
