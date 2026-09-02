/**
 * The tailnet machine list: which machines exist, which are already paired, and
 * which cannot be paired yet.
 *
 * Discovery, not pairing. Tailscale knows the machines; it cannot mint the
 * launch token a harness accepts, so choosing an unpaired machine hands the
 * picker an origin and the pairing form asks for the token.
 *
 * @module
 */

import type { HostRecord } from './host.ts'
import type { Translate } from './locales.ts'
import type { PickerContext } from './picker-views.ts'
import type { TailnetHost } from './tailscale.ts'
import { bindRovingFocus, el } from './ui/dom.ts'

/** The machine-list state. */
export interface TailnetListState {
  /** The roster to return to. */
  readonly hosts: readonly HostRecord[]
  /** The machines the tailnet listed. */
  readonly devices: readonly TailnetHost[]
}

/** What the machine list needs beyond {@link PickerContext}. */
interface ListContext extends PickerContext {
  /** The list state driving this render. */
  readonly current: TailnetListState
  /** Called with the machine a viewer chose to pair. */
  pair(hosts: readonly HostRecord[], device: TailnetHost): void
  /** Called with the paired host a viewer chose to open. */
  open(host: HostRecord): void
  /** Called when the viewer leaves the tailnet for the roster. */
  cancel(hosts: readonly HostRecord[]): void
  /** Called when the viewer disconnects the tailnet. */
  forget(hosts: readonly HostRecord[]): void
}

/**
 * The subtitle under one machine's name: what it runs, and why it cannot be
 * paired when it cannot.
 * @param t - copy source.
 * @param device - the machine.
 * @returns the subtitle text.
 */
function deviceSubtitle(t: Translate, device: TailnetHost): string {
  if (!device.authorized) return t('tailnet.unapproved')
  if (device.paired) return t('tailnet.alreadyPaired')
  return device.os === '' ? device.origin : t('tailnet.deviceSubtitle', { os: device.os, origin: device.origin })
}

/**
 * One machine row: activatable when there is something to do with it, and
 * plainly inert when there is not.
 * @param ctx - the list state and what its controls invoke.
 * @param device - the machine to draw.
 * @returns the row.
 */
function deviceRow(ctx: ListContext, device: TailnetHost): HTMLElement {
  const { t, current } = ctx
  const paired = current.hosts.find((host) => host.origin === device.origin)
  const row = el('button', { className: 'row' })
  row.type = 'button'
  row.dataset.deeptailTailnetDevice = device.id
  // An unapproved machine is listed because its absence would read as a
  // missing machine, and disabled because pairing it cannot succeed until an
  // admin approves it.
  row.disabled = !device.authorized
  // The host list's own row classes, not a parallel set: these rows carry the
  // same name-over-detail layout, and a second vocabulary for it drifts.
  const text = el('span', { className: 'row-text' })
  text.append(
    el('span', { className: 'row-label', text: device.label }),
    el('span', { className: 'row-origin', text: deviceSubtitle(t, device) }),
  )
  row.append(text)
  row.addEventListener('click', () => {
    if (paired !== undefined) {
      ctx.open(paired)
      return
    }
    ctx.pair(current.hosts, device)
  })
  return row
}

/**
 * The machine list, or the reason there is nothing in it.
 * @param ctx - the list state and what its controls invoke.
 * @returns the views, in the order they are laid out.
 */
export function tailnetListView(ctx: ListContext): HTMLElement[] {
  const { t, current } = ctx
  const heading = el('h2', { className: 'lede', text: t('tailnet.listTitle') })
  const views: HTMLElement[] = [heading]
  if (current.devices.length === 0) {
    views.push(el('div', { className: 'status', text: t('tailnet.empty'), role: 'status' }))
  } else {
    const list = el('div', {
      className: 'list',
      role: 'list',
      aria: { label: t('tailnet.listAria') },
      data: { deeptailState: 'tailnet' },
    })
    const rows: HTMLElement[] = []
    for (const device of current.devices) {
      const seat = el('div', { className: 'list-seat', role: 'listitem' })
      const row = deviceRow(ctx, device)
      rows.push(row)
      seat.append(row)
      list.append(seat)
    }
    // Only what a viewer can act on takes a stop: an unapproved machine is
    // disabled, and arrowing onto a control that cannot be activated is a dead
    // end the roving order should not have.
    bindRovingFocus(rows.filter((row) => !(row instanceof HTMLButtonElement && row.disabled)))
    views.push(list)
  }
  const back = el('button', { className: 'button button-outline', text: t('action.cancel') })
  back.type = 'button'
  back.addEventListener('click', () => {
    ctx.cancel(current.hosts)
  })
  const disconnect = el('button', { className: 'button button-outline', text: t('tailnet.disconnect') })
  disconnect.type = 'button'
  disconnect.dataset.deeptailAction = 'tailnet-forget'
  disconnect.addEventListener('click', () => {
    ctx.forget(current.hosts)
  })
  const actions = el('div', { className: 'actions' })
  actions.append(back, disconnect)
  views.push(actions)
  return views
}
