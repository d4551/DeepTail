/**
 * The scripted answers for the boot table and the bundles it names.
 *
 * The harness serves an ordered table of boot rows in the HTML of a page it
 * renders; a shell inside a webview is not served, so it asks for that table
 * over the IPC and replays it, fetching each bundle the table names through
 * the carrier. Both answers live here rather than in the dispatcher because
 * they are one surface: a table naming a bundle, and the bundle that naming
 * resolves to.
 *
 * Each function is stringified into the page alongside the dispatcher, so it
 * closes over nothing but its arguments.
 *
 * @module
 */

import type { JsonValue } from '../src/wire.ts'
import type { AnswerTable, IpcState } from './tauri-ipc.ts'

/**
 * Answer the page's read of the boot table.
 * @param script - the answers this page should give.
 * @returns the rows the host serves, or the refusal the case asked for.
 */
export function deeptailBootTable(script: AnswerTable): Promise<readonly JsonValue[]> {
  return script.bootError === undefined
    ? Promise.resolve(script.bootInjections ?? [])
    : Promise.reject(new Error(script.bootError))
}

/**
 * Answer one request for a bundle's source, recording the path asked for.
 *
 * The carrier is the only thing that can reach a host path, so this is what a
 * `script-src` row of the boot table resolves to. The path is recorded because
 * whether a row was honoured at all is a question about a request, not about
 * what the page ended up showing.
 * @param script - the answers this page should give.
 * @param args - the invoke arguments, which carry the path.
 * @param state - this page's IPC state.
 * @returns the bundle's source, or a rejection the boot reports.
 */
export function deeptailLoadBundle(
  script: AnswerTable,
  args: Record<string, object>,
  state: IpcState,
): Promise<string | null> {
  const path = String(args['path'] ?? '')
  state.bundlePaths.push(path)
  const failure = script.bundleErrors?.[path]
  if (failure !== undefined) return Promise.reject(new Error(failure))
  return Promise.resolve(script.bundleSources?.[path] ?? '')
}

/** The source every function here contributes to the page's scripted IPC. */
export const BOOT_SOURCES = [deeptailBootTable, deeptailLoadBundle] as const
