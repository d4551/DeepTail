/**
 * The pairing form, the one picker view a viewer types into.
 *
 * The form owns nothing: what has been typed, what is in flight and what was
 * refused all arrive as state and go back out through its callbacks, so a
 * rejected attempt can be redrawn with the paste still in place.
 *
 * @module
 */

import type { HostRecord } from './host.ts'
import type { Translate } from './locales.ts'
import type { PickerContext } from './picker-views.ts'
import { el } from './ui/dom.ts'

/** What a viewer has typed into the pairing form. */
export interface PairDraft {
  /** The pairing link, pasted whole. */
  readonly link: string
  /** The name the host is listed under. */
  readonly label: string
}

/** The pairing form's state, independent of how the picker got into it. */
export interface PairingState {
  /** The roster to return to when pairing is abandoned. */
  readonly hosts: readonly HostRecord[]
  /** Why the last attempt was refused; absent until one is. */
  readonly error?: string
  /** Whether an attempt is in flight, which disables both actions. */
  readonly busy: boolean
  /** What the viewer has typed, carried across re-renders so a failure never discards it. */
  readonly draft: PairDraft
}

/** What the pairing form needs beyond {@link PickerContext}. */
interface PairContext extends PickerContext {
  /** The form state driving this render. */
  readonly current: PairingState
  /** Called with the typed draft when the form is submitted. */
  submit(hosts: readonly HostRecord[], draft: PairDraft): void
  /** Called when the viewer abandons pairing. */
  cancel(hosts: readonly HostRecord[]): void
}

/** The draft while it is being typed, which every field writes into. */
interface EditableDraft {
  link: string
  label: string
}

/**
 * One labeled input in the pairing form.
 * @param label - the visible label.
 * @param input - the control it labels.
 * @param initial - what the control starts holding.
 * @param onInput - where each keystroke is recorded.
 * @returns the field.
 */
function pairField(
  label: string,
  input: HTMLInputElement,
  initial: string,
  onInput: (value: string) => void,
): HTMLElement {
  const field = el('label', { className: 'field' })
  field.append(el('span', { className: 'label', text: label }))
  input.value = initial
  input.addEventListener('input', () => {
    onInput(input.value)
  })
  field.append(input)
  return field
}

/**
 * The link and name fields, each recording straight into the draft so a
 * refusal can hand back everything that was typed.
 * @param t - copy source.
 * @param current - the form state, carrying what is already typed.
 * @param draft - the draft the fields write into.
 * @returns the fields, link first.
 */
function pairFields(t: Translate, current: PairingState, draft: EditableDraft): HTMLElement[] {
  const link = el('input', { className: 'input' })
  link.type = 'url'
  link.placeholder = t('pair.linkPlaceholder')
  link.dataset.deeptailField = 'link'

  const name = el('input', { className: 'input' })
  name.type = 'text'
  name.placeholder = t('pair.namePlaceholder')
  name.dataset.deeptailField = 'name'

  return [
    pairField(t('pair.linkLabel'), link, current.draft.link, (value) => {
      draft.link = value
    }),
    pairField(t('pair.nameLabel'), name, current.draft.label, (value) => {
      draft.label = value
    }),
  ]
}

/**
 * The strip reporting a refused attempt, above the actions that retry it.
 * @param message - why the attempt was refused.
 * @returns the strip.
 */
function pairErrorStrip(message: string): HTMLElement {
  const strip = el('div', { className: 'error', text: message })
  strip.dataset.deeptailState = 'pair-error'
  strip.setAttribute('role', 'alert')
  return strip
}

/**
 * The form's cancel and submit, both disabled while an attempt is in flight so
 * a second submission cannot race the first.
 * @param ctx - the form state and what its controls invoke.
 * @returns the actions row.
 */
function pairActions(ctx: PairContext): HTMLElement {
  const { t, current } = ctx
  const cancel = el('button', { className: 'button button-outline', text: t('action.cancel') })
  cancel.type = 'button'
  cancel.disabled = current.busy
  cancel.addEventListener('click', () => {
    ctx.cancel(current.hosts)
  })
  const submit = el('button', { className: 'button button-primary', text: t('action.pair') })
  submit.type = 'submit'
  submit.disabled = current.busy
  submit.dataset.deeptailAction = 'pair-submit'
  const actions = el('div', { className: 'actions' })
  actions.append(cancel, submit)
  return actions
}

/**
 * The pairing form: link, name, and the cancel/submit actions.
 * @param ctx - the form state and what its controls invoke.
 * @returns the form.
 */
export function pairView(ctx: PairContext): HTMLElement[] {
  const { t, current } = ctx
  const draft: EditableDraft = { link: current.draft.link, label: current.draft.label }
  const form = el('form')
  form.append(el('p', { className: 'lede', text: t('pair.title') }), ...pairFields(t, current, draft))
  if (current.error !== undefined) form.append(pairErrorStrip(current.error))
  form.append(pairActions(ctx))
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    ctx.submit(current.hosts, draft)
  })
  return [form]
}
