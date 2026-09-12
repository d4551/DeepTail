/**
 * The per-test budget the whole-tree suites run under.
 *
 * A suite that reads the whole repository spawns `git ls-files` and reads
 * every file's bytes; on a loaded machine one scan can outgrow Bun's default
 * five-second test budget while still doing exactly what it is told. The
 * budget is stated once here and passed per test, so a slow scan fails on
 * what it found, never on the clock.
 *
 * The value is a measurement, not a guess: a single spawned listing has been
 * observed at half a minute on a loaded machine, and one test can spawn the
 * listing several times — so the budget holds four such spawns and the reads
 * that follow them.
 *
 * Milliseconds a whole-tree scan may run before the runner calls it hung.
 */
export const TREE_SCAN_BUDGET_MS = 120_000
