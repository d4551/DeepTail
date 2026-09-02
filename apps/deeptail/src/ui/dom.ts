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
  /**
   * `aria-busy`, for a region whose content is being replaced.
   *
   * Written as the literal string ARIA defines. `toggleAttribute` produces
   * `aria-busy=""`, which is not one of the enumerated values and maps back to
   * the default — so a dialog that flipped it that way announced nothing at all
   * while its request was in flight.
   */
  readonly busy?: 'true' | 'false'
  /** `aria-describedby`, naming the element that explains a control's state. */
  readonly describedby?: string
  /** `aria-labelledby`, naming the element whose text names this one. */
  readonly labelledby?: string
  /** `aria-invalid`, for a control whose value was refused. */
  readonly invalid?: 'true' | 'false'
  /** `aria-current`, for the one item in a set the view is showing. */
  readonly current?: 'true' | 'false'
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
  setAria(node, options.aria ?? {})
  for (const [name, value] of Object.entries(options.data ?? {})) node.dataset[name] = value
  return node
}

/**
 * Write the accessible state an element was asked for.
 *
 * Exported because state changes after a control is built — a request going
 * in flight, a value being refused, a menu opening — must be written the same
 * way as the state it was created with. A surface reaching for `setAttribute`
 * itself is how `aria-busy=""` and a missing `aria-live` both got shipped.
 * @param node - the element to write to.
 * @param aria - the state to write.
 */
export function setAria(node: Element, aria: AriaOptions): void {
  if (aria.label !== undefined) node.setAttribute('aria-label', aria.label)
  if (aria.hidden !== undefined) node.setAttribute('aria-hidden', aria.hidden)
  if (aria.checked !== undefined) node.setAttribute('aria-checked', aria.checked)
  if (aria.expanded !== undefined) node.setAttribute('aria-expanded', aria.expanded)
  if (aria.modal !== undefined) node.setAttribute('aria-modal', aria.modal)
  if (aria.haspopup !== undefined) node.setAttribute('aria-haspopup', aria.haspopup)
  if (aria.controls !== undefined) node.setAttribute('aria-controls', aria.controls)
  if (aria.live !== undefined) node.setAttribute('aria-live', aria.live)
  if (aria.busy !== undefined) node.setAttribute('aria-busy', aria.busy)
  if (aria.describedby !== undefined) node.setAttribute('aria-describedby', aria.describedby)
  if (aria.labelledby !== undefined) node.setAttribute('aria-labelledby', aria.labelledby)
  if (aria.invalid !== undefined) node.setAttribute('aria-invalid', aria.invalid)
  if (aria.current !== undefined) node.setAttribute('aria-current', aria.current)
}

/**
 * Create a button, which is always explicitly typed so it never submits a form
 * it happens to sit inside.
 *
 * Every button in the product is built here, so the explicit `type` and the
 * click binding are written once. The options carry the role, accessible state
 * and data attributes a caller would otherwise reach for `el` to set, which is
 * what nine call sites were doing by hand.
 * @param className - the button's classes.
 * @param text - its visible label.
 * @param onClick - its activation handler.
 * @param options - role, accessible state and data attributes.
 * @returns the button.
 */
export function button(
  className: string,
  text: string,
  onClick: () => void,
  options: Omit<ElementOptions, 'className' | 'text'> = {},
): HTMLButtonElement {
  const node = el('button', { ...options, className, text })
  node.type = 'button'
  node.addEventListener('click', onClick)
  return node
}

/** What a form's actions row needs to know about the attempt in flight. */
export interface FormActionOptions {
  /** The cancel button's visible label. */
  readonly cancelText: string
  /** The submit button's visible label. */
  readonly submitText: string
  /** The submit's `data-deeptail-action`, which the suites drive it by. */
  readonly submitAction: string
  /** Whether an attempt is in flight, which disables both. */
  readonly busy: boolean
  /** What cancelling does. */
  cancel(): void
}

/**
 * A form's cancel and submit, both disabled while an attempt is in flight so a
 * second submission cannot race the first.
 *
 * The submit is a real submit button rather than a click handler, so the form's
 * own `submit` event is what runs and Enter in a field works. Both forms in the
 * picker held a copy of this that differed only in two strings.
 * @param options - the labels, the action name, and what cancelling does.
 * @returns the actions row.
 */
export function formActions(options: FormActionOptions): HTMLElement {
  const cancel = button('button button-outline', options.cancelText, options.cancel)
  cancel.disabled = options.busy
  const submit = el('button', { className: 'button button-primary', text: options.submitText })
  submit.type = 'submit'
  submit.disabled = options.busy
  submit.dataset.deeptailAction = options.submitAction
  const actions = el('div', { className: 'actions' })
  actions.append(cancel, submit)
  return actions
}

/**
 * A region whose text is announced when it changes.
 *
 * Every surface that speaks a transition speaks it through one of these, so the
 * role and the politeness are decided once rather than per surface.
 * @param className - the region's classes.
 * @returns the region.
 */
export function liveRegion(className = 'visually-hidden'): HTMLElement {
  return el('div', { className, role: 'status', aria: { live: 'polite' } })
}

/**
 * A control with its own label above it.
 *
 * The three forms in the product built this by hand and drifted; the label
 * element is what names the control, so it is built in one place.
 * @param labelText - the visible label.
 * @param control - the control being labelled.
 * @returns the label element wrapping both.
 */
export function labelledField(labelText: string, control: HTMLElement): HTMLLabelElement {
  const field = el('label', { className: 'field' })
  field.append(el('span', { className: 'label', text: labelText }), control)
  return field
}

/**
 * A labelled control that records what is typed into it.
 *
 * The forms carry a draft across re-renders so a refusal never discards a
 * paste, which means every field does the same three things: seed the control
 * from the draft, label it, and write each keystroke back. Built by hand in
 * each form, those three drifted — the pairing and tailnet forms held
 * byte-identical copies of it.
 * @param labelText - the visible label.
 * @param control - the control being labelled.
 * @param initial - what the control starts holding.
 * @param onInput - where each keystroke is recorded.
 * @returns the label element wrapping both.
 */
export function draftField(
  labelText: string,
  control: HTMLInputElement,
  initial: string,
  onInput: (value: string) => void,
): HTMLLabelElement {
  control.value = initial
  control.addEventListener('input', () => {
    onInput(control.value)
  })
  return labelledField(labelText, control)
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
