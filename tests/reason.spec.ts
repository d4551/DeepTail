/**
 * How a rejection becomes something an operator can read.
 *
 * Every surface that reports a failure goes through `reason.ts`, so what it
 * decides is what an operator is told. The transport writes its failures in the
 * protocol's own terms — an endpoint, a status — and those reached the operator
 * verbatim before this module existed, so a host returning 500 showed
 * `session/list returned HTTP 500` whatever language the product was in. A
 * failure the host itself raised keeps the host's own message, because that is
 * the only account of what went wrong and this product has no dictionary for it.
 */

import { describe, expect, it } from 'bun:test'
import { FORBIDDEN, PROTOCOL, RemoteError, TRANSPORT, UNAUTHORIZED } from '../apps/deeptail/src/api.ts'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import { describeFailure, messageOf, reportSettled, settle } from '../apps/deeptail/src/reason.ts'

/** The copy source every case reads through. */
const t = createTranslate('en')

/** A rejection that settles on the next turn, as a real one does. */
function rejected<T>(reason: T): Promise<never> {
  return Promise.reject(reason)
}

describe('the raw message of a rejection', () => {
  it('keeps an error’s own message', () => {
    expect(messageOf(new Error('the host gave up'))).toBe('the host gave up')
    expect(messageOf(new RemoteError('session-not-found', 'no such session'))).toBe('no such session')
  })

  it('reads anything else as its text, rather than as nothing', () => {
    // A rejection can carry any value at all, and a reader that answered only
    // for errors would report an empty line for the rest.
    expect(messageOf('a bare string')).toBe('a bare string')
    expect(messageOf(404)).toBe('404')
    expect(messageOf(null)).toBe('null')
    const absent: undefined = undefined
    expect(messageOf(absent)).toBe('undefined')
  })
})

describe('the localized message of a failure', () => {
  it('keeps the host’s own account of a failure the host raised', () => {
    // The host's codes are its own; this product has no dictionary for them,
    // and a sentence invented here would be a sentence nobody wrote.
    const raised = new RemoteError('agent-preset-unknown', 'no preset named fast')
    expect(describeFailure(raised, t)).toBe('no preset named fast')
  })

  it('writes a transport failure in the operator’s language, not the protocol’s', () => {
    const refused = new RemoteError(UNAUTHORIZED, 'session/list returned HTTP 401', {
      endpoint: 'session/list',
      status: 401,
    })
    expect(describeFailure(refused, t)).toBe('session/list returned HTTP 401.')
    const denied = new RemoteError(FORBIDDEN, 'session/list returned HTTP 403', {
      endpoint: 'session/list',
      status: 403,
    })
    expect(describeFailure(denied, t)).toBe('session/list returned HTTP 403.')
  })
})

describe('the localized message of a failure the transport raised', () => {
  it('names the endpoint and the detail for a protocol or transport failure', () => {
    // The detail the transport carried, not the sentence it wrote around it:
    // the two differ here so a reader that reached for the message instead is
    // reporting the protocol's own words at the operator again.
    const malformed = new RemoteError(PROTOCOL, 'session/create returned HTTP 200 with no result', {
      endpoint: 'session/create',
      detail: 'no result',
    })
    expect(describeFailure(malformed, t)).toBe('session/create answered outside the protocol: no result')
    const unreachable = new RemoteError(TRANSPORT, 'fetch to session/list failed', {
      endpoint: 'session/list',
      detail: 'connection refused',
    })
    expect(describeFailure(unreachable, t)).toBe('Could not reach session/list: connection refused')
  })

  it('falls back to the failure’s own message where the details carry no detail', () => {
    // The details are the host's, so a transport failure that carries none
    // still has to say something an operator can act on.
    const bare = new RemoteError(TRANSPORT, 'connection reset')
    expect(describeFailure(bare, t)).toBe('Could not reach : connection reset')
  })

  it('leaves a placeholder empty where the details carry the wrong shape', () => {
    const odd = new RemoteError(UNAUTHORIZED, 'refused', { endpoint: 7, status: 'four hundred' })
    expect(describeFailure(odd, t)).toBe(' returned HTTP .')
  })

  it('reads a rejection that is not an error at all as its text', () => {
    expect(describeFailure('a bare string', t)).toBe('a bare string')
  })

  it('speaks the locale it is handed', () => {
    const refused = new RemoteError(UNAUTHORIZED, 'refused', { endpoint: 'session/list', status: 401 })
    expect(describeFailure(refused, createTranslate('zh'))).toBe('session/list 返回了 HTTP 401。')
  })
})

describe('work nobody awaits', () => {
  it('reports a failure in the operator’s language when it lands', async () => {
    const said: string[] = []
    reportSettled(rejected(new RemoteError(TRANSPORT, 'down', { endpoint: 'session/list', detail: 'down' })), t, (m) =>
      said.push(m),
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(said).toEqual(['Could not reach session/list: down'])
  })

  it('reports nothing when the work lands', async () => {
    const said: string[] = []
    reportSettled(Promise.resolve('done'), t, (m) => said.push(m))
    await Promise.resolve()
    await Promise.resolve()
    expect(said).toEqual([])
  })
})

describe('work a surface waits on', () => {
  it('hands back both arms as one value, so a caller branches rather than catches', async () => {
    expect(await settle(Promise.resolve('done'), t)).toEqual({ ok: true })
    const failed = await settle(
      rejected(new RemoteError(PROTOCOL, 'no result', { endpoint: 'x', detail: 'no result' })),
      t,
    )
    expect(failed).toEqual({ ok: false, message: 'x answered outside the protocol: no result' })
  })
})
