/**
 * One rejected construct, the shape every gate reports.
 *
 * Each gate carried its own copy of this record; one shape means one report
 * format for every reader of gate output.
 *
 * @module
 */

/** One rejected construct. */
export interface Offence {
  /** Repository-relative path of the file it was found in. */
  readonly label: string
  /** One-based line number. */
  readonly line: number
  /** What is wrong, and what to do instead. */
  readonly why: string
}
