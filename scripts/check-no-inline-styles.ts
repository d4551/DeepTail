/**
 * Reject inline styles in the application source.
 *
 * Every visual belongs to a stylesheet, so the two products stay one design
 * system and a token change reaches everything. Neither oxlint nor Biome has a
 * rule for `element.style.x = …` in plain DOM, so the ban is an executed gate
 * rather than a convention.
 *
 * The ban is absolute. There is no allowance, and the shell document is scanned
 * alongside the modules so a `style=` attribute cannot enter through the HTML.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const SRC = new URL('../apps/deeptail/src/', import.meta.url).pathname
const SHELL = new URL('../apps/deeptail/index.html', import.meta.url).pathname
const PATTERN = /\.style\.|style=|cssText/u

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
async function modules(dir: string, prefix = ''): Promise<Source[]> {
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

const files: Source[] = [...(await modules(SRC)), { label: 'index.html', path: SHELL }]
const scanned = await Promise.all(
  files.map(async (source) => ({ label: source.label, text: await readFile(source.path, 'utf8') })),
)

const offences: string[] = []
for (const { label, text } of scanned) {
  for (const [index, line] of text.split('\n').entries()) {
    if (!PATTERN.test(line)) continue
    offences.push(`${label}:${String(index + 1)}: ${line.trim()}`)
  }
}

if (offences.length > 0) {
  process.stderr.write(`inline styles are not allowed; use a class:\n${offences.map((o) => `  ${o}`).join('\n')}\n`)
  process.exit(1)
}
process.stdout.write(`no inline styles (${String(files.length)} files)\n`)
