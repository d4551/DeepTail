/**
 * What the dispatcher does with each declared action: one handler per action,
 * the capability spent at the moment of dispatch, and every arm of every
 * outcome named. The registry's own invariants are held in `actions.spec.ts`,
 * and the audit and ledger's own hydration in `capabilities.spec.ts`.
 */

import { describe, expect, it } from 'bun:test'
import type { ActionDeps, ActionInputs, Preconditions } from '../apps/deeptail/src/actions/dispatch.ts'
import { createDispatcher } from '../apps/deeptail/src/actions/dispatch.ts'
import { outcomeCopy } from '../apps/deeptail/src/actions/outcomes.ts'
import type { ActionDescriptor, ActionId } from '../apps/deeptail/src/actions/registry.ts'
import { ACTION_IDS, ACTIONS, CAPABILITIES } from '../apps/deeptail/src/actions/registry.ts'
import { createDenialAudit } from '../apps/deeptail/src/capabilities/audit.ts'
import { createGrantLedger } from '../apps/deeptail/src/capabilities/grants.ts'
import { DICTIONARIES, type PickerKey, type Translate } from '../apps/deeptail/src/locales.ts'
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
const facts: Preconditions = { hasHosts: true, hostState: 'online', running: true }

/** The calls a dispatcher run made, in order. */
type Calls = { readonly names: string[] }

/** A dependency set that records what a handler asked for. */
function recordingDeps(calls: Calls): ActionDeps {
  // The application's own seams answer with a promise, so the recorders do too —
  // by returning one rather than by being `async`, which would read as work
  // that is pending when a push onto an array is all that happens.
  const note = (name: string): void => {
    calls.names.push(name)
  }
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
  'tailnet.connect': { kind: 'api', secret: 'tskey-api-1', tailnet: '', clientId: 'deeptail' },
  'tailnet.forget': undefined,
}

/**
 * What each handler must ask the application for, exactly.
 *
 * A handler that runs and does nothing leaves a dispatch that executes and an
 * outcome that reads as success, so the account of each action is the call it
 * made rather than the fact that it returned. The table is keyed by `ActionId`,
 * which is what makes an action added to the registry a compile error here
 * until its own effect is stated.
 */
const EFFECT: { readonly [A in ActionId]: readonly string[] } = {
  'boot.retry': ['remount'],
  'client.return': ['return'],
  'drawer.toggle': ['drawer:true'],
  'drawer.dismiss': ['drawer:false'],
  'session.spawn': ['spawn-dialog'],
  'connection.pair': ['pair:'],
  'connection.repair': ['pair:host-a'],
  'connection.unpair': ['forget:host-a'],
  'connection.select': ['select:host-a'],
  'session.open': ['openClient:s-1'],
  'session.message': ['compose:host-a/s-1'],
  'session.cancel': ['cancel:s-1'],
  'compose.send': ['message:s-1:queue'],
  'compose.steer': ['message:s-1:steer'],
  'spawn.create': ['spawn:host-a'],
  'picker.pair': ['pair-link:https://h.example/?token=t'],
  'picker.tailnet': ['tailnet'],
  'tailnet.connect': ['connect:api'],
  'tailnet.forget': ['forget-tailnet'],
}

/** The facts a control is measured against, set so its own precondition holds. */
function factsFor(action: ActionDescriptor): Preconditions {
  return { ...facts, hostState: action.availability === 'unauthorized' ? 'unauthorized' : 'online' }
}

/** A ledger holding one live grant of every declared capability. */
function fullLedger(): ReturnType<typeof createGrantLedger> {
  const grants = Object.values(CAPABILITIES).map((capability) =>
    capability.subject === 'host' ? hostGrant(capability.id, 'host-a') : deviceGrant(capability.id),
  )
  const ledger = createGrantLedger(() => 1_000_000)
  ledger.hydrate(snapshot(grants))
  return ledger
}

describe('the dispatcher', () => {
  it('runs every action the registry declares, and asks for what its handler promises', async () => {
    const calls: Calls = { names: [] }
    const audit = createDenialAudit()
    const dispatcher = createDispatcher(recordingDeps(calls), fullLedger(), audit, t)
    // One after another, and deliberately: every action spends from the same
    // ledger and appends to the same call list, so running them at once would
    // measure an order nothing guarantees.
    const refused = await ACTION_IDS.reduce<Promise<string[]>>(
      (chain, id) =>
        chain.then(async (seen) => {
          const before = calls.names.length
          const outcome = await dispatcher.dispatch(ACTIONS[id], ACTIVATION[id], factsFor(ACTIONS[id]))
          if (outcome.kind !== 'executed') return [...seen, `${id}: ${outcome.kind}`]
          const made = calls.names.slice(before)
          if (made.join('|') === EFFECT[id].join('|')) return seen
          return [...seen, `${id}: asked for ${made.join(', ') || 'nothing'}, where ${EFFECT[id].join(', ')} is what the action is`]
        }),
      Promise.resolve([]),
    )
    expect(refused).toEqual([])
    expect(audit.recent()).toEqual([])
  })
})

