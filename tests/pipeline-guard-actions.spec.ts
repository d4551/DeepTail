/**
 * The rule that decides what a workflow may run, and how a command is read.
 *
 * An action reference is the one way a pipeline runs code no review of this
 * repository read, so what it may be — a full commit sha, or a workflow that
 * lives here — is the rule the rest of the pipeline's honesty rests on. Split
 * from the other rules because it is read against more shapes than any of them:
 * every way a workflow writes the key, and every way a reference can be almost
 * a sha.
 *
 * What a definition *does* run is read here too, because a command is written in
 * four places that execute nothing — a commented line, a disabled step, a
 * disabled job, and a step that only echoes it — and each has a lookalike that
 * must still be read as run. The same reader holds each definition to the program
 * it exists for, and the manifest to a script for every gate it pins.
 *
 * @module
 */

import { describe, expect, it } from 'bun:test'
import {
  gateCoverageViolations,
  gateScriptViolations,
  MERGE_GATES,
  runsProgram,
  WORKFLOW_PROGRAMS,
  withoutComment,
  workflowCommands,
  workflowProgramViolations,
} from '../scripts/pipeline-guard-gates.ts'
import {
  actionRefViolations,
  FORBIDDEN_IN_WORKFLOWS,
  forbiddenTokenViolations,
  MERGE_GATE_WORKFLOW,
  scriptViolations,
} from '../scripts/pipeline-guard-rules.ts'

/** A commit sha, which is the only shape an action reference may be pinned to. */
const SHA = 'fbc6f3992d24b796d5a048ff273f7fcc4a7b6c09'

/** One step, as a definition writes it. */
const STEP = '      - run: bun run knip\n'

/** A step condition that is merely present, and true: the step still runs. */
const LIVE_CONDITION = "        if: ${{ runner.os == 'Linux' }}\n"

/** A definition that runs every pinned gate, the way the real one must. */
const CHAIN = MERGE_GATES.map((gate) => `      - run: bun run ${gate}`).join('\n')

/** What a definition that stopped running knip is told, and nothing else. */
const KNIP_MISSING = ['workflow ci.yml: the merge gate does not run knip']

/**
 * A manifest that declares every pinned gate, each running a program.
 * @returns the scripts, by name.
 */
function declared(): Map<string, string> {
  return new Map(MERGE_GATES.map((gate) => [gate, `bun scripts/${gate.replace(':', '-')}.ts`]))
}

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

describe('the command text a step is read as', () => {
  it('reads the command of every step, and nothing of the lines that are not one', () => {
    expect(workflowCommands(STEP)).toEqual(['bun run knip'])
    // A block scalar carries its command on the lines under the key, and those
    // lines are statements like any other.
    const block = 'jobs:\n  a:\n    steps:\n      - run: |\n          bun run knip\n          bun run lint\n'
    expect(workflowCommands(block)).toEqual(['bun run knip; bun run lint'])
    // Nothing at all out of a definition that runs nothing: no step at all, a
    // step with no command, and a line that is only a comment.
    expect(workflowCommands('name: nothing\n')).toEqual([])
    expect(workflowCommands('      - name: knip (nothing shipped unread)\n')).toEqual([])
    expect(workflowCommands(`      #${STEP}`)).toEqual([])
    // A comment after a command is a comment, and the command before it stands.
    expect(withoutComment('      - run: bun run knip # the gate\n')).toBe('      - run: bun run knip')
  })

  it('reads a step whole, so the order its keys are written in decides nothing', () => {
    expect(workflowCommands(`${STEP}        if: false\n`)).toEqual([])
    expect(workflowCommands('      - if: false\n        run: bun run knip\n')).toEqual([])
    // A condition that is merely present, and true, is a step that runs — and a
    // disabled step is one step, where a disabled job is every step inside it.
    expect(workflowCommands(`${STEP}${LIVE_CONDITION}`)).toEqual(['bun run knip'])
    const twoJobs = [
      'jobs:',
      '  a:',
      '    if: false',
      '    steps:',
      '      - run: bun run knip',
      '  b:',
      '    steps:',
      '      - run: bun run lint',
    ].join('\n')
    expect(workflowCommands(twoJobs)).toEqual(['bun run lint'])
  })

  it('tells a command from the mention of one, wherever the mention is written', () => {
    const knip = 'bun run knip'
    expect(runsProgram(knip, knip)).toBe(true)
    expect(runsProgram(`bun run lint && ${knip}`, knip)).toBe(true)
    expect(runsProgram(`bun run lint\n${knip}`, knip)).toBe(true)
    expect(runsProgram(`echo "${knip}"`, knip)).toBe(false)
    expect(runsProgram(`echo ${knip}`, knip)).toBe(false)
    expect(runsProgram(`name: ${knip}`, knip)).toBe(false)
    // A longer name is another command, however it continues.
    expect(runsProgram('bun run knip:all', knip)).toBe(false)
  })
})

