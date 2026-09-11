/**
 * The data-* hooks the page contract is written and read by.
 *
 * Every control the suites drive, every surface a state is found by, and every
 * row a focus is restored to is named by one of these attributes. The names
 * were spelled at each call site — as a dataset key where one was written and
 * as a selector where one was read — so a rename had to land in a dozen files
 * at once and the compiler could catch none of it. Each name is declared here,
 * once, and both spellings derive from the declaration: the dataset key is the
 * value itself, and the attribute selector is the value kebab-cased under
 * `data-`, which is the one conversion the DOM platform defines between the
 * two.
 *
 * @module
 */

/** Every data hook, named by its dataset spelling. */
export const DATA = {
  /** The action marker a control carries, from the action registry. */
  action: 'deeptailAction',
  /** Which half of the connection menu an element is. */
  connection: 'deeptailConnection',
  /** The dialog root focus is trapped inside. */
  dialog: 'deeptailDialog',
  /** Whether the shell's sidebar is drawn as a drawer. */
  drawer: 'drawer',
  /** The field hook a form box answers to. */
  field: 'deeptailField',
  /** The paired host a picker row presents. */
  host: 'deeptailHost',
  /** The picker root, absent once a shell has replaced it. */
  picker: 'deeptailPicker',
  /** The return bar shown while a harness client is open. */
  return: 'deeptailReturn',
  /** The session a roster row presents. */
  session: 'deeptailSession',
  /** The one shell root a document carries. */
  shell: 'deeptailShell',
  /** The state hook a surface is found by. */
  state: 'deeptailState',
  /** The tailnet machine a picker row presents. */
  tailnetDevice: 'deeptailTailnetDevice',
  /** Which view the picker is showing. */
  view: 'deeptailView',
} as const

/** One hook of {@link DATA}, named by its role. */
export type DataKey = keyof typeof DATA

/**
 * The attribute selector one hook is found by, optionally pinned to one value.
 * @param key - the hook to select.
 * @param value - the value the attribute must carry, when it must carry one.
 * @returns the selector.
 */
export function dataSelector(key: DataKey, value?: string): string {
  const attribute = `data-${DATA[key].replaceAll(/[A-Z]/gu, (letter) => `-${letter.toLowerCase()}`)}`
  return value === undefined ? `[${attribute}]` : `[${attribute}="${value}"]`
}
