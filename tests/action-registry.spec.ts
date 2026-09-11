/**
 * The reader that validates `actions.bao` before anything is generated from it.
 *
 * Every control the product draws, every capability a call is priced in, and
 * the native boundary's route table are compiled from this one document, so the
 * reader is the only place a document that says something nobody meant is
 * stopped. What is driven here is each refusal it makes and the path each
 * refusal names: a message that stops naming the row is a stale registry an
 * author cannot locate, and a rule that stops firing is a generated face
 * carrying whatever the document happened to hold.
 *
 * `actions.spec.ts` drives the shipped registry and the faces built from it.
 * These cases drive the reader against documents written to be wrong.
 */

import { describe, expect, it } from 'bun:test'
import { AVAILABILITY, readRegistry } from '../scripts/action-registry.ts'
import type { Json } from '../scripts/jsonc.ts'

/** One row of a document, including a field the schema refuses. */
type Row = { [key: string]: Json }

/** The rows a document is made of, each free to be a shape the schema refuses. */
interface Document {
  readonly version: Json
  readonly capabilities: Json
  readonly placements: Json
  readonly actions: Json
}

/** A capability row the reader accepts. */
const CAPABILITY: Row = { id: 'host.read', subject: 'device', ttlSeconds: 900 }

/** A placement row the reader accepts. */
const PLACEMENT: Row = { id: 'boot', surface: 'The page before a shell exists.' }

/** An action row the reader accepts. */
const ACTION: Row = {
  id: 'boot.retry',
  capability: 'host.read',
  placement: 'boot',
  kind: 'query',
  pane: 'none',
  marker: 'boot-retry',
  availability: 'always',
  lane: 'tests/action-registry.spec.ts',
}

/** The smallest document the reader accepts. */
const MINIMAL: Document = { version: 1, capabilities: [CAPABILITY], placements: [PLACEMENT], actions: [ACTION] }

/** Every kind an action may be, written here rather than read off the reader. */
const KINDS = ['query', 'mutation', 'navigation', 'toggle', 'dialog']

/** Every pane an action may report into, written here rather than read off it. */
const PANES = ['main', 'sheet', 'menu', 'drawer', 'none']

/** Every subject a grant may be bound to. */
const SUBJECTS = ['device', 'host']

/** What the reader puts in front of every message it refuses with. */
const REFUSED = 'actions.bao: '

/**
 * A document with some of its rows replaced.
 * @param changes - the rows to write instead of the minimal ones.
 * @returns the document, as text.
 */
function document(changes: Partial<Document> = {}): string {
  return JSON.stringify({ ...MINIMAL, ...changes })
}

/**
 * One row with some of its fields replaced.
 * @param row - the row to start from.
 * @param changes - the fields to write instead.
 * @returns the row.
 */
function withFields(row: Row, changes: Row): Row {
  return { ...row, ...changes }
}

/**
 * One action row per member of a set, each naming that member in one field.
 * @param field - the field the members are written into.
 * @param members - the members to write.
 * @returns one row per member, each with an id and marker of its own.
 */
function oneEach(field: string, members: readonly string[]): Row[] {
  return members.map((member, index) =>
    withFields(ACTION, {
      id: `boot.${field}.${String(index)}`,
      marker: `boot-${field}-${String(index)}`,
      [field]: member,
    }),
  )
}

describe('the fields of a capability row', () => {
  it('names the row and the field it refused, for each of them', () => {
    const bad: readonly (readonly [Row, string])[] = [
      [{ id: '', subject: 'device', ttlSeconds: 900 }, 'capabilities[0].id is not a non-empty string'],
      [{ id: 'a', subject: 'other', ttlSeconds: 900 }, 'capabilities[0].subject is "other", not one of device, host'],
      [{ id: 'a', subject: 'device', ttlSeconds: 0 }, 'capabilities[0].ttlSeconds is not a positive integer'],
    ]
    for (const [row, why] of bad) {
      expect(() => readRegistry(document({ capabilities: [row] }))).toThrow(`${REFUSED}${why}`)
    }
  })

  it('refuses a key the schema does not name', () => {
    const stray = withFields(CAPABILITY, { colour: 'blue' })
    expect(() => readRegistry(document({ capabilities: [stray] }))).toThrow(
      `${REFUSED}capabilities[0] declares "colour", which the schema does not name`,
    )
  })

  it('accepts every subject a grant may be bound to', () => {
    const rows = SUBJECTS.map((subject, index) =>
      withFields(CAPABILITY, { id: `host.${subject}`, subject, ttlSeconds: 900 + index }),
    )
    const actions = rows.map((row, index) =>
      withFields(ACTION, { id: `boot.${String(index)}`, marker: `boot-${String(index)}`, capability: row['id'] ?? '' }),
    )
    const read = readRegistry(document({ capabilities: rows, actions }))
    expect(read.capabilities.map((row): string => row.subject)).toEqual(SUBJECTS)
  })
})

