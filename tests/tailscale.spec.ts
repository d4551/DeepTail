/**
 * The pairing link a tailnet machine is reached through.
 *
 * Listing a tailnet is not pairing: Tailscale says which machines exist, and
 * only `dsh web` mints the launch token a host accepts. The link is where the
 * two meet, so what it does with an opaque token — and with an origin that is
 * not a URL at all — is what decides whether a chosen machine can be paired.
 */

import { describe, expect, it } from 'bun:test'
import { tailnetPairingLink } from '../apps/deeptail/src/tailscale.ts'

describe('the pairing link for a tailnet machine', () => {
  it('carries the launch token as the origin’s query', () => {
    expect(tailnetPairingLink('https://box.tailnet.ts.net:7777/', 'abc123')).toBe(
      'https://box.tailnet.ts.net:7777/?token=abc123',
    )
  })

  it('encodes a token whose characters a query string reserves', () => {
    // A launch token is opaque. Concatenated, a `&` or a `#` in one would end
    // the parameter early and pair against a token the host never printed.
    expect(tailnetPairingLink('https://box.ts.net/', 'a&b=c#d e+f/g')).toBe(
      'https://box.ts.net/?token=a%26b%3Dc%23d+e%2Bf%2Fg',
    )
  })

  it('replaces a query the origin already carries rather than adding to it', () => {
    expect(tailnetPairingLink('https://box.ts.net/?token=stale&other=1', 'fresh')).toBe(
      'https://box.ts.net/?token=fresh',
    )
  })

  it('keeps a path the origin carries', () => {
    expect(tailnetPairingLink('https://box.ts.net/harness', 'abc')).toBe('https://box.ts.net/harness?token=abc')
  })

  it('carries the token into an origin the URL parser accepts, whatever shape it is', () => {
    // `box.ts.net:7777` parses: the parser reads the machine name as a scheme
    // and the port as a path. The native side normalizes an origin before it
    // ever reaches here, and this says what happens to one that is not.
    expect(tailnetPairingLink('box.ts.net:7777', 'abc')).toBe('box.ts.net:7777?token=abc')
  })

  it('hands back an origin the URL parser refuses unchanged, for the caller to refuse', () => {
    // The caller has its own refusal path and its own copy for it. Building a
    // link out of something that is not an origin would hide that behind a
    // parse failure nobody wrote a sentence for.
    for (const origin of ['not a url', '', '://box', 'https://', '///']) {
      expect(tailnetPairingLink(origin, 'abc')).toBe(origin)
    }
  })
})
