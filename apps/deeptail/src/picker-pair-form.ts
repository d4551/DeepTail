/**
 * The pairing form, the one picker view a viewer types into.
 *
 * The form owns nothing: what has been typed, what is in flight and what was
 * refused all arrive as state and go back out through its callbacks, so a
 * rejected attempt can be redrawn with the paste still in place.
 *
 * @module
 */

import { ACTIONS } from './actions/registry.ts'
import type { HostRecord } from './host.ts'
import type { Translate } from './locales.ts'
import type { PickerContext } from './picker-views.ts'
import { draftField, el, formActions, setAria } from './ui/dom.ts'
import { errorStrip, showFailure } from './ui/states.ts'

/** What a viewer has typed into the pairing form. */
export interface PairDraft {
  /**
   * The pairing link.
   *
   * Pasted whole on the link path. On the tailnet path the origin is already
   * known and this carries the launch token alone, which the picker composes
   * into a link — the field a viewer fills is the only thing they were ever
   * able to supply.
   */
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
  /**
   * The origin this form is pairing against, when it was reached from the
   * tailnet rather than from a pasted link.
   *
   * Present means the machine is already chosen: the form asks for the token
   * that machine printed instead of a whole URL, because a viewer arriving this
   * way has no URL to paste and typing one would be a second chance to get the
   * host wrong.
   */
  readonly origin?: string
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

/** The id the refusal strip carries, which the link field points at. */
const PAIR_ERROR_ID = 'deeptail-pair-error'

/** The draft while it is being typed, which every field writes into. */
interface EditableDraft {
  link: string
  label: string
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
  if (current.origin !== undefined) return tokenFields(t, current, draft)
  const link = el('input', { className: 'input' })
  // Typed `url`, so a phone offers the right keyboard — but validated by the
  // product, not by the browser: a native bubble is untranslated, unstyled, and
  // stops the submit before the form's own `role="alert"` strip ever fills.
  link.type = 'url'
  link.placeholder = t('pair.linkPlaceholder')
  link.dataset.deeptailField = 'link'

  const name = el('input', { className: 'input' })
  name.type = 'text'
  name.placeholder = t('pair.namePlaceholder')
  name.dataset.deeptailField = 'name'

  return [
    draftField(t('pair.linkLabel'), link, current.draft.link, (value) => {
      draft.link = value
    }),
    draftField(t('pair.nameLabel'), name, current.draft.label, (value) => {
      draft.label = value
    }),
  ]
}

/**
 * The token and name fields, for a machine already chosen from the tailnet.
 *
 * The origin is not offered as a field: it came from Tailscale and went through
 * the native side's own admission check, so there is nothing here for a viewer
 * to correct and every reason not to invite them to.
 * @param t - copy source.
 * @param current - the form state, carrying the chosen machine's name.
 * @param draft - the draft the fields write into.
 * @returns the fields, token first.
 */
function tokenFields(t: Translate, current: PairingState, draft: EditableDraft): HTMLElement[] {
  const token = el('input', { className: 'input' })
  token.type = 'text'
  token.autocomplete = 'off'
  token.spellcheck = false
  token.placeholder = t('tailnet.tokenPlaceholder')
  token.dataset.deeptailField = 'link'

  const name = el('input', { className: 'input' })
  name.type = 'text'
  name.placeholder = t('pair.namePlaceholder')
  name.dataset.deeptailField = 'name'

  return [
    draftField(t('tailnet.tokenLabel', { label: current.draft.label }), token, current.draft.link, (value) => {
      draft.link = value
    }),
    draftField(t('pair.nameLabel'), name, current.draft.label, (value) => {
      draft.label = value
    }),
  ]
}

/**
 * The strip reporting a refused attempt, above the actions that retry it.
 *
 * Built empty. A live region fires on the insertion of its text, and text put
 * into a node that is not yet in the document is inserted outside the
 * accessibility tree — so the caller mounts it first and fills it after, which
 * is what every other surface here does.
 * @returns the empty, hidden strip.
 */
function pairErrorStrip(): HTMLElement {
  const strip = errorStrip('pair-error')
  strip.id = PAIR_ERROR_ID
  return strip
}

/**
 * The pairing form: link, name, and the cancel/submit actions.
 * @param ctx - the form state and what its controls invoke.
 * @returns the form.
 */
export function pairView(ctx: PairContext): HTMLElement[] {
  const { t, current } = ctx
  const draft: EditableDraft = { link: current.draft.link, label: current.draft.label }
  const form = el('form', { className: 'form' })
  // The browser's own constraint validation is turned off: it refuses the
  // submit itself, with a message this product neither wrote nor translated,
  // and the form's own refusal path is never reached.
  form.noValidate = true
  const fields = pairFields(t, current, draft)
  // The form's subject line reads as a heading and is marked up as one, so the
  // card has a heading under its wordmark rather than a paragraph doing the job.
  const title = current.origin === undefined ? t('pair.title') : t('tailnet.pairTitle', { label: current.draft.label })
  form.append(el('h2', { className: 'lede', text: title }), ...fields)
  if (current.error !== undefined) {
    const strip = pairErrorStrip()
    form.append(strip)
    showFailure(strip, current.error)
    // Named only while the strip is on the page: a reference to an element
    // that is not there is a promise to a reader that cannot be kept.
    const link = form.querySelector<HTMLInputElement>('[data-deeptail-field="link"]')
    if (link !== null) setAria(link, { invalid: 'true', describedby: PAIR_ERROR_ID })
  }
  form.append(
    formActions({
      cancelText: t('action.cancel'),
      submitText: t('action.pair'),
      submitAction: ACTIONS['picker.pair'].marker,
      busy: current.busy,
      cancel: () => {
        ctx.cancel(current.hosts)
      },
    }),
  )
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    ctx.submit(current.hosts, draft)
  })
  return [form]
}
