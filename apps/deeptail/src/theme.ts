/**
 * Light/dark resolution, matching the harness mechanism: `prefers-color-scheme`
 * resolves the `system` preference into the `body[data-ds-dark-theme]`
 * attribute. The token sheet keys both the palette and `color-scheme` off that
 * one attribute, so native UA chrome follows without script.
 *
 * @module
 */

/** What the viewer asked for; `system` follows the OS. */
export type ThemePreference = 'light' | 'dark' | 'system'

/** The attribute the token sheet keys its dark palette off. */
const DARK_ATTRIBUTE = 'data-ds-dark-theme'

/** Drops the OS listener a previous `system` preference installed. */
let following: (() => void) | undefined

/** The query the `system` preference is resolved through. */
const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Apply a theme preference to the document, and keep applying it.
 *
 * A `system` preference is a subscription, not a reading: resolved once at
 * boot, switching the OS to dark left a long-running window in the light
 * palette — and its `theme-color` stale — until it was restarted. The listener
 * is replaced on each call, so a later explicit choice drops it.
 * @param preference - the viewer's choice.
 */
export function applyTheme(preference: ThemePreference = 'system'): void {
  const media = typeof matchMedia === 'undefined' ? undefined : matchMedia(DARK_QUERY)
  following?.()
  following = undefined
  if (preference === 'system' && media !== undefined) {
    const follow = (): void => {
      applyTheme('system')
    }
    media.addEventListener('change', follow)
    following = () => {
      media.removeEventListener('change', follow)
    }
  }
  const dark = preference === 'dark' || (preference === 'system' && (media?.matches ?? false))
  document.body.toggleAttribute(DARK_ATTRIBUTE, dark)
  // The mobile browser chrome takes its colour from the computed background,
  // so the meta tag is synced after the palette has switched.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') ?? document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = getComputedStyle(document.body).backgroundColor
  if (!meta.isConnected) document.head.append(meta)
}
