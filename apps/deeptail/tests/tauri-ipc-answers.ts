/**
 * What the scripted IPC answers, stated rather than counted.
 *
 * `deeptailInvoke` ends in a `default` that resolves `null`, which is
 * indistinguishable from a command that answered nothing on purpose.
 * `carrier_load_bundle` fell through it: the page received `null` where it
 * expected a bundle's source, so every browser case passed over a path
 * production would have failed on, and nothing in the tree could say so.
 *
 * Held against the shipped command table in `tests/command-gate.spec.ts`, so a
 * command added to the native half and to the page cannot quietly reach that
 * default. Split from `tauri-ipc.ts` when that file reached the size a source
 * file here may hold.
 *
 * @module
 */

import { NATIVE_COMMANDS, type NativeCommand } from '../src/commands.ts'

/** Every command the scripted dispatcher answers with something of its own. */
export const ANSWERED_COMMANDS: readonly NativeCommand[] = [
  NATIVE_COMMANDS.listHosts,
  NATIVE_COMMANDS.selectHost,
  NATIVE_COMMANDS.forgetHost,
  NATIVE_COMMANDS.capabilityGrants,
  NATIVE_COMMANDS.bootInjections,
  NATIVE_COMMANDS.carrierCloseMux,
  NATIVE_COMMANDS.pairHost,
  NATIVE_COMMANDS.tailscaleConnected,
  NATIVE_COMMANDS.tailscaleConnect,
  NATIVE_COMMANDS.tailscaleDevices,
  NATIVE_COMMANDS.tailscaleForget,
  NATIVE_COMMANDS.carrierFetch,
  NATIVE_COMMANDS.carrierOpenMux,
  NATIVE_COMMANDS.carrierSendMux,
  NATIVE_COMMANDS.carrierLoadBundle,
]
