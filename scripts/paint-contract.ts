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
 * Two halves, and they are the two a build can check. `paintOffences` reads the
 * chrome the factories paint; `documentOffences` reads the built page, the
 * chrome included. Both are driven case by case in `paint-page.spec.ts`, which
 * plants each defect and reads the shipped page as it ships.
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

/** The attribute values read as one id reference each. */
const ID_REFERENCES = new Set(['aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-owns'])

/** The live-region attribute, whose value may be a space-separated list. */
const LIVE_VALUES = new Set(['polite', 'assertive'])

/** The name the shell's own heading carries, which the contract reads. */
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
  return childrenOf(node).flatMap((child) => {
    const here = tagOf(child) === undefined ? [] : [child]
    return [...here, ...elementsOf(child)]
  })
}

/**
 * The text one element carries, however deeply it nests it.
 * @param node - the element to read.
 * @returns its text, whitespace-collapsed.
 */
function textOf(node: Parsed): string {
  const here = 'value' in node ? node.value : ''
  return `${here}${childrenOf(node).map(textOf).join('')}`.replaceAll(/\s+/gu, ' ').trim()
}

/**
 * Every id one element carries, once.
 * @param elements - the elements to read.
 * @returns the ids, in document order.
 */
function idsOf(elements: readonly Parsed[]): string[] {
  return elements.flatMap((element) => {
    const id = attributeOf(element, 'id')
    return id === undefined || id === '' ? [] : [id]
  })
}

/**
 * Every id an element's attributes reference, with the attribute that names it.
 * @param elements - the elements to read.
 * @returns one entry per reference.
 */
function referencesOf(elements: readonly Parsed[]): { readonly from: string; readonly to: string }[] {
  return elements.flatMap((element) =>
    attrsOf(element)
      .filter((attr) => ID_REFERENCES.has(attr.name))
      .flatMap((attr) => attr.value.split(/\s+/u).filter((id) => id !== '').map((id) => ({ from: attr.name, to: id }))),
  )
}

/**
 * Whether one element announces a change on its own.
 * @param element - the element to read.
 * @returns true when it carries a live role or a live-region value.
 */
function isLiveRegion(element: Parsed): boolean {
  const role = attributeOf(element, 'role') ?? ''
  if (LIVE_ROLES.has(role)) return true
  const live = attributeOf(element, LIVE_ATTRIBUTE) ?? ''
  return live.split(/\s+/u).some((value) => LIVE_VALUES.has(value))
}

/**
 * The refusals one element list carries between them: the shell's own shape,
 * the ids it states, and the references those ids must answer.
 * @param elements - every element of the page, in document order.
 * @param shell - whether the list is the shell's own chrome.
 * @returns one line per refusal.
 */
function sharedOffences(elements: readonly Parsed[], shell: boolean): string[] {
  const refused: string[] = []
  const ids = idsOf(elements)
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) refused.push(`an id is stated twice, so a reference to it reaches neither: ${id}`)
    seen.add(id)
  }
  for (const reference of referencesOf(elements)) {
    if (!seen.has(reference.to)) {
      refused.push(`${reference.from} points at ${reference.to}, which is no id on the page`)
    }
  }
  if (!shell) return refused
  const headings = elements.filter((element) => tagOf(element) === 'h1')
  if (headings.length !== 1) refused.push(`the shell carries ${String(headings.length)} h1 headings; a page carries one`)
  return refused
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
  const elements = elementsOf(parsed)
  const shells = elements.filter((element) => attributeOf(element, SHELL) !== undefined)
  if (shells.length !== 1) {
    refused.push(`the chrome carries ${String(shells.length)} product shells; a document carries one`)
    return refused
  }
  const shell = shells[0]
  if (shell === undefined) return refused
  const chrome = [shell, ...elementsOf(shell)]
  if (!chrome.some((element) => tagOf(element) === 'main')) {
    refused.push('the shell carries no main landmark, so the chrome has no reading region')
  }
  if (!chrome.some((element) => tagOf(element) === 'nav' && attributeOf(element, 'aria-label') !== undefined)) {
    refused.push('the shell carries no nav landmark named for a reader')
  }
  if (!chrome.some(isLiveRegion)) {
    refused.push('the shell carries no live region, so a change it announces reaches no reader')
  }
  const drawer = chrome.filter((element) => attributeOf(element, 'aria-controls') !== undefined)
  if (drawer.length === 0) {
    refused.push('the shell carries no control that names the region it opens')
  }
  const heading = chrome.find((element) => attributeOf(element, 'class') === TITLE)
  if (heading === undefined || textOf(heading) === '') {
    refused.push('the shell carries no titled heading, so the first paint names no page')
  }
  return [...refused, ...sharedOffences(chrome, true)]
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
  const html_ = elements.find((element) => tagOf(element) === 'html')
  if (html_ === undefined || (attributeOf(html_, 'lang') ?? '') === '') {
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
  const roots = elements.filter((element) => attributeOf(element, 'id') === 'root')
  if (roots.length !== 1) {
    refused.push(`the document carries ${String(roots.length)} mounts; a page carries one`)
  }
  const mains = elements.filter((element) => tagOf(element) === 'main')
  if (mains.length !== 1) refused.push(`the document carries ${String(mains.length)} main landmarks; a page carries one`)
  const shells = elements.filter((element) => attributeOf(element, SHELL) !== undefined)
  const root = roots[0]
  const seated = root === undefined ? [] : elementsOf(root)
  if (shells.length !== 1 || !seated.some((element) => attributeOf(element, SHELL) !== undefined)) {
    refused.push('the mount carries no product shell, so the shipped page is a client-invented tree')
  }
  const chrome = shells[0]
  if (chrome !== undefined) {
    refused.push(...sharedOffences([chrome, ...elementsOf(chrome)], true))
  }
  return refused
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
