/**
 * The package's invariant companion, which checks from outside the registering
 * code that a host carrying this plugin can actually address its fleet.
 */

import { expect, it } from 'bun:test'
import type { InvariantInstaller } from '@deepseek-ai/dsh-invariants'
import { apply, check, name, TOOLS } from '../src/invariant.ts'
import type { InvariantContext } from '../src/types.ts'
import { registerTools, script } from './controller-double.ts'

/**
 * Run the companion against a host whose registry resolves a given set of tools.
 *
 * The tool definitions are the real ones the fleet tools register, so the check
 * reads the shapes it will meet in production; `present` decides which of them
 * the host's registry admits. The failure reporter's contract is never to
 * return: it records the message this test asserts on, and a refusal is
 * asserted to have been raised exactly when one is expected.
 * @param present - the tool names that resolve.
 * @param expectsRefusal - whether the check must refuse this registry.
 * @returns the failure message, or undefined when the check passed.
 */
async function run(present: readonly string[], expectsRefusal: boolean): Promise<string | undefined> {
  const definitions = registerTools(script())
  let registered: InvariantInstaller | undefined
  const ctx: InvariantContext = {
    invariants: {
      register: (packageName: string, install: InvariantInstaller) => {
        expect(packageName).toBe('@deeptail/host-fleet')
        registered = install
        return () => null
      },
    },
    tools: { get: (tool: string) => (present.includes(tool) ? definitions.get(tool) : undefined) },
  }
  const dispose = await apply(ctx)
  // Registering is half the contract, so it is asserted rather than assumed:
  // an installer that never arrives would make every case below pass without
  // one, which is exactly the failure this companion exists to catch.
  expect(typeof registered).toBe('function')
  expect(typeof dispose).toBe('function')
  let failure: string | undefined
  const report = (message: string): never => {
    failure = message
    throw new Error(message)
  }
  if (expectsRefusal) {
    expect(() => check(ctx, report)).toThrow()
  } else {
    check(ctx, report)
  }
  return failure
}

it('names itself for loader diagnostics', () => {
  expect(name).toBe('host-fleet-invariant')
})

it('passes when every tool the package promises resolves', async () => {
  expect(await run(TOOLS, false)).toBeUndefined()
})

it('reports exactly the tools that did not register', async () => {
  const failure = await run(
    TOOLS.filter((tool) => tool !== 'sessions_cancel' && tool !== 'sessions_follow'),
    true,
  )
  expect(failure).toContain('sessions_cancel, sessions_follow')
  expect(failure).toContain('@deeptail/host-fleet')
})

it('reports every tool when the registration never ran', async () => {
  const failure = await run([], true)
  for (const tool of TOOLS) expect(failure).toContain(tool)
})
