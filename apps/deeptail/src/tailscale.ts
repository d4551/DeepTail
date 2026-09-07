/**
 * The tailnet, as the picker sees it.
 *
 * Discovery only. The credential that lists a tailnet never reaches this side
 * of the IPC boundary — Rust holds it with every other secret — so what arrives
 * here is a list of machines and nothing that could be replayed against
 * Tailscale.
 *
 * Listing a tailnet is not pairing. Tailscale can say which machines exist and
 * which are already paired; only `dsh web` can mint the launch token a host
 * accepts, so choosing a machine here opens the pairing form for it rather than
 * pairing it outright.
 *
 * @module
 */

import type { JsonValue } from '@deepseek-ai/dsh-util-values'
import { invoke } from '@tauri-apps/api/core'
import { NATIVE_COMMANDS } from './commands.ts'
import { isWireObject, type WireObject, type WireValue } from './wire.ts'

/** How a tailnet is listed: an API key, or an OAuth client that mints tokens. */
export type TailnetCredential =
  | { readonly kind: 'apiKey'; readonly key: string }
  | { readonly kind: 'oauthClient'; readonly clientId: string; readonly clientSecret: string }

/**
 * One machine on the tailnet, reduced to what the picker draws.
 *
 * A type alias rather than an interface, for the reason `SessionSummary` is
 * one: an alias carries the implicit index signature that lets a machine
 * travel as a wire value, so the reader below answers about it without a
 * narrowing assertion.
 */
export type TailnetHost = {
  /** Tailscale's device id, stable across renames. */
  readonly id: string
  /** The machine name a person recognises. */
  readonly label: string
  /** The origin to pair against, already normalized by the native side. */
  readonly origin: string
  /** Operating system as Tailscale reports it. */
  readonly os: string
  /** RFC 3339 instant the control plane last heard from the machine. */
  readonly lastSeen: string
  /** Tags the tailnet applies to this machine. */
  readonly tags: readonly string[]
  /** False while an admin has yet to approve the machine. */
  readonly authorized: boolean
  /** True when this origin is already a paired host. */
  readonly paired: boolean
}

/** The fields a machine must carry, as the wire object they are read from. */
interface TailnetHostWire extends WireObject {
  readonly id?: JsonValue
  readonly label?: JsonValue
  readonly origin?: JsonValue
  readonly os?: JsonValue
  readonly lastSeen?: JsonValue
  readonly tags?: JsonValue
  readonly authorized?: JsonValue
  readonly paired?: JsonValue
}

/**
 * One machine the native side listed, or nothing when it listed one this
 * picker cannot draw.
 *
 * The shape is built rather than claimed, so the tags a caller holds are the
 * ones this reader checked one at a time. `origin` carries an empty-string
 * refusal for the reason a host record's does: it is what the pairing link is
 * composed against, and an empty one composes against the page itself.
 * @param value - one entry of the machine list.
 * @returns the machine, or undefined when the entry is not one.
 */
function readTailnetHost(value: JsonValue): TailnetHost | undefined {
  if (!isWireObject(value)) return undefined
  const row: TailnetHostWire = value
  const { id, label, origin, os, lastSeen, tags, authorized, paired } = row
  if (typeof id !== 'string' || id.length === 0) return undefined
  if (typeof origin !== 'string' || origin.length === 0) return undefined
  if (typeof label !== 'string' || typeof os !== 'string' || typeof lastSeen !== 'string') return undefined
  if (typeof authorized !== 'boolean' || typeof paired !== 'boolean') return undefined
  if (!Array.isArray(tags) || !tags.every((tag) => typeof tag === 'string')) return undefined
  return { id, label, origin, os, lastSeen, tags: [...tags], authorized, paired }
}

/**
 * The machines the native side listed, or nothing when it listed one this
 * picker cannot draw.
 *
 * The whole list is refused rather than the offending machine dropped: a
 * tailnet silently short one machine is a machine an operator can see in the
 * Tailscale admin and not here, which reads as a machine that is gone.
 * @param value - whatever the native side answered with.
 * @returns the machines, or undefined when the answer is not a list of them.
 */
export function readTailnetHosts<T>(value: T | WireValue): readonly TailnetHost[] | undefined {
  if (!Array.isArray(value)) return undefined
  const machines: TailnetHost[] = []
  for (const entry of value) {
    const machine = readTailnetHost(entry)
    if (machine === undefined) return undefined
    machines.push(machine)
  }
  return machines
}

/** How the picker reaches the tailnet; replaced wholesale in tests. */
export interface TailnetPorts {
  /** Whether a credential is stored, which decides the view to open on. */
  connected(): Promise<boolean>
  /** Prove a credential lists the tailnet, store it, and return the machines. */
  connect(credential: TailnetCredential, tailnet?: string): Promise<readonly TailnetHost[]>
  /** The machines, using the stored credential. */
  devices(tailnet?: string): Promise<readonly TailnetHost[]>
  /** Drop the stored credential. Paired hosts keep working. */
  forget(): Promise<void>
}

/**
 * The machines an answer listed, refusing the answer rather than the machine.
 * @param answer - whatever the native side listed.
 * @returns the machines.
 * @throws Error when the answer is not a list of machines this picker can draw.
 */
function listed(answer: WireValue): readonly TailnetHost[] {
  const machines = readTailnetHosts(answer)
  if (machines === undefined) throw new Error('deeptail: the tailnet listed a machine this picker cannot draw')
  return machines
}

/** The ports backed by the real Tauri commands. */
export const tauriTailnetPorts: TailnetPorts = {
  // `connected` decides which view the picker opens on, so an answer that is
  // not a boolean is read as "no credential stored" rather than as one.
  connected: async () => (await invoke<WireValue>(NATIVE_COMMANDS.tailscaleConnected)) === true,
  connect: async (credential, tailnet) =>
    listed(await invoke<WireValue>(NATIVE_COMMANDS.tailscaleConnect, { credential, tailnet })),
  devices: async (tailnet) => listed(await invoke<WireValue>(NATIVE_COMMANDS.tailscaleDevices, { tailnet })),
  forget: async () => {
    await invoke<WireValue>(NATIVE_COMMANDS.tailscaleForget)
  },
}

/**
 * The pairing link for one tailnet machine's origin and one launch token.
 *
 * The origin already went through the native side's own admission check, so
 * this only adds the token the viewer supplied. The token is placed with
 * `URLSearchParams` rather than by concatenation: a launch token is opaque and
 * may carry characters a query string reserves.
 * @param origin - the chosen machine's origin.
 * @param token - the launch token `dsh web` printed on that machine.
 * @returns the link the pairing command parses, or the origin unchanged when it
 * is not a URL, so the caller's own refusal path reports it.
 */
export function tailnetPairingLink(origin: string, token: string): string {
  if (!URL.canParse(origin)) return origin
  const url = new URL(origin)
  url.search = new URLSearchParams({ token }).toString()
  return url.toString()
}
