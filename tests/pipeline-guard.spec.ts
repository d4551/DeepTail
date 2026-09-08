/**
 * The pipeline guard's rules, driven against definitions that carry the cheat.
 *
 * A guard nobody tests is a guard that can stop matching the thing it guards,
 * so every rule here is handed a definition breaking it and held to naming it —
 * by its whole message, not by a count, because a report a reader cannot act on
 * reports nothing. The pinned lists — the gates, the forbidden tokens, the
 * workflow set, the owned paths — are held to their exact shape, so widening
 * what the pipeline may say means changing this file, and that change travels
 * through review with the code it re-points.
 *
 * The action-reference rule is driven in `pipeline-guard-actions.spec.ts`, the
 * job graph in `pipeline-guard-jobs.spec.ts`, and every rule at once against a
 * copy of the repository's own pipeline in `pipeline-guard-tree.spec.ts`.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import { gateCoverageViolations, MERGE_GATES, validateChainViolations } from '../scripts/pipeline-guard-gates.ts'
import { aggregationViolations } from '../scripts/pipeline-guard-jobs.ts'
import {
  bunVersionViolations,
  CODE_OWNED_PATHS,
  checkoutCredentialViolations,
  codeOwnersViolations,
  FORBIDDEN_IN_SCRIPTS,
  FORBIDDEN_IN_WORKFLOWS,
  installViolations,
  MERGE_GATE_WORKFLOW,
  scheduleViolations,
  timeoutViolations,
  WORKFLOW_FILES,
  workflowSetViolations,
} from '../scripts/pipeline-guard-rules.ts'

/** A definition that runs every pinned gate, the way the real one must. */
const FULL_CHAIN = MERGE_GATES.map((gate) => `      - run: bun run ${gate}`).join('\n')

describe('the bounds rules', () => {
  it('refuses an install that is not locked', () => {
    expect(installViolations('ci.yml', 'run: bun install\n')).toEqual([
      "workflow ci.yml: an install must be locked to the manifest's lockfile with --frozen-lockfile",
    ])
    expect(installViolations('ci.yml', 'run: bun install --frozen-lockfile\n')).toEqual([])
    expect(installViolations('ci.yml', 'run: bun run lint\n')).toEqual([])
  })

  it('refuses a job that runs unbounded', () => {
    const text = 'jobs:\n  a:\n    runs-on: ubuntu-latest\n    runs-on: ubuntu-latest\n    timeout-minutes: 5\n'
    expect(timeoutViolations('ci.yml', text)).toEqual([
      'workflow ci.yml: 2 job(s) against 1 timeout(s); every job is bounded',
    ])
    expect(timeoutViolations('ci.yml', 'runs-on: ubuntu-latest\ntimeout-minutes: 5\n')).toEqual([])
  })
})

