/**
 * What a refusal is, and the ground both readings of the contract share.
 *
 * Vite leaves `#root` empty, so the document a reader's engine loads has no
 * content until the module entry runs — the client-invented tree this product
 * refuses. `paint-index.ts` seats the shell in the built page instead, and what
 * that seated page must be is read out of the bytes with the parser a browser
 * uses, in two readings: `paint-shell-rules.ts` reads the chrome the factories
 * paint, and `paint-document-rules.ts` reads the built page, the chrome
 * included, through the same chrome rules rather than a second reading of them.
 *
 * What sits here is what both of those readings report in and what both apply.
 * One refusal shape means one report format for every reader of a refusal. The
 * reference rule is here because it is a rule of the scope it is written in: an
 * id inside the chrome may be stated by the document around it, so the document
 * reads references over every element it has and the chrome over its own.
 *
 * Both readings are driven case by case in `paint-shell-rules.spec.ts` and
 * `paint-document-rules.spec.ts`, and `paint-gate.ts` runs the document reading
 * over the built file on disk, so the document that ships is the document that
 * was read.
 *
 * @module
 */

import { attributeOf, attrsOf, lineOf, type Parsed } from './paint-tree.ts'

/** The attributes read as one id reference each. */
const ID_REFERENCES = new Set(['aria-controls', 'aria-describedby', 'aria-labelledby', 'aria-owns'])

/** One refusal, with the line of the document it sits on. */
export interface PaintOffence {
  /** One-based line number. */
  readonly line: number
  /** What is wrong, and what to do instead. */
  readonly why: string
}

/** One refusal, pinned to the node it is about. */
export function refusedAt(node: Parsed, why: string): PaintOffence {
  return { line: lineOf(node), why }
}

/**
 * What a scope carrying an id twice, or a reference to an id it never states,
 * is refused for.
 *
 * Read over every element of the scope the caller hands in, so a reference
 * beside the chrome is held to the same rule as one inside it.
 * @param elements - every element of the scope, in document order.
 * @returns one refusal per defect.
 */
export function referenceOffences(elements: readonly Parsed[]): PaintOffence[] {
  const refused: PaintOffence[] = []
  const stated = new Set<string>()
  for (const element of elements) {
    const id = attributeOf(element, 'id')
    if (id === undefined || id === '') continue
    if (stated.has(id)) {
      refused.push(refusedAt(element, `an id is stated twice, so a reference to it reaches neither: ${id}`))
      continue
    }
    stated.add(id)
  }
  for (const element of elements) {
    for (const attribute of attrsOf(element).filter((attr) => ID_REFERENCES.has(attr.name))) {
      for (const id of attribute.value.split(/\s+/u).filter((word) => word !== '')) {
        if (!stated.has(id)) {
          refused.push(refusedAt(element, `${attribute.name} points at ${id}, which is no id on the page`))
        }
      }
    }
  }
  return refused
}

/**
 * Every refusal as one line, for a message that names each defect.
 * @param offences - the refusals to render.
 * @returns them joined, empty when there are none.
 */
export function refusalText(offences: readonly PaintOffence[]): string {
  return offences.map((offence) => `line ${String(offence.line)}: ${offence.why}`).join('; ')
}
