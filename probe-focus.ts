/**
 * A live probe of the focus-obscured finding: what the page's own hit test
 * answers at the points a focused control paints, and what the control's box
 * is. Run directly; the answer is the process exit message.
 *
 * @module
 */

import { oneHost } from './apps/deeptail/tests/fixtures.ts'
import { startHarness } from './apps/deeptail/tests/harness.ts'

const harness = await startHarness()
const page = await harness.open(oneHost({ muxHosts: ['dev-1'] }))
await page.waitForSelector('[data-deeptail-shell]')
const probe = await page.evaluate(() => {
  const out: string[] = []
  const button = document.querySelector('button.session-open')
  if (!(button instanceof HTMLElement)) return ['no button']
  button.focus({ preventScroll: true })
  const box = button.getBoundingClientRect()
  const points: [number, number][] = [
    [box.left + box.width / 2, box.top + box.height / 2],
    [box.left + 1, box.top + 1],
    [box.right - 1, box.top + 1],
    [box.left + 1, box.bottom - 1],
    [box.right - 1, box.bottom - 1],
  ]
  for (const [x, y] of points) {
    const hit = document.elementFromPoint(x, y)
    const name = hit === null ? 'null' : `${hit.tagName}.${String(hit.className)}`
    out.push(`point ${x.toFixed(1)},${y.toFixed(1)} -> ${name} (contains=${hit !== null && button.contains(hit)})`)
  }
  const style = getComputedStyle(button)
  out.push(
    `button box ${box.left.toFixed(1)},${box.top.toFixed(1)} ${box.width.toFixed(1)}x${box.height.toFixed(1)} pointerEvents=${style.pointerEvents} visibility=${style.visibility} display=${style.display}`,
  )
  const row = button.closest('.session-row')
  if (row !== null) {
    const rb = row.getBoundingClientRect()
    out.push(`row box ${rb.left.toFixed(1)},${rb.top.toFixed(1)} ${rb.width.toFixed(1)}x${rb.height.toFixed(1)}`)
  }
  return out
})
await harness.stop()
throw new Error(`deeptail probe:\n${probe.join('\n')}`)
