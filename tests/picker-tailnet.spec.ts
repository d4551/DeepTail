/**
 * The tailnet connect form, driven control by control.
 *
 * The form is the door to a paired tailnet, and everything it does is
 * observable without a host: which credential it collects, what it trims and
 * what it refuses to submit, what it disables while an attempt is in flight,
 * and what it points a screen reader at when the credential is refused. The
 * native side is reached only after the form has already decided all of that.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { createTranslate } from '../apps/deeptail/src/locales.ts'
import {
  credentialOf,
  draftIsComplete,
  EMPTY_TAILNET_DRAFT,
  type TailnetConnectState,
  type TailnetDraft,
  tailnetConnectView,
} from '../apps/deeptail/src/picker-tailnet.ts'
import { resetDocument } from './dom.ts'

/** The copy source the form is built with. */
const t = createTranslate('en')

/** What the double recorded of one form action. */
interface Actions {
  submitted: TailnetDraft[]
  cancelled: number
  switched: TailnetDraft[]
}

/**
 * The form context, recording every action the controls invoke.
 * @param current - the state to render.
 * @returns the context, and what was recorded.
 */
function contextDouble(current: TailnetConnectState): {
  ctx: Parameters<typeof tailnetConnectView>[0]
  actions: Actions
} {
  const actions: Actions = { submitted: [], cancelled: 0, switched: [] }
  return {
    ctx: {
      t,
      states: new Map(),
      current,
      submit: (_listed, draft) => {
        actions.submitted.push(draft)
      },
      cancel: () => {
        actions.cancelled += 1
      },
      switchKind: (_listed, draft) => {
        actions.switched.push(draft)
      },
    },
    actions,
  }
}

/** The state the form opens on. */
const OPEN: TailnetConnectState = { hosts: [], busy: false, draft: EMPTY_TAILNET_DRAFT }

/**
 * The form the view builds, narrowed to the element type it really is.
 * @param built - what the view returned.
 * @returns the form.
 */
function formOf(built: readonly HTMLElement[]): HTMLFormElement {
  const [form] = built
  if (!(form instanceof HTMLFormElement)) throw new Error('the view did not build a form')
  return form
}

/** The one field the API-key form carries, found by its data hook. */
function fieldOf(form: HTMLFormElement, field: string): HTMLInputElement {
  const input = form.querySelector<HTMLInputElement>(`[data-deeptail-field="${field}"]`)
  if (input === null) throw new Error(`the form carries no ${field} field`)
  return input
}

beforeEach(() => {
  resetDocument()
})

describe('reading a typed draft as a credential', () => {
  it('trims the key an API key carries', () => {
    expect(credentialOf({ ...EMPTY_TAILNET_DRAFT, key: '  tskey-1  ' })).toEqual({ kind: 'apiKey', key: 'tskey-1' })
  })

  it('trims both halves of an OAuth client', () => {
    expect(
      credentialOf({ ...EMPTY_TAILNET_DRAFT, kind: 'oauthClient', clientId: ' id ', clientSecret: ' secret ' }),
    ).toEqual({ kind: 'oauthClient', clientId: 'id', clientSecret: 'secret' })
  })
})

describe('whether a draft carries every value its kind needs', () => {
  it('asks an API key for the key alone', () => {
    expect(draftIsComplete({ ...EMPTY_TAILNET_DRAFT, key: 'tskey-1' })).toBe(true)
    expect(draftIsComplete(EMPTY_TAILNET_DRAFT)).toBe(false)
  })

  it('asks an OAuth client for both halves, and neither alone answers', () => {
    const both = { ...EMPTY_TAILNET_DRAFT, kind: 'oauthClient' as const, clientId: 'id', clientSecret: 'secret' }
    expect(draftIsComplete(both)).toBe(true)
    expect(draftIsComplete({ ...both, clientSecret: '' })).toBe(false)
    expect(draftIsComplete({ ...both, clientId: '' })).toBe(false)
  })

  it('counts surrounding space as nothing, because the credential is trimmed', () => {
    expect(draftIsComplete({ ...EMPTY_TAILNET_DRAFT, key: '   ' })).toBe(false)
  })
})

describe('the controls the connect form lays out', () => {
  it('marks itself for the suites and keeps the browser’s own bubbles off', () => {
    const { ctx } = contextDouble(OPEN)
    const form = formOf(tailnetConnectView(ctx))
    expect(form.dataset['deeptailView']).toBe('tailnet-connect')
    expect(form.noValidate).toBe(true)
  })

  it('offers the two credential kinds as radios, with the draft’s kind checked', () => {
    const { ctx } = contextDouble(OPEN)
    const form = formOf(tailnetConnectView(ctx))
    const radios = form.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    expect(radios.length).toBe(2)
    expect(radios[0]?.value).toBe('apiKey')
    expect(radios[0]?.checked).toBe(true)
    expect(radios[1]?.value).toBe('oauthClient')
    expect(radios[1]?.checked).toBe(false)
  })

  it('carries one password field for an API key, seeded from the draft', () => {
    const { ctx } = contextDouble({ ...OPEN, draft: { ...EMPTY_TAILNET_DRAFT, key: 'tskey-9' } })
    const form = formOf(tailnetConnectView(ctx))
    const key = fieldOf(form, 'api-key')
    expect(key.type).toBe('password')
    expect(key.autocomplete).toBe('off')
    expect(key.value).toBe('tskey-9')
    expect(form.querySelector('[data-deeptail-field="client-id"]')).toBeNull()
  })

  it('carries a text client id and a password secret for an OAuth client', () => {
    const { ctx } = contextDouble({ ...OPEN, draft: { ...EMPTY_TAILNET_DRAFT, kind: 'oauthClient' } })
    const form = formOf(tailnetConnectView(ctx))
    expect(fieldOf(form, 'client-id').type).toBe('text')
    expect(fieldOf(form, 'client-secret').type).toBe('password')
    expect(form.querySelector('[data-deeptail-field="api-key"]')).toBeNull()
  })

  it('carries the optional tailnet name, seeded from the draft', () => {
    const { ctx } = contextDouble({ ...OPEN, draft: { ...EMPTY_TAILNET_DRAFT, tailnet: 'example.ts.net' } })
    const form = formOf(tailnetConnectView(ctx))
    expect(fieldOf(form, 'tailnet').value).toBe('example.ts.net')
  })
})

