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
 * Answer the commands that manage the host registry, rather than reach a host.
 *
 * Split from the dispatcher along the seam it already had — these six answer
 * from the table or record what was asked, and none of them talks to a host —
 * and emitted into the page alongside it, because a function the page
 * evaluates must travel with every function it calls.
 * @param script - the answers this page should give.
 * @param cmd - the command name.
 * @param args - the invoke arguments.
 * @param state - this page's IPC state.
 * @returns whatever that command answers with.
 */
export function deeptailRegistry(
  script: AnswerTable,
  cmd: string,
  args: Record<string, object>,
  state: IpcState,
): Promise<object | boolean | null> {
  switch (cmd) {
    case 'select_host':
      return script.selectError === undefined ? Promise.resolve({}) : Promise.reject(new Error(script.selectError))
    case 'capability_grants':
      // Answered from the table rather than computed here: this function is
      // serialised into the page, so anything it reads has to travel with it.
      return Promise.resolve(script.grants ?? { issuer: 'none', context: '', grants: [] })
    case 'boot_injections':
      // The table the case named, not an empty one. While this always answered
      // empty, `applyIndexInjections` walked nothing and the bundle loader was
      // never reached from any fixture at all.
      return script.bootError === undefined
        ? Promise.resolve(script.bootInjections ?? [])
        : Promise.reject(new Error(script.bootError))
    case 'pair_host': {
      // The link itself, not just that pairing was asked for: a case that only
      // sees the command name cannot tell a composed link from any other. The
      // argument is destructured rather than indexed, because the invoke
      // arguments are a map whose contents this command decides.
      const { link } = args
      state.pairedLinks.push(String(link ?? ''))
      return script.pairError === undefined
        ? Promise.resolve(script.paired ?? {})
        : Promise.reject(new Error(script.pairError))
    }
    default:
      // `forget_host` and `carrier_close_mux`: the native side answers both
      // with nothing, and a case reads the command record to see they ran.
      return Promise.resolve(null)
  }
}

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