describe('the fields of a placement row', () => {
  it('names the row and the field it refused, for each of them', () => {
    const bad: readonly (readonly [Row, string])[] = [
      [{ id: 1, surface: 'somewhere' }, 'placements[0].id is not a non-empty string'],
      [{ id: 'boot', surface: '' }, 'placements[0].surface is not a non-empty string'],
    ]
    for (const [row, why] of bad) {
      expect(() => readRegistry(document({ placements: [row] }))).toThrow(`${REFUSED}${why}`)
    }
  })

  it('refuses a key the schema does not name', () => {
    const stray = withFields(PLACEMENT, { colour: 'blue' })
    expect(() => readRegistry(document({ placements: [stray] }))).toThrow(
      `${REFUSED}placements[0] declares "colour", which the schema does not name`,
    )
  })
})

describe('the fields of an action row', () => {
  it('names the row and the field it refused, for each of them', () => {
    const bad: readonly (readonly [Row, string])[] = [
      [{ id: '' }, 'actions[0].id is not a non-empty string'],
      [{ capability: 2 }, 'actions[0].capability is not a non-empty string'],
      [{ placement: null }, 'actions[0].placement is not a non-empty string'],
      [{ kind: 'wish' }, `actions[0].kind is "wish", not one of ${KINDS.join(', ')}`],
      [{ pane: 'attic' }, `actions[0].pane is "attic", not one of ${PANES.join(', ')}`],
      [{ marker: '' }, 'actions[0].marker is not a non-empty string'],
      [{ labelKey: '' }, 'actions[0].labelKey is not a non-empty string'],
      [{ labelKeyOn: 4 }, 'actions[0].labelKeyOn is not a non-empty string'],
      [{ availability: 'perhaps' }, `actions[0].availability is "perhaps", not one of ${AVAILABILITY.join(', ')}`],
      [{ remote: false }, 'actions[0].remote is not a non-empty string'],
      [{ lane: '' }, 'actions[0].lane is not a non-empty string'],
    ]
    for (const [changes, why] of bad) {
      expect(() => readRegistry(document({ actions: [withFields(ACTION, changes)] }))).toThrow(`${REFUSED}${why}`)
    }
  })

  it('reads an optional field as absent when the row leaves it out, and as written when it does not', () => {
    const labelled = withFields(ACTION, { labelKey: 'boot.retry', labelKeyOn: 'boot.stop', remote: 'host/retry' })
    const written = readRegistry(document({ actions: [labelled] })).actions[0]
    expect([written?.labelKey, written?.labelKeyOn, written?.remote]).toEqual(['boot.retry', 'boot.stop', 'host/retry'])
    const bare = readRegistry(document()).actions[0]
    expect([bare?.labelKey, bare?.labelKeyOn, bare?.remote]).toEqual([undefined, undefined, undefined])
  })
})

describe('the sets an action chooses from', () => {
  it('accepts every kind, every pane, and every predicate a row may name', () => {
    // A member nothing reaches is a member the reader could stop admitting
    // with no document noticing, and the first author to write it would be
    // told their registry is wrong.
    const kinds = readRegistry(document({ actions: oneEach('kind', KINDS) })).actions
    expect(kinds.map((row): string => row.kind)).toEqual(KINDS)
    const panes = readRegistry(document({ actions: oneEach('pane', PANES) })).actions
    expect(panes.map((row): string => row.pane)).toEqual(PANES)
    const predicates: string[] = [...AVAILABILITY]
    const named = readRegistry(document({ actions: oneEach('availability', predicates) })).actions
    expect(named.map((row): string => row.availability)).toEqual(predicates)
  })

  it('names the predicates the rest of the product is generated against', () => {
    // Written out rather than read off the reader: a set a suite takes from
    // the module it is checking agrees with it whatever the module says.
    expect([...AVAILABILITY]).toEqual([
      'always',
      'hasHosts',
      'hasActiveHost',
      'running',
      'unauthorized',
      'tailnetConnected',
    ])
  })
})