describe('what the connect form does', () => {
  it('switches kind when the other radio is chosen', () => {
    const { ctx, actions } = contextDouble(OPEN)
    const form = formOf(tailnetConnectView(ctx))
    const oauth = fieldOf(form, 'kind-oauthClient')
    oauth.checked = true
    oauth.dispatchEvent(new Event('change'))
    expect(actions.switched.length).toBe(1)
    expect(actions.switched[0]?.kind).toBe('oauthClient')
  })

  it('writes each keystroke into the draft the submit receives', () => {
    const { ctx, actions } = contextDouble(OPEN)
    const form = formOf(tailnetConnectView(ctx))
    const key = fieldOf(form, 'api-key')
    key.value = 'tskey-2'
    key.dispatchEvent(new Event('input'))
    form.dispatchEvent(new Event('submit'))
    expect(actions.submitted.length).toBe(1)
    expect(actions.submitted[0]?.key).toBe('tskey-2')
  })

  it('writes both OAuth halves into the draft the submit receives', () => {
    const { ctx, actions } = contextDouble({ ...OPEN, draft: { ...EMPTY_TAILNET_DRAFT, kind: 'oauthClient' } })
    const form = formOf(tailnetConnectView(ctx))
    const id = fieldOf(form, 'client-id')
    id.value = 'client-9'
    id.dispatchEvent(new Event('input'))
    const secret = fieldOf(form, 'client-secret')
    secret.value = 'secret-9'
    secret.dispatchEvent(new Event('input'))
    form.dispatchEvent(new Event('submit'))
    expect(actions.submitted.length).toBe(1)
    expect(actions.submitted[0]?.clientId).toBe('client-9')
    expect(actions.submitted[0]?.clientSecret).toBe('secret-9')
  })

  it('writes the tailnet name back the same way', () => {
    const { ctx, actions } = contextDouble(OPEN)
    const form = formOf(tailnetConnectView(ctx))
    const tailnet = fieldOf(form, 'tailnet')
    tailnet.value = 'other.ts.net'
    tailnet.dispatchEvent(new Event('input'))
    form.dispatchEvent(new Event('submit'))
    expect(actions.submitted[0]?.tailnet).toBe('other.ts.net')
  })
})

describe('the form’s edges', () => {
  it('submits through the form’s own event, which Enter in a field also fires', () => {
    const { ctx, actions } = contextDouble(OPEN)
    const form = formOf(tailnetConnectView(ctx))
    form.dispatchEvent(new Event('submit'))
    expect(actions.submitted.length).toBe(1)
  })

  it('returns to the roster when the viewer cancels', () => {
    const { ctx, actions } = contextDouble(OPEN)
    const form = formOf(tailnetConnectView(ctx))
    const cancel = form.querySelector<HTMLButtonElement>('button[type="button"]')
    cancel?.click()
    expect(actions.cancelled).toBe(1)
  })

  it('disables both actions while an attempt is in flight', () => {
    const { ctx } = contextDouble({ ...OPEN, busy: true })
    const form = formOf(tailnetConnectView(ctx))
    const buttons = form.querySelectorAll<HTMLButtonElement>('button')
    expect([...buttons].map((node) => node.disabled)).toEqual([true, true])
    const radio = form.querySelector<HTMLInputElement>('input[type="radio"]')
    expect(radio?.disabled).toBe(true)
  })
})

describe('a refused credential', () => {
  it('mounts the refusal strip, fills it, and points the first field at it', () => {
    const { ctx } = contextDouble({ ...OPEN, error: 'the token was refused' })
    const form = formOf(tailnetConnectView(ctx))
    const strip = form.querySelector('[data-deeptail-state="tailnet-error"]')
    expect(strip?.id).toBe('deeptail-tailnet-error')
    expect(strip?.textContent).toBe('the token was refused')
    const first = fieldOf(form, 'api-key')
    expect(first.getAttribute('aria-invalid')).toBe('true')
    expect(first.getAttribute('aria-describedby')).toBe('deeptail-tailnet-error')
  })

  it('names the field the form actually carries, whichever kind it collects', () => {
    const { ctx } = contextDouble({ ...OPEN, error: 'refused' })
    const form = formOf(tailnetConnectView(ctx))
    expect(form.querySelector('[aria-describedby="deeptail-tailnet-error"]')).not.toBeNull()
  })
})
