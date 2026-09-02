/**
 * The host picker: the one screen DeepTail draws itself. Everything after a
 * host is chosen is the harness's own web client, served by that host.
 *
 * This is the picker's engine — the native surface it calls, the phase it
 * moves through, and the promise a chosen host settles. Which phase paints
 * which views is decided in `./picker-screen.ts`.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'
import { createHostApi, FORBIDDEN, RemoteError, UNAUTHORIZED } from './api.ts'
import type { HostRecord } from './host.ts'
import { createTranslate, type Translate } from './locales.ts'
import type { PairDraft } from './picker-pair-form.ts'
import { mountPickerFrame, type Phase, type PickerActions, type PickerFrame, paintScreen } from './picker-screen.ts'
import type { HostState } from './ui/states.ts'
import './styles/tokens.css'
import './styles/picker.css'
import { messageOf } from './reason.ts'
import { createCarrier } from './transport.ts'

/** How the picker reaches the native side; replaced wholesale in tests. */
export interface PickerPorts {
  listHosts(): Promise<HostRecord[]>
  pairHost(link: string, label: string): Promise<HostRecord>
  hostState(host: HostRecord): Promise<HostState>
}

/** Read a promise as data: success keeps its value, failure keeps its message. */
const settled = async <T>(
  promise: Promise<T>,
): Promise<
  { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string; readonly reason: unknown }
> => {
  const [outcome] = await Promise.allSettled([promise])
  return outcome.status === 'fulfilled'
    ? { ok: true, value: outcome.value }
    : { ok: false, message: messageOf(outcome.reason), reason: outcome.reason }
}

/** The ports backed by the real Tauri commands. */
const tauriPorts: PickerPorts = {
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
    return probeState(reached.reason)
  },
}

/**
 * What a failed probe says about a host.
 * @param reason - whatever the read rejected with.
 * @returns the reachability to draw.
 */
function probeState(reason: unknown): HostState {
  if (!(reason instanceof RemoteError)) return 'offline'
  if (reason.code === UNAUTHORIZED) return 'unauthorized'
  if (reason.code === FORBIDDEN) return 'forbidden'
  return 'offline'
}

/** A pairing form with nothing typed into it yet. */
const EMPTY_DRAFT = { link: '', label: '' } as const

/** What the picker knows, which its phases are painted from. */
interface PickerModel {
  /** The phase on screen. */
  phase: Phase
  /** Reachability per host, filled in as probes settle. */
  readonly states: Map<string, HostState>
}

/**
 * One running picker: the native surface it calls, the copy it speaks, what it
 * knows, the frame it paints into, and how it hands back a chosen host.
 */
interface PickerRuntime {
  readonly ports: PickerPorts
  readonly t: Translate
  readonly model: PickerModel
  readonly frame: PickerFrame
  /** Hand the chosen host back and take the picker down. */
  finish(host: HostRecord): void
}

/**
 * Repaint the card for the phase the picker is in.
 * @param run - the running picker.
 * @returns nothing.
 */
function repaint(run: PickerRuntime): void {
  paintScreen(run.frame, run.model.phase, { t: run.t, states: run.model.states }, pickerActions(run))
}

/**
 * Move the picker to a phase and repaint.
 * @param run - the running picker.
 * @param next - the phase to show.
 * @returns nothing.
 */
function toPhase(run: PickerRuntime, next: Phase): void {
  run.model.phase = next
  repaint(run)
}

/**
 * The commands the painted controls invoke, bound to one running picker.
 * @param run - the running picker.
 * @returns the command surface.
 */
function pickerActions(run: PickerRuntime): PickerActions {
  return {
    reload: () => {
      void loadRoster(run)
    },
    beginPairing: (hosts) => {
      toPhase(run, { kind: 'pairing', hosts, busy: false, draft: EMPTY_DRAFT })
    },
    cancelPairing: (hosts) => {
      toPhase(run, { kind: 'ready', hosts })
    },
    submitPairing: (hosts, draft) => {
      void pairAndFinish(run, hosts, draft)
    },
    choose: run.finish,
  }
}

/**
 * The phase a roster read lands in.
 *
 * A registry that refuses without saying why still owes the operator an
 * explanation, so the generic message stands in for an empty one.
 * @param ports - the native surface.
 * @param t - copy source.
 * @returns the phase to move to.
 */
async function readRoster(ports: PickerPorts, t: Translate): Promise<Phase> {
  const read = await settled(ports.listHosts())
  return read.ok
    ? { kind: 'ready', hosts: read.value }
    : { kind: 'failed', message: read.message === '' ? t('error.listFailed') : read.message }
}