describe('the document around the rows', () => {
  it('names the field it refused, for each of the four the schema declares', () => {
    const bad: readonly (readonly [Partial<Document>, string])[] = [
      [{ version: 0 }, 'version is not a positive integer'],
      [{ capabilities: {} }, 'capabilities is not an array'],
      [{ placements: 'none' }, 'placements is not an array'],
      [{ actions: 3 }, 'actions is not an array'],
    ]
    for (const [changes, why] of bad) {
      expect(() => readRegistry(document(changes))).toThrow(`${REFUSED}${why}`)
    }
  })

  it('names a row by the index it was written at, not by the first', () => {
    expect(() => readRegistry(document({ capabilities: [CAPABILITY, 'not a row'] }))).toThrow(
      `${REFUSED}capabilities[1] is not an object`,
    )
    expect(() => readRegistry(document({ placements: [PLACEMENT, 7] }))).toThrow(
      `${REFUSED}placements[1] is not an object`,
    )
    expect(() => readRegistry(document({ actions: [ACTION, null] }))).toThrow(`${REFUSED}actions[1] is not an object`)
  })

  it('refuses a key the schema does not name at the top level', () => {
    const stray = JSON.stringify({ ...MINIMAL, colour: 'blue' })
    expect(() => readRegistry(stray)).toThrow(`${REFUSED}document declares "colour", which the schema does not name`)
  })
})

describe('the registry read against itself', () => {
  it('refuses a name declared twice, and says which kind of name it is', () => {
    const twice: readonly (readonly [Partial<Document>, string])[] = [
      [{ capabilities: [CAPABILITY, CAPABILITY] }, 'capability "host.read" is declared twice'],
      [{ placements: [PLACEMENT, PLACEMENT] }, 'placement "boot" is declared twice'],
      [{ actions: [ACTION, withFields(ACTION, { marker: 'other' })] }, 'action "boot.retry" is declared twice'],
      [{ actions: [ACTION, withFields(ACTION, { id: 'boot.stop' })] }, 'marker "boot-retry" is declared twice'],
    ]
    for (const [changes, why] of twice) {
      expect(() => readRegistry(document(changes))).toThrow(`${REFUSED}${why}`)
    }
  })

  it('refuses an action pointing at a name nothing declared, and says which action', () => {
    const dangling = withFields(ACTION, { capability: 'host.teleport' })
    expect(() => readRegistry(document({ actions: [dangling] }))).toThrow(
      `${REFUSED}action "boot.retry" capability names "host.teleport", which is not declared`,
    )
    const homeless = withFields(ACTION, { placement: 'attic' })
    expect(() => readRegistry(document({ actions: [homeless] }))).toThrow(
      `${REFUSED}action "boot.retry" placement names "attic", which is not declared`,
    )
  })

  it('refuses a placement no action sits in', () => {
    const spare = withFields(PLACEMENT, { id: 'unused', surface: 'Nothing sits here.' })
    expect(() => readRegistry(document({ placements: [PLACEMENT, spare] }))).toThrow(
      `${REFUSED}placement "unused" carries no action`,
    )
  })
})

describe('the document the refusals above are measured against', () => {
  it('reads whole, so every refusal above is one the reader would otherwise accept', () => {
    expect(readRegistry(document())).toEqual({
      version: 1,
      capabilities: [{ id: 'host.read', subject: 'device', ttlSeconds: 900 }],
      placements: [{ id: 'boot', surface: 'The page before a shell exists.' }],
      actions: [
        {
          id: 'boot.retry',
          capability: 'host.read',
          placement: 'boot',
          kind: 'query',
          pane: 'none',
          marker: 'boot-retry',
          labelKey: undefined,
          labelKeyOn: undefined,
          availability: 'always',
          remote: undefined,
          lane: 'tests/action-registry.spec.ts',
        },
      ],
    })
  })
})
