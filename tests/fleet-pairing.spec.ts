/**
 * Pairing, from what a viewer typed to the host the picker settles on.
 *
 * Two paths land in one command: a pasted link carries its own origin, and a
 * machine chosen from the tailnet already has one so the viewer supplies the
 * token alone. What is decided here is the refusal a viewer reads, the label a
 * host is listed under, and whether a failed attempt keeps what was typed —
 * a mistyped link has to be correctable rather than re-pasted.
 *
 * The browser refuses a malformed `type="url"` in a bubble this product neither
 * wrote nor translated, and the submit never runs, so the form's own strip
 * stayed empty for exactly the paste that needed it. Constraint validation is
 * off; these are the refusals that replaced it.
 */

import { describe, expect, it } from 'bun:test'
import { type PairingRuntime, pairAndFinish } from '../apps/deeptail/src/fleet-pairing.ts'
import type { HostRecord } from '../apps/deeptail/src/host.ts'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import type { PairDraft } from '../apps/deeptail/src/picker-pair-form.ts'
import type { Phase } from '../apps/deeptail/src/picker-screen.ts'

/** The roster the form is opened over. */
const HOSTS: readonly HostRecord[] = [{ id: 'a', label: 'Alpha', origin: 'https://alpha.ts.net' }]

/** The host a successful attempt settles on. */
const PAIRED: HostRecord = { id: 'b', label: 'Beta', origin: 'https://beta.ts.net' }

/** What one run of the pairing command did. */
interface Run {
  /** Every phase the picker was moved to, in order. */
  readonly phases: Phase[]
  /** Every pairing attempt, as the command made it. */
  readonly attempts: { link: string; label: string }[]
  /** The host it finished with, when it finished. */
  readonly finished: HostRecord[]
}

/**
 * Run the pairing command against a picker this suite watches.
 * @param typed - what the viewer typed.
 * @param answer - what the pairing command answers with.
 * @param origin - the chosen machine's origin, on the tailnet path.
 * @returns what the run did.
 */
async function run(typed: PairDraft, answer: Promise<HostRecord>, origin?: string): Promise<Run> {
  const record: Run = { phases: [], attempts: [], finished: [] }
  const runtime: PairingRuntime = {
    pairHost: (link, label) => {
      record.attempts.push({ link, label })
      return answer
    },
    t: createTranslate('en'),
    toPhase: (next) => record.phases.push(next),
    finish: (host) => record.finished.push(host),
  }
  await (origin === undefined ? pairAndFinish(runtime, HOSTS, typed) : pairAndFinish(runtime, HOSTS, typed, origin))
  return record
}

/** A draft as the form hands one over. */
function draft(link: string, label = 'Beta'): PairDraft {
  return { link, label }
}

describe('what a viewer typed', () => {
  it('is refused as empty, in the words of the path it was typed on', async () => {
    // The two paths ask for different things, so an empty field means two
    // different corrections and cannot share one sentence.
    const pasted = await run(draft('   '), Promise.resolve(PAIRED))
    expect(pasted.phases).toEqual([
      { kind: 'pairing', hosts: HOSTS, busy: false, draft: draft('   '), error: 'Paste the whole link.' },
    ])
    const tokenless = await run(draft(''), Promise.resolve(PAIRED), 'https://box.ts.net')
    expect(tokenless.phases).toEqual([
      {
        kind: 'pairing',
        hosts: HOSTS,
        busy: false,
        draft: draft(''),
        error: 'Paste the token that host printed.',
        origin: 'https://box.ts.net',
      },
    ])
  })

  it('is refused as incomplete when it is not a whole link', async () => {
    const typed = await run(draft('paste me'), Promise.resolve(PAIRED))
    expect(typed.phases).toEqual([
      {
        kind: 'pairing',
        hosts: HOSTS,
        busy: false,
        draft: draft('paste me'),
        error: 'That is not a whole link. Paste the entire line dsh web printed.',
      },
    ])
    expect(typed.attempts).toEqual([])
  })

  it('is kept in place by every refusal, so it is corrected rather than re-pasted', async () => {
    const typed = draft('  not a link  ', '  ')
    const refused = await run(typed, Promise.resolve(PAIRED))
    expect(refused.phases.map((phase) => ('draft' in phase ? phase.draft : undefined))).toEqual([typed])
  })
})

describe('an attempt the host answers', () => {
  it('pairs the whole link that was pasted, under the name that was typed', async () => {
    const paired = await run(draft('https://box.ts.net/?token=abc', ' Box '), Promise.resolve(PAIRED))
    expect(paired.attempts).toEqual([{ link: 'https://box.ts.net/?token=abc', label: 'Box' }])
    expect(paired.finished).toEqual([PAIRED])
  })

  it('composes the link from the chosen machine and the token on the tailnet path', async () => {
    const paired = await run(draft('tok en&1'), Promise.resolve(PAIRED), 'https://box.ts.net/')
    expect(paired.attempts).toEqual([{ link: 'https://box.ts.net/?token=tok+en%261', label: 'Beta' }])
    expect(paired.finished).toEqual([PAIRED])
  })

  it('lists a host left unnamed as Harness, because it has to be listed as something', async () => {
    const paired = await run(draft('https://box.ts.net/?token=abc', '   '), Promise.resolve(PAIRED))
    expect(paired.attempts).toEqual([{ link: 'https://box.ts.net/?token=abc', label: 'Harness' }])
  })

  it('shows the attempt in flight before it settles, and finishes with the host', async () => {
    const paired = await run(draft('https://box.ts.net/?token=abc'), Promise.resolve(PAIRED))
    expect(paired.phases).toEqual([
      { kind: 'pairing', hosts: HOSTS, busy: true, draft: draft('https://box.ts.net/?token=abc') },
    ])
    expect(paired.finished).toEqual([PAIRED])
  })
})

describe('an attempt the host refuses', () => {
  it('says why, keeps the draft, and leaves the form open', async () => {
    const refused = await run(
      draft('https://box.ts.net/?token=abc'),
      Promise.reject(new Error('no such host')),
      'https://box.ts.net/',
    )
    expect(refused.phases.at(-1)).toEqual({
      kind: 'pairing',
      hosts: HOSTS,
      busy: false,
      draft: draft('https://box.ts.net/?token=abc'),
      error: 'Pairing failed: no such host',
      origin: 'https://box.ts.net/',
    })
    expect(refused.finished).toEqual([])
  })
})
