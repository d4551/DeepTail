/**
 * Spawn a session on a chosen host.
 *
 * `session.create` is unary and returns the new identity; the row itself
 * arrives through the host's `api-session/added` event rather than being
 * inserted optimistically, so the roster shows what the host actually has.
 *
 * @module
 */

import type { AgentPreset, HostApi } from '../api.ts'
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
  const presetSelect = el('select', { className: 'select', data: { deeptailField: 'preset' } })
  presetField.append(presetSelect)

  const cwdField = el('label', { className: 'field' })
  cwdField.append(el('span', { className: 'label', text: t('spawn.cwd') }))
  const cwd = el('input', { className: 'input', data: { deeptailField: 'cwd' } })
  cwd.type = 'text'
  cwd.placeholder = t('spawn.cwdPlaceholder')
  cwdField.append(cwd)

  const status = el('div', { className: 'status', attrs: { role: 'status' } })
  const failure = el('div', { className: 'error', attrs: { role: 'alert' }, data: { deeptailState: 'spawn-error' } })
  failure.hidden = true

  dialog.body.append(hostField, presetField, cwdField, status, failure)

  const hostById = new Map(ports.hosts.map((host) => [host.id, host]))
  let busy = false

  const selectedHost = (): HostRecord | undefined => hostById.get(hostSelect.value)

  const loadPresets = (): void => {
    const host = selectedHost()
    presetSelect.replaceChildren()
    if (host === undefined) return
    status.textContent = t('spawn.loadingPresets')
    status.hidden = false
    void ports
      .apiFor(host)
      .listPresets()
      .then((presets: readonly AgentPreset[]) => {
        status.hidden = true
        for (const preset of presets) {
          const option = el('option', { text: preset.name })
          option.value = preset.id
          presetSelect.append(option)
        }
        // A host with no roster still spawns: the harness composes its default.
        presetSelect.disabled = presets.length === 0
        return undefined
      })
      .catch((reason: unknown) => {
        status.hidden = true
        failure.textContent = t('spawn.presetsFailed', {
          message: reason instanceof Error ? reason.message : String(reason),
        })
        failure.hidden = false
        return undefined
      })
  }

  const setBusy = (next: boolean): void => {
    busy = next
    hostSelect.disabled = next
    presetSelect.disabled = next
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
    const preset = presetSelect.value
    const directory = cwd.value.trim()
    void ports
      .apiFor(host)
      .createSession({
        ...(preset === '' ? {} : { agentPreset: preset }),
        ...(directory === '' ? {} : { cwd: directory }),
      })
      .then(() => {
        announce(t('spawn.created', { label: host.label }))
        dialog.close()
        return undefined
      })
      .catch((reason: unknown) => {
        failure.textContent = t('spawn.failed', {
          message: reason instanceof Error ? reason.message : String(reason),
        })
        failure.hidden = false
        setBusy(false)
        return undefined
      })
  })
  create.dataset.deeptailAction = 'spawn-create'
  dialog.actions.append(cancel, create)

  hostSelect.addEventListener('change', loadPresets)
  loadPresets()
}
