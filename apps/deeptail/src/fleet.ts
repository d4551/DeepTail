/**
 * The host picker: the one screen DeepTail draws itself. Everything after a
 * host is chosen is the harness's own web client, served by that host.
 *
 * Framework-free by necessity — it paints before any harness bundle has
 * loaded — so it builds DOM directly, in the idiom the harness boot page uses:
 * `textContent` never `innerHTML`, and `replaceChildren` for whole-state swaps.
 *
 * @module
 */

import { invoke } from '@tauri-apps/api/core'
import type { HostRecord } from './host.ts'
import { createTranslate, type PickerKey, type Translate } from './locales.ts'
import { moveRovingFocus } from './ui/dom.ts'
import type { HostState } from './ui/states.ts'
import './styles/tokens.css'
import './styles/picker.css'

/**
 * What the picker is doing. An empty list is only empty once `ready` — until
 * then it reads as loading, so a cold start never flashes "no hosts".
 */
type Phase =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly hosts: readonly HostRecord[] }
  | { readonly kind: 'failed'; readonly message: string }
  | {
      readonly kind: 'pairing'
      readonly hosts: readonly HostRecord[]
      readonly error?: string
      readonly busy: boolean
      /** What the viewer has typed, carried across re-renders so a failure never discards it. */
      readonly draft: { readonly link: string; readonly label: string }
    }

/** How the picker reaches the native side; replaced wholesale in tests. */
export interface PickerPorts {
  listHosts(): Promise<HostRecord[]>
  pairHost(link: string, label: string): Promise<HostRecord>
  hostState(host: HostRecord): Promise<HostState>
}

/** The ports backed by the real Tauri commands. */
const tauriPorts: PickerPorts = {
  listHosts: () => invoke<HostRecord[]>('list_hosts'),
  pairHost: (link, label) => invoke<HostRecord>('pair_host', { link, label }),
  hostState: async (host) => {
    try {
      await invoke('select_host', { host: host.id })
      return 'online'
    } catch {
      // `select_host` fails when the device token is missing or the store
      // refused it; either way the host needs pairing again before use.
      return 'unauthorized'
    }
  },
}

/** A pairing form with nothing typed into it yet. */
const EMPTY_DRAFT = { link: '', label: '' } as const

/** Create an element with a class and optional text. */
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

/**
 * Draw the picker and resolve with the host the viewer chose.
 *
 * @param container - mount point, owned entirely by the picker until it resolves.
 * @param ports - the native surface to call.
 * @param translate - copy source; defaults to the browser's locale.
 * @returns the chosen host.
 */
