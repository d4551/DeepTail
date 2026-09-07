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

import { CARRIER_SOURCES, deeptailCarrierFetch, deeptailOpenMux, deeptailSendMux } from './tauri-ipc-carrier.ts'
import { deeptailListHosts, issuedGrants } from './tauri-ipc-registry.ts'

export type MuxEventValue =
  | { readonly type: 'ready'; readonly clientId: string; readonly host: string }
  | { readonly type: 'emit'; readonly event: string; readonly args: ForwardedEvent['args'] }

/** One frame the scripted mux socket delivers to the client. */
type ScriptFrame =
  | { readonly type: 'open' }
  | { readonly type: 'message'; readonly data: string }
  | { readonly type: 'close'; readonly code: number; readonly reason: string }

/** The mux channel handle `carrier_open_mux` receives. */
export interface ScriptChannel {
  onmessage?: (frame: ScriptFrame) => void
}

/** One paired host as the fleet table reports it. */
type HostFixture = {
  readonly id: string
  readonly label: string
  readonly origin: string
}

/** The failure context a host attaches to a rejection. */
interface FailureDetails {
  readonly available?: readonly string[]
}

/** One session as the roster reports it over the wire. */
export interface SessionFixture {
  readonly sessionId: string
  readonly updatedAt: number
  readonly running: boolean
  readonly blank: boolean
  readonly projections?: { readonly values?: { readonly title?: string } }
}

/** One roster event the mux forwards, with the argument tuple the host sends. */
export interface ForwardedEvent {
  readonly event: string
  readonly args: readonly (string | number | boolean | SessionFixture)[]
}

/** A JSON value, as the wire carries it: the shape every recorded argument has. */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | { readonly [key: string]: JsonValue }

/** One machine as the native side reports it. */
interface TailnetFixture {
  readonly id: string
  readonly label: string
  readonly origin: string
  readonly os: string
  readonly lastSeen: string
  readonly tags: readonly string[]
  readonly authorized: boolean
  readonly paired: boolean
}

/** One Remote call the page issued, as the scripted IPC saw it. */
export interface RecordedCall {
  readonly host: string
  readonly endpoint: string
  readonly args: Readonly<Record<string, JsonValue>>
}

/**
 * One argument of a recorded call.
 *
 * A call's arguments are decided by its endpoint, so the section is a map and
 * the name travels as a value: nothing here may spell an argument as though
 * every endpoint carried it. A call that was never made answers undefined,
 * which is what the assertions on an unmade call are written against.
 * @param call - the recorded call, or nothing when none was made.
 * @param name - the argument to read.
 * @returns the argument, or undefined when the call does not carry it.
 */
export function callArgument(call: RecordedCall | undefined, name: string): JsonValue | undefined {
  return call?.args[name]
}

/** What one page's scripted IPC accumulates while it runs. */
export interface IpcState {
  readonly channels: Map<string, ScriptChannel>
  readonly recorded: RecordedCall[]
  /** Every Tauri command name the page has invoked, in order. */
  readonly commands: string[]
  /** Every pairing link the page asked the native side to spend, in order. */
  readonly pairedLinks: string[]
  /** How many times the page has read the host registry. */
  listReads: number
}

