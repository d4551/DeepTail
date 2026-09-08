/**
 * How a command reaches the native side, and what its answer has to be.
 *
 * Tauri's own `invoke` is what the call is at runtime. It is named here as a
 * type so the tables that reach the native side take it rather than bind it:
 * the command names and the argument each one carries are the whole contract
 * between this product's two halves, and a table wired straight to Tauri can
 * only be read from a page.
 *
 * The answer arrives as whatever crossed the boundary. `invoke<HostRecord[]>`
 * claimed a shape nothing had proven — the same claim `wire.ts` exists to
 * refuse for the host's answers — so every command's answer is read through a
 * predicate here, and one the reader does not recognise is a protocol failure
 * the surfaces already know how to report rather than a field read off the
 * wrong shape.
 *
 * @module
 */

import type { InvokeArgs } from '@tauri-apps/api/core'
import { PROTOCOL, RemoteError } from './api.ts'
import type { WireValue } from './wire.ts'

/** One native command call. */
export type Invoke = (command: string, args?: InvokeArgs) => Promise<WireValue>

/**
 * Whether a value is what one reader recognises.
 *
 * The parameter admits the narrowed shape beside the wire's own, the way every
 * predicate in `wire.ts` does: a value fresh off the boundary is nothing this
 * product has narrowed yet, and a caller that already holds a narrowed value
 * gets the same answer.
 */
export type Recognises<T> = (value: T | WireValue) => value is T

/**
 * One command's answer, refused when it is not what the command promised.
 * @param command - the command that answered, for the failure.
 * @param value - what it answered with.
 * @param recognises - what the answer has to be.
 * @returns the answer.
 * @throws RemoteError when the answer is not what the reader recognises.
 */
export function answered<T>(command: string, value: WireValue, recognises: Recognises<T>): T {
  if (!recognises(value)) {
    throw new RemoteError(PROTOCOL, `${command} answered outside the protocol`, {
      endpoint: command,
      detail: 'the answer is not the shape this command declares',
    })
  }
  return value
}

/**
 * A reader for a list of whatever another reader recognises.
 * @param recognises - what each entry has to be.
 * @returns a reader for the list.
 */
export function listOf<T>(recognises: Recognises<T>): Recognises<readonly T[]> {
  return (value): value is readonly T[] => Array.isArray(value) && value.every((item) => recognises(item))
}

/**
 * Whether an answer is the boolean a command declares.
 * @param value - what the command answered with.
 * @returns whether it is a boolean.
 */
export function isBoolean(value: boolean | WireValue): value is boolean {
  return typeof value === 'boolean'
}

/**
 * Whether an answer carries nothing, which is what a command that returns
 * nothing answers with.
 * @param value - what the command answered with.
 * @returns whether the command answered with nothing.
 */
export function isNothing(value: WireValue): value is undefined {
  return value === undefined || value === null
}
