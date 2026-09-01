/**
 * Reject inline styles in the application source.
 *
 * Every visual belongs to a stylesheet, so the two products stay one design
 * system and a token change reaches everything. Neither oxlint nor Biome has a
 * rule for `element.style.x = …` in plain DOM, so the ban is an executed gate
 * rather than a convention.
 *
 * The ban is absolute. There is no allowance. Every module in the repository is
 * scanned alongside the shell document, and the patterns cover every route to an
 * element's style: the dotted property, an indexed write, a bulk assign onto
 * `.style`, destructuring it out, the CSS Typed OM, a `style` attribute in
 * markup, and
 * `setAttribute('style', …)` however it is spelt — spread over several lines,
 * or with the attribute name assembled from parts. A local binding that merely
 * happens to be named `style` is not a write, so the attribute form requires the
 * quote or brace that markup always carries.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const TREES = ['apps/deeptail', 'packages/host-fleet', 'scripts', 'tests'].map(
  (tree) => new URL(`../${tree}/`, import.meta.url).pathname,
)
const SHELL = new URL('../apps/deeptail/index.html', import.meta.url).pathname
/** Routes to an element's style that appear on one line. */
const PATTERN =
  /(?<!\.)\.style\b|\[\s*['"`]style['"`]\s*\]|\bstyle\s*=\s*["'`{]|cssText|attributeStyleMap|setNamedItem\s*\(|\{\s*style\s*[},:]/u

/** Routes that a call or a destructuring may spread across several lines. */
const SPANNING = /setAttribute(?:NS)?\([^)]*['"`]style['"`]|setAttribute(?:NS)?\([^)]*\+|\{[^}]*\bstyle\b[^}]*\}\s*=/gu

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
  // A call split across lines is invisible to a line-by-line read, so the whole
  // file is searched for the forms that can span one.
  const code = text
    .split('\n')
    .filter((line) => {
      const start = line.trimStart()
      return !(start.startsWith('*') || start.startsWith('//') || start.startsWith('/'))
    })
    .join('\n')
  for (const spanning of code.matchAll(SPANNING)) {
    offences.push(`${label}: ${spanning[0].split('\n')[0]?.trim() ?? ''}`)
  }
  for (const [index, line] of text.split('\n').entries()) {
    // Prose describing the ban, and the lines declaring it, are data rather
    // than uses; everything else is an offence.
    const start = line.trimStart()
    if (start.startsWith('*') || start.startsWith('//') || start.startsWith('/')) continue
    if (start.startsWith('const PATTERN') || start.startsWith('const SPANNING')) continue
    if (!PATTERN.test(line)) continue
    offences.push(`${label}:${String(index + 1)}: ${line.trim()}`)
  }
}

if (offences.length > 0) {
  process.stderr.write(`inline styles are not allowed; use a class:\n${offences.map((o) => `  ${o}`).join('\n')}\n`)
  process.exit(1)
}
process.stdout.write(`no inline styles (${String(files.length)} files)\n`)
