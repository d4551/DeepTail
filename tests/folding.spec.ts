import { describe, expect, it } from 'bun:test'
import { type Field, isNode, parseScript, walk } from '../scripts/ast.ts'
import { staticString } from '../scripts/fold.ts'

describe('constant folding', () => {
  it('folds a template whose interpolation is a string', () => {
    const parsed = parseScript('fixture.ts', `const name = \`sty\${"le"}\``)
    let template: Field = null
    walk(parsed.body, (node) => {
      if (node.type === 'TemplateLiteral') template = node
    })
    expect(isNode(template)).toBe(true)
    expect(staticString(new Map(), template)).toBe('style')
  })
})
