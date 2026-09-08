/**
 * The rule that decides what a workflow may run.
 *
 * An action reference is the one way a pipeline runs code no review of this
 * repository read, so what it may be — a full commit sha, or a workflow that
 * lives here — is the rule the rest of the pipeline's honesty rests on. Split
 * from the other rules because it is read against more shapes than any of them:
 * every way a workflow writes the key, and every way a reference can be almost
 * a sha.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import {
  actionRefViolations,
  FORBIDDEN_IN_WORKFLOWS,
  forbiddenTokenViolations,
  scriptViolations,
} from '../scripts/pipeline-guard-rules.ts'

/** A commit sha, which is the only shape an action reference may be pinned to. */
const SHA = 'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09'

describe('the action and token rules', () => {
  it('accepts a commit-pinned action and a local reusable workflow', () => {
    const text = [
      '      - uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09',
      '      - uses: ./.github/workflows/ci.yml',
      '',
    ].join('\n')
    expect(actionRefViolations('ci.yml', text)).toEqual([])
  })

  it('refuses an action pinned to a movable tag, a short sha, or nothing at all', () => {
    const text = [
      '      - uses: actions/checkout@v5',
      '      - uses: owner/app@fbc6f39',
      '      - uses: owner/app',
    ].join('\n')
    // Named, not counted: a report a reader cannot act on is a report of
    // nothing, and the reference is the whole of what there is to act on.
    expect(actionRefViolations('ci.yml', text)).toEqual([
      'workflow ci.yml: an action reference must be a full commit sha or a local reusable workflow: actions/checkout@v5',
      'workflow ci.yml: an action reference must be a full commit sha or a local reusable workflow: owner/app@fbc6f39',
      'workflow ci.yml: an action reference must be a full commit sha or a local reusable workflow: owner/app',
    ])
  })

  it('accepts an action inside a repository, at a full commit sha', () => {
    // A sub-path is how an action published beside others is named, and a
    // reader that admitted only one character of it would refuse every one.
    expect(actionRefViolations('ci.yml', `      - uses: owner/repo/setup@${SHA}`)).toEqual([])
  })

  it('refuses a sha with anything before or after it', () => {
    // The whole reference is the sha, not a line that carries one somewhere.
    expect(actionRefViolations('ci.yml', `      - uses: !owner/repo@${SHA}`).length).toBe(1)
    expect(actionRefViolations('ci.yml', `      - uses: owner/repo@${SHA}x`).length).toBe(1)
  })
})

describe('the lines an action reference is read out of', () => {
  it('reads a uses line however it is written, and only where it opens one', () => {
    // With a dash and without, spaced widely or narrowly: each is a line a
    // workflow really writes, and one a reader can be written not to see.
    expect(actionRefViolations('ci.yml', '      uses: owner/app@v1').length).toBe(1)
    expect(actionRefViolations('ci.yml', '      -   uses: owner/app@v1').length).toBe(1)
    expect(actionRefViolations('ci.yml', '      - uses:   owner/app@v1').length).toBe(1)
    expect(actionRefViolations('ci.yml', '      - uses: owner/app@v1   ').length).toBe(1)
    // A line that mentions the key rather than writing it is prose.
    expect(actionRefViolations('ci.yml', '      run: echo uses: owner/app@v1')).toEqual([])
  })

  it('refuses the tokens that let a run decide nothing', () => {
    const text =
      'continue-on-error: true\npull_request_target:\npaths-ignore:\n|| true\npassWithNoTests\n--no-verify\ndocker://alpine\ncontents: write\n'
    expect(forbiddenTokenViolations('ci.yml', text, FORBIDDEN_IN_WORKFLOWS)).toEqual(
      FORBIDDEN_IN_WORKFLOWS.map(
        (token) => `workflow ci.yml: carries ${JSON.stringify(token)}, which lets a run decide nothing`,
      ),
    )
  })

  it('refuses a package script that cannot fail', () => {
    const laundered = new Map([
      ['test', 'bun test || true'],
      ['lint', 'biome check .; exit 0'],
    ])
    expect(scriptViolations(laundered)).toEqual([
      'package.json script test: carries "|| true"',
      'package.json script lint: carries "exit 0"',
    ])
  })
})
