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
import { type HostRecord, isHostRecord } from './host.ts'
import { answered, type Invoke, listOf } from './native-call.ts'
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

/**
 * The ports backed by the native commands.
 *
 * The call is a parameter rather than a binding, because the command names and
 * the argument each one carries are this module's whole contract with Rust —
 * and a table wired straight to Tauri can only be read by a page, where no
 * mutant is ever active.
 * @param call - how a command reaches the native side.
 * @param reach - how a host is asked whether it answers.
 * @returns the ports.
 */
export function nativePorts(call: Invoke = invoke, reach: Reach = liveReach): PickerPorts {
  return {
    listHosts: async () => answered('list_hosts', await call('list_hosts'), isHostRecords),
    pairHost: async (link, label) => answered('pair_host', await call('pair_host', { link, label }), isHostRecord),
    hostState: async (host) => {
      // `select_host` reads the registry and the credential store and never
      // leaves the device, so it answers one question: is there a token at all.
      const held = await settled(call('select_host', { host: host.id }))
      if (!held.ok) return 'unauthorized'
      // Whether the host answers is a different question, and the dot claims to
      // report it. Without this read every unreachable host — a sleeping laptop,
      // a dropped network — would be drawn as needing to be re-paired, which
      // spends a working pairing on a host that is simply down.
      const reached = await settled(reach(host))
      if (reached.ok) return 'online'
      return probeState(reached.code)
    },
  }
}

/** Whether a value is a list of paired hosts. */
const isHostRecords = listOf(isHostRecord)

/** How a host is asked whether it answers at all. */
export type Reach = (host: HostRecord) => Promise<unknown>

/**
 * Ask one host for its sessions, which is the smallest read that proves it
 * answers.
 * @param host - the host to reach.
 * @returns whatever the host answered with.
 */
function liveReach(host: HostRecord): Promise<unknown> {
  return createHostApi(createCarrier(host.id)).listSessions()
}

/**
 * What a failed probe says about a host, by the failure code the read settled
 * with.
 *
 * Exported because it is the whole of what the roster's dot claims to report,
 * and a decision only a Tauri command can reach is one no suite can drive.
 * @param code - the code a failed read settled with, when it carried one.
 * @returns the reachability to draw.
 */
export function probeState(code: string | undefined): HostState {
  if (code === UNAUTHORIZED) return 'unauthorized'
  if (code === FORBIDDEN) return 'forbidden'
  return 'offline'
}
