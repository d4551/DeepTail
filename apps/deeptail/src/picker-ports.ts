/**
 * The native surface the picker calls, and what its answers mean.
 *
 * Separated from the picker's own phase machine: this is the only part that
 * talks to the host, and the only part that decides what a failed probe says
 * about a machine.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'
import { createHostApi, FORBIDDEN, RemoteError, UNAUTHORIZED } from './api.ts'
import type { HostRecord } from './host.ts'
import { messageOf } from './reason.ts'
import { createCarrier } from './transport.ts'
import type { HostState } from './ui/states.ts'

/** How the picker reaches the native side; replaced wholesale in tests. */
export interface PickerPorts {
  listHosts(): Promise<readonly HostRecord[]>
  pairHost(link: string, label: string): Promise<HostRecord>
  hostState(host: HostRecord): Promise<HostState>
}

/** Read a promise as data: success keeps its value, failure keeps its message. */
export const settled = async <T>(
  promise: Promise<T>,
): Promise<
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly message: string; readonly code: string | undefined }
> => {
  const [outcome] = await Promise.allSettled([promise])
  return outcome.status === 'fulfilled'
    ? { ok: true, value: outcome.value }
    : {
        ok: false,
        message: messageOf(outcome.reason),
        code: outcome.reason instanceof RemoteError ? outcome.reason.code : undefined,
      }
}

/** The ports backed by the real Tauri commands. */
export const tauriPorts: PickerPorts = {
  listHosts: () => invoke<HostRecord[]>('list_hosts'),
  pairHost: (link, label) => invoke<HostRecord>('pair_host', { link, label }),
  hostState: async (host) => {
    // `select_host` reads the registry and the credential store and never
    // leaves the device, so it answers one question: is there a token at all.
    const held = await settled(invoke('select_host', { host: host.id }))
    if (!held.ok) return 'unauthorized'
    // Whether the host answers is a different question, and the dot claims to
    // report it. Without this read every unreachable host — a sleeping laptop,
    // a dropped network — was drawn as needing to be re-paired, which throws
    // away a working pairing to fix something that is not broken.
    const reached = await settled(createHostApi(createCarrier(host.id)).listSessions())
    if (reached.ok) return 'online'
    return probeState(reached.code)
  },
}

/**
 * What a failed probe says about a host, by the failure code the read settled
 * with.
 * @param code - the code a failed read settled with, when it carried one.
 * @returns the reachability to draw.
 */
function probeState(code: string | undefined): HostState {
  if (code === UNAUTHORIZED) return 'unauthorized'
  if (code === FORBIDDEN) return 'forbidden'
  return 'offline'
}