/** One scripted answer table for `window.__TAURI_INTERNALS__.invoke`. */
export type AnswerTable = {
  readonly hosts?: readonly HostFixture[]
  readonly listError?: string
  /**
   * Which reads of `list_hosts` fail, counting from one; the rest answer
   * normally.
   *
   * A registry unreadable from the first call never gets past the picker, so
   * the boot notice — the surface the whole application falls back to, and the
   * only home of its retry — could not be reached by any fixture at all, and
   * nothing exercised it. Reaching it needs the reads the application makes to
   * fail while the reads the picker makes for itself succeed, and those
   * interleave, so which read fails is the thing a case has to say.
   */
  readonly listErrorOn?: readonly number[]
  /**
   * What the native authority answers issuance with. Filled in by
   * `initScriptSource` from the registry, so a case never states it.
   */
  readonly grants?: object
  readonly selectError?: string
  readonly pairError?: string
  readonly paired?: HostFixture
  /** Answers keyed by Remote endpoint, e.g. `session/list`. */
  readonly remote?: Readonly<Record<string, object>>
  /** Endpoints that should fail, keyed the same way. */
  readonly remoteErrors?: Readonly<Record<string, string>>
  /** Endpoints that never answer, keyed the same way. A pending `session/list`
   *  is what the roster's loading state looks like. */
  readonly remotePending?: readonly string[]
  /** HTTP statuses to answer with, keyed the same way. A 401 or 403 is how a
   *  revoked device token reaches the client. */
  readonly remoteStatuses?: Readonly<Record<string, number>>
  /** Failure codes for the endpoints in `remoteErrors`, keyed the same way. */
  readonly remoteErrorCodes?: Readonly<Record<string, string>>
  /** Failure details for those endpoints, such as the presets a host does have. */
  readonly remoteErrorDetails?: Readonly<Record<string, FailureDetails>>
  /** Hosts whose `$events` mux answers. Anything not listed keeps the silent,
   *  never-opening socket, which is what an unreachable stream looks like. */
  readonly muxHosts?: readonly string[]
  /** Roster events the mux forwards once the stream is open, in order. Each is
   *  delivered to every host in `muxHosts`. */
  readonly muxEvents?: readonly ForwardedEvent[]
  /** Hosts whose mux closes right after opening, so the roster reports it lost. */
  readonly muxClose?: readonly string[]
  /** Why booting the harness client fails, when the test needs it to. */
  readonly bootError?: string
  /** Whether a tailnet credential is already stored. */
  readonly tailnetConnected?: boolean
  /** The machines `tailscale_devices` and `tailscale_connect` answer with. */
  readonly tailnetDevices?: readonly TailnetFixture[]
  /** Why listing the tailnet fails, when the test needs it to. */
  readonly tailnetError?: string
}

/**
 * Answer one of the four Tailscale commands.
 * @param script - the answers this page should give.
 * @param cmd - the command name.
 * @returns whatever that command answers with.
 */
function deeptailTailscale(script: AnswerTable, cmd: string): Promise<object | boolean | null> {
  if (cmd === 'tailscale_connected') return Promise.resolve(script.tailnetConnected === true)
  if (cmd === 'tailscale_forget') return Promise.resolve(null)
  return script.tailnetError === undefined
    ? Promise.resolve(script.tailnetDevices ?? [])
    : Promise.reject(new Error(script.tailnetError))
}

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
  // `tailscale_connected` answers with a boolean, so the surface is every JSON
  // value a command returns rather than objects alone.
): Promise<object | boolean | null> {
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
      return script.bootError === undefined ? Promise.resolve([]) : Promise.reject(new Error(script.bootError))
    case 'carrier_close_mux':
      return Promise.resolve(null)
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
      return Promise.resolve(null)
  }
}

function installTauriInternals(script: AnswerTable): void {
  // Recorded so a case can assert what actually reached the host. Without it a
  // test can only see that a dialog closed, which a no-op satisfies.
  const state: IpcState = {
    channels: new Map<string, ScriptChannel>(),
    recorded: [],
    commands: [],
    pairedLinks: [],
    listReads: 0,
  }
  Object.assign(window, {
    deeptailRecordedCalls: state.recorded,
    deeptailInvokedCommands: state.commands,
    deeptailPairedLinks: state.pairedLinks,
    __TAURI_INTERNALS__: {
      invoke: (cmd: string, args?: Record<string, object>) => deeptailInvoke(script, cmd, args ?? {}, state),
      transformCallback: (callback: () => object) => callback,
      unregisterCallback: () => true,
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
  const sources = [...CARRIER_SOURCES, deeptailListHosts, deeptailTailscale, deeptailInvoke, installTauriInternals]
  // The issuance travels as data. Everything else here is source the page
  // evaluates, and a function that reached for a module would arrive naming
  // something the page has not got.
  const carried: AnswerTable = { ...table, grants: issuedGrants((table.hosts ?? []).map((host) => host.id)) }
  return `${sources.map(String).join('\n\n')}\ninstallTauriInternals(${JSON.stringify(carried)})`
}

declare global {
  interface Window {
    /** Every Remote call the page issued, as the scripted IPC recorded it. */
    readonly deeptailRecordedCalls?: readonly RecordedCall[]
    /** Every Tauri command name the page invoked, in order. */
    readonly deeptailInvokedCommands?: readonly string[]
    /** Every pairing link the page spent, in order. */
    readonly deeptailPairedLinks?: readonly string[]
    /** The hook an open mux leaves for the harness to forward events through. */
    readonly deeptailForwardEvent?: (event: string, args: ForwardedEvent['args']) => void
  }
}
