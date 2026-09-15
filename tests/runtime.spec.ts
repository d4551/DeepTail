/**
 * The live action plane: one ledger, one dispatcher, and the slots chrome
 * fills in as each surface mounts.
 *
 * A slot reached before the surface that owns it mounted is a control acting
 * where nothing owns the work, so every slot throws with its own name until it
 * is bound, and the pairing hand-off refuses to hand back what was never
 * remembered.
 */

import { describe, expect, it } from 'bun:test'
import { ACTIONS } from '../apps/deeptail/src/actions/registry.ts'
import { createGrantLedger } from '../apps/deeptail/src/capabilities/grants.ts'
import type { HostRecord } from '../apps/deeptail/src/host.ts'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import { createAppRuntime, presentOutcome, runAction } from '../apps/deeptail/src/runtime.ts'

/** The copy source every case reads through. */
const t = createTranslate('en')

/** A host the pairing hand-off remembers. */
const paired: HostRecord = { id: 'host-a', label: 'Harness', origin: 'https://harness.example' }

/**
 * A runtime whose `shell.navigate` grant is live, so the chrome's own actions
 * spend for real.
 * @returns the runtime.
 */
function grantedRuntime(): ReturnType<typeof createAppRuntime> {
  const ledger = createGrantLedger()
  ledger.hydrate({
    issuer: 'native',
    context: 'unit',
    grants: [{ capability: 'shell.navigate', subject: 'device', revision: 1, expiresAt: Date.now() + 60_000 }],
  })
  return createAppRuntime(t, ledger)
}

describe('the plane’s unbound slots', () => {
  it('throw with the slot’s own name, so a mis-wired surface names itself', () => {
    const runtime = createAppRuntime(t, createGrantLedger())
    const slots: readonly (readonly [string, () => unknown])[] = [
      ['hosts', () => runtime.deps.hosts()],
      ['activeHostId', () => runtime.deps.activeHostId()],
      ['clientBooted', () => runtime.deps.clientBooted()],
      ['openClient', () => runtime.deps.openClient(paired, 's-1')],
      ['pair', () => runtime.deps.pair()],
      ['forget', () => runtime.deps.forget('host-a')],
      ['select', () => runtime.deps.select('host-a')],
      ['returnToFleet', () => runtime.deps.returnToFleet()],
      ['remount', () => runtime.deps.remount()],
      ['setDrawer', () => runtime.deps.setDrawer(true)],
      ['openSpawn', () => runtime.deps.openSpawn()],
      ['openCompose', () => runtime.deps.openCompose('host-a', 's-1', 'Untitled session')],
      ['spawn', () => runtime.deps.spawn('host-a', '', '')],
      ['message', () => runtime.deps.message('host-a', 's-1', 'hello', 'queue')],
      ['cancel', () => runtime.deps.cancel('host-a', 's-1')],
      ['tailnetStored', () => runtime.deps.tailnetStored()],
      ['pairFromLink', () => runtime.deps.pairFromLink('https://h.example/?token=t', 'Harness')],
      ['openTailnet', () => runtime.deps.openTailnet()],
      ['connectTailnet', () => runtime.deps.connectTailnet('apiKey', 'tskey-api-1', '', 'deeptail')],
      ['forgetTailnet', () => runtime.deps.forgetTailnet()],
    ]
    for (const [name, call] of slots) {
      expect(call).toThrow(`deeptail: action plane missing ${name}`)
    }
  })
})

describe('the pairing hand-off', () => {
  it('hands back the host the last pairing produced', () => {
    const runtime = createAppRuntime(t, createGrantLedger())
    runtime.rememberPaired(paired)
    expect(runtime.takePaired()).toBe(paired)
  })

  it('refuses to hand back what was never remembered', () => {
    const runtime = createAppRuntime(t, createGrantLedger())
    expect(() => runtime.takePaired()).toThrow('deeptail: pair produced no host')
  })
})

describe('telling an outcome', () => {
  it('announces an executed outcome that carries an announcement', () => {
    const said: string[] = []
    presentOutcome({ kind: 'executed', traceId: 't-1', announce: 'Created a session.' }, t, {
      announce: (text) => said.push(text),
      fail: (text) => said.push(`fail: ${text}`),
    })
    expect(said).toEqual(['Created a session.'])
  })

  it('says nothing for an executed outcome that carries none', () => {
    const said: string[] = []
    presentOutcome({ kind: 'executed', traceId: 't-1' }, t, {
      announce: (text) => said.push(text),
      fail: (text) => said.push(`fail: ${text}`),
    })
    expect(said).toEqual([])
  })

  it('tells a refusal where the failure lands, in the operator’s language', () => {
    const said: string[] = []
    presentOutcome({ kind: 'unavailable', traceId: 't-1', reason: 'not-running' }, t, {
      fail: (text) => said.push(text),
    })
    expect(said).toEqual(['That session has no turn running right now.'])
  })

  it('tells the host’s own account of a failure the host raised', () => {
    const said: string[] = []
    presentOutcome({ kind: 'invalid', traceId: 't-1', reason: 'host-refused', message: 'the host gave up' }, t, {
      fail: (text) => said.push(text),
    })
    expect(said).toEqual(['the host gave up'])
  })
})

describe('running one action', () => {
  it('presents the outcome the dispatcher answers with', async () => {
    const runtime = grantedRuntime()
    const said: string[] = []
    runtime.deps.setDrawer = () => {
      said.push('drawer moved')
    }
    runAction(
      runtime,
      ACTIONS['drawer.toggle'],
      { open: true },
      { hasHosts: false, hostState: 'unknown', running: false },
      {
        announce: (text) => said.push(text),
        fail: (text) => said.push(`fail: ${text}`),
      },
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(said).toEqual(['drawer moved'])
  })

  it('presents a refusal the plane answers with', async () => {
    const runtime = grantedRuntime()
    const said: string[] = []
    runAction(
      runtime,
      ACTIONS['session.cancel'],
      { hostId: 'host-a', sessionId: 's-1' },
      { hasHosts: true, hostState: 'online', running: false },
      {
        fail: (text) => said.push(text),
      },
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(said).toEqual(['That session has no turn running right now.'])
  })
})
