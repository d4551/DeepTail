/**
 * Light/dark resolution, matching the harness mechanism: `prefers-color-scheme`
 * resolves into the `body[data-ds-dark-theme]` attribute. The token sheet keys
 * both the palette and `color-scheme` off that one attribute, so native UA
 * chrome follows without script.
 *
 * The viewer's own setting is the control. This module carried a
 * `ThemePreference` of `light | dark | system` and a parameter to choose
 * between them, and nothing ever passed one: the single call site asks for the
 * default. Two of the three values were unreachable, and the branch that read
 * them was a switch for a control this product does not draw. What is left is
 * what actually runs. A preference surface would bring the parameter back
 * along with the control that sets it.
 *
 * @module
 */

/** The attribute the token sheet keys its dark palette off. */
const DARK_ATTRIBUTE = 'data-ds-dark-theme'

/** Drops the OS listener a previous call installed. */
let following: (() => void) | undefined

/** The query the viewer's setting is resolved through. */
const DARK_QUERY = '(prefers-color-scheme: dark)'

/**
 * Resolve the viewer's colour setting onto the document, and keep resolving it.
 *
 * A subscription, not a reading: resolved once at boot, switching the OS to
 * dark left a long-running window in the light palette — and its `theme-color`
 * stale — until it was restarted. The listener is replaced on each call, so
 * repeated calls hold one subscription rather than accumulating them.
 */
export function applyTheme(): void {
  const media = typeof matchMedia === 'undefined' ? undefined : matchMedia(DARK_QUERY)
  following?.()
  following = undefined
  if (media !== undefined) {
    const follow = (): void => {
      applyTheme()
    }
    media.addEventListener('change', follow)
    following = () => {
      media.removeEventListener('change', follow)
    }
  }
  document.body.toggleAttribute(DARK_ATTRIBUTE, media?.matches ?? false)
  // The mobile browser chrome takes its colour from the computed background,
  // so the meta tag is synced after the palette has switched.
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]') ?? document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = getComputedStyle(document.body).backgroundColor
  if (!meta.isConnected) document.head.append(meta)
}
