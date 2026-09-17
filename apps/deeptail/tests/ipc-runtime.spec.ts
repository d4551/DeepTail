/**
 * A real `Channel`, driven through the runtime this process installed.
 *
 * The transport suites open a socket and drive its frames, and the double they
 * drive it against is only a stand-in if a channel crossing it behaves the way
 * Tauri's own does. That has been the weak point more than once: the value the
 * runtime is handed is the channel object rather than a string, and the payload
 * a registered callback receives is an envelope numbered in delivery order
 * rather than the frame itself. A double that got either wrong delivered
 * nothing, and every socket case failed for a reason that read like a product
 * bug.
 *
 * So the integration is asserted where the library resolves. This file imports
 * the installed `@tauri-apps/api/core` directly rather than the product's own
 * re-export, which is what makes it the library under test: the double is
 * answered by the runtime object this process installs, and the class driving it
 * is the one the shipped bundle carries.
 *
 * It sits in the app tree because that tree is where the package resolves — the
 * repository's root project does not carry it, and a spec there would not
 * typecheck. The directory is the browser suites' directory, so this file's name
 * would be swept into a run that has no page to drive it; `UNIT_SUFFIXES` in
 * `tests/suite-scope.spec.ts` is the list of what keeps that from happening, and
 * the name is on it.
 *
 * The double's own reset behaviour is held separately, in
 * `tests/zz-ipc-probe.spec.ts`; the carrier socket the product builds in
 * `tests/ipc-runtime.spec.ts`; and the same registration on a live page in
 * `ipc-runtime.browser.spec.ts`.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { Channel } from '@tauri-apps/api/core'
import { resetDocument } from '../../../tests/dom.ts'
import { installedRuntime } from '../../../tests/tauri-runtime.ts'
import type { WireFrame } from '../../../tests/tauri-script.ts'
import {
  channels,
  invocations,
  callbackRegistrations as registered,
  resetTransportDouble,
} from '../../../tests/transport-double.ts'

/** The host every case opens its socket against. */
const HOST = 'dev-1'

beforeEach(() => {
  resetDocument()
  resetTransportDouble()
})

describe('a channel over the installed runtime', () => {
  it('is registered by identity, and the identifier is what the call is recorded under', async () => {
    // The callback is a no-op: this case is about the handover, and the frame it
    // never receives is what the next case delivers.
    const socket = new Channel<WireFrame>(() => null)
    // The library types the identifier as a number and the runtime's own
    // `transformCallback` mints a string; the wire carries whichever the backend
    // was handed, so the comparison is made in the form it crosses in. A double
    // that answered the callback itself would put a function under this name,
    // which no wire carries.
    expect(registered()).toBe(1)
    expect(typeof socket.id).toBe('string')
    const handed = String(socket.id)
    expect(handed).not.toBe('')
    await installedRuntime().invoke('carrier_open_mux', { host: HOST, channel: socket })
    expect(channels.map((one) => one.id)).toEqual([handed])
    expect(invocations[0]?.channel).toBe(handed)
    expect(invocations[0]?.host).toBe(HOST)
  })

  it('reaches the subscriber that built it when a frame is delivered', async () => {
    const arrived: WireFrame[] = []
    const socket = new Channel<WireFrame>((frame) => arrived.push(frame))
    await installedRuntime().invoke('carrier_open_mux', { host: HOST, channel: socket })
    const opened = channels[0]
    if (opened === undefined) throw new Error('deeptail: the socket registered no channel')
    // A frame reaches the subscriber inside the numbered envelope the library
    // unwraps, which is what says the double delivered it rather than recording
    // it: an envelope the library could not read would leave this list empty.
    opened.receive({ type: 'message', data: 'roster', message: null, code: null, reason: null })
    expect(arrived.map((frame) => frame.type)).toEqual(['message'])
    expect(arrived[0]?.data).toBe('roster')
    // One delivery is one envelope, and the index is what says so: the second
    // delivery is numbered after the first, so the library hands it on rather
    // than holding it back as a frame it has already taken.
    opened.receive({ type: 'message', data: 'second', message: null, code: null, reason: null })
    expect(arrived.map((frame) => frame.data)).toEqual(['roster', 'second'])
  })
})

describe('the commands the runtime answers', () => {
  it('refuses a command the script does not carry, rather than answering nothing', async () => {
    await expect(installedRuntime().invoke('carrier_teleport', {})).rejects.toThrow('no carrier is scripted for')
  })

  it('holds one registration per socket, so two hosts are two identifiers', async () => {
    const first = new Channel<WireFrame>(() => null)
    const second = new Channel<WireFrame>(() => null)
    await installedRuntime().invoke('carrier_open_mux', { host: HOST, channel: first })
    await installedRuntime().invoke('carrier_open_mux', { host: 'lab-2', channel: second })
    expect(channels.length).toBe(2)
    expect(new Set(channels.map((one) => one.id)).size).toBe(2)
  })
})
