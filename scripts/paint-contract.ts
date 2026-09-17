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
 * of them. Both are driven case by case in `paint-page.spec.ts`, and
 * `paint-gate.ts` runs `documentOffences` over the built file on disk, so the
 * document that ships is the document that was read.
 *
 * @module
 */

import { type DefaultTreeAdapterTypes, parse } from 'parse5'
import { markupOffences } from './markup-gate.ts'

/** The built page this product ships, repository-relative. */
export const BUILT_PAGE = 'apps/deeptail/dist/index.html'

/** The attribute that names the one product shell a document carries. */
const SHELL = 'data-deeptail-shell'

/** The id the one mount a page carries is written under. */
const MOUNT = 'root'

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

/** One refusal, with the line of the document it sits on. */
export interface PaintOffence {
  /** One-based line number. */
  readonly line: number
  /** What is wrong, and what to do instead. */
  readonly why: string
}

/** One parsed node, as parse5's own tree builder writes it. */
type Parsed = DefaultTreeAdapterTypes.Node

/** The attributes one node carries, in the order written. */
function attrsOf(node: Parsed): readonly { readonly name: string; readonly value: string }[] {
  return 'attrs' in node ? node.attrs.map((attr) => ({ name: attr.name, value: attr.value })) : []
}

/** The children one node carries, in document order. */
function childrenOf(node: Parsed): readonly Parsed[] {
  return 'childNodes' in node ? node.childNodes : []
}

/** The lowercased tag name of one node, when it is an element. */
function tagOf(node: Parsed): string | undefined {
  return 'tagName' in node ? node.tagName : undefined
}

/**
 * The line one node opens on.
 *
 * The parser is asked for source locations, so a refusal names the line a
 * reader has to open rather than the top of the file. A node built without one
 * — an implied element, the document itself — is reported at the first line.
 * @param node - the node to read.
 * @returns the one-based line number.
 */
function lineOf(node: Parsed): number {
  return node.sourceCodeLocation?.startLine ?? 1
}

/** The value one node states under one attribute, lowercased. */
function attributeOf(node: Parsed, name: string): string | undefined {
  return attrsOf(node).find((attr) => attr.name === name)?.value
}

/**
 * The class tokens one element carries.
 *
 * Read as a token list, the way a browser reads one: an element carrying the
 * title class beside another class is still the titled heading, and a reader
 * that compared the whole attribute would refuse a heading that merely carries
 * one class more.
 * @param node - the element to read.
 * @returns its tokens, blanks left out.
 */
function classesOf(node: Parsed): readonly string[] {
  return (attributeOf(node, 'class') ?? '').split(/\s+/u).filter((token) => token !== '')
}

/** Every element below one node, the node itself excluded. */
function elementsOf(node: Parsed): Parsed[] {
  const found: Parsed[] = []
  for (const child of childrenOf(node)) {
    if (tagOf(child) !== undefined) found.push(child)
    for (const below of elementsOf(child)) found.push(below)
  }
  return found
}

/** The text one element carries, however deeply it nests it, whitespace collapsed. */
function textOf(node: Parsed): string {
  const here = 'value' in node ? node.value : ''
  return `${here}${childrenOf(node)
    .map((child) => textOf(child))
    .join('')}`
    .replaceAll(/\s+/gu, ' ')
    .trim()
}

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
function isShell(element: Parsed): boolean {
  return attributeOf(element, SHELL) !== undefined
}

/** Whether one element carries the title class among its tokens. */
function isTitledHeading(element: Parsed): boolean {
  return classesOf(element).includes(TITLE)
}

/** One refusal, pinned to the node it is about. */
function refusedAt(node: Parsed, why: string): PaintOffence {
  return { line: lineOf(node), why }
}

/**
 * What a scope carrying an id twice, or a reference to an id it never states,
 * is refused for.
 *
 * Read over every element of the scope the caller hands in, so a reference
 * beside the chrome is held to the same rule as one inside it.
 * @param elements - every element of the scope, in document order.
 * @returns one refusal per defect.
 */
