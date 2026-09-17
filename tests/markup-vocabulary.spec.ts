/**
 * The vocabularies a retired framework's *previous* major writes.
 *
 * Every rule the gate states about a framework's current class names reads
 * straight past the names that major renamed away from, and a page still on
 * the previous one writes exactly those. Catching only what is current is
 * catching only what has already been fixed, so each retired spelling is a case
 * here beside its replacement in `markup-gate.spec.ts`.
 *
 * Grounded against the published rename lists: the current daisyUI major
 * renamed its bottom-bar, tab-variant, form-container and card-link components,
 * and removed the drawing-board family and the device-size helpers; Tailwind 4
 * added the logical-property families that spell a side for a document whose
 * direction can reverse, and the colour-scheme utilities.
 *
 * The fixtures below are the spellings this product refuses, so they are
 * written the way `scripts/markup-vocabulary.ts` writes its own table: in two
 * halves. A name this repository refuses is not a name this repository may
 * carry whole, in a suite no less than in a sheet.
 */

import { describe, expect, it } from 'bun:test'
import { retiredClassTokens } from '../scripts/markup-vocabulary.ts'

/**
 * A retired spelling, assembled from two halves.
 * @param head - the first half.
 * @param tail - the second half.
 * @returns the spelling.
 */
const spelled = (head: string, tail: string): string => head + tail

/**
 * The spellings a fixture names, out of one wrapped list.
 * @param written - the spellings, separated by whitespace.
 * @returns the tokens.
 */
const named = (written: string): string[] => written.split(/\s+/u).filter((token) => token !== '')

/**
 * Every class name a retired framework defines as a component of its own.
 *
 * Each is a separate spelling the gate has to refuse: a family reintroduced
 * under one of these names arrives with no other rule to catch it, and the
 * gate's table is the only place the name is written.
 */
const COMPONENTS = named(`btn navbar dropdown breadcrumbs pagination carousel accordion countdown
  indicator mask glass collapse diff fab timeline chat stat steps rating range toggle checkbox
  filter stack validator list-row list-col list-col-wrap list-col-grow validator-hint filter-reset
  menu-active menu-disabled menu-focus divider floating-label file-input radial-progress calendar
  cally fieldset progress container-fluid navbar-toggler sr-only flex-grow flex-grow-0 flex-shrink
  flex-shrink-0 overflow-ellipsis decoration-slice decoration-clone modal-open sticky-top fixed-top
  box breadcrumb column columns level notification panel tile chip collection collapsible input-field
  preloader sidenav ui segment ${spelled('art', 'board')} ${spelled('btm-', 'nav')}
  ${spelled('btm-', 'nav-label')} ${spelled('input-', 'group')} ${spelled('tabs-', 'bordered')}
  ${spelled('tabs-', 'lifted')} ${spelled('tabs-', 'boxed')} ${spelled('btn-', 'group')}
  ${spelled('form-', 'control')} ${spelled('form-', 'group')}`)

/**
 * Every stem a retired framework writes its components under.
 *
 * A stem decides a whole family at once, so the token driven here carries a
 * suffix no other rule reads: the refusal then comes from the stem alone, and a
 * stem that stopped being listed is the token this case sees allowed.
 */
const STEMS = named(`btn- navbar- dropdown- swap- join- tab- tabs- toast- tooltip- skeleton- avatar-
  hero- dock- kbd- badge- alert- loading- mockup- theme- card- modal-box modal-backdrop drawer-side
  drawer-overlay drawer-content menu-title menu-dropdown daisy- bg-primary bg-secondary bg-accent
  bg-neutral bg-base- border-base- border-primary col- input- status- mask- bg-linear- bg-radial-
  bg-conic- field-sizing- scrollbar- text-shadow- inset-shadow- ring-offset- offset- d- stack-
  file-input- checkbox- radio- toggle- range- rating- steps- progress- fieldset- calendar- select-
  textarea- ui- uk- is- has- link- chat- indicator- waves- z-depth- justify-content- align- form-
  text- float- fw- fs- bg-gradient-to- ${spelled('btm-', 'nav-')} ${spelled('art', 'board-')}
  ${spelled('phone-', '')}`)

