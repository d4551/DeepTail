/**
 * Every file the repository ships, as git itself defines it.
 *
 * A gate that walks a hand-written list of directories is only as complete as
 * that list, and a gate that walks the working tree also reads build output,
 * so its file count moves with whether someone has run a build. Git already
 * answers the question exactly once, in `.gitignore`: tracked files plus files
 * that are not ignored. That answer is the one the checkers, the packager and
 * CI all use, so the gates use it too and cannot drift from it.
 *
 * @module
 */

/** The repository root, resolved from this module's own location. */
export const ROOT = new URL('../', import.meta.url).pathname

/** One file to scan, and the path it is reported under. */
export interface SourceFile {
  /** Repository-relative path, used both to read the file and to report it. */
  readonly label: string
  /** Absolute path on disk. */
  readonly path: string
}

/**
 * Every file in the repository whose name ends in one of the given extensions.
 * @param extensions - the suffixes to keep, each including its dot.
 * @returns the matching files, in path order.
 */
export function repositoryFiles(extensions: readonly string[]): SourceFile[] {
  const listed = Bun.spawnSync(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: ROOT,
    stderr: 'pipe',
  })
  if (listed.exitCode !== 0) {
    throw new Error(`source-tree: git ls-files exited ${String(listed.exitCode)}: ${listed.stderr?.toString() ?? ''}`)
  }
  // `ROOT` ends with its separator, and `ls-files -z` reports paths relative
  // to it, so the join is concatenation.
  return (listed.stdout?.toString() ?? '')
    .split('\0')
    .filter((label) => label !== '' && extensions.some((extension) => label.endsWith(extension)))
    .toSorted()
    .map((label) => ({ label, path: `${ROOT}${label}` }))
}
