/**
 * The mutation scopes' own configuration, read rather than claimed.
 *
 * A mutation score is only worth what its denominator is, and the denominator
 * is stated in these files: what is mutated, what judges it, and the score a
 * run breaks below. Two suites and one reader all opened them with `JSON.parse`
 * and then told the compiler what they had found — a claim about a file on disk
 * that nothing checks, so a scope whose `mutate` was a string, or whose
 * `break` was written as text, would read as the declared shape and be reported
 * as configuration nobody had weakened.
 *
 * Every field is read here, on the closed JSON model, and a field the file
 * writes as something else reads as absent rather than as itself.
 *
 * @module
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
import { isJsonObject, type Json, readJsonc } from './jsonc.ts';
import { readManifest } from './manifest.ts';
import { repositoryFiles } from './source-tree.ts';

/** The scores a run is held to. */
export interface Thresholds {
  readonly high: number | undefined;
  readonly low: number | undefined;
  readonly break: number | undefined;
}

/** One mutation scope, as far as the rules that read it go. */
export interface ScopeConfig {
  /** The configuration file, by repository-relative path. */
  readonly label: string;
  /** The command the scope judges its mutants with. */
  readonly command: string;
  /** What the scope mutates, as written. */
  readonly mutate: readonly string[];
  /** The coverage analysis it asks its runner for. */
  readonly coverageAnalysis: string | undefined;
  /** The runner it names, which the built-in one is not. */
  readonly testRunner: string | undefined;
  /** Whether it mutates the tree in place. */
  readonly inPlace: boolean | undefined;
  /** Whether it reuses a stored verdict rather than re-reading every mutant. */
  readonly incremental: boolean | undefined;
  /** The scores it is held to. */
  readonly thresholds: Thresholds;
}

/**
 * The number a document states under one key, when it states a number.
 * @param held - the section the key is written in.
 * @param key - the key.
 * @returns the number, or undefined.
 */
function numberAt(held: {
  [key: string]: Json;
}, key: string): number | undefined {
  if (stryMutAct_9fa48("2654")) {
    {}
  } else {
    stryCov_9fa48("2654");
    const value = held[key];
    return (stryMutAct_9fa48("2657") ? typeof value !== 'number' : stryMutAct_9fa48("2656") ? false : stryMutAct_9fa48("2655") ? true : (stryCov_9fa48("2655", "2656", "2657"), typeof value === (stryMutAct_9fa48("2658") ? "" : (stryCov_9fa48("2658"), 'number')))) ? value : undefined;
  }
}

/**
 * The string a document states under one key, when it states a string.
 * @param held - the section the key is written in.
 * @param key - the key.
 * @returns the string, or undefined.
 */
function stringAt(held: {
  [key: string]: Json;
}, key: string): string | undefined {
  if (stryMutAct_9fa48("2659")) {
    {}
  } else {
    stryCov_9fa48("2659");
    const value = held[key];
    return (stryMutAct_9fa48("2662") ? typeof value !== 'string' : stryMutAct_9fa48("2661") ? false : stryMutAct_9fa48("2660") ? true : (stryCov_9fa48("2660", "2661", "2662"), typeof value === (stryMutAct_9fa48("2663") ? "" : (stryCov_9fa48("2663"), 'string')))) ? value : undefined;
  }
}

/**
 * The boolean a document states under one key, when it states a boolean.
 * @param held - the section the key is written in.
 * @param key - the key.
 * @returns the boolean, or undefined.
 */
function booleanAt(held: {
  [key: string]: Json;
}, key: string): boolean | undefined {
  if (stryMutAct_9fa48("2664")) {
    {}
  } else {
    stryCov_9fa48("2664");
    const value = held[key];
    return (stryMutAct_9fa48("2667") ? typeof value !== 'boolean' : stryMutAct_9fa48("2666") ? false : stryMutAct_9fa48("2665") ? true : (stryCov_9fa48("2665", "2666", "2667"), typeof value === (stryMutAct_9fa48("2668") ? "" : (stryCov_9fa48("2668"), 'boolean')))) ? value : undefined;
  }
}

/**
 * The list of strings a document states under one key.
 *
 * A list carrying anything but strings is not a list of patterns, and reading
 * it as one would answer for files no pattern selects.
 * @param held - the section the key is written in.
 * @param key - the key.
 * @returns the strings, or an empty list.
 */
