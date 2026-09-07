/**
 * The reader a stylesheet is parsed with.
 *
 * Reading a sheet is its own concern: the rules a gate states are stated about
 * declarations and rules, and the same read — comments blanked with offsets
 * preserved, blocks found by following the braces — serves every gate that
 * walks a sheet. Keeping the read here is what keeps one gate's notion of
 * "a rule" from drifting from another's.
 *
 * The read follows brace depth rather than matching innermost brace pairs.
 * A pattern match cannot see a nest: it found the inner rule and swallowed
 * everything before it — the enclosing rule's own declarations included — as
 * part of a selector. So `.a { float: left; .b { color: red } }` reported the
 * nested colour and nothing about the float, and the depth rule read the whole
 * swallowed run as one selector. Nesting is CSS's own syntax, needs no `&`,
 * and was therefore a way past every declaration rule in the gate.
 *
 * @module
 */

import { lineReader } from './lines.ts'

/** Where a comment opens and closes. */
const COMMENTS = /\/\*[\s\S]*?\*\//gu

/** A class selector: a dot and the compound token that names the class. */
const CLASS_TOKEN = /\.([a-zA-Z][a-zA-Z0-9-]*)/gu

/**
 * The sheet with its comments blanked out, offsets preserved.
 *
 * A comment that names a length is prose about the design, not a decision, and
 * a selector written inside one is an example rather than a rule. Blanking
 * rather than deleting keeps every offset, so a line number stays true.
 * @param text - the sheet's contents.
 * @returns the sheet, same length, comments replaced by spaces.
 */
export function withoutComments(text: string): string {
  return text.replaceAll(COMMENTS, (comment) => comment.replaceAll(/[^\n]/gu, ' '))
}

/**
 * One declaration, and where it was written.
 *
 * Read out of the block's body rather than off a line, because one declaration
 * per line is a formatting convention, not a fact: a sheet written or minified
 * onto one line is still a sheet, and a gate that reads lines sees nothing in
 * it at all.
 */
export interface Declaration {
  /** The property name, lower case. */
  readonly property: string
  /** Everything after the colon, trimmed. */
  readonly value: string
  /** One-based line the declaration is written on. */
  readonly line: number
}

/** One brace-delimited block, and what it holds directly. */
export interface Block {
  /** The text before the brace: a selector list, or an at-rule prelude. */
  readonly prelude: string
  /** One-based line the prelude starts on. */
  readonly line: number
  /** Whether the prelude opens an at-rule rather than a style rule. */
  readonly atRule: boolean
  /** Whether a style rule encloses this block, which makes it a nested one. */
  readonly nested: boolean
  /** The declarations written directly in this block, in source order. */
  readonly declarations: readonly Declaration[]
}

/** A block being read: the same block, while its declarations still arrive. */
interface OpenBlock extends Block {
  readonly declarations: Declaration[]
}

/**
 * Read one declaration out of a segment between separators.
 * @param text - the whole sheet.
 * @param from - where the segment starts.
 * @param to - where it ends.
 * @param line - the line reader.
 * @returns the declaration, or undefined when the segment holds none.
 */
function declarationIn(
  text: string,
  from: number,
  to: number,
  line: (offset: number) => number,
): Declaration | undefined {
  const segment = text.slice(from, to)
  const colon = segment.indexOf(':')
  if (colon === -1) return undefined
  const property = segment.slice(0, colon).trim().toLowerCase()
  const value = segment.slice(colon + 1).trim()
  if (property === '' || value === '') return undefined
  return { property, value, line: line(from + segment.indexOf(property)) }
}

/**
 * Where a quoted string ends, so its braces and semicolons are not read as
 * syntax.
 * @param text - the whole sheet.
 * @param start - the offset of the opening quote.
 * @returns the offset just past the closing quote.
 */
function endOfString(text: string, start: number): number {
  const quote = text[start]
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === '\\') index += 1
    else if (text[index] === quote) return index + 1
  }
  return text.length
}

/** What one walk of a sheet found. */
interface Read {
  /** Every block, in the order they open. */
  readonly blocks: Block[]
  /** Every declaration, in source order, whatever block it sits in. */
  readonly declarations: Declaration[]
}

/** One walk in progress: the sheet, where its lines are, and what it has found. */
interface Walk {
  /** The sheet, comments already blanked. */
  readonly sheet: string
  /** Which line an offset falls on. */
  readonly line: (offset: number) => number
  /** The blocks still open, innermost last. */
  readonly stack: OpenBlock[]
  /** What has been read so far. */
  readonly read: Read
}

/**
 * The block a `{` opens, with the prelude that precedes it.
 * @param walk - the walk in progress.
 * @param segment - where the prelude starts.
 * @param index - the offset of the brace.
 * @returns the block, with no declarations in it yet.
 */
