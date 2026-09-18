/**
 * Every program these suites drive, by absolute path, stated once.
 *
 * A suite that spells out `new URL('../scripts/x.ts', import.meta.url).pathname`
 * states a fact about this repository that four other suites state too, and a
 * path corrected in one of them is a gate the others stop driving. Each program
 * is named here once, and each suite reads the name of the program it is about.
 *
 * @module
 */

/** The programs the gate and program suites drive, by absolute path. */
export const PROGRAMS = {
  /** The merge gate's own reader of the workflow definitions. */
  pipelineGuard: new URL('../scripts/pipeline-guard.ts', import.meta.url).pathname,
  /** The reader that turns a mutation report into the work it names. */
  mutationSurvivors: new URL('../scripts/mutation-survivors.ts', import.meta.url).pathname,
  /** The gate that holds the unit chain to its pinned floors. */
  coverageGate: new URL('../scripts/check-coverage.ts', import.meta.url).pathname,
  /** The generator that writes the action registry's faces. */
  actionRegistry: new URL('../scripts/gen-action-registry.ts', import.meta.url).pathname,
  /** The gate that holds the lockfile to the ranges its manifests declare. */
  cargoFreshness: new URL('../scripts/cargo-freshness.ts', import.meta.url).pathname,
  /** The gate that holds every declared pin to the newest installable version. */
  outdatedGate: new URL('../scripts/check-outdated.ts', import.meta.url).pathname,
  /** The guard that puts the tree back after a mutation run. */
  mutateRestore: new URL('../scripts/mutate-restore.ts', import.meta.url).pathname,
} as const
