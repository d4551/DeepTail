/**
 * What the dispatcher does with each declared action.
 *
 * The registry's own invariants — that the generated faces match, that every
 * action names a lane and prices a capability — are held in `actions.spec.ts`.
 * This is the other half: one handler per action, the capability spent at the
 * moment of dispatch, and every arm of every outcome named.
 */

import { describe, expect, it } from 'bun:test'
import type { ActionDeps, ActionInputs, Preconditions } from '../apps/deeptail/src/actions/dispatch.ts'
import { createDispatcher } from '../apps/deeptail/src/actions/dispatch.ts'
import { outcomeCopy } from '../apps/deeptail/src/actions/outcomes.ts'
import type { ActionDescriptor, ActionId } from '../apps/deeptail/src/actions/registry.ts'
import { ACTION_IDS, ACTION_LIST, ACTIONS, CAPABILITIES } from '../apps/deeptail/src/actions/registry.ts'
import { createDenialAudit } from '../apps/deeptail/src/capabilities/audit.ts'
import { createGrantLedger } from '../apps/deeptail/src/capabilities/grants.ts'
import type { PickerKey, Translate } from '../apps/deeptail/src/locales.ts'
import { DICTIONARIES } from '../apps/deeptail/src/locales.ts'
import { clock, deviceGrant, hostGrant, snapshot } from './grant-fixture.ts'

/** A translator over the shipped English dictionary, for the assertions. */
const t: Translate = Object.assign(
  (key: PickerKey, params?: Readonly<Record<string, string | number>>): string => {
    const template = DICTIONARIES.en[key]
    if (params === undefined) return template
    return template.replaceAll(/\{(\w+)\}/gu, (match, name: string): string => {
      const value = params[name]
      return value === undefined ? match : String(value)
    })
  },
  { locale: 'en' as const },
)

/** The facts a control is measured against. */
const facts: Preconditions = { hasHosts: true, hostState: 'online', running: true, tailnetStored: true }

/** The calls a dispatcher run made, in order. */
interface Calls {
  readonly names: string[]
}

/** A dependency set that records what a handler asked for. */
function stubDeps(calls: Calls): ActionDeps {
  const note = (name: string): void => {
    calls.names.push(name)
  }
  // The application's own seams answer with a promise, so the stubs do too —
  // by returning one rather than by being `async`, which would read as work
  // that is pending when a push onto an array is all that happens.
  const noted = (name: string): Promise<void> => {
    note(name)
    return Promise.resolve()
  }
  return {
    hosts: () => [{ id: 'host-a', label: 'Harness', origin: 'https://harness.example' }],
    activeHostId: () => 'host-a',
    tailnetStored: () => true,
    clientBooted: () => true,
    openClient: (_host, sessionId) => noted(`openClient:${sessionId}`),
    pair: (repairing) => note(`pair:${repairing ?? ''}`),
    forget: (hostId) => noted(`forget:${hostId}`),
    select: (hostId) => note(`select:${hostId}`),
    openCompose: (hostId, sessionId) => note(`compose:${hostId}/${sessionId}`),
    openSpawn: () => note('spawn-dialog'),
    returnToFleet: () => noted('return'),
    remount: () => noted('remount'),
    pairFromLink: (link) => noted(`pair-link:${link}`),
    openTailnet: () => note('tailnet'),
    spawn: (hostId) => {
      note(`spawn:${hostId}`)
      return Promise.resolve('session-1')
    },
    message: (_hostId, sessionId, _text, mode) => noted(`message:${sessionId}:${mode}`),
    cancel: (_hostId, sessionId) => noted(`cancel:${sessionId}`),
    connectTailnet: (kind) => noted(`connect:${kind}`),
    forgetTailnet: () => noted('forget-tailnet'),
    setDrawer: (open) => note(`drawer:${String(open)}`),
  }
}

/** What each action is activated with in these cases. */
const ACTIVATION: { readonly [A in ActionId]: ActionInputs[A] } = {
  'boot.retry': undefined,
  'client.return': undefined,
  'drawer.toggle': { open: true },
  'drawer.dismiss': undefined,
  'session.spawn': undefined,
  'connection.pair': undefined,
  'connection.repair': { hostId: 'host-a' },
  'connection.unpair': { hostId: 'host-a' },
  'connection.select': { hostId: 'host-a' },
  'session.open': { hostId: 'host-a', sessionId: 's-1' },
  'session.message': { hostId: 'host-a', sessionId: 's-1', title: 'Untitled session' },
  'session.cancel': { hostId: 'host-a', sessionId: 's-1' },
  'compose.send': { hostId: 'host-a', sessionId: 's-1', text: 'do the thing' },
  'compose.steer': { hostId: 'host-a', sessionId: 's-1', text: 'steer' },
  'spawn.create': { hostId: 'host-a', preset: '', cwd: '' },
  'picker.pair': { link: 'https://h.example/?token=t', label: 'Harness' },
  'picker.tailnet': undefined,
  'tailnet.connect': { kind: 'api', secret: 'tskey-api-1', tailnet: '' },
  'tailnet.forget': undefined,
}

/**
 * The facts a control is measured against, set so its own precondition holds.
 * @param action - the control's registry entry.
 * @returns the facts.
 */
function factsFor(action: ActionDescriptor): Preconditions {
  return { ...facts, hostState: action.availability === 'unauthorized' ? 'unauthorized' : 'online' }
}

