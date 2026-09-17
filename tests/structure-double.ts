/**
 * The doubles the structure-helper suites share: a finding collector, a marked
 * surface, a painted box, and a painted style.
 *
 * Every check the page runs reports through one `Report` callback, and every
 * scope selector matches an element marked as a product surface. The geometry,
 * typography and motion checks read what the engine computes, and happy-dom
 * computes no box and no type of its own, so a case paints onto the element the
 * values its check reads — through a stylesheet rule and a marker, the way the
 * product itself styles, since an element style declaration is an inline style
 * even in a fixture. The marker is a data attribute rather than a class,
 * because the class vocabulary is one of the things under test and a fixture's
 * paint must not sit among the names the shipped sheets define. Both suites
 * build their markup from the same pieces, so they read them from here rather
 * than carrying copies.
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
  node.dataset['structureScope'] = ''
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
    sheet.dataset['deeptailPaint'] = marker
    sheet.textContent = `[${PAINT}="${marker}"] { ${declarations} }`
    document.head.append(sheet)
  }
  node.dataset['deeptailPaint'] = marker
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
