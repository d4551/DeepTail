/**
 * The plugin's config schema: the defaults it applies and the values it refuses.
 *
 * What the tools do with those limits is covered in `fleet-tools.spec.ts`.
 */
import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { apply, Config } from '../src/index.ts'
import { applyFleetTools } from '../src/tools.ts'
import type { FleetContext } from '../src/types.ts'
import { refusingController } from './controller-double.ts'

/**
 * A host context that accepts every registration and records the tool names.
 * The controller face is present but refuses every drive: the registration
 * tests exercise name collection only, so a scripted answer would be dead
 * weight. The limits come from the schema itself, never restated here.
 * @param registered - collects the name of each tool the plugin registers.
 * @returns the context.
 */
function hostContext(registered: string[]): FleetContext {
  const tools: { register(definition: ToolDefinition): () => null } = {
    register: (definition: ToolDefinition) => {
      registered.push(definition.name)
      return () => null
    },
  }
  return {
    sessionController: refusingController(),
    tools,
    effect: (install) => {
      install()
      return null
    },
  }
}

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

  it('refuses a preset name that names nothing', () => {
    // The schema default applies only to an absent value, and the blank check
    // runs before any registration, so a bare context carries the whole case.
    for (const defaultPreset of ['', '   ', '\t']) {
      expect(() => apply(new Context(), { defaultPreset })).toThrow('must name an agent preset')
    }
  })

  it('registers its tools when the preset names one', () => {
    const registered: string[] = []
    applyFleetTools(hostContext(registered), new Config({ defaultPreset: 'standard' }))
    expect(registered.toSorted()).toEqual([
      'sessions_cancel',
      'sessions_follow',
      'sessions_list',
      'sessions_send',
      'sessions_spawn',
    ])
  })
})

describe('the deployment profile', () => {
  it('names the plugin and restates none of the schema it is validated against', async () => {
    const patch = await readFile('profile/cordis.patch.yml', 'utf8')
    const row = /- id: host-fleet\n((?:\s{6}.*\n)*)/u.exec(patch)?.[1] ?? ''
    expect(row).toContain("name: './lib/index.js'")
    const defaults: Record<string, string | number | boolean> = {}
    for (const [key, value] of Object.entries(new Config({}))) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        defaults[key] = value
      }
    }
    const restated = Object.entries(defaults)
      .filter(([key, value]) => new RegExp(`^\\s*${key}:\\s*${String(value)}\\s*$`, 'mu').test(row))
      .map(([key]) => key)
    expect(restated).toEqual([])
  })
})
