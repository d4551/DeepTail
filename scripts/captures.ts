/**
 * Reading a fixed number of parts out of something that may not carry them all.
 *
 * A capture group is optional to the compiler however sure a pattern is of it,
 * and a table cell is absent whenever the row is shorter than the reader
 * expects. Written at the point of use, that becomes one fallback value per
 * part — unreachable code, repeated, in every reader that has the problem. This
 * is the rule instead, in one place: all of them, or nothing to read.
 *
 * @module
 */

/**
 * The three parts, when all three are there.
 *
 * @param parts - the three, any of which may be missing.
 * @returns the three, or undefined when one of them is missing.
 */
export function allThree(
  parts: readonly [string | undefined, string | undefined, string | undefined],
): readonly [string, string, string] | undefined {
  const [first, second, third] = parts
  if (first === undefined || second === undefined || third === undefined) return undefined
  return [first, second, third]
}
