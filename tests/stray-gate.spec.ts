/**
 * The gate that refuses a file no other gate reads, driven both ways.
 *
 * Every other gate narrows the listing to the extensions it understands, which
 * is what let a probe file of an unknown kind sit in the tree while the
 * instrumentation gate printed a clean line over it. The rule is a property of
 * the listing rather than of any file's contents, so it is driven here against
 * lists rather than against a written tree.
 */

import { describe, expect, it } from 'bun:test'
import { SHIPPED_KINDS, strayFiles } from '../scripts/check-strays.ts'
import { repositoryFiles } from '../scripts/source-tree.ts'

describe('the stray reader', () => {
  it('names a file whose kind is not on the list, and says what to do', () => {
    expect(strayFiles(['scripts/source-tree.tszz-probe.probe-ext'], ['.ts'])).toEqual([
      {
        label: 'scripts/source-tree.tszz-probe.probe-ext',
        line: 1,
        why: 'this repository declares no such kind; remove the file, or declare its kind in SHIPPED_KINDS',
      },
    ])
  })

  it('reports nothing when every kind is on the list', () => {
    expect(strayFiles(['a.ts', 'b/c.css', 'LICENSE'], ['.ts', '.css', 'LICENSE'])).toEqual([])
  })

  it('reports nothing over an empty listing, rather than reading that as a refusal', () => {
    expect(strayFiles([], SHIPPED_KINDS)).toEqual([])
  })

  it('refuses every file when the list of kinds is empty', () => {
    // A gate handed no kinds must refuse, not pass: an empty allowance that
    // read as "everything is fine" would be the silence this gate exists for.
    expect(strayFiles(['a.ts', 'b.css'], []).map((stray) => stray.label)).toEqual(['a.ts', 'b.css'])
  })

  it('matches on the end of the name, so a kind inside a path is not a match', () => {
    expect(strayFiles(['.ts/held.probe-ext'], ['.ts']).map((stray) => stray.label)).toEqual(['.ts/held.probe-ext'])
  })
})

describe('the repository under the stray reader', () => {
  it('ships no file of a kind no gate reads', () => {
    const labels = repositoryFiles(['']).map((file) => file.label)
    expect(labels.length).toBeGreaterThan(0)
    expect(strayFiles(labels, SHIPPED_KINDS).map((stray) => stray.label)).toEqual([])
  })

  it('states no kind it does not ship, so the list cannot rot into a blanket', () => {
    // A kind left on the list after the last file of that kind is gone is an
    // allowance nothing needs, and the next stray of that kind passes on it.
    const labels = repositoryFiles(['']).map((file) => file.label)
    const unused = SHIPPED_KINDS.filter((kind) => !labels.some((label) => label.endsWith(kind)))
    expect(unused).toEqual([])
  })
})
