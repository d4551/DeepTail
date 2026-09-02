/**
 * Polling waits for browser tests: a condition settles frames after the paint
 * that first shows it, and Playwright can only wait on the page's own DOM.
 *
 * @module
 */

/**
 * Wait until an asynchronous condition holds, polling at a fixed cadence.
 *
 * Recursive rather than a loop, so no caller needs an `await` inside one, and
 * asleep through the runtime's own sleep, so no promise executor is written.
 * @param check - the condition; resolved fresh on every attempt.
 * @param attempts - remaining tries before the wait is reported as failed.
 * @param everyMs - cadence between attempts.
 * @returns when the condition holds.
 */
export async function until(check: () => Promise<boolean>, attempts = 50, everyMs = 100): Promise<void> {
  if (await check()) return
  if (attempts <= 0) throw new Error('deeptail: condition never settled')
  await Bun.sleep(everyMs)
  await until(check, attempts - 1, everyMs)
}
