/**
 * The package's invariant companion, which checks from outside the registering
 * code that a host carrying this plugin can actually address its fleet.
 */

import { expect, it } from 'bun:test'
import type { Context } from '@deepseek-ai/cordis'
import { apply, name } from '../src/invariant.ts'

/** Every tool the package promises. */
const TOOLS = ['sessions_list', 'sessions_spawn', 'sessions_send', 'sessions_cancel', 'sessions_follow']

/**
 * Run the companion against a host that resolves a given set of tools.
 * @param present - the tool names that resolve.
 * @returns the failure message, or undefined when the check passed.
 */
async function check(present: readonly string[]): Promise<string | undefined> {
  let installer: ((ctx: Context, fail: (message: string) => never) => void) | undefined
  const ctx = {
    invariants: {
      register: (_package: string, install: typeof installer) => {
        installer = install
        return () => null
      },
    },
    tools: { get: (tool: string) => (present.includes(tool) ? {} : undefined) },
  } as unknown as Context
  const dispose = await apply(ctx)
  // Registering is half the contract, so it is asserted rather than assumed:
  // calling the installer optionally would let every case below pass without
  // one, which is exactly the failure this companion exists to catch.
  expect(typeof installer).toBe('function')
  expect(typeof dispose).toBe('function')
  let failure: string | undefined
  const install = installer as (ctx: Context, fail: (message: string) => never) => void
  install(ctx, ((message: string) => {
    failure = message
    return null
  }) as unknown as (message: string) => never)
  return failure
}

it('names itself for loader diagnostics', () => {
  expect(name).toBe('host-fleet-invariant')
})

it('passes when every tool the package promises resolves', async () => {
  expect(await check(TOOLS)).toBeUndefined()
})

it('reports exactly the tools that did not register', async () => {
  const failure = await check(TOOLS.filter((tool) => tool !== 'sessions_cancel' && tool !== 'sessions_follow'))
  expect(failure).toContain('sessions_cancel, sessions_follow')
  expect(failure).toContain('@deeptail/host-fleet')
})

it('reports every tool when the registration never ran', async () => {
  const failure = await check([])
  for (const tool of TOOLS) expect(failure).toContain(tool)
})
