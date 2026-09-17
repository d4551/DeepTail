/**
 * The names the token sheet writes that are points on no ladder.
 *
 * A scale is a family of rungs, but a sheet also states values the product
 * reads once apiece: the width of a region, the size of a status dot, a plane
 * of the stacking order, the letter cases a sheet may set, and the longest line
 * of text the product draws. Each is named here once, in the open, rather than
 * written into the sheet on its own authority — which is the hole the odd
 * spacing rungs and the three off-scale radii stood in: the sheet said what the
 * number was for, and no rule asked whether the scale had a rung there.
 *
 * Split from `sheet-scale.ts` along that seam: that module declares the ladders
 * and reads what the sheet writes against them, and this one names the values
 * that are decisions rather than rungs. Both are imported through
 * `sheet-scale.ts`, so a consumer reads the scale from one place.
 *
 * @module
 */

/**
 * The names the token sheet writes that are decisions rather than points on a
 * ladder: the width of a region, the size of a status dot, and a plane of the
 * stacking order.
 */
export const SINGLES: readonly string[] = [
  '--dsh-action-min',
  '--dsh-card-width',
  '--dsh-compose-min',
  '--dsh-dot-size',
  '--dsh-drawer',
  '--dsh-drawer-width',
  '--dsh-grid-frame',
  '--dsh-grid-frame-narrow',
  '--dsh-grid-frame-rows',
  '--dsh-inline-direction',
  '--dsh-list-max',
  '--dsh-menu-height',
  '--dsh-menu-max',
  '--dsh-scrollbar-thumb',
  '--dsh-scrollbar-thumb-hover',
  '--dsh-sidebar-width',
  '--dsh-spin-period',
  '--dsh-target-coarse',
  '--dsh-target-fine',
  '--dsh-z-dialog',
  '--dsh-z-drawer',
  '--dsh-z-menu',
  '--dsh-z-modal',
  '--dsh-z-return',
  '--dsh-z-scrim',
]

/**
 * The letter cases a sheet may set, which is the whole vocabulary of
 * `text-transform`.
 *
 * A case is a decision about the reader rather than a length, so it has no rung
 * to read and no staircase to rise: the set itself is the declaration, and both
 * the sheet gate and the page check measure against it. `none` is in the set
 * because a sheet that resets a case has set one.
 */
export const CASINGS: readonly string[] = ['none', 'uppercase', 'lowercase', 'capitalize']

/**
 * The longest line of text the product draws, in CSS pixels.
 *
 * A measure is the one typographic decision with no declaration site: a line
 * runs as wide as the box around it happens to be, and the box is sized by the
 * layout rather than by the reading. Stating the maximum here is what lets the
 * page check ask whether any rendered line box exceeds it, whatever width the
 * viewport it was laid out under.
 */
export const MEASURE_MAX = 640
