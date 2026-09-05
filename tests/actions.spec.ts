/**
 * The action registry and the dispatcher that runs what it declares.
 *
 * These are the two pieces every control in the product runs through, so what is
 * asserted here is that they cannot drift apart: the generated faces are
 * compared byte for byte against what the registry says they must be, every
 * declared action is driven end to end through the dispatcher, and a refusal is
 * checked to be a refusal the operator is told about rather than a silent
 * return.
 */

import { describe, expect, it } from 'bun:test'
import { emitRust, emitTypeScript } from '../scripts/action-registry-emit.ts'
import { readRegistry } from '../scripts/action-registry.ts'
import {
  ACTIONS,
  ACTION_IDS,
  ACTION_LIST,
  type ActionDescriptor,
  type ActionId,
  isCapabilityId,
} from '../apps/deeptail/src/actions/registry.ts'
import {
  createDispatcher,
  type ActionDeps,
  type ActionInputs,
  type Preconditions,
} from '../apps/deeptail/src/actions/dispatch.ts'
import { outcomeCopy } from '../apps/deeptail/src/actions/outcomes.ts'
import { createGrantLedger } from '../apps/deeptail/src/capabilities/grants.ts'
import { createDenialAudit } from '../apps/deeptail/src/capabilities/audit.ts'
import { DICTIONARIES } from '../apps/deeptail/src/locales.ts'
import type { PickerKey, Translate } from '../apps/deeptail/src/locales.ts'
import { repositoryFiles, ROOT } from '../scripts/source-tree.ts'
import { clock, deviceGrant, hostGrant, snapshot } from './grant-fixture.ts'

/** The registry as it ships. */
const registry = readRegistry(await Bun.file(`${ROOT}apps/deeptail/src/actions/actions.bao`).text())

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

/** The smallest registry the reader accepts. */
const MINIMAL = `{
  "version": 1,
  "capabilities": [{ "id": "host.read", "subject": "device", "ttlSeconds": 900 }],
  "placements": [{ "id": "boot", "surface": "The page before a shell exists." }],
  "actions": [{
    "id": "boot.retry",
    "capability": "host.read",
    "placement": "boot",
    "kind": "query",
    "pane": "none",
    "marker": "boot-retry",
    "availability": "always",
    "lane": "tests/actions.spec.ts"
  }]
}`

