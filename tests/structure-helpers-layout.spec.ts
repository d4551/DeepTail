/**
 * The box the content sits in: text a box loses, and layout drawn by a grid or
 * a table the sheets do not own.
 *
 * happy-dom paints no box and measures no overflow, so the widths and heights a
 * case reads are painted onto the element instance the check reads — the
 * browser suites remain the account of what a real engine measures. What the
 * check decides from those numbers is driven here, where the mutation runs can
 * judge it.
 */

import { beforeEach, expect, it } from 'bun:test'
import { checkClipping, checkGrid, gridAncestor } from '../apps/deeptail/tests/structure-layout.ts'
import { resetDocument } from './dom.ts'
import { collector, paintHeights, paintWidths, surface } from './structure-double.ts'

/**
 * The declarations these checks read, as one stylesheet the document carries.
 */
const DECLARATIONS = [
  '.scroll-hidden { overflow-y: hidden; }',
  '.overflow-visible { overflow: visible; }',
  '.ellipsis { text-overflow: ellipsis; }',
  '.one-line { white-space: nowrap; }',
  '.visually-hidden { clip: rect(0px, 0px, 0px, 0px); }',
  '.grid-root { display: grid; }',
  '.grid-inline { display: inline-grid; }',
  '.table-rows { display: table; }',
  '.off-page { display: none; }',
].join('\n')

/** The surface the grid and table cases read. */
const SCOPE = '[data-structure-scope]'

beforeEach(() => {
  resetDocument()
  const sheet = document.createElement('style')
  sheet.textContent = DECLARATIONS
  document.head.append(sheet)
})

it('reads text that fits its box as not clipped', () => {
  const label = document.createElement('span')
  label.textContent = 'Pair host'
  document.body.append(label)
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([])
})

it('reports text that overruns its box sideways without a scroll or an ellipsis', () => {
  const overrun = document.createElement('span')
  overrun.className = 'overflow-visible'
  overrun.textContent = 'Pair host'
  document.body.append(overrun)
  paintWidths(overrun, { scroll: 120, client: 80 })
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([
    { rule: 'clipped-content', detail: 'span.overflow-visible overflows its box without a scroll or ellipsis' },
  ])
})

it('reads one pixel of overrun, and an ellipsis, as no clipped content', () => {
  const boundary = document.createElement('span')
  boundary.textContent = 'Pair host'
  const truncated = document.createElement('span')
  truncated.className = 'overflow-visible ellipsis'
  truncated.textContent = 'Pair host'
  const scrolled = document.createElement('span')
  scrolled.className = 'scroll-hidden'
  scrolled.textContent = 'Pair host'
  document.body.append(boundary, truncated, scrolled)
  paintWidths(boundary, { scroll: 81, client: 80 })
  paintWidths(truncated, { scroll: 120, client: 80 })
  paintWidths(scrolled, { scroll: 120, client: 80 })
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([])
})

it('reports text the box it sits in cuts off on the block axis', () => {
  const tall = document.createElement('span')
  tall.className = 'scroll-hidden'
  tall.textContent = 'Pair host'
  document.body.append(tall)
  paintHeights(tall, { scroll: 120, client: 80 })
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([
    {
      rule: 'clipped-content',
      detail: 'span.scroll-hidden is cut off by the box it sits in, on the block axis',
    },
  ])
})

it('reads a single truncated line as told, and one pixel of block overrun as nothing', () => {
  const oneLine = document.createElement('span')
  oneLine.className = 'scroll-hidden one-line ellipsis'
  oneLine.textContent = 'Pair host'
  const boundary = document.createElement('span')
  boundary.className = 'scroll-hidden'
  boundary.textContent = 'Pair host'
  document.body.append(oneLine, boundary)
  paintHeights(oneLine, { scroll: 120, client: 80 })
  paintHeights(boundary, { scroll: 81, client: 80 })
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([])
})

it('reads a box its own clip hides as the hiding it is, not as content lost', () => {
  // The visually-hidden contract: the text stays in the accessibility tree and
  // off the canvas, so the block overrun is the mechanism rather than a loss.
  const hidden = document.createElement('span')
  hidden.className = 'visually-hidden'
  hidden.textContent = 'Pair host'
  document.body.append(hidden)
  paintHeights(hidden, { scroll: 120, client: 80 })
  paintWidths(hidden, { scroll: 120, client: 80 })
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([])
})

it('reads only the element that carries the text, rather than the box holding it', () => {
  const holder = document.createElement('div')
  holder.className = 'scroll-hidden'
  const text = document.createElement('span')
  text.textContent = 'Pair host'
  holder.append(text)
  document.body.append(holder)
  paintHeights(holder, { scroll: 120, client: 80 })
  const { findings, add } = collector()
  checkClipping(add)
  expect(findings).toEqual([])
})

it('names the nearest grid ancestor, and nothing when no ancestor is a grid', () => {
  const root = surface('div')
  root.className = 'grid-root'
  const inner = document.createElement('div')
  root.append(inner)
  document.body.append(root)
  expect(gridAncestor(inner)).toBe(root)
  const flat = document.createElement('div')
  document.body.append(flat)
  expect(gridAncestor(flat)).toBeUndefined()
  expect(gridAncestor(document.createElement('div'))).toBeUndefined()
})

it('reports a grid nested in a grid, a table used as a grid, and a headerless layout table', () => {
  const root = surface('div')
  root.className = 'grid-root'
  const inner = document.createElement('div')
  inner.className = 'grid-inline'
  const tableStyled = document.createElement('div')
  tableStyled.className = 'table-rows'
  const layout = document.createElement('table')
  const headed = document.createElement('table')
  headed.append(document.createElement('th'))
  root.append(inner, tableStyled, layout, headed)
  document.body.append(root)
  const { findings, add } = collector()
  checkGrid(add, { scope: SCOPE })
  expect(findings).toEqual([
    { rule: 'nested-grid', detail: 'div.grid-inline is a grid inside div.grid-root, which is also a grid' },
    { rule: 'hardcoded-grid', detail: 'div.table-rows uses display:table as a layout grid' },
    { rule: 'layout-table', detail: 'table is a table with no header, used as a layout grid' },
  ])
})

it('reads a grid that stands on its own, and a table that names its own headers', () => {
  const standalone = surface('div')
  const grid = document.createElement('div')
  grid.className = 'grid-root'
  const headed = document.createElement('table')
  headed.className = 'table-rows'
  headed.append(document.createElement('th'))
  const scoped = document.createElement('table')
  const cell = document.createElement('td')
  cell.setAttribute('scope', 'col')
  scoped.append(cell)
  standalone.append(grid, headed, scoped)
  const loose = document.createElement('table')
  document.body.append(standalone, loose)
  const { findings, add } = collector()
  checkGrid(add, { scope: SCOPE })
  expect(findings).toEqual([])
})
