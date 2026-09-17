/**
 * The doubles the structure-helper suites share: a finding collector, a marked
 * surface, a painted box, a painted style, a painted focus ring, an answered
 * hit test, a painted line box, and the spellings and measurements a case
 * fixtures around them.
 *
 * Every check the page runs reports through one `Report` callback, and every
 * scope selector matches an element marked as a product surface. The geometry,
 * typography and motion checks read what the engine computes, and happy-dom
 * computes no box, no type and no focus state of its own, so a case paints onto
 * the element the values its check reads — through a stylesheet rule and a
 * marker, the way the product itself styles, since an element style declaration
 * is an inline style even in a fixture. The marker is a data attribute rather
 * than a class, because the class vocabulary is one of the things under test
 * and a fixture's paint must not sit among the names the shipped sheets define.
 * Every suite builds its markup from the same pieces, so they read them from
 * here rather than carrying copies.
 *
 * @module
 */

import type { TypographyRamp } from '../apps/deeptail/tests/structure-ramp.ts'
import type { Report, StructureFinding } from '../apps/deeptail/tests/structure-report.ts'

/**
 * The property the type rules read, assembled so this file's own source
 * carries none whole — the same read the geometry suites make of the physical
 * alignment spellings they fixture.
 */
export const FAMILY_PROPERTY = ['font', 'family'].join('-')

/**
 * The physical and justified text-alignment spellings the alignment rule
 * refuses, assembled so no suite's own source carries one whole: a rule reading
 * this file must not read its own fixtures as the defect they describe.
 */
export const PHYSICAL_LEFT = ['le', 'ft'].join('')
export const PHYSICAL_RIGHT = ['ri', 'ght'].join('')
export const PHYSICAL_JUSTIFY = ['ju', 'stify'].join('')

/** The declarations of a focus ring that never arrives, and of one that does. */
export const FOCUS_RING_NONE = 'outline: none;'
export const FOCUS_RING_SHOWN = 'outline: 2px solid rgb(0, 0, 0);'

/**
 * The attribute a painted rule selects on, and the attribute the element
 * carries so the rule reaches it.
 */
const PAINT = 'data-deeptail-paint'

/**
 * A finding collector, the way the page hands one to each check.
 * @returns the findings collected so far, and the report callback.
 */
export function collector(): { readonly findings: StructureFinding[]; readonly add: Report } {
  const findings: StructureFinding[] = []
  return {
    findings,
    add: (rule, detail) => {
      findings.push({ rule, detail })
    },
  }
}

/**
 * One element marked as a product surface, so a scope selector matches it.
 * @param tag - the tag to create.
 * @returns the marked element.
 */
export function surface(tag: string): HTMLElement {
  const node = document.createElement(tag)
  node.setAttribute('data-structure-scope', '')
  return node
}

/**
 * Paints one box onto one element, where happy-dom paints none.
 * @param node - the element to give a box.
 * @param box - the edges of the box, in CSS pixels.
 */
export function paintBox(
  node: Element,
  box: { readonly top: number; readonly left: number; readonly right: number; readonly bottom: number },
): void {
  Object.defineProperty(node, 'getBoundingClientRect', {
    value: () => ({ ...box, width: box.right - box.left, height: box.bottom - box.top }),
    configurable: true,
  })
}

/**
 * The widths one element reports, painted where no layout engine measured it.
 * @param node - the element to give the measurements to.
 * @param widths - what it reports as its scroll width and its client width.
 */
export function paintWidths(node: Element, widths: { readonly scroll: number; readonly client: number }): void {
  Object.defineProperty(node, 'scrollWidth', { value: widths.scroll, configurable: true })
  Object.defineProperty(node, 'clientWidth', { value: widths.client, configurable: true })
}

/**
 * The heights one element reports, painted where no layout engine measured it.
 * @param node - the element to give the measurements to.
 * @param heights - what it reports as its scroll height and its client height.
 */
export function paintHeights(node: Element, heights: { readonly scroll: number; readonly client: number }): void {
  Object.defineProperty(node, 'scrollHeight', { value: heights.scroll, configurable: true })
  Object.defineProperty(node, 'clientHeight', { value: heights.client, configurable: true })
}

/**
 * The marker one set of declarations is painted under: the declarations
 * themselves, reduced to a name a selector can carry.
 *
 * Derived rather than counted, so two elements painted with the same
 * declarations share the one rule, two different paints never collide, and
 * nothing about a paint depends on the order the cases ran in.
 * @param declarations - the declarations to name.
 * @returns the marker.
 */
function paintMarker(declarations: string): string {
  return declarations.replaceAll(/[^a-z0-9]+/giu, '-')
}

/**
 * Paints declarations onto one element through a stylesheet rule and a marker,
 * where an element style declaration would be an inline style.
 * @param node - the element to paint.
 * @param declarations - the CSS declarations, without the block.
 */
export function paintDeclarations(node: HTMLElement, declarations: string): void {
  const marker = paintMarker(declarations)
  if (document.querySelector(`style[${PAINT}="${marker}"]`) === null) {
    const sheet = document.createElement('style')
    sheet.setAttribute('data-deeptail-paint', marker)
    sheet.textContent = `[${PAINT}="${marker}"] { ${declarations} }`
    document.head.append(sheet)
  }
  node.setAttribute('data-deeptail-paint', marker)
}

