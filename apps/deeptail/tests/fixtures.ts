/**
 * Fixtures shared by every browser suite.
 *
 * One definition of the hosts and sessions the specs assert on, so a change to
 * a label or a title cannot leave one suite asserting against a shape no other
 * suite still produces.
 */

import type { AnswerTable, SessionFixture } from './tauri-ipc.ts'

/** Two paired hosts, as the native registry reports them. */
export const HOSTS = [
  { id: 'dev-1', label: 'Workstation', origin: 'https://harness.local:3080' },
  { id: 'lab-2', label: 'Lab box', origin: 'https://lab.internal:3080' },
]

/**
 * One running session and one idle one, newest activity first.
 *
 * Ages are stamped relative to the moment the table is built, not to a fixed
 * instant: the roster renders them against the page's live clock, so a fixed
 * instant drifted across a bucket boundary as the suite ran and the same screen
 * read "now" in one run and "1m ago" in the next. Relative stamps keep every
 * run in the same bucket while the page's clock stays real — the drawer's
 * transition, focus hand-off and axe's own timers all run on it.
 */
export function sessions(): SessionFixture[] {
  const now = Date.now()
  return [
    {
      sessionId: 's-running',
      updatedAt: now - 30_000,
      running: true,
      blank: false,
      projections: { values: { title: 'Refactor the loader' } },
    },
    {
      sessionId: 's-idle',
      updatedAt: now - 3_600_000,
      running: false,
      blank: false,
      projections: { values: { title: 'Write the release notes' } },
    },
  ]
}

/**
 * One host with a populated roster.
 * @param extra - answer-table overrides for the case.
 * @returns the answer table.
 */
export function oneHost(extra: Partial<AnswerTable> = {}): AnswerTable {
  return { hosts: HOSTS.slice(0, 1), remote: { 'session/list': { items: sessions() } }, ...extra }
}

/**
 * Both hosts with a populated roster.
 * @param extra - answer-table overrides for the case.
 * @returns the answer table.
 */
export function fleet(extra: Partial<AnswerTable> = {}): AnswerTable {
  return { hosts: HOSTS, remote: { 'session/list': { items: sessions() } }, ...extra }
}
