/**
 * The readers the job-graph rule is built out of.
 *
 * The rule itself is driven in `pipeline-guard.spec.ts` against definitions
 * carrying the cheat. What it reads them with — where the `jobs:` block starts
 * and stops, which lines are job ids, and the three shapes YAML writes a
 * dependency list in — was reached only through the rule, in two shapes, and
 * the module scored 65.19.
 *
 * A workflow says the same thing several ways. Every one of them is a shape a
 * reader can be written not to know, and a reader that does not know one walks
 * past a job nothing waits on.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { jobIds, jobsSection, neededJobs } from '../scripts/pipeline-guard-jobs.ts'

/** A definition shaped the way one really is: triggers first, jobs after. */
const DEFINITION = [
  'name: gate',
  '',
  'on:',
  '  push:',
  '    branches: [main]',
  '  pull_request:',
  '  workflow_call:',
  '',
  'permissions:',
  '  contents: read',
  '',
  'jobs:',
  '  static:',
  '    runs-on: ubuntu-latest',
  '  gate:',
  '    needs: [static]',
  '    runs-on: ubuntu-latest',
].join('\n')

describe('where the jobs block starts and stops', () => {
  it('starts after the jobs key and not before it', () => {
    // `on:` writes its triggers at the indent a job id is written at. A reader
    // that started at the top of the file counts `push` and `workflow_call` as
    // jobs, and then every one of them is a job nothing waits on.
    expect(jobsSection(DEFINITION)).toEqual([
      '  static:',
      '    runs-on: ubuntu-latest',
      '  gate:',
      '    needs: [static]',
      '    runs-on: ubuntu-latest',
    ])
  })

  it('stops at the next key in the first column', () => {
    const after = `${DEFINITION}\n\nconcurrency:\n  group: gate\n`
    expect(jobsSection(after).some((line) => line.includes('group'))).toBe(false)
  })

  it('runs to the end when nothing follows it', () => {
    expect(jobsSection('jobs:\n  only:\n    runs-on: ubuntu-latest').at(-1)).toBe('    runs-on: ubuntu-latest')
  })

  it('reads nothing out of a definition that declares no jobs at all', () => {
    expect(jobsSection('name: nothing\non:\n  push:\n')).toEqual([])
    // The key has to be the whole line: a mapping that merely mentions it is
    // not the block, and reading from the top of the file would make every
    // trigger a job.
    expect(jobsSection('name: jobs: here\n  static:\n')).toEqual([])
    // A file that opens with anything but a key in the first column: a reader
    // that took "no block" for "start at the top" would read this whole file
    // as the block and call the key inside it a job.
    expect(jobsSection('# no jobs here\n  static:\n')).toEqual([])
  })

  it('starts wherever the key is, including the very next line', () => {
    // A reader that hunted for the key at one fixed place would read an empty
    // block for every definition that puts it anywhere else.
    expect(jobsSection('name: x\njobs:\n  a:\n')).toEqual(['  a:', ''])
    expect(jobsSection('jobs:\n  a:\n')).toEqual(['  a:', ''])
  })
})

describe('the lines that name a job', () => {
  it('reads every id the block declares, in the order they are written', () => {
    expect(jobIds(DEFINITION)).toEqual(['static', 'gate'])
  })

  it('reads an id however it is spelt, within what a job id may be', () => {
    const text = ['jobs:', '  types-and-tests:', '  _private:', '  a1:'].join('\n')
    expect(jobIds(text)).toEqual(['types-and-tests', '_private', 'a1'])
  })

  it('reads nothing out of a line that is not a job id', () => {
    // Deeper indentation is a job's own configuration; the first column is the
    // file's. A key with anything after its colon is a value, not a job.
    const text = ['jobs:', '  static:', '    runs-on: ubuntu-latest', '    needs: other', '  9lives:'].join('\n')
    expect(jobIds(text)).toEqual(['static'])
  })
})

