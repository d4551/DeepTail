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

/** The widths the shell is designed against, narrowest first. */
export const VIEWPORTS: readonly Viewport[] = [
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
