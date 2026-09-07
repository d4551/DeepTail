/**
 * The monolith gate: what it counts, and what it refuses.
 *
 * The number this gate reports is the whole of what it says, so the counting
 * is what has to be driven. A reader that counted every line would punish the
 * documentation this repository writes on purpose; one that counted none of a
 * file's comments correctly would let a monolith through inside a block
 * comment that never closes.
 */

import { describe, expect, it } from 'bun:test'
import { codeLines, GATE, MAX_CODE_LINES } from '../scripts/check-size.ts'
import { joined, source } from './fixtures.ts'

/** A file of `count` identical statements, and nothing else. */
function statements(count: number): string {
  return source(...Array.from({ length: count }, (_, index) => `const held${String(index)} = ${String(index)}`))
}

/** What the gate says about one file. */
function reasons(text: string): string[] {
  return GATE.scan('probe.ts', text).map((offence) => offence.why)
}

describe('what counts as a line of code', () => {
  it('counts the statements a reader has to follow', () => {
    expect(codeLines(statements(12))).toBe(12)
  })

  it('counts no blank line, whatever it holds', () => {
    expect(codeLines(source('const a = 1', '', '   ', '\t', 'const b = 2'))).toBe(2)
  })

  it('counts no line that is only a comment, in any dialect this reads', () => {
    const commented = source(
      'const a = 1',
      joined('/', '/ a script comment'),
      joined('/', '* a block comment'),
      ' * its continuation',
      joined(' *', '/'),
      '<!-- a markup comment -->',
      'const b = 2',
    )
    expect(codeLines(commented)).toBe(2)
  })

  it('counts no line of a block comment, however many lines it spans', () => {
    // Blanked rather than dropped, so the comment's lines survive as empty
    // ones and the blank rule removes them. A reader that deleted the span
    // would join the code either side of it onto one line and undercount.
    const spanning = source('const a = 1', joined('/', '*'), 'const inside = 1', 'const also = 2', joined('*', '/'))
    expect(codeLines(spanning)).toBe(1)
  })

  it('counts a comment that opens after code, because the code is still there', () => {
    expect(codeLines(source(joined('const a = 1 /', '* trailing *', '/')))).toBe(1)
  })
})

describe('the monolith gate', () => {
  it('admits a file at the ceiling, so the ceiling is a size a file may be', () => {
    expect(reasons(statements(MAX_CODE_LINES))).toEqual([])
  })

  it('refuses the first line past it, naming the count and the ceiling', () => {
    expect(reasons(statements(MAX_CODE_LINES + 1))).toEqual([
      `${String(MAX_CODE_LINES + 1)} lines of code, past the ${String(MAX_CODE_LINES)} a file may carry; split it along a seam it already has`,
    ])
  })

  it('admits a heavily documented file that is small, so prose costs nothing', () => {
    // The incentive this rule must not create: a budget documentation is paid
    // for out of. Ten statements under a thousand lines of explanation is a
    // file a reader can hold, and the gate has to agree.
    const documented = source(...Array.from({ length: 1000 }, () => joined('/', '/ an explanation')), statements(10))
    expect(reasons(documented)).toEqual([])
  })

  it('reads the kinds no linter here holds, and no kind one already does', () => {
    // TypeScript is left out on purpose: oxlint's `max-lines` counts every
    // line of a module and this counts a subset of them, so a second rule over
    // the same files could never fire — a clean line printed over nothing.
    expect([...GATE.extensions].toSorted()).toEqual(['.css', '.html', '.rs'])
  })

  it('reports the file rather than a line inside it, because the file is the offence', () => {
    expect(GATE.scan('probe.rs', statements(MAX_CODE_LINES + 1)).map((offence) => offence.line)).toEqual([1])
  })
})
