/**
 * What the five tools declare, rather than what they do when run.
 *
 * A tool's declaration is a contract with two readers. The model reads the
 * description, the parameter list and the output schema, and decides from them
 * what it may call and with what; the operator reads what `render` and
 * `presentCall` produce, and that text is the only account of what happened.
 * None of it was covered: every description, every parameter, every schema and
 * both renderers could be emptied without a test noticing, which is a contract
 * nothing holds.
 *
 * The prose is asserted by what it has to carry — the modes a caller chooses
 * between, the configured default a caller is told about — rather than word for
 * word, so a rewrite that keeps the contract stays green and one that drops it
 * does not.
 */

import { describe, expect, it } from 'bun:test'
import { assertObjectJsonSchema, type JsonSchemaNode, type ObjectJsonSchema } from '@deepseek-ai/dsh-tools'
import type { FleetTool } from '../src/types.ts'
import { registerTools, script } from './controller-double.ts'

/** Every tool, registered once for the whole suite. */
const tools = registerTools(script())

/**
 * One registered tool.
 * @param name - the tool's name.
 * @returns its definition.
 */
function tool(name: string): FleetTool {
  const found = tools.get(name)
  if (found === undefined) throw new Error(`${name} was never registered`)
  return found
}

/**
 * One tool's parameter schema, checked against the subset the registry enforces.
 *
 * `ToolSchema.parameters` is declared as an open record, so every reader below
 * would otherwise be telling the compiler what it hopes is there. The registry's
 * own assertion is what decides: a parameter block that is not an object-rooted
 * schema in the enforced subset refuses here, by path, rather than reading as an
 * object with no properties and passing every assertion about what it declares.
 * @param name - the tool's name.
 * @returns the parameter schema.
 */
function parameterSchema(name: string): ObjectJsonSchema {
  const declared = tool(name).parameters
  assertObjectJsonSchema(declared)
  return declared
}

/**
 * Each property of an object schema, as name, type and whether it is required.
 *
 * The registry normalizes what a tool declares: a `required: true` beside a
 * property becomes a name in the object's own `required` list, and an object
 * that requires nothing carries no list at all.
 * @param node - the object schema.
 * @returns one row per property, in declaration order.
 */
function properties(node: JsonSchemaNode): [string, string, boolean][] {
  const required = new Set(node.required ?? [])
  return Object.entries(node.properties ?? {}).map(([key, one]) => [key, one.type ?? '', required.has(key)])
}

/**
 * The parameters a tool declares, as name, type and whether it is required.
 * @param name - the tool's name.
 * @returns one row per parameter, in declaration order.
 */
function parameters(name: string): [string, string, boolean][] {
  return properties(parameterSchema(name))
}

/**
 * Every parameter description a tool declares.
 * @param name - the tool's name.
 * @returns the descriptions, in declaration order.
 */
function parameterText(name: string): string[] {
  return Object.values(parameterSchema(name).properties ?? {}).map((one) => one.description ?? '')
}

/**
 * The output schema a tool declares.
 * @param name - the tool's name.
 * @returns the schema.
 */
function schema(name: string): JsonSchemaNode {
  return tool(name).output.schema
}

describe('every tool declares itself to the model', () => {
  it('names itself and says what it is for', () => {
    for (const name of ['sessions_list', 'sessions_spawn', 'sessions_send', 'sessions_cancel', 'sessions_follow']) {
      expect([name, tool(name).name]).toEqual([name, name])
      expect([name, (tool(name).description ?? '').length > 40]).toEqual([name, true])
    }
  })

  it('says of each reading tool that it starts no agent', () => {
    // The one line that separates a tool an operator may let an agent call
    // freely from one that spends a session.
    expect(tool('sessions_list').description).toContain('never starts or resumes an agent')
    expect(tool('sessions_follow').description).toContain('Does not resume a cold session')
  })

  it('says of sessions_send which mode does what', () => {
    // A caller picks between them from this sentence alone.
    const description = tool('sessions_send').description ?? ''
    expect(description).toContain('"queue" appends it after the current work')
    expect(description).toContain('"steer" interrupts the running turn')
  })

  it('says of sessions_cancel what survives the cancellation', () => {
    expect(tool('sessions_cancel').description).toContain('queued inbox is preserved')
  })

  it('says of sessions_spawn that it both creates and opens', () => {
    const description = tool('sessions_spawn').description ?? ''
    expect(description).toContain('Create a new agent session')
    expect(description).toContain('send it an opening task')
  })
})

