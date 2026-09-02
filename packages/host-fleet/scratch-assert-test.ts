import type { Context } from '@deepseek-ai/cordis'
import type { SessionController } from '@deepseek-ai/dsh-api-session-controller'

interface Disposer {
  (): void
}

interface Listener {
  (): void
}

interface ScriptedController {
  list(): Promise<{ readonly items: readonly { sessionId: string; running: boolean; blank: boolean; updatedAt: number }[] }>
  create(request: { readonly agentPreset?: string; readonly cwd?: string }): Promise<{ readonly sessionId: object }>
  prompt(request: { readonly sessionId: string; readonly mode: string }): Promise<object>
  cancel(request: { readonly sessionId: string }): Promise<{ readonly cancelled: boolean }>
  follow(): AsyncIterable<object>
}

interface ScriptedHost {
  readonly sessionController: object
  readonly tools: { register(definition: object): Disposer }
  readonly effect: { (install: Listener, label?: string): void }
}

export function asContextConstrained<T extends ScriptedHost>(host: T): Context {
  if (typeof host !== 'object' || host === null) throw new Error('deeptail: host double is not an object')
  return host as Context
}

export function asContextBare<T>(host: T): Context {
  if (typeof host !== 'object' || host === null) throw new Error('deeptail: host double is not an object')
  return host as Context
}

export function asControllerGeneric<T extends ScriptedController>(controller: T): SessionController {
  if (typeof controller !== 'object' || controller === null) throw new Error('deeptail: controller double is not an object')
  return controller as SessionController
}

type FrozenLike = {
  (this: Date, ...values: (string | number)[]): string | Date
  readonly prototype: Date
  now(): number
  parse(value: string): number
  UTC(...values: number[]): number
}

export function asDateConstructorGeneric<T extends FrozenLike>(frozen: T): DateConstructor {
  if (typeof frozen !== 'function') throw new Error('deeptail: frozen clock is not a function')
  return frozen as DateConstructor
}

export function asDateConstructorDirect(frozen: FrozenLike): DateConstructor {
  if (typeof frozen !== 'function') throw new Error('deeptail: frozen clock is not a function')
  return frozen as DateConstructor
}
