/**
 * Message a session.
 *
 * A dialog, not a chat pane: DeepTail sends into a session, it does not read
 * one. *Send* queues behind the current work; *Steer* interrupts the running
 * turn. Both map to `session.prompt`, which is unary.
 *
 * @module
 */

import type { HostApi } from '../api.ts'
import type { Translate } from '../locales.ts'
import { button, el } from './dom.ts'
import { openDialog } from './modal.ts'

/** What the sheet needs to send. */
export interface ComposeTarget {
  readonly api: HostApi
  readonly sessionId: string
  readonly title: string
}

/**
 * Open the compose sheet for one session.
 * @param target - where the message goes.
 * @param t - copy source.
 * @param announce - live-region announcer for the success case.
 */
export function openComposeSheet(target: ComposeTarget, t: Translate, announce: (text: string) => void): void {
  const dialog = openDialog(target.title, () => {})

  const textarea = el('textarea', { className: 'textarea', data: { deeptailField: 'message' } })
  textarea.placeholder = t('chat.placeholder')
  textarea.rows = 4
  dialog.body.append(textarea)

  const failure = el('div', {
    className: 'error',
    data: { deeptailState: 'compose-error' },
    attrs: { role: 'alert' },
  })
  failure.hidden = true
  dialog.body.append(failure)

  let busy = false

  const setBusy = (next: boolean): void => {
    busy = next
    textarea.disabled = next
    send.disabled = next
    steer.disabled = next
    cancel.disabled = next
    dialog.body.toggleAttribute('aria-busy', next)
  }

  const submit = (mode: 'queue' | 'steer'): void => {
    if (busy) return
    const text = textarea.value.trim()
    if (text === '') {
      failure.textContent = t('chat.messageRequired')
      failure.hidden = false
      textarea.focus()
      return
    }
    failure.hidden = true
    setBusy(true)
    void target.api
      .prompt(target.sessionId, text, mode)
      .then(() => {
        announce(t('chat.sent', { label: target.title }))
        dialog.close()
        return undefined
      })
      .catch((reason: unknown) => {
        // The draft is deliberately left intact: a failed send must not cost
        // the operator what they typed.
        const message = reason instanceof Error ? reason.message : String(reason)
        failure.textContent = t('chat.sendFailed', { message })
        failure.hidden = false
        setBusy(false)
        return undefined
      })
  }

  const cancel = button('button button-outline', t('action.cancel'), () => {
    dialog.close()
  })
  const steer = button('button button-outline', t('chat.steer'), () => {
    submit('steer')
  })
  const send = button('button button-primary', t('chat.send'), () => {
    submit('queue')
  })
  send.dataset.deeptailAction = 'compose-send'
  steer.dataset.deeptailAction = 'compose-steer'
  dialog.actions.append(cancel, steer, send)

  // Enter sends; Shift+Enter is a newline, as every composer in this product does.
  textarea.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    submit('queue')
  })

  textarea.focus()
}
