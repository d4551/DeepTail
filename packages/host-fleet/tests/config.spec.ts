/**
 * The plugin's config schema: the defaults it applies and the values it refuses.
 *
 * What the tools do with those limits is covered in `fleet-tools.spec.ts`.
 */
import { describe, expect, it } from 'bun:test'
import { Config } from '../src/index.ts'

describe('host-fleet config', () => {
  it('applies documented defaults', () => {
    const resolved = new Config({})
    expect(resolved.defaultPreset).toBe('standard')
    expect(resolved.maxPromptChars).toBe(8192)
    expect(resolved.listLimit).toBe(50)
    expect(resolved.maxSpawnsPerProcess).toBe(8)
    expect(resolved.promptTimeoutMs).toBe(30_000)
  })

  it('rejects a non-positive list limit', () => {
    expect(() => new Config({ listLimit: 0 })).toThrow()
  })

  it('rejects a non-positive prompt budget', () => {
    expect(() => new Config({ maxPromptChars: 0 })).toThrow()
  })

  it('rejects a non-positive prompt timeout', () => {
    expect(() => new Config({ promptTimeoutMs: 0 })).toThrow()
  })

  it('rejects a non-positive spawn budget', () => {
    expect(() => new Config({ maxSpawnsPerProcess: 0 })).toThrow()
  })
})
