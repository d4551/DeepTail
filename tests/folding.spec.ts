import { describe, expect, it } from 'bun:test'
import { type Field, isNode, parseScript, walk } from '../scripts/ast.ts'
import { constants, staticString } from '../scripts/fold.ts'

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

  it('folds concatenation, case shifts and character codes', () => {
    const parsed = parseScript(
      'fixture.ts',
      [
        'const a = "sty" + "le"',
        'const b = "STYLE".toLowerCase()',
        'const c = String.fromCharCode(115, 116, 121, 108, 101)',
      ].join('\n'),
    )
    const env = constants(parsed.body)
    expect(env.get('a')).toBe('style')
    expect(env.get('b')).toBe('style')
    expect(env.get('c')).toBe('style')
  })

  it('does not invent a value for a contested constant', () => {
    const parsed = parseScript('fixture.ts', 'const name = "style"\n{\n  const name = "class"\n}')
    expect(constants(parsed.body).get('name')).toBeNull()
  })
})
