/**
 * What the page shows has to be something the shipped sheets named: the classes
 * it carries and the motion it spends. What each check reports for markup built
 * right here, and what it leaves.
 *
 * happy-dom computes no animation of its own, so the durations a case reads are
 * declared in the stylesheet the document carries; the browser suites remain
 * the account of what a real engine animates. The page's own motion budget is
 * read from the live document, so a case that declares one declares it in the
 * document the check reads.
 *
 * @module
 */

import { beforeEach, expect, it } from 'bun:test'
import type { StructureFinding } from '../apps/deeptail/tests/structure-report.ts'
import {
  checkClassVocabulary,
  checkReducedMotion,
  durationsInSeconds,
} from '../apps/deeptail/tests/structure-vocabulary.ts'
import { resetDocument } from './dom.ts'
import { collector, surface } from './structure-double.ts'

/** The surface these checks read. */
const SCOPE = '[data-structure-scope]'

/** The classes the shipped sheets define, as a case hands them in. */
const VOCABULARY = ['session-row', 'picker-field']

/**
 * The declarations the motion cases read, as one stylesheet the document
 * carries: each surface's motion is a declaration like any other.
 */
const DECLARATIONS = [
  '.motion-over { transition-duration: 0.3s; }',
  '.motion-at { transition-duration: 0s; }',
  '.motion-slow { transition-duration: 0.9s; }',
  '.motion-delayed { transition-delay: 0.4s; }',
  '.motion-spinning { animation-name: spin; animation-duration: 2s; }',
].join('\n')

/** Reads the page as one who asked for less motion. */
function askForLessMotion(): void {
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({ matches: query.includes('reduce'), media: query }),
    configurable: true,
  })
}

/**
 * The findings one motion pass reports over one surface, read as a reader who
 * has or has not asked for less motion, with the preference put back after.
 * @param asked - whether the reader asked for less motion.
 * @param classNames - the fixture classes the elements render at.
 * @returns the findings the check reported.
 */
function motionFindings(asked: boolean, ...classNames: readonly string[]): StructureFinding[] {
  const original = window.matchMedia
  if (asked) askForLessMotion()
  const root = surface('div')
  root.append(
    ...classNames.map((name) => {
      const node = document.createElement('div')
      node.className = name
      return node
    }),
  )
  document.body.append(root)
  const { findings, add } = collector()
  checkReducedMotion(add, { scope: SCOPE })
  Object.defineProperty(window, 'matchMedia', { value: original, configurable: true })
  return findings
}

beforeEach(() => {
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
})

it('reports every class no shipped sheet defines, and stays silent for the vocabulary', () => {
  const root = surface('div')
  root.className = 'session-row one-off'
  const child = document.createElement('button')
  child.className = 'picker-field'
  root.append(child)
  const loose = document.createElement('div')
  loose.className = 'not-this-products-name'
  document.body.append(root, loose)
  const { findings, add } = collector()
  checkClassVocabulary(add, { scope: SCOPE, vocabulary: VOCABULARY })
  expect(findings).toEqual([
    {
      rule: 'unknown-class',
      detail: 'div.session-row.one-off carries class "one-off", which no shipped sheet defines',
    },
  ])
})

it('reads every duration a declaration holds, and none from a value that holds no length', () => {
  expect(durationsInSeconds('0.3s')).toEqual([0.3])
  expect(durationsInSeconds('200ms')).toEqual([0.2])
  expect(durationsInSeconds('0s')).toEqual([0])
  // A surface can carry several at once, and one long duration must not hide
  // behind a zero beside it.
  expect(durationsInSeconds('0.4s, 200ms, inherit')).toEqual([0.4, 0.2])
  expect(durationsInSeconds('')).toEqual([])
  expect(durationsInSeconds('1')).toEqual([])
})

it('reports motion over the page budget under reduce, and stays silent at or under it', () => {
  expect(motionFindings(true, 'motion-over', 'motion-at')).toEqual([
    {
      rule: 'motion-not-reduced',
      detail:
        "div.motion-over runs a transition of 0.3s while the reader asked for less motion, where the page's own budget is 0s",
    },
  ])
})

it('measures a transition against the budget the page itself declares', () => {
  const budget = document.createElement('style')
  budget.textContent = ':root { --ds-transition-duration: 0.5s; }'
  document.head.append(budget)
  expect(motionFindings(true, 'motion-over', 'motion-slow')).toEqual([
    {
      rule: 'motion-not-reduced',
      detail:
        "div.motion-slow runs a transition of 0.9s while the reader asked for less motion, where the page's own budget is 0.5s",
    },
  ])
})

it('reports a delay a surface has not given up, and an animation it still runs', () => {
  expect(motionFindings(true, 'motion-delayed', 'motion-spinning')).toEqual([
    {
      rule: 'motion-not-reduced',
      detail:
        "div.motion-delayed runs a transition delay of 0.4s while the reader asked for less motion, where the page's own budget is 0s",
    },
    {
      rule: 'motion-not-reduced',
      detail:
        "div.motion-spinning runs a animation of 2s while the reader asked for less motion, where the page's own budget is 0s",
    },
  ])
})

it('stays silent for a reader who never asked for less motion', () => {
  expect(motionFindings(false, 'motion-over', 'motion-slow', 'motion-delayed', 'motion-spinning')).toEqual([])
})
