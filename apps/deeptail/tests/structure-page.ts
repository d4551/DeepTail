/**
 * What both structure suites need to ask a page what is wrong with it.
 *
 * The checks run inside the page, so the caller has to ship their source and
 * read findings back; keeping that in one place is what stops the two suites
 * from drifting on how a finding is worded or which pointer they measure for.
 *
 * @module
 */

import type { Page } from 'playwright'
import { classTokensOf } from '../../../scripts/sheet-reader.ts'
import { repositoryFiles } from '../../../scripts/source-tree.ts'
import type { StructureFinding } from './structure.ts'
import { structureCheckSource } from './structure-emit.ts'
import { VIEWPORTS } from './viewports.ts'

export { VIEWPORTS }

/** The sheets whose class selectors are the shipped vocabulary. */
const STYLE_DIRECTORY = 'apps/deeptail/src/styles/'

/** The class names read so far, so the sheets are read once per process. */
let vocabulary: readonly string[] | undefined

/**
 * Every class name the shipped stylesheets define.
 *
 * Read from the sheets themselves rather than a list kept beside the tests: a
 * list would drift the first time a class was added without it, and the
 * vocabulary check would then report the product's own classes as strangers.
 * @returns the class names, in sheet order, duplicates removed.
 */
async function shippedVocabulary(): Promise<readonly string[]> {
  if (vocabulary === undefined) {
    const sheets = repositoryFiles(['.css']).filter((file) => file.label.startsWith(STYLE_DIRECTORY))
    const tokens = await Promise.all(sheets.map(async (sheet) => classTokensOf(await Bun.file(sheet.path).text())))
    vocabulary = tokens.flat()
  }
  return vocabulary
}

/**
 * Whether the sidebar is a drawer at this width, as the stylesheet decides it.
 * @param page - the page to read.
 * @returns true while the narrow layout is showing.
 */
export function isDrawerLayout(page: Page): Promise<boolean> {
  // Mirrors shell-frame.ts: the flag rides on #root, set by the shell's own
  // container query, which cannot style its container.
  return page.evaluate(() => {
    const root = document.querySelector('#root')
    return root instanceof HTMLElement && getComputedStyle(root).getPropertyValue('--dsh-drawer').trim() === '1'
  })
}

/**
 * Every structural defect on a page, as a message a reader can act on.
 *
 * The focus rules measure the keyboard reader's page, so the page is put into
 * the keyboard modality first: the engine answers `:focus-visible` by the
 * modality of the last interaction, and a case that reached this page through a
 * pointer press would otherwise leave every control's ring unpainted while the
 * check reads it — reporting the sheet's own ring as one the reader cannot see.
 * The key pressed moves nothing: it marks the modality and nothing else.
 * @param page - the page to inspect.
 * @param coarsePointer - whether the platform touch minimum applies.
 * @returns one line per finding.
 */
export async function defects(page: Page, coarsePointer = false): Promise<string> {
  await page.keyboard.press('Shift')
  const found = await page.evaluate<StructureFinding[]>(
    await structureCheckSource(coarsePointer, await shippedVocabulary()),
  )
  return found.map((finding) => `${finding.rule}: ${finding.detail}`).join('\n')
}
