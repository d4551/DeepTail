/**
 * The record of what the page refused, and why.
 *
 * A refusal that leaves no trace is indistinguishable from a control that was
 * never there: the operator sees a disabled button, the log sees nothing, and
 * the two people looking at the same product disagree about whether it works.
 * Every denial this product renders is written here with the trace identity the
 * dispatcher handed the interaction, so the copy on screen, the audit entry and
 * the native boundary's own refusal all name one id.
 *
 * The record is bounded and in memory. It is not a log file, and it carries no
 * credential: an audit trail that survives a restart while holding what an
 * operator was refused is a profile of their authority, which is not what a
 * refusal needs in order to be explainable.
 *
 * @module
 */

import type { DenialReason } from './grants.ts'

/** One refusal, as it was recorded. */
export interface DenialEvent {
  /** The interaction's identity, shared with the copy shown and the native refusal. */
  readonly traceId: string
  /** The action the operator reached for. */
  readonly action: string
  /** What it would have cost. */
  readonly capability: string
  /** Whose authority it would have run on. */
  readonly subject: string
  /** Why it was refused. */
  readonly reason: DenialReason
  /** The grant revision the refusal was measured against, when one was held. */
  readonly revision: number | undefined
  /** Epoch milliseconds of the refusal. */
  readonly at: number
}

/** The bounded record. */
export interface DenialAudit {
  /**
   * Record one refusal.
   * @param event - what was refused.
   */
  record(event: DenialEvent): void
  /** Every recorded refusal, oldest first. */
  recent(): readonly DenialEvent[]
  /**
   * Follow the record.
   * @param listener - called with each new refusal.
   * @returns a disposer.
   */
  subscribe(listener: (event: DenialEvent) => void): () => void
}

/** How many refusals are kept before the oldest is dropped. */
const CAPACITY = 64

/**
 * Build the audit record.
 * @returns the record.
 */
export function createDenialAudit(): DenialAudit {
  const events: DenialEvent[] = []
  const listeners = new Set<(event: DenialEvent) => void>()
  return {
    record(event) {
      events.push(event)
      if (events.length > CAPACITY) events.shift()
      for (const listener of [...listeners]) listener(event)
    },
    recent: () => [...events],
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

/**
 * A new trace identity for one interaction.
 *
 * The platform's own generator, because a refusal that cannot be quoted back is
 * a refusal nobody can look up.
 * @returns the id.
 */
export function newTraceId(): string {
  return crypto.randomUUID()
}
