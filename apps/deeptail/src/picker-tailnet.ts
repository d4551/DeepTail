/**
 * Connecting a tailnet: which credential, and the fields it needs.
 *
 * The machines it lists are drawn by `./picker-tailnet-list.ts`; this module is
 * only the door. Framework-free, in the same idiom as the views beside it: DOM
 * built directly, `textContent` never `innerHTML`, and state in, callbacks out.
 *
 * @module
 */

import type { HostRecord } from './host.ts'
import type { Translate } from './locales.ts'
import type { PickerContext } from './picker-views.ts'
import type { TailnetCredential } from './tailscale.ts'
import { draftField, el, formActions, setAria } from './ui/dom.ts'
import { errorStrip, showFailure } from './ui/states.ts'

/** The id the tailnet refusal strip carries, which the first field points at. */
const TAILNET_ERROR_ID = 'deeptail-tailnet-error'

/** Which credential the connect form is collecting. */
type CredentialKind = TailnetCredential['kind']

/** What a viewer has typed into the connect form. */
export interface TailnetDraft {
  /** Which credential the form is collecting. */
  readonly kind: CredentialKind
  /** The API key, when that is the kind. */
  readonly key: string
  /** The OAuth client id, when that is the kind. */
  readonly clientId: string
  /** The OAuth client secret, when that is the kind. */
  readonly clientSecret: string
  /** The tailnet to list; empty means the one the credential belongs to. */
  readonly tailnet: string
}

/** The connect form's state, independent of how the picker got into it. */
export interface TailnetConnectState {
  /** The roster to return to when connecting is abandoned. */
  readonly hosts: readonly HostRecord[]
  /** Why the last attempt was refused; absent until one is. */
  readonly error?: string
  /** Whether an attempt is in flight, which disables both actions. */
  readonly busy: boolean
  /** What the viewer has typed, carried across re-renders. */
  readonly draft: TailnetDraft
}

/** An empty draft, which is what the form opens on. */
export const EMPTY_TAILNET_DRAFT: TailnetDraft = {
  kind: 'apiKey',
  key: '',
  clientId: '',
  clientSecret: '',
  tailnet: '',
}

/** Read one typed draft as the credential the native side accepts. */
export function credentialOf(draft: TailnetDraft): TailnetCredential {
  return draft.kind === 'apiKey'
    ? { kind: 'apiKey', key: draft.key.trim() }
    : { kind: 'oauthClient', clientId: draft.clientId.trim(), clientSecret: draft.clientSecret.trim() }
}

/** Whether a draft carries every value its kind needs. */
export function draftIsComplete(draft: TailnetDraft): boolean {
  const credential = credentialOf(draft)
  return credential.kind === 'apiKey'
    ? credential.key !== ''
    : credential.clientId !== '' && credential.clientSecret !== ''
}

/** What the connect form needs beyond {@link PickerContext}. */
interface ConnectContext extends PickerContext {
  /** The form state driving this render. */
  readonly current: TailnetConnectState
  /** Called with the typed draft when the form is submitted. */
  submit(hosts: readonly HostRecord[], draft: TailnetDraft): void
  /** Called when the viewer abandons connecting. */
  cancel(hosts: readonly HostRecord[]): void
  /** Called when the viewer switches which credential to give. */
  switchKind(hosts: readonly HostRecord[], draft: TailnetDraft): void
}

/** The draft while it is being typed, which every field writes into. */
interface EditableTailnetDraft {
  kind: CredentialKind
  key: string
  clientId: string
  clientSecret: string
  tailnet: string
}

/**
 * A secret input: never autofilled, never spellchecked, never capitalised.
 * @param t - copy source.
 * @param placeholderKey - which placeholder to show.
 * @param field - the value this control carries, for the tests that drive it.
 * @returns the control.
 */
function secretInput(
  t: Translate,
  placeholderKey: 'tailnet.keyPlaceholder' | 'tailnet.secretPlaceholder',
  field: string,
): HTMLInputElement {
  const input = el('input', { className: 'input' })
  input.type = 'password'
  input.autocomplete = 'off'
  input.spellcheck = false
  input.placeholder = t(placeholderKey)
  input.dataset.deeptailField = field
  return input
}

/**
 * The two-way choice between an API key and an OAuth client.
 *
 * Radios rather than a select: there are two options, both need a sentence of
 * explanation, and a radio group reads that explanation out with the option it
 * belongs to.
 * @param ctx - the form state and what its controls invoke.
 * @param draft - the draft the choice writes into.
 * @returns the fieldset.
 */
