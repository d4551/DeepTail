import { describe, expect, it } from 'bun:test'
import { isNode, parseScript, unwrap } from '../scripts/ast.ts'

describe('the structural walk', () => {
  it('unwraps parentheses and type assertions that change nothing', () => {
    const parsed = parseScript('fixture.ts', "const name = (('sty') + ('le')) as string")
    const outer = unwrap(parsed.body[0])
    expect(isNode(outer)).toBe(true)
    // Brackets and `as` do not change the value, so the inner expression is
    // what a rule written about expressions must see.
    const inner = isNode(outer) ? unwrap(outer.declarations) : null
    expect(isNode(inner)).toBe(false)
  })

  it('leaves a value that is already the expression alone', () => {
    expect(unwrap('a string')).toBe('a string')
    expect(unwrap(null)).toBeNull()
  })
})
