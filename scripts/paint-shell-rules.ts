/**
 * Every rule the painted chrome is held to.
 *
 * The chrome the shell factories seat in `#root` is the first paint, and this
 * is the reading that says what it must be: the one product shell, the reading
 * region, the navigation landmark named for a reader, the live region, the
 * control that names the region it opens, the one titled heading that names the
 * page, and the ids its references reach. The markup gate's own rules are read
 * here too, so a first paint carrying an inline style, a handler, a script body
 * or a retired element is refused where it is built rather than in an engine
 * nobody runs at build time.
 *
 * `paint-document-rules.ts` applies this reading to the shell it finds in the
 * built page, so a document cannot carry a chrome the painted fragment would
 * have been refused for.
 *
 * @module
 */

import { parse } from 'parse5'
import { markupOffences } from './markup-gate.ts'
import { type PaintOffence, referenceOffences, refusalText, refusedAt } from './paint-contract.ts'
import { attributeOf, classesOf, elementsOf, type Parsed, tagOf, textOf } from './paint-tree.ts'

/** The attribute that names the one product shell a document carries. */
const SHELL = 'data-deeptail-shell'

/** The class the shell's own title element carries, which the contract reads. */
const TITLE = 'main-title'

/** The roles that announce a change without moving the reader's focus. */
const LIVE_ROLES = new Set(['alert', 'log', 'status'])

/** The live-region attribute itself, for an element that names its own. */
const LIVE_ATTRIBUTE = 'aria-live'

/** The values of that attribute which announce a change. */
const LIVE_VALUES = new Set(['polite', 'assertive'])

/** Whether one element announces a change on its own, whatever case it spells. */
function isLiveRegion(element: Parsed): boolean {
  const roles = (attributeOf(element, 'role') ?? '').toLowerCase().split(/\s+/u)
  if (roles.some((role) => LIVE_ROLES.has(role))) return true
  return (attributeOf(element, LIVE_ATTRIBUTE) ?? '')
    .toLowerCase()
    .split(/\s+/u)
    .some((value) => LIVE_VALUES.has(value))
}

/** Whether one element carries the shell attribute. */
export function isShell(element: Parsed): boolean {
  return attributeOf(element, SHELL) !== undefined
}

/** Whether one element carries the title class among its tokens. */
function isTitledHeading(element: Parsed): boolean {
  return classesOf(element).includes(TITLE)
}

/**
 * Every refusal one product shell carries.
 *
 * The chrome's own landmarks are read here rather than in each caller, so the
 * built document and the painted chrome are held to one set of rules and
 * neither can be the weaker reading. References are read by the caller, over
 * the scope it read, because an id inside the chrome may be stated by the
 * document around it.
 * @param shell - the element carrying the shell attribute.
 * @returns one refusal per defect.
 */
export function chromeOffences(shell: Parsed): PaintOffence[] {
  const chrome = [shell, ...elementsOf(shell)]
  const refused: PaintOffence[] = []
  const main = chrome.find((element) => tagOf(element) === 'main')
  if (main === undefined) {
    refused.push(refusedAt(shell, 'the shell carries no main landmark, so the chrome has no reading region'))
  }
  if (!chrome.some((element) => tagOf(element) === 'nav' && (attributeOf(element, 'aria-label') ?? '').trim() !== '')) {
    refused.push(refusedAt(shell, 'the shell carries no nav landmark named for a reader'))
  }
  if (!chrome.some((element) => isLiveRegion(element))) {
    refused.push(refusedAt(shell, 'the shell carries no live region, so a change it announces reaches no reader'))
  }
  if (!chrome.some((element) => attributeOf(element, 'aria-controls') !== undefined)) {
    refused.push(refusedAt(shell, 'the shell carries no control that names the region it opens'))
  }
  const titled = chrome.find((element) => isTitledHeading(element))
  if (titled === undefined || textOf(titled) === '') {
    refused.push(refusedAt(shell, 'the shell carries no titled heading, so the first paint names no page'))
  }
  const headings = chrome.filter((element) => tagOf(element) === 'h1')
  if (headings.length !== 1) {
    refused.push(refusedAt(shell, `the shell carries ${String(headings.length)} h1 headings; a page carries one`))
  }
  const named = main === undefined ? [] : elementsOf(main).filter((element) => tagOf(element) === 'h1')
  if (headings.length === 1 && main !== undefined && named.length === 0) {
    refused.push(
      refusedAt(
        headings[0] ?? shell,
        'the shell carries its one h1 outside its reading region, so the page names itself outside main',
      ),
    )
  }
  return refused
}

/**
 * Every refusal the painted chrome carries.
 *
 * The chrome is held to the markup gate's own rules as well, so a first paint
 * with an inline style, a handler, a script body or a retired element is
 * refused here rather than in a browser nobody runs at build time.
 * @param markup - the chrome the page painter seats in `#root`.
 * @returns one refusal per defect, empty when the chrome conforms.
 */
export function paintOffences(markup: string): PaintOffence[] {
  const refused: PaintOffence[] = markupOffences(markup)
  const parsed = parse(markup, { sourceCodeLocationInfo: true })
  const elements = elementsOf(parsed)
  const shells = elements.filter((element) => isShell(element))
  if (shells.length !== 1) {
    refused.push(
      refusedAt(parsed, `the chrome carries ${String(shells.length)} product shells; a document carries one`),
    )
  }
  const shell = shells[0]
  return [...refused, ...(shell === undefined ? [] : chromeOffences(shell)), ...referenceOffences(elements)]
}

/**
 * Refuse a page that is not the product shell this paint must seat.
 * @param painted - the chrome as HTML.
 * @returns the markup, once it is the shell.
 */
export function assertPaintedShell(painted: string): string {
  const refused = paintOffences(painted)
  if (refused.length > 0) {
    throw new Error(`deeptail: first paint lost the product shell: ${refusalText(refused)}`)
  }
  return painted
}
