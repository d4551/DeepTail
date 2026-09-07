/**
 * The native boundary's two planes, held to one list of names.
 *
 * A command name is spelled in Rust, where `generate_handler!` registers the
 * function, and again in the page, where `invoke` names it. Nothing held them
 * together: a name added, renamed or misspelled on either side type-checks,
 * builds and ships, because `invoke` takes a string and the failure only
 * arrives when a person presses the control.
 *
 * The readers are driven here against handler lists written by hand, and the
 * shipped pair is driven at the end — a reader proved only against the real
 * tree is a reader nobody has seen refuse anything.
 */

import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { NATIVE_COMMANDS } from '../apps/deeptail/src/commands.ts'
import { ANSWERED_COMMANDS } from '../apps/deeptail/tests/tauri-ipc-answers.ts'
import { COMMAND_TABLE, HANDLER_SOURCE } from '../scripts/check-commands.ts'
import { commandDrift, registeredCommands } from '../scripts/native-commands.ts'
import { ROOT } from '../scripts/source-tree.ts'

/** A handler list, as the macro is written in the shipped source. */
function handlerList(...commands: readonly string[]): string {
  const entries = commands.map((command) => `            commands::${command},`).join('\n')
  return `        .invoke_handler(tauri::generate_handler![\n${entries}\n        ])\n`
}

describe('the handler reader', () => {
  it('reads every command the list registers, in the order registered', () => {
    expect(registeredCommands(handlerList('list_hosts', 'select_host'))).toEqual(['list_hosts', 'select_host'])
  })

  it('reads a command however deeply its module qualifies it', () => {
    expect(registeredCommands('generate_handler![a::b::c::deep_one]')).toEqual(['deep_one'])
    expect(registeredCommands('generate_handler![bare_one]')).toEqual(['bare_one'])
  })

  it('reads past a comment sitting between entries', () => {
    const commented = 'generate_handler![\n  commands::first, // why this one\n  commands::second,\n]'
    expect(registeredCommands(commented)).toEqual(['first', 'second'])
  })

  it('answers nothing at all for a source that registers no list', () => {
    // Not an empty list: a renamed macro or a moved registration reads exactly
    // like a native half that answers nothing, and passing that would be the
    // silence this gate exists to end.
    expect(registeredCommands('fn main() {}')).toBeUndefined()
  })
})

describe('the drift reader', () => {
  it('reports a command the native half answers and the page cannot name', () => {
    expect(commandDrift(['list_hosts', 'forget_host'], ['list_hosts'])).toEqual([
      'forget_host is registered natively and the page cannot name it',
    ])
  })

  it('reports a command the page names and the native half does not answer', () => {
    expect(commandDrift(['list_hosts'], ['list_hosts', 'ghost_host'])).toEqual([
      'ghost_host is named by the page and the native half does not answer it',
    ])
  })

  it('reports a rename as both a loss and an arrival, which is what it is', () => {
    expect(commandDrift(['pair_host'], ['pair_device'])).toEqual([
      'pair_host is registered natively and the page cannot name it',
      'pair_device is named by the page and the native half does not answer it',
    ])
  })

  it('reports nothing when both planes name the same set, whatever the order', () => {
    expect(commandDrift(['a', 'b'], ['b', 'a'])).toEqual([])
    expect(commandDrift([], [])).toEqual([])
  })
})

describe('the boundary this product ships', () => {
  it('names on the page exactly what the native half registers', () => {
    const registered = registeredCommands(readFileSync(`${ROOT}${HANDLER_SOURCE}`, 'utf8'))
    expect(registered?.length).toBeGreaterThan(0)
    expect(commandDrift(registered ?? [], Object.values(NATIVE_COMMANDS))).toEqual([])
  })

  it('names every command once, so no two keys stand for the same command', () => {
    const named = Object.values(NATIVE_COMMANDS)
    expect(named.length).toBe(new Set(named).size)
  })

  it('keeps the table where the gate reads it', () => {
    expect(COMMAND_TABLE).toBe('apps/deeptail/src/commands.ts')
  })

  it('is answered in full by the scripted IPC the browser suite runs against', () => {
    // The double's dispatcher ends in a `default` that resolves null, which
    // reads exactly like a command that answered nothing on purpose.
    // `carrier_load_bundle` fell through it, so the page received null where it
    // expected a bundle's source and every browser case passed over a path
    // production would have failed on.
    expect(commandDrift(Object.values(NATIVE_COMMANDS), ANSWERED_COMMANDS)).toEqual([])
  })

  it('answers each command once, so no two cases claim the same one', () => {
    expect(ANSWERED_COMMANDS.length).toBe(new Set(ANSWERED_COMMANDS).size)
  })
})