/**
 * Paints the two states of a focus ring onto one control.
 *
 * happy-dom reacts to no focus state at all: a `:focus` rule computes nothing,
 * so the two reads `checkFocusVisible` makes of one control are the same read,
 * and the ring a sheet paints correctly is reported as a ring the reader cannot
 * see. The states are painted the way the rest of this file paints — through a
 * stylesheet rule and a marker — and the marker is switched by the focus and
 * blur events the engine dispatches, which is the work the pseudo-class does in
 * a real engine. A case therefore paints the ring it is asking about: one that
 * arrives with focus, one that is the same in both states, or none in either.
 * @param node - the control to paint.
 * @param resting - the declarations it paints while it does not hold focus.
 * @param focused - the declarations it paints while it holds focus.
 */
export function paintFocusRing(node: HTMLElement, resting: string, focused: string): void {
  paintDeclarations(node, resting)
  node.addEventListener('focus', () => paintDeclarations(node, focused))
  node.addEventListener('blur', () => paintDeclarations(node, resting))
}

/**
 * Whether a control takes focus when the check asks it to, where happy-dom
 * focuses every element it is asked about.
 *
 * A control the engine will not focus is the one shape the focus rule excludes
 * by reading `document.activeElement` after the call: button, link and input
 * are all focusable, and a control a browser refuses leaves focus where it was.
 * The engine here answers the call for a control a browser would refuse, so a
 * case that needs the refusal says so.
 * @param node - the control that will not take focus.
 */
export function refuseFocus(node: HTMLElement): void {
  Object.defineProperty(node, 'focus', { value: () => 0, configurable: true })
}

/**
 * What the hit test answers with, at every point it is asked about.
 *
 * `elementFromPoint` is what says whether a control is covered, and happy-dom
 * answers null for every point, so a hit test there reports no cover at all. A
 * case that asks about a covered control says what the point is over; a case
 * that asks about a control nothing covers answers with the control itself.
 * @param answer - the element the hit test answers with, or null for nothing.
 */
export function answerHitTest(answer: Element | null): void {
  Object.defineProperty(document, 'elementFromPoint', { value: () => answer, configurable: true })
}

/**
 * Puts the engine's own hit test back, where it answers the layout it has.
 */
export function restoreHitTest(): void {
  Reflect.deleteProperty(document, 'elementFromPoint')
}

/**
 * The widths the range over an element's text reports, where happy-dom lays
 * nothing out and answers an empty list.
 *
 * A range reports one rectangle per line box, which is the reading the measure
 * rule is about rather than the box the line sits in, so a case that asks
 * whether a long line is reported says what the engine would have measured.
 * @param widths - one width per line box, in CSS pixels.
 */
export function paintLineWidths(widths: readonly number[]): void {
  const range = document.createRange()
  const boxes = widths.map((width) => new DOMRect(0, 0, width, 12))
  Object.defineProperty(range, 'getClientRects', { value: () => boxes, configurable: true })
  Object.defineProperty(document, 'createRange', { value: () => range, configurable: true })
}

/**
 * Puts the engine's own range back, where it reports the lines it painted.
 */
export function restoreLineWidths(): void {
  Reflect.deleteProperty(document, 'createRange')
}

/**
 * One rung of the shipped ladder as a case paints it, with the deviation the
 * case is about written over it.
 *
 * An absent field keeps the rung's own value; a `null` leaves that declaration
 * out entirely, which is how a case asks for the engine's own line box.
 */
export interface TypePaint {
  readonly size?: number | null
  readonly leading?: number | null
  readonly family?: string | null
}

/**
 * The declarations one rung of the ladder paints, read out of the ramp.
 * @param ramp - the ladder the shipped token sheet declares.
 * @param rung - the index of the rung.
 * @param deviation - the values the case writes over the rung's own.
 * @returns the declarations, in one string.
 */
export function typeDeclarations(ramp: TypographyRamp, rung: number, deviation: TypePaint = {}): string {
  const size = deviation.size === undefined ? ramp.sizes[rung] : deviation.size
  const leading = deviation.leading === undefined ? ramp.leadings[rung] : deviation.leading
  const family = deviation.family === undefined ? ramp.families[0] : deviation.family
  if (size === undefined || size === null || family === undefined || family === null) {
    throw new Error(`deeptail: the shipped ladder has no rung ${String(rung)} or no family to paint`)
  }
  const declarations = [`font-size: ${String(size)}px`]
  if (leading !== undefined && leading !== null) declarations.push(`line-height: ${String(leading)}px`)
  declarations.push(`${FAMILY_PROPERTY}: ${family}`)
  return `${declarations.join('; ')};`
}

/**
 * Paints one rung of the shipped type ladder onto one element, where happy-dom
 * renders every element at the engine's own default.
 *
 * The rung travels with the leading that pairs with it and the first family
 * the shipped sheets declare — read out of the token sheet at runtime, never
 * restated here — so an element painted here conforms exactly as the page
 * would were the sheet loaded, which is what the browser suites remain the
 * account of. The rule selects the paint's own marker, so two rungs painted
 * into one document keep their own types.
 * @param node - the element to give a type.
 * @param ramp - the ladder the shipped token sheet declares.
 * @param rung - the index of the rung to paint.
 * @param deviation - the values the case writes over the rung's own.
 */
export function paintType(node: HTMLElement, ramp: TypographyRamp, rung: number, deviation: TypePaint = {}): void {
  paintDeclarations(node, typeDeclarations(ramp, rung, deviation))
}
