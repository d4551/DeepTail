/**
 * WCAG 2.2 AA over the refusals the product reports: the picker's unreadable
 * registry, a spawn the host refused, a boot the host refused, a pairing the
 * link refused, and a tailnet connection that never came up.
 *
 * Like the surfaces suite, every refusal is arranged in `a11y-surfaces.ts`, so
 * the same refusals are what the `a11y` script audits under every rule axe
 * enables.
 */

import { afterAll, beforeAll, it } from 'bun:test'
import { expectNoViolationsAtEachWidth } from './a11y-audit.ts'
import { REFUSAL_SURFACES } from './a11y-surfaces.ts'
import { type Harness, startHarness } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

for (const surface of REFUSAL_SURFACES) {
  it(`has no WCAG violations on ${surface.name} at every designed width, in both palettes`, async () => {
    await expectNoViolationsAtEachWidth(harness, surface)
  }, 180_000)
}
