// meowbao-gate: host-plane
/**
 * A stand-in for an external program, seated where the gate under test finds it.
 *
 * A gate that shells out is driven against a program nobody wrote here: something
 * first on the path that prints what cargo prints, or what bun prints, and exits
 * with what a case needs. Seating one takes two filesystem facts this runtime's
 * file API does not state — the executable bit, and the physical route to a
 * directory, because a shell prints where it stands by the real path while a
 * made tree can be reached through a symlink. Both are stated here once rather
 * than in each suite that seats a stand-in, and this is the only module of the
 * node-side test harness that needs them.
 *
 * @module
 */

import { chmod, realpath } from 'node:fs/promises'
import type { FixtureTree } from './fixtures.ts'

/** One stand-in, seated in a tree a suite owns. */
export interface Substituted {
  /** The directory it sits in, which goes first on the path a gate runs with. */
  readonly bin: string
  /**
   * The physical route to a directory in the tree it was seated in, which is
   * where a shell that printed its own working directory will have stood.
   * @param inside - the directory, relative to the tree's root.
   * @returns the path with every symlink resolved.
   */
  physical(inside: string): Promise<string>
}

/**
 * Seat a stand-in for one program in a tree, and mark it executable.
 * @param tree - the tree to seat it in.
 * @param name - the name the gate looks for on its path.
 * @param body - the script, shebang included.
 * @returns the stand-in.
 */
export async function substituted(tree: FixtureTree, name: string, body: string): Promise<Substituted> {
  const path = tree.pathOf(`bin/${name}`)
  await Bun.write(path, body)
  // A stand-in nothing can execute is a gate that fails before it reaches it.
  await chmod(path, 0o755)
  return {
    bin: `${tree.root}/bin`,
    physical: async (inside) => await realpath(`${tree.root}/${inside}`),
  }
}