describe('the shapes a dependency list is written in', () => {
  it('reads a list written on the line, however it is spaced', () => {
    expect(neededJobs('jobs:\n    needs: [a, b]')).toEqual(['a', 'b'])
    expect(neededJobs('jobs:\n    needs:  [a,b]  ')).toEqual(['a', 'b'])
    expect(neededJobs('jobs:\n    needs: []')).toEqual([])
  })

  it('reads a list written one job to a line', () => {
    const text = ['jobs:', '  gate:', '    needs:', '      - static', '      - browser'].join('\n')
    expect(neededJobs(text)).toEqual(['static', 'browser'])
  })

  it('stops that list at the first line that is not one of its items', () => {
    // The job written after it is not one of its dependencies, and reading on
    // would make the graph say a job waits on itself.
    const text = ['jobs:', '  gate:', '    needs:', '      - static', '    runs-on: ubuntu-latest', '  other:'].join(
      '\n',
    )
    expect(neededJobs(text)).toEqual(['static'])
  })

  it('reads a dependency on exactly one job, written without a list', () => {
    expect(neededJobs('jobs:\n    needs: static')).toEqual(['static'])
    expect(neededJobs('jobs:\n    needs:   static   ')).toEqual(['static'])
  })

  it('reads every list in the definition, not the first one it meets', () => {
    const text = ['jobs:', '  a:', '    needs: [x]', '  b:', '    needs:', '      - y', '  c:', '    needs: z'].join(
      '\n',
    )
    expect(neededJobs(text)).toEqual(['x', 'y', 'z'])
  })

  it('reads nothing out of a line that is not a dependency at all', () => {
    const text = ['jobs:', '  a:', '    runs-on: ubuntu-latest', '    if: needs.a.result', '      - stray'].join('\n')
    expect(neededJobs(text)).toEqual([])
  })

  it('reads nothing out of a dependency written outside the jobs block', () => {
    // Above the block it is not a job's dependency; it is prose, or another
    // key entirely, and counting it makes a job nothing defines look waited on.
    expect(neededJobs('needs: [ghost]\njobs:\n  a:\n')).toEqual([])
  })
})

describe('the lines each shape refuses', () => {
  // Each of these is a line some part of a pattern is the only thing refusing.
  // A dependency read out of one of them is a job counted as waited on that
  // nothing waits on, and the rule then passes a pipeline it should refuse.
  it('refuses a list that is not the whole of what the line says', () => {
    expect(neededJobs('jobs:\n    needs: [a] # and more')).toEqual([])
    expect(neededJobs('jobs:\n    if: needs: [a]')).toEqual([])
  })

  it('refuses a single dependency that is not the whole of what the line says', () => {
    expect(neededJobs('jobs:\n    needs: a extra')).toEqual([])
    expect(neededJobs('jobs:\n    if: needs: a')).toEqual([])
  })

  it('refuses a name no job id may carry', () => {
    // A job id opens with a letter or an underscore. A reader that took what
    // followed a colon whatever it was would read a version, a boolean or a
    // path as the name of a job.
    expect(neededJobs('jobs:\n    needs: 9lives')).toEqual([])
    expect(neededJobs('jobs:\n    needs: -leading')).toEqual([])
  })

  it('refuses a block key that is not alone on its line', () => {
    expect(neededJobs('jobs:\n    x needs:\n      - a')).toEqual([])
    expect(neededJobs('jobs:\n    needs: value\n      - a')).toEqual(['value'])
    // A key carrying something no job id may be is still a key carrying
    // something: it opens no list, and the lines under it are not its items.
    expect(neededJobs('jobs:\n    needs: 9lives\n      - static')).toEqual([])
  })

  it('refuses an item that is not the whole of what its line says', () => {
    const trailing = ['jobs:', '  gate:', '    needs:', '      - static # first', '      - browser'].join('\n')
    expect(neededJobs(trailing)).toEqual([])
    const attached = ['jobs:', '  gate:', '    needs:', '      - static)'].join('\n')
    expect(neededJobs(attached)).toEqual([])
    const named = ['jobs:', '  gate:', '    needs:', '      - 9lives'].join('\n')
    expect(neededJobs(named)).toEqual([])
  })

  it('reads an item however widely its dash is spaced, and refuses one with none', () => {
    // A dash opens an entry only when whitespace follows it: `-static` is a
    // scalar. The gap may be wider than one space, and a reader that admitted
    // exactly one would walk past an entry a workflow really writes.
    expect(neededJobs(['jobs:', '  gate:', '    needs:', '      -   static'].join('\n'))).toEqual(['static'])
    expect(neededJobs(['jobs:', '  gate:', '    needs:', '      -static'].join('\n'))).toEqual([])
  })
})

describe('the lines each shape refuses, written the other way', () => {
  it('refuses an entry that does not open its line', () => {
    // A dash inside a line is punctuation, not a sequence entry, and reading
    // one would take a comment or a command for a job.
    const text = ['jobs:', '  gate:', '    needs:', '      run: a - static'].join('\n')
    expect(neededJobs(text)).toEqual([])
  })

  it('refuses a key whose colon is followed by no space at all', () => {
    // `needs:[a]` and `needs:x` are plain scalars, not a key and a value, so
    // GitHub reads no dependency there and neither does this.
    expect(neededJobs('jobs:\n    needs:[a,b]')).toEqual([])
    expect(neededJobs('jobs:\n    needs:x')).toEqual([])
    expect(neededJobs('jobs:\n    needs:x\n      - static')).toEqual([])
  })

  it('refuses a key that carries a value where a job id would be', () => {
    // Two spaces and a colon is the shape of a job id, and also the shape of
    // an ordinary key. What tells them apart is that a job id ends there.
    const text = ['jobs:', '  name: gate', '  static:'].join('\n')
    expect(jobIds(text)).toEqual(['static'])
  })
})
