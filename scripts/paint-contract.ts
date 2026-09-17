/**
 * The contract the shipped first paint is held to.
 *
 * Vite leaves `#root` empty, so the document a reader's engine loads has no
 * content until the module entry runs — the client-invented tree this product
 * refuses. `paint-index.ts` seats the shell in the built page instead, and this
 * module states what that seated page must be: read out of the bytes with the
 * parser a browser uses, so a page whose shell lost a landmark, whose control
 * points at an id that is not there, or that carries a second inline script is
 * refused where it is built rather than in an engine nobody runs at build time.
 *
 * Two entry points and one set of rules behind them. `paintOffences` reads the
 * chrome the factories paint; `documentOffences` reads the built page, the
 * chrome included, through the same chrome rules rather than a second reading
 * of them. Both are driven case by case in `paint-page.spec.ts`, which plants
 * each defect and reads the shipped page as it ships.
 *
 * @module
 */

import { type DefaultTreeAdapterTypes, parse } from 'parse5'
import { markupOffences } from './markup-gate.ts'

/** The attribute that names the one product shell a document carries. */
const SHELL = 'data-deeptail-shell'

/** The roles that announce a change without moving the reader's focus. */
const LIVE_ROLES = new Set(['alert', 'log', 'status'])

/** The live-region attribute itself, for an element that names its own. */
const LIVE_ATTRIBUTE = 'aria-live'

/** The values of that attribute which announce a change. */
const LIVE_VALUES = new Set(['polite', 'assertive'])

/** The attributes read as one id reference each. */
const ID_REFERENCES = new Set(['aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-owns'])

/** The class the shell's own title element carries, which the contract reads. */
const TITLE = 'main-title'

/** One parsed node, as parse5's own tree builder writes it. */
type Parsed = DefaultTreeAdapterTypes.Node

/**
 * The attributes one node carries.
 * @param node - the node to read.
 * @returns its attributes, in the order written.
 */
function attrsOf(node: Parsed): readonly { readonly name: string; readonly value: string }[] {
  return 'attrs' in node ? node.attrs.map((attr) => ({ name: attr.name, value: attr.value })) : []
}

/**
 * The children one node carries.
 * @param node - the node to read.
 * @returns its children, in document order.
 */
function childrenOf(node: Parsed): readonly Parsed[] {
  return 'childNodes' in node ? node.childNodes : []
}

/**
 * The tag name of one node, when it is an element.
 * @param node - the node to read.
 * @returns the lowercased tag name, or undefined.
 */
function tagOf(node: Parsed): string | undefined {
  return 'tagName' in node ? node.tagName : undefined
}

/**
 * The value one node states under one attribute.
 * @param node - the node to read.
 * @param name - the attribute name, lowercased.
 * @returns the value, or undefined when the node does not carry the attribute.
 */
function attributeOf(node: Parsed, name: string): string | undefined {
  return attrsOf(node).find((attr) => attr.name === name)?.value
}

/**
 * Every element below one node, the node itself excluded.
 * @param node - the node to walk.
 * @returns the elements, in document order.
 */
function elementsOf(node: Parsed): Parsed[] {
  const found: Parsed[] = []
  for (const child of childrenOf(node)) {
    if (tagOf(child) !== undefined) found.push(child)
    for (const below of elementsOf(child)) found.push(below)
  }
  return found
}

/**
 * The text one element carries, however deeply it nests it.
 * @param node - the node to read.
 * @returns its text, with whitespace collapsed.
 */
function textOf(node: Parsed): string {
  const here = 'value' in node ? node.value : ''
  return `${here}${childrenOf(node)
    .map((child) => textOf(child))
    .join('')}`
    .replaceAll(/\s+/gu, ' ')
    .trim()
}

/**
 * Every id one element carries.
 * @param elements - the elements to read.
 * @returns the ids, in document order, blanks left out.
 */
function idsOf(elements: readonly Parsed[]): string[] {
  return elements.flatMap((element) => {
    const id = attributeOf(element, 'id')
    return id === undefined || id === '' ? [] : [id]
  })
}

/**
 * Whether one element announces a change on its own.
 * @param element - the element to read.
 * @returns true when it carries a live role or a live-region value.
 */
function isLiveRegion(element: Parsed): boolean {
  if (LIVE_ROLES.has(attributeOf(element, 'role') ?? '')) return true
  return (attributeOf(element, LIVE_ATTRIBUTE) ?? '').split(/\s+/u).some((value) => LIVE_VALUES.has(value))
}

/**
 * What a chrome carrying the same id twice, or a reference to an id it never
 * states, is refused for.
 * @param elements - every element of the chrome, in document order.
 * @returns one line per refusal.
 */
function referenceOffences(elements: readonly Parsed[]): string[] {
  const refused: string[] = []
  const ids = new Set<string>()
  for (const id of idsOf(elements)) {
    if (ids.has(id)) refused.push(`an id is stated twice, so a reference to it reaches neither: ${id}`)
    ids.add(id)
  }
  for (const element of elements) {
    for (const attribute of attrsOf(element).filter((attr) => ID_REFERENCES.has(attr.name))) {
      for (const id of attribute.value.split(/\s+/u).filter((word) => word !== '')) {
        if (!ids.has(id)) refused.push(`${attribute.name} points at ${id}, which is no id on the page`)
      }
    }
  }
  return refused
}

/**
 * Every refusal one product shell carries.
 *
 * The chrome's own landmarks and references are read here rather than in each
 * caller, so the built document and the painted chrome are held to one set of
 * rules and neither can be the weaker reading.
 * @param shell - the element carrying the shell attribute.
 * @returns one line per refusal.
 */
