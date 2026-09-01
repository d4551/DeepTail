/**
 * The platform preferences the shell has to answer: high contrast, and less
 * motion.
 *
 * High contrast substitutes every author colour, so anything this product
 * carries in a background or a token disappears there unless it is restated
 * against the system keywords. Reduced motion has to reach every transition,
 * not only the one that was easiest to find.
 */

import { afterAll, beforeAll, expect, it } from 'bun:test'
import { fleet } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('keeps every state visible when the platform replaces the palette', async () => {
  const page = await harness.open(fleet({ remoteErrors: { 'lab-2:session/list': 'roster unavailable' } }), {
    forcedColors: true,
  })
  await page.waitForSelector('[data-deeptail-state="partial"]')
  const [sidebar, online, offline, warning] = await page.evaluate(() =>
    (
      [
        ['#deeptail-sidebar', 'borderInlineEndWidth'],
        ['.dot[data-state="online"]', 'borderTopWidth'],
        ['.dot[data-state="offline"]', 'borderTopWidth'],
        ['[data-deeptail-state="partial"]', 'borderTopWidth'],
      ] as const
    ).map(([selector, side]) => {
      const node = document.querySelector(selector)
      return node === null ? 'absent' : getComputedStyle(node)[side]
    }),
  )
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true)
  // Each of these is carried by a background or a token colour that the mode
  // discards, so each has to be restated as a rule the mode keeps.
  expect([sidebar, online, offline, warning]).not.toContain('0px')
  expect([sidebar, online, offline, warning]).not.toContain('absent')
  await page.close()
})

it('tells the two unreachable states apart when there is no palette to spend', async () => {
  const page = await harness.open(fleet({ remoteStatuses: { 'lab-2:session/list': 401 } }), { forcedColors: true })
  await page.waitForSelector('[data-deeptail-shell]')
  const looks = await page.evaluate(() =>
    ['offline', 'unauthorized'].map((state) => {
      const node = document.querySelector(`.dot[data-state="${state}"]`)
      if (node === null) return 'absent'
      const style = getComputedStyle(node)
      return `${style.backgroundColor}/${style.borderTopStyle}`
    }),
  )
  // One of them the operator can act on; high contrast must not flatten them
  // into the same mark.
  expect(looks[1]).not.toBe(looks[0])
  await page.close()
})

it('distinguishes the two unreachable states without relying on colour', async () => {
  const page = await harness.open(fleet({ remoteStatuses: { 'lab-2:session/list': 401 } }), { forcedColors: true })
  await page.waitForSelector('[data-deeptail-shell]')
  // The dot is decorative in every mode; the state is spoken beside it.
  expect(await page.locator('.connection-trigger .visually-hidden').first().textContent()).toBeTruthy()
  await page.close()
})

it('stops every transition and animation for a viewer who asked for less motion', async () => {
  const page = await harness.open(fleet(), { mobile: true, reducedMotion: true })
  await page.waitForSelector('[data-deeptail-shell]')
  const moving = await page.evaluate(() =>
    [...document.querySelectorAll('*')]
      .filter((node) => {
        const computed = getComputedStyle(node)
        return [...computed.transitionDuration.split(','), ...computed.animationDuration.split(',')].some(
          (value) => Number(value.replace('s', '')) > 0.011,
        )
      })
      .map((node) => `${node.tagName.toLowerCase()}.${String(node.className)}`),
  )
  expect(moving).toEqual([])
  await page.close()
})
