import { appendFileSync } from 'node:fs'
import { parseSync } from 'oxc-parser'

const p = parseSync('f.tsx', 'const x = "a"\nimport y from "b"')
appendFileSync('/tmp/oxc-probe.out', `${p.program.body[0].declarations[0].init.type}\n`)
appendFileSync('/tmp/oxc-probe.out', `${p.program.body[1].source.type}\n`)
