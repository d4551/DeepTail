/**
 * The pipeline guard, held to its own rules.
 *
 * A guard nobody tests is a guard that can stop matching the thing it guards,
 * so every rule is driven twice: once against synthetic definitions that carry
 * the cheat and must be named, once against the repository's own pipeline,
 * which must be clean under every rule at once. The pinned lists — the gates,
 * the forbidden tokens, the workflow set — are held to their exact shape, so
 * widening what the pipeline may say means changing this file, and that change
 * travels through review with the code it re-points.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { aggregationViolations } from '../scripts/pipeline-guard-jobs.ts'
import {
  actionRefViolations,
  bunVersionViolations,
  checkoutCredentialViolations,
  codeOwnersViolations,
  FORBIDDEN_IN_SCRIPTS,
  FORBIDDEN_IN_WORKFLOWS,
  forbiddenTokenViolations,
  gateCoverageViolations,
  installViolations,
  MERGE_GATE_WORKFLOW,
  MERGE_GATES,
  scheduleViolations,
  scriptViolations,
  timeoutViolations,
  validateChainViolations,
  WORKFLOW_FILES,
  workflowSetViolations,
} from '../scripts/pipeline-guard-rules.ts'

/** A definition that runs every pinned gate, the way the real one must. */
const FULL_CHAIN = MERGE_GATES.map((gate) => `      - run: bun run ${gate}`).join('\n')

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
    expect(actionRefViolations('ci.yml', text).length).toBe(3)
  })

  it('refuses the tokens that let a run decide nothing', () => {
    const text =
      'continue-on-error: true\npull_request_target:\npaths-ignore:\n|| true\npassWithNoTests\n--no-verify\ndocker://alpine\ncontents: write\n'
    expect(forbiddenTokenViolations('ci.yml', text, FORBIDDEN_IN_WORKFLOWS).length).toBe(FORBIDDEN_IN_WORKFLOWS.length)
  })

  it('refuses a package script that cannot fail', () => {
    const laundered = { test: 'bun test || true', lint: 'biome check .; exit 0' }
    expect(scriptViolations(laundered).length).toBe(2)
  })
})

describe('the bounds rules', () => {
  it('refuses an install that is not locked', () => {
    expect(installViolations('ci.yml', 'run: bun install\n').length).toBe(1)
    expect(installViolations('ci.yml', 'run: bun install --frozen-lockfile\n')).toEqual([])
    expect(installViolations('ci.yml', 'run: bun run lint\n')).toEqual([])
  })

  it('refuses a job that runs unbounded', () => {
    const text = 'jobs:\n  a:\n    runs-on: ubuntu-latest\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n'
    expect(timeoutViolations('ci.yml', text).length).toBe(1)
    expect(timeoutViolations('ci.yml', 'runs-on: ubuntu-latest\ntimeout-minutes: 5\n')).toEqual([])
  })

  it('refuses a checkout that keeps the token it does not need', () => {
    const text = 'uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09\npersist-credentials: false\n'
    expect(checkoutCredentialViolations('ci.yml', text)).toEqual([])
    const keeping = 'uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09\n'
    expect(checkoutCredentialViolations('ci.yml', keeping).length).toBe(1)
  })

  it('refuses a setup-bun that runs a version the manifest never pinned', () => {
    expect(bunVersionViolations('ci.yml', 'uses: oven-sh/setup-bun@0c5077e5\n', '1.4.2').length).toBe(1)
    expect(bunVersionViolations('ci.yml', 'bun-version: 1.4.2\n', '1.4.2')).toEqual([])
    const checkout = 'uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09'
    expect(bunVersionViolations('ci.yml', checkout, '1.4.2')).toEqual([])
  })

  it('refuses a schedule anywhere but the audit clock', () => {
    const clock = 'on:\n  schedule:\n    - cron: "0 5 * * 1"\n'
    expect(scheduleViolations('ci.yml', clock).length).toBe(1)
    expect(scheduleViolations('mutation.yml', clock)).toEqual([])
  })

  it('refuses a workflow added beside the pinned set, and a pinned one removed', () => {
    expect(workflowSetViolations(WORKFLOW_FILES)).toEqual([])
    const shadowed = ['ci.yml', 'gate-fake.yml']
    expect(workflowSetViolations(shadowed).length).toBe(WORKFLOW_FILES.length)
  })
})

describe('the coverage rules', () => {
  it('names a merge gate the workflow stopped running', () => {
    const withoutKnip = FULL_CHAIN.replace('bun run knip\n', 'bun run knip:nothing\n')
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, withoutKnip)).toEqual([
      'workflow ci.yml: the merge gate does not run knip',
    ])
    expect(gateCoverageViolations('release.yml', 'bun run whatever')).toEqual([])
  })

  it('refuses a longer script name standing in for the gate it begins', () => {
    const standIn = FULL_CHAIN.replace('bun run lint\n', 'bun run lint:ox\n')
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, standIn)).toEqual([
      'workflow ci.yml: the merge gate does not run lint',
    ])
  })

  it('names a gate the validate chain stopped running, and a manifest without a chain', () => {
    const shortChain = MERGE_GATES.filter((gate) => gate !== 'knip')
      .map((gate) => `bun run ${gate}`)
      .join(' && ')
    expect(validateChainViolations({ validate: shortChain })).toEqual([
      'package.json: the validate chain no longer runs knip',
    ])
    expect(validateChainViolations({})).toEqual([
      'package.json: the validate chain is gone; nothing decides ship-worthiness',
    ])
  })

  it('refuses a code-owner list that leaves the pipeline unowned', () => {
    expect(codeOwnersViolations('.github/ @d4551\n/scripts/ @d4551\n').length).toBeGreaterThan(0)
  })
})

