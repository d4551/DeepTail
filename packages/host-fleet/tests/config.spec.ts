/**
 * The plugin's config schema: the defaults it applies and the values it refuses.
 *
 * What the tools do with those limits is covered in `fleet-tools.spec.ts`.
 */
import { describe, expect, it } from 'bun:test'
import { readFile } from 'node:fs/promises'
import type { Context } from '@deepseek-ai/cordis'
import { apply, Config } from '../src/index.ts'

/**
 * A host context that accepts every registration and records the tool names.
 * @param registered - collects the name of each tool the plugin registers.
 * @returns the context.
 */
function hostContext(registered: string[] = []): Context {
  return {
    effect: (run: () => unknown) => {
      run()
      return () => null
    },
    tools: {
      register: (tool: { name: string }) => {
        registered.push(tool.name)
        return () => null
      },
    },
    sessionController: {},
  } as unknown as Context
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
    // The schema's default only applies to an absent value. A blank one reaches
    // every spawn and asks the host for a preset called "", which it refuses
    // one session at a time rather than at load.
    for (const defaultPreset of ['', '   ', '\t']) {
      expect(() => {
        apply(hostContext(), { defaultPreset })
      }).toThrow('must name an agent preset')
    }
  })

  it('registers its tools when the preset names one', () => {
    const registered: string[] = []
    apply(hostContext(registered), { defaultPreset: 'standard' })
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
    // Every limit is declared once, with its default, in the schema. A profile
    // that restates one has made a second copy of it, and the two agree only
    // until someone changes the schema.
    const defaults = new Config({}) as unknown as Record<string, unknown>
    const restated = Object.entries(defaults)
      .filter(([key, value]) => new RegExp(`^\\s*${key}:\\s*${String(value)}\\s*$`, 'mu').test(row))
      .map(([key]) => key)
    expect(restated).toEqual([])
  })
})
