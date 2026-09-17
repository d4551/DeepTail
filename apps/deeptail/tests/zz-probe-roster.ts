import { afterAll, beforeAll, expect, it } from 'bun:test'
import { oneHost } from './fixtures.ts'
import { type Harness, startHarness } from './harness.ts'

let harness: Harness

beforeAll(async () => {
  harness = await startHarness()
})

afterAll(async () => {
  await harness?.stop()
})

it('zzprobe names what the page failed with', async () => {
  const page = await harness.open(oneHost())
  const faults: string[] = []
  page.on('pageerror', (fault) => {
    faults.push(String(fault))
  })
  page.on('console', (message) => {
    if (message.type() === 'error') faults.push(`console: ${message.text()}`)
  })
  await page.waitForSelector('[data-deeptail-shell]')
  await new Promise((done) => {
    setTimeout(done, 1500)
  })
  const rows = await page.locator('[data-deeptail-session]').count()
  const commands = await harness.commands(page)
  const state = await page.evaluate(() => ({
    recorded: (window.deeptailRecordedCalls ?? []).length,
    members: window.deeptailRuntimeMembers?.() ?? [],
  }))
  await page.close()
  process.stdout.write(`${JSON.stringify({ faults: faults.slice(0, 6), rows, commands, state }, null, 2)}\n`)
  expect(rows).toBeGreaterThan(-1)
}, 60_000)
