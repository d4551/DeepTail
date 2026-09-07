/**
 * Which files the gates read, as git itself defines it.
 *
 * Every gate in the chain reads this list. A list that misses a file is a gate
 * that silently stops checking it — a gate that reads nothing reports nothing —
 * and a list that carries a path with no bytes is a gate that fails on a
 * deletion nobody has recorded yet.
 */

import { describe, expect, it } from 'bun:test'
import { onlyPresent, ROOT, repositoryFiles } from '../scripts/source-tree.ts'

describe('the file list', () => {
  it('reports each file by a repository-relative label and a path that opens it', async () => {
    const file = repositoryFiles(['/package.json']).find((one) => one.label === 'apps/deeptail/package.json')
    expect(file?.label).toBe('apps/deeptail/package.json')
    expect(file?.path).toBe(`${ROOT}apps/deeptail/package.json`)
    expect(await Bun.file(file?.path ?? '').exists()).toBe(true)
  })

  it('keeps only the extensions it was asked for, and every one of them', () => {
    const labels = repositoryFiles(['.css']).map((file) => file.label)
    expect(labels.length).toBeGreaterThan(0)
    expect(labels.filter((label) => !label.endsWith('.css'))).toEqual([])
    const both = repositoryFiles(['.css', '.rs']).map((file) => file.label)
    expect(both.length).toBeGreaterThan(labels.length)
    expect(both.filter((label) => !label.endsWith('.css') && !label.endsWith('.rs'))).toEqual([])
  })

  it('reports nothing where no extension matches, and nothing where none is asked for', () => {
    expect(repositoryFiles(['.no-such-extension'])).toEqual([])
    expect(repositoryFiles([])).toEqual([])
  })

  it('reports the files in path order, so an offence list reads the same twice', () => {
    const labels = repositoryFiles(['.ts']).map((file) => file.label)
    expect(labels).toEqual(labels.toSorted())
  })

  it('reads the ignore rules, so nothing a build wrote is in the list', () => {
    const labels = repositoryFiles(['.ts', '.js', '.json']).map((file) => file.label)
    expect(labels.filter((label) => label.startsWith('node_modules/'))).toEqual([])
    expect(labels.filter((label) => label.includes('/dist/'))).toEqual([])
  })
})

describe('the file list against the index', () => {
  it('reads a file git has never seen, so nothing can hide behind the index', () => {
    // `--others --exclude-standard`: a source file added but not yet staged is
    // a file that ships, and a gate that read only the index would not see it.
    // The probe is read, then removed, and only then is the expectation held:
    // the removal runs before anything that could fail on it, so a red case
    // leaves no probe file behind in the tree it just measured.
    const scratch = `${ROOT}zz-source-tree-probe.probe-ext`
    Bun.write(scratch, 'probe\n')
    const listed = repositoryFiles(['.probe-ext']).map((file) => file.label)
    Bun.spawnSync(['rm', '-f', scratch])
    expect(listed).toEqual(['zz-source-tree-probe.probe-ext'])
  })

  it('leaves out a path whose bytes are gone', () => {
    // A path git still carries whose file has been deleted is a deletion
    // waiting to be recorded, and there is nothing in it for a gate to read.
    const present = { label: 'package.json', path: `${ROOT}package.json` }
    const deleted = { label: 'never-shipped.ts', path: `${ROOT}never-shipped.ts` }
    expect(onlyPresent([present, deleted])).toEqual([present])
    expect(onlyPresent([deleted, present]).map((file) => file.label)).toEqual(['package.json'])
    expect(onlyPresent([])).toEqual([])
  })
})
