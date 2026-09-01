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
import { type Dialog, openDialog } from './modal.ts'

/** What the sheet needs to send. */
export interface ComposeTarget {
  readonly api: HostApi
  readonly sessionId: string
  readonly title: string
}

/** How a prompt joins the session's work. */
type PromptMode = 'queue' | 'steer'

/** The sheet's editable surface. */
interface ComposeFields {
  /** The draft the operator types into. */
  readonly textarea: HTMLTextAreaElement
  /** The strip an empty draft or a failed send is written into. */
  readonly failure: HTMLElement
}

/** The sheet's footer, in the order the controls are laid out. */
interface ComposeActions {
  readonly cancel: HTMLButtonElement
  readonly steer: HTMLButtonElement
  readonly send: HTMLButtonElement
}

/** Where a send tells its outcome. */
interface ComposeReport {
  readonly dialog: Dialog
  readonly failure: HTMLElement
  readonly t: Translate
  readonly announce: (text: string) => void
  /** Hand the sheet back to the operator, draft and all, to try again. */
  readonly release: () => void
}

/**
 * Build the sheet's editable surface.
 *
 * The strip is an `alert` so a refusal is spoken the moment it appears, and it
 * starts hidden so it says nothing before there is anything to say.
 * @param t - copy source.
 * @returns the draft field and the strip its refusals go to.
 */
function buildComposeFields(t: Translate): ComposeFields {
  const textarea = el('textarea', { className: 'textarea', data: { deeptailField: 'message' } })
  textarea.placeholder = t('chat.placeholder')
  textarea.rows = 4

  const failure = el('div', {
    className: 'error',
    data: { deeptailState: 'compose-error' },
    attrs: { role: 'alert' },
  })
  failure.hidden = true

  return { textarea, failure }
}

/**
 * Build the sheet's footer.
 *
 * Steering interrupts the running turn while sending queues behind it, so the
 * two are separate controls rather than one control hiding a mode.
 * @param t - copy source.
 * @param dismiss - leave without sending.
 * @param submit - send the draft in the given mode.
 * @returns the three controls.
 */
function buildComposeActions(t: Translate, dismiss: () => void, submit: (mode: PromptMode) => void): ComposeActions {
  const cancel = button('button button-outline', t('action.cancel'), dismiss)
  const steer = button('button button-outline', t('chat.steer'), () => {
    submit('steer')
  })
  const send = button('button button-primary', t('chat.send'), () => {
    submit('queue')
  })
  send.dataset.deeptailAction = 'compose-send'
  steer.dataset.deeptailAction = 'compose-steer'
  return { cancel, steer, send }
}

/**
 * Report a send that never landed, wherever the operator can still see it.
 *
 * Escape closes the sheet at any time, including mid-flight, and reporting into
 * a detached node would lose the failure entirely, so a sheet that has already
 * gone is answered through the live region instead.
 * @param reason - whatever the call threw.
 * @param report - where the outcome is told.
 */
function reportSendFailure(reason: unknown, report: ComposeReport): void {
  const message = reason instanceof Error ? reason.message : String(reason)
  if (!report.dialog.isOpen()) {
    report.announce(report.t('chat.sendFailed', { message }))
    return
  }
  // The draft is deliberately left intact: a failed send must not cost the
  // operator what they typed.
  report.failure.textContent = report.t('chat.sendFailed', { message })
  report.failure.hidden = false
  report.release()
}

/**
 * Issue the prompt and report its outcome wherever the operator can see it.
 * @param target - where the message goes.
 * @param mode - queue behind the current work, or interrupt it.
 * @param text - the drafted message.
 * @param report - where the outcome is told.
 * @returns once the outcome has been reported.
 */
async function issuePrompt(
  target: ComposeTarget,
  mode: PromptMode,
  text: string,
  report: ComposeReport,
): Promise<void> {
  try {
    await target.api.prompt(target.sessionId, text, mode)
    // Closed first: the shell's live region sits inside the root this dialog
    // holds inert, and a mutation made while it is inert is never announced.
    report.dialog.close()
    report.announce(report.t('chat.sent', { label: target.title }))
  } catch (reason) {
    reportSendFailure(reason, report)
  }
}

/**
 * Send on Enter and keep Shift+Enter a newline, as every composer in this
 * product does.
 * @param textarea - the draft field.
 * @param send - what a bare Enter triggers.
 */
function sendOnEnter(textarea: HTMLTextAreaElement, send: () => void): void {
  textarea.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' || event.shiftKey) return
    event.preventDefault()
    send()
  })
}

/**
 * Open the compose sheet for one session.
 * @param target - where the message goes.
 * @param t - copy source.
 * @param announce - live-region announcer for the success case.
 */
export function openComposeSheet(target: ComposeTarget, t: Translate, announce: (text: string) => void): void {
  const dialog = openDialog(target.title, () => {})
  const { textarea, failure } = buildComposeFields(t)
  dialog.body.append(textarea, failure)

  let busy = false

  const setBusy = (next: boolean): void => {
    busy = next
    textarea.disabled = next
    send.disabled = next
    steer.disabled = next
    cancel.disabled = next
    dialog.body.toggleAttribute('aria-busy', next)
  }

  const submit = (mode: PromptMode): void => {
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
    const release = (): void => {
      setBusy(false)
    }
    void issuePrompt(target, mode, text, { dialog, failure, t, announce, release })
  }

  const { cancel, steer, send } = buildComposeActions(
    t,
    () => {
      dialog.close()
    },
    submit,
  )
  dialog.actions.append(cancel, steer, send)

  sendOnEnter(textarea, () => {
    submit('queue')
  })

  textarea.focus()
}
