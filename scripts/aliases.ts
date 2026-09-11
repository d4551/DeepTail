/**
 * Names that stand for another name.
 *
 * `const d = document` and `import { it as check }` both rename something the
 * rules are written about. A rule that matches on the written name alone is a
 * rule one `const` defeats, so the gates resolve every local name through this
 * table before judging it.
 *
 * @module
 */

import { isNode, type Node, unwrap, walk } from './ast.ts'

/** Local name to the name it stands for, resolved through chains. */
export type Aliases = ReadonlyMap<string, string>

/**
 * Every local name in a file that stands for another name.
 * @param program - the parsed body.
 * @returns local name to the name it stands for, resolved through chains.
 */
export function aliases(program: readonly Node[]): Aliases {
  const direct = new Map<string, string>()
  walk(program, (node) => {
    if (node.type === 'VariableDeclaration' && node.kind === 'const') recordConstAliases(node, direct)
    if (node.type === 'ImportSpecifier') recordImportAlias(node, direct)
  })
  const resolved = new Map<string, string>()
  for (const [local] of direct) {
    let target = local
    // A chain of renames is still one name; the cap stops a cycle spinning.
    for (let step = 0; step < 8; step += 1) {
      const next = direct.get(target)
      if (next === undefined || next === target) break
      target = next
    }
    if (target !== local) resolved.set(local, target)
  }
  return resolved
}

/**
 * Record `const local = other`.
 * @param node - the declaration.
 * @param into - the map to add to.
 */
function recordConstAliases(node: Node, into: Map<string, string>): void {
  const declarations = node.declarations
  if (!Array.isArray(declarations)) return
  for (const declaration of declarations) {
    if (!isNode(declaration)) continue
    const id = unwrap(declaration.id)
    const init = unwrap(declaration.init)
    if (!isNode(id) || id.type !== 'Identifier' || !isNode(init) || init.type !== 'Identifier') continue
    if (typeof id.name !== 'string' || typeof init.name !== 'string') continue
    into.set(id.name, init.name)
  }
}

/**
 * Record `import { imported as local }`.
 * @param node - the specifier.
 * @param into - the map to add to.
 */
function recordImportAlias(node: Node, into: Map<string, string>): void {
  const imported = node.imported
  const local = node.local
  if (!isNode(imported) || !isNode(local)) return
  const from = imported.type === 'Identifier' ? imported.name : imported.value
  if (typeof from !== 'string' || typeof local.name !== 'string' || local.name === from) return
  into.set(local.name, from)
}
