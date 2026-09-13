/**
 * The vocabularies a retired framework's *previous* major writes.
 *
 * Every rule the gate states about a framework's current class names reads
 * straight past the names that major renamed away from, and a page still on
 * the previous one writes exactly those. Catching only what is current is
 * catching only what has already been fixed, so each retired spelling is a case
 * here beside its replacement in `markup-gate.spec.ts`.
 *
 * Grounded against the published rename lists: daisyUI 5 replaced `btm-nav`
 * with `dock`, `input-group` with `join`, `tabs-bordered`/`tabs-lifted`/
 * `tabs-boxed` with `tabs-border`/`tabs-lift`/`tabs-box`, deleted
 * `form-control` in favour of `fieldset`, and removed `artboard` and the
 * `phone-*` sizes; Tailwind 4 added the logical-property families that spell a
 * side for a document whose direction can reverse, and the colour-scheme
 * utilities.
 */

import { describe, expect, it } from 'bun:test'
import { retiredClassTokens } from '../scripts/markup-vocabulary.ts'

describe('the class vocabulary rejects a retired framework’s earlier spelling', () => {
  it('a daisyUI 4 class, whose name the current major renamed away from', () => {
    // A page still on the previous major writes the previous name, and the
    // rename means every rule stated about the current one reads straight past
    // it. Catching only what is current is catching only what is already fixed.
    for (const token of [
      'btm-nav',
      'btm-nav-label',
      'btm-nav-sm',
      'artboard',
      'artboard-demo',
      'phone-1',
      'input-group',
      'tabs-bordered',
      'tabs-lifted',
      'tabs-boxed',
      'form-control',
    ]) {
      expect([token, retiredClassTokens(token)]).toEqual([token, [token]])
    }
  })

  it('a Tailwind logical-property utility, which is how the current major spells a side', () => {
    // `ml-4` became `ms-4` for a document whose direction can reverse. A list
    // written against the physical families alone reads the old spelling and
    // lets the current one through.
    for (const token of ['ms-4', 'me-2', 'ps-6', 'pe-1', 'start-0', 'end-auto', 'border-s', 'border-e', 'tab-4']) {
      expect([token, retiredClassTokens(token)]).toEqual([token, [token]])
    }
  })

  it('a Tailwind colour-scheme utility, which decides a palette outside tokens.css', () => {
    for (const token of ['scheme-light', 'scheme-dark', 'scheme-only-dark']) {
      expect([token, retiredClassTokens(token)]).toEqual([token, [token]])
    }
  })
})

describe('the class vocabulary allows this product’s own classes', () => {
  it('which share stems with the retired frameworks', () => {
    for (const token of [
      'menu-item',
      'menu-footer',
      'menu-label',
      'modal-dialog',
      'shell',
      'sidebar',
      'radio',
      'input',
    ]) {
      expect([token, retiredClassTokens(token)]).toEqual([token, []])
    }
  })
})

describe('the class vocabulary rejects a daisyUI 5 modifier the exact-name list cannot see', () => {
  it('because a modifier is a different token from the bare component', () => {
    // `stack` is exact, so `stack-top` is a different token; `file-input` and
    // `floating-label` are current-major component names this list never
    // carried. Catching only the bare word is catching only the spelling a
    // reintroduction does not have to write.
    for (const token of [
      'stack-top',
      'stack-bottom',
      'stack-start',
      'stack-end',
      'file-input',
      'file-input-sm',
      'floating-label',
      'radial-progress',
      'calendar',
      'cally',
      'fieldset',
      'checkbox-primary',
      'radio-sm',
    ]) {
      expect([token, retiredClassTokens(token)]).toEqual([token, [token]])
    }
  })
})
