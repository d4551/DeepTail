/**
 * Shell integrity, the dialog contract, and the one-page one-module SSOT, as
 * the live tree shows them.
 *
 * A second shell, a shell nested in a shell, a shell with no main landmark, a
 * dialog or a mask built outside the shared frame, or an inline/one-off script
 * hanging off a product surface is a second page the design system never reads.
 * The source gate catches the shipped HTML; these catch what a runtime helper
 * can still inject.
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
  const surfaces = [...document.querySelectorAll(limits.scope)]
  if (surfaces.length === 0) {
    add('empty-root', 'the document has no product surface; first paint must seat the shell or the picker')
  }
  const shells = surfaces.filter((node) => node.matches('[data-deeptail-shell]'))
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

/**
 * A sourced helper on `body`/`head` that is not the page's one module entry.
 *
 * Product-root scripts are `checkInlineScripts`. Harness/axe inject inline
 * scripts with no `src` on `html`/`head`/`body`, so those stay silent. A
 * `src` that is not the shipped entry or a hashed bundler chunk is a second
 * page the gates never typecheck — including one appended to `document.body`.
 * @param add - collects a finding.
 * @param limits - the product surfaces already covered by `checkInlineScripts`.
 */
function checkOneOffScripts(add: Report, limits: ShellLimits): void {
  const shipped = /\/(?:src\/main\.ts|assets\/[^/]+-[A-Za-z0-9_-]+\.js)$/u
  for (const script of document.querySelectorAll('script')) {
    if (script.closest(limits.scope) !== null) continue
    const src = (script.getAttribute('src') ?? '').trim()
    if (src === '' || shipped.test(src)) continue
    add('inline-script', `${describe(script)} loads ${src}; the page has one module entry`)
  }
}

/**
 * Every dialog, and every mask, comes from the one component that draws them.
 *
 * A dialog is a contract, not a box: it declares itself modal, it is named by a
 * heading, everything behind it leaves the tree, and it is dismissed on Escape
 * with focus handed back to whatever opened it. The shared frame is what holds
 * that contract in one place, and it marks what it builds, so a dialog or a
 * mask assembled anywhere else is a second contract — one that will be missing
 * whichever of those promises its author did not think of, and that no rule
 * engine reports while the one it *did* remember keeps axe quiet.
 *
 * The mask is found by where it is drawn rather than by a colour: an element
 * laid out over the whole viewport, outside every product surface, that no
 * frame holding a marked dialog contains. A page may paint a mask — the shell
 * paints one behind its drawer — so the rule is not that masks are forbidden,
 * only that each one belongs to a root that owns it.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read.
 */
function checkDialogContract(add: Report, limits: ShellLimits): void {
  const marker = '[data-deeptail-dialog]'
  const roles = '[role="dialog"], [role="alertdialog"]'
  const dialogs = [...document.querySelectorAll(roles)]
  if (dialogs.length > 1) {
    add('dialog-contract', `the document holds ${String(dialogs.length)} dialogs at once; one frame is open at a time`)
  }
  for (const dialog of dialogs) {
    if (!dialog.matches(marker)) {
      add(
        'dialog-contract',
        `${describe(dialog)} is a dialog the shared frame did not build, so nothing holds its mask, its naming and its dismissal together`,
      )
      continue
    }
    if (dialog.getAttribute('aria-modal') !== 'true') {
      add('dialog-contract', `${describe(dialog)} is the shared frame without declaring itself modal`)
    }
  }
  for (const marked of document.querySelectorAll(marker)) {
    if (!marked.matches(roles)) {
      add('dialog-contract', `${describe(marked)} carries the dialog marker without the dialog role to go with it`)
    }
  }
  const owned = (node: Element): boolean => {
    if (node.closest(limits.scope) !== null) return true
    let held: Element | null = node
    while (held !== null && held !== document.body) {
      if (held.querySelector(marker) !== null) return true
      held = held.parentElement
    }
    return false
  }
  for (const node of document.querySelectorAll('body *')) {
    const style = getComputedStyle(node)
    if (style.position !== 'fixed' && style.position !== 'absolute') continue
    const box = node.getBoundingClientRect()
    if (box.width < window.innerWidth * 0.9 || box.height < window.innerHeight * 0.9) continue
    if (owned(node)) continue
    add(
      'overlay-contract',
      `${describe(node)} is drawn over the whole viewport outside every product root, and no dialog frame owns it`,
    )
  }
}

export { checkDialogContract, checkInlineScripts, checkOneOffScripts, checkShell }