describe('the dispatcher’s refusals', () => {
  it('refuses an action whose capability was never issued, and records why', async () => {
    const calls: Calls = { names: [] }
    const audit = createDenialAudit()
    const empty = createGrantLedger(() => 1_000_000)
    const dispatcher = createDispatcher(recordingDeps(calls), empty, audit, t)
    const outcome = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    expect(outcome.kind).toBe('denied')
    expect(calls.names).toEqual([])
    const [recorded] = audit.recent()
    expect(recorded?.action).toBe('session.cancel')
    expect(recorded?.traceId.length).toBeGreaterThan(8)
  })

  it('tells the operator which grant was missing, in their language', async () => {
    const calls: Calls = { names: [] }
    const empty = createGrantLedger(() => 1_000_000)
    const dispatcher = createDispatcher(recordingDeps(calls), empty, createDenialAudit(), t)
    const outcome = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    const copy = outcomeCopy(outcome, t)
    expect(copy).toContain('has not granted you this action')
    expect(copy).toContain('Reference')
  })

  it('refuses a control whose own precondition does not hold', async () => {
    const calls: Calls = { names: [] }
    const dispatcher = createDispatcher(recordingDeps(calls), fullLedger(), createDenialAudit(), t)
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
    const dispatcher = createDispatcher(recordingDeps(calls), fullLedger(), createDenialAudit(), t)
    const blank = { hostId: 'host-a', sessionId: 's-1', text: '   ' }
    const outcome = await dispatcher.dispatch(ACTIONS['compose.send'], blank, facts)
    expect(outcome.kind).toBe('invalid')
    expect(calls.names).toEqual([])
    expect(outcomeCopy(outcome, t)).toBe(DICTIONARIES.en['chat.messageRequired'])
  })

  it('reports a host failure with the host’s own sentence', async () => {
    const calls: Calls = { names: [] }
    const failing: ActionDeps = { ...recordingDeps(calls), cancel: () => Promise.reject(new Error('agent busy')) }
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
    const dispatcher = createDispatcher(recordingDeps(calls), ledger, createDenialAudit(), t)
    const soon = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    time.advance(600_000)
    const late = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    expect(soon.kind).toBe('executed')
    expect(late.kind === 'denied' && late.reason).toBe('expired')
  })
})

describe('a handler that fails where it stands', () => {
  it('reports a synchronous throw with the host’s own sentence', async () => {
    // A handler that answers without waiting may throw rather than reject; a call
    // made outside the settle would surface that throw unhandled instead.
    const calls: Calls = { names: [] }
    const failing: ActionDeps = {
      ...recordingDeps(calls),
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

describe('the copy each outcome is shown with', () => {
  it('hands an executed outcome its announcement, and says nothing without one', async () => {
    const calls: Calls = { names: [] }
    const dispatcher = createDispatcher(recordingDeps(calls), fullLedger(), createDenialAudit(), t)
    const announced = await dispatcher.dispatch(ACTIONS['spawn.create'], ACTIVATION['spawn.create'], facts)
    const silent = await dispatcher.dispatch(ACTIONS['drawer.toggle'], ACTIVATION['drawer.toggle'], facts)
    expect(announced.kind).toBe('executed')
    expect(silent.kind).toBe('executed')
    expect(outcomeCopy(announced, t)).toBe('Created a session on Harness.')
    expect(outcomeCopy(silent, t)).toBeUndefined()
  })

  it('names what the page is not wired to, in the operator’s language', async () => {
    const calls: Calls = { names: [] }
    const unbooted: ActionDeps = { ...recordingDeps(calls), clientBooted: () => false }
    const dispatcher = createDispatcher(unbooted, fullLedger(), createDenialAudit(), t)
    const outcome = await dispatcher.dispatch(ACTIONS['client.return'], ACTIVATION['client.return'], facts)
    expect(outcome.kind === 'unwired' && outcome.reason).toBe('no-booted-client')
    expect(calls.names).toEqual([])
    expect(outcomeCopy(outcome, t)).toBe(DICTIONARIES.en['unwired.noClient'])
  })
})
