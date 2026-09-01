/**
 * Reject inline styles in the application source.
 *
 * Every visual belongs to a stylesheet, so the two products stay one design
 * system and a token change reaches everything. Neither oxlint nor Biome has a
 * rule for `element.style.x = …` in plain DOM, so the ban is an executed gate
 * rather than a convention.
 *
 * The one permitted line switches the document's native UA chrome, which is
 * what the harness's own `ui-theme/src/boot-theme.ts` does; it is not element
 * styling and has no class equivalent.
 */

import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const ROOT = new URL('../apps/deeptail/src/', import.meta.url).pathname
const PATTERN = /\.style\.|style=|cssText/u
const ALLOWED = new Map<string, string>([
  ['theme.ts', "document.documentElement.style.colorScheme = dark ? 'dark' : 'light'"],
])

/** Every `.ts` file under a directory, recursively. */
async function sources(dir: string, prefix = ''): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`
      if (entry.isDirectory()) return sources(join(dir, entry.name), rel)
      return entry.name.endsWith('.ts') ? [rel] : []
    }),
  )
  return nested.flat()
}

const files = await sources(ROOT)
const scanned = await Promise.all(files.map(async (file) => ({ file, text: await readFile(join(ROOT, file), 'utf8') })))

const offences: string[] = []
for (const { file, text } of scanned) {
  for (const [index, line] of text.split('\n').entries()) {
    if (!PATTERN.test(line)) continue
    if (ALLOWED.get(file) === line.trim()) continue
    offences.push(`${file}:${String(index + 1)}: ${line.trim()}`)
  }
}

if (offences.length > 0) {
  process.stderr.write(`inline styles are not allowed; use a class:\n${offences.map((o) => `  ${o}`).join('\n')}\n`)
  process.exit(1)
}
process.stdout.write('no inline styles\n')
