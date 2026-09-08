/**
 * What each fleet tool answered, read field by field rather than claimed.
 *
 * A tool's `execute` settles with `unknown`: the registry is what validates a
 * value against the schema the tool declares, and a suite driving a tool
 * directly never reaches it. Two suites told the compiler what they had
 * received and then read fields off that claim, so a tool that dropped
 * `requestId`, renamed `total`, or answered with a number instead of a row
 * would still have read as the declared shape and gone on passing.
 *
 * Every answer is read here against the fields the assertions actually use, and
 * refused by name when a field is missing or is of another shape. The declared
 * output schema is enforced separately, by the runner in `controller-double.ts`
 * — that is the registry's job, and driving a tool directly skips it.
 *
 * @module
 */

/** What `sessions_send` answers with, as the suites read it. */
export interface SendAnswer {
  readonly sessionId: string
  readonly mode: string
  readonly requestId: string
}

/** What `sessions_spawn` answers with, as the suites read it. */
export interface SpawnAnswer {
  readonly sessionId: string
}

/** One row of a `sessions_list` answer. */
export interface ListedRow {
  readonly sessionId: string
}

/** What `sessions_list` answers with, as the suites read it. */
export interface ListAnswer {
  readonly sessions: readonly ListedRow[]
  readonly total: number
}

/** What `sessions_follow` answers with, as the suites read it. */
export interface FollowAnswer {
  readonly sessionId: string
  readonly cursor: number
  readonly hasMore: boolean
  readonly records: number
  readonly recent: readonly string[]
}

/**
 * Refuse an answer that is not the shape the assertions below read.
 * @param tool - the tool that answered.
 * @param value - whatever the execution settled with.
 * @returns never — the refusal is the answer.
 * @throws Error naming the tool and what it answered with.
 */
function refuse(tool: string, value: unknown): never {
  throw new Error(`${tool} answered with ${JSON.stringify(value) ?? String(value)}`)
}

/**
 * Read one `sessions_send` answer.
 * @param value - whatever the execution settled with.
 * @returns the answer, with every field the suites read proven.
 */
export function sendAnswer(value: unknown): SendAnswer {
  if (
    typeof value === 'object' &&
    value !== null &&
    'sessionId' in value &&
    typeof value.sessionId === 'string' &&
    'mode' in value &&
    typeof value.mode === 'string' &&
    'requestId' in value &&
    typeof value.requestId === 'string'
  ) {
    return { sessionId: value.sessionId, mode: value.mode, requestId: value.requestId }
  }
  return refuse('sessions_send', value)
}

/**
 * Read one `sessions_spawn` answer.
 * @param value - whatever the execution settled with.
 * @returns the answer, with the session it created proven.
 */
export function spawnAnswer(value: unknown): SpawnAnswer {
  if (typeof value === 'object' && value !== null && 'sessionId' in value && typeof value.sessionId === 'string') {
    return { sessionId: value.sessionId }
  }
  return refuse('sessions_spawn', value)
}

/**
 * The members one answer names, in the order it names them.
 *
 * A tool that reports a field only when the host gave it one is read by which
 * members its answer carries, and reading that off a rebuilt answer would
 * report the reader's own choice of members rather than the tool's.
 * @param tool - the tool that answered.
 * @param value - whatever the execution settled with.
 * @returns the member names.
 */
export function answeredMembers(tool: string, value: unknown): string[] {
  if (typeof value !== 'object' || value === null) return refuse(tool, value)
  return Object.keys(value)
}

/**
 * Read one row of a `sessions_list` answer.
 * @param value - one member of the answer's list.
 * @returns the row.
 */
function listedRow(value: unknown): ListedRow {
  if (typeof value === 'object' && value !== null && 'sessionId' in value && typeof value.sessionId === 'string') {
    return { sessionId: value.sessionId }
  }
  return refuse('sessions_list', value)
}

/**
 * Read one `sessions_list` answer.
 * @param value - whatever the execution settled with.
 * @returns the answer, with every row read.
 */
export function listAnswer(value: unknown): ListAnswer {
  if (
    typeof value === 'object' &&
    value !== null &&
    'sessions' in value &&
    Array.isArray(value.sessions) &&
    'total' in value &&
    typeof value.total === 'number'
  ) {
    return { sessions: value.sessions.map(listedRow), total: value.total }
  }
  return refuse('sessions_list', value)
}

/**
 * Read one line of a followed session's window.
 * @param value - one member of the answer's window.
 * @returns the line.
 */
function recentLine(value: unknown): string {
  if (typeof value === 'string') return value
  return refuse('sessions_follow', value)
}

/**
 * Read one `sessions_follow` answer.
 * @param value - whatever the execution settled with.
 * @returns the answer, with the cut and the window read.
 */
export function followAnswer(value: unknown): FollowAnswer {
  if (
    typeof value === 'object' &&
    value !== null &&
    'sessionId' in value &&
    typeof value.sessionId === 'string' &&
    'cursor' in value &&
    typeof value.cursor === 'number' &&
    'hasMore' in value &&
    typeof value.hasMore === 'boolean' &&
    'records' in value &&
    typeof value.records === 'number' &&
    'recent' in value &&
    Array.isArray(value.recent)
  ) {
    return {
      sessionId: value.sessionId,
      cursor: value.cursor,
      hasMore: value.hasMore,
      records: value.records,
      recent: value.recent.map(recentLine),
    }
  }
  return refuse('sessions_follow', value)
}