describe('the action registry', () => {
  it('is what the generated faces say, byte for byte', async () => {
    const faces: readonly (readonly [string, string])[] = [
      ['apps/deeptail/src/actions/registry.ts', emitTypeScript(registry)],
      ['apps/deeptail/src-tauri/src/capability/catalog.rs', emitRust(registry)],
    ]
    const drifted: string[] = []
    for (const [path, written] of faces) {
      if ((await Bun.file(`${ROOT}${path}`).text()) !== written) drifted.push(path)
    }
    expect(drifted).toEqual([])
  })

  it('names a lane that exists for every action', async () => {
    const absent: string[] = []
    for (const action of registry.actions) {
      if (!(await Bun.file(`${ROOT}${action.lane}`).exists())) absent.push(`${action.id}: ${action.lane}`)
    }
    expect(absent).toEqual([])
  })

  it('prices every action in a capability the registry declares', () => {
    const undeclared = registry.actions
      .map((action) => action.capability)
      .filter((capability) => !isCapabilityId(capability))
    expect(undeclared).toEqual([])
  })

  it('refuses a document that carries a key the schema does not name', () => {
    const stray = MINIMAL.replace('"pane": "none",', '"pane": "none", "colour": "blue",')
    expect(() => readRegistry(MINIMAL)).not.toThrow()
    expect(() => readRegistry(stray)).toThrow(/colour/u)
  })

  it('refuses an action that points at a capability nobody declared', () => {
    const dangling = MINIMAL.replace('"capability": "host.read"', '"capability": "host.teleport"')
    expect(() => readRegistry(dangling)).toThrow(/host\.teleport/u)
  })

  it('refuses a placement that holds nothing', () => {
    const withEmptySeat = MINIMAL.replace(
      '{ "id": "boot", "surface": "The page before a shell exists." }',
      '{ "id": "boot", "surface": "The page before a shell exists." }, { "id": "unused", "surface": "Nothing sits here." }',
    )
    expect(() => readRegistry(withEmptySeat)).toThrow(/placement "unused" carries no action/u)
  })

  it('writes no marker as a literal anywhere the page builds a control', async () => {
    // Every control takes its marker from the registry, so a control that is
    // not in the registry cannot be drawn at all.
    const sources = repositoryFiles(['.ts']).filter(
      (file) => file.label.startsWith('apps/deeptail/src/') && !file.label.endsWith('registry.ts'),
    )
    const literals: string[] = []
    for (const file of sources) {
      const text = await Bun.file(file.path).text()
      for (const found of text.matchAll(/deeptailAction\s*=\s*'/gu)) literals.push(`${file.label}:${String(found.index)}`)
    }
    expect(literals).toEqual([])
  })
})

/** The calls a dispatcher run made, in order. */
interface Calls {
  readonly names: string[]
}

/** A dependency set that records what a handler asked for. */
function stubDeps(calls: Calls): ActionDeps {
  const note = (name: string): void => {
    calls.names.push(name)
  }
  return {
    hosts: () => [{ id: 'host-a', label: 'Harness', origin: 'https://harness.example' }],
    activeHostId: () => 'host-a',
    tailnetStored: () => true,
    clientBooted: () => true,
    openClient: async (_host, sessionId) => note(`openClient:${sessionId}`),
    pair: (repairing) => note(`pair:${repairing ?? ''}`),
    forget: async (hostId) => note(`forget:${hostId}`),
    select: (hostId) => note(`select:${hostId}`),
    openCompose: (hostId, sessionId) => note(`compose:${hostId}/${sessionId}`),
    openSpawn: () => note('spawn-dialog'),
    returnToFleet: async () => note('return'),
    remount: async () => note('remount'),
    pairFromLink: async (link) => note(`pair-link:${link}`),
    openTailnet: () => note('tailnet'),
    spawn: async (hostId) => {
      note(`spawn:${hostId}`)
      return 'session-1'
    },
    message: async (_hostId, sessionId, _text, mode) => note(`message:${sessionId}:${mode}`),
    cancel: async (_hostId, sessionId) => note(`cancel:${sessionId}`),
    connectTailnet: async (kind) => note(`connect:${kind}`),
    forgetTailnet: async () => note('forget-tailnet'),
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
      registry.capabilities.map((capability) =>
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
    const refused: string[] = []
    for (const id of ACTION_IDS) {
      const outcome = await dispatcher.dispatch(ACTIONS[id], ACTIVATION[id], factsFor(ACTIONS[id]))
      if (outcome.kind !== 'executed') refused.push(`${id}: ${outcome.kind}`)
    }
    expect(refused).toEqual([])
    expect(calls.names.length).toBeGreaterThanOrEqual(ACTION_LIST.length)
    expect(audit.recent()).toEqual([])
  })

  it('refuses an action whose capability was never issued, and records why', async () => {
    const calls: Calls = { names: [] }
    const audit = createDenialAudit()
    const dispatcher = createDispatcher(stubDeps(calls), createGrantLedger(() => 1_000_000), audit, t)
    const outcome = await dispatcher.dispatch(ACTIONS['session.cancel'], ACTIVATION['session.cancel'], facts)
    expect(outcome.kind).toBe('denied')
    expect(calls.names).toEqual([])
    const [recorded] = audit.recent()
    expect(recorded?.action).toBe('session.cancel')
    expect(recorded?.traceId.length).toBeGreaterThan(8)
  })

  it('tells the operator which grant was missing, in their language', async () => {
    const calls: Calls = { names: [] }
    const dispatcher = createDispatcher(stubDeps(calls), createGrantLedger(() => 1_000_000), createDenialAudit(), t)
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

  it('refuses an empty message before it reaches the host', async () => {
    const calls: Calls = { names: [] }
    const dispatcher = createDispatcher(stubDeps(calls), fullLedger(), createDenialAudit(), t)
    const outcome = await dispatcher.dispatch(ACTIONS['compose.send'], {
      hostId: 'host-a',
      sessionId: 's-1',
      text: '   ',
    }, facts)
    expect(outcome.kind).toBe('invalid')
    expect(calls.names).toEqual([])
    expect(outcomeCopy(outcome, t)).toBe(DICTIONARIES.en['chat.messageRequired'])
  })

  it('reports a host failure with the host’s own sentence', async () => {
    const calls: Calls = { names: [] }
    const failing: ActionDeps = { ...stubDeps(calls), cancel: async () => Promise.reject(new Error('agent busy')) }
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
