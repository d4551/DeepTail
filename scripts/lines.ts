/**
 * Where an offset falls, as a line.
 *
 * Both readers in this repository needed it and both had written it: the script
 * gates read a parse and the sheet gates read braces, and each carried its own
 * binary search over its own list of newline offsets. One notion of "the line a
 * thing is on" is one place to be wrong, so the search lives here and the
 * readers share it.
 *
 * @module
 */

/**
 * A reader that turns a byte offset into a line number.
 * @param text - the whole file.
 * @returns the reader.
 */
export function lineReader(text: string): (offset: number) => number {
  const starts = [0]
  for (const [index, character] of [...text].entries()) {
    if (character === '\n') starts.push(index + 1)
  }
  return (offset) => {
    let low = 0
    let high = starts.length - 1
    while (low < high) {
      const middle = Math.ceil((low + high) / 2)
      if ((starts[middle] ?? 0) <= offset) low = middle
      else high = middle - 1
    }
    return low + 1
  }
}
