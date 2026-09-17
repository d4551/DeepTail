/**
 * A carrier socket's registration, over the runtime this process installed.
 *
 * The transport suites open sockets and drive their frames, and the double they
 * drive against is only a stand-in if a socket crossing it behaves the way
 * Tauri's own does. The weak point has been the registration: `carrier_open_mux`
 * is handed the channel object, and what the wire carries is the identifier the
 * runtime minted for it — not the object, and not the callback the runtime was
 * handed. A double that got that wrong delivered nothing, and every socket case
 * failed for a reason that read like a product bug.
 *
 * So the socket the product's own carrier builds is driven from here, and the
 * class behind it — the real `Channel` from the app's install of the Tauri core
 * module — from `apps/deeptail/tests/ipc-runtime.spec.ts`, which is the tree
 * that resolves the app's dependencies. The same registration on a live page is
 * held in `apps/deeptail/tests/ipc-runtime.browser.spec.ts`, and the product's
 * boundary in `ipc-reach.spec.ts`.
 *
 * @module
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { SOCKET_CONNECTING, SOCKET_OPEN } from '../apps/deeptail/src/socket-state.ts'
import type { MuxSocketLike } from '../apps/deeptail/src/transport.ts'
import { resetDocument } from './dom.ts'
import { installedRuntime } from './tauri-runtime.ts'
import { channels, invocations, muxChannel, resetTransportDouble, tick, transport } from './transport-double.ts'

/**
 * A socket the product's own carrier opened, and the identifier it crossed on.
 *
 * The carrier is the consumer: `createCarrier(host).openMuxSocket()` builds the
 * channel, hands it to `carrier_open_mux`, and keeps it. Driving that rather
 * than constructing a channel here means the value on the wire is the one the
 * product puts there.
 * @param host - the host the socket is opened against.
 * @param at - which registration to read, counting from nought, for a case that
 * opens more than one. Each socket is read at its own place in the order the
 * calls landed, which is what makes two identifiers comparable.
 * @returns the socket, and the identifier the call recorded.
 */
function openedSocket(host: string, at = 0): { readonly socket: MuxSocketLike; readonly id: string } {
  const socket = transport.createCarrier(host).openMuxSocket()
  const opened = channels[at]
  if (opened === undefined) throw new Error(`deeptail: opening the socket for ${host} registered nothing`)
  return { socket, id: opened.id }
}

beforeEach(() => {
  resetDocument()
  resetTransportDouble()
})

describe('the registration a carrier socket makes', () => {
  it('hands the command an identifier, and that identifier is what the call recorded', () => {
    const { socket, id } = openedSocket('dev-1')
    // A double that answered the callback itself instead of an identifier would
    // put a function under this name, which no wire carries.
    expect(id).not.toBe('')
    expect(invocations[0]?.command).toBe('carrier_open_mux')
    expect(invocations[0]?.channel).toBe(id)
    expect(invocations[0]?.host).toBe('dev-1')
    // Nothing has opened the stream yet: what says so is the socket's own state,
    // which is the state the harness client would read.
    expect(socket.readyState).toBe(SOCKET_CONNECTING)
  })

  it('reaches the socket that opened it when a frame is delivered', async () => {
    const { socket } = openedSocket('dev-1')
    const seen: string[] = []
    socket.addEventListener('message', (event) => {
      if (event instanceof MessageEvent && typeof event.data === 'string') seen.push(event.data)
    })
    // A frame crosses inside the numbered envelope the library unwraps, which is
    // what says the double delivered it rather than recording it: an envelope
    // the library could not read would leave the socket silent.
    muxChannel().receive({ type: 'open', data: null, message: null, code: null, reason: null })
    await tick()
    expect(socket.readyState).toBe(SOCKET_OPEN)
    muxChannel().receive({ type: 'message', data: 'roster', message: null, code: null, reason: null })
    expect(seen).toEqual(['roster'])
  })

  it('refuses a command the script does not carry, rather than answering nothing', async () => {
    await expect(installedRuntime().invoke('carrier_teleport', {})).rejects.toThrow('no carrier is scripted for')
  })
})

describe('what the carrier registers, per socket', () => {
  it('holds one registration per socket, which is what a product opening two hosts makes', () => {
    // Read one at a time, at the place in the order each call landed: asking the
    // double for "the socket" twice would compare the first one with itself.
    const first = openedSocket('dev-1')
    const second = openedSocket('lab-2', 1)
    expect(first.id).not.toBe(second.id)
    expect(channels.length).toBe(2)
    expect(new Set(channels.map((one) => one.id)).size).toBe(2)
  })

  it('registers a socket for a host that never answers, which is what an unreachable stream costs', () => {
    // The carrier opens the socket whether or not the host has a mux, because it
    // cannot know until it asks. The registration lands either way, so an
    // identifier is not a sign that the stream came up.
    const { socket, id } = openedSocket('a-host-that-never-answers')
    expect(id).not.toBe('')
    expect(channels.length).toBe(1)
    expect(socket.readyState).toBe(SOCKET_CONNECTING)
  })
})
