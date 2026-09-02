import { describe, expect, it } from 'bun:test'
import { fieldOf } from '../scripts/ast.ts'

describe('the structural read', () => {
  it('reads a value off a parser record that carries no node type', () => {
    // A template element's text is a plain record, not a node; refusing to
    // descend into it made every interpolated template unfoldable.
    const quasi = { type: 'TemplateElement', value: { raw: 'sty', cooked: 'sty' } }
    expect(fieldOf(fieldOf(quasi, 'value'), 'cooked')).toBe('sty')
  })

  it('reports an absent key rather than guessing', () => {
    expect(fieldOf(null, 'value')).toBeNull()
    expect(fieldOf({ type: 'Literal' }, 'missing')).toBeNull()
  })
})