function stringsAt(held: {
  [key: string]: Json;
}, key: string): readonly string[] {
  if (stryMutAct_9fa48("2669")) {
    {}
  } else {
    stryCov_9fa48("2669");
    const value = held[key];
    if (stryMutAct_9fa48("2672") ? false : stryMutAct_9fa48("2671") ? true : stryMutAct_9fa48("2670") ? Array.isArray(value) : (stryCov_9fa48("2670", "2671", "2672"), !Array.isArray(value))) return stryMutAct_9fa48("2673") ? ["Stryker was here"] : (stryCov_9fa48("2673"), []);
    return stryMutAct_9fa48("2674") ? value : (stryCov_9fa48("2674"), value.filter(stryMutAct_9fa48("2675") ? () => undefined : (stryCov_9fa48("2675"), entry => stryMutAct_9fa48("2678") ? typeof entry !== 'string' : stryMutAct_9fa48("2677") ? false : stryMutAct_9fa48("2676") ? true : (stryCov_9fa48("2676", "2677", "2678"), typeof entry === (stryMutAct_9fa48("2679") ? "" : (stryCov_9fa48("2679"), 'string'))))));
  }
}

/**
 * One scope's configuration, read off its document.
 * @param label - the configuration file, by repository-relative path.
 * @param document - the parsed document.
 * @returns the scope.
 */
export function readScopeConfig(label: string, document: {
  [key: string]: Json;
}): ScopeConfig {
  if (stryMutAct_9fa48("2680")) {
    {}
  } else {
    stryCov_9fa48("2680");
    const runner = document[stryMutAct_9fa48("2681") ? "" : (stryCov_9fa48("2681"), 'commandRunner')];
    const thresholds = document[stryMutAct_9fa48("2682") ? "" : (stryCov_9fa48("2682"), 'thresholds')];
    const scores = isJsonObject(thresholds) ? thresholds : {};
    return stryMutAct_9fa48("2683") ? {} : (stryCov_9fa48("2683"), {
      label,
      command: isJsonObject(runner) ? stryMutAct_9fa48("2684") ? stringAt(runner, 'command') && '' : (stryCov_9fa48("2684"), stringAt(runner, stryMutAct_9fa48("2685") ? "" : (stryCov_9fa48("2685"), 'command')) ?? (stryMutAct_9fa48("2686") ? "Stryker was here!" : (stryCov_9fa48("2686"), ''))) : stryMutAct_9fa48("2687") ? "Stryker was here!" : (stryCov_9fa48("2687"), ''),
      mutate: stringsAt(document, stryMutAct_9fa48("2688") ? "" : (stryCov_9fa48("2688"), 'mutate')),
      coverageAnalysis: stringAt(document, stryMutAct_9fa48("2689") ? "" : (stryCov_9fa48("2689"), 'coverageAnalysis')),
      testRunner: stringAt(document, stryMutAct_9fa48("2690") ? "" : (stryCov_9fa48("2690"), 'testRunner')),
      inPlace: booleanAt(document, stryMutAct_9fa48("2691") ? "" : (stryCov_9fa48("2691"), 'inPlace')),
      incremental: booleanAt(document, stryMutAct_9fa48("2692") ? "" : (stryCov_9fa48("2692"), 'incremental')),
      thresholds: stryMutAct_9fa48("2693") ? {} : (stryCov_9fa48("2693"), {
        high: numberAt(scores, stryMutAct_9fa48("2694") ? "" : (stryCov_9fa48("2694"), 'high')),
        low: numberAt(scores, stryMutAct_9fa48("2695") ? "" : (stryCov_9fa48("2695"), 'low')),
        break: numberAt(scores, stryMutAct_9fa48("2696") ? "" : (stryCov_9fa48("2696"), 'break'))
      })
    });
  }
}

/**
 * Every mutation scope the repository ships.
 * @returns one entry per configuration file, in path order.
 */
export function scopeConfigs(): readonly ScopeConfig[] {
  if (stryMutAct_9fa48("2697")) {
    {}
  } else {
    stryCov_9fa48("2697");
    return stryMutAct_9fa48("2698") ? repositoryFiles(['.json']).map(file => readScopeConfig(file.label, readManifest(file.path))) : (stryCov_9fa48("2698"), repositoryFiles(stryMutAct_9fa48("2699") ? [] : (stryCov_9fa48("2699"), [stryMutAct_9fa48("2700") ? "" : (stryCov_9fa48("2700"), '.json')])).filter(stryMutAct_9fa48("2701") ? () => undefined : (stryCov_9fa48("2701"), file => (stryMutAct_9fa48("2704") ? /^stryker\..\.json$/u : stryMutAct_9fa48("2703") ? /^stryker\..*\.json/u : stryMutAct_9fa48("2702") ? /stryker\..*\.json$/u : (stryCov_9fa48("2702", "2703", "2704"), /^stryker\..*\.json$/u)).test(file.label))).map(stryMutAct_9fa48("2705") ? () => undefined : (stryCov_9fa48("2705"), file => readScopeConfig(file.label, readManifest(file.path)))));
  }
}

/**
 * One scope's configuration, read from text.
 * @param label - the name to report it under.
 * @param text - the file's contents.
 * @returns the scope.
 */
export function scopeConfigOf(label: string, text: string): ScopeConfig {
  if (stryMutAct_9fa48("2706")) {
    {}
  } else {
    stryCov_9fa48("2706");
    return readScopeConfig(label, readJsonc(text));
  }
}