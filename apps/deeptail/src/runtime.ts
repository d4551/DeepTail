/**
 * The live action plane: one ledger, one dispatcher, and the application
 * callbacks chrome spends through.
 *
 * A control that talks to a host without going through this plane is a control
 * the capability model never saw.
 *
 * @module
 */

import type { ActionDeps, ActionInputs, Dispatcher, Preconditions } from './actions/dispatch.ts'
import { createDispatcher } from './actions/dispatch.ts'
import type { ActionOutcome } from './actions/outcomes.ts'
import { outcomeCopy } from './actions/outcomes.ts'
import type { ActionDescriptor, ActionId } from './actions/registry.ts'
import { createDenialAudit, type DenialAudit } from './capabilities/audit.ts'
import { createGrantLedger, type GrantLedger } from './capabilities/grants.ts'
import type { HostRecord } from './host.ts'
import type { Translate } from './locales.ts'
import { messageOf } from './reason.ts'
import type { HostState } from './ui/states.ts'

/** Facts that let a control through its own precondition. */
export const READY_FACTS: Preconditions = {
  hasHosts: true,
  hostState: 'online',
  running: true,
  tailnetStored: true,
}

/** Where an outcome is told: the live region, or a failure strip. */
export interface OutcomeTell {
  readonly announce: (text: string) => void
  readonly fail: (text: string) => void
}

/** The application runtime chrome dispatches through. */
export interface AppRuntime {
  readonly dispatcher: Dispatcher
  readonly ledger: GrantLedger
  readonly audit: DenialAudit
  readonly t: Translate
  /** The seam handlers call; chrome fills it in as each surface mounts. */
  readonly deps: ActionDeps
  /** Remember the host the last pairing produced, for the picker to finish with. */
  rememberPaired(host: HostRecord): void
  /** The host the last pairing produced. */
  takePaired(): HostRecord
}

/**
 * Why a plane slot was reached before the surface that owns it mounted.
 * @param name - the slot.
 * @returns never; always throws.
 */
export function missingPlane(name: string): never {
  throw new Error(`deeptail: action plane missing ${name}`)
}

/**
 * The shell-owned slots, unbound.
 * @returns the slots.
 */
function unboundShell(): Pick<
  ActionDeps,
  | 'hosts'
  | 'activeHostId'
  | 'clientBooted'
  | 'openClient'
  | 'pair'
  | 'forget'
  | 'select'
  | 'returnToFleet'
  | 'remount'
  | 'setDrawer'
  | 'openSpawn'
  | 'openCompose'
> {
  return {
    hosts: () => missingPlane('hosts'),
    activeHostId: () => missingPlane('activeHostId'),
    clientBooted: () => missingPlane('clientBooted'),
    openClient: () => missingPlane('openClient'),
    pair: () => missingPlane('pair'),
    forget: () => missingPlane('forget'),
    select: () => missingPlane('select'),
    returnToFleet: () => missingPlane('returnToFleet'),
    remount: () => missingPlane('remount'),
    setDrawer: () => missingPlane('setDrawer'),
    openSpawn: () => missingPlane('openSpawn'),
    openCompose: () => missingPlane('openCompose'),
  }
}

/**
 * The session-owned slots, unbound.
 * @returns the slots.
 */
function unboundSession(): Pick<ActionDeps, 'spawn' | 'message' | 'cancel'> {
  return {
    spawn: () => missingPlane('spawn'),
    message: () => missingPlane('message'),
    cancel: () => missingPlane('cancel'),
  }
}

/**
 * The picker-owned slots, unbound.
 * @returns the slots.
 */
function unboundPicker(): Pick<
  ActionDeps,
  'tailnetStored' | 'pairFromLink' | 'openTailnet' | 'connectTailnet' | 'forgetTailnet'
> {
  return {
    tailnetStored: () => missingPlane('tailnetStored'),
    pairFromLink: () => missingPlane('pairFromLink'),
    openTailnet: () => missingPlane('openTailnet'),
    connectTailnet: () => missingPlane('connectTailnet'),
    forgetTailnet: () => missingPlane('forgetTailnet'),
  }
}

/**
 * Tell an outcome where the operator can see it.
 * @param outcome - what dispatch answered.
 * @param t - copy source.
 * @param tell - the live region and the failure strip.
 */
export function presentOutcome(outcome: ActionOutcome, t: Translate, tell: OutcomeTell): void {
  if (outcome.kind === 'executed') {
    if (outcome.announce !== undefined) tell.announce(outcome.announce)
    return
  }
  const copy = outcomeCopy(outcome, t)
  if (copy !== undefined) tell.fail(copy)
}

/**
 * Dispatch one action and present whatever it answered.
 * @param runtime - the live plane.
 * @param action - the registry entry.
 * @param input - what the control supplies.
 * @param facts - the surface's current facts.
 * @param tell - where the outcome is told.
 */
export function runAction<A extends ActionId, T>(
  runtime: AppRuntime,
  action: ActionDescriptor & { readonly id: A },
  input: ActionInputs[A],
  facts: Preconditions,
  tell: OutcomeTell,
): void {
  runtime.dispatcher.dispatch(action, input, facts).then(
    (outcome) => presentOutcome(outcome, runtime.t, tell),
    (reason: T) => tell.fail(messageOf(reason)),
  )
}

/**
 * Facts for one control, with the four fields named.
 * @param hasHosts - whether any host is paired.
 * @param hostState - how the host the control belongs to reads.
 * @param running - whether the named session is running.
 * @param tailnetStored - whether a tailnet credential is stored.
 * @returns the facts.
 */
export function actionFacts(
  hasHosts: boolean,
  hostState: HostState,
  running: boolean,
  tailnetStored: boolean,
): Preconditions {
  return { hasHosts, hostState, running, tailnetStored }
}

/**
 * Build the runtime the page spends through.
 * @param t - copy source.
 * @returns the runtime, with every slot still unbound.
 */
export function createAppRuntime(t: Translate): AppRuntime {
  const ledger = createGrantLedger()
  const audit = createDenialAudit()
  const deps: ActionDeps = { ...unboundShell(), ...unboundSession(), ...unboundPicker() }
  const dispatcher = createDispatcher(deps, ledger, audit, t)
  let lastPaired: HostRecord | undefined
  return {
    dispatcher,
    ledger,
    audit,
    t,
    deps,
    rememberPaired(host) {
      lastPaired = host
    },
    takePaired() {
      if (lastPaired === undefined) throw new Error('deeptail: pair produced no host')
      return lastPaired
    },
  }
}
