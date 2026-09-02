/**
 * Reject a suite that rewrote its own screenshots.
 *
 * The browser suite writes these as it runs, so a shot taken of something that
 * moves — an animation mid-frame — is different every time. That makes the file
 * change when nothing changed: every run dirties the working tree, every diff
 * carries noise, and a screenshot that is meant to show a regression cannot,
 * because it never holds still. Run after the browser suite, this says so.
 */

import { execFileSync } from 'node:child_process'
import { ROOT } from './source-tree.ts'

const changed = execFileSync('git', ['status', '--porcelain', '--', 'apps/deeptail/tests/screenshots'], {
  cwd: ROOT,
  encoding: 'utf8',
})
  .split('\n')
  .filter((line) => line !== '')

if (changed.length > 0) {
  process.stderr.write(
    `the suite rewrote its own screenshots; commit them if the surface changed, or stop the shot moving:\n${changed
      .map((line) => `  ${line.trim()}`)
      .join('\n')}\n`,
  )
  process.exit(1)
}
process.stdout.write('screenshots unchanged by the run\n')
