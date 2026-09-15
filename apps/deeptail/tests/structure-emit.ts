/**
 * The source a page evaluates to run the structural checks.
 *
 * Split from `structure.ts` so that module stays under the file-size limit.
 * The checks themselves live there; this file only serialises them.
 *
 * @module
 */

import { ROOT } from '../../../scripts/source-tree.ts'
import {
  checkAriaReferences,
  checkDuplicateIds,
  checkGroupNames,
  checkHeadingOrder,
  checkListOwnership,
  checkNestedInteractive,
  findStructureDefects,
} from './structure.ts'
import {
  checkAlignment,
  checkClipping,
  checkGrid,
  checkHorizontalOverflow,
  checkNestedScroll,
  gridAncestor,
  isLayoutPane,
  scrolls,
} from './structure-layout.ts'
import { checkOverlappingTargets, checkTouchTargets, drawnBox } from './structure-pointer.ts'
import { describe } from './structure-report.ts'
import { checkInlineScripts, checkOneOffScripts, checkShell } from './structure-shell.ts'
import { checkClassVocabulary } from './structure-vocabulary.ts'

/** The sheet that names the two pointer floors. */
const TOKEN_SHEET = `${ROOT}apps/deeptail/src/styles/tokens.css`

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

/** An animation whose iteration count can be read. */
export interface TimedAnimation {
  readonly effect: { getComputedTiming(): { readonly iterations?: number } } | null
  readonly finished: Promise<Animation>
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
 * The source a page evaluates to run these checks.
 * @param coarsePointer - whether the platform minimum touch target applies.
 * @param vocabulary - every class name the shipped stylesheets define.
 * @returns the source to evaluate.
 */
export async function structureCheckSource(coarsePointer: boolean, vocabulary: readonly string[]): Promise<string> {
  const limits = {
    target: await pointerTargetFloor(coarsePointer ? 'coarse' : 'fine'),
    interactive: INTERACTIVE,
    scope: PRODUCT_SURFACES,
    vocabulary,
  }
  const functions = [
    describe,
    checkDuplicateIds,
    checkNestedInteractive,
    checkHeadingOrder,
    checkAriaReferences,
    checkListOwnership,
    checkGroupNames,
    checkClassVocabulary,
    checkHorizontalOverflow,
    scrolls,
    isLayoutPane,
    checkClipping,
    checkNestedScroll,
    drawnBox,
    checkOverlappingTargets,
    checkTouchTargets,
    checkAlignment,
    gridAncestor,
    checkGrid,
    checkShell,
    checkInlineScripts,
    checkOneOffScripts,
    findStructureDefects,
    finiteAnimations,
    waitForFiniteAnimations,
  ].map(String)
  return `(async () => {\n${functions.join(
    '\n\n',
  )}\nawait waitForFiniteAnimations()\nreturn findStructureDefects(${JSON.stringify(limits)})\n})()`
}
