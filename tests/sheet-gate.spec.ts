/**
 * The stylesheet gate's invariants about the sheets the product ships, and the
 * breakpoints they switch on.
 *
 * Nothing read a `.css` file before this gate: the whole visual layer sat
 * outside every check the repository ran, so a value written out twenty-nine
 * times, a second breakpoint in a second syntax, and a rule set duplicated byte
 * for byte all passed. The per-rule fixtures — every declaration the gate must
 * reject and every lookalike it must allow — live in `sheet-gate-rules.spec.ts`;
 * this suite reads the real sheets: every length they carry goes through the
 * scale, each width switches layout in exactly one place and is restated
 * nowhere else in the repository, every selector that hides a focus ring paints
 * one back, and no rule set is declared twice.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { unringedSelectors } from '../scripts/focus-ring-gate.ts'
import { breakpointsOf, STYLE_EXTENSIONS, scanSheet } from '../scripts/sheet-gate.ts'
import { rulesetsOf } from '../scripts/sheet-reader.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'
import { joined } from './fixtures.ts'

/** This suite's own path, which reads widths rather than restating them. */
const OWNER = 'tests/sheet-gate.spec.ts'

/** Every sheet the repository ships, with its text. */
function sheets(): Promise<{ readonly label: string; readonly text: string }[]> {
  const files = repositoryFiles([...STYLE_EXTENSIONS])
  return Promise.all(files.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })))
}

describe('the breakpoint reader', () => {
  it('reads both syntaxes, so a second one cannot hide in the other', () => {
    // Widths this product does not use, so these fixtures can never read as a
    // restatement of a real breakpoint.
    expect(breakpointsOf(joined('@med', 'ia (wid', 'th <= 900px) { .a { color: red } }'))).toEqual(['900px'])
    expect(breakpointsOf(joined('@med', 'ia (max-wid', 'th: 640px) { .a { color: red } }'))).toEqual(['640px'])
    expect(breakpointsOf(joined('@med', 'ia screen and (max-wid', 'th:1024px){.a{color:red}}'))).toEqual(['1024px'])
    // The drawer switches on the body container's width, not the viewport's.
    expect(breakpointsOf(joined('@cont', 'ainer (wid', 'th <= 720px) { .a { color: red } }'))).toEqual(['720px'])
  })

  it('reads no width out of a query that switches on something else', () => {
    expect(breakpointsOf('@media (prefers-reduced-motion: reduce) { .a { color: red } }')).toEqual([])
    expect(breakpointsOf('@media (forced-colors: active) { .a { color: red } }')).toEqual([])
    expect(breakpointsOf('@media not (hover: hover) { .a { color: red } }')).toEqual([])
    expect(breakpointsOf(joined('@med', 'ia (min-wid', 'th: 40rem) { .a { color: red } }'))).toEqual([])
  })
})

describe('the sheets the product ships', () => {
  it('write every length through the scale', async () => {
    const offences = (await sheets()).flatMap((sheet) =>
      scanSheet(sheet.label, sheet.text).map((found) => `${found.label}:${String(found.line)}: ${found.why}`),
    )
    expect(offences).toEqual([])
  })

  it('switch layout at each width in exactly one place', async () => {
    // The drawer width was asserted to be written once — by a reader that knew
    // one syntax and one file, while a second breakpoint sat in the other
    // syntax in the other sheet. Every sheet is read now, in both syntaxes.
    const widths = (await sheets()).flatMap((sheet) => breakpointsOf(sheet.text))
    expect(widths.toSorted()).toEqual(['480px', '720px'])
    expect(new Set(widths).size).toBe(widths.length)
  })
})

describe('the layout widths the product ships', () => {
  it('are the only place a layout width is written', async () => {
    // A width in a media query and the same width restated in script are two
    // breakpoints that agree only until one of them is changed. The stylesheet
    // decides and publishes the decision as a custom property the script reads.
    const declaring = new Map((await sheets()).flatMap((s) => breakpointsOf(s.text).map((w) => [w, s.label] as const)))
    // This suite reads every width out of the sheets rather than restating one,
    // so the only widths in its own source are the fixtures above; the rule
    // suite beside it carries no layout width at all.
    const files = repositoryFiles(['.css', '.ts']).filter((file) => file.label !== OWNER)
    const read = await Promise.all(
      files.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })),
    )
    const restated = read.flatMap((file) =>
      [...declaring]
        .filter(([width, sheet]) => file.label !== sheet && file.text.includes(width))
        .map(([width]) => `${width} in ${file.label}`),
    )
    expect(restated).toEqual([])
  })

  it('write a ring back on every selector that hides one', async () => {
    const hidden = (await sheets()).flatMap((sheet) =>
      unringedSelectors(sheet.text).map((selector) => `${sheet.label}: ${selector}`),
    )
    expect(hidden).toEqual([])
  })

  it('declare no rule twice', async () => {
    const seen = new Map<string, string>()
    const repeated: string[] = []
    for (const sheet of await sheets()) {
      for (const rule of rulesetsOf(sheet.text)) {
        const key = `${rule.selector} { ${rule.body} }`
        const first = seen.get(key)
        if (first === undefined) seen.set(key, `${sheet.label}:${String(rule.line)}`)
        else repeated.push(`${key} — ${first} and ${sheet.label}:${String(rule.line)}`)
      }
    }
    expect(repeated).toEqual([])
  })
})