export function renderHostPicker(
  container: HTMLElement,
  ports: PickerPorts = tauriPorts,
  translate: Translate = createTranslate(),
): Promise<HostRecord> {
  return new Promise<HostRecord>((resolve) => {
    const t = translate
    const states = new Map<string, HostState>()
    let phase: Phase = { kind: 'loading' }

    const root = el('div', 'picker')
    root.dataset.deeptailPicker = ''
    const card = el('div', 'card')
    root.append(card)
    container.replaceChildren(root)

    /** Announce state changes without stealing focus. */
    const live = el('div', 'visually-hidden')
    live.setAttribute('role', 'status')

    const render = (): void => {
      card.replaceChildren(el('div', 'wordmark', t('app.name')))
      switch (phase.kind) {
        case 'loading':
          card.append(loadingView())
          break
        case 'failed':
          card.append(failedView(phase.message))
          break
        case 'ready':
          card.append(...(phase.hosts.length === 0 ? emptyView() : listView(phase.hosts)))
          break
        case 'pairing':
          card.append(...pairView(phase))
          break
        default:
          throw new Error('deeptail: unreachable picker phase')
      }
      card.append(live)
    }

    const announce = (key: PickerKey): void => {
      live.textContent = t(key)
    }

    const loadingView = (): HTMLElement => {
      const row = el('div', 'centered')
      row.dataset.deeptailState = 'loading'
      row.append(el('div', 'spinner'), el('div', 'status', t('status.loading')))
      return row
    }

    const failedView = (message: string): HTMLElement => {
      const strip = el('div', 'error', message)
      strip.dataset.deeptailState = 'error'
      strip.setAttribute('role', 'alert')
      const retry = el('button', 'retry', t('action.retry'))
      retry.type = 'button'
      retry.addEventListener('click', () => void load())
      strip.append(retry)
      return strip
    }

    const emptyView = (): HTMLElement[] => {
      // With nothing paired there is nothing to choose between, so the screen
      // is the pairing call to action rather than an empty list beside a button.
      const lede = el('p', 'lede', t('empty.lede'))
      const status = el('div', 'status', t('status.empty'))
      status.dataset.deeptailState = 'empty'
      status.setAttribute('role', 'status')
      const add = el('button', 'button button-primary', t('action.pair'))
      add.type = 'button'
      add.addEventListener('click', () => {
        phase = { kind: 'pairing', hosts: [], busy: false, draft: EMPTY_DRAFT }
        render()
      })
      const actions = el('div', 'actions')
      actions.append(add)
      return [status, lede, actions]
    }

    const listView = (hosts: readonly HostRecord[]): HTMLElement[] => {
      const lede = el('p', 'lede', t('picker.lede'))
      const list = el('div', 'list')
      list.dataset.deeptailState = 'ready'
      list.setAttribute('role', 'list')
      list.setAttribute('aria-label', t('picker.aria'))

      const rows: HTMLButtonElement[] = []
      for (const host of hosts) {
        const seat = el('span')
        seat.setAttribute('role', 'listitem')
        const row = el('button', 'row')
        row.type = 'button'
        row.dataset.deeptailHost = host.id
        row.tabIndex = rows.length === 0 ? 0 : -1

        const state = states.get(host.id) ?? 'unknown'
        const dot = el('span', 'dot')
        dot.dataset.state = state
        dot.setAttribute('aria-hidden', 'true')

        const text = el('span', 'row-text')
        text.append(el('span', 'row-label', host.label), el('span', 'row-origin', host.origin))

        // The dot is decorative; the state is announced as text beside it.
        const spoken = el('span', 'visually-hidden', t(`host.state.${state}` as PickerKey))
        row.append(dot, text, spoken)
        row.addEventListener('click', () => {
          container.replaceChildren()
          resolve(host)
        })
        rows.push(row)
        seat.append(row)
        list.append(seat)
      }
      // Bind each row's index after the list is built so arrow keys move over
      // the final ordering rather than the partial one.
      for (const [index, row] of rows.entries()) {
        row.addEventListener('keydown', (event) => {
          moveRovingFocus(event, rows, index)
        })
      }

      const add = el('button', 'button button-outline', t('action.pair'))
      add.type = 'button'
      add.addEventListener('click', () => {
        phase = { kind: 'pairing', hosts, busy: false, draft: EMPTY_DRAFT }
        render()
      })
      const footer = el('div', 'footer')
      footer.append(add)
      return [lede, list, footer]
    }

    const pairView = (current: Extract<Phase, { kind: 'pairing' }>): HTMLElement[] => {
      const draft = { link: current.draft.link, label: current.draft.label }
      const heading = el('p', 'lede', t('pair.title'))
      const linkField = el('label', 'field')
      const linkLabel = el('span', 'label', t('pair.linkLabel'))
      const link = el('input', 'input')
      link.type = 'url'
      link.placeholder = t('pair.linkPlaceholder')
      link.dataset.deeptailField = 'link'
      link.value = current.draft.link
      link.addEventListener('input', () => {
        draft.link = link.value
      })
      linkField.append(linkLabel, link)

      const nameField = el('label', 'field')
      const nameLabel = el('span', 'label', t('pair.nameLabel'))
      const name = el('input', 'input')
      name.type = 'text'
      name.placeholder = t('pair.namePlaceholder')
      name.dataset.deeptailField = 'name'
      name.value = current.draft.label
      name.addEventListener('input', () => {
        draft.label = name.value
      })
      nameField.append(nameLabel, name)

      const cancel = el('button', 'button button-outline', t('action.cancel'))
      cancel.type = 'button'
      cancel.disabled = current.busy
      cancel.addEventListener('click', () => {
        phase = { kind: 'ready', hosts: current.hosts }
        render()
      })

      const submit = el('button', 'button button-primary', t('action.pair'))
      submit.type = 'submit'
      submit.disabled = current.busy
      submit.dataset.deeptailAction = 'pair-submit'

      const form = el('form')
      form.append(heading, linkField, nameField)
      if (current.error !== undefined) {
        const strip = el('div', 'error', current.error)
        strip.dataset.deeptailState = 'pair-error'
        strip.setAttribute('role', 'alert')
        form.append(strip)
      }
      const actions = el('div', 'actions')
      actions.append(cancel, submit)
      form.append(actions)
      form.addEventListener('submit', (event) => {
        event.preventDefault()
        void pair(current.hosts, draft)
      })
      return [form]
    }

    const pair = async (
      hosts: readonly HostRecord[],
      draft: { readonly link: string; readonly label: string },
    ): Promise<void> => {
      if (draft.link.trim() === '') {
        phase = { kind: 'pairing', hosts, error: t('error.linkRequired'), busy: false, draft }
        render()
        return
      }
      phase = { kind: 'pairing', hosts, busy: true, draft }
      render()
      try {
        const label = draft.label.trim()
        const added = await ports.pairHost(draft.link.trim(), label === '' ? 'Harness' : label)
        container.replaceChildren()
        resolve(added)
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : String(reason)
        phase = { kind: 'pairing', hosts, error: t('error.pairFailed', { message }), busy: false, draft }
        render()
      }
    }

    const load = async (): Promise<void> => {
      phase = { kind: 'loading' }
      render()
      announce('status.loading')
      try {
        const hosts = await ports.listHosts()
        phase = { kind: 'ready', hosts }
        render()
        await Promise.all(
          hosts.map(async (host) => {
            states.set(host.id, await ports.hostState(host))
          }),
        )
        if (phase.kind === 'ready') render()
      } catch (reason) {
        phase = { kind: 'failed', message: reason instanceof Error ? reason.message : t('error.listFailed') }
        render()
      }
    }

    void load()
  })
}
