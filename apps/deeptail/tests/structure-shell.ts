/**
 * Shell integrity, the control wiring the page claims, and the one-page
 * one-module SSOT, as the live tree shows them.
 *
 * A second shell, a shell nested in a shell, a shell the page's own mount no
 * longer holds, a product surface seated inside another, a main landmark
 * outside every surface, a control naming an action no shipped registry
 * declares, or an inline/one-off script hanging off a product surface is a
 * second page the design system never reads. The source gate catches the
 * shipped HTML; these catch what a runtime helper can still inject.
 *
 * What the document *seats* is one subject and what its controls are *wired to*
 * is another, so each is a check of its own here; the frames a document holds
 * are the third, and they live in `structure-dialog.ts`. This module is the
 * document and the controls in it.
 *
 * These run inside the page like the rest, so they may only use DOM APIs and
 * what they are handed: each function here is shipped to the page as its own
 * source text, so a value it closed over would arrive as a `ReferenceError`.
 *
 * @module
 */

import { surfaceElements } from './structure-elements.ts'
import { describe, type Report } from './structure-report.ts'

/** What the shell checks read, as the caller hands it to the page. */
interface ShellLimits {
  /** The product surfaces the check reads, as one selector list. */
  readonly scope: string
  /**
   * Every action marker the shipped action registry declares.
   *
   * A page that names an action has to name one the registry holds, and the
   * registry lives beside the bundle rather than inside it, so it travels the
   * way the pointer floors and the type ladder do: resolved by the caller and
   * handed to the pass. A caller that hands none leaves the pass an empty
   * registry, which reports every control that names an action rather than
   * reading a page against nothing.
   */
  readonly actions?: readonly string[]
  /** Elements that take focus or activation without a `tabindex`. */
  readonly interactive?: string
  /** The element the shipped document mounts its surfaces in, as a selector. */
  readonly mount?: string
}

/**
 * The document carries one shell, not nested, with one main landmark.
 *
 * The mount is where the page's own layout is observed — the drawer flag the
 * shell reads rides on that element — so a shell seated outside it is a shell
 * the stylesheet and every suite that measures the shell no longer reach. The
 * surfaces are read as well: the shell and the picker are alternatives, and a
 * document that seats one inside the other has two pages at once. A `main`
 * landmark outside every surface is the same defect from the accessibility
 * tree's side: two mains, one of them nowhere the product's landmarks are.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read and the mount they belong in.
 */
export function checkSurfaceSeating(add: Report, limits: ShellLimits): void {
  const surfaces = [...document.querySelectorAll(limits.scope)]
  if (surfaces.length === 0) {
    add('empty-root', 'the document has no product surface; first paint must seat the shell or the picker')
  }
  const shells = surfaces.filter((node) => node.matches('[data-deeptail-shell]'))
  if (shells.length > 1) {
    add('split-shell', `the document has ${String(shells.length)} [data-deeptail-shell] roots; a document carries one`)
  }
  for (const surface of surfaces) {
    const outer = surface.parentElement?.closest(limits.scope)
    if (outer === null || outer === undefined) continue
    // A shell inside a shell is the `nested-shell` finding below; any other
    // surface inside a surface is a second page seated in the first.
    const bothShells = surface.matches('[data-deeptail-shell]') && outer.matches('[data-deeptail-shell]')
    if (!bothShells) {
      add(
        'nested-surface',
        `${describe(surface)} is a product surface seated inside ${describe(outer)}, which is one as well`,
      )
    }
  }
  for (const shell of shells) {
    const inner = [...shell.querySelectorAll('[data-deeptail-shell]')].find((node) => node !== shell)
    if (inner !== undefined) add('nested-shell', `${describe(shell)} contains another shell ${describe(inner)}`)
    const mains = shell.querySelectorAll('main')
    if (mains.length === 0) add('shell-without-main', `${describe(shell)} has no main landmark`)
    if (mains.length > 1) add('split-shell', `${describe(shell)} contains ${String(mains.length)} main landmarks`)
  }
  const mount = limits.mount
  if (mount !== undefined) {
    for (const shell of shells) {
      if (shell.closest(mount) === null) {
        add('shell-outside-mount', `${describe(shell)} is seated outside ${mount}, where the page's layout is observed`)
      }
    }
  }
  for (const main of document.querySelectorAll('main')) {
    if (main.closest(limits.scope) === null) {
      add('stray-main', `${describe(main)} is a main landmark outside every product surface`)
    }
  }
}

/**
 * Every control the page draws is wired through the one action registry.
 *
 * The live tree is what shows the three ways that goes wrong: a hook that names
 * no action or more than one, a hook on something no keyboard reaches, and a
 * hook naming an action the shipped registry does not declare. A fourth is the
 * tree's own: a control inside a control that names an action, where one press
 * bubbles into both handlers and runs two actions at once.
 *
 * The hook is read through `dataset`, which is the DOM's own read of a data
 * attribute and belongs to the HTML and SVG elements; the product writes the
 * hook onto the controls it builds, so an element of another kind carries none
 * for this rule to read and no control of this product is built that way.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read, what the page takes focus on,
 * and every action the shipped registry declares.
 */
export function checkActionWiring(add: Report, limits: ShellLimits): void {
  const declared = new Set(limits.actions ?? [])
  const interactive = limits.interactive ?? ''
  for (const node of surfaceElements(limits.scope)) {
    if (!(node instanceof HTMLElement || node instanceof SVGElement)) continue
    const hook = node.dataset.deeptailAction
    if (hook === undefined) continue
    const names = hook
      .trim()
      .split(/\s+/u)
      .filter((name) => name !== '')
    if (names.length === 0) {
      add('unwired-action', `${describe(node)} carries the action hook without naming an action at all`)
      continue
    }
    if (names.length > 1) {
      add(
        'unwired-action',
        `${describe(node)} names ${String(names.length)} actions (${names.join(', ')}), where a control answers for one`,
      )
      continue
    }
    const name = names[0] ?? ''
    const above = node.parentElement?.closest('[data-deeptail-action]')
    if (above !== null && above !== undefined) {
      add(
        'nested-action',
        `${describe(node)} sits inside ${describe(above)}, which names an action of its own; one press runs both`,
      )
    }
    if (interactive !== '' && !node.matches(interactive)) {
      add('unwired-action', `${describe(node)} names action "${name}" without being a control a keyboard reaches`)
    }
    if (!declared.has(name)) {
      add('unwired-action', `${describe(node)} names action "${name}", which the shipped registry does not declare`)
    }
  }
}

/**
 * What the document seats, and what the controls in it are wired to.
 *
 * The seating is read first, so a finding about the page's own shape names the
 * document before any finding about a control inside it: a page seated twice is
 * the defect a reader acts on first, and the controls of the second page are
 * read the same way either way.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read, the mount they belong in, what
 * takes focus inside them, and every action the shipped registry declares.
 */
export function checkShell(add: Report, limits: ShellLimits): void {
  checkSurfaceSeating(add, limits)
  checkActionWiring(add, limits)
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
export function checkInlineScripts(add: Report, limits: ShellLimits): void {
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
export function checkOneOffScripts(add: Report, limits: ShellLimits): void {
  const shipped = /\/(?:src\/main\.ts|assets\/[^/]+-[A-Za-z0-9_-]+\.js)$/u
  for (const script of document.querySelectorAll('script')) {
    if (script.closest(limits.scope) !== null) continue
    const src = (script.getAttribute('src') ?? '').trim()
    if (src === '' || shipped.test(src)) continue
    add('inline-script', `${describe(script)} loads ${src}; the page has one module entry`)
  }
}
