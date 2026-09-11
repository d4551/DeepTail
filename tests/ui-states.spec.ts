/**
 * The reactive states every surface renders, read attribute by attribute.
 *
 * What a state says to assistive technology is the contract: a pending list is
 * a `status`, a whole-screen failure is an `alert`, a partial one is a `status`
 * beside working content, and a refusal strip is revealed before its text is
 * written, because the insertion is what a live region fires on. A state that
 * got any of that wrong would still look right in a screenshot.
 */

import { beforeEach, describe, expect, it } from 'bun:test'
import { createTranslate, DICTIONARIES } from '../apps/deeptail/src/locales.ts'
import {
  clearFailure,
  emptyRow,
  errorStrip,
  hostStateLabel,
  loadingRow,
  retryStrip,
  showFailure,
} from '../apps/deeptail/src/ui/states.ts'
import { resetDocument } from './dom.ts'

/** The copy source the assertions read the rendered text back from. */
const t = createTranslate('en')

beforeEach(() => {
  resetDocument()
})

describe('a row announcing that something is loading', () => {
  it('is a status, carrying the spinner and the localized message', () => {
    const row = loadingRow(t, 'status.loading')
    expect(row.getAttribute('role')).toBe('status')
    expect(row.dataset['deeptailState']).toBe('loading')
    expect(row.querySelector('.spinner')).not.toBeNull()
    expect(row.querySelector('.status')?.textContent).toBe(DICTIONARIES.en['status.loading'])
  })

  it('announces the sessions read by its own key', () => {
    expect(loadingRow(t, 'sessions.loading').querySelector('.status')?.textContent).toBe(
      DICTIONARIES.en['sessions.loading'],
    )
  })
})

describe('a row announcing that a settled read found nothing', () => {
  it('is a status carrying the already-localized message', () => {
    const row = emptyRow('no paired hosts')
    expect(row.getAttribute('role')).toBe('status')
    expect(row.dataset['deeptailState']).toBe('empty')
    expect(row.textContent).toBe('no paired hosts')
  })
})

describe('a failed read, carrying the retry that clears it', () => {
  it('replaces the screen as an alert when nothing answered', () => {
    let retried = 0
    const strip = retryStrip('error', 'the host did not answer', 'try again', () => {
      retried += 1
    })
    expect(strip.getAttribute('role')).toBe('alert')
    expect(strip.dataset['deeptailState']).toBe('error')
    expect(strip.textContent?.startsWith('the host did not answer')).toBe(true)
    expect(retried).toBe(0)
  })

  it('sits beside working content as a status when only part answered', () => {
    let retried = 0
    const strip = retryStrip('partial', 'one host refused', 'try again', () => {
      retried += 1
    })
    expect(strip.getAttribute('role')).toBe('status')
    expect(strip.className).toContain('warning')
    expect(retried).toBe(0)
  })

  it('wires its retry to the caller', () => {
    let retried = 0
    const strip = retryStrip('error', 'down', 'try again', () => {
      retried += 1
    })
    const retry = strip.querySelector('button')
    expect(retry?.textContent).toBe('try again')
    retry?.click()
    expect(retried).toBe(1)
  })
})

describe('a strip one surface writes its refusals into', () => {
  it('starts hidden, and interrupts by default', () => {
    const strip = errorStrip('pair-error')
    expect(strip.hidden).toBe(true)
    expect(strip.getAttribute('role')).toBe('alert')
    expect(strip.dataset['deeptailState']).toBe('pair-error')
  })

  it('waits for a pause when the surface asked it to', () => {
    expect(errorStrip('tailnet-error', 'status').getAttribute('role')).toBe('status')
  })
})

describe('writing a refusal into a strip', () => {
  it('reveals the strip before its text is written, so the insertion is announced', () => {
    const strip = errorStrip('pair-error')
    showFailure(strip, 'the token was refused')
    expect(strip.hidden).toBe(false)
    expect(strip.textContent).toBe('the token was refused')
  })
})

describe('taking a refusal back down', () => {
  it('empties the strip and hides it, so the next attempt reads as the next one', () => {
    const strip = errorStrip('pair-error')
    showFailure(strip, 'the token was refused')
    clearFailure(strip)
    expect(strip.textContent).toBe('')
    expect(strip.hidden).toBe(true)
  })
})

describe('the localized label for a host state', () => {
  it('speaks every state from the one table', () => {
    const states: readonly ('unknown' | 'online' | 'unauthorized' | 'forbidden' | 'offline')[] = [
      'online',
      'offline',
      'unauthorized',
      'forbidden',
      'unknown',
    ]
    expect(states.map((state) => hostStateLabel(t, state))).toEqual([
      DICTIONARIES.en['host.state.online'],
      DICTIONARIES.en['host.state.offline'],
      DICTIONARIES.en['host.state.unauthorized'],
      DICTIONARIES.en['host.state.forbidden'],
      DICTIONARIES.en['host.state.unknown'],
    ])
  })
})
