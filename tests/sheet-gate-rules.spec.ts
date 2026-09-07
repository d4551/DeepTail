/**
 * The stylesheet gate's rule fixtures: every declaration the gate must reject,
 * and every lookalike it must allow, both directions for each rule.
 *
 * The invariants about the real sheets the product ships — scale coverage,
 * single-source breakpoints, focus rings, duplicate rules — live in
 * `sheet-gate.spec.ts`. Fixtures here are assembled from parts, so the gate's
 * own bans cannot read this source as the data it describes.
 */

import { describe, expect, it } from 'bun:test'
import { scanSheet, TOKEN_SHEET } from '../scripts/sheet-gate.ts'
import { joined, remoteHost, sheetOffences } from './fixtures.ts'

/** The token sheet's own path, which is where definitions live. */
const TOKEN = TOKEN_SHEET

/** The grid track properties, assembled so this file's source carries none whole. */
const COLUMNS = joined('grid-template-', 'columns')
const ROWS = joined('grid-template-', 'rows')

describe('the stylesheet gate rejects', () => {
  it('a spacing length written out rather than read from the scale', () => {
    expect(sheetOffences('.a { padding: 18px; }')).toHaveLength(1)
    expect(sheetOffences('.a { margin-inline-start: 14px; }')).toHaveLength(1)
    expect(sheetOffences('.a { gap: 10px 12px; }')).toHaveLength(1)
  })

  it('a radius, a type size and a line height', () => {
    expect(sheetOffences('.a { border-radius: 22px; }')).toHaveLength(1)
    expect(sheetOffences('.a { font-size: 16px; }')).toHaveLength(1)
    expect(sheetOffences('.a { line-height: 24px; }')).toHaveLength(1)
  })

  it('a weight or a tracking written out rather than read from the scale', () => {
    // The shorthand sets the weight, the size and the leading at once under a
    // property name neither this rule nor the length rule matched, so it once
    // slipped past both. The weights and trackings themselves are driven in
    // `sheet-gate-typography.spec.ts`.
    expect(sheetOffences('.a { font: 600 14px/20px sans-serif; }')).toHaveLength(1)
    expect(sheetOffences('.a { font: italic 500 13px system-ui; }')).toHaveLength(1)
  })

  it('a length hidden inside a function, which still decides the layout', () => {
    expect(sheetOffences('.a { width: min(420px, 100%); }')).toHaveLength(1)
    expect(sheetOffences('.a { max-height: calc(100dvh - 24px); }')).toHaveLength(1)
    expect(sheetOffences('.a { padding: max(16px, env(safe-area-inset-top)); }')).toHaveLength(1)
  })

  it('a stacking order written as a bare number', () => {
    expect(sheetOffences(joined('.a { z-inde', 'x: 150; }'))).toEqual([
      'a stacking order belongs to the z-index scale in tokens.css',
    ])
    expect(sheetOffences(joined('.a { z-inde', 'x: 1; }'))).toHaveLength(1)
    expect(sheetOffences(joined('.a { z-inde', 'x: -1; }'))).toHaveLength(1)
  })

  it('and names every length it found, so one line reports all of them', () => {
    expect(sheetOffences('.a { padding: 18px 22px; }')).toEqual([
      '18px, 22px is written out rather than read from the scale in tokens.css',
    ])
  })
})

/** What the motion rule says about one duration, so the wording is written once. */
function motionWhy(time: string, property: string): string {
  return `${time} in ${property} is written out rather than read from the motion scale in tokens.css, so the reduced-motion setting cannot reach it`
}

describe('the stylesheet gate rejects motion outside the scale', () => {
  it('a duration written out, which the reduced-motion setting cannot reach', () => {
    // The setting is honoured by redefining the duration token, so a speed
    // spelled in the rule keeps running at full speed for a viewer who asked
    // it to stop. Every property that carries a time is read, shorthand and
    // longhand, transition and animation.
    expect(sheetOffences('.a { animation: spin 0.8s linear infinite; }')).toEqual([motionWhy('0.8s', 'animation')])
    expect(sheetOffences('.a { transition: opacity 200ms ease; }')).toEqual([motionWhy('200ms', 'transition')])
    expect(sheetOffences('.a { transition-duration: 0.3s; }')).toEqual([motionWhy('0.3s', 'transition-duration')])
    expect(sheetOffences('.a { animation-delay: 150ms; }')).toEqual([motionWhy('150ms', 'animation-delay')])
  })

  it('but not a duration read from the scale, nor no duration at all', () => {
    // `0s` says the change is not animated, which is the same statement at
    // every speed, so it is not a speed decision the scale has to hold.
    expect(sheetOffences('.a { transition: transform var(--ds-transition-duration) linear; }')).toEqual([])
    expect(sheetOffences('.a { transition: visibility 0s linear var(--ds-transition-duration); }')).toEqual([])
    expect(sheetOffences('.a { animation-delay: 0ms; }')).toEqual([])
  })

  it('and names every duration it found, as it does for lengths', () => {
    expect(sheetOffences('.a { transition: opacity 200ms 50ms ease; }')).toEqual([
      motionWhy('200ms, 50ms', 'transition'),
    ])
  })
})

