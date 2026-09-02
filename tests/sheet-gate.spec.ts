/**
 * The stylesheet gate's own suite, and the invariants it lets the sheets state.
 *
 * Nothing read a `.css` file before this gate: the whole visual layer sat
 * outside every check the repository ran, so a value written out twenty-nine
 * times, a second breakpoint in a second syntax, and a rule set duplicated byte
 * for byte all passed. Every rule below is driven both ways — a declaration
 * that breaks it must be rejected, and one that resembles it must not be.
 */

import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { breakpointsOf, rulesetsOf, STYLE_EXTENSIONS, scanSheet } from '../scripts/sheet-gate.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'

/** This suite's own path, which reads widths rather than restating them. */
const OWNER = 'tests/sheet-gate.spec.ts'

/** The reasons a sheet is rejected for. */
function sheetOffences(text: string, label = 'apps/deeptail/src/styles/shell.css'): string[] {
  return scanSheet(label, text).map((offence) => offence.why)
}

/** Every sheet the repository ships, with its text. */
function sheets(): Promise<{ readonly label: string; readonly text: string }[]> {
  const files = repositoryFiles([...STYLE_EXTENSIONS])
  return Promise.all(files.map(async (file) => ({ label: file.label, text: await readFile(file.path, 'utf8') })))
}

describe('the stylesheet gate rejects', () => {
  it('a spacing length written out rather than read from the scale', () => {
    expect(sheetOffences('.a { padding: 18px; }')).toHaveLength(1)
    expect(sheetOffences('.a { margin-inline-start: 14px; }')).toHaveLength(1)
    expect(sheetOffences('.a { gap: 10px 12px; }')).toHaveLength(1)
  })

  it('a radius, a type size and a line height', () => {
    expect(sheetOffences('.a { border-radius: 22px; }')).toHaveLength(1)
    expect(sheetOffences('.a { font-size: 16px; }')).toHaveLength(1)
    expect(sheetOffences('.a { line-height: 24px; }')).toHaveLength(1)
  })

  it('a length hidden inside a function, which still decides the layout', () => {
    expect(sheetOffences('.a { width: min(420px, 100%); }')).toHaveLength(1)
    expect(sheetOffences('.a { max-height: calc(100vh - 24px); }')).toHaveLength(1)
    expect(sheetOffences('.a { padding: max(16px, env(safe-area-inset-top)); }')).toHaveLength(1)
  })

  it('a stacking order written as a bare number', () => {
    expect(sheetOffences('.a { z-index: 150; }')).toEqual([
      'a stacking order belongs to the z-index scale in tokens.css',
    ])
    expect(sheetOffences('.a { z-index: 1; }')).toHaveLength(1)
    expect(sheetOffences('.a { z-index: -1; }')).toHaveLength(1)
  })

  it('and names every length it found, so one line reports all of them', () => {
    expect(sheetOffences('.a { padding: 18px 22px; }')).toEqual([
      '18px, 22px is written out rather than read from the scale in tokens.css',
    ])
  })
})

describe('the stylesheet gate allows', () => {
  it('a length read from the scale', () => {
    expect(sheetOffences('.a { padding: var(--dsh-space-5); }')).toEqual([])
    expect(sheetOffences('.a { width: min(var(--dsh-card-width), 100%); }')).toEqual([])
    expect(sheetOffences('.a { z-index: var(--dsh-z-menu); }')).toEqual([])
  })

  it('a hairline and a focus ring, which are drawn rather than spaced', () => {
    expect(sheetOffences('.a { padding: 0px; }')).toEqual([])
    expect(sheetOffences('.a { border: 1px solid CanvasText; }')).toEqual([])
    expect(sheetOffences('.a { outline: 2px solid Highlight; outline-offset: -2px; }')).toEqual([])
    expect(sheetOffences('.a { border-inline-start: 3px solid red; }')).toEqual([])
  })

  it('the token sheet itself, which is where a length is written', () => {
    const label = 'apps/deeptail/src/styles/tokens.css'
    expect(scanSheet(label, ':root { --dsh-space-5: 16px; }').map((offence) => offence.why)).toEqual([])
    expect(scanSheet(label, ':root { --dsh-z-menu: 100; }').map((offence) => offence.why)).toEqual([])
  })

  it('a relative or intrinsic length, which no scale can name', () => {
    expect(sheetOffences('.a { width: 100%; }')).toEqual([])
    expect(sheetOffences('.a { max-height: 100vh; }')).toEqual([])
    expect(sheetOffences('.a { inset: 20%; }')).toEqual([])
    expect(sheetOffences('.a { letter-spacing: 0.08em; }')).toEqual([])
  })

  it('a property whose length is not a scale decision', () => {
    expect(sheetOffences('.a { box-shadow: 0 12px 32px 0 rgba(0, 0, 0, 0.08); }')).toEqual([])
    expect(sheetOffences('.a { backdrop-filter: blur(2px); }')).toEqual([])
    expect(sheetOffences('.a { transform: translateY(4px); }')).toEqual([])
  })

  it('prose that names a length, which decides nothing', () => {
    expect(sheetOffences('/* the 38px bar, at a 12px radius */\n.a { height: var(--dsh-control-md); }')).toEqual([])
  })
})

describe('the breakpoint reader', () => {
  it('reads both syntaxes, so a second one cannot hide in the other', () => {
    // Widths this product does not use, so these fixtures can never read as a
    // restatement of a real breakpoint.
    expect(breakpointsOf('@media (width <= 900px) { .a { color: red } }')).toEqual(['900px'])
    expect(breakpointsOf('@media (max-width: 640px) { .a { color: red } }')).toEqual(['640px'])
    expect(breakpointsOf('@media screen and (max-width:1024px){.a{color:red}}')).toEqual(['1024px'])
  })

  it('reads no width out of a query that switches on something else', () => {
    expect(breakpointsOf('@media (prefers-reduced-motion: reduce) { .a { color: red } }')).toEqual([])
    expect(breakpointsOf('@media (forced-colors: active) { .a { color: red } }')).toEqual([])
    expect(breakpointsOf('@media not (hover: hover) { .a { color: red } }')).toEqual([])
    expect(breakpointsOf('@media (min-width: 40rem) { .a { color: red } }')).toEqual([])
  })
})

describe('the ruleset reader', () => {
  it('reads a rule as its selector and its declarations, whitespace and all', () => {
    expect(rulesetsOf('.a,\n.b {\n  color:  red;\n}')).toEqual([{ selector: '.a, .b', body: 'color: red;', line: 1 }])
  })

  it('reads no rule out of a comment, so prose cannot be a duplicate', () => {
    expect(rulesetsOf('/* .a { color: red } */\n.b { color: blue; }')).toEqual([
      { selector: '.b', body: 'color: blue;', line: 2 },
    ])
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

  it('are the only place a layout width is written', async () => {
    // A width in a media query and the same width restated in script are two
    // breakpoints that agree only until one of them is changed. The stylesheet
    // decides and publishes the decision as a custom property the script reads.
    const declaring = new Map((await sheets()).flatMap((s) => breakpointsOf(s.text).map((w) => [w, s.label] as const)))
    // This suite reads every width out of the sheets rather than restating one,
    // so the only widths in its own source are the fixtures above.
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
