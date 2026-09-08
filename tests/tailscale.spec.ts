/**
 * The pairing link a tailnet machine is reached through.
 *
 * Listing a tailnet is not pairing: Tailscale says which machines exist, and
 * only `dsh web` mints the launch token a host accepts. The link is where the
 * two meet, so what it does with an opaque token — and with an origin that is
 * not a URL at all — is what decides whether a chosen machine can be paired.
 */

import { describe, expect, it } from 'bun:test'
import { PROTOCOL, RemoteError } from '../apps/deeptail/src/api.ts'
import type { Invoke } from '../apps/deeptail/src/native-call.ts'
import { nativeTailnetPorts, type TailnetHost, tailnetPairingLink } from '../apps/deeptail/src/tailscale.ts'
import type { JsonValue, WireValue } from '../apps/deeptail/src/wire.ts'

/** One machine, as the native side sends one. */
const MACHINE: TailnetHost = {
  id: 'd1',
  label: 'box',
  origin: 'https://box.ts.net',
  os: 'linux',
  lastSeen: '2026-09-08T10:00:00Z',
  tags: ['tag:server'],
  authorized: true,
  paired: false,
}

/** What one native call was asked. */
interface Asked {
  readonly command: string
  readonly args?: Parameters<Invoke>[1]
}

/**
 * A native call that records what it was asked and answers as told.
 * @param answers - one answer per call, in order.
 * @returns the call and the record of what it was asked.
 */
function recorder(answers: readonly WireValue[]): { call: Invoke; asked: Asked[] } {
  const asked: Asked[] = []
  const queued = [...answers]
  const call: Invoke = (command, args) => {
    asked.push(args === undefined ? { command } : { command, args })
    return Promise.resolve(queued.shift())
  }
  return { call, asked }
}

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

describe('the commands the tailnet is reached through', () => {
  it('asks whether a credential is stored, and reads the answer as one', async () => {
    const { call, asked } = recorder([true])
    expect(await nativeTailnetPorts(call).connected()).toBe(true)
    expect(asked).toEqual([{ command: 'tailscale_connected' }])
  })

  it('connects with the credential and the tailnet, and reads back the machines', async () => {
    const { call, asked } = recorder([[asSent(MACHINE)]])
    const credential = { kind: 'apiKey', key: 'tskey-abc' } as const
    expect(await nativeTailnetPorts(call).connect(credential, 'example.com')).toEqual([MACHINE])
    expect(asked).toEqual([{ command: 'tailscale_connect', args: { credential, tailnet: 'example.com' } }])
  })

  it('lists with the tailnet it was given, and with none when it was given none', async () => {
    const { call, asked } = recorder([[], []])
    const ports = nativeTailnetPorts(call)
    expect(await ports.devices('example.com')).toEqual([])
    expect(await ports.devices()).toEqual([])
    expect(asked).toEqual([
      { command: 'tailscale_devices', args: { tailnet: 'example.com' } },
      { command: 'tailscale_devices', args: { tailnet: undefined } },
    ])
  })

  it('forgets the credential, and reads an answer that carries nothing as nothing', async () => {
    // A command that returns nothing answers with nothing, and the two ways a
    // boundary spells that are both nothing.
    const { call, asked } = recorder([undefined])
    expect(await nativeTailnetPorts(call).forget()).toBeUndefined()
    expect(asked).toEqual([{ command: 'tailscale_forget' }])
    expect(await nativeTailnetPorts(recorder([null]).call).forget()).toBeNull()
  })

  it('says which command answered wrongly, and what was wrong with it', async () => {
    // A refusal a reader cannot trace to a command is a refusal nobody can act
    // on, and the detail is what the operator is shown.
    const [outcome] = await Promise.allSettled([nativeTailnetPorts(recorder(['yes']).call).connected()])
    const reason = outcome.status === 'rejected' ? outcome.reason : undefined
    expect(reason instanceof RemoteError ? [reason.code, reason.message, reason.details] : reason).toEqual([
      PROTOCOL,
      'tailscale_connected answered outside the protocol',
      { endpoint: 'tailscale_connected', detail: 'the answer is not the shape this command declares' },
    ])
  })
})

/**
 * One machine as the wire carries it: fields by name, values the model admits.
 * @param machine - the machine to send.
 * @returns the same machine on the wire's own model.
 */
function asSent(machine: TailnetHost): { [field: string]: JsonValue } {
  return {
    id: machine.id,
    label: machine.label,
    origin: machine.origin,
    os: machine.os,
    lastSeen: machine.lastSeen,
    tags: [...machine.tags],
    authorized: machine.authorized,
    paired: machine.paired,
  }
}

/**
 * The machine with one of its fields left out.
 * @param field - the field to leave out.
 * @returns the machine, short one field.
 */
function without(field: string): { [name: string]: JsonValue } {
  const held = asSent(MACHINE)
  delete held[field]
  return held
}

/**
 * What the tailnet reader did with one machine the native side sent.
 * @param machine - the machine, as the wire carries it.
 * @returns whether the read settled or was refused.
 */
async function refusedMachine(machine: { [field: string]: JsonValue }): Promise<string> {
  const [settled] = await Promise.allSettled([nativeTailnetPorts(recorder([[machine]]).call).devices()])
  return settled.status
}

describe('an answer the native side should not have sent', () => {
  it('is refused rather than read as the shape the command declares', async () => {
    // The native side is another process. A claim about what it sent is a
    // claim nothing checked, and a machine with no origin would be drawn as
    // one a viewer can choose and then pair against nothing.
    const refused: readonly (readonly [string, WireValue])[] = [
      ['tailscale_connected', 'yes'],
      ['tailscale_connect', asSent(MACHINE)],
      ['tailscale_devices', [{ ...asSent(MACHINE), origin: 7 }]],
      ['tailscale_forget', 'done'],
    ]
    const outcomes = await Promise.all(
      refused.map(async ([command, answer]) => {
        const ports = nativeTailnetPorts(recorder([answer]).call)
        const attempt =
          command === 'tailscale_connected'
            ? ports.connected()
            : command === 'tailscale_connect'
              ? ports.connect({ kind: 'apiKey', key: 'k' })
              : command === 'tailscale_devices'
                ? ports.devices()
                : ports.forget()
        const [settled] = await Promise.allSettled([attempt])
        return settled.status === 'rejected' ? String(settled.reason) : 'accepted'
      }),
    )
    expect(outcomes).toEqual(refused.map(([command]) => `RemoteError: ${command} answered outside the protocol`))
  })

  it('refuses a machine missing any field the picker draws', async () => {
    const fields = ['id', 'label', 'origin', 'os', 'lastSeen', 'tags', 'authorized', 'paired']
    const outcomes = await Promise.all(fields.map(async (field) => await refusedMachine(without(field))))
    expect(outcomes).toEqual(fields.map(() => 'rejected'))
    // One tag that is not a string is enough: a list read as tagged because
    // some of it is would carry a value the picker draws as a tag and cannot.
    expect(await refusedMachine({ ...asSent(MACHINE), tags: [7] })).toBe('rejected')
    expect(await refusedMachine({ ...asSent(MACHINE), tags: ['tag:server', 7] })).toBe('rejected')
    expect(await refusedMachine({ ...asSent(MACHINE), tags: [] })).toBe('fulfilled')
    expect(await refusedMachine(asSent(MACHINE))).toBe('fulfilled')
  })
})