function openedBlock(walk: Walk, segment: number, index: number): OpenBlock {
  const prelude = walk.sheet.slice(segment, index)
  return {
    prelude: prelude.trim().replaceAll(/\s+/gu, ' '),
    line: walk.line(segment + (prelude.length - prelude.trimStart().length)),
    atRule: prelude.trimStart().startsWith('@'),
    nested: walk.stack.some((open) => !open.atRule),
    declarations: [],
  }
}

/**
 * Record the declaration a `;` or `}` closes, when it closes one.
 * @param walk - the walk in progress.
 * @param segment - where the declaration starts.
 * @param index - the offset of the separator.
 */
function closeDeclaration(walk: Walk, segment: number, index: number): void {
  const open = walk.stack.at(-1)
  if (open === undefined) return
  const found = declarationIn(walk.sheet, segment, index, walk.line)
  if (found === undefined) return
  open.declarations.push(found)
  walk.read.declarations.push(found)
}

/**
 * Walk a sheet's braces, collecting its blocks and its declarations.
 *
 * One walk serves both readers, so a block and a declaration can never be
 * found by two different notions of where a rule ends.
 * @param text - the sheet's contents.
 * @returns the blocks and the declarations.
 */
function scan(text: string): Read {
  const sheet = withoutComments(text)
  const walk: Walk = { sheet, line: lineReader(sheet), stack: [], read: { blocks: [], declarations: [] } }
  let segment = 0
  for (let index = 0; index < sheet.length; index += 1) {
    const character = sheet[index]
    if (character === '"' || character === "'") {
      index = endOfString(sheet, index) - 1
      continue
    }
    if (character === '{') {
      const block = openedBlock(walk, segment, index)
      walk.stack.push(block)
      walk.read.blocks.push(block)
      segment = index + 1
      continue
    }
    if (character !== ';' && character !== '}') continue
    closeDeclaration(walk, segment, index)
    segment = index + 1
    // Popping an empty stack is a no-op, so the brace alone decides: stating
    // the same guard twice is one statement that can be deleted unnoticed.
    if (character === '}') walk.stack.pop()
  }
  return walk.read
}

/**
 * Every brace-delimited block a sheet holds, in the order they open.
 * @param text - the sheet's contents.
 * @returns one entry per block, with the declarations written directly in it.
 */
export function blocksOf(text: string): Block[] {
  return scan(text).blocks
}

/** A rule's selector list and the declarations it holds, normalized. */
export interface Ruleset {
  /** The selectors, comma-separated as written, with whitespace collapsed. */
  readonly selector: string
  /** The declarations, in source order, with whitespace collapsed. */
  readonly body: string
  /** One-based line the selector opens on. */
  readonly line: number
  /** Whether a style rule encloses this one. */
  readonly nested: boolean
}

/**
 * Every rule a sheet declares, with its comments stripped.
 *
 * Read so that two rules with the same selector and the same declarations can
 * be found: the token sheet carried the same four-line block twice, fifty-five
 * lines apart, each with its own paragraph explaining why it was needed, and
 * every gate that read the sheet read right past it.
 * @param text - the sheet's contents.
 * @returns one entry per rule, in source order.
 */
export function rulesetsOf(text: string): Ruleset[] {
  return blocksOf(text)
    .filter((block) => !block.atRule && block.prelude !== '' && block.declarations.length > 0)
    .map((block) => ({
      selector: block.prelude,
      body: block.declarations.map((one) => `${one.property}: ${one.value}`).join('; '),
      line: block.line,
      nested: block.nested,
    }))
}

/**
 * Every declaration a sheet holds, in source order.
 * @param text - the sheet's contents, comments already blanked.
 * @returns the declarations.
 */
export function declarationsOf(text: string): Declaration[] {
  return scan(text).declarations
}

/**
 * Every class name a sheet's selectors name.
 *
 * The set is the shipped class vocabulary: the one place a class is given
 * meaning. A class a stylesheet never names carries no style and no reviewer,
 * so markup or script that writes one is shipping a decision outside the
 * design system.
 * @param text - the sheet's contents.
 * @returns the class names, in the order first written, duplicates removed.
 */
export function classTokensOf(text: string): string[] {
  const found: string[] = []
  for (const block of blocksOf(text)) {
    if (block.atRule) continue
    // Every captured group of every match, which is one group: reading it by
    // index needs a guard for a case the pattern cannot produce, and a guard
    // for an impossible case is a line no test can ever reach.
    found.push(...[...block.prelude.matchAll(CLASS_TOKEN)].flatMap((match) => [...match].slice(1)))
  }
  return [...new Set(found)]
}
