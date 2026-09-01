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
import { el, moveRovingFocus } from './ui/dom.ts'
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

/** The pairing phase of {@link Phase}. */
type PairingPhase = Extract<Phase, { kind: 'pairing' }>

/** How the picker reaches the native side; replaced wholesale in tests. */
export interface PickerPorts {
  listHosts(): Promise<HostRecord[]>
  pairHost(link: string, label: string): Promise<HostRecord>
  hostState(host: HostRecord): Promise<HostState>
}

/** The localized key for one host state's spoken label. */
const STATE_KEYS: Readonly<Record<HostState, PickerKey>> = {
  online: 'host.state.online',
  offline: 'host.state.offline',
  unauthorized: 'host.state.unauthorized',
  unknown: 'host.state.unknown',
}

/** Render a rejected promise reason as message text. */
const messageOf = (reason: PromiseRejectedResult['reason']): string =>
  reason instanceof Error ? reason.message : String(reason)

/** Read a promise as data: success keeps its value, failure keeps its message. */
const settled = async <T>(
  promise: Promise<T>,
): Promise<{ readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string }> => {
  const [outcome] = await Promise.allSettled([promise])
  return outcome.status === 'fulfilled'
    ? { ok: true, value: outcome.value }
    : { ok: false, message: messageOf(outcome.reason) }
}

/** The ports backed by the real Tauri commands. */
const tauriPorts: PickerPorts = {
  listHosts: () => invoke<HostRecord[]>('list_hosts'),
  pairHost: (link, label) => invoke<HostRecord>('pair_host', { link, label }),
  hostState: async (host) => {
    // `select_host` fails when the device token is missing or the store
    // refused it; either way the host needs pairing again before use.
    const probe = await settled(invoke('select_host', { host: host.id }))
    return probe.ok ? 'online' : 'unauthorized'
  },
}

/** A pairing form with nothing typed into it yet. */
const EMPTY_DRAFT = { link: '', label: '' } as const

/** What every picker view needs from its surroundings. */
interface PickerContext {
  /** Copy source. */
  readonly t: Translate
  /** Reachability per host, filled in as probes settle. */
  readonly states: ReadonlyMap<string, HostState>
}

/** What the host-list view needs beyond {@link PickerContext}. */
interface ListContext extends PickerContext {
  /** The hosts to lay out. */
  readonly hosts: readonly HostRecord[]
  /** Called with the host a viewer activated. */
  pick(host: HostRecord): void
  /** Called when the viewer asks to pair another host. */
  startPairing(hosts: readonly HostRecord[]): void
}

/** What the pairing form needs beyond {@link PickerContext}. */
interface PairContext extends PickerContext {
  /** The phase driving this render. */
  readonly current: PairingPhase
  /** Called with the typed draft when the form is submitted. */
  submit(hosts: readonly HostRecord[], draft: { link: string; label: string }): void
  /** Called when the viewer abandons pairing. */
  cancel(hosts: readonly HostRecord[]): void
}

/** The loading announcement. */
const loadingView = (t: Translate): HTMLElement => {
  const row = el('div', { className: 'centered' })
  row.dataset.deeptailState = 'loading'
  row.append(el('div', { className: 'spinner' }), el('div', { className: 'status', text: t('status.loading') }))
  return row
}

/** The failed-read strip, carrying its own retry. */
const failedView = (t: Translate, message: string, onRetry: () => void): HTMLElement => {
  const strip = el('div', { className: 'error', text: message })
  strip.dataset.deeptailState = 'error'
  strip.setAttribute('role', 'alert')
  const retry = el('button', { className: 'retry', text: t('action.retry') })
  retry.type = 'button'
  retry.addEventListener('click', onRetry)
  strip.append(retry)
  return strip
}

/**
 * The nothing-paired call to action: with nothing paired there is nothing to
 * choose between, so the screen is the pairing call to action rather than an
 * empty list beside a button.
 */
