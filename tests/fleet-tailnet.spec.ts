/**
 * The tailnet half of the picker's engine.
 *
 * Connecting a tailnet, listing it, forgetting it, and handing one machine to
 * the pairing form. What is decided here is which screen a viewer lands on: a
 * stored credential goes straight to the machines, and one that has since been
 * revoked has to land back on the form carrying Tailscale's own refusal —
 * which is the only thing distinguishing it from a tailnet with no machines in
 * it.
 *
 * Listing a tailnet is not pairing, so choosing a machine opens the pairing
 * form for it with the origin already settled and the machine's own hostname
 * filled in.
 */

import { describe, expect, it } from 'bun:test'
import {
  connectPhase,
  connectTailnet,
  forgetTailnet,
  openTailnet,
  type TailnetRuntime,
  tailnetPairingPhase,
} from '../apps/deeptail/src/fleet-tailnet.ts'
import type { HostRecord } from '../apps/deeptail/src/host.ts'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import type { Phase } from '../apps/deeptail/src/picker-screen.ts'
import { EMPTY_TAILNET_DRAFT, type TailnetDraft } from '../apps/deeptail/src/picker-tailnet.ts'
import type { TailnetCredential, TailnetHost, TailnetPorts } from '../apps/deeptail/src/tailscale.ts'

/** The roster every flow here is opened over. */
const HOSTS: readonly HostRecord[] = [{ id: 'a', label: 'Alpha', origin: 'https://alpha.ts.net' }]

/** One machine on the tailnet, as the native side reports one. */
const DEVICE: TailnetHost = {
  id: 'd1',
  label: 'box',
  origin: 'https://box.ts.net',
  os: 'linux',
  lastSeen: '2026-09-08T10:00:00Z',
  tags: ['tag:server'],
  authorized: true,
  paired: false,
}

/** What one run of a tailnet flow did. */
interface Run {
  readonly phases: Phase[]
  readonly asked: string[]
  readonly credentials: { credential: TailnetCredential; tailnet: string | undefined }[]
}

/** What the tailnet answers, one arm per call the flow makes. */
interface Answers {
  readonly connected?: Promise<boolean>
  readonly connect?: Promise<readonly TailnetHost[]>
  readonly devices?: Promise<readonly TailnetHost[]>
  readonly forget?: Promise<void>
}

/**
 * A runtime whose tailnet answers as told, watching what the flow asked it.
 * @param answers - what each call answers with.
 * @returns the runtime and the record of what it was asked.
 */
function runtimeOf(answers: Answers): { run: TailnetRuntime; record: Run } {
  const record: Run = { phases: [], asked: [], credentials: [] }
  const tailnet: TailnetPorts = {
    connected: () => {
      record.asked.push('connected')
      return answers.connected ?? Promise.resolve(false)
    },
    connect: (credential, name) => {
      record.asked.push('connect')
      record.credentials.push({ credential, tailnet: name })
      return answers.connect ?? Promise.resolve([])
    },
    devices: (name) => {
      record.asked.push('devices')
      record.credentials.push({ credential: { kind: 'apiKey', key: '' }, tailnet: name })
      return answers.devices ?? Promise.resolve([])
    },
    forget: () => {
      record.asked.push('forget')
      return answers.forget ?? Promise.resolve()
    },
  }
  return { run: { tailnet, t: createTranslate('en'), toPhase: (next) => record.phases.push(next) }, record }
}

/** A draft carrying an API key. */
function keyDraft(key: string, tailnet = ''): TailnetDraft {
  return { ...EMPTY_TAILNET_DRAFT, key, tailnet }
}

describe('the connect phase', () => {
  it('carries a refusal only when there is one', () => {
    expect(connectPhase(HOSTS, EMPTY_TAILNET_DRAFT, false)).toEqual({
      kind: 'tailnetConnect',
      hosts: HOSTS,
      busy: false,
      draft: EMPTY_TAILNET_DRAFT,
    })
    expect(connectPhase(HOSTS, EMPTY_TAILNET_DRAFT, true, 'no')).toEqual({
      kind: 'tailnetConnect',
      hosts: HOSTS,
      busy: true,
      draft: EMPTY_TAILNET_DRAFT,
      error: 'no',
    })
    // Absent rather than present and empty: `exactOptionalPropertyTypes` makes
    // those two shapes, and the form draws an empty strip for the second.
    expect(Object.keys(connectPhase(HOSTS, EMPTY_TAILNET_DRAFT, false)).toSorted()).toEqual([
      'busy',
      'draft',
      'hosts',
      'kind',
    ])
  })
})

