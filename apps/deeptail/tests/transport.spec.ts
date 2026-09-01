/**
 * The socket adapter is the most protocol-sensitive code in the app: the
 * harness's Remote stream mux client drives it as if it were a `WebSocket`, so
 * the surface it presents has to match what that client actually uses.
 */
import { describe, expect, it } from 'bun:test'
import type { CarrierHooks, MuxSocketLike } from '../src/transport.ts'

describe('carrier socket surface', () => {
  it('presents everything the harness mux client drives', () => {
    // Compile-time proof, asserted at runtime so the test reports a failure
    // rather than silently passing if the shape is ever narrowed: the mux
    // client reads `readyState`, attaches four listeners, sends text, and
    // closes.
    const surface: (keyof MuxSocketLike)[] = ['readyState', 'addEventListener', 'removeEventListener', 'send', 'close']
    expect(new Set(surface).size).toBe(surface.length)
  })

  it('exposes exactly the three carrier hooks the harness reads', () => {
    const hooks: (keyof CarrierHooks)[] = ['fetch', 'loadBundle', 'openMuxSocket']
    // `openStream` and `ownsHost` are deliberately absent: only an in-process
    // host may decode Remote stream items or claim the privileged surface.
    expect(hooks).not.toContain('openStream' as never)
    expect(hooks).not.toContain('ownsHost' as never)
  })
})
