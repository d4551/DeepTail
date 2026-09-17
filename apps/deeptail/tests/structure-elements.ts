/**
 * The reads over the element tree that more than one structural check makes.
 *
 * Each check is shipped to the page as its own source text, so a read two of
 * them need is one function both call rather than two copies of the same walk:
 * a second copy answers the same question twice and the two answers drift the
 * first time either is edited. Nothing here may close over anything, for the
 * same reason — a value a shipped function reads has to arrive as an argument.
 *
 * @module
 */

/**
 * Every element inside every product surface, each surface itself included.
 *
 * One walk, because five checks ask the same question of the same surfaces: the
 * alignment, grid, vocabulary, motion and type rules all read what this product
 * drew and nothing the harness client drew beside it. A selector naming one
 * surface and a selector naming four therefore read the same way, and a check
 * added later reads the surfaces the same way the others do.
 *
 * Two shapes are why the walk is written out rather than left to one
 * `querySelectorAll`. A shadow root is not in the document's tree: a surface
 * that attaches one keeps whatever it draws inside it out of this read, and so
 * out of every rule built on it — the type, motion, alignment and vocabulary
 * rules would leave a whole subtree unmeasured. And a surface seated inside
 * another is reached twice, once by each root's walk, so one defect would be
 * reported twice; an element is read once, whichever root reached it first.
 *
 * The order is the document's own, depth first, each element before what it
 * holds, with a host's shadow content read where the host is: the order the
 * page paints in, so a finding names the first offending element a reader
 * meets.
 * @param scope - the product surfaces, as one selector list.
 * @returns the elements, one surface at a time, each surface before its contents.
 */
export function surfaceElements(scope: string): Element[] {
  const found: Element[] = []
  const seen = new Set<Element>()
  const keep = (node: Element): void => {
    if (seen.has(node)) return
    seen.add(node)
    found.push(node)
  }
  for (const root of document.querySelectorAll(scope)) {
    const pending: Element[] = [root]
    while (pending.length > 0) {
      const node = pending.pop()
      if (node === undefined) continue
      keep(node)
      const shadow = node.shadowRoot
      const children = [...node.children]
      if (shadow !== null) children.unshift(...shadow.children)
      for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index]
        if (child !== undefined) pending.push(child)
      }
    }
  }
  return found
}

/**
 * The element children of one box that are visible and paint a box.
 *
 * A row and a list both measure the boxes their children paint, and a child
 * that is hidden, absent from the tree or painting nothing is not one of them:
 * `getBoundingClientRect` answers a zero rectangle for a box the engine never
 * laid out, so a hidden child read as a row would be a row of nothing. Both
 * checks need the same predicate, and a text node, an SVG and a comment are all
 * things `children` answers without.
 * @param parent - the box whose children are measured.
 * @returns the children that paint a box, in document order.
 */
export function laidOutChildren(parent: Element): HTMLElement[] {
  return [...parent.children].filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.checkVisibility() && child.getBoundingClientRect().height > 0,
  )
}

/**
 * Whether an element carries text of its own, rather than another's.
 *
 * The type rules and the clipping rule both read only what an element renders
 * itself: an element holding nothing but another's text inherits whatever that
 * text was given, so reporting it too would name the tree rather than the
 * decision. A whitespace-only node is not text anybody reads.
 * @param node - the element to read.
 * @returns true when it carries its own non-blank text.
 */
export function carriesText(node: Element): boolean {
  return [...node.childNodes].some(
    (child) => child.nodeType === Node.TEXT_NODE && (child.textContent ?? '').trim() !== '',
  )
}

/**
 * Every control a pointer can reach, from the selector the caller hands in.
 *
 * Three pointer checks ask one question — which elements take focus or
 * activation — and all three exclude the same two shapes: an `inert` subtree,
 * which the engine takes out of the tab order, and a control that paints
 * nothing, which no pointer can aim at. Reading it once is what keeps the
 * target-size, overlap and focus rules measuring the same set of controls; a
 * control one of them measured and another did not would be a finding one rule
 * reports and its neighbour cannot.
 * @param limits - which elements take focus or activation, handed in by the caller.
 * @returns the reachable controls, in document order.
 */
export function reachableTargets(limits: { readonly interactive: string }): HTMLElement[] {
  return [...document.querySelectorAll(limits.interactive)].filter(
    (node): node is HTMLElement =>
      node.closest('[inert]') === null && node instanceof HTMLElement && node.checkVisibility(),
  )
}