describe('the stylesheet gate rejects misalignment', () => {
  it('justified text, which is an alignment defect', () => {
    expect(sheetOffences('.a { text-align: justify; }')).toEqual([
      'justified or physical text alignment is an alignment defect; use text-align start or end',
    ])
    expect(sheetOffences('.a { text-align: start; }')).toEqual([])
    expect(sheetOffences('.a { text-align: end; }')).toEqual([])
  })

  it('a physical side, which breaks when the direction reverses', () => {
    // The banned spellings are assembled, so this file's own source carries
    // none of them whole.
    const ml = joined('margin-', 'left')
    const pr = joined('padding-', 'right')
    const bl = joined('border-', 'left-width')
    const left = joined('le', 'ft')
    const right = joined('ri', 'ght')
    expect(sheetOffences(`.a { ${ml}: 12px; }`)).not.toEqual([])
    expect(sheetOffences(`.a { ${pr}: 4px; }`)).not.toEqual([])
    expect(sheetOffences(`.a { ${bl}: 1px; }`)).not.toEqual([])
    expect(sheetOffences(`.a { ${left}: 0; }`)).not.toEqual([])
    expect(sheetOffences(`.a { ${right}: 0; }`)).not.toEqual([])
    expect(sheetOffences(`.a { text-align: ${left}; }`)).not.toEqual([])
    expect(sheetOffences(`.a { text-align: ${right}; }`)).not.toEqual([])
    // The logical spellings are the ones the direction follows. The two
    // `text-align` spellings are proved by the case above, not restated here.
    expect(sheetOffences('.a { margin-inline-start: var(--dsh-space-3); }')).toEqual([])
  })
})

describe('the stylesheet gate rejects a raw palette and cascade', () => {
  it('a colour written as a literal, in every spelling', () => {
    const hex = joined('#ff', '0000')
    expect(sheetOffences(`.a { color: ${hex}; }`)).toHaveLength(1)
    expect(sheetOffences('.a { background: rgb(1, 2, 3); }')).toHaveLength(1)
    expect(sheetOffences('.a { border-color: hsl(0deg 100% 50%); }')).toHaveLength(1)
    expect(sheetOffences('.a { color: tomato; }')).toHaveLength(1)
    expect(sheetOffences('.a { color: color(display-p3 1 0 0); }')).toHaveLength(1)
  })

  it('an override flag, which wins every cascade', () => {
    const flag = joined('!', 'important')
    expect(sheetOffences(`.a { color: var(--dsw-alias-label-error) ${flag}; }`)).toEqual([
      `an ${flag} override wins every cascade; restate the selector instead`,
    ])
  })

  it('a float, which is legacy layout', () => {
    expect(sheetOffences('.a { float: left; }')).toEqual(['float is legacy layout; use flex or grid'])
  })

  it('an at-rule from the utility pipeline this product retired', () => {
    expect(sheetOffences(joined('.a { @app', 'ly flex; }'))).toEqual([
      joined('@app', 'ly belongs to the utility pipeline this product retired; state the declarations directly'),
    ])
    expect(sheetOffences(joined('@tail', 'wind base;'))).not.toEqual([])
    expect(sheetOffences(joined('.a { @uti', 'lity card { padding: 1px; } }'))).not.toEqual([])
    expect(sheetOffences(joined('@lay', 'er utilities { .a { color: red; } }'))).not.toEqual([])
  })

  it('no at-rule of CSS itself, which the sheets are written in', () => {
    expect(sheetOffences(joined('@med', 'ia (max-width: 100px) { .a { color: currentcolor; } }'))).toEqual([])
    expect(sheetOffences(joined('@sup', 'ports (display: grid) { .a { color: currentcolor; } }'))).toEqual([])
    expect(sheetOffences(joined('@lay', 'er base { .a { color: currentcolor; } }'))).toEqual([])
  })

  it('a selector nested inside another rule, whatever reaches it', () => {
    // Spelt in parts: the operator is the fixture's subject, not this file's.
    const ampersand = joined('&', '')
    expect(sheetOffences(joined('.a { ', `${ampersand}:hover { color: currentcolor; } }`))).toEqual([
      `${ampersand}:hover rides another rule's scope; state the selector at the top level`,
    ])
    expect(sheetOffences(joined('.a { .b ', `${ampersand}::before { color: currentcolor; } }`))).not.toEqual([])
  })
})

