/**
 * Planting a probe element in a live page.
 *
 * The planted-defect suite builds a page that conforms, seats one shape at a
 * time that does not, and reads what the in-page checks report before and after
 * the shape is dropped. What it seats is always the same kind of thing — one
 * element carrying one product hook — so the seating is stated once here and
 * each case contributes only the hook it is about.
 *
 * Every hook is a named field of `Probe` rather than a map of attribute names
 * to values, so the attribute names are written as literals. A map would put the
 * name behind a variable, which the repository's inline-style gate reads as an
 * attribute write it cannot see — and rightly: a name reached through a variable
 * is one no reader can follow to the attribute it sets.
 *
 * @module
 */

import type { Page } from 'playwright'

/** One element to plant, and the hooks the case is about. */
export interface Probe {
  /** The element's `data-deeptail-probe` id, which is also how it is dropped. */
  readonly probe: string
  /** The tag to create, `button` by default. */
  readonly tag?: string
  /** Whether the probe seats in the shell root or in its main pane. */
  readonly into?: 'shell' | 'main'
  /** Sets `data-deeptail-shell`, as a second shell root. */
  readonly shell?: true
  /** Sets `data-deeptail-picker`, as a second product surface. */
  readonly picker?: true
  /** Sets `data-deeptail-action`, to the action names written here. */
  readonly action?: string
  /** Sets the `hidden` attribute, so the control is present but not shown. */
  readonly hidden?: true
}

/**
 * Plant one probe element, with whatever hooks the case is about.
 *
 * The attributes are set one named field at a time rather than from a map: the
 * name is then a literal at the call, which is what makes the write readable to
 * every gate and to a person.
 * @param page - the page under test.
 * @param spec - what to create and where to seat it.
 */
export async function plantProbe(page: Page, spec: Probe): Promise<void> {
  await page.evaluate((args: Probe) => {
    const node = document.createElement(args.tag ?? 'button')
    node.dataset['deeptailProbe'] = args.probe
    if (args.shell === true) node.dataset['deeptailShell'] = ''
    if (args.picker === true) node.dataset['deeptailPicker'] = ''
    if (args.action !== undefined) node.dataset['deeptailAction'] = args.action
    if (args.hidden === true) node.hidden = true
    const root = '[data-deeptail-shell]'
    const where = args.into === 'shell' ? root : `${root} main`
    document.querySelector(where)?.append(node)
  }, spec)
}