/** The spacing, sizing and type scales, each spelled as a utility from one family. */
const SCALE_UTILITIES = named(`p-4 m-2 mx-auto gap-6 inset-0 top-1 right-2 bottom-3 left-4 w-full
  h-screen min-w-0 min-h-fit max-w-max max-h-fit text-sm leading-tight tracking-tight rounded-lg
  shadow-none opacity-50 basis-1 grow-0 shrink-0 order-2 col-span-3 row-span-2 space-x-2 space-y-1
  translate-x-4 translate-y-2 scale-95 rotate-45 inset-x-2 inset-y-2 indent-8 scroll-m-4 scroll-p-4
  size-4 ring-2 ring-offset-2 mask-4 bg-linear-2 bg-conic-2 text-shadow-2 inset-shadow-2
  field-sizing-2 scrollbar-2 zoom-110 outline-2 end-4`)

/** The named utilities, which decide layout or type without naming a scale. */
const NAMED_UTILITIES = named(`flex-col flex-row flex-wrap flex-nowrap items-center items-start
  items-end items-stretch justify-between justify-center justify-start justify-end justify-around
  justify-evenly place-items-center grid-flow-col grid-flow-row not-sr-only container prose
  outline-hidden outline-none bg-radial bg-conic border-s border-e scheme-normal scheme-only-light`)

/** A retired framework's earlier spellings, and the logical spellings of a side. */
const EARLIER = named(`ms-4 me-2 ps-6 pe-1 start-0 end-auto border-s border-e scheme-light scheme-dark
  scheme-only-dark ${spelled('btm-', 'nav')} ${spelled('btm-', 'nav-label')}
  ${spelled('btm-', 'nav-sm')} ${spelled('art', 'board')} ${spelled('art', 'board-demo')}
  ${spelled('phone-', '1')} ${spelled('input-', 'group')} ${spelled('tabs-', 'bordered')}
  ${spelled('tabs-', 'lifted')} ${spelled('tabs-', 'boxed')} ${spelled('form-', 'control')}`)

/** The tokens the vocabulary allows, each of which sits beside a refused spelling. */
const ALLOWED = named(`menu-item menu-footer menu-label modal-dialog shell sidebar radio input
  button-primary boxing cssmodules scss jsx css-sheet sc-hooks flex-column notaflex-col xcss-1a
  css-1a-sheet css-A-B`)

/**
 * What the vocabulary makes of each token, paired with the token it judged.
 * @param tokens - the tokens to judge.
 * @returns one pair per token.
 */
function judged(tokens: readonly string[]): [string, string[]][] {
  return tokens.map((token) => [token, retiredClassTokens(token)])
}

/**
 * The verdict each token should reach, stated from the token alone.
 * @param tokens - the tokens to judge.
 * @param refused - whether each one belongs to a retired framework.
 * @returns one pair per token.
 */
function shouldReach(tokens: readonly string[], refused: boolean): [string, string[]][] {
  return tokens.map((token) => [token, refused ? [token] : []])
}

describe('the class vocabulary rejects a retired framework’s earlier spelling', () => {
  it('a daisyUI 4 class, whose name the current major renamed away from', () => {
    // A page still on the previous major writes the previous name, and the
    // rename means every rule stated about the current one reads straight past
    // it. Catching only what is current is catching only what is already fixed.
    expect(judged(EARLIER)).toEqual(shouldReach(EARLIER, true))
  })

  it('a Tailwind logical-property utility, which is how the current major spells a side', () => {
    // The physical families became the logical ones for a document whose
    // direction can reverse. A list written against the physical families alone
    // reads the old spelling and lets the current one through.
    const logical = named('ms-4 me-2 ps-6 pe-1 start-0 end-auto border-s border-e tab-4')
    expect(judged(logical)).toEqual(shouldReach(logical, true))
  })

  it('a Tailwind colour-scheme utility, which decides a palette outside tokens.css', () => {
    const schemes = named('scheme-light scheme-dark scheme-only-dark')
    expect(judged(schemes)).toEqual(shouldReach(schemes, true))
  })
})

describe('the class vocabulary allows this product’s own classes', () => {
  it('which share stems with the retired frameworks', () => {
    const own = named('menu-item menu-footer menu-label modal-dialog shell sidebar radio input')
    expect(judged(own)).toEqual(shouldReach(own, false))
  })
})

describe('the class vocabulary rejects a daisyUI 5 modifier the exact-name list cannot see', () => {
  it('because a modifier is a different token from the bare component', () => {
    // `stack` is exact, so `stack-top` is a different token; `file-input` and
    // `floating-label` are current-major component names this list never
    // carried. Catching only the bare word is catching only the spelling a
    // reintroduction does not have to write.
    const modifiers = named(`stack-top stack-bottom stack-start stack-end file-input file-input-sm
      floating-label radial-progress calendar cally fieldset checkbox-primary radio-sm`)
    expect(judged(modifiers)).toEqual(shouldReach(modifiers, true))
  })
})

