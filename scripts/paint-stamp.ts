/**
 * Stamp a built page on disk with the control-plane chrome.
 *
 * The painter's markup half lives in `paint-index.ts`; this is the half that
 * reads a built page and writes it back stamped, which is why the filesystem
 * module is here and only here.
 *
 * @module
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import { paintIndex } from './paint-index.ts'
import { ROOT } from './source-tree.ts'

/** The built page this paint stamps. */
export const DIST_PAGE = `${ROOT}apps/deeptail/dist/index.html`

/**
 * Stamp one built page on disk with the product shell.
 * @param page - the HTML file to paint.
 */
export function paintFile(page: string): void {
  if (!GlobalRegistrator.isRegistered) GlobalRegistrator.register()
  writeFileSync(page, paintIndex(readFileSync(page, 'utf8')))
}

if (import.meta.main) paintFile(DIST_PAGE)
