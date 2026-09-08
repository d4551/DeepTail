/**
 * The scripted answers for the four Tailscale commands.
 *
 * Split from the dispatcher so the tailnet surface is read in one place: what
 * a machine list answers with, whether a credential is already held, and what
 * a refusal looks like. Stringified into the page alongside the dispatcher, so
 * it closes over nothing but its arguments.
 *
 * @module
 */

import type { AnswerTable } from './tauri-ipc.ts'

/**
 * Answer one of the four Tailscale commands.
 * @param script - the answers this page should give.
 * @param cmd - the command name.
 * @returns whatever that command answers with.
 */
export function deeptailTailscale(script: AnswerTable, cmd: string): Promise<object | boolean | null> {
  if (cmd === 'tailscale_connected') return Promise.resolve(script.tailnetConnected === true)
  if (cmd === 'tailscale_forget') return Promise.resolve(null)
  return script.tailnetError === undefined
    ? Promise.resolve(script.tailnetDevices ?? [])
    : Promise.reject(new Error(script.tailnetError))
}

/** The source every function here contributes to the page's scripted IPC. */
export const TAILNET_SOURCES = [deeptailTailscale] as const