const emptyView = (t: Translate, onPair: () => void): HTMLElement[] => {
  const status = el('div', { className: 'status', text: t('status.empty') })
  status.dataset.deeptailState = 'empty'
  status.setAttribute('role', 'status')
  const lede = el('p', { className: 'lede', text: t('empty.lede') })
  const add = el('button', { className: 'button button-primary', text: t('action.pair') })
  add.type = 'button'
  add.addEventListener('click', onPair)
  const actions = el('div', { className: 'actions' })
  actions.append(add)
  return [status, lede, actions]
}

/** One host row: decorative dot, label, origin, and the spoken state beside it. */
const hostRow = (
  ctx: PickerContext,
  host: HostRecord,
  onPick: (host: HostRecord) => void,
): { readonly row: HTMLButtonElement; readonly seat: HTMLElement } => {
  const seat = el('span')
  seat.setAttribute('role', 'listitem')
  const row = el('button', { className: 'row' })
  row.type = 'button'
  row.dataset.deeptailHost = host.id
  row.tabIndex = 0

  const reachability = ctx.states.get(host.id) ?? 'unknown'
  const dot = el('span', { className: 'dot' })
  dot.dataset.state = reachability
  dot.setAttribute('aria-hidden', 'true')

  const text = el('span', { className: 'row-text' })
  text.append(
    el('span', { className: 'row-label', text: host.label }),
    el('span', { className: 'row-origin', text: host.origin }),
  )

  // The dot is decorative; the state is announced as text beside it.
  const spoken = el('span', { className: 'visually-hidden', text: ctx.t(STATE_KEYS[reachability]) })
  row.append(dot, text, spoken)
  row.addEventListener('click', () => onPick(host))
  seat.append(row)
  return { row, seat }
}

/** The host list, with roving focus and the pair-another footer. */
const listView = (ctx: ListContext): HTMLElement[] => {
  const lede = el('p', { className: 'lede', text: ctx.t('picker.lede') })
  const list = el('div', { className: 'list' })
  list.dataset.deeptailState = 'ready'
  list.setAttribute('role', 'list')
  list.setAttribute('aria-label', ctx.t('picker.aria'))

  const rows: HTMLButtonElement[] = []
  for (const host of ctx.hosts) {
    const { row, seat } = hostRow(ctx, host, ctx.pick)
    if (rows.length > 0) row.tabIndex = -1
    rows.push(row)
    list.append(seat)
  }
  // Bind each row's index after the list is built so arrow keys move over
  // the final ordering rather than the partial one.
  for (const [index, row] of rows.entries()) {
    row.addEventListener('keydown', (event) => {
      moveRovingFocus(event, rows, index)
    })
  }

  const add = el('button', { className: 'button button-outline', text: ctx.t('action.pair') })
  add.type = 'button'
  add.addEventListener('click', () => {
    ctx.startPairing(ctx.hosts)
  })
  const footer = el('div', { className: 'footer' })
  footer.append(add)
  return [lede, list, footer]
}

/** One labeled input in the pairing form. */
const pairField = (
  label: string,
  input: HTMLInputElement,
  initial: string,
  onInput: (value: string) => void,
): HTMLElement => {
  const field = el('label', { className: 'field' })
  field.append(el('span', { className: 'label', text: label }))
  input.value = initial
  input.addEventListener('input', () => {
    onInput(input.value)
  })
  field.append(input)
  return field
}

