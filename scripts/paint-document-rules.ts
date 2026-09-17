/**
 * Every rule the built page is held to.
 *
 * What ships is `apps/deeptail/dist/index.html` on disk, and this is the
 * reading of it: the language it states, its one non-empty title, the viewport
 * meta that gives it a width, the one external module entry it loads, the one
 * mount, the one main landmark, the one product shell seated inside that mount,
 * and the ids every reference on the page reaches. The chrome's own landmarks
 * are the shell reading's rules, from `paint-shell-rules.ts`, so the document
 * and the painted fragment are held to one reading of each rule rather than
 * two.
 *
 * @module
 */

import { parse } from 'parse5'
import { markupOffences } from './markup-gate.ts'
import { type PaintOffence, referenceOffences, refusalText, refusedAt } from './paint-contract.ts'
import { chromeOffences, isShell } from './paint-shell-rules.ts'
import { attributeOf, elementsOf, type Parsed, tagOf, textOf } from './paint-tree.ts'

/** The built page this product ships, repository-relative. */
export const BUILT_PAGE = 'apps/deeptail/dist/index.html'

/** The id the one mount a page carries is written under. */
const MOUNT = 'root'

/**
 * What the document states about itself: a language to pronounce it in, one
 * title that is not empty, and a viewport meta that states its width.
 * @param elements - every element of the document, in document order.
 * @param root - the document's own root element, when it has one.
 * @param parsed - the document itself, which a refusal with no line of its own is reported at.
 * @returns one refusal per defect.
 */
function headOffences(elements: readonly Parsed[], root: Parsed | undefined, parsed: Parsed): PaintOffence[] {
  const refused: PaintOffence[] = []
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
  return refused
}

/**
 * What the document loads: one external module entry, and no second script of
 * any kind.
 * @param elements - every element of the document, in document order.
 * @param parsed - the document itself, which a refusal with no line of its own is reported at.
 * @returns one refusal per defect.
 */
function entryOffences(elements: readonly Parsed[], parsed: Parsed): PaintOffence[] {
  const refused: PaintOffence[] = []
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
  return refused
}

/**
 * What the document seats the first paint in: one mount, one main landmark,
 * one product shell, and that shell inside the mount.
 * @param elements - every element of the document, in document order.
 * @param parsed - the document itself, which a refusal with no line of its own is reported at.
 * @param shells - every element carrying the shell attribute, in document order.
 * @returns one refusal per defect.
 */
function mountOffences(elements: readonly Parsed[], parsed: Parsed, shells: readonly Parsed[]): PaintOffence[] {
  const refused: PaintOffence[] = []
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
  return refused
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
  const shells = elements.filter((element) => isShell(element))
  const shell = shells[0]
  return [
    ...refused,
    ...headOffences(elements, root, parsed),
    ...entryOffences(elements, parsed),
    ...mountOffences(elements, parsed, shells),
    ...(shell === undefined ? [] : chromeOffences(shell)),
    ...referenceOffences(elements),
  ]
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
