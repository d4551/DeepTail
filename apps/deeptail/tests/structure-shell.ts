/**
 * Shell integrity and the one-page one-module SSOT, as the live tree shows them.
 *
 * A second shell, a shell nested in a shell, a shell with no main landmark, or
 * an inline/one-off script hanging off a product surface is a second page the
 * design system never reads. The source gate catches the shipped HTML; these
 * catch what a runtime helper can still inject.
 *
 * @module
 */

import { describe, type Report } from './structure-report.ts'

/** What the shell checks read, as the caller hands it to the page. */
interface ShellLimits {
  /** The product surfaces the check reads, as one selector list. */
  readonly scope: string
}

/**
 * The document carries one shell, not nested, with one main landmark.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkShell(add: Report, limits: ShellLimits): void {
  const shells = [...document.querySelectorAll(limits.scope)].filter((node) => node.matches('[data-deeptail-shell]'))
  if (shells.length > 1) {
    add('split-shell', `the document has ${String(shells.length)} [data-deeptail-shell] roots; a document carries one`)
  }
  for (const shell of shells) {
    const inner = [...shell.querySelectorAll('[data-deeptail-shell]')].find((node) => node !== shell)
    if (inner !== undefined) add('nested-shell', `${describe(shell)} contains another shell ${describe(inner)}`)
    const mains = shell.querySelectorAll('main')
    if (mains.length === 0) add('shell-without-main', `${describe(shell)} has no main landmark`)
    if (mains.length > 1) add('split-shell', `${describe(shell)} contains ${String(mains.length)} main landmarks`)
  }
}

/**
 * A script inside a product surface is a per-page helper outside the one module.
 *
 * The shipped page loads exactly `/src/main.ts`. Anything else hanging off the
 * shell or picker — inline or src — is a second entry the gates never typecheck.
 * Harness/axe scripts live on `documentElement`/`head`/`body`, not inside the
 * product roots, so they are not this rule's subject.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkInlineScripts(add: Report, limits: ShellLimits): void {
  for (const root of document.querySelectorAll(limits.scope)) {
    for (const script of root.querySelectorAll('script')) {
      const src = (script.getAttribute('src') ?? '').trim()
      if (src === '') {
        add('inline-script', `${describe(script)} is an inline script inside ${describe(root)}`)
        continue
      }
      add(
        'inline-script',
        `${describe(script)} loads ${src} from inside ${describe(root)}; the page has one module entry`,
      )
    }
  }
}

export { checkInlineScripts, checkShell }
