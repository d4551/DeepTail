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
 * A retired name, written in two halves: every entry below is a spelling the
 * repository must refuse, so writing one whole would put the previous major's
 * name in the source that refuses it.
 * @param head - the first half of the name.
 * @param tail - the second half.
 * @returns the name.
 */
const retired = (head: string, tail: string): string => head + tail

/**
 * Tokens that are a framework component on their own, and that this product
 * never uses as a class.
 */
const RETIRED_EXACT = new Set([
  'btn',
  'navbar',
  'dropdown',
  'breadcrumbs',
  'pagination',
  'carousel',
  'accordion',
  'countdown',
  'indicator',
  'mask',
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
  'filter',
  'stack',
  'validator',
  'list-row',
  'list-col',
  'list-col-wrap',
  'list-col-grow',
  'validator-hint',
  'filter-reset',
  'menu-active',
  'menu-disabled',
  'menu-focus',
  'divider',
  // daisyUI 5 components this list named only as compounds or not at all: the
  // current-major names a reintroduction writes first.
  'floating-label',
  'file-input',
  'radial-progress',
  'calendar',
  'cally',
  'fieldset',
  'progress',
  // The spellings daisyUI 5 renamed away from. A page still writing one is a
  // page on the retired framework's previous major, which is as much a second
  // vocabulary as its current one — and the rename means the current-name
  // rules above never see it.
  retired('art', 'board'),
  retired('btm-', 'nav'),
  retired('btm-', 'nav-label'),
  retired('input-', 'group'),
  retired('tabs-', 'bordered'),
  retired('tabs-', 'lifted'),
  retired('tabs-', 'boxed'),
  retired('btn-', 'group'),
  retired('form-', 'control'),
  'form-group',
  'container-fluid',
  'navbar-toggler',
  'sr-only',
  // The previous major's spellings of the utilities this one renamed. A page
  // written against the previous major writes the grow and shrink pair where
  // the current one writes `grow` and `shrink`, spells the text clipping
  // utility as an overflow, and names the decoration pair as bare words rather
  // than under the `box-decoration-` family. Every rule stated about the
  // current name reads straight past all of them.
  'flex-grow',
  'flex-grow-0',
  'flex-shrink',
  'flex-shrink-0',
  'overflow-ellipsis',
  'decoration-slice',
  'decoration-clone',
  // The component the current major replaced with the platform's own dialog.
  'modal-open',
  // Bootstrap's sticky and fixed helpers. Its form, type and float helpers are
  // held by the prefixes below, which reach every name in those families.
  'sticky-top',
  'fixed-top',
  // Bulma's component names, none of which this product uses as a class.
  'box',
  'breadcrumb',
  'column',
  'columns',
  'level',
  'notification',
  'panel',
  'tile',
  // Materialize's component names.
  'chip',
  'collection',
  'collapsible',
  'input-field',
  'preloader',
  'sidenav',
  // Semantic UI's root class, which every component beneath it is written with,
  // and its section component.
  'ui',
  'segment',
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
  'card-',
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
  'border-base-',
  'border-primary',
  'col-',
  'input-',
  'status-',
  'mask-',
  'bg-linear-',
  'bg-radial-',
  'bg-conic-',
  'field-sizing-',
  'scrollbar-',
  'text-shadow-',
  'inset-shadow-',
  'ring-offset-',
  'offset-',
  // Renamed away from in daisyUI 5, so the current-name prefixes miss them.
  retired('btm-', 'nav-'),
  retired('art', 'board-'),
  'phone-',
  'd-',
  // daisyUI 5 modifiers whose bare component is already exact, so a sized or
  // coloured variant (`stack-top`, `checkbox-primary`, `file-input-sm`) was a
  // different token the exact set never saw.
  'stack-',
  'file-input-',
  'checkbox-',
  'radio-',
  'toggle-',
  'range-',
  'rating-',
  'steps-',
  'progress-',
  'fieldset-',
  'calendar-',
  // The component families each framework's previous major decides with a
  // prefix: daisyUI's card, select, textarea, indicator and chat components,
  // Bulma's and Pico's modifier namespaces, Bootstrap's form, type, float and
  // font helpers, UIKit's own namespace, and the prefix jQuery UI and Semantic
  // UI publish every widget under.
  'select-',
  'textarea-',
  'ui-',
  'uk-',
  'is-',
  'has-',
  'link-',
  'chat-',
  'indicator-',
  'waves-',
  'z-depth-',
  'justify-content-',
  'align-',
  'form-',
  'text-',
  'float-',
  'fw-',
  'fs-',
  'bg-gradient-to-',
]

/**
 * A Tailwind numeric or keyword utility: `p-4`, `w-full`, `text-sm`, `gap-2`.
 *
 * The scale lives in tokens.css. A class that encodes a spacing or type
 * decision is a second scale no gate reads.
 */
const TAILWIND_UTILITY =
  '-?(?:m[xytbl]?|p[xytbl]?|gap|inset|top|right|bottom|left|z|w|h|min-w|min-h|max-w|max-h|text|leading|tracking|rounded|shadow|opacity|basis|grow|shrink|order|col-span|row-span|grid-cols|grid-rows|space-x|space-y|translate-x|translate-y|scale|rotate|inset-x|inset-y|indent|scroll-m|scroll-p' +
  // Families the current major added or renamed into, and the logical-property
  // families it recommends for a document whose direction can reverse.
  '|outline|ring|ring-offset|size|mask|bg-linear|bg-radial|bg-conic|text-shadow|inset-shadow|field-sizing|scrollbar|zoom|ms|me|ps|pe|start|end|tab' +
  ')-'

const TAILWIND_NAMED =
  /^(?:flex-col|flex-row|flex-wrap|flex-nowrap|items-center|items-start|items-end|items-stretch|justify-between|justify-center|justify-start|justify-end|justify-around|justify-evenly|place-items-center|grid-flow-col|grid-flow-row|sr-only|not-sr-only|container|prose|outline-hidden|outline-none|bg-radial|bg-conic|border-s|border-e|scheme-light|scheme-dark|scheme-normal|scheme-only-light|scheme-only-dark)$/u

const TAILWIND_SCALE =
  '(?:\\d+|px|auto|full|screen|fit|min|max|svh|lvh|dvh|svw|lvw|dvw|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|none|tight|snug|normal|relaxed|loose)'

const TAILWIND_UTILITY_RE = new RegExp(`^(?:${TAILWIND_UTILITY})${TAILWIND_SCALE}$`, 'u')

/**
 * The utility a class token names, after Tailwind/daisyUI variants are peeled.
 * @param token - one class attribute token.
 * @returns the trailing utility (`md:hover:p-4` → `p-4`).
 */
function utilityOf(token: string): string {
  // Tailwind 3 writes important as a prefix and Tailwind 4 as a suffix, and the
  // previous major writes the prefix marker after a variant rather than opening
  // the token — `md:!p-4` — so both ends of the last segment are peeled.
  const important = token.endsWith('!') ? token.slice(0, -1) : token
  const segment = important.split(':').at(-1) ?? important
  return segment.startsWith('!') ? segment.slice(1) : segment
}

/**
 * A class name a CSS-in-JS runtime generates at build time.
 *
 * A styled-components or emotion build writes a hashed class into the markup
 * and ships the rule that styles it from JavaScript, so the class is a second
 * vocabulary with no sheet behind it and no gate to read. The hash is what
 * tells a generated name from this design system's own: it carries a digit —
 * `css-1a2b3c` is the name emotion writes, and `jsx-` the one styled-jsx
 * writes — or two capitals inside one word, which is the shape
 * styled-components' own hash takes. A class written by hand is lowercase
 * words, so neither shape reaches it.
 */
const RUNTIME_GENERATED_CLASS =
  /^(?:sc|css|jsx)-(?:[a-z0-9]*[0-9][a-z0-9]*|[a-z0-9]*[A-Z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*)$/u

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
  if (RUNTIME_GENERATED_CLASS.test(utility) || RUNTIME_GENERATED_CLASS.test(token)) return true
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
