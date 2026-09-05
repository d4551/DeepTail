/**
 * One path from a control to the work it does.
 *
 * Every action the registry declares is handled here, by name, in one table the
 * compiler checks for completeness: a row in `actions.bao` with no handler here
 * is a type error. Dispatch is a lookup in that table, and every arm of every
 * outcome is named.
 *
 * The capability is spent at the moment of dispatch. A control painted while the
 * operator held a grant and activated after it lapsed is refused when it is
 * activated, which is the moment the answer is still true.
 *
 * @module
 */

import type { DenialAudit } from '../capabilities/audit.ts'
import { newTraceId } from '../capabilities/audit.ts'
import type { GrantLedger, GrantSubject } from '../capabilities/grants.ts'
import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import { describeFailure } from '../reason.ts'
import type { HostState } from '../ui/states.ts'
import type { ActionEffect, ActionOutcome, UnavailableReason } from './outcomes.ts'
import type { ActionDescriptor, ActionId } from './registry.ts'
import { CAPABILITIES } from './registry.ts'

/** What each action is activated with. */
export interface ActionInputs {
  'boot.retry': undefined
  'client.return': undefined
  'drawer.toggle': { readonly open: boolean }
  'drawer.dismiss': undefined
  'session.spawn': undefined
  'connection.pair': undefined
  'connection.repair': { readonly hostId: string }
  'connection.unpair': { readonly hostId: string }
  'connection.select': { readonly hostId: string }
  'session.open': { readonly hostId: string; readonly sessionId: string }
  'session.message': { readonly hostId: string; readonly sessionId: string; readonly title: string }
  'session.cancel': { readonly hostId: string; readonly sessionId: string }
  'compose.send': { readonly hostId: string; readonly sessionId: string; readonly text: string }
  'compose.steer': { readonly hostId: string; readonly sessionId: string; readonly text: string }
  'spawn.create': { readonly hostId: string; readonly preset: string; readonly cwd: string }
  'picker.pair': { readonly link: string; readonly label: string }
  'picker.tailnet': undefined
  'tailnet.connect': { readonly kind: string; readonly secret: string; readonly tailnet: string }
  'tailnet.forget': undefined
}

/** Everything the handlers call the application through. */
export interface ActionDeps {
  /** Every paired host, as the registry currently holds them. */
  hosts(): readonly HostRecord[]
  /** The host the operator has selected, when one is selected. */
  activeHostId(): string | undefined
  /** Whether a tailnet credential is stored. */
  tailnetStored(): boolean
  /** Whether a harness client currently owns the page. */
  clientBooted(): boolean
  /** Hand a session to the harness client on its own host. */
  openClient(host: HostRecord, sessionId: string): Promise<void>
  /** Open the pairing form, for a new host or to clear a revoked token. */
  pair(repairing: string | undefined): void
  /** Forget a host and its token. */
  forget(hostId: string): Promise<void>
  /** Make one host the selected one. */
  select(hostId: string): void
  /** Open the compose sheet against one session. */
  openCompose(hostId: string, sessionId: string, title: string): void
  /** Open the new-session dialog. */
  openSpawn(): void
  /** Put the control plane back where the booted client was. */
  returnToFleet(): Promise<void>
  /** Mount the control plane again from the registry. */
  remount(): Promise<void>
  /** Pair from a link the picker read. */
  pairFromLink(link: string, label: string): Promise<void>
  /** Open the tailnet screens. */
  openTailnet(): void
  /** Create a session on one host. */
  spawn(hostId: string, preset: string, cwd: string): Promise<string>
  /** Send into one session. */
  message(hostId: string, sessionId: string, text: string, mode: 'queue' | 'steer'): Promise<void>
  /** Stop one session's running turn. */
  cancel(hostId: string, sessionId: string): Promise<void>
  /** Store a tailnet credential and list the machines it reaches. */
  connectTailnet(kind: string, secret: string, tailnet: string): Promise<void>
  /** Drop the tailnet credential. */
  forgetTailnet(): Promise<void>
  /** Move the sidebar drawer. */
  setDrawer(open: boolean): void
}

/**
 * What a control's own precondition is measured against.
 *
 * The surface that owns the data supplies it: a row knows whether its session is
 * running, the menu knows how its host reads. A precondition is therefore read
 * from the facts the control was drawn from.
 */
export interface Preconditions {
  /** Whether at least one host is paired. */
  readonly hasHosts: boolean
  /** How the host the control belongs to reads. */
  readonly hostState: HostState
  /** Whether the session the control names is running. */
  readonly running: boolean
  /** Whether a tailnet credential is stored. */
  readonly tailnetStored: boolean
}

