/**
 * The `__DSH_TRANSPORT__` carrier's unary half, driven through the Tauri IPC.
 *
 * Every hook the carrier hands the harness client ends in one Rust command, so
 * the whole surface is reachable by answering those commands from a double:
 * `@tauri-apps/api/core` is mocked at the module boundary, the double records
 * each invoke and answers it. The assertions read what was sent and what came
 * back — the request the carrier builds, and the response it rebuilds.
 *
 * The suite re-registers the happy-dom window rather than reusing the one
 * `tests/dom.ts` installs, because `loadBundle` runs a fetched bundle as a page
 * script: happy-dom cannot fetch a `blob:` URL, so this suite needs the disabled
 * load reported as the success a browser would report — the load the carrier's
 * contract waits on. The shared registration leaves it reporting a failure.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { GlobalRegistrator } from '@happy-dom/global-registrator'
import {
  answerFetchWith,
  bundleFromSettled,
  countOf,
  invocations,
  refusalOf,
  refuseBundleWith,
  resetTransportDouble,
  transport,
} from './transport-double.ts'

if (GlobalRegistrator.isRegistered) {
  await GlobalRegistrator.unregister()
}
GlobalRegistrator.register({ settings: { handleDisabledFileLoadingAsSuccess: true } })

beforeEach(() => {
  document.body.replaceChildren()
  document.head.replaceChildren()
  resetTransportDouble()
})

describe('the unary send', () => {
  it('maps the init into the request the Rust command reads, naming only path and search', async () => {
    const carrier = transport.createCarrier('host-1')
    await carrier.send(new URL('https://page.example/api/session/list?limit=5'), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'envelope',
    })
    expect(invocations.length).toBe(1)
    const call = invocations[0]
    expect(call?.command).toBe('carrier_fetch')
    expect(call?.host).toBe('host-1')
    expect(call?.request?.path).toBe('/api/session/list?limit=5')
    expect(call?.request?.method).toBe('POST')
    expect(call?.request?.headers).toEqual([['content-type', 'application/json']])
    expect(call?.request?.body).toBe('envelope')
  })

  it('defaults the method to GET and carries a missing or non-string body as null', async () => {
    const carrier = transport.createCarrier('host-1')
    await carrier.send(new URL('https://page.example/api/roster'), {})
    expect(invocations[0]?.request?.method).toBe('GET')
    expect(invocations[0]?.request?.body).toBe(null)
    await carrier.send(new URL('https://page.example/api/roster'), {
      method: 'POST',
      body: new URLSearchParams({ a: '1' }),
    })
    expect(invocations[1]?.request?.body).toBe(null)
  })

  it('rebuilds the response the Rust command answered with', async () => {
    answerFetchWith({ status: 201, headers: [['content-type', 'text/plain']], body: 'made' })
    const carrier = transport.createCarrier('host-1')
    const response = await carrier.send(new URL('https://page.example/api/session/create'), { method: 'POST' })
    expect(response.status).toBe(201)
    expect(response.headers.get('content-type')).toBe('text/plain')
    expect(await response.text()).toBe('made')
  })
})

describe('bundle loading', () => {
  it('fetches a cold bundle through Rust, naming its path and search', async () => {
    const carrier = transport.createCarrier('host-1')
    await carrier.loadBundle('https://host.example/plugins/roster.js?v=2')
    expect(invocations.length).toBe(1)
    expect(invocations[0]?.command).toBe('carrier_load_bundle')
    expect(invocations[0]?.path).toBe('/plugins/roster.js?v=2')
  })

  it('runs a warmed bundle from the map without fetching it again', async () => {
    const carrier = transport.createCarrier('host-1')
    await carrier.warmBundle('https://host.example/plugins/roster.js')
    expect(countOf('carrier_load_bundle')).toBe(1)
    await carrier.loadBundle('https://host.example/plugins/roster.js')
    expect(countOf('carrier_load_bundle')).toBe(1)
    expect(document.head.querySelector('script')).toBe(null)
  })

  it('names the bundle it could not fetch, keeping the refusal as the cause', async () => {
    const refusal = new Error('host unreachable')
    refuseBundleWith(refusal)
    const carrier = transport.createCarrier('host-1')
    await expect(carrier.loadBundle('https://host.example/plugins/gone.js')).rejects.toThrow(
      'deeptail: bundle https://host.example/plugins/gone.js could not be fetched: Error: host unreachable',
    )
    const failure = await refusalOf(carrier.loadBundle('https://host.example/plugins/gone.js'))
    expect(failure?.cause).toBe(refusal)
  })

  it('names a missing settled outcome and a non-error refusal', () => {
    expect(() => bundleFromSettled(undefined, 'https://host.example/plugins/gone.js')).toThrow(
      'deeptail: bundle https://host.example/plugins/gone.js could not be fetched',
    )
    expect(() =>
      bundleFromSettled({ status: 'rejected', reason: 'host unreachable' }, 'https://host.example/plugins/gone.js'),
    ).toThrow('deeptail: bundle https://host.example/plugins/gone.js could not be fetched: host unreachable')
    expect(bundleFromSettled({ status: 'fulfilled', value: 'source' }, 'https://host.example/plugins/ok.js')).toBe(
      'source',
    )
  })
})
