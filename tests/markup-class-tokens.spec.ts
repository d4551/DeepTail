/**
 * How one class attribute becomes the tokens the vocabulary rule judges.
 *
 * `markup-vocabulary.spec.ts` states which spelling of a class belongs to a
 * framework this product retired, one token at a time. What it does not state
 * is how an attribute is read into those tokens, and that half is what decides
 * whether the rule fires at all: a class attribute carries a list, and a reader
 * that judged the whole list as one string would read `shell btn-primary` as
 * this product's own vocabulary and report nothing. Every case here is a list
 * with a retired token inside it, and the tokens are assembled from parts so
 * this file does not carry one whole — the same convention `markup-gate.spec.ts`
 * follows for the same reason.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { isRetiredClassToken, retiredClassTokens } from '../scripts/markup-vocabulary.ts'
import { joined } from './fixtures.ts'

/** A retired component class, assembled so no line here carries one whole. */
const RETIRED = joined('btn-', 'primary')

/** A second retired class, from another family altogether. */
const OTHER = joined('divi', 'der')

describe('a class attribute carrying more than one token', () => {
  it('names the retired token, and none of the classes beside it', () => {
    // The product's own vocabulary is what the retired names sit among, and a
    // reader that judged the attribute as one string would report neither.
    expect(retiredClassTokens(`shell ${RETIRED} sidebar`)).toEqual([RETIRED])
    expect(retiredClassTokens(`${RETIRED} shell`)).toEqual([RETIRED])
    expect(retiredClassTokens('shell sidebar')).toEqual([])
  })

  it('names every retired token the attribute carries, in the order written', () => {
    expect(retiredClassTokens(`shell ${RETIRED} ${OTHER}`)).toEqual([RETIRED, OTHER])
  })

  it('reads a list spaced the way markup really writes one', () => {
    // A class list is wrapped and tabbed as often as it is spaced, and a reader
    // that split on a single space would read a whole line as one token.
    expect(retiredClassTokens(`shell\n    ${RETIRED}\t${OTHER}`)).toEqual([RETIRED, OTHER])
  })

  it('reads a list padded at either end, where the padding is not a token', () => {
    // Padding splits into empty fields. An empty field is not a class the page
    // carries, so it is not judged — and one read as a name would be reported
    // as a class nobody wrote.
    expect(retiredClassTokens(` ${RETIRED} `)).toEqual([RETIRED])
    expect(retiredClassTokens(' ')).toEqual([])
    expect(retiredClassTokens('')).toEqual([])
  })
})

describe('one class token on its own', () => {
  it('is judged as the token it is, which is what the list reader is built on', () => {
    expect(isRetiredClassToken(RETIRED)).toBe(true)
    expect(isRetiredClassToken('shell')).toBe(false)
  })

  it('is not a retired token when it is nothing at all', () => {
    // An empty token is what a padded class attribute splits into. Refused
    // here, it is dropped by the list reader; admitted, every padded attribute
    // in the product would report a class that does not exist.
    expect(isRetiredClassToken('')).toBe(false)
  })
})
