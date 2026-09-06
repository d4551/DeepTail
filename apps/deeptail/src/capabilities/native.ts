/**
 * The page's read of what the native authority has issued.
 *
 * The ledger in `grants.ts` is a mirror: it decides what the shell draws and
 * what a control may attempt. The copy that decides whether a call reaches a
 * host lives in Rust, which refuses a priced route the page holds no live
 * grant for. This module is the one seam between them.
 *
 * The read is taken wherever the registry is read, because the pairing set is
 * what the authority scopes grants to: a host that has just been paired or
 * forgotten changes what may be spent, and an issuance is the whole of what
 * may be spent rather than an addition to it.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'
import type { WireValue } from '../wire.ts'

/** The command the native authority answers issuance on. */
const GRANTS_COMMAND = 'capability_grants'

/**
 * Ask the native authority to issue, and return the mirror it hands back.
 *
 * Nothing is asserted about the shape here. The ledger reads it, and refuses
 * anything that is not a snapshot this device's own authority issued — so a
 * malformed or foreign answer empties the ledger rather than populating it,
 * which is the safe direction.
 * @returns whatever the authority answered with.
 */
export function readNativeGrants(): Promise<WireValue> {
  return invoke<WireValue>(GRANTS_COMMAND)
}
