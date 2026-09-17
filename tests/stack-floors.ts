/**
 * The readers the floor table is held to.
 *
 * One copy of each read, so a case that drives a downgrade and the case that
 * reads the shipped manifests cannot disagree about what a floor is: both go
 * through the table in `stack-policy.ts` and the readers here. The data lives
 * there and the reading lives here, which is the seam the line limit drew
 * through what used to be one suite.
 *
 * @module
 */

import { coerce, gte } from 'semver'
import { FLOORS, PREVIOUS_LINES } from './stack-policy.ts'

/**
 * Dependencies pinned below their floor, or not declared at all.
 * @param found - every dependency the repository declares.
 * @returns one line per tool that fails its floor.
 */
export function belowFloor(found: ReadonlyMap<string, string>): string[] {
  const behind: string[] = []
  for (const [name, floor] of Object.entries(FLOORS)) {
    const range = found.get(name)
    if (range === undefined) {
      behind.push(`${name} is not declared anywhere`)
      continue
    }
    const pinned = coerce(range)
    if (pinned === null) {
      behind.push(`${name} declares an unreadable range: ${range}`)
      continue
    }
    if (!gte(pinned, floor)) behind.push(`${name} ${range} is below the ${floor} floor`)
  }
  return behind
}

/**
 * Dependencies declared with no floor, or with one that no longer matches what
 * is declared.
 * @param declared - every dependency the repository declares.
 * @returns one line per tool whose floor is missing or stale.
 */
export function unstatedFloors(declared: ReadonlyMap<string, string>): string[] {
  const unstated: string[] = []
  for (const [name, range] of declared) {
    const floor = FLOORS[name]
    if (floor === undefined) {
      unstated.push(`${name} is installed with no floor stated`)
      continue
    }
    const pinned = coerce(range)
    if (pinned === null) continue
    if (pinned.version !== floor) {
      unstated.push(`${name} ${range} is held at a floor that no longer matches it: ${floor}`)
    }
  }
  return unstated
}

/**
 * The version one step below a floor, staying inside the same major where the
 * major has room for one: the patch before it, or the last patch of the minor
 * before it when the floor is a nought-patch release.
 *
 * A floor at `x.0.0` has no release below it inside its own major — the first
 * release of a major is its lowest — so the only line back is the previous
 * major, which `PREVIOUS_LINES` states and the last case in `stack.spec.ts`
 * drives.
 * @param floor - the floor to step back from.
 * @returns the version just below it, or undefined when its major has none.
 */
export function stepBelow(floor: string): string | undefined {
  const parts = floor.split('.')
  const minor = Number(parts[1] ?? '0')
  const patch = Number(parts[2] ?? '0')
  if (patch > 0) return `${parts[0] ?? '0'}.${minor}.${patch - 1}`
  if (minor > 0) return `${parts[0] ?? '0'}.${minor - 1}.9`
  return undefined
}

/**
 * The names of the floors a step inside their own major cannot be taken from.
 * @returns the names, in table order.
 */
export function floorsWithNoStep(): string[] {
  return Object.entries(FLOORS)
    .filter(([, floor]) => stepBelow(floor) === undefined)
    .map(([name]) => name)
}

/**
 * The previous lines that are not, in fact, below the floor they belong to.
 * @returns one line per entry the table states wrongly.
 */
export function previousLineGaps(): string[] {
  const wrong: string[] = []
  for (const [name, version] of Object.entries(PREVIOUS_LINES)) {
    const floor = FLOORS[name]
    if (floor === undefined) {
      wrong.push(`${name} states a previous line for a tool with no floor`)
      continue
    }
    const stated = coerce(version)
    if (stated === null) {
      wrong.push(`${name} states an unreadable previous line: ${version}`)
      continue
    }
    if (gte(stated, floor)) wrong.push(`${name} states ${version} as a previous line, above its ${floor} floor`)
  }
  return wrong
}
