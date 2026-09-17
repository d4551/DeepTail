/**
 * The type fixtures the typography suites render: the shipped ladder, the class
 * names their paragraphs carry, the declarations the document holds, and the
 * builders a case renders one with.
 *
 * happy-dom renders no type of its own, so a fixture styles an element through
 * a stylesheet rule and a marker — the way the product itself styles, since an
 * element style declaration is an inline style even in a fixture — and the
 * browser suites remain the account of what a real engine renders. The ladder is
 * read out of the shipped token sheet at runtime rather than restated: a rung
 * copied into this file is a second ladder that agrees with the shipped one
 * until the day it does not.
 *
 * Held apart from the specs so each spec is the table of cases and this is the
 * machinery for rendering one: the rungs a decision lands on and the measure a
 * line is held to are read over the one set of declarations, and a copy in each
 * spec would drift.
 *
 * @module
 */

import { typographyRamp } from '../apps/deeptail/tests/structure-emit.ts'
import { resetDocument } from './dom.ts'
import { FAMILY_PROPERTY } from './structure-double.ts'

/**
 * The ladder the shipped token sheet declares, read once for the fixtures
 * below.
 */
export const TYPOGRAPHY = await typographyRamp()

/** The rung the conforming markup is painted at: the ladder's last. */
export const RUNG = TYPOGRAPHY.sizes.length - 1

/** That rung's size, the leading that pairs with it, and the shipped family. */
const RUNG_SIZE = TYPOGRAPHY.sizes[RUNG] ?? 0
const RUNG_LEADING = TYPOGRAPHY.leadings[RUNG] ?? 0
const SHIPPED_FAMILY = TYPOGRAPHY.families[0] ?? ''

/** The rung's size, which a finding about it names in pixels. */
export const RUNG_PIXELS = RUNG_SIZE

/** A family no shipped sheet names, which the off-family case renders in. */
export const OFF_FAMILY = ['ui-monospace', 'monospace'].join(', ')

/** The type every fixture case starts from: one rung, with the shipped family. */
const AT_RUNG = `font-size: ${String(RUNG_SIZE)}px; line-height: ${String(RUNG_LEADING)}px; ${FAMILY_PROPERTY}: ${SHIPPED_FAMILY};`

/** The tracking rung that pairs with the rung under test, in pixels. */
const RUNG_TRACKING = (TYPOGRAPHY.trackings[0] ?? 0) * RUNG_SIZE

/**
 * The fixture classes, named once: the rules, the markup, and the expected
 * findings all read the same name, since a finding names the element it is
 * about by its class.
 */
export const AT_RUNG_CLASS = 'type-at-rung'
export const BETWEEN_RUNGS_CLASS = 'type-between-rungs'
export const OFF_LEADING_CLASS = 'type-off-leading'
export const NO_LEADING_CLASS = 'type-no-leading'
export const OFF_FAMILY_CLASS = 'type-off-family'
export const DECLARED_WEIGHT_CLASS = 'type-declared-weight'
export const BOLD_WEIGHT_CLASS = 'type-bold-weight'
export const OFF_WEIGHT_CLASS = 'type-off-weight'
export const ON_TRACKING_CLASS = 'type-on-tracking'
export const OFF_TRACKING_CLASS = 'type-off-tracking'
export const DECLARED_CASE_CLASS = 'type-declared-case'
export const OFF_CASING_CLASS = 'type-off-casing'
export const ONE_LINE_CLASS = 'type-one-line'

/**
 * The declarations the type cases read, as one stylesheet the document carries,
 * so a case styles an element by adding the class it names.
 */
const DECLARATIONS = [
  `.${AT_RUNG_CLASS} { ${AT_RUNG} }`,
  `.${BETWEEN_RUNGS_CLASS} { font-size: 15px; line-height: 24px; ${FAMILY_PROPERTY}: ${SHIPPED_FAMILY}; }`,
  `.${OFF_LEADING_CLASS} { ${AT_RUNG} line-height: 30px; }`,
  `.${NO_LEADING_CLASS} { ${AT_RUNG} line-height: normal; }`,
  `.${OFF_FAMILY_CLASS} { ${AT_RUNG} ${FAMILY_PROPERTY}: ${OFF_FAMILY}; }`,
  `.${DECLARED_WEIGHT_CLASS} { ${AT_RUNG} font-weight: 500; }`,
  `.${BOLD_WEIGHT_CLASS} { ${AT_RUNG} font-weight: bold; }`,
  `.${OFF_WEIGHT_CLASS} { ${AT_RUNG} font-weight: 300; }`,
  `.${ON_TRACKING_CLASS} { ${AT_RUNG} letter-spacing: ${String(RUNG_TRACKING)}px; }`,
  `.${OFF_TRACKING_CLASS} { ${AT_RUNG} letter-spacing: 5.4px; }`,
  `.${DECLARED_CASE_CLASS} { ${AT_RUNG} text-transform: uppercase; }`,
  `.${OFF_CASING_CLASS} { ${AT_RUNG} text-transform: full-width; }`,
  `.${ONE_LINE_CLASS} { ${AT_RUNG} white-space: nowrap; text-overflow: ellipsis; }`,
].join('\n')

/**
 * One paragraph carrying the named fixture type.
 * @param className - the fixture class to render at.
 * @returns the paragraph.
 */
export function paragraph(className: string): HTMLParagraphElement {
  const text = document.createElement('p')
  text.textContent = 'Sessions'
  text.className = className
  return text
}

/**
 * The document a type case starts from: empty, carrying the fixture sheet.
 *
 * A case styles an element by adding the class it names, so the sheet has to be
 * in the document before the case renders anything — and back in it after every
 * reset, which is why the two are one call rather than a hook each spec writes
 * for itself.
 */
export function resetTypeSheet(): void {
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
}
