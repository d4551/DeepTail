/**
 * The idioms the frameworks this product uses removed, each in every spelling.
 *
 * A source that revives one of them still builds: nothing at runtime stops a
 * removed import from being written, and nothing stops a removed call from
 * compiling against a stale type. Each removal is a separate rule, and each
 * rule reads a name through whatever the file renamed it to.
 */

import { describe, expect, it } from 'bun:test'
import { banOffences, joined, source } from './fixtures.ts'

/** The reasons a fixture is rejected for. */
function bans(...lines: readonly string[]): string[] {
  return banOffences(source(...lines))
}

/** The reasons a JSX fixture is rejected for. */
function jsx(...lines: readonly string[]): string[] {
  return banOffences(source(...lines), 'fixture.tsx')
}

describe('the React 19 removals', () => {
  it('refuse every entry point the DOM package lost', () => {
    const why = 'ReactDOM render and its siblings were removed in React 19; use createRoot and refs'
    for (const call of ['render', 'hydrate', 'unmountComponentAtNode', 'findDOMNode']) {
      expect([call, bans(`ReactDOM.${call}(node, root)`)]).toEqual([call, [why]])
    }
    expect(bans('ReactDOM.createRoot(root)')).toEqual([])
  })

  it('refuse them through a rename and through brackets', () => {
    const why = 'ReactDOM render and its siblings were removed in React 19; use createRoot and refs'
    expect(bans(joined('import ReactDOM from ', "'react-dom'"), 'ReactDOM["render"](node, root)')).toEqual([why])
    // A rename is still the same package: the rules read through it.
    expect(bans('const dom = ReactDOM', 'dom.render(node, root)')).toEqual([why])
    expect(bans('renderer.render(node, root)')).toEqual([])
  })

  it('refuse findDOMNode called as a bare global, however it is reached', () => {
    const why = 'findDOMNode was removed in React 19; use a ref'
    expect(bans('findDOMNode(node)')).toEqual([why])
    expect(bans('window.findDOMNode(node)')).toEqual([why])
    expect(bans('const find = findDOMNode', 'find(node)')).toEqual([why])
  })

  it('refuse defaultProps and legacy context, wherever the member is named', () => {
    expect(bans('Widget.defaultProps = { a: 1 }')).toEqual([
      'defaultProps on a component was removed in React 19; use default parameters',
    ])
    const context = 'legacy context was removed in React 19; use the Context API'
    expect(bans('Widget.childContextTypes = { a: 1 }')).toEqual([context])
    expect(bans('Widget.prototype.getChildContext = function () { return {} }')).toEqual([
      'the constructor-function expando pattern was removed in TypeScript 7; use a class',
      context,
    ])
    expect(bans('Widget.props = { a: 1 }')).toEqual([])
  })

  it('refuse a string ref, and admit a ref that is not a string', () => {
    const why = 'a string ref was removed in React 19; use a ref object or callback'
    expect(jsx('const a = <input ref="name" />')).toEqual([why])
    expect(jsx('const a = <input ref={handle} />')).toEqual([])
    expect(jsx('const a = <input name="ref" />')).toEqual([])
  })
})

describe('the Tauri v1 removals', () => {
  it('refuse every v1 module path, and the sub-paths inside each', () => {
    const why = 'this is a Tauri v1 API path; use @tauri-apps/api/core or the v2 plugin'
    const paths = [
      'tauri',
      'helpers',
      'notification',
      'updater',
      'dialog',
      'fs',
      'http',
      'clipboard',
      'shell',
      'process',
      'globalShortcut',
      'os',
    ]
    for (const path of paths) {
      const line = joined('import { invoke } from ', `'@tauri-apps/api/${path}'`)
      expect([path, bans(line)]).toEqual([path, [why]])
    }
    expect(bans(joined('import { invoke } from ', "'@tauri-apps/api/fs/dir'"))).toEqual([why])
  })

  it('admit the v2 paths that replaced them', () => {
    expect(bans(joined('import { invoke } from ', "'@tauri-apps/api/core'"))).toEqual([])
    expect(bans(joined('import { open } from ', "'@tauri-apps/plugin-dialog'"))).toEqual([])
    // A path that merely begins the same way is another package entirely.
    expect(bans(joined('import { x } from ', "'@tauri-apps/api/fsx'"))).toEqual([])
  })

  it('refuse the v1 global, however the member is reached', () => {
    const why = 'the __TAURI__ global is the Tauri v1 API; use invoke from @tauri-apps/api/core'
    expect(bans('const a = window.__TAURI__')).toEqual([why])
    expect(bans('const a = window["__TAURI__"]')).toEqual([why])
    expect(bans('const key = "__TAURI__"', 'const a = window[key]')).toEqual([why])
    expect(bans('const a = window.__TAURI_INTERNALS__')).toEqual([])
  })
})
