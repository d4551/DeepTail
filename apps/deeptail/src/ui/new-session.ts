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
import { button, el } from './dom.ts'
import { openDialog } from './modal.ts'

/** What the dialog needs to spawn. */
export interface SpawnPorts {
  readonly hosts: readonly HostRecord[]
  apiFor(host: HostRecord): HostApi
}

/**
 * Open the new-session dialog.
 * @param ports - hosts and their Remote surfaces.
 * @param t - copy source.
 * @param announce - live-region announcer.
 */
export function openNewSession(ports: SpawnPorts, t: Translate, announce: (text: string) => void): void {
  const dialog = openDialog(t('shell.newSession'), () => {})

  const hostField = el('label', { className: 'field' })
  hostField.append(el('span', { className: 'label', text: t('shell.connection') }))
  const hostSelect = el('select', { className: 'select', data: { deeptailField: 'host' } })
  for (const host of ports.hosts) {
    const option = el('option', { text: `${host.label} — ${host.origin}` })
    option.value = host.id
    hostSelect.append(option)
  }
  hostField.append(hostSelect)

  const presetField = el('label', { className: 'field' })
  presetField.append(el('span', { className: 'label', text: t('spawn.preset') }))
  const preset = el('input', { className: 'input', data: { deeptailField: 'preset' } })
  preset.type = 'text'
  preset.placeholder = t('spawn.presetPlaceholder')
  presetField.append(preset)

  const cwdField = el('label', { className: 'field' })
  cwdField.append(el('span', { className: 'label', text: t('spawn.cwd') }))
  const cwd = el('input', { className: 'input', data: { deeptailField: 'cwd' } })
  cwd.type = 'text'
  cwd.placeholder = t('spawn.cwdPlaceholder')
  cwdField.append(cwd)

  const failure = el('div', { className: 'error', attrs: { role: 'alert' }, data: { deeptailState: 'spawn-error' } })
  failure.hidden = true

  dialog.body.append(hostField, presetField, cwdField, failure)

  const hostById = new Map(ports.hosts.map((host) => [host.id, host]))
  let busy = false

  const selectedHost = (): HostRecord | undefined => hostById.get(hostSelect.value)

  const setBusy = (next: boolean): void => {
    busy = next
    hostSelect.disabled = next
    preset.disabled = next
    cwd.disabled = next
    create.disabled = next
    cancel.disabled = next
    dialog.body.toggleAttribute('aria-busy', next)
  }

  const cancel = button('button button-outline', t('action.cancel'), () => {
    dialog.close()
  })
  const create = button('button button-primary', t('shell.newSession'), () => {
    if (busy) return
    const host = selectedHost()
    if (host === undefined) return
    failure.hidden = true
    setBusy(true)
    const chosen = preset.value.trim()
    const directory = cwd.value.trim()
    void ports
      .apiFor(host)
      .createSession({
        ...(chosen === '' ? {} : { agentPreset: chosen }),
        ...(directory === '' ? {} : { cwd: directory }),
      })
      .then(() => {
        // Closed first: the live region is inert while this dialog is open.
        dialog.close()
        announce(t('spawn.created', { label: host.label }))
        return undefined
      })
      .catch((reason: unknown) => {
        const message = reason instanceof Error ? reason.message : String(reason)
        if (!dialog.isOpen()) {
          announce(t('spawn.failed', { message }))
          return undefined
        }
        failure.textContent = describeSpawnFailure(reason, message, t)
        failure.hidden = false
        setBusy(false)
        return undefined
      })
  })
  create.dataset.deeptailAction = 'spawn-create'
  dialog.actions.append(cancel, create)
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
