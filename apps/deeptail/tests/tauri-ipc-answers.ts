/**
 * The fixtures and answer tables the scripted Tauri IPC is driven by.
 *
 * Split out of `tauri-ipc.ts` for size. Nothing here runs: it is the shape of
 * what a case states and what the scripted page accumulates, kept apart from
 * the two functions that install and dispatch, which have to be serialised into
 * the page and can close over nothing.
 *
 * @module
 */

import type { InvokeArgs } from '@tauri-apps/api/core'
import type { JsonValue } from '../src/wire.ts'

/** A host as a paired-host fixture states it, which is the whole of a pairing. */
interface PairedHost {
  readonly id: string
  readonly label: string
  readonly origin: string
}

/** One paired host as the fleet table reports it. */
type HostFixture = PairedHost

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

/** One machine as the native side reports it. */
interface TailnetFixture extends PairedHost {
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

/** One frame the scripted mux socket delivers to the client. */
type ScriptFrame =
  | { readonly type: 'open' }
  | { readonly type: 'message'; readonly data: string }
  | { readonly type: 'close'; readonly code: number; readonly reason: string }

/** The mux channel handle `carrier_open_mux` receives. */
export interface ScriptChannel {
  onmessage?: (frame: ScriptFrame) => void
}

/**
 * The runtime object a webview carries, which the page's library reads by name.
 *
 * The four members are the installed release's own surface. Declared because no
 * engine provides the object and no declaration the page's bundle loads carries
 * it: the library reads it off the global by name, and a suite that reads the
 * same object — rather than reaching into the scripted module — needs a name
 * for what it finds there.
 */
interface TauriRuntime {
  readonly invoke: (command: string, args?: InvokeArgs) => Promise<JsonValue>
  readonly transformCallback: (callback: (message: JsonValue) => unknown) => string
  readonly unregisterCallback: (id: string) => boolean
  readonly convertFileSrc: (path: string) => string
}

/** One event the scripted mux publishes once its stream is open. */
export type MuxEventValue =
  | { readonly type: 'ready'; readonly clientId: string; readonly host: string }
  | { readonly type: 'emit'; readonly event: string; readonly args: ForwardedEvent['args'] }

/** What one page's scripted IPC accumulates while it runs. */
export interface IpcState {
  /**
   * The mux socket the page handed over for each host, keyed by host.
   *
   * Keyed by host, not by identifier, because that is what `carrier_send_mux`
   * has to hand: the page sends on the host's stream, and nothing else in the
   * scripted carrier names the socket. What the runtime itself registered is
   * `callbacks`.
   */
  readonly sockets: Map<string, ScriptChannel>
  /**
   * The callbacks the runtime holds against the identifiers it minted, keyed by
   * identifier.
   *
   * This is the runtime's own registry rather than a scripting convenience:
   * `transformCallback` mints an identifier and holds the callback it was
   * given, and `unregisterCallback` drops it. A page that constructs a real
   * `Channel` crosses on that identifier, so a double that answered a callback
   * instead of a string handed every caller something no wire carries — and
   * nothing here would have said so.
   */
  readonly callbacks: Map<string, (frame: JsonValue) => unknown>
  readonly recorded: RecordedCall[]
  /** Every Tauri command name the page has invoked, in order. */
  readonly commands: string[]
  /** Every pairing link the page asked the native side to spend, in order. */
  readonly pairedLinks: string[]
  /** Every bundle path the page asked the carrier for, in order. */
  readonly bundlePaths: string[]
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
  /**
   * The boot table the host serves, in the order it serves it.
   *
   * This is the harness's server-rendered index injection table, which a
   * served page carries in its HTML and a non-served shell has to reproduce.
   * The default is the empty table, which is what every case ran against
   * before this existed — so every row kind, and the order that is the whole
   * contract, went unexercised.
   */
  readonly bootInjections?: readonly JsonValue[]
  /** The source `carrier_load_bundle` answers with, keyed by the path asked for. */
  readonly bundleSources?: Readonly<Record<string, string>>
  /** Why a bundle path fails to load, keyed the same way. */
  readonly bundleErrors?: Readonly<Record<string, string>>
  /** Whether a tailnet credential is already stored. */
  readonly tailnetConnected?: boolean
  /** The machines `tailscale_devices` and `tailscale_connect` answer with. */
  readonly tailnetDevices?: readonly TailnetFixture[]
  /** Why listing the tailnet fails, when the test needs it to. */
  readonly tailnetError?: string
}

declare global {
  interface Window {
    /**
     * The runtime object the page's own `@tauri-apps/api/core` reads when it
     * calls a command or registers a callback.
     *
     * Declared because no engine provides it and no declaration the page's
     * bundle loads carries it: the library reads it off the global by name, and
     * a suite that reads the same object — rather than reaching into the
     * scripted module — needs a name for what it finds there. The four members
     * are the installed release's own surface.
     */
    readonly __TAURI_INTERNALS__?: TauriRuntime
    /** Every Remote call the page issued, as the scripted IPC recorded it. */
    readonly deeptailRecordedCalls?: readonly RecordedCall[]
    /** Every Tauri command name the page invoked, in order. */
    readonly deeptailInvokedCommands?: readonly string[]
    /** Every pairing link the page spent, in order. */
    readonly deeptailPairedLinks?: readonly string[]
    /** Every bundle path the page asked the carrier for, in order. */
    readonly deeptailBundlePaths?: readonly string[]
    /**
     * The hook an open mux leaves for the harness to forward events through.
     *
     * Typed as returning nothing a caller may use, because it is called for its
     * effect: the event goes to the page's subscription and the answer to the
     * call is nothing.
     */
    readonly deeptailForwardEvent?: (event: string, args: ForwardedEvent['args']) => undefined
    /** How many callbacks the page's runtime is holding for identifiers it minted. */
    readonly deeptailCallbackRegistrations?: () => number
    /** Deliver one frame to the callback registered under an identifier, as the backend does. */
    readonly deeptailDeliver?: (id: string, frame: JsonValue) => boolean
    /** The names of the members the page's runtime object carries, sorted. */
    readonly deeptailRuntimeMembers?: () => string[]
    /**
     * What one identifier the page's runtime minted is, and what it answers for.
     *
     * Read as data rather than as a live value: a function cannot cross back out
     * of a page through Playwright, so a case that read the callback itself
     * would be asserting against a value it never received.
     */
    readonly deeptailIdentifierReport?: () => {
      /** What the page had already registered before the probe minted anything. */
      readonly bootRegistrations: number
      readonly identifier: string
      readonly second: string
      readonly distinct: boolean
      /** How many the probe's own two registrations added. */
      readonly registrations: number
      readonly delivered: boolean
      readonly released: boolean
      readonly afterRelease: boolean
    }
  }
}