function referenceOffences(elements: readonly Parsed[]): PaintOffence[] {
  const refused: PaintOffence[] = []
  const stated = new Set<string>()
  for (const element of elements) {
    const id = attributeOf(element, 'id')
    if (id === undefined || id === '') continue
    if (stated.has(id)) {
      refused.push(refusedAt(element, `an id is stated twice, so a reference to it reaches neither: ${id}`))
      continue
    }
    stated.add(id)
  }
  for (const element of elements) {
    for (const attribute of attrsOf(element).filter((attr) => ID_REFERENCES.has(attr.name))) {
      for (const id of attribute.value.split(/\s+/u).filter((word) => word !== '')) {
        if (!stated.has(id)) {
          refused.push(refusedAt(element, `${attribute.name} points at ${id}, which is no id on the page`))
        }
      }
    }
  }
  return refused
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
function chromeOffences(shell: Parsed): PaintOffence[] {
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
 * Every refusal the built page carries, the chrome included.
 * @param html - the built document, as it sits on disk.
 * @returns one refusal per defect, empty when the document conforms.
 */
export function documentOffences(html: string): PaintOffence[] {
  const refused: PaintOffence[] = markupOffences(html)
  const parsed = parse(html, { sourceCodeLocationInfo: true })
  const elements = elementsOf(parsed)
  const root = elements.find((element) => tagOf(element) === 'html')
  if (root === undefined || (attributeOf(root, 'lang') ?? '') === '') {
    refused.push(refusedAt(root ?? parsed, 'the document states no language, so a reader is given no pronunciation'))
  }
  const titles = elements.filter((element) => tagOf(element) === 'title')
  if (titles.length !== 1 || textOf(titles[0] ?? parsed) === '') {
    refused.push(
      refusedAt(
        titles[0] ?? root ?? parsed,
        `the document carries ${String(titles.length)} non-empty titles; a document carries one`,
      ),
    )
  }
  const viewport = elements.filter(
    (element) => tagOf(element) === 'meta' && attributeOf(element, 'name') === 'viewport',
  )
  if (viewport.length !== 1 || !(attributeOf(viewport[0] ?? parsed, 'content') ?? '').includes('width=device-width')) {
    refused.push(
      refusedAt(viewport[0] ?? root ?? parsed, 'the document carries no viewport meta that states width=device-width'),
    )
  }
  const scripts = elements.filter((element) => tagOf(element) === 'script')
  const inline = scripts.filter((script) => textOf(script) !== '' || attributeOf(script, 'src') === undefined)
  if (inline.length > 0) {
    refused.push(
      refusedAt(
        inline[0] ?? parsed,
        `the document carries ${String(inline.length)} scripts that are not one external module entry`,
      ),
    )
  }
  if (scripts.length !== 1) {
    refused.push(
      refusedAt(
        scripts[0] ?? parsed,
        `the document carries ${String(scripts.length)} scripts; a page carries one module entry`,
      ),
    )
  } else if (attributeOf(scripts[0] ?? parsed, 'type') !== 'module') {
    refused.push(
      refusedAt(
        scripts[0] ?? parsed,
        'the document holds one script entry and it is not a module; a page loads its module by type="module"',
      ),
    )
  }
  const mounts = elements.filter((element) => attributeOf(element, 'id') === MOUNT)
  const mounted = mounts[0]
  // What a count of nothing is reported against: the mount is the element the
  // missing landmarks and shells were owed to, so a document whose mount is
  // empty is named where the paint should have landed rather than at its top.
  const anchor = mounted ?? parsed
  if (mounts.length !== 1) {
    refused.push(refusedAt(anchor, `the document carries ${String(mounts.length)} mounts; a page carries one`))
  }
  const mains = elements.filter((element) => tagOf(element) === 'main')
  if (mains.length !== 1) {
    refused.push(
      refusedAt(mains[0] ?? anchor, `the document carries ${String(mains.length)} main landmarks; a page carries one`),
    )
  }
  const shells = elements.filter((element) => isShell(element))
  if (shells.length !== 1) {
    refused.push(
      refusedAt(
        shells[0] ?? anchor,
        `the document carries ${String(shells.length)} product shells; a document carries one`,
      ),
    )
  }
  const shell = shells[0]
  const seated = mounted === undefined ? [] : elementsOf(mounted)
  if (mounts.length === 1 && shell !== undefined && !seated.includes(shell)) {
    refused.push(
      refusedAt(shell, 'the product shell sits outside the mount, so the client adopts nothing where it looks'),
    )
  } else if (!seated.some((element) => isShell(element))) {
    refused.push(
      refusedAt(mounted ?? parsed, 'the mount carries no product shell, so the shipped page is a client-invented tree'),
    )
  }
  return [...refused, ...(shell === undefined ? [] : chromeOffences(shell)), ...referenceOffences(elements)]
}

/**
 * Every refusal as one line, for a message that names each defect.
 * @param offences - the refusals to render.
 * @returns them joined, empty when there are none.
 */
export function refusalText(offences: readonly PaintOffence[]): string {
  return offences.map((offence) => `line ${String(offence.line)}: ${offence.why}`).join('; ')
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

/**
 * Refuse a document that is not the page this paint owes.
 * @param html - the built document, as it sits on disk.
 * @returns the document, once it conforms.
 */
export function assertPaintedDocument(html: string): string {
  const refused = documentOffences(html)
  if (refused.length > 0) {
    throw new Error(`deeptail: the stamped page is not the product document: ${refusalText(refused)}`)
  }
  return html
}