/** One action's handler. */
type Handler<A extends ActionId> = (deps: ActionDeps, input: ActionInputs[A], t: Translate) => Promise<ActionEffect>

/** Every handler, keyed by the action it answers for. */
export type ActionHandlers = { readonly [A in ActionId]: Handler<A> }

/** A dispatcher, ready to run one action. */
export interface Dispatcher {
  /**
   * Whether the control's own precondition holds right now.
   * @param action - the registry entry the control was built from.
   * @param preconditions - the facts the surface holds.
   */
  available(action: ActionDescriptor, preconditions: Preconditions): boolean
  /**
   * Run one action, or say exactly why it did not.
   * @param action - the registry entry the control was built from.
   * @param input - what the control supplies.
   * @param preconditions - the facts the surface holds.
   * @returns the outcome, ready to be shown.
   */
  dispatch<A extends ActionId>(
    action: ActionDescriptor & { readonly id: A },
    input: ActionInputs[A],
    preconditions: Preconditions,
  ): Promise<ActionOutcome>
}

/**
 * The host an action names, or nothing when the registry no longer holds it.
 * @param deps - the application.
 * @param hostId - the host the control named.
 * @returns the record, or undefined.
 */
function hostOf(deps: ActionDeps, hostId: string): HostRecord | undefined {
  return deps.hosts().find((host) => host.id === hostId)
}

/**
 * The name a host is announced by.
 * @param deps - the application.
 * @param hostId - the host to name.
 * @returns the label, or the id when the registry no longer holds it.
 */
function labelOf(deps: ActionDeps, hostId: string): string {
  return hostOf(deps, hostId)?.label ?? hostId
}

/**
 * The handlers, one per declared action.
 *
 * A handler does its work and lets a rejection travel to the dispatcher, which
 * renders the host's own account in the operator's language.
 * @param t - copy source, for what a successful action announces.
 * @returns the exhaustive table.
 */
function buildHandlers(t: Translate): ActionHandlers {
  return {
    'boot.retry': async (deps) => {
      await deps.remount()
      return { kind: 'executed' }
    },
    'client.return': async (deps) => {
      if (!deps.clientBooted()) return { kind: 'unwired', reason: 'no-booted-client' }
      await deps.returnToFleet()
      return { kind: 'executed' }
    },
    'drawer.toggle': async (deps, input) => {
      deps.setDrawer(input.open)
      return { kind: 'executed' }
    },
    'drawer.dismiss': async (deps) => {
      deps.setDrawer(false)
      return { kind: 'executed' }
    },
    'session.spawn': async (deps) => {
      if (deps.hosts().length === 0) return { kind: 'unwired', reason: 'no-host' }
      deps.openSpawn()
      return { kind: 'executed' }
    },
    'connection.pair': async (deps) => {
      deps.pair(undefined)
      return { kind: 'executed' }
    },
    'connection.repair': async (deps, input) => {
      deps.pair(labelOf(deps, input.hostId))
      return { kind: 'executed' }
    },
    'connection.unpair': async (deps, input) => {
      await deps.forget(input.hostId)
      return { kind: 'executed' }
    },
    'connection.select': async (deps, input) => {
      deps.select(input.hostId)
      return { kind: 'executed' }
    },
    'session.open': async (deps, input) => {
      const host = hostOf(deps, input.hostId)
      if (host === undefined) return { kind: 'invalid', reason: 'no-host' }
      await deps.openClient(host, input.sessionId)
      return { kind: 'executed' }
    },
    'session.message': async (deps, input) => {
      deps.openCompose(input.hostId, input.sessionId, input.title)
      return { kind: 'executed' }
    },
    'session.cancel': async (deps, input) => {
      await deps.cancel(input.hostId, input.sessionId)
      return { kind: 'executed' }
    },
    'compose.send': async (deps, input) => {
      if (input.text.trim() === '') return { kind: 'invalid', reason: 'empty-message' }
      await deps.message(input.hostId, input.sessionId, input.text, 'queue')
      return { kind: 'executed' }
    },
    'compose.steer': async (deps, input) => {
      if (input.text.trim() === '') return { kind: 'invalid', reason: 'empty-message' }
      await deps.message(input.hostId, input.sessionId, input.text, 'steer')
      return { kind: 'executed' }
    },
    'spawn.create': async (deps, input) => {
      await deps.spawn(input.hostId, input.preset, input.cwd)
      return { kind: 'executed', announce: t('spawn.created', { label: labelOf(deps, input.hostId) }) }
    },
    'picker.pair': async (deps, input) => {
      if (input.link.trim() === '') return { kind: 'invalid', reason: 'incomplete-credential' }
      await deps.pairFromLink(input.link, input.label)
      return { kind: 'executed' }
    },
    'picker.tailnet': async (deps) => {
      deps.openTailnet()
      return { kind: 'executed' }
    },
    'tailnet.connect': async (deps, input) => {
      await deps.connectTailnet(input.kind, input.secret, input.tailnet)
      return { kind: 'executed' }
    },
    'tailnet.forget': async (deps) => {
      if (!deps.tailnetStored()) return { kind: 'unwired', reason: 'no-tailnet-credential' }
      await deps.forgetTailnet()
      return { kind: 'executed' }
    },
  }
}

