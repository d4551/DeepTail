/**
 * The carrier's unary answer, read rather than asserted.
 *
 * Every remote call the product makes turns into a `Response` from this shape.
 * While the answer was named by the invoke call's own type argument, a reply
 * short its headers reached `.map` on nothing and a status outside the range
 * `Response` accepts threw from the constructor — both from inside the
 * transport, where they read as a transport fault rather than as the protocol
 * failure they are.
 */

import { describe, expect, it } from 'bun:test'
import { readCarrierResponse } from '../apps/deeptail/src/carrier-reply.ts'

/** A reply carrying everything a `Response` is built from. */
const WHOLE = { status: 200, headers: [['content-type', 'application/json']], body: '{}' }

describe('the carrier answer', () => {
  it('reads a reply carrying a status, headers and a body', () => {
    expect(readCarrierResponse(WHOLE)).toEqual({
      status: 200,
      headers: [['content-type', 'application/json']],
      body: '{}',
    })
  })

  it('reads a reply with no headers at all, which is a bare answer', () => {
    expect(readCarrierResponse({ ...WHOLE, headers: [] })).toEqual({ status: 200, headers: [], body: '{}' })
  })

  it('reads the statuses that carry a refusal, which the surface reports on', () => {
    // A revoked device token arrives as one of these; reading them is how the
    // connection menu learns to say so.
    for (const status of [401, 403, 404, 500, 599]) {
      expect([status, readCarrierResponse({ ...WHOLE, status })?.status]).toEqual([status, status])
    }
  })

  it('refuses a status the Response constructor would throw on', () => {
    // `new Response(body, { status })` refuses anything outside 200–599, and
    // that throw surfaced from inside the transport with no protocol context.
    for (const status of [0, 100, 199, 600, 1000, -1]) {
      expect([status, readCarrierResponse({ ...WHOLE, status })]).toEqual([status, undefined])
    }
  })

  it('refuses a status that is not a whole number', () => {
    expect(readCarrierResponse({ ...WHOLE, status: 200.5 })).toBeUndefined()
    expect(readCarrierResponse({ ...WHOLE, status: '200' })).toBeUndefined()
  })
})

describe('the carrier answer’s parts', () => {
  it('refuses a reply with no headers list, which reached map on nothing', () => {
    expect(readCarrierResponse({ status: 200, body: '{}' })).toBeUndefined()
    expect(readCarrierResponse({ ...WHOLE, headers: 'content-type' })).toBeUndefined()
  })

  it('refuses a header that is not a name and a value', () => {
    expect(readCarrierResponse({ ...WHOLE, headers: [['content-type']] })).toBeUndefined()
    expect(readCarrierResponse({ ...WHOLE, headers: [['a', 'b', 'c']] })).toBeUndefined()
    expect(readCarrierResponse({ ...WHOLE, headers: [['content-type', 7]] })).toBeUndefined()
    expect(readCarrierResponse({ ...WHOLE, headers: ['content-type'] })).toBeUndefined()
  })

  it('refuses a reply with no body, rather than answering an empty one', () => {
    expect(readCarrierResponse({ status: 204, headers: [] })).toBeUndefined()
    expect(readCarrierResponse({ ...WHOLE, body: null })).toBeUndefined()
  })

  it('refuses a value that is not a reply at all', () => {
    expect(readCarrierResponse('200')).toBeUndefined()
    expect(readCarrierResponse(null)).toBeUndefined()
    expect(readCarrierResponse([WHOLE])).toBeUndefined()
  })

  it('answers pairs a Headers can be built from, not the ones it was handed', () => {
    // The shape is built rather than claimed, so what the caller holds is what
    // this reader checked one pair at a time.
    const reply = readCarrierResponse(WHOLE)
    expect(new Headers((reply?.headers ?? []).map(([name, held]) => [name, held])).get('content-type')).toBe(
      'application/json',
    )
  })
})
