/**
 * Reading Rust attributes, for the bans that are stated about them.
 *
 * Rust has no parser in this repository, so its attributes are read as text.
 * What makes that safe is reading each attribute to the bracket that closes it:
 * a search that instead ran a fixed distance forward from `#[` left the
 * attribute entirely, and `#[cfg(test)]` followed by a `.expect(…)` a few lines
 * down read as a lint suppression, so every Rust test module was an offence and
 * the gate was red on a clean tree.
 *
 * @module
 */

/** Where a Rust character literal opens, so a bracket inside one is not counted. */
const CHARACTER = /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy

/** Where a Rust raw string opens, capturing the hashes its close must repeat. */
const RAW_STRING = /b?r(#*)"/uy

/** Where a plain or byte Rust string opens. */
const STRING = /b?"/uy

/** Where a Rust attribute opens, outer (`#[`) or inner (`#![`). */
const ATTRIBUTE = /#!?\[/gu

/**
 * A lint level named where an attribute names one.
 *
 * `allow` and `expect` are read as path segments, which is the only place a
 * lint level can be written. The lookbehind is what separates the attribute
 * `#[expect(dead_code)]` from the method call `.expect("a fresh table")`: the
 * call is reached through a dot, and a lint level never is.
 */
export const LINT_LEVEL = /(?<![\p{L}\p{N}_.])(?:allow|expect)\s*\(/u

/**
 * The offset just past the Rust literal starting at `cursor`, or undefined.
 *
 * A bracket inside a string closes no attribute, so literals are what the
 * bracket walk steps over rather than counts. Rust writes them plain (`"…"`),
 * raw with any number of hashes (`r#"…"#`), byte-prefixed (`b"…"`, `br#"…"#`),
 * and as characters (`'x'`). A lone `'` with no closing quote is a lifetime,
 * which carries no brackets, so it is left to the walk.
 * @param text - the file's contents.
 * @param cursor - the offset to read from.
 * @returns the offset just past the literal, or undefined when none opens here.
 */
function literalEnd(text: string, cursor: number): number | undefined {
  CHARACTER.lastIndex = cursor
  const character = CHARACTER.exec(text)
  if (character !== null) return cursor + character[0].length
  RAW_STRING.lastIndex = cursor
  const raw = RAW_STRING.exec(text)
  if (raw !== null) {
    const close = `"${raw[1] ?? ''}`
    const closed = text.indexOf(close, cursor + raw[0].length)
    return closed === -1 ? text.length : closed + close.length
  }
  STRING.lastIndex = cursor
  const plain = STRING.exec(text)
  if (plain === null) return undefined
  let scan = cursor + plain[0].length
  while (scan < text.length) {
    if (text[scan] === '\\') {
      scan += 2
      continue
    }
    if (text[scan] === '"') return scan + 1
    scan += 1
  }
  return text.length
}

/** One Rust attribute, read to the bracket that closes it. */
export interface RustAttribute {
  /** Offset of the opening `#`. */
  readonly start: number
  /**
   * What the brackets hold, with literals blanked out so a lint name written
   * inside a doc string is not read as a lint level; undefined when no bracket
   * closes the attribute, which is a file this reader cannot check.
   */
  readonly held: string | undefined
}

/**
 * Every Rust attribute in a file, in source order.
 *
 * Brackets nest — `cfg_attr(all(), allow(dead_code))` is one attribute holding
 * another — so the walk counts them, and steps over literals so a bracket
 * written inside a string is not counted as one.
 * @param text - the file's contents.
 * @returns one entry per attribute.
 */
export function rustAttributes(text: string): RustAttribute[] {
  const attributes: RustAttribute[] = []
  for (const opened of text.matchAll(ATTRIBUTE)) {
    let cursor = opened.index + opened[0].length
    let depth = 1
    let held = ''
    while (cursor < text.length && depth > 0) {
      const literal = literalEnd(text, cursor)
      if (literal !== undefined) {
        held += ' '.repeat(literal - cursor)
        cursor = literal
        continue
      }
      const character = text[cursor] ?? ''
      if (character === '[') depth += 1
      else if (character === ']') depth -= 1
      if (depth > 0) held += character
      cursor += 1
    }
    attributes.push({ start: opened.index, held: depth === 0 ? held : undefined })
  }
  return attributes
}
