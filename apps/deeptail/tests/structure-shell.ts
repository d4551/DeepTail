/**
 * Shell integrity, the control wiring the page claims, the dialog contract, and
 * the one-page one-module SSOT, as the live tree shows them.
 *
 * A second shell, a shell nested in a shell, a shell the page's own mount no
 * longer holds, a product surface seated inside another, a main landmark
 * outside every surface, a control naming an action no shipped registry
 * declares, a dialog or a mask built outside the shared frame, or an
 * inline/one-off script hanging off a product surface is a second page the
 * design system never reads. The source gate catches the shipped HTML; these
 * catch what a runtime helper can still inject.
 *
 * @module
 */

import { surfaceElements } from './structure-elements.ts'
import { drawnBox } from './structure-pointer.ts'
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

/** The edges of a painted box, as the rules that read one measure it. */
interface PaintedBox {
  readonly top: number
  readonly left: number
  readonly right: number
  readonly bottom: number
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
 *
 * Every control the page draws is wired through the one action registry, and
 * the live tree is what shows the three ways that goes wrong: a hook that names
 * no action or more than one, a hook on something no keyboard reaches, and a
 * hook naming an action the shipped registry does not declare. A fourth is the
 * tree's own: a control inside a control that names an action, where one press
 * bubbles into both handlers and runs two actions at once.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read, the mount they belong in, and
 * what the page takes focus on.
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
  const declared = new Set(limits.actions ?? [])
  const interactive = limits.interactive ?? ''
  for (const node of surfaceElements(limits.scope)) {
    const hook = node.getAttribute('data-deeptail-action')
    if (hook === null) continue
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
 * heading inside itself, everything behind it leaves the tree, it holds focus,
 * it is seated where the reader can see and reach it, and it is dismissed on
 * Escape with focus handed back to whatever opened it. The shared frame is what
 * holds that contract in one place, and it marks what it builds, so a dialog or
 * a mask assembled anywhere else is a second contract — one that will be
 * missing whichever of those promises its author did not think of, and that no
 * rule engine reports while the one it *did* remember keeps axe quiet.
 *
 * Each promise is read here rather than left to the suite that drives the
 * frame: a name that resolves to nothing inside the dialog, focus left outside
 * an open modal, a sibling still able to take that focus, a frame seated past
 * the viewport, and an action the reader cannot see are all defects no rule
 * engine reports, and every one of them exists only while the dialog is open —
 * which is exactly when the page is measured.
 *
 * The mask is found by where it is drawn rather than by a colour: an element
 * laid out over the whole viewport, outside every product surface, that no
 * frame holding a marked dialog contains. A page may paint a mask — the shell
 * paints one behind its drawer — so the rule is not that masks are forbidden,
 * only that each one belongs to a root that owns it.
 * @param add - collects a finding.
 * @param limits - the product surfaces to read and what takes focus inside them.
 */
function checkDialogContract(add: Report, limits: ShellLimits): void {
  const marker = '[data-deeptail-dialog]'
  const roles = '[role="dialog"], [role="alertdialog"]'
  const dialogs = [...document.querySelectorAll(roles)]
  if (dialogs.length > 1) {
    add('dialog-contract', `the document holds ${String(dialogs.length)} dialogs at once; one frame is open at a time`)
  }
  const interactive = limits.interactive ?? ''
  const takesFocus = (node: Element): boolean =>
    interactive === '' || node.matches(interactive) || node.querySelector(interactive) !== null
  const onScreen = (box: PaintedBox): boolean =>
    box.right - box.left > 0 &&
    box.bottom - box.top > 0 &&
    box.top >= 0 &&
    box.left >= 0 &&
    box.bottom <= window.innerHeight &&
    box.right <= window.innerWidth
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
    const labelled = dialog.getAttribute('aria-labelledby')
    const named = (labelled ?? '').split(/\s+/u).some((id) => {
      const node = document.getElementById(id)
      return node !== null && dialog.contains(node) && (node.textContent ?? '').trim() !== ''
    })
    if (!named && (dialog.getAttribute('aria-label') ?? '').trim() === '') {
      add('dialog-contract', `${describe(dialog)} is a dialog no name inside it reaches`)
    }
    const held = document.activeElement
    if (held === null || !dialog.contains(held)) {
      add('dialog-contract', `${describe(dialog)} is open with focus left outside it`)
    }
    const frame = dialog.parentElement ?? dialog
    const behind = frame.parentElement
    if (behind !== null) {
      for (const sibling of behind.children) {
        if (sibling === frame) continue
        if (sibling instanceof HTMLElement && sibling.inert) continue
        if (!takesFocus(sibling)) continue
        add('dialog-contract', `${describe(dialog)} leaves ${describe(sibling)} able to take focus behind it`)
      }
    }
    if (!onScreen(drawnBox(dialog))) {
      add('dialog-contract', `${describe(dialog)} is not wholly on screen where the reader can reach it`)
    }
    for (const control of dialog.querySelectorAll('[data-deeptail-action]')) {
      if (!onScreen(drawnBox(control))) {
        add('dialog-contract', `${describe(control)} is an action off screen inside the open dialog`)
      }
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
