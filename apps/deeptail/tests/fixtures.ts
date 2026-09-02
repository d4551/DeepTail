/**
 * Fixtures shared by every browser suite.
 *
 * One definition of the hosts and sessions the specs assert on, so a change to
 * a label or a title cannot leave one suite asserting against a shape no other
 * suite still produces.
 */

import type { AnswerTable } from './harness.ts'

/** Two paired hosts, as the native registry reports them. */
export const HOSTS = [
  { id: 'dev-1', label: 'Workstation', origin: 'https://harness.local:3080' },
  { id: 'lab-2', label: 'Lab box', origin: 'https://lab.internal:3080' },
]

/**
 * The instant every fixture is dated from, and the one the page is told it is.
 *
 * A fixed value rather than `Date.now()`: the ages below are rendered relative
 * to the clock, and a suite that takes minutes moved a fixture across a bucket
 * boundary partway through, so a screenshot of the same screen differed between
 * runs for no reason in the product.
 */
const FIXTURE_NOW = Date.UTC(2026, 8, 2, 12, 0, 0)

/** One running session and one idle one, newest activity first. */
export const SESSIONS = [
  {
    sessionId: 's-running',
    updatedAt: FIXTURE_NOW - 30_000,
    running: true,
    blank: false,
    projections: { values: { title: 'Refactor the loader' } },
  },
  {
    sessionId: 's-idle',
    updatedAt: FIXTURE_NOW - 3_600_000,
    running: false,
    blank: false,
    projections: { values: { title: 'Write the release notes' } },
  },
]

/**
 * One host with a populated roster.
 * @param extra - answer-table overrides for the case.
 * @returns the answer table.
 */
export function oneHost(extra: Partial<AnswerTable> = {}): AnswerTable {
  return { now: FIXTURE_NOW, hosts: HOSTS.slice(0, 1), remote: { 'session/list': { items: SESSIONS } }, ...extra }
}

/**
 * Both hosts with a populated roster.
 * @param extra - answer-table overrides for the case.
 * @returns the answer table.
 */
export function fleet(extra: Partial<AnswerTable> = {}): AnswerTable {
  return { now: FIXTURE_NOW, hosts: HOSTS, remote: { 'session/list': { items: SESSIONS } }, ...extra }
}
