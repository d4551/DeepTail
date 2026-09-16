/**
 * The registry the whole product is generated from, read as it ships.
 *
 * What the reader refuses is driven in `action-registry.spec.ts`, what the
 * emitters write in `action-registry-emit.spec.ts`, and the generated files are
 * held to the emitters in `tests/tree/faces.spec.ts`. What is left, and what is
 * here, is the shipped document itself: every action names a lane a reader can
 * open, prices itself in a capability the page can spend, and is fired by the
 * case its own lane names.
 *
 * The firing gate reads each lane's source and proves the case activates the
 * action's own registry marker — the `data-deeptail-action` its control carries
 * — and that the case asserts something, which is what tells a control the
 * suite drives from a control the suite merely names. Reading source cannot
 * read an assertion's subject, so the second half of that proof lives in
 * `tests/dispatcher.spec.ts`: it runs the real dispatcher over every declared
 * action and asserts the call each handler made.
 */

import { describe, expect, it } from 'bun:test'
import { isCapabilityId } from '../apps/deeptail/src/actions/registry.ts'
import { readRegistry } from '../scripts/action-registry.ts'
import { ROOT } from '../scripts/source-tree.ts'

/** The registry as it ships. */
const registry = readRegistry(await Bun.file(`${ROOT}apps/deeptail/src/actions/actions.bao`).text())

/** The suffix a lane carries when it drives the built product in a browser. */
const BROWSER_LANE = '.browser.spec.ts'

/** How far past a marker its activation may be written, in characters. */
const ACTIVATION_WINDOW = 160

/** One case a lane declares, as its own source reads. */
interface LaneCase {
  /** The title the case is registered under. */
  readonly title: string
  /** The case's own source, up to the next case in the file. */
  readonly body: string
}

/**
 * Every case one lane declares, in source order.
 *
 * A case runs from its own `it(` to the next one, so a marker and an assertion
 * found inside the same slice belong to one case rather than to the file.
 * @param source - the lane's source.
 * @returns the cases, titled as written.
 */
function casesOf(source: string): readonly LaneCase[] {
  const starts = [...source.matchAll(/^it\(/gmu)].map((match) => match.index)
  return starts.map((start, index) => {
    const body = source.slice(start, starts[index + 1] ?? source.length)
    const title = /^it\(\s*(?:['"`])([\s\S]*?)(?:['"`])/u.exec(body)?.[1] ?? body.slice(0, 60)
    return { title, body }
  })
}

/** The cases one lane declares, read once per process. */
const lanes = new Map<string, Promise<readonly LaneCase[] | undefined>>()

/**
 * Read one lane's cases.
 * @param lane - the repository-relative path the action names.
 * @returns the cases, or undefined when no such file exists.
 */
function laneCases(lane: string): Promise<readonly LaneCase[] | undefined> {
  const reading = lanes.get(lane)
  if (reading !== undefined) return reading
  const read = (async (): Promise<readonly LaneCase[] | undefined> => {
    const file = Bun.file(`${ROOT}${lane}`)
    if (!(await file.exists())) return undefined
    return casesOf(await file.text())
  })()
  lanes.set(lane, read)
  return read
}

/**
 * Whether one case activates a marker and then asserts.
 *
 * Activation is a real pointer or keyboard press on the control carrying the
 * marker: a `click`, a `check` or a `press`. An assertion in the same case is
 * what stops a case that drives the control and reports nothing from standing
 * for verification.
 * @param body - the case's own source.
 * @param marker - the `data-deeptail-action` the action declares.
 * @returns true when the case activates the marker and asserts.
 */
function fires(body: string, marker: string): boolean {
  const reference = new RegExp(`data-deeptail-action="${marker}"`, 'gu')
  const activates = [...body.matchAll(reference)].some(({ index }) =>
    /\.(?:click|check|press)\(/u.test(body.slice(index, index + ACTIVATION_WINDOW)),
  )
  return activates && body.includes('expect(')
}

describe('the shipped action registry', () => {
  it('fires every declared action from a case its own lane names', async () => {
    // The lane is the suite that verifies the action, so an action whose lane
    // never activates its control is an action nothing verifies — the gap a
    // lane existing as a file cannot tell from a lane that drives it. Each
    // action is a control the operator presses, so the case that verifies it
    // drives that control in a browser.
    const unfired = await Promise.all(
      registry.actions.map(async (action) => {
        if (!action.lane.endsWith(BROWSER_LANE)) {
          return `${action.id}: ${action.lane} is not a browser suite`
        }
        const cases = await laneCases(action.lane)
        if (cases === undefined) return `${action.id}: ${action.lane} is not a file`
        return cases.some((one) => fires(one.body, action.marker))
          ? ''
          : `${action.id}: no case in ${action.lane} activates ${action.marker}`
      }),
    )
    expect(unfired.filter((line) => line !== '')).toEqual([])
  })

  it('prices every action in a capability the generated face declares', () => {
    // The reader refuses a dangling reference inside the document; this is the
    // same question asked of the face the page compiles against, which is what
    // decides whether a control can be drawn at all.
    const undeclared = registry.actions
      .map((action) => action.capability)
      .filter((capability) => !isCapabilityId(capability))
    expect(undeclared).toEqual([])
  })

  it('declares an action at all, so neither case above passes over an empty list', () => {
    expect(registry.actions.length).toBeGreaterThan(0)
  })
})
