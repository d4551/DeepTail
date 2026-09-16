/**
 * The floors the coverage gate holds the unit chain to, pinned at what the
 * chain measured.
 *
 * Every entry is the value a full run of the unit chain printed for that file.
 * Raising a floor is the record of an improvement; lowering one is the defect
 * the gate exists to refuse. The low entries are stated, not excused: the
 * carrier's network half and the page-contract helpers are driven by the
 * browser suites, and a gate program's own section is driven at process level
 * by its program spec — the unit chain's table is what the gate holds, and the
 * browser chain has its own.
 *
 * @module
 */

/**
 * The line coverage each measured file is held to.
 *
 * A file the chain measures with no entry here is an offence, and so is an
 * entry for a file the chain no longer reaches: nothing joins without a floor,
 * and nothing stays behind as decoration.
 */function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
export const FLOORS: Readonly<Record<string, number>> = stryMutAct_9fa48("950") ? {} : (stryCov_9fa48("950"), {
  'apps/deeptail/src/actions/action-table.ts': 100,
  'apps/deeptail/src/actions/capabilities.ts': 100,
  'apps/deeptail/src/actions/dispatch.ts': 100,
  'apps/deeptail/src/actions/handlers.ts': 100,
  'apps/deeptail/src/actions/outcomes.ts': 100,
  'apps/deeptail/src/actions/registry.ts': 100,
  'apps/deeptail/src/api.ts': 100,
  'apps/deeptail/src/browser-locale.ts': 100,
  'apps/deeptail/src/capabilities/audit.ts': 100,
  'apps/deeptail/src/capabilities/grants.ts': 100,
  'apps/deeptail/src/fleet-pairing.ts': 100,
  'apps/deeptail/src/fleet-tailnet.ts': 100,
  'apps/deeptail/src/frames.ts': 100,
  'apps/deeptail/src/host.ts': 100,
  'apps/deeptail/src/locales.ts': 100,
  'apps/deeptail/src/markers.ts': 100,
  'apps/deeptail/src/native-call.ts': 100,
  'apps/deeptail/src/picker-ports.ts': 100,
  'apps/deeptail/src/picker-tailnet.ts': 100,
  'apps/deeptail/src/reason.ts': 100,
  'apps/deeptail/src/roster.ts': 100,
  'apps/deeptail/src/runtime.ts': 100,
  'apps/deeptail/src/socket-state.ts': 100,
  'apps/deeptail/src/store.ts': 100,
  'apps/deeptail/src/stream.ts': 100,
  'apps/deeptail/src/tailscale.ts': 100,
  'apps/deeptail/src/transport-bundles.ts': 100,
  'apps/deeptail/src/transport.ts': 100,
  'apps/deeptail/src/ui/dom.ts': 100,
  'apps/deeptail/src/ui/roving.ts': 100,
  'apps/deeptail/src/ui/seated.ts': 100,
  'apps/deeptail/src/ui/shell-chrome.ts': 100,
  'apps/deeptail/src/ui/shell-frame.ts': 99.2,
  'apps/deeptail/src/ui/states.ts': 100,
  'apps/deeptail/src/wire.ts': 100,
  'apps/deeptail/tests/structure-emit.ts': 100,
  'apps/deeptail/tests/structure-layout.ts': 100,
  'apps/deeptail/tests/structure-pointer.ts': 100,
  'apps/deeptail/tests/structure-report.ts': 100,
  'apps/deeptail/tests/structure-shell.ts': 100,
  'apps/deeptail/tests/structure-vocabulary.ts': 100,
  'apps/deeptail/tests/structure.ts': 100,
  'packages/host-fleet/src/index.ts': 100,
  'packages/host-fleet/src/invariant.ts': 100,
  'packages/host-fleet/src/limits.ts': 100,
  'packages/host-fleet/src/session-access.ts': 100,
  'packages/host-fleet/src/session-projection.ts': 100,
  'packages/host-fleet/src/tools-direct.ts': 100,
  'packages/host-fleet/src/tools-observe.ts': 100,
  'packages/host-fleet/src/tools.ts': 100,
  'packages/host-fleet/tests/answers.ts': 100,
  'packages/host-fleet/tests/controller-double.ts': 99.15,
  'scripts/action-registry-emit.ts': 100,
  'scripts/action-registry-rust.ts': 100,
  'scripts/action-registry.ts': 100,
  'scripts/aliases.ts': 100,
  'scripts/ast.ts': 100,
  'scripts/ban-gate.ts': 100,
  'scripts/ban-rules.ts': 100,
  'scripts/captures.ts': 100,
  'scripts/cargo-freshness.ts': 94.87,
  'scripts/check-bans.ts': 100,
  'scripts/check-coverage.ts': 78.41,
  'scripts/check-entries.ts': 100,
  'scripts/check-no-inline-styles.ts': 100,
  'scripts/check-outdated.ts': 97.14,
  'scripts/check-stylesheets.ts': 100,
  'scripts/check-tree.ts': 100,
  'scripts/colour-gate.ts': 100,
  'scripts/compiler-face.ts': 100,
  'scripts/coverage-floors.ts': 100,
  'scripts/debt-names.ts': 100,
  'scripts/docs-versions.ts': 100,
  'scripts/entry-gate.ts': 100,
  'scripts/extensions.ts': 100,
  'scripts/focus-ring-gate.ts': 100,
  'scripts/fold.ts': 100,
  'scripts/free-names.ts': 100,
  'scripts/gate-runner.ts': 100,
  'scripts/gen-action-registry.ts': 100,
  'scripts/jsonc.ts': 100,
  'scripts/lines.ts': 100,
  'scripts/manifest.ts': 100,
  'scripts/markup-attributes.ts': 100,
  'scripts/markup-gate.ts': 100,
  'scripts/markup-vocabulary.ts': 100,
  'scripts/mutation-survivors.ts': 94.55,
  'scripts/paint-index.ts': 100,
  'scripts/paint-stamp.ts': 100,
  'scripts/pins.ts': 100,
  'scripts/pipeline-guard-gates.ts': 100,
  'scripts/pipeline-guard-jobs.ts': 100,
  'scripts/pipeline-guard-rules.ts': 100,
  'scripts/pipeline-guard.ts': 90.32,
  'scripts/react-tauri-rules.ts': 100,
  'scripts/registry-readers.ts': 100,
  'scripts/rule-helpers.ts': 100,
  'scripts/rust-attributes.ts': 100,
  'scripts/sheet-declarations.ts': 100,
  'scripts/sheet-depth.ts': 100,
  'scripts/sheet-duplicates.ts': 100,
  'scripts/sheet-gate.ts': 100,
  'scripts/sheet-imports.ts': 100,
  'scripts/sheet-reader.ts': 100,
  'scripts/source-tree.ts': 100,
  'scripts/stryker-config.ts': 100,
  'scripts/style-gate.ts': 100,
  'scripts/style-writes.ts': 100,
  'scripts/test-commands.ts': 100,
  'tests/dom.ts': 100,
  'tests/fixtures.ts': 100,
  'tests/gate-program.ts': 100,
  'tests/grant-fixture.ts': 100,
  'tests/invoke-double.ts': 100,
  'tests/jsonc-io.ts': 100,
  'tests/manifests.ts': 100,
  'tests/markup-tree.ts': 100,
  'tests/shell-chrome-double.ts': 100,
  'tests/structure-double.ts': 100,
  'tests/tree-budget.ts': 100,
  'tests/transport-double.ts': 100
});

/** The line coverage the whole chain is held to, pinned the same way. */
export const OVERALL_FLOOR = 99.61;