function kindChoice(ctx: ConnectContext, draft: EditableTailnetDraft): HTMLElement {
  const { t, current } = ctx
  const group = el('fieldset', { className: 'field-group' })
  group.append(el('legend', { className: 'label', text: t('tailnet.kindLegend') }))
  const kinds: readonly { readonly kind: CredentialKind; readonly label: string }[] = [
    { kind: 'apiKey', label: t('tailnet.kindApiKey') },
    { kind: 'oauthClient', label: t('tailnet.kindOauth') },
  ]
  for (const option of kinds) {
    const row = el('label', { className: 'choice' })
    const radio = el('input', { className: 'radio' })
    radio.type = 'radio'
    radio.name = 'deeptail-tailnet-kind'
    radio.value = option.kind
    radio.checked = draft.kind === option.kind
    radio.disabled = current.busy
    radio.dataset.deeptailField = `kind-${option.kind}`
    radio.addEventListener('change', () => {
      if (!radio.checked) return
      ctx.switchKind(current.hosts, { ...draft, kind: option.kind })
    })
    row.append(radio, el('span', { className: 'choice-label', text: option.label }))
    group.append(row)
  }
  return group
}

/**
 * The credential fields for the kind the draft names.
 * @param ctx - the form state.
 * @param draft - the draft the fields write into.
 * @returns the fields, in reading order.
 */
function credentialFields(ctx: ConnectContext, draft: EditableTailnetDraft): HTMLElement[] {
  const { t, current } = ctx
  if (draft.kind === 'apiKey') {
    return [
      draftField(
        t('tailnet.keyLabel'),
        secretInput(t, 'tailnet.keyPlaceholder', 'api-key'),
        current.draft.key,
        (value) => {
          draft.key = value
        },
      ),
    ]
  }
  const id = el('input', { className: 'input' })
  id.type = 'text'
  id.autocomplete = 'off'
  id.spellcheck = false
  id.placeholder = t('tailnet.clientIdPlaceholder')
  id.dataset.deeptailField = 'client-id'
  return [
    draftField(t('tailnet.clientIdLabel'), id, current.draft.clientId, (value) => {
      draft.clientId = value
    }),
    draftField(
      t('tailnet.clientSecretLabel'),
      secretInput(t, 'tailnet.secretPlaceholder', 'client-secret'),
      current.draft.clientSecret,
      (value) => {
        draft.clientSecret = value
      },
    ),
  ]
}

/**
 * The optional tailnet name, which is the one field neither credential needs.
 * @param ctx - the form state.
 * @param draft - the draft the field writes into.
 * @returns the field.
 */
function tailnetNameField(ctx: ConnectContext, draft: EditableTailnetDraft): HTMLElement {
  const tailnet = el('input', { className: 'input' })
  tailnet.type = 'text'
  tailnet.autocomplete = 'off'
  tailnet.spellcheck = false
  tailnet.placeholder = ctx.t('tailnet.tailnetPlaceholder')
  tailnet.dataset.deeptailField = 'tailnet'
  return draftField(ctx.t('tailnet.tailnetLabel'), tailnet, ctx.current.draft.tailnet, (value) => {
    draft.tailnet = value
  })
}

/**
 * Mount the refusal and point the first credential field at it.
 *
 * Appended before it is filled: a live region fires on the insertion of its
 * text, and text put into a node that is not yet in the document is inserted
 * outside the accessibility tree. The field is named only while the strip is on
 * the page, because a reference to an element that is not there is a promise to
 * a reader that cannot be kept.
 * @param form - the form to mount it in.
 * @param message - what was refused.
 * @returns nothing.
 */
function reportRefusal(form: HTMLElement, message: string): void {
  const strip = errorStrip('tailnet-error')
  strip.id = TAILNET_ERROR_ID
  form.append(strip)
  showFailure(strip, message)
  const first = form.querySelector<HTMLInputElement>(
    '[data-deeptail-field="api-key"], [data-deeptail-field="client-id"]',
  )
  if (first !== null) setAria(first, { invalid: 'true', describedby: TAILNET_ERROR_ID })
}

/**
 * The connect form: which credential, its fields, the optional tailnet name,
 * and the cancel/submit actions.
 * @param ctx - the form state and what its controls invoke.
 * @returns the form.
 */
export function tailnetConnectView(ctx: ConnectContext): HTMLElement[] {
  const { t, current } = ctx
  const draft: EditableTailnetDraft = { ...current.draft }
  const form = el('form')
  // The browser's own constraint validation is turned off for the reason the
  // pairing form turns it off: a native bubble is untranslated and stops the
  // submit before this form's own strip is ever filled.
  form.noValidate = true
  form.dataset.deeptailView = 'tailnet-connect'
  form.append(
    el('h2', { className: 'lede', text: t('tailnet.connectTitle') }),
    el('p', { className: 'lede', text: t('tailnet.connectLede') }),
    kindChoice(ctx, draft),
    ...credentialFields(ctx, draft),
  )
  form.append(tailnetNameField(ctx, draft))
  if (current.error !== undefined) reportRefusal(form, current.error)
  form.append(
    formActions({
      cancelText: t('action.cancel'),
      submitText: t('tailnet.connect'),
      submitAction: 'tailnet-connect',
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
