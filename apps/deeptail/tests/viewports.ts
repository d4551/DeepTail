/**
 * The widths the shell is designed against, narrowest first.
 *
 * One table, so the a11y suite, the structure suite and the harness cannot
 * drift on what "phone" or "tablet" means, or on which pointer each width
 * ships with.
 *
 * @module
 */

/** One viewport the product is measured at. */
export interface Viewport {
  readonly label: string
  readonly width: number
  readonly height: number
  /** Coarse pointer (touch) uses Apple HIG 44px; fine pointer uses WCAG 24px. */
  readonly coarse: boolean
}

/**
 * The widths the shell is designed against, narrowest first.
 *
 * The first row is not a device: it is the box WCAG 2.2 SC 1.4.10 names, 320
 * CSS pixels wide by 256 tall, the shape a 1280px window takes at 400% zoom.
 * Every other row is tall enough that a dialog fits it whatever the dialog
 * does, so a dialog that had lost its scroll containment measured clean at all
 * of them while its heading sat above the top of the screen and its action row
 * below the bottom, with nothing on the page able to scroll to either.
 */
export const VIEWPORTS: readonly Viewport[] = [
  { label: 'reflow floor', width: 320, height: 256, coarse: true },
  { label: 'small phone', width: 320, height: 720, coarse: true },
  { label: 'phone', width: 390, height: 844, coarse: true },
  { label: 'tablet', width: 768, height: 1024, coarse: true },
  { label: 'laptop', width: 1280, height: 800, coarse: false },
  { label: 'desktop', width: 1920, height: 1080, coarse: false },
]

/**
 * One named viewport from the table.
 * @param label - the viewport's label.
 * @returns the viewport.
 */
function namedViewport(label: string): Viewport {
  const found = VIEWPORTS.find((viewport) => viewport.label === label)
  if (found === undefined) throw new Error(`VIEWPORTS has no entry labelled ${label}`)
  return found
}

/** The phone viewport the harness opens for `{ mobile: true }`. */
export const PHONE_VIEWPORT = namedViewport('phone')

/** The tablet viewport the harness opens for `{ tablet: true }`. */
export const TABLET_VIEWPORT = namedViewport('tablet')

/** The 320 CSS-pixel coarse width, opened as a touch context then sized. */
export const SMALL_PHONE_VIEWPORT = namedViewport('small phone')

/**
 * The box WCAG 2.2 SC 1.4.10 requires content to reflow into, 320×256 CSS
 * pixels — a 1280px window at 400% zoom. Short enough that a dialog has to
 * decide what scrolls, which is what no taller viewport ever asks it.
 */
export const REFLOW_VIEWPORT = namedViewport('reflow floor')

/**
 * Harness pointer flags for one designed width.
 *
 * Coarse widths must emulate a touch device. Resizing a desktop page keeps a
 * fine pointer and would measure 24px targets as if they were for a finger.
 * @param viewport - one row of `VIEWPORTS`.
 */
export function pointerFlags(viewport: Viewport): { mobile?: true; tablet?: true } {
  if (viewport.label === 'tablet') return { tablet: true }
  if (viewport.coarse) return { mobile: true }
  return {}
}
