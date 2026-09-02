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

import { type PairingRuntime, pairAndFinish } from './fleet-pairing.ts'
import { connectTailnet, forgetTailnet, openTailnet, tailnetPairingPhase } from './fleet-tailnet.ts'
import type { HostRecord } from './host.ts'
import { createTranslate, type Translate } from './locales.ts'
import { type PickerPorts, settled, tauriPorts } from './picker-ports.ts'
import { mountPickerFrame, type Phase, type PickerActions, type PickerFrame, paintScreen } from './picker-screen.ts'
import { type TailnetPorts, tauriTailnetPorts } from './tailscale.ts'
import type { HostState } from './ui/states.ts'
import './styles/tokens.css'
import './styles/picker.css'

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
  readonly tailnet: TailnetPorts
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
      const { phase } = run.model
      void pairAndFinish(pairingRuntime(run), hosts, draft, phase.kind === 'pairing' ? phase.origin : undefined)
    },
    choose: run.finish,
    beginTailnet: (hosts) => {
      void openTailnet(tailnetRuntime(run), hosts)
    },
    submitTailnet: (hosts, draft) => {
      void connectTailnet(tailnetRuntime(run), hosts, draft)
    },
    switchTailnetKind: (hosts, draft) => {
      toPhase(run, { kind: 'tailnetConnect', hosts, busy: false, draft })
    },
    cancelTailnet: (hosts) => {
      toPhase(run, { kind: 'ready', hosts })
    },
    forgetTailnet: (hosts) => {
      void forgetTailnet(tailnetRuntime(run), hosts)
    },
    pairTailnetDevice: (hosts, device) => {
      toPhase(run, tailnetPairingPhase(hosts, device))
    },
  }
}

/**
 * The slice of the picker the pairing flow drives.
 * @param run - the running picker.
 * @returns the pairing flow's runtime.
 */
function pairingRuntime(run: PickerRuntime): PairingRuntime {
  return {
    pairHost: (link, label) => run.ports.pairHost(link, label),
    t: run.t,
    toPhase: (next) => {
      toPhase(run, next)
    },
    finish: run.finish,
  }
}

/**
 * The slice of the picker the tailnet flow drives.
 * @param run - the running picker.
 * @returns the tailnet flow's runtime.
 */
function tailnetRuntime(run: PickerRuntime): { tailnet: TailnetPorts; t: Translate; toPhase(next: Phase): void } {
  return {
    tailnet: run.tailnet,
    t: run.t,
    toPhase: (next) => {
      toPhase(run, next)
    },
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
  onSettled: (host: HostRecord) => void,
): Promise<void> {
  await Promise.all(
    hosts.map(async (host) => {
      states.set(host.id, await ports.hostState(host))
      // Each dot the moment its own probe answers. Repainting once, after every
      // probe had settled, meant one unreachable host held the whole fleet's
      // dots at `unknown` for as long as its read took to time out — which is
      // the opposite of what this function's caller says it does.
      onSettled(host)
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
  await probeHosts(run.ports, listed.hosts, run.model.states, () => {
    if (run.model.phase.kind === 'ready') repaint(run)
  })
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
 * @param tailnet - how the tailnet is reached; defaults to the real commands.
 * @returns a promise that settles when the operator has chosen.
 */
export function renderHostPicker(
  container: HTMLElement,
  ports: PickerPorts = tauriPorts,
  translate: Translate = createTranslate(),
  repairing?: string,
  tailnet: TailnetPorts = tauriTailnetPorts,
): Promise<void> {
  return new Promise<void>((resolve) => {
    const run: PickerRuntime = {
      ports,
      tailnet,
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