/** The pairing form: link, name, and the cancel/submit actions. */
const pairView = (ctx: PairContext): HTMLElement[] => {
  const { t, current } = ctx
  const draft = { link: current.draft.link, label: current.draft.label }
  const form = el('form')
  form.append(el('p', { className: 'lede', text: t('pair.title') }))

  const link = el('input', { className: 'input' })
  link.type = 'url'
  link.placeholder = t('pair.linkPlaceholder')
  link.dataset.deeptailField = 'link'
  form.append(
    pairField(t('pair.linkLabel'), link, current.draft.link, (value) => {
      draft.link = value
    }),
  )

  const name = el('input', { className: 'input' })
  name.type = 'text'
  name.placeholder = t('pair.namePlaceholder')
  name.dataset.deeptailField = 'name'
  form.append(
    pairField(t('pair.nameLabel'), name, current.draft.label, (value) => {
      draft.label = value
    }),
  )

  if (current.error !== undefined) {
    const strip = el('div', { className: 'error', text: current.error })
    strip.dataset.deeptailState = 'pair-error'
    strip.setAttribute('role', 'alert')
    form.append(strip)
  }

  const cancel = el('button', { className: 'button button-outline', text: t('action.cancel') })
  cancel.type = 'button'
  cancel.disabled = current.busy
  cancel.addEventListener('click', () => {
    ctx.cancel(current.hosts)
  })
  const submit = el('button', { className: 'button button-primary', text: t('action.pair') })
  submit.type = 'submit'
  submit.disabled = current.busy
  submit.dataset.deeptailAction = 'pair-submit'
  const actions = el('div', { className: 'actions' })
  actions.append(cancel, submit)
  form.append(actions)
  form.addEventListener('submit', (event) => {
    event.preventDefault()
    ctx.submit(current.hosts, draft)
  })
  return [form]
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
    const ctxBase: PickerContext = { t, states }
    let phase: Phase = { kind: 'loading' }

    const root = el('main', { className: 'picker' })
    root.dataset.deeptailPicker = ''
    const card = el('div', { className: 'card' })
    root.append(card)
    container.replaceChildren(root)

    /** Announce state changes without stealing focus. */
    const live = el('div', { className: 'visually-hidden' })
    live.setAttribute('role', 'status')

    const finish = (host: HostRecord): void => {
      container.replaceChildren()
      resolve(host)
    }

    /** Move to a phase and repaint. */
    const to = (next: Phase): void => {
      phase = next
      render()
    }

    const runLoad = async (): Promise<void> => {
      phase = { kind: 'loading' }
      render()
      live.textContent = t('status.loading')
      const read = await settled(ports.listHosts())
      if (!read.ok) {
        phase = { kind: 'failed', message: read.message === '' ? t('error.listFailed') : read.message }
        render()
        return
      }
      const hosts = read.value
      phase = { kind: 'ready', hosts }
      render()
      await Promise.all(
        hosts.map(async (host) => {
          states.set(host.id, await ports.hostState(host))
        }),
      )
      if (phase.kind === 'ready') render()
    }

    const runPair = async (
      hosts: readonly HostRecord[],
      draft: { readonly link: string; readonly label: string },
    ): Promise<void> => {
      if (draft.link.trim() === '') {
        to({ kind: 'pairing', hosts, error: t('error.linkRequired'), busy: false, draft })
        return
      }
      to({ kind: 'pairing', hosts, busy: true, draft })
      const trimmedLabel = draft.label.trim()
      const added = await settled(ports.pairHost(draft.link.trim(), trimmedLabel === '' ? 'Harness' : trimmedLabel))
      if (!added.ok) {
        to({ kind: 'pairing', hosts, error: t('error.pairFailed', { message: added.message }), busy: false, draft })
        return
      }
      finish(added.value)
    }

    const render = (): void => {
      card.replaceChildren(el('h1', { className: 'wordmark', text: t('app.name') }))
      switch (phase.kind) {
        case 'loading':
          card.append(loadingView(t))
          break
        case 'failed':
          card.append(
            failedView(t, phase.message, () => {
              runLoad()
            }),
          )
          break
        case 'ready':
          card.append(
            ...(phase.hosts.length === 0
              ? emptyView(t, () => {
                  to({ kind: 'pairing', hosts: [], busy: false, draft: EMPTY_DRAFT })
                })
              : listView({
                  ...ctxBase,
                  hosts: phase.hosts,
                  pick: finish,
                  startPairing: (hosts) => {
                    to({ kind: 'pairing', hosts, busy: false, draft: EMPTY_DRAFT })
                  },
                })),
          )
          break
        case 'pairing':
          card.append(
            ...pairView({
              ...ctxBase,
              current: phase,
              submit: (hosts, draft) => {
                runPair(hosts, draft)
              },
              cancel: (hosts) => {
                to({ kind: 'ready', hosts })
              },
            }),
          )
          break
        default:
          throw new Error('deeptail: unreachable picker phase')
      }
      card.append(live)
    }

    runLoad()
  })
}
