/**
 * What a stylesheet may import, and how the gate reads an `@import` at all.
 *
 * An import sits at the top of a sheet, outside every rule, so a reader that
 * walks rule bodies never sees one — which is how a sheet could pull in a
 * retired framework's whole pipeline with every other check green. Each way an
 * import can be written is a separate way past the reader, so each is a case.
 */

import { describe, expect, it } from 'bun:test'
import { importsOf } from '../scripts/sheet-imports.ts'
import { joined, remoteHost, sheetOffences } from './fixtures.ts'

/** The reason a remote import is refused. */
const REMOTE = 'a remote import loads a sheet no local install ships; ship the sheet in the bundle'

/**
 * The reason a retired pipeline is refused.
 * @param target - the import target, as the sheet wrote it.
 * @returns the message.
 */
const retired = (target: string): string =>
  `${target} is a retired framework's pipeline; state the declarations directly`

describe('the import reader', () => {
  it('reads a target however the import is written', () => {
    // Four spellings CSS accepts, and the gate has to see the target in each.
    expect(sheetOffences(`@import "${remoteHost('https:')}/x.css";`)).toEqual([REMOTE])
    expect(sheetOffences(`@import url("${remoteHost('https:')}/x.css");`)).toEqual([REMOTE])
    expect(sheetOffences(`@import url(${remoteHost('https:')}/x.css);`)).toEqual([REMOTE])
    expect(sheetOffences(`@import url(  "${remoteHost('https:')}/x.css"  );`)).toEqual([REMOTE])
    expect(sheetOffences(`@import\n  "${remoteHost('https:')}/x.css";`)).toEqual([REMOTE])
  })

  it('reads every import a sheet makes, not only the first', () => {
    expect(sheetOffences(`@import "${remoteHost('https:')}/a.css";\n@import "${remoteHost('https:')}/b.css";`)).toEqual(
      [REMOTE, REMOTE],
    )
  })

  it('reads no import out of a comment, which imports nothing', () => {
    expect(sheetOffences(`/* @import "${remoteHost('https:')}/x.css"; */\n.a { color: currentcolor }`)).toEqual([])
  })
})

describe('the remote-import rule', () => {
  it('refuses every scheme a sheet can reach the network with', () => {
    expect(sheetOffences(`@import "${remoteHost('https:')}/x.css";`)).toEqual([REMOTE])
    expect(sheetOffences(`@import "${remoteHost('http:')}/x.css";`)).toEqual([REMOTE])
    expect(sheetOffences(`@import "${remoteHost('')}/x.css";`)).toEqual([REMOTE])
    expect(sheetOffences(`@import "${joined('HT', 'TPS://cdn.example.com')}/x.css";`)).toEqual([REMOTE])
  })

  it('allows a sheet the bundle ships, including one whose name merely contains a scheme', () => {
    expect(sheetOffences('@import "./tokens.css";')).toEqual([])
    expect(sheetOffences('@import "../styles/shell.css";')).toEqual([])
    // Anchored: the reach has to open the target, not appear somewhere in it.
    expect(sheetOffences(`@import "./vendor/${remoteHost('https:')}.css";`)).toEqual([])
  })
})

describe('the retired-pipeline rule', () => {
  it('refuses each pipeline by name, however the package is reached', () => {
    const packages = [
      'tailwindcss',
      'daisyui',
      'bootstrap',
      'bulma',
      'foundation-sites',
      'htmx.org',
      'htmx',
      'alpinejs',
      'materialize-css',
      'semantic-ui',
      'uikit',
      'animate.css',
      'normalize.css',
    ]
    expect(packages.map((name) => sheetOffences(`@import "${name}";`))).toEqual(packages.map((name) => [retired(name)]))
  })

  it('refuses a package reached by a path inside it, and one written as a bare name', () => {
    expect(sheetOffences('@import "tailwindcss/preflight.css";')).toEqual([retired('tailwindcss/preflight.css')])
    expect(sheetOffences(joined('@imp', 'ort "@daisyui/themes";'))).toEqual([retired('@daisyui/themes')])
  })

  it('refuses it however it is cased', () => {
    expect(sheetOffences('@import "TailwindCSS";')).toEqual([retired('TailwindCSS')])
  })

  it('allows a local sheet whose name merely begins the same way', () => {
    // Anchored and terminated: the name has to be the package, not a prefix of
    // a longer word, and it has to open the target.
    expect(sheetOffences('@import "./tailwindcss-notes.css";')).toEqual([])
    expect(sheetOffences('@import "bulmaesque.css";')).toEqual([])
    expect(sheetOffences('@import "./vendor/bootstrap.css";')).toEqual([])
  })
})

describe('the import reader reads a target and its line', () => {
  it('names each target, with its quotes and its url() syntax removed', () => {
    expect(importsOf('@import "./a.css";').map((one) => one.target)).toEqual(['./a.css'])
    expect(importsOf("@import './a.css';").map((one) => one.target)).toEqual(['./a.css'])
    expect(importsOf('@import url("./a.css");').map((one) => one.target)).toEqual(['./a.css'])
    expect(importsOf('@import url(./a.css);').map((one) => one.target)).toEqual(['./a.css'])
  })

  it('names the line each import is written on', () => {
    // An offence points a reader at the import; a line off by one points at
    // whatever happens to sit beside it.
    expect(importsOf('.a { color: red }\n\n@import "./a.css";\n@import "./b.css";')).toEqual([
      { target: './a.css', line: 3 },
      { target: './b.css', line: 4 },
    ])
  })

  it('names nothing where a sheet imports nothing', () => {
    expect(importsOf('.a { color: red }')).toEqual([])
    expect(importsOf('')).toEqual([])
  })

  it('needs whitespace after the keyword, so a longer word is not an import', () => {
    expect(importsOf('@importantly "./a.css";')).toEqual([])
  })
})
