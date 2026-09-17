/**
 * The accessibility audit the `a11y` script runs.
 *
 * What stood here was an `echo` of the sentence below, at the end of a shell
 * chain: true whenever the commands before it were weakened, deleted, or
 * pointed at nothing, and never a claim a browser had to answer. The sentence
 * is printed here, and only from a run that can be read — the built page held
 * to its own contract, every surface in `a11y-surfaces.ts` arranged at every
 * designed width it exists on, in both palettes, in the real bundle in
 * Chromium, with axe asked for its whole default rule set and for the published
 * WCAG 2.2 AA tags beside it: nothing filtered out by tag, and nothing narrowed
 * by severity.
 *
 * The tailnet screens are arranged and audited by `tailnet.browser.spec.ts`,
 * which the same script runs before this.
 *
 * @module
 */

import { type ArrangementKey, auditSurfacesAtEachView } from '../apps/deeptail/tests/a11y-audit.ts'
import { AUDITED_SURFACES, viewsOf } from '../apps/deeptail/tests/a11y-surfaces.ts'
import { AUDIT_RULES } from '../apps/deeptail/tests/audit.ts'
import { BUILT_PAGE, startHarness } from '../apps/deeptail/tests/harness.ts'
import { auditReport } from './a11y-report.ts'
import { CONSOLE, type GateOutcome, reportGate } from './gate-runner.ts'
import { documentOffences } from './paint-contract.ts'
import { ROOT } from './source-tree.ts'

/** Every source the bundle is built from, as one glob over the app. */
const SOURCES = 'apps/deeptail/{index.html,vite.config.ts,src/**/*.ts,src/**/*.css}'

/**
 * Every arrangement the audit sets out to make, read from the surface list.
 * @returns one key per surface and view, in the order the list declares them.
 */
export function plannedArrangements(): ArrangementKey[] {
  return AUDITED_SURFACES.flatMap((surface) =>
    viewsOf(surface).map((view) => ({
      surface: surface.name,
      view: view.label,
      width: view.width,
      height: view.height,
    })),
  )
}

/**
 * The newest source the built page predates, when there is one.
 *
 * The audit reads the bundle a reader is served, not the sources it was built
 * from, so a bundle older than its sources answers for code that is no longer
 * on disk. The `a11y` script builds first, which is what keeps this from firing
 * in the chain; a program run on its own is what it is here for.
 * @returns one line when the page predates a source, empty when it does not.
 */
async function stalePage(): Promise<string[]> {
  const built = (await Bun.file(BUILT_PAGE).stat()).mtime.getTime()
  let newest = ''
  let newestAt = built
  for await (const rel of new Bun.Glob(SOURCES).scan({ cwd: ROOT })) {
    const at = (await Bun.file(`${ROOT}${rel}`).stat()).mtime.getTime()
    if (at > newestAt) {
      newest = rel
      newestAt = at
    }
  }
  return newest === '' ? [] : [`the built page predates ${newest}, which the bundle would answer for: build it first`]
}

/**
 * What the built page is refused for before any surface is opened.
 *
 * A page that is not the product document is not worth auditing: the surfaces
 * are arranged in a page the contract has already refused.
 * @returns one line per refusal, empty when the page conforms and is current.
 */
async function refusedPage(): Promise<string[]> {
  const page = Bun.file(BUILT_PAGE)
  if (!(await page.exists())) {
    return [`the built page is not on disk: ${BUILT_PAGE.pathname} has to be built before it can be audited`]
  }
  const refused = await stalePage()
  if (refused.length > 0) return refused
  return documentOffences(await page.text()).map(
    (offence) => `the built page is not the product document: line ${String(offence.line)}: ${offence.why}`,
  )
}

/**
 * Audit the built page, and every surface of it, under every rule axe runs.
 * @returns what the audit has to say, and the status it exits under.
 */
export async function runAudit(): Promise<GateOutcome> {
  const expected = plannedArrangements()
  const pageRefused = await refusedPage()
  if (pageRefused.length > 0) return auditReport({ expected, results: [], pageRefused })
  const harness = await startHarness()
  const results = await auditSurfacesAtEachView(harness, AUDITED_SURFACES, AUDIT_RULES)
  await harness.stop()
  return auditReport({ expected, results, pageRefused: [] })
}

if (import.meta.main) process.exitCode = reportGate(await runAudit(), CONSOLE)
