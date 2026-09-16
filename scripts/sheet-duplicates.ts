/**
 * Duplicate ruleset detection for the stylesheet gate.
 *
 * Split from `sheet-gate.ts` so that module stays under the size its own
 * rules allow a file to reach. A duplicated ruleset is a DRY hole: two copies
 * of the same decision that drift the first time one of them is edited.
 *
 * @module
 */

import type { Offence } from './offence.ts'
import { rulesetsOf } from './sheet-reader.ts'

/**
 * Every rule set a sheet declares more than once, byte for byte.
 *
 * The token sheet is not exempt — that is where a four-line block sat twice,
 * fifty-five lines apart, and no length rule could see it because the token
 * sheet is allowed raw values.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per repeated ruleset, on the second (and later) copy.
 */
export function duplicateRulesets(label: string, text: string): Offence[] {
  const seen = new Map<string, number>()
  const offences: Offence[] = []
  for (const rule of rulesetsOf(text)) {
    const key = `${rule.selector} { ${rule.body} }`
    const first = seen.get(key)
    if (first === undefined) {
      seen.set(key, rule.line)
      continue
    }
    offences.push({
      label,
      line: rule.line,
      why: `duplicate-ruleset: ${rule.selector} is declared more than once (first at line ${String(first)})`,
    })
  }
  return offences
}
