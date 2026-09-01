/**
 * The first-run pairing screen, driven in Chromium against the built bundle.
 *
 * The picker is reached only when no host is paired; once one is, the shell
 * takes over. These cases therefore all start from an empty registry.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { type Harness, startHarness, textOf } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

describe('first-run pairing', () => {
  it('shows the empty state, not a bare list, when nothing is paired', async () => {
    const page = await harness.open({ hosts: [] })
    expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('No hosts paired yet.')
    expect(await page.locator('button.button-primary').textContent()).toBe('Pair a host')
    // The empty screen is the call to action; there is no list to choose from.
    expect(await page.locator('[role="list"]').count()).toBe(0)
    await harness.shoot(page, 'picker-empty')
    await page.close()
  })

  it('rejects an empty pairing link before calling the host', async () => {
    const page = await harness.open({ hosts: [] })
    await page.locator('button.button-primary').click()
    await page.locator('[data-deeptail-action="pair-submit"]').click()
    expect(await textOf(page, '[role="alert"]')).toContain('Paste the whole link.')
    await harness.shoot(page, 'picker-validation')
    await page.close()
  })

  it('reports a rejected pairing without losing what was typed', async () => {
    const page = await harness.open({ hosts: [], pairError: 'host refused the launch token' })
    await page.locator('button.button-primary').click()
    await page.locator('[data-deeptail-field="link"]').fill('https://harness.local:3080/?token=abc')
    await page.locator('[data-deeptail-action="pair-submit"]').click()
    expect(await textOf(page, '[role="alert"]')).toContain('host refused the launch token')
    // A failed send must not cost the operator what they typed.
    expect(await page.locator('[data-deeptail-field="link"]').inputValue()).toBe(
      'https://harness.local:3080/?token=abc',
    )
    await harness.shoot(page, 'picker-error')
    await page.close()
  })

  it('translates into Chinese for a zh browser', async () => {
    const page = await harness.open({ hosts: [] }, { locale: 'zh-CN' })
    expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('尚未配对任何主机。')
    expect(await page.evaluate(() => document.documentElement.lang)).toBe('zh-CN')
    await harness.shoot(page, 'picker-zh')
    await page.close()
  })

  it('renders the dark palette from the harness tokens', async () => {
    const page = await harness.open({ hosts: [] }, { dark: true })
    await page.waitForSelector('[data-deeptail-state="empty"]')
    expect(await page.evaluate(() => document.body.hasAttribute('data-ds-dark-theme'))).toBe(true)
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(21, 21, 23)')
    await harness.shoot(page, 'picker-dark')
    await page.close()
  })
})
