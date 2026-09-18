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
 * found inside the same slice belong to one case rather than to the file. A
 * case may sit inside a describe, so the match takes the indentation the suite
 * wraps its cases in.
 * @param source - the lane's source.
 * @returns the cases, titled as written.
 */
function casesOf(source: string): readonly LaneCase[] {
  const starts = [...source.matchAll(/^[\t ]*it\(/gmu)].map((match) => match.index)
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

/** One exported unit of a module a lane drives its controls through. */
interface SharedUnit {
  /** The name the case calls it by. */
  readonly name: string
  /** The unit's own source, marker and press included. */
  readonly body: string
}

/** The shared modules a lane reads, by the lane that reads them. */
const sharedModules = new Map<string, Promise<readonly SharedUnit[]>>()

/**
 * Every exported function and constant of the modules one lane imports.
 *
 * The choreography the browser suites share states a control's activation once,
 * beside the marker, and a case drives the control by calling into it — so the
 * lane's own source no longer carries the marker its case fires. Reading the
 * closure beside the lane is what keeps that extraction from reading as a gap.
 * @param lane - the repository-relative path the action names.
 * @param source - the lane's own source, read for its imports.
 * @returns one unit per export, in declaration order.
 */
function sharedUnits(lane: string, source: string): Promise<readonly SharedUnit[]> {
  const cached = sharedModules.get(lane)
  if (cached !== undefined) return cached
  const read = (async (): Promise<readonly SharedUnit[]> => {
    const directory = lane.slice(0, lane.lastIndexOf('/'))
    const names = [...source.matchAll(/from '\.\/([^']+)\.ts'/gu)].map((match) => match[1])
    const texts = await Promise.all(
      names.map(async (name) => {
        const file = Bun.file(`${ROOT}${directory}/${name}.ts`)
        return (await file.exists()) ? await file.text() : ''
      }),
    )
    return texts.flatMap((text) => {
      const starts: { readonly name: string; readonly index: number | undefined }[] = []
      for (const match of text.matchAll(/^export (?:async )?(?:function|const) (\w+)/gmu)) {
        const name = match[1]
        if (name !== undefined) starts.push({ name, index: match.index })
      }
      return starts.map(({ name, index }, at) => ({
        name,
        body: text.slice(index, starts[at + 1]?.index ?? text.length),
      }))
    })
  })()
  sharedModules.set(lane, read)
  return read
}

/**
 * The spellings one control's marker is named in.
 *
 * The attribute the registry declares, and the marker as an argument to the
 * vocabulary every suite drives a control through — `action('row-message')`, or
 * `clickAction(page, 'row-message')`, which builds the attribute from it.
 * @param marker - the `data-deeptail-action` the action declares.
 * @returns the text each spelling is written as.
 */
function markerSpellings(marker: string): readonly string[] {
  return [`data-deeptail-action="${marker}"`, `'${marker}'`, `"${marker}"`]
}

/**
 * Whether a unit builds a control's selector out of an argument it was handed.
 *
 * The patterns are the two the suites write: the attribute built from a value,
 * and the shared builder called with one.
 * @param body - the unit's own source.
 * @returns true when the unit's selector comes from its caller.
 */
function buildsFromArgument(body: string): boolean {
  return body.includes('data-deeptail-action="${') || /\baction\(\s*\w+\s*\)/u.test(body)
}

/**
 * Whether one shared unit activates a marker, for a case that calls into it.
 *
 * Three shapes carry the activation: the unit states the marker and the press
 * itself, the unit takes the marker as its own argument and the case passes it,
 * or the unit hands the marker to a unit that presses what it was handed.
 * @param unit - the shared unit's own source.
 * @param marker - the `data-deeptail-action` the action declares.
 * @param called - the case's own source, which carries the call.
 * @param all - every unit of the modules the lane drives its controls through.
 * @returns true when the case drives the control through this unit.
 */
function unitFires(unit: SharedUnit, marker: string, called: string, all: readonly SharedUnit[]): boolean {
  const declared = unit.body.includes(`data-deeptail-action="${marker}"`)
  const named = markerSpellings(marker).some((spelling) => unit.body.includes(spelling))
  const presses = /\.(?:click|check|press)\(/u.test(unit.body)
  const stated = (declared || (named && buildsFromArgument(unit.body))) && presses
  // A helper that takes the marker as its own argument activates whatever the
  // case passes it, so the case's own argument is the activation's subject.
  const parameterised = buildsFromArgument(unit.body) && called.includes(marker)
  // A constant that names the control is the activation when the case presses
  // what the constant holds.
  const constant =
    declared &&
    new RegExp(`\\b${unit.name}\\b[\\s\\S]{0,${String(ACTIVATION_WINDOW)}}\\.(?:click|check|press)\\(`, 'u').test(
      called,
    )
  // A unit that hands the marker on to a parameterised unit inherits that
  // unit's activation: the unit named the marker, the chain ends at a press.
  const delegates =
    named &&
    all.some(
      (other) => other.name !== unit.name && unit.body.includes(`${other.name}(`) && buildsFromArgument(other.body),
    )
  return (stated && new RegExp(`\\b${unit.name}\\(`, 'u').test(called)) || parameterised || constant || delegates
}

/**
 * Whether one case activates a marker and then asserts.
 *
 * Activation is a real pointer or keyboard press on the control carrying the
 * marker: a `click`, a `check` or a `press`, in the case's own source or in the
 * shared choreography the case calls into. An assertion in the same case is
 * what stops a case that drives the control and reports nothing from standing
 * for verification.
 * @param body - the case's own source.
 * @param marker - the `data-deeptail-action` the action declares.
 * @param shared - the units of the modules the lane drives its controls through.
 * @returns true when the case activates the marker and asserts.
 */
function fires(body: string, marker: string, shared: readonly SharedUnit[]): boolean {
  const reference = new RegExp(`data-deeptail-action="${marker}"`, 'gu')
  const activates = [...body.matchAll(reference)].some(({ index }) =>
    /\.(?:click|check|press)\(/u.test(body.slice(index, index + ACTIVATION_WINDOW)),
  )
  return (activates || shared.some((unit) => unitFires(unit, marker, body, shared))) && body.includes('expect(')
}

describe('the shipped action registry', () => {
  it('fires every declared action from a case its own lane names', async () => {
    // The lane is the suite that verifies the action, so an action whose lane
    // never activates its control is an action nothing verifies — the gap a
    // lane existing as a file cannot tell from a lane that drives it. Each
    // action is a control the operator presses, so the case that verifies it
    // drives that control in a browser, directly or through the choreography
    // the suites share.
    const unfired = await Promise.all(
      registry.actions.map(async (action) => {
        if (!action.lane.endsWith(BROWSER_LANE)) {
          return `${action.id}: ${action.lane} is not a browser suite`
        }
        const cases = await laneCases(action.lane)
        if (cases === undefined) return `${action.id}: ${action.lane} is not a file`
        const laneSource = await Bun.file(`${ROOT}${action.lane}`).text()
        const shared = await sharedUnits(action.lane, laneSource)
        return cases.some((one) => fires(one.body, action.marker, shared))
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
