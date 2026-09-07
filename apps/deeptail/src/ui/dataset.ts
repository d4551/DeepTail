/**
 * The dataset keys the shell writes and the dispatcher reads.
 *
 * `HTMLElement.dataset` is typed as a string index, so the keys live here as
 * the one contract every writer and reader addresses. A key written anywhere
 * else is a second spelling no reader can follow.
 *
 * @module
 */

/** The dataset keys one control may carry, by what they mean. */
export type DatasetKey =
  | 'deeptailAction'
  | 'deeptailConnection'
  | 'deeptailDialog'
  | 'deeptailField'
  | 'deeptailFleet'
  | 'deeptailHost'
  | 'deeptailPicker'
  | 'deeptailReturn'
  | 'deeptailSession'
  | 'deeptailShell'
  | 'deeptailState'
  | 'deeptailTailnetDevice'
  | 'deeptailView'
  | 'drawer'
  | 'state'

/**
 * Write one dataset entry.
 * @param element - the element carrying it.
 * @param key - which entry.
 * @param value - what it holds.
 */
export function setDataset(element: HTMLElement, key: DatasetKey, value: string): void {
  element.dataset[key] = value
}

/**
 * Read one dataset entry.
 * @param element - the element carrying it.
 * @param key - which entry.
 * @returns the value, or undefined when the entry is absent.
 */
export function datasetValue(element: HTMLElement, key: DatasetKey): string | undefined {
  return element.dataset[key]
}