/**
 * Learn every host's reachability at once.
 * @param ports - the native surface.
 * @param hosts - the roster to probe.
 * @param states - where each answer is recorded.
 * @returns when every probe has settled.
 */
async function probeHosts(
  ports: PickerPorts,
  hosts: readonly HostRecord[],
  states: Map<string, HostState>,
): Promise<void> {
  await Promise.all(
    hosts.map(async (host) => {
      states.set(host.id, await ports.hostState(host))
    }),
  )
}

/**
 * Read the roster, paint it, then settle its dots.
 *
 * The list goes up before the probes answer, so one unreachable host holds up
 * its own dot rather than the whole screen; and the probes only repaint if the
 * list is still what the viewer is looking at.
 * @param run - the running picker.
 * @returns when the roster and every probe have settled.
 */
async function loadRoster(run: PickerRuntime): Promise<void> {
  toPhase(run, { kind: 'loading' })
  toPhase(run, await readRoster(run.ports, run.t))

  const listed = run.model.phase
  if (listed.kind !== 'ready') return
  await probeHosts(run.ports, listed.hosts, run.model.states)
  if (run.model.phase.kind === 'ready') repaint(run)
}

/**
 * The name a host is paired under: it has to be listed as something, so one
 * left blank is paired as "Harness".
 * @param typed - the name as typed.
 * @returns the label to pair with.
 */
function pairLabel(typed: string): string {
  const trimmed = typed.trim()
  return trimmed === '' ? 'Harness' : trimmed
}

/**
 * Pair the host the draft describes, and finish with it.
 *
 * Both refusals come back to the form still holding what was typed, so a
 * mistyped link costs a correction rather than the whole paste.
 * @param run - the running picker.
 * @param hosts - the roster the form was opened over.
 * @param draft - what the viewer typed.
 * @returns when the attempt has settled.
 */
async function pairAndFinish(run: PickerRuntime, hosts: readonly HostRecord[], draft: PairDraft): Promise<void> {
  const { t } = run
  const link = draft.link.trim()
  const refusal = linkRefusal(link, t)
  if (refusal !== undefined) {
    toPhase(run, { kind: 'pairing', hosts, error: refusal, busy: false, draft })
    return
  }
  toPhase(run, { kind: 'pairing', hosts, busy: true, draft })
  const added = await settled(run.ports.pairHost(link, pairLabel(draft.label)))
  if (!added.ok) {
    const error = t('error.pairFailed', { message: added.message })
    toPhase(run, { kind: 'pairing', hosts, error, busy: false, draft })
    return
  }
  run.finish(added.value)
}

/**
 * Why a pasted link cannot be paired with, or undefined when it can.
 *
 * The browser refuses a malformed `type="url"` itself, in a bubble this product
 * neither wrote nor translated, and the submit never runs — so the form's own
 * strip stayed empty for exactly the paste that needed it. Constraint
 * validation is off and the refusal is written here.
 * @param link - the pasted text, already trimmed.
 * @param t - copy source.
 * @returns the refusal to show, or undefined.
 */
function linkRefusal(link: string, t: Translate): string | undefined {
  if (link === '') return t('error.linkRequired')
  return URL.canParse(link) ? undefined : t('error.linkInvalid')
}

/**
 * Draw the picker and resolve with the host the viewer chose.
 *
 * @param container - mount point, owned entirely by the picker until it resolves.
 * @param ports - the native surface to call.
 * @param translate - copy source; defaults to the browser's locale.
 * @param repairing - the label of a host being paired again, which opens the
 * form directly with that name in place so the record is replaced rather than
 * a second one written beside it.
 * @returns a promise that settles when the operator has chosen.
 */
export function renderHostPicker(
  container: HTMLElement,
  ports: PickerPorts = tauriPorts,
  translate: Translate = createTranslate(),
  repairing?: string,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const run: PickerRuntime = {
      ports,
      t: translate,
      model: { phase: { kind: 'loading' }, states: new Map() },
      frame: mountPickerFrame(container),
      finish: () => {
        container.replaceChildren()
        resolve()
      },
    }
    if (repairing === undefined) {
      void loadRoster(run)
      return
    }
    void repairHost(run, repairing)
  })
}

/**
 * Open the pairing form for a host that already exists, with its name in place.
 * @param run - the picker's runtime.
 * @param label - the name the host is filed under.
 */
async function repairHost(run: PickerRuntime, label: string): Promise<void> {
  const read = await settled(run.ports.listHosts())
  toPhase(run, {
    kind: 'pairing',
    hosts: read.ok ? read.value : [],
    busy: false,
    draft: { link: '', label },
  })
}
