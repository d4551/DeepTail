/**
 * The sheets this product opens, and the dismissals each one is driven through.
 *
 * The dialog contract suite reads both tables in every case it runs, so they
 * live here rather than inside the suite that drives them: a table restated per
 * case is a table that can disagree with itself.
 *
 * @module
 */

import type { Page } from 'playwright'
import { ACTIONS } from '../src/actions/registry.ts'
import { dataSelector } from '../src/markers.ts'

/** The dialog root the shared frame portals to `document.body`. */
export const DIALOG = dataSelector('dialog')

/** The sheets the product opens, and how a case reaches each one. */
export const SHEETS: readonly (readonly [string, (page: Page) => Promise<void>])[] = [
  ['new session', (page) => page.locator(dataSelector('action', ACTIONS['session.spawn'].marker)).click()],
  [
    'compose',
    async (page) => {
      const row = page.locator(`${dataSelector('host', 'dev-1')}${dataSelector('session', 's-running')}`)
      await row.waitFor({ state: 'visible' })
      // The row's actions ride behind a hover on a fine pointer.
      await row.hover()
      await row.locator(dataSelector('action', ACTIONS['session.message'].marker)).click()
    },
  ],
]

/**
 * Each dismissal a case drives, and the control focus lands on. The compose
 * sheet is closed by the mask alone: its trigger is a row action revealed by a
 * hover, so the pointer is over the mask when it closes and the frame hands
 * focus to the row's own control.
 */
export const DISMISSALS: readonly (readonly [string, 'Escape' | 'mask', string])[] = [
  ['compose', 'mask', ACTIONS['session.open'].marker],
  ['new session', 'Escape', ACTIONS['session.spawn'].marker],
  ['new session', 'mask', ACTIONS['session.spawn'].marker],
]
