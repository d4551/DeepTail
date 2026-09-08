/**
 * One tab stop for a whole set of controls.
 *
 * The first control carries the page's tab stop and the rest are reached with
 * the arrow keys, so a list of a hundred rows is one stop rather than a
 * hundred. Every list that does this does it the same way, from here.
 *
 * Its own module because `dom.ts` is the element factory and this is a
 * keyboard contract; holding both put that file past the size a source file
 * here may reach.
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
  switch (key) {
    case 'ArrowDown':
      return (index + 1) % length
    case 'ArrowUp':
      return (index - 1 + length) % length
    case 'Home':
      return 0
    case 'End':
      return length - 1
  }
  return undefined
}

/**
 * Give a set of controls one roving tab stop.
 *
 * The first control carries the page's tab stop and the rest are reached with
 * the arrow keys, so a list of a hundred rows is one stop rather than a
 * hundred. Every list that does this does it the same way, from here.
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
  // The stop is moved by walking the rows rather than by indexing one out of
  // them: an index read back out is an index the compiler cannot know is in
  // range, and the guard that answers for that is a line no press reaches.
  for (const [at, row] of rows.entries()) {
    row.tabIndex = at === target ? 0 : -1
    if (at === target) row.focus()
  }
}
