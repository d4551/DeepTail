/**
 * The action registry, read and validated.
 *
 * `apps/deeptail/src/actions/actions.bao` is the one place an action, the
 * capability it costs, the surface it may appear on, the remote route it
 * reaches and the lane that verifies it are written. The page's control
 * builders, the dispatcher's handler table and the native boundary's route
 * table are all generated from it, so the two halves cannot disagree about what
 * a call costs and no control can exist that nothing authorises.
 *
 * The reader validates rather than casts. A document that carries a key the
 * schema does not name, an id used twice, an action pointing at a capability
 * that was never declared, or a placement holding nothing is refused here, at
 * generation time, rather than in front of an operator.
 *
 * @module
 */

import { type Json, readJsonc } from './jsonc.ts'
import {
  asArray,
  asObject,
  asOneOf,
  asOptionalString,
  asPositiveInt,
  asString,
  refuse,
  refuseUnknownKeys,
} from './registry-readers.ts'

/** What a grant is bound to. */
export type SubjectKind = 'device' | 'host'

/** What an action does, which decides how it is confirmed and reported. */
export type ActionKind = 'query' | 'mutation' | 'navigation' | 'toggle' | 'dialog'

/** The surface an action's result lands in. */
export type ActionPane = 'main' | 'sheet' | 'menu' | 'drawer' | 'none'

/** One declared capability. */
export interface CapabilityRow {
  readonly id: string
  readonly subject: SubjectKind
  readonly ttlSeconds: number
}

/** One declared placement. */
export interface PlacementRow {
  readonly id: string
  readonly surface: string
}

/** One declared action. */
export interface ActionRow {
  readonly id: string
  readonly capability: string
  readonly placement: string
  readonly kind: ActionKind
  readonly pane: ActionPane
  readonly marker: string
  readonly labelKey: string | undefined
  readonly labelKeyOn: string | undefined
  readonly availability: string
  readonly remote: string | undefined
  readonly lane: string
}

/** The whole registry, validated. */
export interface Registry {
  readonly version: number
  readonly capabilities: readonly CapabilityRow[]
  readonly placements: readonly PlacementRow[]
  readonly actions: readonly ActionRow[]
}

/** The predicates an action may name for whether it is drawn at all. */
export const AVAILABILITY = [
  'always',
  'hasHosts',
  'hasActiveHost',
  'running',
  'unauthorized',
  'tailnetConnected',
] as const

/** The kinds an action may be. */
const KINDS: readonly ActionKind[] = ['query', 'mutation', 'navigation', 'toggle', 'dialog']

/** The panes an action may report into. */
const PANES: readonly ActionPane[] = ['main', 'sheet', 'menu', 'drawer', 'none']

/** The subjects a grant may be bound to. */
const SUBJECTS: readonly SubjectKind[] = ['device', 'host']

/** The keys each row of the schema declares. */
const KEYS = {
  document: ['version', 'capabilities', 'placements', 'actions'],
  capability: ['id', 'subject', 'ttlSeconds'],
  placement: ['id', 'surface'],
  action: [
    'id',
    'capability',
    'placement',
    'kind',
    'pane',
    'marker',
    'labelKey',
    'labelKeyOn',
    'availability',
    'remote',
    'lane',
  ],
} as const

/** The keys one capability row declares, as the parsed document carries them. */
interface CapabilityKeys {
  readonly [key: string]: Json
  readonly id?: Json
  readonly subject?: Json
  readonly ttlSeconds?: Json
}

/** The keys one placement row declares, as the parsed document carries them. */
interface PlacementKeys {
  readonly [key: string]: Json
  readonly id?: Json
  readonly surface?: Json
}

/** The keys one action row declares, as the parsed document carries them. */
interface ActionKeys {
  readonly [key: string]: Json
  readonly id?: Json
  readonly capability?: Json
  readonly placement?: Json
  readonly kind?: Json
  readonly pane?: Json
  readonly marker?: Json
  readonly labelKey?: Json
  readonly labelKeyOn?: Json
  readonly availability?: Json
  readonly remote?: Json
  readonly lane?: Json
}

/** The keys the document declares, as the parsed document carries them. */
interface DocumentKeys {
  readonly [key: string]: Json
  readonly version?: Json
  readonly capabilities?: Json
  readonly placements?: Json
  readonly actions?: Json
}

/**
 * Read one capability row.
 * @param value - the parsed row.
 * @param where - what it was found under.
 * @returns the validated row.
 */