function chromeOffences(shell: Parsed): string[] {
  const chrome = [shell, ...elementsOf(shell)]
  const refused: string[] = []
  const main = chrome.find((element) => tagOf(element) === 'main')
  if (main === undefined) {
    refused.push('the shell carries no main landmark, so the chrome has no reading region')
  }
  if (!chrome.some((element) => tagOf(element) === 'nav' && attributeOf(element, 'aria-label') !== undefined)) {
    refused.push('the shell carries no nav landmark named for a reader')
  }
  if (!chrome.some((element) => isLiveRegion(element))) {
    refused.push('the shell carries no live region, so a change it announces reaches no reader')
  }
  if (!chrome.some((element) => attributeOf(element, 'aria-controls') !== undefined)) {
    refused.push('the shell carries no control that names the region it opens')
  }
  const heading = chrome.find((element) => attributeOf(element, 'class') === TITLE)
  if (heading === undefined || textOf(heading) === '') {
    refused.push('the shell carries no titled heading, so the first paint names no page')
  }
  const headings = chrome.filter((element) => tagOf(element) === 'h1')
  if (headings.length !== 1) {
    refused.push(`the shell carries ${String(headings.length)} h1 headings; a page carries one`)
  }
  const named = main === undefined ? [] : elementsOf(main).filter((element) => tagOf(element) === 'h1')
  if (headings.length === 1 && main !== undefined && named.length === 0) {
    refused.push('the shell carries its one h1 outside its reading region, so the page names itself outside main')
  }
  return [...refused, ...referenceOffences(chrome)]
}

/**
 * Every refusal the painted chrome carries.
 *
 * The chrome is held to the markup gate's own rules as well, so a first paint
 * with an inline style, a handler, a script body or a retired element is
 * refused here rather than in a browser nobody runs at build time.
 * @param markup - the chrome the page painter seats in `#root`.
 * @returns one line per refusal, empty when the chrome conforms.
 */
export function paintOffences(markup: string): string[] {
  const refused = markupOffences(markup).map((offence) => `line ${String(offence.line)}: ${offence.why}`)
  const parsed = parse(markup)
  const shells = elementsOf(parsed).filter((element) => attributeOf(element, SHELL) !== undefined)
  if (shells.length !== 1) {
    refused.push(`the chrome carries ${String(shells.length)} product shells; a document carries one`)
    return refused
  }
  const shell = shells[0]
  return shell === undefined ? refused : [...refused, ...chromeOffences(shell)]
}

/**
 * Every refusal the built page carries, the chrome included.
 * @param html - the built document, as it sits on disk.
 * @returns one line per refusal, empty when the document conforms.
 */
export function documentOffences(html: string): string[] {
  const refused = markupOffences(html).map((offence) => `line ${String(offence.line)}: ${offence.why}`)
  const parsed = parse(html)
  const elements = elementsOf(parsed)
  const root = elements.find((element) => tagOf(element) === 'html')
  if (root === undefined || (attributeOf(root, 'lang') ?? '') === '') {
    refused.push('the document states no language, so a reader is given no pronunciation')
  }
  const titles = elements.filter((element) => tagOf(element) === 'title')
  if (titles.length !== 1 || textOf(titles[0] ?? parsed) === '') {
    refused.push(`the document carries ${String(titles.length)} non-empty titles; a document carries one`)
  }
  const viewport = elements.filter(
    (element) => tagOf(element) === 'meta' && attributeOf(element, 'name') === 'viewport',
  )
  if (viewport.length !== 1 || !(attributeOf(viewport[0] ?? parsed, 'content') ?? '').includes('width=device-width')) {
    refused.push('the document carries no viewport meta that states width=device-width')
  }
  const scripts = elements.filter((element) => tagOf(element) === 'script')
  const inline = scripts.filter((script) => textOf(script) !== '' || attributeOf(script, 'src') === undefined)
  if (inline.length > 0) {
    refused.push(`the document carries ${String(inline.length)} scripts that are not one external module entry`)
  }
  if (scripts.length !== 1 || attributeOf(scripts[0] ?? parsed, 'type') !== 'module') {
    refused.push(`the document carries ${String(scripts.length)} scripts; a page carries one module entry`)
  }
  const mounts = elements.filter((element) => attributeOf(element, 'id') === 'root')
  if (mounts.length !== 1) refused.push(`the document carries ${String(mounts.length)} mounts; a page carries one`)
  const mains = elements.filter((element) => tagOf(element) === 'main')
  if (mains.length !== 1) {
    refused.push(`the document carries ${String(mains.length)} main landmarks; a page carries one`)
  }
  const shells = elements.filter((element) => attributeOf(element, SHELL) !== undefined)
  if (shells.length !== 1) {
    refused.push(`the document carries ${String(shells.length)} product shells; a document carries one`)
  }
  const seated = mounts[0] === undefined ? [] : elementsOf(mounts[0])
  if (!seated.some((element) => attributeOf(element, SHELL) !== undefined)) {
    refused.push('the mount carries no product shell, so the shipped page is a client-invented tree')
  }
  const shell = shells[0]
  return shell === undefined ? refused : [...refused, ...chromeOffences(shell)]
}

/**
 * Refuse a page that is not the product shell this paint must seat.
 * @param painted - the chrome as HTML.
 * @returns the markup, once it is the shell.
 */
export function assertPaintedShell(painted: string): string {
  const refused = paintOffences(painted)
  if (refused.length > 0) {
    throw new Error(`deeptail: first paint lost the product shell: ${refused.join('; ')}`)
  }
  return painted
}
