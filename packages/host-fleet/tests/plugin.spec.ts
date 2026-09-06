/**
 * The plugin face a cordis host loads: what it is called, what it declares it
 * needs, and what it does to the context it is applied to.
 *
 * None of it was covered. The loader reads `name` and `inject` before anything
 * else runs, and the adapter `apply` builds — the one that forwards each
 * registration into `ctx.effect` so a scope teardown takes the tools with it —
 * could have been emptied with every other suite still green, because every
 * other suite registers through the double rather than through the plugin.
 */

import { expect, it } from 'bun:test'
import { Context } from '@deepseek-ai/cordis'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { apply, inject, name } from '../src/index.ts'
import { refusingController } from './controller-double.ts'

/** What one application of the plugin did to its context. */
interface Applied {
  /** The tools it registered, in registration order. */
  readonly registered: string[]
  /** The label it gave each registration effect, in order. */
  readonly labels: (string | undefined)[]
  /** Every property it read off the context. */
  readonly read: Set<string>
}

/**
 * Apply the plugin to a real cordis context and record what it did.
 *
 * The context is real, so `ctx.effect` is the host's own; only the two services
 * are supplied, which is what `inject` says the plugin needs. Reads are
 * recorded through a proxy so the declaration can be checked against what the
 * plugin actually reaches for rather than against a copy of itself.
 * @param config - the plugin config to apply.
 * @returns what the application did.
 */
function applyPlugin(config: Parameters<typeof apply>[1] = {}): Applied {
  const registered: string[] = []
  const labels: (string | undefined)[] = []
  const read = new Set<string>()
  const host = new Context()
  const effect = host.effect.bind(host)
  Object.assign(host, {
    tools: {
      register: (definition: ToolDefinition) => {
        registered.push(definition.name)
        return () => null
      },
    },
    sessionController: refusingController(),
    effect: (install: () => unknown, label?: string) => {
      labels.push(label)
      return effect(install as never, label as never)
    },
  })
  const watched = new Proxy(host, {
    get: (target, key, receiver) => {
      if (typeof key === 'string') read.add(key)
      return Reflect.get(target, key, receiver) as unknown
    },
  })
  apply(watched, config)
  return { registered, labels, read }
}

it('names itself for loader diagnostics', () => {
  expect(name).toBe('host-fleet')
})

it('declares every service it reaches for, and nothing it does not', () => {
  // Checked against what the application actually reads off the context rather
  // than against a copy of the declaration: a service dropped from `inject`
  // is a plugin the loader starts before its dependency exists.
  const applied = applyPlugin()
  expect([...inject].toSorted()).toEqual(['sessionController', 'tools'])
  expect([...inject].filter((service) => !applied.read.has(service))).toEqual([])
})

it('registers every tool through the context effect, so a teardown takes them', () => {
  const applied = applyPlugin()
  expect(applied.registered).toEqual([
    'sessions_list',
    'sessions_spawn',
    'sessions_send',
    'sessions_cancel',
    'sessions_follow',
  ])
  // Each registration is labelled with the tool it installs, which is what a
  // host's effect diagnostics name when one of them fails.
  expect(applied.labels).toEqual(applied.registered.map((tool) => `host-fleet: ${tool}`))
})

it('resolves the schema defaults for a caller that configured nothing', () => {
  // The default preset is what makes an unconfigured application legal, so an
  // application with no config at all has to reach registration.
  expect(applyPlugin().registered.length).toBe(5)
})

it('refuses a preset that names nothing, before registering anything', () => {
  for (const defaultPreset of ['', '   ', '\t']) {
    expect(() => applyPlugin({ defaultPreset })).toThrow('host-fleet: defaultPreset must name an agent preset')
  }
})
