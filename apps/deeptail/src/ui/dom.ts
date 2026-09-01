/**
 * DOM helpers shared by every DeepTail surface.
 *
 * Elements are built directly — this code paints before any harness bundle
 * loads — using `textContent` never `innerHTML`, so a host label or error
 * message can never be markup.
 *
 * @module
 */

/**
 * The accessible state an element is created with.
 *
 * These are the only attributes any surface sets through this factory. Naming
 * them one by one is what lets every `setAttribute` below carry a literal, so
 * the inline-style gate can read every attribute this product writes — a bag
 * of free-form names would be a hole in it, and a route by which any caller
 * could set any attribute at all.
 */
interface AriaOptions {
  /** `aria-label`, for a region or control whose name is not its text. */
  readonly label?: string
  /** `aria-hidden`, for decoration that duplicates adjacent text. */
  readonly hidden?: 'true'
  /** `aria-checked`, for one choice within a set. */
  readonly checked?: 'true' | 'false'
  /** `aria-expanded`, for a control that discloses something. */
  readonly expanded?: 'true' | 'false'
  /** `aria-modal`, for a dialog that holds focus. */
  readonly modal?: 'true'
  /** `aria-haspopup`, naming what a trigger opens. */
  readonly haspopup?: 'menu' | 'dialog'
  /** `aria-controls`, naming the element a control governs. */
  readonly controls?: string
  /** `aria-live`, for a region whose changes are announced. */
  readonly live?: 'polite' | 'assertive'
}

/** What an element may be created with. */
export interface ElementOptions {
  readonly className?: string
  readonly text?: string
  /** The element's ARIA role. */
  readonly role?: string
  /** The element's accessible state. */
  readonly aria?: AriaOptions
  readonly data?: Readonly<Record<string, string>>
}

/**
 * Create an element.
 * @param tag - the tag name.
 * @param options - class, text, role, accessible state and data attributes.
 * @returns the element.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (options.className !== undefined) node.className = options.className
  if (options.text !== undefined) node.textContent = options.text
  if (options.role !== undefined) node.setAttribute('role', options.role)
  applyAria(node, options.aria ?? {})
  for (const [name, value] of Object.entries(options.data ?? {})) node.dataset[name] = value
  return node
}

/**
 * Write the accessible state an element was asked for.
 * @param node - the element being built.
 * @param aria - the state to write.
 */
function applyAria(node: Element, aria: AriaOptions): void {
  if (aria.label !== undefined) node.setAttribute('aria-label', aria.label)
  if (aria.hidden !== undefined) node.setAttribute('aria-hidden', aria.hidden)
  if (aria.checked !== undefined) node.setAttribute('aria-checked', aria.checked)
  if (aria.expanded !== undefined) node.setAttribute('aria-expanded', aria.expanded)
  if (aria.modal !== undefined) node.setAttribute('aria-modal', aria.modal)
  if (aria.haspopup !== undefined) node.setAttribute('aria-haspopup', aria.haspopup)
  if (aria.controls !== undefined) node.setAttribute('aria-controls', aria.controls)
  if (aria.live !== undefined) node.setAttribute('aria-live', aria.live)
}

/**
 * Create a button, which is always explicitly typed so it never submits a form
 * it happens to sit inside.
 * @param className - the button's classes.
 * @param text - its label.
 * @param onClick - its activation handler.
 * @returns the button.
 */
export function button(className: string, text: string, onClick: () => void): HTMLButtonElement {
  const node = el('button', { className, text })
  node.type = 'button'
  node.addEventListener('click', onClick)
  return node
}

/**
 * Text that only assistive technology reads, paired with an `aria-hidden`
 * graphic so a status is never conveyed by colour alone.
 * @param text - the announced text.
 * @returns the span.
 */
export function screenReaderText(text: string): HTMLSpanElement {
  return el('span', { className: 'visually-hidden', text })
}

/**
 * The row a navigation key moves to.
 * @param key - the pressed key.
 * @param index - the current row.
 * @param length - how many rows there are.
 * @returns the target row, or undefined when the key is not a navigation key.
 */
function nextIndex(key: string, index: number, length: number): number | undefined {
  if (length === 0) return undefined
  switch (key) {
    case 'ArrowDown':
      return (index + 1) % length
    case 'ArrowUp':
      return (index - 1 + length) % length
    case 'Home':
      return 0
    case 'End':
      return length - 1
    default:
      return undefined
  }
}

/**
 * Give a set of controls one roving tab stop.
 *
 * The first control carries the page's tab stop and the rest are reached with
 * the arrow keys, so a list of a hundred rows is one stop rather than a
 * hundred. Every list that does this does it the same way, from here.
 * @param stops - every control in display order.
 */
export function bindRovingFocus(stops: readonly HTMLElement[]): void {
  for (const [index, stop] of stops.entries()) {
    stop.tabIndex = index === 0 ? 0 : -1
    stop.addEventListener('keydown', (event) => {
      moveRovingFocus(event, stops, index)
    })
  }
}

/**
 * Move a roving tab stop between rows.
 * @param event - the keydown.
 * @param rows - every row in display order.
 * @param index - the row the event came from.
 */
function moveRovingFocus(event: KeyboardEvent, rows: readonly HTMLElement[], index: number): void {
  if (event.target !== event.currentTarget) return
  const target = nextIndex(event.key, index, rows.length)
  if (target === undefined) return
  event.preventDefault()
  for (const row of rows) row.tabIndex = -1
  const next = rows[target]
  if (next === undefined) return
  next.tabIndex = 0
  next.focus()
}
