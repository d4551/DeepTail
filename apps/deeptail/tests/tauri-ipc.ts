/**
 * The scripted Tauri IPC the browser suites run against.
 *
 * Playwright serialises `installTauriInternals` and evaluates it in the page
 * before anything else, so it must be self-contained: it may close over nothing
 * but its own argument. Everything the suites can vary lives in the answer
 * table it reads.
 *
 * @module
 */

import type { JsonValue } from '../src/wire.ts'
import type { AnswerTable, IpcState, ScriptChannel } from './tauri-ipc-answers.ts'
import { BOOT_SOURCES, deeptailBootTable, deeptailLoadBundle } from './tauri-ipc-boot.ts'
import { CARRIER_SOURCES, deeptailCarrierFetch, deeptailOpenMux, deeptailSendMux } from './tauri-ipc-carrier.ts'
import {
  deeptailCallbackRegistrations,
  deeptailCommandOutcome,
  deeptailDeliver,
  deeptailIdentifierReport,
  deeptailPageRuntime,
  deeptailRuntimeMembers,
} from './tauri-ipc-probe.ts'
import { deeptailListHosts, deeptailPairHost, issuedGrants } from './tauri-ipc-registry.ts'
import { deeptailTailscale, TAILNET_SOURCES } from './tauri-ipc-tailnet.ts'

export type {
  AnswerTable,
  ForwardedEvent,
  IpcState,
  MuxEventValue,
  RecordedCall,
  ScriptChannel,
  SessionFixture,
} from './tauri-ipc-answers.ts'

/** A JSON value, as the wire carries it: the shape every recorded argument has. */
export type { JsonValue }

/**
 * Dispatch one Tauri command to its scripted answer.
 * @param script - the answers this page should give.
 * @param cmd - the command name.
 * @param args - the invoke arguments.
 * @param state - this page's IPC state.
 * @returns whatever that command answers with.
 */
function deeptailInvoke(
  script: AnswerTable,
  cmd: string,
  args: Record<string, object>,
  state: IpcState,
  // `tailscale_connected` answers with a boolean and `carrier_load_bundle`
  // with a bundle's source, so the surface is every JSON value a command
  // returns rather than objects alone.
): Promise<object | boolean | string | null> {
  // Every command is recorded, not only the remote calls. A surface that says
  // it re-reads the registry is making a claim about a command, and a claim
  // about a command needs a record of commands to be checked against.
  state.commands.push(cmd)
  switch (cmd) {
    case 'list_hosts':
      return deeptailListHosts(script, state)
    case 'select_host':
      return script.selectError === undefined ? Promise.resolve({}) : Promise.reject(new Error(script.selectError))
    case 'forget_host':
      return Promise.resolve(null)
    case 'capability_grants':
      // Answered from the table rather than computed here: this function is
      // serialised into the page, so anything it reads has to travel with it.
      return Promise.resolve(script.grants ?? { issuer: 'none', context: '', grants: [] })
    case 'boot_injections':
      return deeptailBootTable(script)
    case 'carrier_load_bundle':
      return deeptailLoadBundle(script, args, state)
    case 'carrier_close_mux':
      return Promise.resolve(null)
    case 'pair_host':
      return deeptailPairHost(script, args, state)
    case 'tailscale_connected':
    case 'tailscale_connect':
    case 'tailscale_devices':
    case 'tailscale_forget':
      return deeptailTailscale(script, cmd)
    case 'carrier_fetch':
      return deeptailCarrierFetch(script, args, state)
    case 'carrier_open_mux':
      return deeptailOpenMux(script, args, state)
    case 'carrier_send_mux':
      return deeptailSendMux(script, args, state)
    default:
      // The backend refuses a command it does not carry, and the page's double
      // says the same: an answered nothing would read as a command the wire
      // carries, and the page would run on a socket that lies.
      return Promise.reject(new Error(`deeptail: no carrier is scripted for ${cmd}`))
  }
}

/**
 * Install the runtime object the page reads, before any module of the bundle
 * runs.
 *
 * The runtime is the page's own, so it behaves the way a webview's does:
 * `transformCallback` mints an identifier and holds the callback against it, and
 * `unregisterCallback` drops it. Answering the callback itself instead of an
 * identifier is what this used to do, and it made the page's runtime one a page
 * constructing a real `Channel` could not cross on — the identifier would have
 * been a function, which is not something the wire carries.
 * @param script - the answers this page should give.
 */
function installTauriInternals(script: AnswerTable): void {
  // Recorded so a case can assert what actually reached the host. Without it a
  // test can only see that a dialog closed, which a no-op satisfies.
  const state: IpcState = {
    sockets: new Map<string, ScriptChannel>(),
    callbacks: new Map<string, (frame: JsonValue) => unknown>(),
    recorded: [],
    commands: [],
    pairedLinks: [],
    bundlePaths: [],
    listReads: 0,
  }
  // One minted identifier per registration, counting from one, so two callbacks
  // are two identifiers and a case can name the one it means.
  let minted = 0
  Object.assign(window, {
    deeptailRecordedCalls: state.recorded,
    deeptailInvokedCommands: state.commands,
    deeptailPairedLinks: state.pairedLinks,
    deeptailBundlePaths: state.bundlePaths,
    deeptailCallbackRegistrations: (): number => deeptailCallbackRegistrations(state),
    deeptailDeliver: (id: string, frame: JsonValue): boolean => deeptailDeliver(state, id, frame),
    deeptailCommandOutcome: (command: string): Promise<{ settled: string; message: string }> =>
      deeptailCommandOutcome(command),
    deeptailRuntimeMembers: (): string[] => deeptailRuntimeMembers(),
    deeptailIdentifierReport: () => deeptailIdentifierReport(state),
    __TAURI_INTERNALS__: {
      invoke: (cmd: string, args?: Record<string, object>) => deeptailInvoke(script, cmd, args ?? {}, state),
      transformCallback: (callback: (frame: JsonValue) => unknown): string => {
        minted += 1
        const id = String(minted)
        state.callbacks.set(id, callback)
        return id
      },
      unregisterCallback: (id: string): boolean => state.callbacks.delete(id),
      convertFileSrc: (path: string) => path,
    },
  })
}

/**
 * The script a page evaluates before the bundle runs.
 *
 * Playwright evaluates this in the page, where nothing from this module exists,
 * so the source of every function it needs is emitted alongside the call. That
 * is what lets the scripted IPC be written as ordinary typed functions instead
 * of one closure that may reference nothing outside itself.
 * @param table - the answers the page should give.
 * @returns the source to evaluate.
 */
export function initScriptSource(table: AnswerTable): string {
  const sources = [
    ...CARRIER_SOURCES,
    ...BOOT_SOURCES,
    ...TAILNET_SOURCES,
    deeptailListHosts,
    deeptailPairHost,
    deeptailInvoke,
    deeptailPageRuntime,
    deeptailRuntimeMembers,
    deeptailCallbackRegistrations,
    deeptailCommandOutcome,
    deeptailDeliver,
    deeptailIdentifierReport,
    installTauriInternals,
  ]
  // The issuance travels as data. Everything else here is source the page
  // evaluates, and a function that reached for a module would arrive naming
  // something the page has not got.
  const carried: AnswerTable = { ...table, grants: issuedGrants((table.hosts ?? []).map((host) => host.id)) }
  return `${sources.map(String).join('\n\n')}\ninstallTauriInternals(${JSON.stringify(carried)})`
}
