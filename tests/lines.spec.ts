/**
 * The shared line reader, which every gate's offence is located by.
 *
 * Both readers had written their own binary search over their own list of
 * newline offsets. Its boundary — an offset that falls exactly on a line break
 * — is the one place the two spellings could have disagreed, and neither could
 * reach it through the gates that used them: an offence is reported at a
 * declaration or a selector, never at the newline before one.
 */

import { describe, expect, it } from 'bun:test'
import { lineReader } from '../scripts/lines.ts'

describe('the line reader', () => {
  it('reads the first line for every offset before the first break', () => {
    const at = lineReader('abc\ndef')
    expect([0, 1, 2].map((offset) => at(offset))).toEqual([1, 1, 1])
  })

  it('reads a break itself as the end of the line it closes', () => {
    // The boundary: offset 3 is the newline. It closes line one; it does not
    // open line two.
    const at = lineReader('abc\ndef')
    expect(at(3)).toBe(1)
    expect(at(4)).toBe(2)
  })

  it('counts every line of a longer file, including empty ones', () => {
    const at = lineReader('a\n\nb\n\nc')
    expect([0, 1, 2, 3, 4, 5, 6].map((offset) => at(offset))).toEqual([1, 1, 2, 3, 3, 4, 5])
  })

  it('reads the last line for an offset past the end', () => {
    expect(lineReader('a\nb')(99)).toBe(2)
  })

  it('reads the first line where there is no break at all, or no text', () => {
    expect(lineReader('abc')(2)).toBe(1)
    expect(lineReader('')(0)).toBe(1)
  })

  it('reads the first line for an offset before the file, which no reader should hand it', () => {
    expect(lineReader('a\nb')(-1)).toBe(1)
  })
})
