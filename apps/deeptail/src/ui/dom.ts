/**
 * DOM helpers shared by every DeepTail surface.
 *
 * Elements are built directly — this code paints before any harness bundle
 * loads — using `textContent` never `innerHTML`, so a host label or error
 * message can never be markup.
 *
 * @module
 */

/** Attributes an element may be created with. */
export interface ElementOptions {
  readonly className?: string
  readonly text?: string
  readonly attrs?: Readonly<Record<string, string>>
  readonly data?: Readonly<Record<string, string>>
}

/**
 * Create an element.
 * @param tag - the tag name.
 * @param options - class, text, attributes and data attributes.
 * @returns the element.
 */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: ElementOptions = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (options.className !== undefined) node.className = options.className
  if (options.text !== undefined) node.textContent = options.text
  for (const [name, value] of Object.entries(options.attrs ?? {})) node.setAttribute(name, value)
  for (const [name, value] of Object.entries(options.data ?? {})) node.dataset[name] = value
  return node
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
 * Move a roving tab stop between rows.
 * @param event - the keydown.
 * @param rows - every row in display order.
 * @param index - the row the event came from.
 * @returns true when the key was handled.
 */
export function moveRovingFocus(event: KeyboardEvent, rows: readonly HTMLElement[], index: number): boolean {
  if (event.target !== event.currentTarget) return false
  const target = nextIndex(event.key, index, rows.length)
  if (target === undefined) return false
  event.preventDefault()
  for (const row of rows) row.tabIndex = -1
  const next = rows[target]
  if (next === undefined) return true
  next.tabIndex = 0
  next.focus()
  return true
}
