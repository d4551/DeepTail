/**
 * The one click binding a seated control carries.
 *
 * A first paint ships controls with no listeners, so the live mount binds them;
 * a later mount that adopts the same tree retargets that binding rather than
 * adding a second one, or one click would act twice.
 *
 * @module
 */

/** The binding a seated control answers to, read at click time. */
const seatedBindings = new WeakMap<HTMLButtonElement, () => void>()

/**
 * Bind a seated control, or retarget the binding a previous mount left.
 * @param control - the seated control.
 * @param onClick - what a click does from now on.
 */
export function bindSeated(control: HTMLButtonElement, onClick: () => void): void {
  const bound = seatedBindings.get(control)
  seatedBindings.set(control, onClick)
  if (bound === undefined) {
    control.addEventListener('click', () => {
      seatedBindings.get(control)?.()
    })
  }
}

/**
 * The button a first paint already seated, named by its class.
 * @param root - the region that holds it.
 * @param className - the class the first paint wrote.
 * @returns the button.
 */
export function seatedButton(root: ParentNode, className: string): HTMLButtonElement {
  const node = root.querySelector(`button.${className}`)
  if (!(node instanceof HTMLButtonElement)) throw new Error(`deeptail: missing ${className} in the shell chrome`)
  return node
}
