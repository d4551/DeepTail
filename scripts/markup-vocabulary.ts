/**
 * Class tokens that belong to a UI framework this product retired.
 *
 * The design system is tokens.css and the shipped sheets. A utility class, a
 * daisyUI component class, a Bootstrap grid class, or a Tailwind variant is a
 * second vocabulary no sheet here names. Distinctive tokens only: words this
 * product itself uses (`card`, `menu`, `button`, `drawer-toggle`) stay allowed,
 * because they are this design system's names, not a framework's.
 *
 * @module
 */

/**
 * Tokens that are a framework component on their own, and that this product
 * never uses as a class.
 */
const RETIRED_EXACT = new Set([
  'btn',
  'navbar',
  'dropdown',
  'toast',
  'tooltip',
  'skeleton',
  'avatar',
  'hero',
  'dock',
  'kbd',
  'swap',
  'join',
  'tabs',
  'breadcrumbs',
  'pagination',
  'carousel',
  'accordion',
  'countdown',
  'indicator',
  'mask',
  'prose',
  'glass',
  'collapse',
  'diff',
  'fab',
  'timeline',
  'chat',
  'stat',
  'steps',
  'rating',
  'range',
  'toggle',
  'checkbox',
  'badge',
  'alert',
  'loading',
  'filter',
  'stack',
  'mockup',
  'theme-controller',
  'btn-group',
  'form-control',
  'form-group',
  'container-fluid',
  'navbar-toggler',
  'sr-only',
])

/**
 * Prefixes that only a retired framework assigns. Product classes that share a
 * stem (`menu-item`, `modal-dialog`, `drawer-toggle`, `button-primary`,
 * `card`) are not in this list.
 */
const RETIRED_PREFIXES = [
  'btn-',
  'navbar-',
  'dropdown-',
  'swap-',
  'join-',
  'tab-',
  'tabs-',
  'toast-',
  'tooltip-',
  'skeleton-',
  'avatar-',
  'hero-',
  'dock-',
  'kbd-',
  'badge-',
  'alert-',
  'loading-',
  'mockup-',
  'theme-',
  'card-body',
  'card-title',
  'card-actions',
  'card-compact',
  'modal-box',
  'modal-backdrop',
  'drawer-side',
  'drawer-overlay',
  'drawer-content',
  'menu-title',
  'menu-dropdown',
  'daisy-',
  'bg-primary',
  'bg-secondary',
  'bg-accent',
  'bg-neutral',
  'bg-base-',
  'text-primary',
  'text-secondary',
  'text-accent',
  'text-neutral',
  'text-base-',
  'border-base-',
  'border-primary',
  'col-xs-',
  'col-sm-',
  'col-md-',
  'col-lg-',
  'col-xl-',
  'col-xxl-',
  'offset-',
  'd-flex',
  'd-none',
  'd-block',
  'd-inline',
  'd-grid',
]

/**
 * A Tailwind numeric or keyword utility: `p-4`, `w-full`, `text-sm`, `gap-2`.
 *
 * The scale lives in tokens.css. A class that encodes a spacing or type
 * decision is a second scale no gate reads.
 */
const TAILWIND_UTILITY =
  '-?(?:p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml|gap|inset|top|right|bottom|left|z|w|h|min-w|min-h|max-w|max-h|text|leading|tracking|rounded|shadow|opacity|basis|grow|shrink|order|col-span|row-span|grid-cols|grid-rows|space-x|space-y|translate-x|translate-y|scale|rotate|inset-x|inset-y|indent|scroll-m|scroll-p)-'

const TAILWIND_NAMED =
  /^(?:flex-col|flex-row|flex-wrap|flex-nowrap|items-center|items-start|items-end|items-stretch|justify-between|justify-center|justify-start|justify-end|justify-around|justify-evenly|place-items-center|grid-flow-col|grid-flow-row|sr-only|not-sr-only|container|prose)$/u

const TAILWIND_SCALE =
  '(?:\\d+|px|auto|full|screen|fit|min|max|svh|lvh|dvh|svw|lvw|dvw|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|none|tight|snug|normal|relaxed|loose)'

const TAILWIND_UTILITY_RE = new RegExp(`^(?:${TAILWIND_UTILITY})${TAILWIND_SCALE}$`, 'u')

/**
 * The utility a class token names, after Tailwind/daisyUI variants are peeled.
 * @param token - one class attribute token.
 * @returns the trailing utility (`md:hover:p-4` → `p-4`).
 */
function utilityOf(token: string): string {
  const important = token.startsWith('!') ? token.slice(1) : token
  const parts = important.split(':')
  return parts.at(-1) ?? important
}

/**
 * Whether one class token belongs to a retired framework.
 * @param token - one class attribute token.
 * @returns true when the token is a retired framework's vocabulary.
 */
export function isRetiredClassToken(token: string): boolean {
  if (token === '') return false
  const utility = utilityOf(token)
  if (RETIRED_EXACT.has(utility) || RETIRED_EXACT.has(token)) return true
  if (TAILWIND_NAMED.test(utility) || TAILWIND_UTILITY_RE.test(utility)) return true
  return RETIRED_PREFIXES.some((prefix) => utility.startsWith(prefix) || token.startsWith(prefix))
}

/**
 * Every retired-framework class a class attribute carries.
 * @param value - the class attribute value.
 * @returns the tokens that belong to a retired framework.
 */
export function retiredClassTokens(value: string): string[] {
  return value.split(/\s+/u).filter((token) => isRetiredClassToken(token))
}