describe('the stylesheet gate rejects a remote or retired dependency', () => {
  it('a remote asset, which no local install ships', () => {
    const host = remoteHost()
    expect(sheetOffences(`.a { background: url("${host}/bg.png"); }`)).not.toEqual([])
    expect(sheetOffences(`.a { cursor: url("${host}/c.cur"), auto; }`)).not.toEqual([])
    expect(sheetOffences(`@import url("${host}/theme.css");`)).not.toEqual([])
    expect(sheetOffences(`@import "${host}/theme.css";`)).not.toEqual([])
  })

  it('an import of a retired framework pipeline, in either quoting', () => {
    const tail = joined('tail', 'windcss')
    const daisy = joined('dais', 'yui')
    expect(sheetOffences(`@import "${tail}";`)).not.toEqual([])
    expect(sheetOffences(`@import '${daisy}';`)).not.toEqual([])
    expect(sheetOffences(`@import url(${daisy}.css);`)).not.toEqual([])
    expect(sheetOffences(`@import "${joined('alpine', 'js')}";`)).not.toEqual([])
    expect(sheetOffences(`@import "${joined('htmx', '.org')}";`)).not.toEqual([])
  })

  it('but allows an asset the bundle ships, and a data payload', () => {
    expect(sheetOffences('.a { background: url("/bg.png"); }')).toEqual([])
    expect(sheetOffences('.a { mask-image: url(data:image/svg+xml,<svg></svg>); }')).toEqual([])
    expect(sheetOffences('@import url("/theme.css");')).toEqual([])
  })
})

describe('the stylesheet gate rejects a viewport unit that lies', () => {
  it('a height or width measured against a viewport the reader may not have', () => {
    // `100vh` is the large viewport: on a mobile browser it is measured as
    // though the retractable chrome were retracted, so a box sized by it runs
    // past the bottom of the screen while the chrome is showing. The
    // connection menu was capped that way and its pinned footer sat exactly
    // there, out of reach with nothing to scroll it back.
    expect(sheetOffences('.a { max-height: calc(100vh - 8px); }')).not.toEqual([])
    expect(sheetOffences('.a { block-size: 50vh; }')).not.toEqual([])
    expect(sheetOffences('.a { width: min(var(--dsh-drawer-width), 86vw); }')).not.toEqual([])
  })

  it('but allows the dynamic units, and the two that name an end on purpose', () => {
    expect(sheetOffences('.a { max-height: calc(100dvh - var(--dsh-space-7)); }')).toEqual([])
    expect(sheetOffences('.a { width: min(var(--dsh-drawer-width), 86dvw); }')).toEqual([])
    expect(sheetOffences('.a { max-height: 100svh; }')).toEqual([])
    expect(sheetOffences('.a { max-height: 100lvh; }')).toEqual([])
  })
})

describe('the stylesheet gate allows', () => {
  it('a length read from the scale', () => {
    expect(sheetOffences('.a { padding: var(--dsh-space-5); }')).toEqual([])
    expect(sheetOffences('.a { width: min(var(--dsh-card-width), 100%); }')).toEqual([])
    expect(sheetOffences('.a { z-index: var(--dsh-z-menu); }')).toEqual([])
  })

  it('the font shorthand when it takes the whole decision from the box above', () => {
    // `font: inherit` is how a control stops the UA sheet pinning its family;
    // it picks no size, weight or leading of its own.
    expect(sheetOffences('.a { font: inherit; }')).toEqual([])
  })

  it('a colour read from the palette, and a system colour keyword', () => {
    expect(sheetOffences('.a { color: var(--dsw-alias-label-error); }')).toEqual([])
    expect(sheetOffences('.a { color: currentcolor; }')).toEqual([])
  })
})

