/**
 * The colour and cascade rules a stylesheet is read against.
 *
 * A colour is a palette decision exactly as a spacing length is a scale
 * decision: a hex or a function-written colour in a sheet is a second source
 * for what tokens.css already names, and two sources drift. The cascade
 * override is refused here too — writing one is refusing to fix the selector
 * that lost, and two overrides race the same way two stacking numbers do.
 *
 * @module
 */

import type { Offence } from './offence.ts'

/** The CSS colour keywords a rule may still read, because they are not colours. */
const KEYWORDS = new Set(['transparent', 'currentcolor'])

/** The CSS named colours, which only the token sheet may write. */
const NAMED = [
  'aliceblue',
  'antiquewhite',
  'aqua',
  'aquamarine',
  'azure',
  'beige',
  'bisque',
  'black',
  'blanchedalmond',
  'blue',
  'blueviolet',
  'brown',
  'burlywood',
  'cadetblue',
  'chartreuse',
  'chocolate',
  'coral',
  'cornflowerblue',
  'cornsilk',
  'crimson',
  'cyan',
  'darkblue',
  'darkcyan',
  'darkgoldenrod',
  'darkgray',
  'darkgreen',
  'darkgrey',
  'darkkhaki',
  'darkmagenta',
  'darkolivegreen',
  'darkorange',
  'darkorchid',
  'darkred',
  'darksalmon',
  'darkseagreen',
  'darkslateblue',
  'darkslategray',
  'darkslategrey',
  'darkturquoise',
  'darkviolet',
  'deeppink',
  'deepskyblue',
  'dimgray',
  'dimgrey',
  'dodgerblue',
  'firebrick',
  'floralwhite',
  'forestgreen',
  'fuchsia',
  'gainsboro',
  'ghostwhite',
  'gold',
  'goldenrod',
  'gray',
  'green',
  'greenyellow',
  'grey',
  'honeydew',
  'hotpink',
  'indianred',
  'indigo',
  'ivory',
  'khaki',
  'lavender',
  'lavenderblush',
  'lawngreen',
  'lemonchiffon',
  'lightblue',
  'lightcoral',
  'lightcyan',
  'lightgoldenrodyellow',
  'lightgray',
  'lightgreen',
  'lightgrey',
  'lightpink',
  'lightsalmon',
  'lightseagreen',
  'lightskyblue',
  'lightslategray',
  'lightslategrey',
  'lightsteelblue',
  'lightyellow',
  'lime',
  'limegreen',
  'linen',
  'magenta',
  'maroon',
  'mediumaquamarine',
  'mediumblue',
  'mediumorchid',
  'mediumpurple',
  'mediumseagreen',
  'mediumslateblue',
  'mediumspringgreen',
  'mediumturquoise',
  'mediumvioletred',
  'midnightblue',
  'mintcream',
  'mistyrose',
  'moccasin',
  'navajowhite',
  'navy',
  'oldlace',
  'olive',
  'olivedrab',
  'orange',
  'orangered',
  'orchid',
  'palegoldenrod',
  'palegreen',
  'paleturquoise',
  'palevioletred',
  'papayawhip',
  'peachpuff',
  'peru',
  'pink',
  'plum',
  'powderblue',
  'purple',
  'rebeccapurple',
  'red',
  'rosybrown',
  'royalblue',
  'saddlebrown',
  'salmon',
  'sandybrown',
  'seagreen',
  'seashell',
  'sienna',
  'silver',
  'skyblue',
  'slateblue',
  'slategray',
  'slategrey',
  'snow',
  'springgreen',
  'steelblue',
  'tan',
  'teal',
  'thistle',
  'tomato',
  'turquoise',
  'violet',
  'wheat',
  'white',
  'whitesmoke',
  'yellow',
  'yellowgreen',
].filter((name) => !KEYWORDS.has(name))

/** A colour written as a literal rather than read from the palette. */
const RAW = new RegExp(
  `#[0-9a-f]{3,8}\\b|\\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\\(|\\b(?:${NAMED.join('|')})\\b`,
  'iu',
)

/** The override flag, assembled so the gate's own source does not carry it. */
const OVERRIDE = ['!', 'important'].join('')

/**
 * The palette and cascade rules one declaration breaks.
 * @param label - the path to report offences under.
 * @param value - the declaration's value, trimmed.
 * @param line - the line the declaration is written on.
 * @returns one offence per rule the value breaks, none when it reads the palette.
 */
export function scanColour(label: string, value: string, line: number): Offence[] {
  const offences: Offence[] = []
  const colour = RAW.exec(value)
  if (colour !== null) {
    offences.push({
      label,
      line,
      why: `${colour[0]} is written out rather than read from the palette in tokens.css`,
    })
  }
  if (value.includes(OVERRIDE)) {
    offences.push({ label, line, why: `an ${OVERRIDE} override wins every cascade; restate the selector instead` })
  }
  return offences
}
