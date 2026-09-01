/**
 * Reject inline styles in the application source.
 *
 * Every visual belongs to a stylesheet, so the two products stay one design
 * system and a token change reaches everything. Neither oxlint nor Biome has a
 * rule for `element.style.x = …` in plain DOM, so the ban is an executed gate
 * rather than a convention.
 *
 * The ban is absolute. There is no allowance. Every module in the repository is
 * scanned alongside the shell document, and the pattern covers every route to an
 * element's style: the dotted property, an indexed write, a bulk assign onto
 * `.style`, a `style` attribute in markup, and `setAttribute('style', …)`. A
 * local binding that merely happens to be named `style` is not a write, so the
 * attribute form requires the quote or brace that markup always carries.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const TREES = ['apps/deeptail/src', 'apps/deeptail/tests', 'packages/host-fleet/src', 'scripts', 'tests'].map(
  (tree) => new URL(`../${tree}/`, import.meta.url).pathname,
)
const SHELL = new URL('../apps/deeptail/index.html', import.meta.url).pathname
const PATTERN = /\.style\b|\bstyle\s*=\s*["'`{]|cssText|setAttribute\(\s*['"`]style['"`]/u

/** One file to scan, and the label an offence is reported under. */
interface Source {
  readonly label: string
  readonly path: string
}

/**
 * Every module under a directory, recursively.
 * @param dir - the directory to walk.
 * @param prefix - the label prefix for nested entries.
 * @returns every `.ts` file below it.
 */
async function modules(dir: string, prefix = dir.split('/').filter(Boolean).slice(-2).join('/')): Promise<Source[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) => {
      const label = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) return modules(join(dir, entry.name), label)
      return entry.name.endsWith('.ts') ? [{ label, path: join(dir, entry.name) }] : []
    }),
  )
  return nested.flat()
}

const trees = await Promise.all(TREES.map((tree) => modules(tree)))
const files: Source[] = [...trees.flat(), { label: 'index.html', path: SHELL }]
const scanned = await Promise.all(
  files.map(async (source) => ({ label: source.label, text: await readFile(source.path, 'utf8') })),
)

const offences: string[] = []
for (const { label, text } of scanned) {
  for (const [index, line] of text.split('\n').entries()) {
    // Prose describing the ban, and the line declaring it, are data rather
    // than uses; everything else is an offence.
    const start = line.trimStart()
    if (start.startsWith('*') || start.startsWith('//') || start.startsWith('const PATTERN')) continue
    if (!PATTERN.test(line)) continue
    offences.push(`${label}:${String(index + 1)}: ${line.trim()}`)
  }
}

if (offences.length > 0) {
  process.stderr.write(`inline styles are not allowed; use a class:\n${offences.map((o) => `  ${o}`).join('\n')}\n`)
  process.exit(1)
}
process.stdout.write(`no inline styles (${String(files.length)} files)\n`)
