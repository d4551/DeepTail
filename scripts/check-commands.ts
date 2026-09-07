/**
 * Hold the two planes of the native boundary to one list of names.
 *
 * The readers live in `native-commands.ts`, which is also what the gate's own
 * fixtures drive, so what runs here and what is proved there are the same code.
 * The page's side is imported rather than parsed: `commands.ts` is a table of
 * strings and nothing else, so reading it as a module is reading exactly what
 * ships.
 *
 * This is a gate rather than a suite because it reads two files at rest, one of
 * them Rust, and because the answer is a property of the tree rather than of
 * any function in it.
 *
 * @module
 */

import { readFileSync } from 'node:fs'
import { NATIVE_COMMANDS } from '../apps/deeptail/src/commands.ts'
import { CONSOLE, renderOffence, reportGate } from './gate-runner.ts'
import { commandDrift, registeredCommands } from './native-commands.ts'
import { ROOT } from './source-tree.ts'

/** Where the native half registers what it answers to. */
export const HANDLER_SOURCE = 'apps/deeptail/src-tauri/src/lib.rs'

/** Where the page names what it may invoke. */
export const COMMAND_TABLE = 'apps/deeptail/src/commands.ts'

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (import.meta.main) {
  const registered = registeredCommands(readFileSync(`${ROOT}${HANDLER_SOURCE}`, 'utf8'))
  const invoked = Object.values(NATIVE_COMMANDS)
  const drift = registered === undefined ? [] : commandDrift(registered, invoked)
  const outcome =
    registered === undefined
      ? {
          ok: false,
          text: `${HANDLER_SOURCE} registers no commands this gate can read; the handler list is where the native half states them\n`,
        }
      : drift.length > 0
        ? {
            ok: false,
            text: `the native boundary is spelled differently on its two sides:\n${drift
              .map((why) => renderOffence({ label: COMMAND_TABLE, line: 1, why }))
              .join('\n')}\n`,
          }
        : {
            ok: true,
            text: `the page names exactly the commands the native half answers (${String(invoked.length)} commands)\n`,
          }
  process.exit(reportGate(outcome, CONSOLE))
}
