/**
 * The API members the installed Playwright superseded.
 *
 * Read from the installed release's own declarations, so an upgrade moves the
 * list: a member it stops marking is no longer refused, and one it starts
 * marking is refused before a suite can be written against it. A member that is
 * called, and an option key written, are both refused — an option the release
 * ignores is as much a superseded face as a method it replaced.
 *
 * @module
 */

import { fieldOf, memberName, nodeAt, parseScript, walk } from '../scripts/ast.ts'
import { interfaceMembers } from '../scripts/declaration-reader.ts'
import type { Offence } from '../scripts/offence.ts'
import { objectKey } from './stack-policy.ts'

/**
 * The members the installed release supersedes by name alone.
 *
 * Every other superseded member is derived from the declarations. This one is
 * stated by hand because `ConsoleMessage` declares `type()` without the marker
 * the page interfaces carry, and a name-level reader reads both receivers as
 * one name; it is refused where it is called, which is where a browser suite
 * drives a page. `noWaitAfter` stays out of this table: the installed release
 * still declares it for `addLocatorHandler`, where it is the supported option.
 */
const SUPERSEDED_BY_NAME = new Map([
  ['type', 'it is @deprecated on every interface a browser suite drives (use fill or pressSequentially)'],
])

/**
 * Every member the installed release marks `@deprecated` wherever it declares
 * it.
 *
 * A name is superseded only when every declaration of it carries the marker.
 * That is what keeps a name like `first` out: `FrameLocator.first` is
 * deprecated and `Locator.first` is current, and a reader that went by name
 * alone would refuse the supported call along with the superseded one.
 * @param declarations - the installed Playwright's type declarations.
 * @returns member name to what the marker said.
 */
function supersededMembers(declarations: string): Map<string, string> {
  const held = new Map<string, { said: string; superseded: boolean }>()
  for (const members of interfaceMembers(declarations).values()) {
    for (const [path, member] of members) {
      const name = path.slice(path.lastIndexOf('.') + 1)
      const previous = held.get(name)
      if (previous === undefined) {
        held.set(name, { said: member.deprecated ?? '', superseded: member.deprecated !== undefined })
      } else if (member.deprecated === undefined) {
        previous.superseded = false
      }
    }
  }
  const superseded = new Map<string, string>()
  for (const [name, member] of held) if (member.superseded) superseded.set(name, member.said)
  return superseded
}

/**
 * Every API the installed Playwright superseded that a browser suite uses.
 *
 * A plain property of another name is read where it stands, which is what keeps
 * `input.type = 'radio'`, a platform property, out of this face.
 * @param declarations - the installed Playwright's type declarations.
 * @param label - the suite's path, which selects the dialect to parse as.
 * @param text - the suite's contents.
 * @returns one offence per superseded API the suite uses, empty when it uses none.
 */
export function playwrightFaceOffences(declarations: string, label: string, text: string): Offence[] {
  const superseded = supersededMembers(declarations)
  const parsed = parseScript(label, text)
  if (parsed.errors.length > 0) {
    return [{ label, line: 1, why: 'it does not parse, so no API it uses can be read' }]
  }
  const offences: Offence[] = []
  walk(parsed.body, (node) => {
    if (node.type === 'CallExpression') {
      const name = memberName(nodeAt(node, 'callee'))
      if (name === undefined) return
      const said = superseded.get(name) ?? SUPERSEDED_BY_NAME.get(name)
      if (said === undefined) return
      offences.push({
        label,
        line: parsed.lineAt(fieldOf(node, 'start')),
        why: `${name} is a Playwright ≤1.62 API; ${said}`,
      })
      return
    }
    if (node.type === 'Property') {
      const name = objectKey(node)
      const said = name === undefined ? undefined : superseded.get(name)
      if (said === undefined) return
      offences.push({
        label,
        line: parsed.lineAt(fieldOf(node, 'start')),
        why: `${name} is a Playwright ≤1.62 API; ${said}`,
      })
    }
  })
  return offences
}
