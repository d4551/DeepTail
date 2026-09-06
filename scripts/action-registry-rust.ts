/**
 * The native boundary's face, emitted.
 *
 * The Rust half prices every remote call in the same capabilities the page
 * spends, from the same bytes. Split from the page's emitter when that file
 * outgrew the size a source file here may reach; the two faces have nothing in
 * common but the registry they read.
 *
 * @module
 */

import type { Registry } from './action-registry.ts'
import { BANNER } from './action-registry-emit.ts'

/**
 * Every route the registry prices, each named once.
 *
 * Two actions may reach the same route — `compose.send` and `compose.steer`
 * both post to `session/prompt` — and the table was emitted straight from the
 * action list, so that route appeared twice. The lookup is a `find`, so the
 * second row was unreachable by construction: a duplicate that could never be
 * read, and could never disagree with its twin loudly enough to be noticed.
 * @param registry - the validated registry.
 * @returns route to capability, in registry order, one row per route.
 */
function routeCapabilities(registry: Registry): { readonly route: string; readonly capability: string }[] {
  const seen = new Map<string, string>()
  const rows: { route: string; capability: string }[] = []
  for (const action of registry.actions) {
    const route = action.remote
    if (route === undefined) continue
    const held = seen.get(route)
    if (held === undefined) {
      seen.set(route, action.capability)
      rows.push({ route, capability: action.capability })
      continue
    }
    // Two actions may share a route only when they cost the same capability;
    // otherwise the native side could not say what the route costs.
    if (held !== action.capability) {
      throw new Error(
        `actions.bao: route "${route}" is priced as both ${held} and ${action.capability}; one route costs one capability`,
      )
    }
  }
  return rows
}

/**
 * Emit the native boundary's capability table.
 * @param registry - the validated registry.
 * @returns the contents of `apps/deeptail/src-tauri/src/capability/catalog.rs`.
 */
/**
 * The types the native table is written in terms of.
 * @returns the declarations.
 */
function emitTypes(): string[] {
  return [
    '/// Whose authority a grant of a capability carries.',
    '#[derive(Debug, Clone, Copy, PartialEq, Eq)]',
    'pub enum Subject {',
    '    /// One grant covers this installation.',
    '    Device,',
    '    /// One grant covers exactly one paired host.',
    '    Host,',
    '}',
    '',
    '/// One remote route and the capability it costs.',
    'pub struct RouteCapability {',
    '    /// The `namespace/method` the page asked for.',
    "    pub route: &'static str,",
    '    /// The capability the page must hold a live grant of.',
    "    pub capability: &'static str,",
    '}',
    '',
    '/// One declared capability, and how a grant of it is scoped and aged.',
    'pub struct CapabilityDescriptor {',
    "    pub id: &'static str,",
    '    pub subject: Subject,',
    '    pub ttl_seconds: u64,',
    '}',
  ]
}

/**
 * The header, which states exactly what the native half enforces.
 * @returns the module doc comment.
 */
function emitHeader(): string[] {
  return [
    `//! ${BANNER}`,
    '//!',
    '//! The native half reads this table before it carries a call. A route named',
    '//! here is refused unless the page holds a live grant the native authority',
    '//! issued, so the webview cannot spend a capability it was never given.',
    '//!',
    '//! A route not named here is one no DeepTail action reaches. Those are the',
    "//! harness client's own calls, which it makes for itself once it has booted,",
    '//! and they are carried unpriced: this table prices the control plane, not',
    '//! the client that the control plane hands the page to.',
    '',
  ]
}

/**
 * The lookups the native half reads the tables through.
 * @returns the function declarations.
 */
function emitLookups(): string[] {
  return [
    '/// The capability one route costs, or None when no action reaches it.',
    "pub fn capability_for_route(route: &str) -> Option<&'static str> {",
    '    ROUTE_CAPABILITIES',
    '        .iter()',
    '        .find(|entry| entry.route == route)',
    '        .map(|entry| entry.capability)',
    '}',
    '',
    '/// One declared capability, or None when it is undeclared.',
    "pub fn descriptor(capability: &str) -> Option<&'static CapabilityDescriptor> {",
    '    CAPABILITIES.iter().find(|entry| entry.id == capability)',
    '}',
    '',
  ]
}

/**
 * Emit the native boundary's capability table.
 * @param registry - the validated registry.
 * @returns the contents of `apps/deeptail/src-tauri/src/capability/catalog.rs`.
 */
export function emitRust(registry: Registry): string {
  const routeLines = routeCapabilities(registry).map(
    (row) => `    RouteCapability { route: "${row.route}", capability: "${row.capability}" },`,
  )
  const capabilityLines = registry.capabilities.map(
    (row) =>
      `    CapabilityDescriptor { id: "${row.id}", subject: Subject::${row.subject === 'host' ? 'Host' : 'Device'}, ttl_seconds: ${String(row.ttlSeconds)} },`,
  )
  return `${[
    ...emitHeader(),
    ...emitTypes(),
    '',
    '/// Every route the registry reaches, and what it costs.',
    'pub const ROUTE_CAPABILITIES: &[RouteCapability] = &[',
    ...routeLines,
    '];',
    '',
    '/// Every capability the registry declares.',
    'pub const CAPABILITIES: &[CapabilityDescriptor] = &[',
    ...capabilityLines,
    '];',
    '',
    ...emitLookups(),
  ].join('\n')}\n`
}
