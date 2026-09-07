/**
 * Refuse a file the repository ships of a kind it has never declared shipping.
 *
 * Every other gate narrows the listing to the extensions it understands, so a
 * file of an undeclared kind reaches none of them: it passes the bans, the
 * style rules, the instrumentation check and the entry check by never being
 * opened. That is how `scripts/source-tree.tszz-source-tree-probe.probe-ext` —
 * a probe a suite wrote and, through an unawaited write, failed to remove —
 * came to sit in the tree while `check:tree` printed a clean line over it.
 *
 * What is enforced is the declaration, not readership: this repository ships
 * kinds no gate opens — screenshots, icons, the licence — and they are declared
 * below for exactly that reason. Saying "a gate reads this" of a `.png` would
 * be a claim the code does not make.
 *
 * The rule is the whole list rather than a vocabulary of scratch names: a name
 * list only refuses the artefacts somebody thought of, and the next probe will
 * be spelled differently. A kind this repository genuinely starts shipping is
 * added below, which is a deliberate line in a diff rather than a silence.
 *
 * @module
 */

import { CONSOLE, renderOffence, reportGate } from './gate-runner.ts'
import type { Offence } from './offence.ts'
import { repositoryFiles } from './source-tree.ts'

/**
 * Every kind of file this repository ships, by the suffix its name ends in.
 *
 * Names with no dot in them are their own entry, because a file called
 * `LICENSE` has no extension to match on and is not a stray.
 */
export const SHIPPED_KINDS: readonly string[] = [
  '.bao',
  '.css',
  '.gitattributes',
  '.gitignore',
  '.html',
  '.icns',
  '.ico',
  '.json',
  '.lock',
  '.md',
  '.png',
  '.rs',
  '.toml',
  '.ts',
  '.xml',
  '.yml',
  'CODEOWNERS',
  'LICENSE',
]

/**
 * The files whose kind is not on the list.
 * @param labels - every path the repository ships.
 * @param kinds - the suffixes it is allowed to ship.
 * @returns one offence per file of an unlisted kind, in the order given.
 */
export function strayFiles(labels: readonly string[], kinds: readonly string[]): Offence[] {
  return labels
    .filter((label) => !kinds.some((kind) => label.endsWith(kind)))
    .map((label) => ({
      label,
      line: 1,
      why: 'this repository declares no such kind; remove the file, or declare its kind in SHIPPED_KINDS',
    }))
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  // The listing alone, with no file opened: this rule is about what the tree
  // carries, not about what any file says.
  const labels = repositoryFiles(['']).map((file) => file.label)
  const strays = strayFiles(labels, SHIPPED_KINDS)
  const outcome =
    strays.length > 0
      ? {
          ok: false,
          text: `the repository ships a file of a kind it never declared:\n${strays
            .map((stray) => renderOffence(stray))
            .join('\n')}\n`,
        }
      : {
          ok: true,
          text: `every file the repository ships is of a declared kind (${String(labels.length)} files)\n`,
        }
  process.exit(reportGate(outcome, CONSOLE))
}
