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

  it('places every offset of a four-line file on the line its byte sits in', () => {
    // One expectation per offset, so a search that lands one line early or late
    // anywhere in the file is named, not just at the edges the gates happen to
    // report.
    const at = lineReader('ab\ncd\nef\ngh')
    expect([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((offset) => at(offset))).toEqual([
      1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4,
    ])
  })

  it('reads the line each break opens from the byte after it, not the byte of it', () => {
    // The offsets the reader records are the byte after each break: a start
    // recorded as the break's own byte would pull the line under it up one.
    const at = lineReader('ab\ncd\nef')
    expect(at(2)).toBe(1)
    expect(at(3)).toBe(2)
    expect(at(5)).toBe(2)
    expect(at(6)).toBe(3)
  })

  it('reads the last line for an offset past the end', () => {
    expect(lineReader('a\nb')(99)).toBe(2)
    expect(lineReader('ab\ncd\nef\ngh')(99)).toBe(4)
  })
})

describe('the line reader at the edges', () => {
  it('reads the first line where there is no break at all, or no text', () => {
    expect(lineReader('abc')(2)).toBe(1)
    expect(lineReader('')(0)).toBe(1)
  })

  it('reads the first line for an offset before the file, which no reader should hand it', () => {
    expect(lineReader('a\nb')(-1)).toBe(1)
    expect(lineReader('ab\ncd\nef')(-9)).toBe(1)
  })

  it('reads a file of breaks alone, one line per break', () => {
    const at = lineReader('\n\n\n')
    expect([0, 1, 2, 3].map((offset) => at(offset))).toEqual([1, 2, 3, 4])
  })
})