describe('the bounds rules a run is held inside', () => {
  it('refuses a checkout that keeps the token it does not need', () => {
    const text = 'uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09\npersist-credentials: false\n'
    expect(checkoutCredentialViolations('ci.yml', text)).toEqual([])
    // However widely the value is spaced from its key: a workflow chooses that
    // width, and a reader that admitted exactly one space would call a locked
    // checkout an unlocked one.
    expect(checkoutCredentialViolations('ci.yml', text.replace(': false', ':  false'))).toEqual([])
    const keeping = 'uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09\n'
    expect(checkoutCredentialViolations('ci.yml', keeping)).toEqual([
      'workflow ci.yml: 1 checkout(s) against 0 persist-credentials: false; every checkout drops the token',
    ])
  })

  it('refuses a setup-bun that runs a version the manifest never pinned', () => {
    expect(bunVersionViolations('ci.yml', 'uses: oven-sh/setup-bun@0c5077e5\n', '1.4.2').length).toBe(1)
    expect(bunVersionViolations('ci.yml', 'bun-version: 1.4.2\n', '1.4.2')).toEqual([])
    const checkout = 'uses: actions/checkout@fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09'
    expect(bunVersionViolations('ci.yml', checkout, '1.4.2')).toEqual([])
  })

  it('refuses a schedule anywhere but the audit clock', () => {
    const clock = 'on:\n  schedule:\n    - cron: "0 5 * * 1"\n'
    expect(scheduleViolations('ci.yml', clock)).toEqual([
      'workflow ci.yml: only mutation.yml may carry a schedule; a clock is not a merge decision',
    ])
    expect(scheduleViolations('mutation.yml', clock)).toEqual([])
  })

  it('refuses a workflow added beside the pinned set, and a pinned one removed', () => {
    expect(workflowSetViolations(WORKFLOW_FILES)).toEqual([])
    expect(workflowSetViolations(['ci.yml', 'gate-fake.yml'])).toEqual([
      'the workflow definition mutation.yml is gone; the pipeline is shorter than its pinned shape',
      'the workflow definition pipeline-guard.yml is gone; the pipeline is shorter than its pinned shape',
      'the workflow definition release.yml is gone; the pipeline is shorter than its pinned shape',
      'the workflow definition gate-fake.yml is not one of the pinned definitions; two workflows cannot share a check name',
    ])
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

  it('reads a gate as run only where it is run, not where it is named', () => {
    // A workflow names things: a step called "build the frontend" is not the
    // build gate being run. A reader that looked for the gate's name anywhere
    // would take the label for the command.
    const named = `${FULL_CHAIN.replace('      - run: bun run build\n', '')}\n      - name: build the frontend\n`
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, named)).toEqual([
      'workflow ci.yml: the merge gate does not run build',
    ])
  })
})

describe('how a gate is recognised as run', () => {
  it('reads a gate run more than once, and one run at the very end of the text', () => {
    // The first place a name appears may be a longer gate; the reader has to
    // go on looking. And a chain that ends on the gate ends the text, which is
    // a boundary as much as any character is.
    const twice = `      - run: bun run lint:ox\n      - run: bun run lint`
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, `${FULL_CHAIN}\n${twice}`)).toEqual([])
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, FULL_CHAIN.replace('\n', ''))).toEqual([])
  })
})

describe('the names a gate is told apart from', () => {
  it('refuses a gate name a longer one merely begins, however it continues', () => {
    // Each character a script name may continue with: a reader that admitted
    // any of them would read `lint:ox`, `lint.slow` or `lint-rust` as `lint`.
    for (const longer of ['lint:ox', 'lint.slow', 'lint-rust', 'lintx']) {
      const standIn = FULL_CHAIN.replace('bun run lint\n', `bun run ${longer}\n`)
      expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, standIn)).toEqual([
        'workflow ci.yml: the merge gate does not run lint',
      ])
    }
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
    expect(validateChainViolations(new Map([['validate', shortChain]]))).toEqual([
      'package.json: the validate chain no longer runs knip',
    ])
    expect(validateChainViolations(new Map())).toEqual([
      'package.json: the validate chain is gone; nothing decides ship-worthiness',
    ])
  })

  it('refuses a code-owner list that leaves the pipeline unowned', () => {
    // Named one path at a time, and named by the list they are missing from:
    // a reader is being told which entry to write and where.
    expect(codeOwnersViolations('.github/ @d4551\n/scripts/ @d4551\n')).toEqual(
      CODE_OWNED_PATHS.filter((path) => path !== '.github/' && path !== '/scripts/').map(
        (path) => `.github/CODEOWNERS: no ownership entry covers ${path}`,
      ),
    )
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
})

describe('the pinned tokens a pipeline may not carry', () => {
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

  it('holds the owned paths to their exact shape', () => {
    // The list a reviewer of this pipeline must own, held still: emptied, the
    // ownership rule reports nothing and the pipeline is owned by nobody.
    expect(CODE_OWNED_PATHS).toEqual([
      '.github/',
      '/package.json',
      '/bunfig.toml',
      '/biome.json',
      '/.oxlintrc.json',
      '/knip.json',
      '/stryker.',
      '/tsconfig',
      '/scripts/',
      '/tests/',
    ])
  })
})

describe('the pinned shape of the pipeline itself', () => {
  it('holds the workflow set to its exact shape', () => {
    expect(WORKFLOW_FILES).toEqual(['ci.yml', 'mutation.yml', 'pipeline-guard.yml', 'release.yml'])
  })
})