describe('the class vocabulary rejects every name a retired framework owns', () => {
  it('refuses each component name, so a reintroduction under one is caught', () => {
    expect(judged(COMPONENTS)).toEqual(shouldReach(COMPONENTS, true))
  })

  it('refuses each stem, so a family is caught by the stem it is written under', () => {
    const suffixed = STEMS.map((stem) => `${stem}zz`)
    expect(judged(suffixed)).toEqual(shouldReach(suffixed, true))
  })

  it('refuses a token carrying a real utility after the stem, which is not the stem itself', () => {
    const suffixed = named('d-block d-none select-none col-2 float-start')
    expect(judged(suffixed)).toEqual(shouldReach(suffixed, true))
  })
})

describe('the class vocabulary reads the utility under the variants around it', () => {
  it('refuses a numeric utility from the spacing, sizing and type scales', () => {
    // The scale lives in tokens.css. Every family is read, so the token is a
    // spacing decision wherever it is written and whichever family spells it.
    expect(judged(SCALE_UTILITIES)).toEqual(shouldReach(SCALE_UTILITIES, true))
  })

  it('refuses a named utility that decides layout or type without a scale', () => {
    expect(judged(NAMED_UTILITIES)).toEqual(shouldReach(NAMED_UTILITIES, true))
  })

  it('refuses the scale under a variant and under the important marker, at either end', () => {
    // Tailwind 3 writes important as a prefix and Tailwind 4 as a suffix, and
    // the previous major writes it after a variant rather than opening the
    // token. Peeling one end and not the other reads the token as a whole word
    // no scale names.
    const dressed = named('md:hover:p-4 !p-4 p-4! md:!p-4 sm:flex-col lg:items-center')
    expect(judged(dressed)).toEqual(shouldReach(dressed, true))
  })

  it('reads the utility under a variant for a token it allows, so peeling is not the rule', () => {
    // The same peeling runs before the vocabulary is consulted, so a variant
    // around this product's own class leaves it allowed.
    const dressed = named('md:menu-item hover:menu-label focus-visible:shell')
    expect(judged(dressed)).toEqual(shouldReach(dressed, false))
  })
})

describe('the class vocabulary rejects a class a CSS-in-JS runtime generated', () => {
  it('by the hash it carries, which no hand-written class has', () => {
    const hashed = named('css-1 css-1a2b3c css-abc1 sc-AbCd jsx-1a css-a1b css-ab2 css-aBcD css-AB')
    expect(judged(hashed)).toEqual(shouldReach(hashed, true))
  })

  it('reading both halves of the hash, so neither shape on its own is the rule', () => {
    // A generated name carries a digit or two capitals inside one word. The
    // prefix alone is not what makes it generated, and a name whose letters
    // merely run together is this design system's own class.
    expect(judged(ALLOWED)).toEqual(shouldReach(ALLOWED, false))
  })

  it('and reads the whole token, so what surrounds the hash decides nothing', () => {
    expect(retiredClassTokens('xcss-1a')).toEqual([])
    expect(retiredClassTokens('css-1a-sheet')).toEqual([])
    expect(retiredClassTokens('css-A-B')).toEqual([])
  })
})

describe('the class vocabulary reads the whole token, not a word inside it', () => {
  it('allows a class whose name merely begins with a retired name', () => {
    // The exact set is a set of whole tokens and the stems are prefixes, so a
    // name that carries the letters is not a name that is owned by anything.
    expect(retiredClassTokens('button-primary')).toEqual([])
    expect(retiredClassTokens('boxing')).toEqual([])
    expect(retiredClassTokens('checkbox-row')).toEqual(['checkbox-row'])
  })

  it('reads a name a token merely ends with as nothing at all', () => {
    expect(retiredClassTokens('flex-column')).toEqual([])
    expect(retiredClassTokens('notaflex-col')).toEqual([])
  })

  it('reads every token a class attribute carries, not only the first', () => {
    expect(retiredClassTokens('shell p-4')).toEqual(['p-4'])
    expect(retiredClassTokens('shell p-4 btn')).toEqual(['p-4', 'btn'])
    expect(retiredClassTokens('  p-4\tbtn  ')).toEqual(['p-4', 'btn'])
  })
})
