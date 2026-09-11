/**
 * The reader that refuses a set of parts with one missing.
 *
 * Two gates read three things out of something that may carry fewer: a pattern
 * whose groups are optional to the compiler, and a table row that may be
 * shorter than the columns being read. Written at each site, that was a
 * fallback value per part — code no input reaches, once per part, twice over.
 * Here it is one rule, and every way it can refuse is driven.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { allThree } from '../scripts/captures.ts'

describe('the three parts a reader needs', () => {
  it('hands back all three when all three are there', () => {
    expect(allThree(['one', 'two', 'three'])).toEqual(['one', 'two', 'three'])
  })

  it('hands them back in the order it was given them', () => {
    // A reader that sorted, reversed or re-ordered them would put a version
    // where a name belongs and compare the two.
    expect(allThree(['c', 'b', 'a'])).toEqual(['c', 'b', 'a'])
  })

  it('hands back nothing when any one of them is missing', () => {
    // Each in turn: a reader can stop checking at any one of the three and go
    // on answering for the other two.
    expect(allThree([undefined, 'two', 'three'])).toBeUndefined()
    expect(allThree(['one', undefined, 'three'])).toBeUndefined()
    expect(allThree(['one', 'two', undefined])).toBeUndefined()
  })

  it('hands back nothing when none of them is there', () => {
    expect(allThree([undefined, undefined, undefined])).toBeUndefined()
  })

  it('keeps an empty part, which is a part that is there and says nothing', () => {
    // A cell a table left blank is not a cell a row is missing, and a reader
    // that treated the two alike would drop a row it should have judged.
    expect(allThree(['', 'two', 'three'])).toEqual(['', 'two', 'three'])
  })
})
