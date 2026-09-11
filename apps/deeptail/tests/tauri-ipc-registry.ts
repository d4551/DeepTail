/**
 * The scripted registry: what the native side answers about paired hosts and
 * about what the page may spend.
 *
 * Split from `tauri-ipc.ts` when it outgrew the size a file here may reach.
 *
 * @module
 */

import { CAPABILITIES, type CapabilityDescriptor } from '../src/actions/capabilities.ts'
import type { AnswerTable, IpcState } from './tauri-ipc.ts'

/**
 * The grants the native authority would issue, for the hosts this page knows.
 *
 * Computed here, where the registry's capability table exists, and carried into
 * the page as data. The scripted IPC is serialised into the page as source, so
 * a function that reads a module-level table would arrive referencing a name
 * the page does not have — which is exactly what happened: the command threw,
 * the ledger hydrated to empty, and the case that watched for the command
 * being *asked* saw nothing wrong.
 * @param hosts - the hosts this page's registry answers with.
 * @returns the snapshot, in the shape the page's ledger reads.
 */
export function issuedGrants(hosts: readonly string[]): object {
  const declared: CapabilityDescriptor[] = Object.values(CAPABILITIES)
  const grants = declared.flatMap((capability) =>
    (capability.subject === 'host' ? hosts : ['device']).map((subject) => ({
      capability: capability.id,
      subject,
      revision: 1,
      expiresAt: Date.now() + capability.ttlSeconds * 1000,
    })),
  )
  return { issuer: 'native', context: 'scripted-pairing', grants }
}

/**
 * Answer a read of the host registry, failing the reads a case nominates.
 *
 * Serialised into the page alongside the dispatcher, so it reads nothing but
 * its own arguments.
 * @param script - the answers this page should give.
 * @param state - this page's IPC state.
 * @returns the registry, or a rejection.
 */
export function deeptailListHosts(script: AnswerTable, state: IpcState): Promise<object> {
  state.listReads += 1
  const fails =
    script.listError !== undefined && (script.listErrorOn === undefined || script.listErrorOn.includes(state.listReads))
  return fails ? Promise.reject(new Error(script.listError ?? '')) : Promise.resolve(script.hosts ?? [])
}

/**
 * Answer one pairing attempt, recording the link the page asked to spend.
 *
 * The link itself, not just that pairing was asked for: a case that only sees
 * the command name cannot tell a composed link from any other.
 * @param script - the answers this page should give.
 * @param args - the invoke arguments, which carry the link.
 * @param state - this page's IPC state.
 * @returns the host the pairing produced, or the refusal it met.
 */
export function deeptailPairHost(script: AnswerTable, args: Record<string, object>, state: IpcState): Promise<object> {
  state.pairedLinks.push(String(args.link ?? ''))
  return script.pairError === undefined
    ? Promise.resolve(script.paired ?? {})
    : Promise.reject(new Error(script.pairError))
}
