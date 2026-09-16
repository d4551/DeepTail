/**
 * The declaration reader the faces go through.
 *
 * A tool that ships type declarations states what it superseded in the
 * `@deprecated` text above a member, so every face that refuses a superseded
 * API reads that text out of the installed release's own declarations: the
 * Tauri config face in `compiler-face.ts`, and the Playwright face in
 * `tests/playwright-face.ts`.
 *
 * @module
 */

/** One member a declaration declares. */
export interface Declared {
  /** The `@deprecated` text above it, or undefined when it carries none. */
  readonly deprecated: string | undefined
  /** The declaration named as its type, when its type names one. */
  readonly named: string | undefined
}

/** One declaration, as it is read before the ones it extends are merged in. */
interface Declaration {
  /** The members it declares itself, keyed by path. */
  readonly members: Map<string, Declared>
  /** The declarations it extends or intersects, which are merged into it. */
  readonly parents: readonly string[]
}

/** Where the reader is as it walks a declaration file. */
interface Reading {
  /** The declaration it is inside, or undefined between declarations. */
  current: Declaration | undefined
  /** Whether a declaration comment is still open. */
  doc: boolean
  /** Whether the `@deprecated` sentence it is reading runs onto the next line. */
  joining: boolean
  /** The `@deprecated` text read above the member the next line declares. */
  deprecated: string | undefined
  /** How deep inside the current declaration, and its nested objects, it is. */
  depth: number
  /** The member path each open object literal is written under, by depth. */
  readonly open: Map<number, string>
  /** Every declaration read so far. */
  readonly read: Map<string, Declaration>
}

/** The marker a superseded declaration carries. */
const DEPRECATED = '@deprecated'

/** A declaration header: its name, and what follows up to its opening brace. */
const DECLARATION = /^(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)([^{}]*)\{/u

/** A member declaration: its name, and the annotation that follows it. */
const MEMBER_LINE = /^(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*\??\s*[:(<]/u

/** A member whose type names one declaration, which a walk can follow. */
const NAMED_TYPE = /:\s*([A-Za-z_$][\w$]*)\s*(?:\|.+)?;?\s*$/u

/** The `@deprecated` text one line of a declaration comment carries. */
function markerText(line: string): string | undefined {
  const at = line.indexOf(DEPRECATED)
  if (at === -1) return undefined
  return line
    .slice(at + DEPRECATED.length)
    .replace(/\*\/\s*$/u, '')
    .trim()
}

/** How many times a character occurs in a line. */
function occurrences(line: string, character: string): number {
  return [...line].filter((found) => found === character).length
}

/** The declarations a header extends or intersects: every name it states, with
 * the quoted ones dropped, because `interface X extends A` and `type X = Omit<A,
 * "b"> & C &` name the same thing. */
function parentNames(head: string): string[] {
  const unquoted = head.replaceAll(/"[^"]*"|'[^']*'/gu, ' ')
  return [...unquoted.matchAll(/[A-Za-z_$][\w$]*/gu)].map((found) => found[0])
}

/** Opens the declaration a header line announces, leaving the reader inside it. */
function openDeclaration(state: Reading, line: string): void {
  const header = DECLARATION.exec(line)
  if (header?.[1] === undefined || occurrences(line, '{') <= occurrences(line, '}')) return
  state.current = { members: new Map(), parents: parentNames(header[2] ?? '') }
  state.read.set(header[1], state.current)
  state.depth = 0
  state.open.clear()
}

/**
 * Reads one line inside a declaration: the member it declares, at the depth it
 * is written at, and the nesting that closes after it.
 *
 * A declaration or a nested object closes wherever its closing brace sits, and a
 * line that closes more braces than it opens can carry the rest of a type after
 * it — `} & Other;` closes the declaration with text to spare.
 * @param state - where the reader is.
 * @param current - the declaration the line is inside.
 * @param line - the trimmed line.
 */
function readMemberLine(state: Reading, current: Declaration, line: string): void {
  const opens = occurrences(line, '{')
  const closes = occurrences(line, '}')
  if (closes <= opens) {
    const name = MEMBER_LINE.exec(line.replace(/^readonly\s+/u, ''))?.[1]
    if (name !== undefined) {
      const prefix = state.depth === 0 ? '' : (state.open.get(state.depth - 1) ?? '')
      const path = prefix === '' ? name : `${prefix}.${name}`
      current.members.set(path, { deprecated: state.deprecated, named: NAMED_TYPE.exec(line)?.[1] })
      state.deprecated = undefined
      if (opens > closes) state.open.set(state.depth, path)
    }
  }
  state.depth += opens - closes
  for (const level of state.open.keys()) if (level >= state.depth) state.open.delete(level)
  if (state.depth < 0) {
    state.current = undefined
    state.open.clear()
    state.depth = 0
  }
}

/**
 * Reads one trimmed line of a declaration file into the state: the comment it
 * opens or continues, the declaration it announces, or the member it declares.
 * @param state - where the reader is.
 * @param line - the trimmed line.
 */
function readDeclarationLine(state: Reading, line: string): void {
  if (line.startsWith('/**')) {
    state.deprecated = markerText(line)
    state.joining = state.deprecated !== undefined
    state.doc = !line.includes('*/')
    return
  }
  if (state.doc) {
    const marker = markerText(line)
    if (marker !== undefined) {
      state.deprecated = marker
      state.joining = true
    } else if (state.joining) {
      const next = line
        .replace(/\*\/\s*$/u, '')
        .replace(/^\*+\s*/u, '')
        .trim()
      state.joining = !next.startsWith('@')
      if (state.joining && next !== '') state.deprecated = `${state.deprecated ?? ''} ${next}`.trim()
    }
    if (line.includes('*/')) state.doc = false
    return
  }
  if (line === '' || line.startsWith('*')) return
  const current = state.current
  if (current === undefined) openDeclaration(state, line)
  else readMemberLine(state, current, line)
}

/**
 * The members a declaration has, its parents' included at any depth: Vite
 * reaches its config's `build` section through two steps, so a merge that read
 * one step would report none of that section's keys.
 * @param read - every declaration read so far.
 * @param name - the declaration to read.
 * @param step - how many declarations deep the merge already is.
 * @returns the members it has, keyed by path.
 */
function membersOf(read: Map<string, Declaration>, name: string, step: number): Map<string, Declared> {
  const members = new Map<string, Declared>()
  const declared = read.get(name)
  if (declared === undefined || step > 4) return members
  for (const parent of declared.parents) {
    for (const [path, member] of membersOf(read, parent, step + 1)) members.set(path, member)
  }
  for (const [path, member] of declared.members) members.set(path, member)
  return members
}

/**
 * Every member each declaration in a declaration file declares, its parents'
 * members included at any depth. Read line by line: what this reader takes is
 * the name, the nesting the member is written at, and the `@deprecated` text
 * above it — read whole, even where the sentence runs onto the next line.
 * @param declarations - the declaration file's contents.
 * @returns declaration name to the members it has, keyed by path.
 */
export function interfaceMembers(declarations: string): Map<string, Map<string, Declared>> {
  const state: Reading = {
    current: undefined,
    doc: false,
    joining: false,
    deprecated: undefined,
    depth: 0,
    open: new Map(),
    read: new Map(),
  }
  for (const raw of declarations.split('\n')) readDeclarationLine(state, raw.trim())
  const merged = new Map<string, Map<string, Declared>>()
  for (const name of state.read.keys()) merged.set(name, membersOf(state.read, name, 0))
  return merged
}
