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
 * Emit the native boundary's route table.
 * @param registry - the validated registry.
 * @returns the contents of `apps/deeptail/src-tauri/src/capability/catalog.rs`.
 */
export function emitRust(registry: Registry): string {
  const routes = registry.actions.filter((action) => action.remote !== undefined)
  const routeLines = routes.map(
    (action) => `    RouteCapability { route: "${action.remote ?? ''}", capability: "${action.capability}" },`,
  )
  const ttlLines = registry.capabilities.map((row) => `    ("${row.id}", ${String(row.ttlSeconds)}),`)
  return `${[
    `//! ${BANNER}`,
    '//!',
    '//! The native half reads this table before it carries a call. A route the page',
    '//! holds no live grant for is refused here before it reaches the host, so the',
    '//! webview cannot spend a capability the native authority has not issued, and',
    '//! cannot reach a route no action names.',
    '',
    '/// One remote route and the capability it costs.',
    'pub struct RouteCapability {',
    '    /// The `namespace/method` the page asked for.',
    "    pub route: &'static str,",
    '    /// The capability the page must hold a live grant of.',
    "    pub capability: &'static str,",
    '}',
    '',
    '/// Every route the registry reaches, and what it costs.',
    'pub const ROUTE_CAPABILITIES: &[RouteCapability] = &[',
    ...routeLines,
    '];',
    '',
    '/// How long an issued grant of each capability stays spendable, in seconds.',
    'pub const CAPABILITY_TTLS: &[(&str, u64)] = &[',
    ...ttlLines,
    '];',
    '',
    '/// The capability one route costs, or None when no action reaches it.',
    "pub fn capability_for_route(route: &str) -> Option<&'static str> {",
    '    ROUTE_CAPABILITIES',
    '        .iter()',
    '        .find(|entry| entry.route == route)',
    '        .map(|entry| entry.capability)',
    '}',
    '',
    '/// How long a grant of one capability lasts, or None when it is undeclared.',
    'pub fn ttl_for_capability(capability: &str) -> Option<u64> {',
    '    CAPABILITY_TTLS',
    '        .iter()',
    '        .find(|(id, _)| *id == capability)',
    '        .map(|(_, ttl)| *ttl)',
    '}',
    '',
  ].join('\n')}\n`
}
