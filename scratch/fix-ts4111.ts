/**
 * One-off migration aid: rewrite the dot property accesses the compiler names
 * with TS4111 into the bracket spelling its own face requires. Positions come
 * from `tsc` itself, so nothing is guessed; the diff is reviewed per file.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

// The build fails while the violations stand, so the diagnostics arrive as the
// failure's stdout rather than as a return value. Every project the gate
// checks is run, in the gate's own order.
const out = ['tsconfig.tools.json', 'packages/host-fleet/tsconfig.tests.json', 'apps/deeptail/tsconfig.tests.json']
  .map((project) =>
    Bun.spawnSync(['tsc', '-p', project, '--pretty', 'false'], {
      cwd: '/Users/brandon/Downloads/DeepTail',
      stdout: 'pipe',
      stderr: 'ignore',
    }).stdout.toString(),
  )
  .join('')

const pattern = /(.+?)\((\d+),(\d+)\): error TS4111: Property '(.+?)' comes from an index signature/g
const fixes = new Map<string, { line: number; col: number; name: string }[]>()
for (const match of out.matchAll(pattern)) {
  const [, file, line, col, name] = match
  const list = fixes.get(file) ?? []
  list.push({ line: Number(line), col: Number(col), name })
  fixes.set(file, list)
}

let total = 0
const said: string[] = []
for (const [file, sites] of fixes) {
  const lines = readFileSync(file, 'utf8').split('\n')
  // Apply per line, right to left, so earlier columns stay valid.
  const byLine = new Map<number, { col: number; name: string }[]>()
  for (const site of sites) {
    const list = byLine.get(site.line) ?? []
    list.push(site)
    byLine.set(site.line, list)
  }
  for (const [lineNo, list] of byLine) {
    const text = lines[lineNo - 1]
    for (const site of list.sort((a, b) => b.col - a.col)) {
      // The column names the property itself; the dot sits one left of it.
      const at = site.col - 1
      if (text[at - 1] !== '.') throw new Error(`${file}:${lineNo}:${site.col}: expected '.' before '${site.name}', found '${text.slice(at - 3, at + 20)}'`)
      if (!text.startsWith(site.name, at)) {
        throw new Error(`${file}:${lineNo}:${site.col}: expected '${site.name}' at the column`)
      }
      const after = at + site.name.length
      const next = text[after]
      if (next !== undefined && /[A-Za-z0-9_$]/.test(next)) {
        throw new Error(`${file}:${lineNo}:${site.col}: '${site.name}' is a prefix of a longer name`)
      }
      lines[lineNo - 1] = `${text.slice(0, at - 1)}['${site.name}']${text.slice(after)}`
    }
  }
  writeFileSync(file, lines.join('\n'))
  total += sites.length
  said.push(`${file}: ${sites.length} site(s)`)
}
said.push(`total: ${total}`)
await Bun.write('scratch/fix-ts4111-report.txt', said.join('\n'))
