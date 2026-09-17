/**
 * Every function the structure checks ship to the page, by definition.
 *
 * One list, read by every suite that pins what the page carries: a helper
 * dropped from what is shipped is a `ReferenceError` the moment the page
 * evaluates this, and every structural check on that page then reports
 * nothing at all — so the whole set is pinned rather than a chosen few, and
 * the set is stated once, since a second copy would agree with the first only
 * until the day it did not.
 *
 * @module
 */

export const SHIPPED_CHECKS: readonly string[] = [
  'asReported',
  'carriesText',
  'checkAlignment',
  'checkAriaReferences',
  'checkClassVocabulary',
  'checkClipping',
  'checkDialogContract',
  'checkDuplicateIds',
  'checkFocusRing',
  'checkFocusVisible',
  'checkGrid',
  'checkGroupNames',
  'checkHeadingOrder',
  'checkHorizontalOverflow',
  'checkInlineScripts',
  'checkListGutters',
  'checkListOwnership',
  'checkNestedInteractive',
  'checkNestedScroll',
  'checkOneOffScripts',
  'checkOverlappingTargets',
  'checkReducedMotion',
  'checkShell',
  'checkSiblingAlignment',
  'checkTouchTargets',
  'checkTypography',
  'clippedAway',
  'colourAlpha',
  'coveringAt',
  'describe',
  'drawnBox',
  'durationsInSeconds',
  'familyListOf',
  'findStructureDefects',
  'finiteAnimations',
  'gridAncestor',
  'isLayoutPane',
  'laidOutChildren',
  'lineWidths',
  'pixelLength',
  'reachableTargets',
  'readFocusRing',
  'reportCasing',
  'reportFamily',
  'reportLeading',
  'reportMeasure',
  'reportSize',
  'reportTracking',
  'reportWeight',
  'scrolls',
  'surfaceElements',
  'waitForFiniteAnimations',
]