describe('every tool declares its parameters', () => {
  it('declares exactly the arguments each tool reads, and which are required', () => {
    expect(parameters('sessions_list')).toEqual([
      ['runningOnly', 'boolean', false],
      ['limit', 'number', false],
    ])
    expect(parameters('sessions_spawn')).toEqual([
      ['task', 'string', true],
      ['agentPreset', 'string', false],
      ['cwd', 'string', false],
    ])
    expect(parameters('sessions_send')).toEqual([
      ['sessionId', 'string', true],
      ['message', 'string', true],
      ['mode', 'string', false],
    ])
    expect(parameters('sessions_cancel')).toEqual([['sessionId', 'string', true]])
    expect(parameters('sessions_follow')).toEqual([
      ['sessionId', 'string', true],
      ['maxMessages', 'number', false],
    ])
  })

  it('describes every parameter it declares', () => {
    for (const name of ['sessions_list', 'sessions_spawn', 'sessions_send', 'sessions_cancel', 'sessions_follow']) {
      expect([name, parameterText(name).filter((text) => text.length < 10)]).toEqual([name, []])
    }
  })

  it('tells the caller the configured default rather than a compiled-in one', () => {
    // The double runs with a five-row budget and the `standard` preset, so a
    // description that named a constant instead of the resolved limit would
    // say something else here.
    expect(parameterText('sessions_list')).toContain('Maximum rows to report (default 5).')
    expect(parameterText('sessions_spawn')).toContain('Agent preset to compose (default "standard").')
  })

  it('offers the two delivery modes as the only choices', () => {
    const mode = parameterSchema('sessions_send').properties?['mode']
    expect(mode?.enum).toEqual(['queue', 'steer'])
    expect(mode?.description).toContain('default "queue"')
  })
})

describe('every tool declares the value it answers with', () => {
  it('closes each object schema, so a caller can rely on the shape', () => {
    for (const name of ['sessions_list', 'sessions_spawn', 'sessions_send', 'sessions_cancel', 'sessions_follow']) {
      expect([name, schema(name).type, schema(name).additionalProperties]).toEqual([name, 'object', false])
    }
  })

  it('declares the row shape of a session list in full, rather than as opaque JSON', () => {
    expect(properties(schema('sessions_list'))).toEqual([
      ['sessions', 'array', true],
      ['total', 'integer', true],
    ])
    const row = schema('sessions_list').properties?['sessions']?.items
    expect([row?.type, row?.additionalProperties]).toEqual(['object', false])
    expect(properties(row ?? {})).toEqual([
      ['sessionId', 'string', true],
      ['running', 'boolean', true],
      ['blank', 'boolean', true],
      ['updatedAt', 'number', true],
      ['cwd', 'string', false],
      ['title', 'string', false],
      ['parentSessionId', 'string', false],
    ])
  })

  it('declares what each acting tool answers with', () => {
    expect(properties(schema('sessions_spawn'))).toEqual([
      ['sessionId', 'string', true],
      ['agentPreset', 'string', false],
    ])
    expect(properties(schema('sessions_send'))).toEqual([
      ['sessionId', 'string', true],
      ['mode', 'string', true],
      ['requestId', 'string', true],
    ])
    expect(properties(schema('sessions_cancel'))).toEqual([['cancelled', 'boolean', true]])
    expect(properties(schema('sessions_follow'))).toEqual([
      ['sessionId', 'string', true],
      ['cursor', 'integer', true],
      ['hasMore', 'boolean', true],
      ['records', 'integer', true],
      ['recent', 'array', true],
    ])
    expect(schema('sessions_follow').properties?['recent']?.items?.type).toBe('string')
  })
})
