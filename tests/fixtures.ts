/**
 * Shared fixtures for the gate suites: how a source is assembled, and how its
 * offences are read back.
 *
 * @module
 */

import * as bans from '../scripts/ban-gate.ts'
import * as styles from '../scripts/style-gate.ts'

/**
 * A fixture assembled from lines, so one logical source can be written as
 * readable statements.
 * @param lines - the lines of the source.
 * @returns the fixture.
 */
export function source(...lines: readonly string[]): string {
  return `${lines.join('\n')}\n`
}

/**
 * A fixture assembled from parts, so the gate's own bans cannot read it as data.
 * @param parts - the fragments of the fixture.
 * @returns the fixture.
 */
export function joined(...parts: readonly string[]): string {
  return parts.join('')
}

/**
 * The reasons a script is rejected for.
 * @param text - the fixture.
 * @param label - the path to attribute it to, which selects the dialect.
 * @returns one reason per offence.
 */
export function styleOffences(text: string, label = 'fixture.ts'): string[] {
  return styles.scanSource(label, text).map((offence) => offence.why)
}

/**
 * Whether the gate read a name and found it to be the style one, rather than
 * refusing a name it could not read.
 *
 * The difference is the whole of the constant folder. Both outcomes reject the
 * source, so a suite that asks only whether something was reported cannot tell
 * a fold that works from a fold that has been deleted — which is exactly what
 * an audit found: every folding rule could be removed with the suite green.
 * @param text - the fixture.
 * @returns true when the offence names the style attribute or property.
 */
export function readsTheName(text: string): boolean {
  const why = styleOffences(text)
  return why.length > 0 && why.every((reason) => reason.includes('named style'))
}

/**
 * The reasons a source is rejected by the ban gate.
 * @param text - the fixture.
 * @param label - the path to attribute it to, which selects the reader.
 * @returns one reason per offence.
 */
export function banOffences(text: string, label = 'fixture.ts'): string[] {
  return bans.scanSource(label, text).map((offence) => offence.why)
}

/**
 * Markup that carries the attribute, assembled so this file's own source does
 * not contain it.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function markupFixture(attribute: string): string {
  return `el.insertAdjacentHTML('beforeend', '<b ' + '${attribute}' + '="x">')`
}

/**
 * A shell document carrying the attribute, assembled the same way.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function documentFixture(attribute: string): string {
  return `<main ${attribute}="color: red"><p>hi</p></main>`
}

/**
 * Markup whose value is supplied at runtime, written with an interpolation.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function interpolatedMarkup(attribute: string): string {
  return `el.insertAdjacentHTML('beforeend', \`<b ${attribute}="color: \${colour}">!</b>\`)`
}

/**
 * Markup whose value is supplied at runtime, written with concatenation.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function concatenatedMarkup(attribute: string): string {
  return `el.insertAdjacentHTML('beforeend', '<i ${attribute}="' + colour + '"></i>')`
}

/**
 * A JSX element carrying the attribute.
 * @param attribute - the attribute name to plant.
 * @returns the fixture.
 */
export function badge(attribute: string): string {
  return `export const Badge = () => <div ${attribute}={{ color: 'red' }} />`
}
