/**
 * Spawn a session on a chosen host.
 *
 * `session.create` is unary and returns the new identity; the row itself
 * arrives through the host's `api-session/added` event rather than being
 * inserted optimistically, so the roster shows what the host actually has.
 *
 * The preset is typed rather than picked. No host publishes a preset listing:
 * the only remote surface that names the available ids is the failure a bad one
 * produces, so the field is optional, the host composes its default when it is
 * left empty, and a rejected id is answered with the list the host sent back.
 *
 * @module
 */

import type { ActionOutcome } from '../actions/outcomes.ts'
import { outcomeCopy } from '../actions/outcomes.ts'
import { ACTIONS } from '../actions/registry.ts'
import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import { DATA } from '../markers.ts'
import { messageOf } from '../reason.ts'
import { button, el, labelledField, setAria } from './dom.ts'
import { type Dialog, openDialog } from './modal.ts'
import { clearFailure, errorStrip, showFailure } from './states.ts'

/** What the dialog needs to spawn. */
export interface SpawnPorts {
  readonly hosts: readonly HostRecord[]
  create(hostId: string, preset: string, cwd: string): Promise<ActionOutcome>
}

/** A control and the label that names it. */
interface LabelledControl<T extends HTMLElement> {
  /** The label, which is what gets mounted. */
  readonly field: HTMLLabelElement
  /** The control inside it, which is what gets read. */
  readonly control: T
}

/** The dialog's form: what the body holds, and what submitting reads. */
interface SpawnForm {
  /** Everything the body holds, in display order. */
  readonly fields: readonly HTMLElement[]
  readonly host: HTMLSelectElement
  readonly preset: HTMLInputElement
  readonly cwd: HTMLInputElement
  /** The strip a failed spawn is written into. */
  readonly failure: HTMLElement
}

/** Where a spawn tells its outcome. */
interface SpawnReport {
  readonly dialog: Dialog
  readonly failure: HTMLElement
  readonly t: Translate
  readonly announce: (text: string) => void
  /** Hand the dialog back to the operator, typed values and all, to try again. */
  readonly release: () => void
}

/**
 * The host chooser.
 *
 * An option names the origin beside the label, because the label is a nickname
 * the operator chose and only the origin says which machine will be spawned on.
 * @param hosts - the paired hosts, in fleet order.
 * @param t - copy source.
 * @returns the labelled field and the select inside it.
 */
function buildHostField(hosts: readonly HostRecord[], t: Translate): LabelledControl<HTMLSelectElement> {
  const control = el('select', { className: 'select', data: { deeptailField: 'host' } })
  for (const host of hosts) {
    const option = el('option', { text: t('spawn.hostOption', { label: host.label, origin: host.origin }) })
    option.value = host.id
    control.append(option)
  }
  return { field: labelledField(t('shell.connection'), control), control }
}

/**
 * A labelled text box.
 * @param label - the visible label.
 * @param hint - the text carried while the box is empty.
 * @param name - the `data-deeptail-field` hook the box answers to.
 * @returns the labelled field and the input inside it.
 */
function buildTextField(label: string, hint: string, name: string): LabelledControl<HTMLInputElement> {
  const control = el('input', { className: 'input', data: { deeptailField: name } })
  control.type = 'text'
  control.placeholder = hint
  return { field: labelledField(label, control), control }
}

/**
 * Build the dialog's form.
 *
 * The strip is an `alert` so a rejection is spoken the moment it appears, and it
 * starts hidden so it says nothing before there is anything to say.
 * @param hosts - the paired hosts, in fleet order.
 * @param t - copy source.
 * @returns the fields to mount and the controls submitting reads.
 */
function buildSpawnForm(hosts: readonly HostRecord[], t: Translate): SpawnForm {
  const host = buildHostField(hosts, t)
  const preset = buildTextField(t('spawn.preset'), t('spawn.presetPlaceholder'), 'preset')
  const cwd = buildTextField(t('spawn.cwd'), t('spawn.cwdPlaceholder'), 'cwd')
  const failure = errorStrip('spawn-error')
  failure.id = 'deeptail-spawn-error'
  return {
    fields: [host.field, preset.field, cwd.field, failure],
    host: host.control,
    preset: preset.control,
    cwd: cwd.control,
    failure,
  }
}

/**
 * The copy a failed spawn is told with.
 * @param outcome - what dispatch answered.
 * @param t - copy source.
 * @returns the sentence.
 */
function spawnFailCopy(outcome: ActionOutcome, t: Translate): string {
  if (outcome.kind === 'invalid' && outcome.reason === 'host-refused') {
    const prefix = t('spawn.presetUnknown', { presets: '\0' }).split('\0')[0]
    if (prefix !== undefined && prefix !== '' && outcome.message.startsWith(prefix)) return outcome.message
    return t('spawn.failed', { message: outcome.message })
  }
  return outcomeCopy(outcome, t) ?? t('spawn.failed', { message: outcome.kind })
}

/**
 * Create the session and report the outcome where the operator can see it.
 * @param ports - how the dialog asks the application to spawn.
 * @param host - the host to spawn on.
 * @param preset - the typed preset, empty for the host default.
 * @param cwd - the typed directory, empty for the host default.
 * @param report - where the outcome is told.
 */
function spawnSession(
  ports: SpawnPorts,
  host: HostRecord,
  preset: string,
  cwd: string,
  report: SpawnReport,
): void {
  const landed = (outcome: ActionOutcome): void => {
    if (outcome.kind === 'executed') {
      report.dialog.close()
      report.announce(outcome.announce ?? report.t('spawn.created', { label: host.label }))
      return
    }
    const message = spawnFailCopy(outcome, report.t)
    if (!report.dialog.isOpen()) {
      report.announce(message)
      return
    }
    showFailure(report.failure, message)
    report.release()
  }
  ports.create(host.id, preset, cwd).then(landed, (reason: { readonly message?: never }) => {
    landed({ kind: 'invalid', traceId: '', reason: 'host-refused', message: messageOf(reason) })
  })
}

/**
 * Open the new-session dialog.
 * @param ports - hosts and their Remote surfaces.
 * @param t - copy source.
 * @param announce - live-region announcer.
 */
export function openNewSession(ports: SpawnPorts, t: Translate, announce: (text: string) => void): void {
  const dialog = openDialog(t('shell.newSession'))
  const { fields, host: hostSelect, preset, cwd, failure } = buildSpawnForm(ports.hosts, t)
  dialog.body.append(...fields)
  setAria(preset, { describedby: failure.id })

  const hostById = new Map(ports.hosts.map((host) => [host.id, host]))
  let busy = false

  const setBusy = (next: boolean): void => {
    busy = next
    hostSelect.disabled = next
    preset.disabled = next
    cwd.disabled = next
    create.disabled = next
    cancel.disabled = next
    setAria(dialog.body, { busy: next ? 'true' : 'false' })
  }

  const cancel = button('button button-outline', t('action.cancel'), () => {
    dialog.close()
  })
  const create = button('button button-primary', t('shell.newSession'), () => {
    if (busy) return
    const host = hostById.get(hostSelect.value)
    if (host === undefined) return
    clearFailure(failure)
    setBusy(true)
    const release = (): void => {
      setBusy(false)
    }
    const request = draftRequest(preset.value.trim(), cwd.value.trim())
    spawnSession(ports, host, request, { dialog, failure, t, announce, release })
  })

  create.dataset[DATA.action] = ACTIONS['spawn.create'].marker
  dialog.actions.append(cancel, create)
  // The host chooser is the first decision the dialog asks for, so it is where
  // the operator lands rather than on the dialog's own frame.
  hostSelect.focus()
}
