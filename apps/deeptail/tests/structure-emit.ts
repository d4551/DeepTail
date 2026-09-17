/**
 * The source a page evaluates to run the structural checks.
 *
 * Split from `structure.ts` so that module stays under the file-size limit.
 * The checks themselves live there and in the modules it dispatches to; this
 * file only serialises them — every function the entry point reaches, and the
 * limits they measure against, read from the shipped sources that declare them
 * rather than restated here.
 *
 * @module
 */

import { ROOT } from '../../../scripts/source-tree.ts'
import { ACTION_LIST } from '../src/actions/registry.ts'
import {
  checkAriaReferences,
  checkDuplicateIds,
  checkGroupNames,
  checkHeadingOrder,
  checkListOwnership,
  checkNestedInteractive,
  findStructureDefects,
} from './structure.ts'
import { checkDialogContract, checkDialogPromises, checkOverlayMasks, onScreen } from './structure-dialog.ts'
import { carriesText, laidOutChildren, reachableTargets, surfaceElements } from './structure-elements.ts'
import { checkClipping, checkGrid, gridAncestor } from './structure-layout.ts'
import {
  checkFocusRing,
  checkFocusVisible,
  checkOverlappingTargets,
  checkTouchTargets,
  colourAlpha,
  coveringAt,
  drawnBox,
  readFocusRing,
} from './structure-pointer.ts'
import { familyListOf, type TypographyRamp, typographyRampFrom } from './structure-ramp.ts'
import { clippedAway, describe, pixelLength } from './structure-report.ts'
import { checkAlignment, checkListGutters, checkSiblingAlignment } from './structure-rows.ts'
import { checkHorizontalOverflow, checkNestedScroll, isLayoutPane, scrolls } from './structure-scroll.ts'
import {
  checkActionWiring,
  checkInlineScripts,
  checkOneOffScripts,
  checkShell,
  checkSurfaceSeating,
} from './structure-shell.ts'
import {
  asReported,
  checkTypography,
  lineWidths,
  reportCasing,
  reportFamily,
  reportLeading,
  reportMeasure,
  reportSize,
  reportTracking,
  reportWeight,
} from './structure-typography.ts'
import { checkClassVocabulary, checkReducedMotion, durationsInSeconds } from './structure-vocabulary.ts'

/** The sheet that names the two pointer floors and the type ladder. */
const TOKEN_SHEET = `${ROOT}apps/deeptail/src/styles/tokens.css`

/** The document the bundle is served with, which is where the mount is written. */
const SHIPPED_PAGE = `${ROOT}apps/deeptail/index.html`

/**
 * One pointer floor as a token sheet defines it, in CSS pixels.
 * @param text - the sheet contents.
 * @param name - `fine` (WCAG 2.5.8) or `coarse` (Apple HIG / WCAG 2.5.5).
 * @returns the floor.
 */
export function pointerTargetFloorFrom(text: string, name: 'fine' | 'coarse'): number {
  const match = new RegExp(`--dsh-target-${name}:\\s*(\\d+)px`, 'u').exec(text)
  const px = match?.[1]
  if (px === undefined) throw new Error(`deeptail: tokens.css does not define --dsh-target-${name}`)
  return Number(px)
}

/**
 * One pointer floor as the shipped token sheet defines it.
 * @param name - `fine` or `coarse`.
 * @returns the floor.
 */
export async function pointerTargetFloor(name: 'fine' | 'coarse'): Promise<number> {
  return pointerTargetFloorFrom(await Bun.file(TOKEN_SHEET).text(), name)
}

/**
 * The type ladder as the shipped token sheet declares it.
 * @returns the sizes, their line boxes, and the shipped family lists.
 */
export async function typographyRamp(): Promise<TypographyRamp> {
  return typographyRampFrom(await Bun.file(TOKEN_SHEET).text())
}

/**
 * The selector of the element the shipped document mounts its surfaces in.
 *
 * Read from the page the bundle is served with rather than restated here: the
 * drawer flag the shell lays its layout out over rides on that element, so a
 * shell seated outside it is one the page's own layout no longer reaches — and
 * an id copied into this file would agree with the document until the day it
 * did not. The document gives exactly one element an id, and a document that
 * stops doing so fails here rather than measuring nothing.
 * @returns the mount, as a selector.
 */
async function shippedMount(): Promise<string> {
  const html = await Bun.file(SHIPPED_PAGE).text()
  const id = /<body>[\s\S]*?<[a-z-]+[^>]*\sid="([^"]+)"/u.exec(html)?.[1]
  if (id === undefined) throw new Error('deeptail: index.html gives no element an id to mount the page into')
  return `#${id}`
}

