/**
 * The chrome fixture the paint suites drive, and the helpers that plant defects
 * into it.
 *
 * A fixture rather than the paint itself, because a planted defect is an edit
 * to one part of the chrome: reading the real paint would make every case
 * answer for whatever the factories happen to draw today. The defects are
 * assembled from parts, so this file's own source carries none of them whole.
 *
 * @module
 */

import { EMPTY_ROOT, firstPaintMarkup } from '../scripts/paint-index.ts'
import { joined } from './fixtures.ts'

/** A style attribute, assembled so this file does not carry one whole. */
export const STYLED = joined(' class="shell" st', 'yle="color: red"')

/** A presentational element the platform retired, assembled the same way. */
export const PRESENTATIONAL = joined('<mar', 'quee>a</mar', 'quee>')

/** An inline script, assembled so this file does not carry one whole. */
export const INLINE_SCRIPT = joined('<scr', 'ipt></scr', 'ipt>')

/** A second external module entry, which a page may carry only one of. */
export const SECOND_ENTRY = '<script type="module" src="./other.js"></script>'

/** The opening of the one mount a page carries. */
const MOUNT = '<div id="root">'

/** The one mount, carrying one thing and closed. */
export const mountOf = (content: string): string => `${MOUNT}${content}</div>`

/** The shell's own title element, which the contract reads by name. */
export const TITLE_ELEMENT = '<h1 class="main-title">Sessions</h1>'

/** The reading region the shell opens. */
export const READING_REGION = '<main class="main">'

/**
 * The chrome the painter seats, shaped the way the shell factories paint it.
 */
export const CHROME = [
  '<div class="shell" data-deeptail-shell="" data-drawer="closed">',
  '<div class="drawer-scrim"></div>',
  '<nav class="sidebar" aria-label="Session navigation" id="deeptail-sidebar">',
  '<button class="drawer-dismiss" type="button" hidden="">Hide the session list</button>',
  '<div class="brand-row"><span class="brand-name">DEEPTAIL</span></div>',
  '</nav>',
  READING_REGION,
  '<div class="main-header">',
  '<button class="drawer-toggle" type="button" aria-expanded="false" aria-controls="deeptail-sidebar">Show</button>',
  TITLE_ELEMENT,
  '</div>',
  '<div class="main-body"><div class="placeholder">Choose a session.</div></div>',
  '<div class="visually-hidden" role="status" aria-live="polite"></div>',
  '</main>',
  '</div>',
].join('')

/** The one mount with that chrome seated in it. */
export const SEATED = mountOf(CHROME)

/**
 * The page Vite writes around one body.
 * @param body - the body's content, verbatim.
 * @returns the built page.
 */
function pageWith(body: string): string {
  return [
    '<!doctype html>',
    '<html lang="en">',
    '  <head>',
    '    <meta charset="utf-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1" />',
    '    <title>DeepTail</title>',
    '    <script type="module" crossorigin src="./assets/index.js"></script>',
    '    <link rel="stylesheet" crossorigin href="./assets/index.css">',
    '  </head>',
    '  <body>',
    `    ${body}`,
    '  </body>',
    '</html>',
  ].join('\n')
}

/** The page as Vite leaves it: the mount empty, for the painter to seat. */
export const VITE_PAGE = pageWith(EMPTY_ROOT)

/** The page as the painter stamps it: the mount carrying the chrome. */
export const PAGE = pageWith(SEATED)

/**
 * One string with one part of it replaced, refusing a fixture that no longer
 * carries the part a case plants against.
 * @param text - the text to edit.
 * @param from - the part to replace, which must be there.
 * @param to - what to replace it with.
 * @returns the edited text.
 */
export function planted(text: string, from: string, to: string): string {
  if (!text.includes(from)) throw new Error(`deeptail: the fixture no longer carries ${from}`)
  return text.replace(from, to)
}

/** The chrome the factories paint now, for the byte-for-byte shipped-page case. */
export const FACTORY_CHROME = firstPaintMarkup()
