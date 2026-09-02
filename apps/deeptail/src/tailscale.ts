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

import { invoke } from '@tauri-apps/api/core'

/** How a tailnet is listed: an API key, or an OAuth client that mints tokens. */
export type TailnetCredential =
  | { readonly kind: 'apiKey'; readonly key: string }
  | { readonly kind: 'oauthClient'; readonly clientId: string; readonly clientSecret: string }

/** One machine on the tailnet, reduced to what the picker draws. */
export interface TailnetHost {
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

/** The ports backed by the real Tauri commands. */
export const tauriTailnetPorts: TailnetPorts = {
  connected: () => invoke<boolean>('tailscale_connected'),
  connect: (credential, tailnet) => invoke<TailnetHost[]>('tailscale_connect', { credential, tailnet }),
  devices: (tailnet) => invoke<TailnetHost[]>('tailscale_devices', { tailnet }),
  forget: () => invoke<void>('tailscale_forget'),
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