function readCapability(value: Json, where: string): CapabilityRow {
  const row: CapabilityKeys = asObject(value, where)
  refuseUnknownKeys(row, where, KEYS.capability)
  return {
    id: asString(row.id, `${where}.id`),
    subject: asOneOf(row.subject, `${where}.subject`, SUBJECTS),
    ttlSeconds: asPositiveInt(row.ttlSeconds, `${where}.ttlSeconds`),
  }
}

/**
 * Read one placement row.
 * @param value - the parsed row.
 * @param where - what it was found under.
 * @returns the validated row.
 */
function readPlacement(value: Json, where: string): PlacementRow {
  const row: PlacementKeys = asObject(value, where)
  refuseUnknownKeys(row, where, KEYS.placement)
  return { id: asString(row.id, `${where}.id`), surface: asString(row.surface, `${where}.surface`) }
}

/**
 * Read one action row.
 * @param value - the parsed row.
 * @param where - what it was found under.
 * @returns the validated row.
 */
function readAction(value: Json, where: string): ActionRow {
  const row: ActionKeys = asObject(value, where)
  refuseUnknownKeys(row, where, KEYS.action)
  return {
    id: asString(row.id, `${where}.id`),
    capability: asString(row.capability, `${where}.capability`),
    placement: asString(row.placement, `${where}.placement`),
    kind: asOneOf(row.kind, `${where}.kind`, KINDS),
    pane: asOneOf(row.pane, `${where}.pane`, PANES),
    marker: asString(row.marker, `${where}.marker`),
    labelKey: asOptionalString(row.labelKey, `${where}.labelKey`),
    labelKeyOn: asOptionalString(row.labelKeyOn, `${where}.labelKeyOn`),
    availability: asOneOf(row.availability, `${where}.availability`, AVAILABILITY),
    remote: asOptionalString(row.remote, `${where}.remote`),
    lane: asString(row.lane, `${where}.lane`),
  }
}

/**
 * Refuse a list that names an id twice.
 * @param ids - the ids, in document order.
 * @param what - what they are, for the message.
 */
function refuseDuplicateIds(ids: readonly string[], what: string): void {
  const seen = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) refuse(`${what} "${id}" is declared twice`)
    seen.add(id)
  }
}

/**
 * Refuse a reference to a name that was never declared.
 * @param name - the name a row carried.
 * @param known - the declared names.
 * @param where - what carried it, for the message.
 */
function requireKnown(name: string, known: ReadonlySet<string>, where: string): void {
  if (!known.has(name)) refuse(`${where} names "${name}", which is not declared`)
}

/**
 * Validate the registry against itself: no id twice, no dangling reference, and
 * no placement holding nothing, which the interaction matrix would report as a
 * seat with no one in it.
 * @param registry - the rows, already read field by field.
 */
function crossCheck(registry: Registry): void {
  refuseDuplicateIds(
    registry.capabilities.map((row) => row.id),
    'capability',
  )
  refuseDuplicateIds(
    registry.placements.map((row) => row.id),
    'placement',
  )
  refuseDuplicateIds(
    registry.actions.map((row) => row.id),
    'action',
  )
  refuseDuplicateIds(
    registry.actions.map((row) => row.marker),
    'marker',
  )
  const capabilities = new Set(registry.capabilities.map((row) => row.id))
  const placements = new Set(registry.placements.map((row) => row.id))
  for (const action of registry.actions) {
    requireKnown(action.capability, capabilities, `action "${action.id}" capability`)
    requireKnown(action.placement, placements, `action "${action.id}" placement`)
  }
  for (const placement of placements) {
    if (!registry.actions.some((action) => action.placement === placement)) {
      refuse(`placement "${placement}" carries no action`)
    }
  }
}

/**
 * Read and validate the registry from its text.
 * @param text - the contents of `actions.bao`.
 * @returns the validated registry.
 */
export function readRegistry(text: string): Registry {
  const document: DocumentKeys = readJsonc(text)
  refuseUnknownKeys(document, 'document', KEYS.document)
  const registry: Registry = {
    version: asPositiveInt(document.version, 'version'),
    capabilities: asArray(document.capabilities, 'capabilities').map((row, index) =>
      readCapability(row, `capabilities[${String(index)}]`),
    ),
    placements: asArray(document.placements, 'placements').map((row, index) =>
      readPlacement(row, `placements[${String(index)}]`),
    ),
    actions: asArray(document.actions, 'actions').map((row, index) => readAction(row, `actions[${String(index)}]`)),
  }
  crossCheck(registry)
  return registry
}
