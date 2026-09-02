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

import { type HostApi, RemoteError } from '../api.ts'
import type { HostRecord } from '../host.ts'
import type { Translate } from '../locales.ts'
import { describeFailure } from '../reason.ts'
import { button, el, labelledField, setAria } from './dom.ts'
import { type Dialog, openDialog } from './modal.ts'
import { clearFailure, errorStrip, showFailure } from './states.ts'

/** What the dialog needs to spawn. */
export interface SpawnPorts {
  readonly hosts: readonly HostRecord[]
  apiFor(host: HostRecord): HostApi
}

/**
 * What a spawn asks the host for.
 *
 * Both fields are optional, and an empty box means "whatever the host would
 * choose" — which is said by leaving the field off the request entirely rather
 * than by sending an empty string.
 */
type SpawnRequest = Parameters<HostApi['createSession']>[0]

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
 * @param placeholder - the hint carried while the box is empty.
 * @param name - the `data-deeptail-field` hook the box answers to.
 * @returns the labelled field and the input inside it.
 */
function buildTextField(label: string, placeholder: string, name: string): LabelledControl<HTMLInputElement> {
  const control = el('input', { className: 'input', data: { deeptailField: name } })
  control.type = 'text'
  control.placeholder = placeholder
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
 * The request for what the operator typed.
 * @param chosen - the agent preset, empty for the host default.
 * @param directory - the working directory, empty for the host default.
 * @returns the request, carrying only the fields that were filled in.
 */
function draftRequest(chosen: string, directory: string): SpawnRequest {
  return {
    ...(chosen === '' ? {} : { agentPreset: chosen }),
    ...(directory === '' ? {} : { cwd: directory }),
  }
}

/**
 * Create the session and report the outcome where the operator can see it.
 * @param ports - hosts and their Remote surfaces.
 * @param host - the host to spawn on.
 * @param request - the preset and directory to spawn with.
 * @param report - where the outcome is told.
 * @returns once the outcome has been reported.
 */
async function spawnSession(
  ports: SpawnPorts,
  host: HostRecord,
  request: SpawnRequest,
  report: SpawnReport,
): Promise<void> {
  try {
    await ports.apiFor(host).createSession(request)
    // Closed first: the live region is inert while this dialog is open.
    report.dialog.close()
    report.announce(report.t('spawn.created', { label: host.label }))
  } catch (reason) {
    const message = describeFailure(reason, report.t)
    if (!report.dialog.isOpen()) {
      report.announce(report.t('spawn.failed', { message }))
      return
    }
    // The dialog stays up with the typed values in it, so a rejected id can be
    // corrected in place.
    showFailure(report.failure, describeSpawnFailure(reason, message, report.t))
    report.release()
  }
}

/**
 * The message a failed spawn should carry.
 *
 * An unknown preset is the one failure the operator can correct on the spot, and
 * the host sends the ids it does have alongside it, so those are shown rather
 * than the bare rejection.
 * @param reason - whatever the call threw.
 * @param message - the already-extracted message text.
 * @param t - copy source.
 * @returns the text for the failure strip.
 */
function describeSpawnFailure(reason: unknown, message: string, t: Translate): string {
  if (reason instanceof RemoteError && reason.code === 'agent-preset-not-found') {
    const available = reason.details.available
    if (Array.isArray(available) && available.length > 0) {
      return t('spawn.presetUnknown', { presets: available.map(String).join(', ') })
    }
  }
  return t('spawn.failed', { message })
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
    void spawnSession(ports, host, request, { dialog, failure, t, announce, release })
  })

  create.dataset.deeptailAction = 'spawn-create'
  dialog.actions.append(cancel, create)
  // The host chooser is the first decision the dialog asks for, so it is where
  // the operator lands rather than on the dialog's own frame.
  hostSelect.focus()
}
