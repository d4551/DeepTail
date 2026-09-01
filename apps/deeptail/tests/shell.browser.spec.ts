/**
 * The control-plane shell, driven in Chromium against the built bundle.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { type Harness, type Script, startHarness, textOf } from './harness.ts'

let harness: Harness

const HOSTS = [
  { id: 'dev-1', label: 'Workstation', origin: 'https://harness.local:3080' },
  { id: 'lab-2', label: 'Lab box', origin: 'https://lab.internal:3080' },
]

const SESSIONS = [
  {
    sessionId: 's-running',
    updatedAt: Date.now() - 30_000,
    running: true,
    blank: false,
    projections: { values: { title: 'Refactor the loader' } },
  },
  {
    sessionId: 's-idle',
    updatedAt: Date.now() - 3_600_000,
    running: false,
    blank: false,
    projections: { values: { title: 'Write the release notes' } },
  },
]

/** One host with a populated roster. */
function oneHost(extra: Partial<Script> = {}): Script {
  return { hosts: [HOSTS[0]], remote: { 'session/list': { items: SESSIONS } }, ...extra }
}

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

describe('shell', () => {
  it('lists a host and its sessions, announcing run state as text', async () => {
    const page = await harness.open(oneHost())
    await page.waitForSelector('[data-deeptail-shell]')
    expect(await textOf(page, '.group-name')).toBe('Workstation')
    expect(await textOf(page, '[data-deeptail-session="s-running"] .session-title')).toBe('Refactor the loader')
    // The dot is aria-hidden, so run state has to reach a reader as text.
    expect(await textOf(page, '[data-deeptail-session="s-running"] .visually-hidden')).toBe('Running')
    expect(await textOf(page, '[data-deeptail-session="s-idle"] .visually-hidden')).toBe('Idle')
    await harness.shoot(page, 'shell-ready')
    await page.close()
  })

  it('offers Stop only on a running session', async () => {
    const page = await harness.open(oneHost())
    await page.waitForSelector('[data-deeptail-shell]')
    expect(await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-stop"]').count()).toBe(1)
    expect(await page.locator('[data-deeptail-session="s-idle"] [data-deeptail-action="row-stop"]').count()).toBe(0)
    await page.close()
  })

  it('groups sessions by host across the fleet', async () => {
    const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: SESSIONS } } })
    await page.waitForSelector('[data-deeptail-shell]')
    expect(await page.locator('.host-group').count()).toBe(2)
    const names = await page.locator('.group-name').allTextContents()
    expect(names).toEqual(['Workstation', 'Lab box'])
    await harness.shoot(page, 'fleet-multi-host')
    await page.close()
  })

  it('keeps working hosts visible when one fails', async () => {
    const page = await harness.open({
      hosts: HOSTS,
      remote: { 'session/list': { items: SESSIONS } },
      remoteErrors: { 'session/list': 'roster unavailable' },
    })
    await page.waitForSelector('[data-deeptail-state="partial"]')
    // Partial failure is a warning beside content, never a blanked screen.
    expect(await textOf(page, '[data-deeptail-state="partial"]')).toContain('roster unavailable')
    expect(await page.locator('.host-group').count()).toBe(2)
    await harness.shoot(page, 'fleet-partial-failure')
    await page.close()
  })

  it('reads an empty roster as loading until it settles', async () => {
    const page = await harness.open({ hosts: [HOSTS[0]], remote: { 'session/list': { items: [] } } })
    await page.waitForSelector('[data-deeptail-state="empty"]')
    expect(await textOf(page, '[data-deeptail-state="empty"]')).toBe('No sessions on this host yet.')
    await harness.shoot(page, 'fleet-empty')
    await page.close()
  })

  it('marks the active host with a trailing check, not a fill', async () => {
    const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: SESSIONS } } })
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-connection="trigger"]').click()
    const menu = page.locator('[data-deeptail-connection="menu"]')
    expect(await menu.getAttribute('role')).toBe('menu')
    expect(await page.locator('[data-deeptail-connection="menu"] [aria-current="true"]').count()).toBe(1)
    expect(await textOf(page, '[data-deeptail-connection="menu"] [aria-current="true"] .menu-label')).toBe(
      'Workstation',
    )
    await harness.shoot(page, 'connection-menu')
    await page.close()
  })

  it('closes the connection menu on Escape', async () => {
    const page = await harness.open({ hosts: HOSTS, remote: { 'session/list': { items: SESSIONS } } })
    await page.waitForSelector('[data-deeptail-shell]')
    const trigger = page.locator('[data-deeptail-connection="trigger"]')
    await trigger.click()
    expect(await trigger.getAttribute('aria-expanded')).toBe('true')
    await page.keyboard.press('Escape')
    expect(await trigger.getAttribute('aria-expanded')).toBe('false')
    await page.close()
  })

  it('sends a message through the compose sheet', async () => {
    const page = await harness.open(oneHost())
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-session="s-running"]').hover()
    await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-message"]').click()
    const dialog = page.locator('[data-deeptail-dialog]')
    expect(await dialog.getAttribute('aria-modal')).toBe('true')
    await harness.shoot(page, 'compose-sheet')
    await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
    await page.locator('[data-deeptail-action="compose-send"]').click()
    await dialog.waitFor({ state: 'detached' })
    await page.close()
  })

  it('keeps the draft when a send fails', async () => {
    const page = await harness.open(oneHost({ remoteErrors: { 'session/prompt': 'agent busy' } }))
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-session="s-running"]').hover()
    await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-message"]').click()
    await page.locator('[data-deeptail-field="message"]').fill('please rerun the tests')
    await page.locator('[data-deeptail-action="compose-send"]').click()
    expect(await textOf(page, '[data-deeptail-state="compose-error"]')).toContain('agent busy')
    expect(await page.locator('[data-deeptail-field="message"]').inputValue()).toBe('please rerun the tests')
    await harness.shoot(page, 'compose-error')
    await page.close()
  })

  it('offers the presets a host reports when spawning', async () => {
    const page = await harness.open(
      oneHost({
        remote: {
          'session/list': { items: SESSIONS },
          'agentPresets/list': {
            items: [
              { id: 'standard', name: 'Standard' },
              { id: 'ptc', name: 'PTC' },
            ],
          },
        },
      }),
    )
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-action="new-session"]').click()
    // An <option> is never "visible" to Playwright; wait for it in the DOM.
    await page.waitForSelector('[data-deeptail-field="preset"] option', { state: 'attached' })
    expect(await page.locator('[data-deeptail-field="preset"] option').allTextContents()).toEqual(['Standard', 'PTC'])
    await harness.shoot(page, 'new-session')
    await page.close()
  })

  it('moves the roving tab stop across session rows', async () => {
    const page = await harness.open(oneHost())
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-session="s-running"]').focus()
    await page.keyboard.press('ArrowDown')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-deeptail-session') ?? null)).toBe(
      's-idle',
    )
    await page.keyboard.press('Home')
    expect(await page.evaluate(() => document.activeElement?.getAttribute('data-deeptail-session') ?? null)).toBe(
      's-running',
    )
    await page.close()
  })

  it('renders the dark palette and the sidebar fill from the harness tokens', async () => {
    const page = await harness.open(oneHost(), { dark: true })
    await page.waitForSelector('[data-deeptail-shell]')
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
    const page = await harness.open(oneHost(), { mobile: true })
    await page.waitForSelector('[data-deeptail-shell]')
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(
      false,
    )
    await harness.shoot(page, 'shell-mobile')
    await page.close()
  })
})
