/**
 * The roster the control plane exists to render: sessions from every paired host,
 * grouped by host, and each of the four states it can be in.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'bun:test'
import type { Page } from 'playwright'
import { oneHost, sessions } from './fixtures.ts'
import { type Harness, startHarness, textOf } from './harness.ts'
import { action, sessionRow, state, waitForState } from './page-steps.ts'
import { openShell, openShellWithRoster, RUNNING_ROW } from './surfaces.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

/**
 * The roster of the one paired host, which three cases read in turn.
 *
 * The page is opened once, here, rather than restated per case: every copy had
 * to remember both the live-mount wait and the row the roster seats, and a case
 * that forgot either raced the read it was asserting about.
 */
describe('the roster of one paired host', () => {
  let page: Page

  beforeEach(async () => {
    page = await openShellWithRoster(harness)
  })

  afterEach(async () => {
    await page.close()
  })

  it('lists a host and its sessions, announcing run state as text', async () => {
    expect(await textOf(page, '.group-name')).toBe('Workstation')
    expect(await textOf(page, `${RUNNING_ROW} .session-title`)).toBe('Refactor the loader')
    // The dot is aria-hidden, so run state has to reach a reader as text.
    expect(await textOf(page, `${RUNNING_ROW} .visually-hidden`)).toBe('Running')
    expect(await textOf(page, `${sessionRow('s-idle')} .visually-hidden`)).toBe('Idle')
    await harness.shoot(page, 'shell-ready')
  })

  it('hands the chosen session to the client on its own host', async () => {
    // Opening a session boots the harness client for that session's host, which
    // takes the page: the bar beside it is the only route back, so its arrival is
    // what the open control did. A control that only closed or only repainted
    // would leave the shell in place.
    await page.locator(`${RUNNING_ROW} ${action('row-open')}`).click()
    await page.locator('[data-deeptail-return]').waitFor({ state: 'attached' })
    expect(await textOf(page, '[data-deeptail-return]')).toBe('Back to all sessions')
    expect(await page.locator('[data-deeptail-shell]').count()).toBe(0)
  })

  it('offers Stop only on a running session', async () => {
    expect(await page.locator(`${RUNNING_ROW} ${action('row-stop')}`).count()).toBe(1)
    expect(await page.locator(`${sessionRow('s-idle')} ${action('row-stop')}`).count()).toBe(0)
  })
})

it('groups sessions by host across the fleet', async () => {
  const page = await openShell(harness)
  expect(await page.locator('.host-group').count()).toBe(2)
  const names = await page.locator('.group-name').allTextContents()
  expect(names).toEqual(['Workstation', 'Lab box'])
  await harness.shoot(page, 'fleet-multi-host')
  await page.close()
})

it('keeps working hosts visible when one fails', async () => {
  // Scoped to one host, or this is a total outage wearing the name of a partial
  // one and the assertions below cannot tell the difference.
  const page = await openShell(harness, { remoteErrors: { 'lab-2:session/list': 'roster unavailable' } })
  await waitForState(page, 'partial')
  // Partial failure is a warning beside content, never a blanked screen: the
  // host that answered must still be showing its rows.
  expect(await textOf(page, state('partial'))).toContain('roster unavailable')
  expect(await page.locator(state('partial')).count()).toBe(1)
  expect(await textOf(page, `${RUNNING_ROW} .session-title`)).toBe('Refactor the loader')
  expect(await page.locator('.session-row').count()).toBe(sessions().length)
  await harness.shoot(page, 'fleet-partial-failure')
  await page.close()
})

it('shows loading, never empty, while a roster read is still in flight', async () => {
  const page = await openShell(
    harness,
    oneHost({ remote: { 'session/list': { items: [] } }, remotePending: ['session/list'] }),
  )
  // The read never settles, so the anti-flash rule is observable: an empty
  // roster must read as loading until its list actually resolves.
  expect(await textOf(page, '[data-deeptail-state="loading"]')).toBe('Loading sessions…')
  expect(await page.locator('[data-deeptail-state="empty"]').count()).toBe(0)
  await harness.shoot(page, 'fleet-loading')
  await page.close()
})

it('reads an empty roster as loading until it settles', async () => {
  const page = await openShell(harness, oneHost({ remote: { 'session/list': { items: [] } } }))
  await page.locator('[data-deeptail-state="empty"]').waitFor({ state: 'visible' })
  expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('No sessions on this host yet.')
  await harness.shoot(page, 'fleet-empty')
  await page.close()
})

it('renders the dark palette and the sidebar fill from the harness tokens', async () => {
  const page = await openShell(harness, oneHost(), { dark: true })
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(21, 21, 23)')
  expect(
    await page.evaluate(() => {
      const sidebar = document.querySelector('.sidebar')
      return sidebar === null ? '' : getComputedStyle(sidebar).backgroundColor
    }),
  ).toBe('rgb(27, 27, 28)')
  await harness.shoot(page, 'shell-dark')
  await page.close()
})

it('fits a phone viewport without horizontal overflow', async () => {
  const page = await openShell(harness, oneHost(), { mobile: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(
    false,
  )
  await harness.shoot(page, 'shell-mobile')
  await page.close()
})

it('drives native chrome from the same attribute as the palette', async () => {
  const light = await openShell(harness)
  // `color-scheme` is a stylesheet rule keyed off the dark attribute, so the UA
  // widgets and the palette cannot disagree.
  expect(await light.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('light')
  expect(await light.evaluate(() => document.body.dataset['dsDarkTheme'] !== undefined)).toBe(false)
  await light.close()

  const darkPage = await openShell(harness, {}, { dark: true })
  expect(await darkPage.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')
  expect(await darkPage.evaluate(() => document.body.dataset['dsDarkTheme'] !== undefined)).toBe(true)
  await darkPage.close()
})

it('words a row age in the locale the surface is speaking', async () => {
  const ages = async (locale: string): Promise<string[]> => {
    const spoke = await openShell(harness, oneHost(), { locale })
    await spoke.locator(sessionRow('s-idle')).waitFor({ state: 'visible' })
    const found = await spoke.evaluate(() =>
      [...document.querySelectorAll('.session-time')].map((node) => node.textContent?.trim() ?? ''),
    )
    await spoke.close()
    return found
  }
  const english = await ages('en-GB')
  const chinese = await ages('zh-CN')
  // The fixture holds one session touched seconds ago and one an hour ago, so
  // both the just-now case and a counted one are rendered.
  expect(english.length).toBe(2)
  expect(english.every((age) => age !== '')).toBe(true)
  // The wording is the platform's, asked in the locale the copy source speaks.
  // Formatting in the browser's own language instead would render these the
  // same whatever the surface had switched to.
  expect(chinese).not.toEqual(english)
  expect(chinese.some((age) => /\p{Script=Han}/u.test(age))).toBe(true)
  expect(english.some((age) => /\p{Script=Han}/u.test(age))).toBe(false)

  // A browser asking for a language this product does not ship gets the English
  // dictionary, so the ages beside that English must be English too. Formatting
  // in the browser's own language instead is how a row ends up reading "il y a
  // 1 h" under an English heading.
  expect(await ages('fr-FR')).toEqual(english)
})
