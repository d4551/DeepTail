/**
 * The control-plane shell, driven in Chromium against the built bundle.
 *
 * Every assertion is on rendered text and roles. The only substitution is the
 * Tauri IPC boundary, which no browser provides.
 */

import { afterAll, beforeAll, describe, expect, it } from 'bun:test'
import { type AnswerTable, type Harness, startHarness, textOf } from './harness.ts'

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
function oneHost(extra: Partial<AnswerTable> = {}): AnswerTable {
  return { hosts: HOSTS.slice(0, 1), remote: { 'session/list': { items: SESSIONS } }, ...extra }
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
      // Scoped to one host, or this is a total outage wearing the name of a
      // partial one and the assertions below cannot tell the difference.
      remoteErrors: { 'lab-2:session/list': 'roster unavailable' },
    })
    await page.waitForSelector('[data-deeptail-state="partial"]')
    // Partial failure is a warning beside content, never a blanked screen: the
    // host that answered must still be showing its rows.
    expect(await textOf(page, '[data-deeptail-state="partial"]')).toContain('roster unavailable')
    expect(await page.locator('[data-deeptail-state="partial"]').count()).toBe(1)
    expect(await textOf(page, '[data-deeptail-session="s-running"] .session-title')).toBe('Refactor the loader')
    expect(await page.locator('.session-row').count()).toBe(SESSIONS.length)
    await harness.shoot(page, 'fleet-partial-failure')
    await page.close()
  })

  it('reads an empty roster as loading until it settles', async () => {
    const page = await harness.open({ hosts: HOSTS.slice(0, 1), remote: { 'session/list': { items: [] } } })
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

  it('spawns with a typed preset and reports the ids a host does have', async () => {
    const page = await harness.open(
      oneHost({ remote: { 'session/list': { items: SESSIONS }, 'session/create': { sessionId: 's-new' } } }),
    )
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-action="new-session"]').click()
    // No host publishes a preset listing, so the field is typed and optional.
    await page.locator('[data-deeptail-field="preset"]').fill('ptc')
    await page.locator('[data-deeptail-field="cwd"]').fill('/srv/work')
    await harness.shoot(page, 'new-session')
    await page.locator('[data-deeptail-action="spawn-create"]').click()
    await page.locator('[data-deeptail-dialog]').waitFor({ state: 'detached' })
    await page.close()
  })

  it('names the available presets when the host rejects the one typed', async () => {
    const page = await harness.open(
      oneHost({
        remoteErrors: { 'session/create': 'no such preset' },
        remoteErrorCodes: { 'session/create': 'agent-preset-not-found' },
        remoteErrorDetails: { 'session/create': { available: ['standard', 'ptc'] } },
      }),
    )
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-action="new-session"]').click()
    await page.locator('[data-deeptail-field="preset"]').fill('nope')
    await page.locator('[data-deeptail-action="spawn-create"]').click()
    const strip = await textOf(page, '[data-deeptail-state="spawn-error"]')
    expect(strip).toContain('standard, ptc')
    // The dialog stays open so the operator can correct the id in place.
    expect(await page.locator('[data-deeptail-dialog]').count()).toBe(1)
    expect(await page.locator('[data-deeptail-field="preset"]').inputValue()).toBe('nope')
    await page.close()
  })

  it('moves the roving tab stop across session rows', async () => {
    const page = await harness.open(oneHost())
    await page.waitForSelector('[data-deeptail-shell]')
    // Assert on the name the row actually speaks, not on a private attribute.
    const focusedName = () => page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)
    await page.locator('[data-deeptail-session="s-running"] .session-open').focus()
    expect(await focusedName()).toContain('Refactor the loader')
    await page.keyboard.press('ArrowDown')
    expect(await focusedName()).toContain('Write the release notes')
    await page.keyboard.press('Home')
    expect(await focusedName()).toContain('Refactor the loader')
    await page.close()
  })

  it('reaches a row action with the keyboard alone and opens the sheet with Enter', async () => {
    const page = await harness.open(oneHost())
    await page.waitForSelector('[data-deeptail-shell]')
    // No pointer is used anywhere in this case: focusing the row must be
    // enough to reveal its actions, and Tab must be able to reach them.
    await page.locator('[data-deeptail-session="s-running"] .session-open').focus()
    const send = page.getByRole('button', { name: 'Send' }).first()
    await send.waitFor({ state: 'visible' })
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? null)).toBe('Send')
    await page.keyboard.press('Enter')
    const dialog = page.locator('[data-deeptail-dialog]')
    await dialog.waitFor({ state: 'visible' })
    expect(await dialog.getAttribute('aria-label')).toBe('Refactor the loader')
    await page.close()
  })

  it('gives a row action a real touch target when the pointer is coarse', async () => {
    const page = await harness.open(oneHost(), { mobile: true })
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-action="drawer"]').click()
    const box = await page.locator('[data-deeptail-action="row-message"]').first().boundingBox()
    expect(box === null ? 0 : Math.round(box.height)).toBeGreaterThanOrEqual(44)
    await page.close()
  })

  it('keeps the closed drawer out of the tab order', async () => {
    const page = await harness.open(oneHost(), { mobile: true })
    await page.waitForSelector('[data-deeptail-shell]')
    // A translated drawer still holds its controls unless it is made inert.
    expect(
      await page.evaluate(() => {
        const sidebar = document.getElementById('deeptail-sidebar')
        const first = sidebar?.querySelector('button')
        first?.focus()
        return document.activeElement === first
      }),
    ).toBe(false)
    await page.close()
  })

  it('reports a revoked token as needing re-pairing and offers the way out', async () => {
    const page = await harness.open(oneHost({ remoteStatuses: { 'session/list': 401 } }))
    await page.waitForSelector('[data-deeptail-shell]')
    // The state is spoken, not merely coloured, so the dot is never the only cue.
    expect(await textOf(page, '.connection-trigger')).toContain('Needs re-pairing')
    await page.locator('[data-deeptail-connection="trigger"]').click()
    expect(await textOf(page, '[data-deeptail-action="repair"]')).toBe('Re-pair this host')
    await harness.shoot(page, 'connection-unauthorized')
    await page.close()
  })

  it('adds a row from a forwarded roster event without re-reading the list', async () => {
    const page = await harness.open(
      oneHost({
        muxHosts: ['dev-1'],
        muxEvents: [
          {
            event: 'api-session/added',
            args: [
              {
                sessionId: 's-live',
                updatedAt: Date.now(),
                running: false,
                blank: false,
                projections: { values: { title: 'Arrived over the stream' } },
              },
            ],
          },
        ],
      }),
    )
    await page.waitForSelector('[data-deeptail-shell]')
    // The row can only come from the mux: session/list never returned it.
    expect(await textOf(page, '[data-deeptail-session="s-live"] .session-title')).toBe('Arrived over the stream')
    await page.close()
  })

  it('removes a row when the host forwards a removal', async () => {
    const page = await harness.open(
      oneHost({
        muxHosts: ['dev-1'],
        muxEvents: [{ event: 'api-session/removed', args: ['s-idle'] }],
      }),
    )
    await page.waitForSelector('[data-deeptail-shell]')
    await page.locator('[data-deeptail-session="s-idle"]').waitFor({ state: 'detached' })
    expect(await page.locator('[data-deeptail-session="s-running"]').count()).toBe(1)
    await page.close()
  })

  it('reports a host online once its stream is ready, and unreachable when it drops', async () => {
    const ready = await harness.open(oneHost({ muxHosts: ['dev-1'] }))
    await ready.waitForSelector('[data-deeptail-shell]')
    expect(await textOf(ready, '.connection-trigger')).toContain('Online')
    await ready.close()

    const dropped = await harness.open(oneHost({ muxHosts: ['dev-1'], muxClose: ['dev-1'] }))
    await dropped.waitForSelector('[data-deeptail-shell]')
    expect(await textOf(dropped, '.connection-trigger')).toContain('Unreachable')
    await dropped.close()
  })

  it('turns a running row idle when the host forwards its status', async () => {
    const page = await harness.open(
      oneHost({
        muxHosts: ['dev-1'],
        muxEvents: [{ event: 'api-session/status', args: ['s-running', false] }],
      }),
    )
    await page.waitForSelector('[data-deeptail-shell]')
    // Stop is offered only while a session runs, so its absence is the proof.
    await page.locator('[data-deeptail-session="s-running"] [data-deeptail-action="row-stop"]').waitFor({
      state: 'detached',
    })
    expect(await textOf(page, '[data-deeptail-session="s-running"] .visually-hidden')).toBe('Idle')
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
