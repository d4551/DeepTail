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

/** One running session and one idle one, newest activity first. */
export const SESSIONS = [
  {
    sessionId: 's-running',
    updatedAt: Date.now() - 30_000,
    running: true,
    blank: false,
    projections: { values: { title: 'Refactor the loader' } },
  },
  {
    sessionId: 's-idle',
    updatedAt: Date.now() - 3_600_000,
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
  return { hosts: HOSTS.slice(0, 1), remote: { 'session/list': { items: SESSIONS } }, ...extra }
}

/**
 * Both hosts with a populated roster.
 * @param extra - answer-table overrides for the case.
 * @returns the answer table.
 */
export function fleet(extra: Partial<AnswerTable> = {}): AnswerTable {
  return { hosts: HOSTS, remote: { 'session/list': { items: SESSIONS } }, ...extra }
}
