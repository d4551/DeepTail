/**
 * The gate that holds the built page to the paint contract.
 *
 * The contract in `paint-contract.ts` states what the shipped document must
 * be, and the painter in `paint-index.ts` holds the string it assembles to it.
 * Neither reads the file: what ships is `apps/deeptail/dist/index.html` on
 * disk, and a build that never ran, a page a later step rewrote, and a stamp
 * that did not land are all states the assembled string cannot describe.
 *
 * This gate reads that file and nothing else. It reads it by path rather than
 * through the repository listing, because the build's output is not a file git
 * tracks: a gate that walked the listing for it would select no file at all and
 * report that it refused nothing, which is the one answer a gate may never give
 * about a document it did not read. A selection that reaches no page is
 * therefore refused, and so is a page that breaks any rule of the contract.
 *
 * @module
 */

import { CONSOLE, type Gate, type GateOutcome, readGate, renderOffence, reportGate } from './gate-runner.ts'
import { BUILT_PAGE, documentOffences } from './paint-contract.ts'
import { onlyPresent, ROOT, type SourceFile } from './source-tree.ts'

/**
 * What this gate reads and refuses.
 *
 * Exported because it is the gate's whole declaration — which files, what it
 * says when it refuses, and what it says when it does not — and a declaration
 * only the command line can reach is one no suite can read.
 */
export const GATE: Gate = {
  extensions: ['.html'],
  refusal: 'the built page is not the document this paint owes',
  clean: (pages) => `check-paint: the built page carries the product shell (${String(pages)} page read)`,
  scan: (label, text) => documentOffences(text).map((offence) => ({ label, line: offence.line, why: offence.why })),
}

/** The one page this gate reads, when the build has written it. */
export function builtPages(): SourceFile[] {
  return onlyPresent([{ label: BUILT_PAGE, path: `${ROOT}${BUILT_PAGE}` }])
}

/**
 * What the gate found, over the pages it was handed.
 *
 * A run over no page is a refusal, not a clean report: a gate that read nothing
 * has refused nothing, and a build that wrote no page is exactly the state this
 * gate exists to catch.
 * @param pages - the built pages to read, the built page by default.
 * @returns what the gate found, and what to print.
 */
export async function gateOutcome(pages: readonly SourceFile[] = builtPages()): Promise<GateOutcome> {
  if (pages.length === 0) {
    return {
      ok: false,
      text: `${GATE.refusal}:\n${renderOffence({
        label: BUILT_PAGE,
        line: 1,
        why: 'the gate selected no built page to read; run the app build before it',
      })}\n`,
    }
  }
  return await readGate(GATE, pages)
}

// Guarded, as every runnable script here is: importing a module must run
// nothing.
if (import.meta.main) process.exitCode = reportGate(await gateOutcome(), CONSOLE)