/**
 * Every action marker the shipped registry declares, in registry order.
 *
 * The page is read against the registry the bundle was built from, so a control
 * naming an action no longer in it — or naming two — is caught where the tree
 * shows it rather than where a suite happens to look.
 */
const ACTION_MARKERS: readonly string[] = ACTION_LIST.map((action) => action.marker)

/** An animation whose iteration count can be read. */
export interface TimedAnimation {
  readonly effect: { getComputedTiming(): { readonly iterations?: number } } | null
}

/**
 * Drop infinite animations. A spinner never finishes and must not be awaited.
 * @param animations - every animation currently running.
 * @returns the ones that will finish.
 */
export function finiteAnimations<T extends TimedAnimation>(animations: readonly T[]): T[] {
  return animations.filter((animation) => {
    const effect = animation.effect
    return effect !== null && effect.getComputedTiming().iterations !== Number.POSITIVE_INFINITY
  })
}

/**
 * Wait for fonts and finite animations. Infinite ones (the loading spinner)
 * never finish and must not be awaited.
 * @returns nothing, once fonts are ready and finite animations have finished.
 */
export async function waitForFiniteAnimations(): Promise<void> {
  await document.fonts.ready
  await Promise.allSettled(finiteAnimations([...document.getAnimations()]).map((animation) => animation.finished))
}

/** The surfaces this product draws, however the page is laid out. */
const PRODUCT_SURFACES =
  '[data-deeptail-shell], [data-deeptail-picker], [data-deeptail-state="boot-error"], [data-deeptail-return]'

/** Elements that take focus or activation, including role-named forms. */
const INTERACTIVE =
  'a[href], button, input, select, textarea, summary, [contenteditable="true"], [tabindex]:not([tabindex="-1"]), [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="switch"], [role="tab"], [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="option"]'

/**
 * Every function the page evaluates, in the order the source carries them.
 *
 * The entry point calls each of these by name, so the list is what keeps a
 * helper the checks reach from being left out of what ships: a name missing
 * here is a `ReferenceError` on the page, and every structural check on it
 * then reports nothing at all. That holds for a helper a shipped check calls
 * as much as for the check itself, so the typography helpers travel beside
 * `checkTypography`, the element reads travel with the checks that make them,
 * and the widths the type rules measure travel with them.
 */
const SHIPPED_FUNCTIONS: readonly ((...args: never[]) => unknown)[] = [
  describe,
  pixelLength,
  clippedAway,
  carriesText,
  surfaceElements,
  laidOutChildren,
  reachableTargets,
  colourAlpha,
  familyListOf,
  durationsInSeconds,
  checkDuplicateIds,
  checkNestedInteractive,
  checkHeadingOrder,
  checkAriaReferences,
  checkListOwnership,
  checkGroupNames,
  checkClassVocabulary,
  reportSize,
  reportLeading,
  reportFamily,
  reportWeight,
  reportTracking,
  reportCasing,
  asReported,
  lineWidths,
  reportMeasure,
  checkTypography,
  checkHorizontalOverflow,
  scrolls,
  isLayoutPane,
  checkClipping,
  checkNestedScroll,
  drawnBox,
  checkOverlappingTargets,
  checkTouchTargets,
  checkAlignment,
  checkSiblingAlignment,
  checkListGutters,
  gridAncestor,
  checkGrid,
  checkSurfaceSeating,
  checkActionWiring,
  checkShell,
  checkDialogPromises,
  checkOverlayMasks,
  onScreen,
  checkDialogContract,
  checkInlineScripts,
  checkOneOffScripts,
  checkReducedMotion,
  readFocusRing,
  checkFocusRing,
  coveringAt,
  checkFocusVisible,
  findStructureDefects,
  finiteAnimations,
  waitForFiniteAnimations,
]

/**
 * The source a page evaluates to run these checks.
 * @param coarsePointer - whether the platform minimum touch target applies.
 * @param vocabulary - every class name the shipped stylesheets define.
 * @param actions - every action marker the shipped registry declares; the
 * registry the bundle was built from unless a case is measuring a page against
 * another one.
 * @returns the source to evaluate.
 */
export async function structureCheckSource(
  coarsePointer: boolean,
  vocabulary: readonly string[],
  actions: readonly string[] = ACTION_MARKERS,
): Promise<string> {
  const limits = {
    target: await pointerTargetFloor(coarsePointer ? 'coarse' : 'fine'),
    interactive: INTERACTIVE,
    scope: PRODUCT_SURFACES,
    vocabulary,
    typography: await typographyRamp(),
    actions,
    mount: await shippedMount(),
  }
  const functions = SHIPPED_FUNCTIONS.map(String)
  return `(async () => {\n${functions.join(
    '\n\n',
  )}\nawait waitForFiniteAnimations()\nreturn findStructureDefects(${JSON.stringify(limits)})\n})()`
}
