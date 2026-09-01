/**
 * Behaviour tests for the fleet tools' own guards. The controller itself is
 * not re-tested here: these cover the rules this package adds on top of it.
 */
import { describe, expect, it } from 'bun:test'
import { Config } from '../src/index.ts'

describe('host-fleet config', () => {
  it('applies documented defaults', () => {
    const resolved = new Config({})
    expect(resolved.defaultPreset).toBe('standard')
    expect(resolved.maxPromptChars).toBe(8192)
    expect(resolved.listLimit).toBe(50)
    expect(resolved.maxSpawned).toBe(8)
  })

  it('rejects a non-positive list limit', () => {
    expect(() => new Config({ listLimit: 0 })).toThrow()
  })

  it('rejects a non-positive prompt budget', () => {
    expect(() => new Config({ maxPromptChars: 0 })).toThrow()
  })
})