/**
 * Why a control is not drawn, or nothing when it is.
 * @param deps - the application.
 * @param action - the control's registry entry.
 * @param facts - what the surface that drew it knows.
 * @returns the reason, or undefined.
 */
function precondition(deps: ActionDeps, action: ActionDescriptor, facts: Preconditions): UnavailableReason | undefined {
  switch (action.availability) {
    case 'always':
      return undefined
    case 'hasHosts':
      return facts.hasHosts ? undefined : 'no-hosts'
    case 'hasActiveHost':
      return deps.activeHostId() === undefined ? 'no-active-host' : undefined
    case 'running':
      return facts.running ? undefined : 'not-running'
    case 'unauthorized':
      return facts.hostState === 'unauthorized' ? undefined : 'not-unauthorized'
    case 'tailnetConnected':
      return facts.tailnetStored ? undefined : 'no-tailnet'
  }
}

/**
 * The host a control named, when it named one.
 * @param input - what the control supplied.
 * @returns the host id, or undefined.
 */
function hostNamedBy(input: object | undefined): string | undefined {
  return input !== undefined && 'hostId' in input && typeof input.hostId === 'string' ? input.hostId : undefined
}

/**
 * The identity a grant is bound to: the host the control named when the
 * capability is issued per host, this device otherwise.
 * @param action - the control's registry entry.
 * @param input - what the control supplied.
 * @returns the subject.
 */
function subjectOf(action: ActionDescriptor, input: object | undefined): GrantSubject {
  const named = hostNamedBy(input)
  if (CAPABILITIES[action.capability].subject !== 'host' || named === undefined) return { kind: 'device' }
  return { kind: 'host', hostId: named }
}

/**
 * Land a handler's rejection as the host's own account.
 * @param work - the handler, already running.
 * @param t - copy source.
 * @returns the effect, landed or refused with the host's message.
 */
function settleHandler<T>(work: Promise<ActionEffect>, t: Translate): Promise<ActionEffect> {
  return work.then(
    (effect) => effect,
    (reason: T): ActionEffect => ({ kind: 'invalid', reason: 'host-refused', message: describeFailure(reason, t) }),
  )
}

/**
 * Build the dispatcher.
 * @param deps - what the handlers call the application through.
 * @param ledger - the capability mirror the page spends from.
 * @param audit - where every refusal is recorded.
 * @param t - copy source.
 * @returns the dispatcher.
 */
export function createDispatcher(deps: ActionDeps, ledger: GrantLedger, audit: DenialAudit, t: Translate): Dispatcher {
  const handlers = buildHandlers(t)
  return {
    available: (action, facts) => precondition(deps, action, facts) === undefined,
    async dispatch(action, input, facts) {
      const traceId = newTraceId()
      const blocked = precondition(deps, action, facts)
      if (blocked !== undefined) return { kind: 'unavailable', traceId, reason: blocked }
      const subject = subjectOf(action, input)
      const spent = ledger.spend(action.capability, subject)
      if (!spent.ok) {
        audit.record({
          traceId,
          action: action.id,
          capability: action.capability,
          subject: subject.kind === 'host' ? subject.hostId : 'device',
          reason: spent.reason,
          revision: undefined,
          at: Date.now(),
        })
        return { kind: 'denied', traceId, reason: spent.reason }
      }
      const effect = await settleHandler(handlers[action.id](deps, input, t), t)
      if (effect.kind === 'unwired') return { kind: 'unwired', traceId, reason: effect.reason }
      if (effect.kind === 'invalid') {
        return effect.reason === 'host-refused'
          ? { kind: 'invalid', traceId, reason: effect.reason, message: effect.message }
          : { kind: 'invalid', traceId, reason: effect.reason }
      }
      return effect.announce === undefined
        ? { kind: 'executed', traceId }
        : { kind: 'executed', traceId, announce: effect.announce }
    },
  }
}
