/**
 * The roving tab stop: one page stop for a set of rows, reached with arrows.
 *
 * The first control carries the surface's tab stop and the rest are reached
 * with the arrow keys, so a list of a hundred rows is one stop rather than a
 * hundred. Every list that does this does it the same way, from here.
 *
 * @module
 */

/**
 * The row a navigation key moves to.
 * @param key - the pressed key.
 * @param index - the current row.
 * @param length - how many rows there are.
 * @returns the target row, or undefined when the key is not a navigation key.
 */
function nextIndex(key: string, index: number, length: number): number | undefined {
  if (length === 0) return undefined
  switch (key) {
    case 'ArrowDown':
      return (index + 1) % length
    case 'ArrowUp':
      return (index - 1 + length) % length
    case 'Home':
      return 0
    case 'End':
      return length - 1
    default:
      return undefined
  }
}

/**
 * Give a set of controls one roving tab stop.
 * @param stops - every control in display order.
 */
export function bindRovingFocus(stops: readonly HTMLElement[]): void {
  for (const [index, stop] of stops.entries()) {
    stop.tabIndex = index === 0 ? 0 : -1
    stop.addEventListener('keydown', (event) => {
      moveRovingFocus(event, stops, index)
    })
  }
}

/**
 * Move a roving tab stop between rows.
 * @param event - the keydown.
 * @param rows - every row in display order.
 * @param index - the row the event came from.
 */
function moveRovingFocus(event: KeyboardEvent, rows: readonly HTMLElement[], index: number): void {
  if (event.target !== event.currentTarget) return
  const target = nextIndex(event.key, index, rows.length)
  if (target === undefined) return
  event.preventDefault()
  for (const row of rows) row.tabIndex = -1
  const next = rows[target]
  if (next === undefined) return
  next.tabIndex = 0
  next.focus()
}
