/**
 * The guarded path from a model-supplied argument to the session controller.
 *
 * A session id is opaque to the harness, so the only validation a tool boundary
 * can do is shape: a non-empty single-line token. What that shape refuses, and
 * what one admitted prompt carries to the controller, is the whole of this
 * module's contract — a malformed id that reached the controller would arrive
 * as a branded value it trusts.
 */

import { describe, expect, it } from 'bun:test'
import type { SessionPromptRequest } from '@deepseek-ai/dsh-api-session-controller/types'
import { SessionId } from '@deepseek-ai/dsh-session'
import { admitSessionId, sendPrompt } from '../src/session-access.ts'
import type { FleetController, FleetSendResult } from '../src/types.ts'

/** What the double recorded of one prompt admission. */
interface Admitted {
  /** The request the controller was handed. */
  readonly request: SessionPromptRequest
  /** The cancellation the caller attached. */
  readonly signal: AbortSignal
}

/**
 * A controller that answers every prompt admission, recording what it was
 * handed.
 * @param recorded - where the admissions are collected.
 * @returns the controller face the tools read.
 */
function controllerDouble(recorded: Admitted[]): FleetController {
  return {
    list: () => Promise.resolve({ items: [] }),
    follow: () => ({
      [Symbol.asyncIterator]: () => ({ next: () => Promise.resolve({ done: true, value: undefined }) }),
    }),
    create: () => Promise.resolve({ sessionId: SessionId('s-new') }),
    prompt: async (request, signal) => {
      recorded.push({ request, signal })
      return { accepted: true as const }
    },
    cancel: () => ({ accepted: true as const }),
  }
}

describe('admitting a model-supplied session id', () => {
  it('admits a plain token, branded as the controller requires', () => {
    expect(String(admitSessionId('s-1', 'sessions_send'))).toBe('s-1')
  })

  it('admits a token the model padded with surrounding space, trimmed', () => {
    expect(String(admitSessionId('  s-1  ', 'sessions_send'))).toBe('s-1')
  })

  it('refuses an empty id, naming the tool and the argument', () => {
    expect(() => admitSessionId('', 'sessions_send')).toThrow('sessions_send: "" is not a session id')
  })

  it('refuses an id that is nothing but space, after the trim', () => {
    expect(() => admitSessionId('   ', 'sessions_send')).toThrow('is not a session id')
  })

  it('refuses an id carrying an embedded space, which is two tokens', () => {
    expect(() => admitSessionId('s 1', 'sessions_send')).toThrow('"s 1" is not a session id')
  })

  it('refuses an id carrying a line break, which is not one token', () => {
    expect(() => admitSessionId('s-1\ns-2', 'sessions_send')).toThrow('is not a session id')
    expect(() => admitSessionId('s-1\ts-2', 'sessions_send')).toThrow('is not a session id')
  })
})

describe('delivering one prompt to another session', () => {
  it('sends the text as the content list the controller reads, under a fresh correlation', async () => {
    const recorded: Admitted[] = []
    await sendPrompt(
      controllerDouble(recorded),
      { sessionId: admitSessionId('s-1', 'sessions_send'), text: 'hello', mode: 'queue' },
      5000,
    )
    expect(recorded.length).toBe(1)
    const admission = recorded[0]
    expect(String(admission?.request.sessionId)).toBe('s-1')
    expect(admission?.request.mode).toBe('queue')
    expect(admission?.request.content).toEqual([{ type: 'text', text: 'hello' }])
    expect(typeof admission?.request.requestId).toBe('string')
    expect(admission?.signal).toBeInstanceOf(AbortSignal)
  })

  it('answers the correlation, the target and the mode it delivered', async () => {
    const recorded: Admitted[] = []
    const result: FleetSendResult = await sendPrompt(
      controllerDouble(recorded),
      { sessionId: admitSessionId('s-1', 'sessions_send'), text: 'hello', mode: 'steer' },
      5000,
    )
    expect(String(result.sessionId)).toBe('s-1')
    expect(result.mode).toBe('steer')
    expect(result.requestId).toBe(String(recorded[0]?.request.requestId))
  })

  it('attaches the caller’s timeout as the admission’s cancellation', async () => {
    const recorded: Admitted[] = []
    await sendPrompt(
      controllerDouble(recorded),
      { sessionId: admitSessionId('s-1', 'sessions_send'), text: 'hello', mode: 'queue' },
      5000,
    )
    // The signal is the one the controller honours while admitting: a timeout
    // that never reached it would leave the delivery waiting for ever.
    expect(recorded[0]?.signal.aborted).toBe(false)
  })

  it('raises what the controller refused with, rather than settling it', async () => {
    const recorded: Admitted[] = []
    const refusing: FleetController = {
      ...controllerDouble(recorded),
      prompt: () => Promise.reject(new Error('session is cold')),
    }
    const [outcome] = await Promise.allSettled([
      sendPrompt(refusing, { sessionId: admitSessionId('s-1', 'sessions_send'), text: 'hello', mode: 'queue' }, 5000),
    ])
    expect(outcome.status).toBe('rejected')
    expect(outcome.status === 'rejected' ? outcome.reason.message : '').toBe('session is cold')
  })
})