/** A ledger holding one live grant of every declared capability. */
function fullLedger(): ReturnType<typeof createGrantLedger> {
  const ledger = createGrantLedger(() => 1_000_000)
  ledger.hydrate(
    snapshot(
      Object.values(CAPABILITIES).map((capability) =>
        capability.subject === 'host' ? hostGrant(capability.id, 'host-a') : deviceGrant(capability.id),
      ),
    ),
  )
  return ledger
}

describe('the dispatcher', () => {
  it('runs every action the registry declares', async () => {
    const calls: Calls = { names: [] }
    const audit = createDenialAudit()
    const dispatcher = createDispatcher(stubDeps(calls), fullLedger(), audit, t)
    // One after another, and deliberately: every action spends from the same
    // ledger and appends to the same call list, so running them at once would
    // measure an order nothing guarantees.
    const refused = await ACTION_IDS.reduce<Promise<string[]>>(
      (chain, id) =>
        chain.then(async (seen) => {
          const outcome = await dispatcher.dispatch(ACTIONS[id], ACTIVATION[id], factsFor(ACTIONS[id]))
          return outcome.kind === 'executed' ? seen : [...seen, `${id}: ${outcome.kind}`]
        }),
      Promise.resolve([]),
    )
    expect(refused).toEqual([])
    expect(calls.names.length).toBeGreaterThanOrEqual(ACTION_LIST.length)
    expect(audit.recent()).toEqual([])
  })
})

describe('the dispatcher’s refusals', () => {
  it('refuses an action whose capability was never issued, and records why', async () => {
    const calls: Calls = { names: [] }
    const audit = createDenialAudit()
    const dispatcher = createDispatcher(
      stubDeps(calls),
      createGrantLedger(() => 1_000_000),
      audit,
      t,
    )
    const outcome = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    expect(outcome.kind).toBe('denied')
    expect(calls.names).toEqual([])
    const [recorded] = audit.recent()
    expect(recorded?.action).toBe('session.cancel')
    expect(recorded?.traceId.length).toBeGreaterThan(8)
  })

  it('tells the operator which grant was missing, in their language', async () => {
    const calls: Calls = { names: [] }
    const dispatcher = createDispatcher(
      stubDeps(calls),
      createGrantLedger(() => 1_000_000),
      createDenialAudit(),
      t,
    )
    const outcome = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    const copy = outcomeCopy(outcome, t)
    expect(copy).toContain('has not granted you this action')
    expect(copy).toContain('Reference')
  })

  it('refuses a control whose own precondition does not hold', async () => {
    const calls: Calls = { names: [] }
    const dispatcher = createDispatcher(stubDeps(calls), fullLedger(), createDenialAudit(), t)
    const outcome = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], {
      ...facts,
      running: false,
    })
    expect(outcome.kind).toBe('unavailable')
    expect(calls.names).toEqual([])
    expect(outcomeCopy(outcome, t)).toBe(DICTIONARIES.en['unavailable.notRunning'])
  })
})

describe('what the dispatcher hands back', () => {
  it('refuses an empty message before it reaches the host', async () => {
    const calls: Calls = { names: [] }
    const dispatcher = createDispatcher(stubDeps(calls), fullLedger(), createDenialAudit(), t)
    const outcome = await dispatcher.dispatch(
      ACTIONS['compose.send'],
      {
        hostId: 'host-a',
        sessionId: 's-1',
        text: '   ',
      },
      facts,
    )
    expect(outcome.kind).toBe('invalid')
    expect(calls.names).toEqual([])
    expect(outcomeCopy(outcome, t)).toBe(DICTIONARIES.en['chat.messageRequired'])
  })

  it('reports a host failure with the host’s own sentence', async () => {
    const calls: Calls = { names: [] }
    const failing: ActionDeps = { ...stubDeps(calls), cancel: () => Promise.reject(new Error('agent busy')) }
    const dispatcher = createDispatcher(failing, fullLedger(), createDenialAudit(), t)
    const outcome = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    expect(outcome.kind === 'invalid' && outcome.reason).toBe('host-refused')
    expect(outcomeCopy(outcome, t)).toBe('agent busy')
  })

  it('spends the grant the moment the control is activated', async () => {
    const calls: Calls = { names: [] }
    const time = clock()
    const ledger = createGrantLedger(time.now)
    ledger.hydrate(snapshot([hostGrant('session.cancel', 'host-a', 1, 1_500_000)]))
    const dispatcher = createDispatcher(stubDeps(calls), ledger, createDenialAudit(), t)
    const soon = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    time.advance(600_000)
    const late = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    expect(soon.kind).toBe('executed')
    expect(late.kind === 'denied' && late.reason).toBe('expired')
  })
})

describe('a handler that fails where it stands', () => {
  it('reports a synchronous throw with the host’s own sentence', async () => {
    // A handler that answers without waiting may throw rather than reject.
    // Called outside the settle, that throw travelled past the account the
    // operator is owed and surfaced as an unhandled rejection instead.
    const calls: Calls = { names: [] }
    const failing: ActionDeps = {
      ...stubDeps(calls),
      openSpawn: () => {
        throw new Error('the dialog would not open')
      },
    }
    const dispatcher = createDispatcher(failing, fullLedger(), createDenialAudit(), t)
    const outcome = await dispatcher.dispatch(ACTIONS['session.spawn'], ACTIVATION['session.spawn'], facts)
    expect(outcome.kind === 'invalid' && outcome.reason).toBe('host-refused')
    expect(outcomeCopy(outcome, t)).toBe('the dialog would not open')
  })
})