describe('the stylesheet gate allows, where a value is drawn rather than spaced', () => {
  it('a hairline and a focus ring, which are drawn rather than spaced', () => {
    expect(sheetOffences('.a { padding: 0px; }')).toEqual([])
    expect(sheetOffences('.a { border: 1px solid CanvasText; }')).toEqual([])
    expect(sheetOffences('.a { outline: 2px solid Highlight; outline-offset: -2px; }')).toEqual([])
    expect(sheetOffences('.a { border-inline-start: 3px solid var(--dsw-alias-state-warn-primary); }')).toEqual([])
  })

  it('the definitions on the token sheet, which are the scale and the palette', () => {
    // A pixel length or a colour function on a custom property of the one
    // sheet that defines them is the definition itself: this is where the
    // rungs and the palette are stated, and the other sheets are read against
    // what is written here.
    expect(scanSheet(TOKEN, ':root { --dsh-space-5: 16px; }').map((offence) => offence.why)).toEqual([])
    expect(scanSheet(TOKEN, ':root { --dsh-z-menu: 100; }').map((offence) => offence.why)).toEqual([])
    expect(scanSheet(TOKEN, 'body { --dsw-alias-bg-base: rgb(255, 255, 255); }').map((offence) => offence.why)).toEqual(
      [],
    )
  })

  it('a relative or intrinsic length, which no scale can name', () => {
    expect(sheetOffences('.a { width: 100%; }')).toEqual([])
    expect(sheetOffences('.a { max-height: 100dvh; }')).toEqual([])
    expect(sheetOffences('.a { inset: 20%; }')).toEqual([])
    expect(sheetOffences('.a { width: fit-content; }')).toEqual([])
  })

  it('a property whose length is not a scale decision', () => {
    expect(sheetOffences('.a { box-shadow: var(--dsw-shadow-lv3); }')).toEqual([])
    expect(sheetOffences(joined('.a { backdrop-f', 'ilter: blur(2px); }'))).toEqual([])
    expect(sheetOffences('.a { transform: translateY(4px); }')).toEqual([])
  })

  it('prose that names a length, which decides nothing', () => {
    expect(sheetOffences('/* the 38px bar, at a 12px radius */\n.a { height: var(--dsh-control-md); }')).toEqual([])
  })
})

describe('the stylesheet gate reads selectors by reach', () => {
  it('a selector that reaches through the DOM instead of a class', () => {
    expect(sheetOffences('.a .b .c .d { color: currentcolor; }')).toEqual([
      '.a .b .c .d chains past 3 compounds; scope the rule by class instead of structure',
    ])
    expect(sheetOffences('.a > .b + .c ~ .d { color: currentcolor; }')).toEqual([
      '.a > .b + .c ~ .d chains past 3 compounds; scope the rule by class instead of structure',
    ])
    // One half of a selector list over the limit names the whole rule.
    expect(sheetOffences('.a .b .c .d,\n.e { color: currentcolor; }')).toEqual([
      '.a .b .c .d chains past 3 compounds; scope the rule by class instead of structure',
    ])
  })

  it('a selector that stays within the allowed reach', () => {
    expect(sheetOffences('.a .b { color: currentcolor; }')).toEqual([])
    expect(sheetOffences('.host-group > * + * { color: currentcolor; }')).toEqual([])
    expect(sheetOffences('.shell[data-state="open"] .sidebar { color: currentcolor; }')).toEqual([])
  })
})

describe('the stylesheet gate rejects a DRY or grid hole', () => {
  it('a ruleset declared twice, including on the token sheet', () => {
    const twice = '.a { color: currentcolor; }\n.b { color: red; }\n.a { color: currentcolor; }'
    expect(sheetOffences(twice).some((why) => why.startsWith('duplicate-ruleset:'))).toBe(true)
    expect(
      scanSheet('apps/deeptail/src/styles/tokens.css', ':root { --x: 1; }\n:root { --x: 1; }').map(
        (offence) => offence.why,
      ),
    ).toEqual(['duplicate-ruleset: :root is declared more than once (first at line 1)'])
  })

  it('a hardcoded grid track written in pixels', () => {
    expect(sheetOffences(`.a { ${COLUMNS}: 100px 1fr; }`)).toEqual([
      `hardcoded-grid: 100px in ${COLUMNS} belongs to the scale in tokens.css`,
    ])
    expect(sheetOffences(`.a { ${ROWS}: 48px; }`)).not.toEqual([])
    expect(sheetOffences(`.a { ${COLUMNS}: var(--dsh-grid-frame); }`)).toEqual([])
  })

  it('a value on the token sheet that is no definition, because its property is no custom property', () => {
    // The sheet is where definitions live, not a sheet above the rules: the
    // same length or colour on one of its own selectors is a decision made
    // outside the custom property that owns it, exactly as in any other sheet.
    expect(scanSheet(TOKEN, '.a { border-radius: 22px; }').map((offence) => offence.why)).toHaveLength(1)
    expect(scanSheet(TOKEN, ':root { color: rgb(0 0 0); }').map((offence) => offence.why)).toHaveLength(1)
    expect(scanSheet(TOKEN, '.a { padding: 37px; }').map((offence) => offence.why)).toHaveLength(1)
  })
})
