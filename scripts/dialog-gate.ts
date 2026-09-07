/**
 * Hold every dialog to the one that ships.
 *
 * `ui/modal.ts` is the product's dialog: portalled, named by its own heading,
 * masked, closed on `Escape`, and opened with every sibling of its root made
 * `inert` so there is nowhere for focus to go. None of that is visible from a
 * call site — a second dialog assembled from a `div` and `role="dialog"` looks
 * finished on screen and is reachable behind the mask, announced without a
 * name, and closed by nothing.
 *
 * Both surfaces that open one go through `openDialog` today, which is when a
 * rule is cheap to state. What is refused is the vocabulary a dialog surface is
 * built from, so a second one cannot be assembled anywhere but the module that
 * owns it.
 *
 * @module
 */

import { aliases } from './aliases.ts'
import { isNode, type Node, parseScript, unwrap, walk } from './ast.ts'
import { constants, staticString } from './fold.ts'
import type { Offence } from './offence.ts'
import { identifier, literalKey, type Names, property } from './rule-helpers.ts'

/**
 * The modules the dialog is made of, which is where its vocabulary lives.
 *
 * `modal.ts` assembles the surface. `dom.ts` is the element factory it is
 * assembled with, and writes the `aria-modal` attribute whenever a caller asks
 * for it — it builds no dialog of its own, and a caller that asks is caught
 * where it asks, by the `modal` option this rule reads.
 *
 * Named by their whole paths rather than matched by a suffix: a rule that
 * exempted any file ending `modal.ts` exempted a file anyone could add.
 */
export const DIALOG_MODULES: ReadonlySet<string> = new Set([
  'apps/deeptail/src/ui/modal.ts',
  'apps/deeptail/src/ui/dom.ts',
])

/** The roles that name a dialog to assistive technology. */
const DIALOG_ROLES: ReadonlySet<string> = new Set(['dialog', 'alertdialog'])

/** The attribute that tells assistive technology a dialog holds the page. */
const MODAL_ATTRIBUTE = 'aria-modal'

/** The class stem the dialog surface's own parts are drawn with. */
const MODAL_CLASS = 'modal-'

/** What this gate says when a second dialog is assembled. */
export const DIALOG_REFUSAL =
  'a dialog surface is built here rather than opened; call openDialog so it is named, masked, escapable and inert behind'

/**
 * The name a property is written under, however it is written.
 * @param node - the property node.
 * @param names - what this file renamed and holds in constants.
 * @returns the name, or undefined when it is computed beyond reading.
 */
function propertyName(node: Node, names: Names): string | undefined {
  return identifier(node.key, names) ?? literalKey(node.key)
}

/**
 * Whether a property names a dialog role or the modal class stem.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when the property builds a dialog surface.
 */
function buildsDialogProperty(node: Node, names: Names): boolean {
  if (node.type !== 'Property') return false
  const key = propertyName(node, names)
  if (key === undefined) return false
  const value = staticString(names.constants, node.value)
  if (value === undefined) return false
  if (key === 'role') return DIALOG_ROLES.has(value)
  if (key === 'modal') return true
  return (key === 'className' || key === 'class') && value.startsWith(MODAL_CLASS)
}

/**
 * Whether a call writes a dialog role or the modal attribute onto an element.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when the call builds a dialog surface.
 */
function buildsDialogAttribute(node: Node, names: Names): boolean {
  if (node.type !== 'CallExpression') return false
  const callee = unwrap(node.callee)
  if (!isNode(callee) || property(callee, names) !== 'setAttribute') return false
  const argument = Array.isArray(node.arguments) ? node.arguments : []
  const name = literalKey(argument[0])
  if (name === undefined) return false
  if (name.toLowerCase() === MODAL_ATTRIBUTE) return true
  const value = staticString(names.constants, argument[1])
  return name.toLowerCase() === 'role' && value !== undefined && DIALOG_ROLES.has(value)
}

/**
 * The places one module builds a dialog surface of its own.
 * @param label - the file's repository-relative path.
 * @param text - the file's contents.
 * @returns one offence per dialog assembled outside the module that owns it.
 */
export function scanDialogs(label: string, text: string): readonly Offence[] {
  const parsed = parseScript(label, text)
  const names: Names = { aliases: aliases(parsed.body), constants: constants(parsed.body) }
  const offences: Offence[] = []
  walk(parsed.body, (node) => {
    if (buildsDialogProperty(node, names) || buildsDialogAttribute(node, names)) {
      offences.push({ label, line: parsed.lineAt(node.start), why: DIALOG_REFUSAL })
    }
  })
  return offences
}