describe('the gate a definition is held to run', () => {
  it('refuses a step that was commented out, disabled, or only echoes the gate', () => {
    // The coverage rule reads the commands a definition runs, so every place a
    // command is written and nothing executes is refused by it: the step is in
    // the file, and the gate is not run.
    const inPlaceOfKnip = (step: string): string => CHAIN.replace(STEP, step)
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, CHAIN)).toEqual([])
    for (const cheat of [
      '      #      - run: bun run knip\n',
      '      - if: false\n        run: bun run knip\n',
      '      - run: echo "bun run knip"\n',
    ]) {
      expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, inPlaceOfKnip(cheat))).toEqual(KNIP_MISSING)
    }
    // The lookalike each of them resembles: a comment that merely names the
    // gate, a condition that is true, and a step that runs it beside an echo.
    const prose = `${CHAIN}\n      # knip reads nothing shipped unread\n`
    const conditional = inPlaceOfKnip(`${STEP}${LIVE_CONDITION}`)
    const beside = inPlaceOfKnip(`${STEP}      - run: bun run knip\n`)
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, prose)).toEqual([])
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, conditional)).toEqual([])
    expect(gateCoverageViolations(MERGE_GATE_WORKFLOW, beside)).toEqual([])
  })
})

describe('the pinned gate the manifest declares', () => {
  it('refuses a gate no script declares', () => {
    // A pinned gate is reached through its script: a name no script declares is
    // a name `bun run` answers with an error, and no gate ran at all.
    expect(gateScriptViolations(declared())).toEqual([])
    const withoutKnip = new Map([...declared()].filter(([name]) => name !== 'knip'))
    expect(gateScriptViolations(withoutKnip)).toEqual([
      'package.json: the gate knip is pinned and no script declares it',
    ])
  })

  it('refuses a gate whose script runs no program at all', () => {
    // `":"`, `"true"` and `"exit 0"` each exit zero having read nothing: the
    // chain runs the gate, the gate reports green, and no file was ever opened.
    for (const nothing of [':', 'true', 'exit 0', 'echo "the gate is fine"']) {
      expect(gateScriptViolations(new Map([...declared(), ['check:tree', nothing]]))).toEqual([
        'package.json script check:tree: runs no program, so the gate it is pinned as decides nothing',
      ])
    }
    // A verdict printed after the work is not the work, and the work is what
    // makes the script a gate: the shipped axe script ends on an echo.
    const verdicts = new Map([
      ...declared(),
      ['a11y', "bun test apps/deeptail/tests/a11y.browser.spec.ts && echo 'axe: no accessibility violations'"],
    ])
    expect(gateScriptViolations(verdicts)).toEqual([])
  })
})

describe('the program each definition exists for', () => {
  it('refuses a definition that stopped running the program it exists for', () => {
    const guard = [
      'name: pipeline-guard',
      'jobs:',
      '  pipeline-guard:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: bun scripts/pipeline-guard.ts',
      '',
    ].join('\n')
    expect(workflowProgramViolations('pipeline-guard.yml', guard)).toEqual([])
    const instead = guard.replace('      - run: bun scripts/pipeline-guard.ts', '      - run: echo "the guard ran"')
    expect(workflowProgramViolations('pipeline-guard.yml', instead)).toEqual([
      'workflow pipeline-guard.yml: nothing runs bun scripts/pipeline-guard.ts, which is what this definition is for',
    ])
    // A definition the table does not pin is not read: `ci.yml` runs every
    // merge gate, and the coverage rule is what holds it to them.
    expect(workflowProgramViolations('ci.yml', 'jobs:\n  static:\n')).toEqual([])
  })

  it('refuses an audit clock that stopped running the audit, and the check after it', () => {
    // `mutation.yml` exists for two commands: the audit, and the check that the
    // audit left the tree alone. `mutate:gates` is one scope of the audit and
    // not the audit, and a clock that ran neither would report a score for a
    // denominator nothing measured.
    const clock = [
      'name: mutation',
      'jobs:',
      '  mutation:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - run: bun run mutate',
      '      - run: bun run check:tree',
      '',
    ].join('\n')
    expect(workflowProgramViolations('mutation.yml', clock)).toEqual([])
    const oneScope = clock.replace('      - run: bun run mutate\n', '      - run: bun run mutate:gates\n')
    expect(workflowProgramViolations('mutation.yml', oneScope)).toEqual([
      'workflow mutation.yml: nothing runs bun run mutate, which is what this definition is for',
    ])
    const unread = clock.replace('      - run: bun run check:tree\n', '')
    expect(workflowProgramViolations('mutation.yml', unread)).toEqual([
      'workflow mutation.yml: nothing runs bun run check:tree, which is what this definition is for',
    ])
  })
})

describe('the pinned table of programs', () => {
  it('holds the program each definition exists for to its exact shape', () => {
    // The table is what makes a definition's reason to run a rule: emptied, the
    // cases above report nothing to hold any of them to.
    expect(WORKFLOW_PROGRAMS).toEqual([
      ['pipeline-guard.yml', 'bun scripts/pipeline-guard.ts'],
      ['mutation.yml', 'bun run mutate'],
      ['mutation.yml', 'bun run check:tree'],
      ['release.yml', 'bun run tauri build'],
    ])
  })
})
