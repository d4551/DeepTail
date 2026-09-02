import { describe, expect, it } from 'bun:test'
import { type DefaultTreeAdapterTypes, parseFragment } from 'parse5'

type Parsed = DefaultTreeAdapterTypes.Node
const tagTree = (node: Parsed, depth: number, out: string[]): void => {
  if ('tagName' in node) out.push(`${'  '.repeat(depth)}${node.tagName}`)
  for (const child of 'childNodes' in node ? (node.childNodes as Parsed[]) : []) tagTree(child, depth + 1, out)
}

describe('parse5 nesting probe', () => {
  // The markup gate cannot reject an activation target nested in its own kind:
  // the HTML parsing algorithm closes the open element when the second start
  // tag arrives, so the tree a parser hands a gate never carries that shape.
  it('closes an open activation target when its own kind opens inside it', () => {
    const out: string[] = []
    tagTree(parseFragment('<button>a<button>b</button></button>') as Parsed, 0, out)
    expect(out).toEqual(['  button', '  button'])
  })
})