describe('opening the tailnet', () => {
  it('goes straight to the machines when a credential is stored', async () => {
    const { run, record } = runtimeOf({ connected: Promise.resolve(true), devices: Promise.resolve([DEVICE]) })
    await openTailnet(run, HOSTS)
    expect(record.asked).toEqual(['connected', 'devices'])
    expect(record.phases).toEqual([{ kind: 'tailnet', hosts: HOSTS, devices: [DEVICE] }])
  })

  it('opens the connect form when nothing is stored, without asking for machines', async () => {
    const { run, record } = runtimeOf({ connected: Promise.resolve(false) })
    await openTailnet(run, HOSTS)
    expect(record.asked).toEqual(['connected'])
    expect(record.phases).toEqual([connectPhase(HOSTS, EMPTY_TAILNET_DRAFT, false)])
  })

  it('opens the connect form when the stored credential cannot even be read', async () => {
    const { run, record } = runtimeOf({ connected: Promise.reject(new Error('no store')) })
    await openTailnet(run, HOSTS)
    expect(record.phases).toEqual([connectPhase(HOSTS, EMPTY_TAILNET_DRAFT, false)])
  })

  it('says why when a stored credential no longer lists the tailnet', async () => {
    // Otherwise a revoked credential is indistinguishable from a tailnet with
    // no machines on it, and the viewer is shown an empty list to stare at.
    const { run, record } = runtimeOf({
      connected: Promise.resolve(true),
      devices: Promise.reject(new Error('401 from Tailscale')),
    })
    await openTailnet(run, HOSTS)
    expect(record.phases).toEqual([
      connectPhase(HOSTS, EMPTY_TAILNET_DRAFT, false, 'Could not read the tailnet machines: 401 from Tailscale'),
    ])
  })
})

describe('connecting a tailnet', () => {
  it('refuses a draft that is missing what its credential kind needs', async () => {
    const { run, record } = runtimeOf({})
    await connectTailnet(run, HOSTS, keyDraft('   '))
    expect(record.asked).toEqual([])
    expect(record.phases).toEqual([
      connectPhase(HOSTS, keyDraft('   '), false, 'Fill in every field this credential needs.'),
    ])
  })

  it('shows the attempt in flight, then the machines it listed', async () => {
    const { run, record } = runtimeOf({ connect: Promise.resolve([DEVICE]) })
    await connectTailnet(run, HOSTS, keyDraft('tskey-abc'))
    expect(record.phases).toEqual([
      connectPhase(HOSTS, keyDraft('tskey-abc'), true),
      { kind: 'tailnet', hosts: HOSTS, devices: [DEVICE] },
    ])
    expect(record.credentials).toEqual([{ credential: { kind: 'apiKey', key: 'tskey-abc' }, tailnet: undefined }])
  })

  it('names the tailnet the viewer typed, and none when the field is blank', async () => {
    const { run, record } = runtimeOf({ connect: Promise.resolve([]) })
    await connectTailnet(run, HOSTS, keyDraft('tskey-abc', '  example.com  '))
    expect(record.credentials).toEqual([{ credential: { kind: 'apiKey', key: 'tskey-abc' }, tailnet: 'example.com' }])
  })

  it('shows the form again with what was typed when the tailnet refuses', async () => {
    // The native side lists before it stores, so a refusal means nothing was
    // written and the draft is still the thing to correct.
    const { run, record } = runtimeOf({ connect: Promise.reject(new Error('403')) })
    await connectTailnet(run, HOSTS, keyDraft('tskey-abc'))
    expect(record.phases.at(-1)).toEqual(
      connectPhase(HOSTS, keyDraft('tskey-abc'), false, 'Could not list the tailnet: 403'),
    )
  })
})

describe('forgetting the tailnet', () => {
  it('drops the credential and returns to the roster', async () => {
    const { run, record } = runtimeOf({})
    await forgetTailnet(run, HOSTS)
    expect(record.asked).toEqual(['forget'])
    expect(record.phases).toEqual([{ kind: 'ready', hosts: HOSTS }])
  })

  it('returns to the roster even when the credential could not be dropped', async () => {
    // Paired hosts each hold their own device token and none was reached
    // through this credential, so there is nothing here to strand a viewer on.
    const { run, record } = runtimeOf({ forget: Promise.reject(new Error('no store')) })
    await forgetTailnet(run, HOSTS)
    expect(record.phases).toEqual([{ kind: 'ready', hosts: HOSTS }])
  })
})

describe('choosing a machine', () => {
  it('opens the pairing form on that machine, named after it and asking for a token', () => {
    expect(tailnetPairingPhase(HOSTS, DEVICE)).toEqual({
      kind: 'pairing',
      hosts: HOSTS,
      busy: false,
      origin: 'https://box.ts.net',
      draft: { link: '', label: 'box' },
    })
  })
})
