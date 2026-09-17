/**
 * Stamp a built page on disk with the control-plane chrome.
 *
 * The painter's markup half lives in `paint-index.ts`; this is the half that
 * reads a built page and writes it back stamped, which is why the filesystem
 * module is here and only here.
 *
 * What ships is the file, not the string the painter assembled, so this stamps
 * the page and then reads the bytes that landed back off disk and holds them to
 * the same contract. A write that was truncated, a page another step rewrote
 * after this one, and a file that is not there at all are all refused here
 * rather than in the engine that loads the page.
 *
 * @module
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { BUILT_PAGE, documentOffences, refusalText } from './paint-contract.ts'
import { paintIndex } from './paint-index.ts'
import { ROOT } from './source-tree.ts'

/** The built page this paint stamps. */
export const DIST_PAGE = `${ROOT}${BUILT_PAGE}`

/**
 * One built page, as the bytes on disk have it.
 *
 * A page that is not there, or that holds nothing, is refused before anything
 * reads it: a painter that treated a missing file as an empty string would
 * stamp whatever it liked and report a clean build.
 * @param page - the HTML file to read.
 * @returns the page's contents.
 */
export function readPage(page: string): string {
  if (!existsSync(page)) throw new Error(`deeptail: there is no built page at ${page}; run the app build first`)
  const html = readFileSync(page, 'utf8')
  if (html.trim() === '') throw new Error(`deeptail: the built page at ${page} is empty`)
  return html
}

/**
 * Stamp one built page on disk with the product shell, and hold the stamped
 * bytes to the contract they were stamped to conform to.
 * @param page - the HTML file to paint.
 */
export function paintFile(page: string): void {
  if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register()
  writeFileSync(page, paintIndex(readPage(page)))
  const landed = documentOffences(readPage(page))
  if (landed.length > 0) {
    throw new Error(`deeptail: the bytes on disk are not the product document: ${refusalText(landed)}`)
  }
}

if (import.meta.main) paintFile(DIST_PAGE)
