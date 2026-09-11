/**
 * The native-call double the suites that drive the picker surface share: it
 * records every command it was asked, and answers as told, one answer per call
 * in order.
 *
 * `picker-ports.spec.ts` and `tailscale.spec.ts` both read what their ports
 * asked the native side through the same shape, so the recorder lives here
 * once and each suite reads as what it asks and what it expects back.
 *
 * @module
 */

import type { Invoke } from '../apps/deeptail/src/native-call.ts'
import type { WireValue } from '../apps/deeptail/src/wire.ts'

/** What one native call was asked. */
export interface Asked {
  readonly command: string
  readonly args?: Parameters<Invoke>[1]
}

/**
 * A native call that records what it was asked and answers as told.
 * @param answers - one answer per call, in order.
 * @returns the call and the record of what it was asked.
 */
export function recorder(answers: readonly WireValue[]): { call: Invoke; asked: Asked[] } {
  const asked: Asked[] = []
  const queued = [...answers]
  const call: Invoke = (command, args) => {
    asked.push(args === undefined ? { command } : { command, args })
    return Promise.resolve(queued.shift())
  }
  return { call, asked }
}
