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
import { type StructureFinding, structureCheckSource } from './structure.ts'

/** The widths the shell is designed against, narrowest first. */
export const VIEWPORTS = [
  { label: 'small phone', width: 320, height: 720 },
  { label: 'phone', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'laptop', width: 1280, height: 800 },
  { label: 'desktop', width: 1920, height: 1080 },
]

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
 * @param page - the page to inspect.
 * @param coarsePointer - whether the platform touch minimum applies.
 * @returns one line per finding.
 */
export async function defects(page: Page, coarsePointer = false): Promise<string> {
  const found = await page.evaluate<StructureFinding[]>(structureCheckSource(coarsePointer))
  return found.map((finding) => `${finding.rule}: ${finding.detail}`).join('\n')
}