describe('the job-graph rule', () => {
  it('refuses a merge gate whose jobs are not all aggregated into the one check', () => {
    const refusal = [
      "    if: ${{ contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')",
      "      || contains(needs.*.result, 'skipped') }}",
      '    run: exit 1',
    ].join('\n')
    const sound = ['jobs:', '  static:', '    runs-on: ubuntu-latest', '  gate:', '    needs: [static]', refusal].join(
      '\n',
    )
    expect(aggregationViolations(MERGE_GATE_WORKFLOW, sound)).toEqual([])
    // The same shape written as a block list: a rule that knew only the inline
    // one would be a rule a rewrite steps around by changing punctuation.
    const block = sound.replace('needs: [static]', 'needs:\n      - static')
    expect(aggregationViolations(MERGE_GATE_WORKFLOW, block)).toEqual([])
    // A job added beside the aggregate: it runs, it reports, and branch
    // protection — which waits on the aggregate — never sees it.
    const orphaned = sound.replace('  gate:', '  browser:\n    runs-on: ubuntu-latest\n  gate:')
    expect(aggregationViolations(MERGE_GATE_WORKFLOW, orphaned)).toEqual([
      'workflow ci.yml: browser, gate are each waited on by nothing; exactly one job aggregates the rest',
    ])
    // An aggregate that waits on a name no job carries waits on nothing.
    expect(aggregationViolations(MERGE_GATE_WORKFLOW, sound.replace('[static]', '[typo]'))).toEqual([
      'workflow ci.yml: the aggregate waits on typo, which is not a job here',
    ])
    // Reading the results and then exiting zero is reading them for nothing.
    expect(aggregationViolations(MERGE_GATE_WORKFLOW, sound.replace('exit 1', 'echo fine'))).toEqual([
      'workflow ci.yml: the aggregate does not refuse on exit 1',
    ])
    // Each outcome in turn: a job that reads three of the four and passes the
    // fourth through is a merge waiting on a check that lets one state by.
    for (const outcome of ["'failure'", "'cancelled'", "'skipped'"]) {
      expect(aggregationViolations(MERGE_GATE_WORKFLOW, sound.replace(outcome, "'nothing'"))).toEqual([
        `workflow ci.yml: the aggregate does not refuse on ${outcome}`,
      ])
    }
    // Only the merge gate is aggregated: the others gate no merge.
    expect(aggregationViolations('release.yml', 'jobs:\n  bundles:\n    runs-on: ubuntu-latest\n')).toEqual([])
  })
})

describe('the job graph the rule reads', () => {
  it('refuses a graph with no aggregate in it at all', () => {
    // A block with no job in it decides nothing, and every job waited on by
    // another is a graph with no one check a merge can be pointed at. A reader
    // that took either for "all aggregated" would pass a pipeline branch
    // protection cannot be made to wait on.
    expect(aggregationViolations(MERGE_GATE_WORKFLOW, 'jobs:\n')).toEqual([
      'workflow ci.yml: no job is defined, so nothing decides the merge',
    ])
    const refusal = [
      "    if: ${{ contains(needs.*.result, 'failure') || contains(needs.*.result, 'cancelled')",
      "      || contains(needs.*.result, 'skipped') }}",
      '    run: exit 1',
    ].join('\n')
    const cycle = ['jobs:', '  a:', '    needs: [b]', '  b:', '    needs: [a]', refusal].join('\n')
    expect(aggregationViolations(MERGE_GATE_WORKFLOW, cycle)).toEqual([
      'workflow ci.yml: every job is waited on, so none of them is the aggregate',
    ])
  })
})

describe('the pinned lists', () => {
  it('holds the merge gates to their exact shape', () => {
    expect(MERGE_GATES).toEqual([
      'lint',
      'check:tree',
      'check:outdated',
      'check:cargo',
      'lint:ox',
      'check:styles',
      'check:bans',
      'check:entries',
      'check:registry',
      'typecheck',
      'build',
      'test',
      'knip',
      'lint:rust',
      'test:rust',
      'test:browser',
      'a11y',
    ])
  })

  it('holds the forbidden tokens to their exact shape', () => {
    expect(FORBIDDEN_IN_WORKFLOWS).toEqual([
      'continue-on-error',
      'pull_request_target',
      'paths-ignore',
      '|| true',
      'passWithNoTests',
      '--no-verify',
      'docker://',
      'contents: write',
    ])
    expect(FORBIDDEN_IN_SCRIPTS).toEqual(['|| true', '; true', 'exit 0', 'passWithNoTests', '--no-verify'])
  })

  it('holds the workflow set to its exact shape', () => {
    expect(WORKFLOW_FILES).toEqual(['ci.yml', 'mutation.yml', 'pipeline-guard.yml', 'release.yml'])
  })
})
