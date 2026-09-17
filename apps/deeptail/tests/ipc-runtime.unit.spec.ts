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
 * typecheck. The name says `unit` rather than `browser` because the whole of it
 * runs in this process, with no bundle and no engine, and the name is what tells
 * the two apart in a directory that holds both.
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
  muxChannel,
  callbackRegistrations as registered,
  resetTransportDouble,
} from '../../../tests/transport-double.ts'

/** The host every case opens its socket against. */
const HOST = 'dev-1'

/** What `carrier_open_mux` is handed for a socket: the channel, as the boundary sees it. */
interface SocketHandle {
  readonly id: number | string
}

/**
 * A frame the scripted mux would deliver, with every field the wire model carries.
 * @param data - the frame's payload.
 * @returns the frame.
 */
function frameOf(data: string): WireFrame {
  return { type: 'message', data, message: null, code: null, reason: null }
}

/**
 * Open one host's mux over a socket, the way the carrier does.
 * @param socket - the channel the page built.
 * @param host - the host to open against.
 * @returns what Rust recorded for the call.
 */
async function openMux(socket: SocketHandle, host = HOST): Promise<void> {
  await installedRuntime().invoke('carrier_open_mux', { host, channel: socket })
}

/**
 * Build a socket that collects the payloads it receives.
 * @returns the socket and the list its subscriber fills.
 */
function collectingSocket(): { readonly socket: Channel<WireFrame>; readonly arrived: string[] } {
  const arrived: string[] = []
  const socket = new Channel<WireFrame>((frame) => arrived.push(frame.data ?? ''))
  return { socket, arrived }
}

/** A collecting socket that is open, and the channel the double holds for it. */
interface OpenSocket {
  readonly arrived: string[]
  readonly opened: ReturnType<typeof muxChannel>
}

/**
 * Open a collecting socket on one host, the way a case that drives frames wants.
 *
 * The frames go through the channel the double holds rather than the socket the
 * case built, because that is the value Rust addresses: a case that drove its
 * own copy would be reading a wire the backend never reaches.
 * @param host - the host to open against.
 * @returns the socket's subscriber list and the channel the wire delivers to.
 */
async function openCollectingSocket(host = HOST): Promise<OpenSocket> {
  const { socket, arrived } = collectingSocket()
  await openMux(socket, host)
  return { arrived, opened: muxChannel() }
}

/** The socket the carries a first host is opened with, and the one its second uses. */
const FIRST_HOST = HOST
const SECOND_HOST = 'lab-2'

/**
 * Build a socket whose subscriber this case never reads.
 *
 * The handover is what a case about identity is about, so nothing here collects
 * anything: the frames a socket can receive are driven through the double.
 * @returns the channel.
 */
function quietSocket(): Channel<WireFrame> {
  return new Channel<WireFrame>(() => null)
}

/**
 * Open a socket on each of the two hosts a case can address.
 *
 * Two hosts rather than one because one socket cannot be two: what a case about
 * identifiers needs is two registrations, and each needs its own channel.
 * @returns nothing; the double holds both channels.
 */
async function openTwoHosts(): Promise<undefined> {
  await openMux(quietSocket(), FIRST_HOST)
  await openMux(quietSocket(), SECOND_HOST)
  return undefined
}

beforeEach(() => {
  resetDocument()
  resetTransportDouble()
})

describe('a channel over the installed runtime', () => {
  it('is registered by identity, and the identifier is what the call is recorded under', async () => {
    // The callback is a no-op: this case is about the handover, and the frames it
    // never receives are what a later case delivers.
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
    await openMux(socket)
    expect(channels.map((one) => one.id)).toEqual([handed])
    expect(invocations[0]?.channel).toBe(handed)
    expect(invocations[0]?.host).toBe(HOST)
  })
})

describe('the frames a delivered socket receives', () => {
  it('reaches the subscriber that built it, inside the envelope the library unwraps', async () => {
    const collected = await openCollectingSocket()
    // An envelope the library could not read would leave this list empty, which
    // is what says the double delivered the frame rather than only recording it.
    collected.opened.receive(frameOf('roster'))
    expect(collected.arrived).toEqual(['roster'])
  })

  it('holds back a frame that arrives out of order, then releases it in the wire order', async () => {
    // The library holds a frame back until the envelope's index is the one it
    // expects, so the numbering is what makes delivery ordered rather than
    // merely happening to be. A double that handed each frame over bare, or
    // numbered them all the same, would deliver the second frame first here.
    const { arrived, opened } = await openCollectingSocket()
    opened.deliver(0, frameOf('first'))
    expect(arrived).toEqual(['first'])
    // Sent second, numbered third: the library cannot deliver it yet.
    opened.deliver(2, frameOf('third'))
    expect(arrived).toEqual(['first'])
    // The frame that carries the index after the first releases both, in order.
    opened.deliver(1, frameOf('second'))
    expect(arrived).toEqual(['first', 'second', 'third'])
  })

  it('delivers a repeated frame again, because the envelope is what numbers it', async () => {
    // The numbering is what the library reads, not the frame's own contents: a
    // redelivery is a delivery, and the double says so by numbering it rather
    // than by holding it back. Nothing may infer the index from the frame.
    const again = await openCollectingSocket()
    again.opened.receive(frameOf('roster'))
    again.opened.receive(frameOf('roster'))
    expect(again.arrived).toEqual(['roster', 'roster'])
  })
})

describe('a command the script does not carry', () => {
  it('is refused rather than answered with nothing', async () => {
    await expect(installedRuntime().invoke('carrier_teleport', {})).rejects.toThrow('no carrier is scripted for')
  })
})

describe('the registrations the runtime holds', () => {
  it('holds one per socket, so two hosts are two identifiers', async () => {
    await openTwoHosts()
    expect(channels.length).toBe(2)
    expect(new Set(channels.map((one) => one.id)).size).toBe(2)
  })

  it('records each call under the identifier the runtime minted for it', async () => {
    await openTwoHosts()
    expect(invocations.map((one) => one.channel)).toEqual(channels.map((one) => one.id))
  })
})
