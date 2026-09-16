/**
 * How a rule reads a name, whatever the file renamed or folded it into.
 *
 * Rules are written about names — `document`, `Array`, `it` — and a name is
 * exactly what a `const`, an import alias or a pair of brackets can change
 * without changing what runs. Every rule reads names through the helpers here,
 * so a rename changes nothing about what is judged.
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
import type { Aliases } from './aliases.ts';
import { type Field, isNode, memberName, type Node, unwrap } from './ast.ts';
import { type Constants, staticString } from './fold.ts';

/**
 * What a file renamed, and what it holds in constants.
 *
 * Rules are written about names and a name is exactly what a `const`, an
 * import alias or a pair of brackets can change without changing what runs.
 * Every rule is read through this.
 */
export interface Names {
  /** Local names that stand for another name. */
  readonly aliases: Aliases;
  /** Constants bound to strings, for a member reached through brackets. */
  readonly constants: Constants;
}

/** A rule stated about a node, rather than about the text of a line. */
export interface Rule {
  /** Whether this node is the banned construct. */
  readonly holds: (node: Node, names: Names) => boolean;
  /** What is wrong, and what to do instead. */
  readonly why: string;
}

/**
 * The name an identifier carries, read through whatever it was renamed from.
 * @param holder - the node to read, parentheses and all.
 * @param names - what this file renamed.
 * @returns the name, or undefined.
 */
export function identifier(holder: Field | undefined, names: Names): string | undefined {
  if (stryMutAct_9fa48("2433")) {
    {}
  } else {
    stryCov_9fa48("2433");
    const value = unwrap(holder);
    if (stryMutAct_9fa48("2436") ? (!isNode(value) || value.type !== 'Identifier') && typeof value['name'] !== 'string' : stryMutAct_9fa48("2435") ? false : stryMutAct_9fa48("2434") ? true : (stryCov_9fa48("2434", "2435", "2436"), (stryMutAct_9fa48("2438") ? !isNode(value) && value.type !== 'Identifier' : stryMutAct_9fa48("2437") ? false : (stryCov_9fa48("2437", "2438"), (stryMutAct_9fa48("2439") ? isNode(value) : (stryCov_9fa48("2439"), !isNode(value))) || (stryMutAct_9fa48("2441") ? value.type === 'Identifier' : stryMutAct_9fa48("2440") ? false : (stryCov_9fa48("2440", "2441"), value.type !== (stryMutAct_9fa48("2442") ? "" : (stryCov_9fa48("2442"), 'Identifier')))))) || (stryMutAct_9fa48("2444") ? typeof value['name'] === 'string' : stryMutAct_9fa48("2443") ? false : (stryCov_9fa48("2443", "2444"), typeof value[stryMutAct_9fa48("2445") ? "" : (stryCov_9fa48("2445"), 'name')] !== (stryMutAct_9fa48("2446") ? "" : (stryCov_9fa48("2446"), 'string')))))) return undefined;
    const written = value[stryMutAct_9fa48("2447") ? "" : (stryCov_9fa48("2447"), 'name')];
    return stryMutAct_9fa48("2448") ? names.aliases.get(written) && written : (stryCov_9fa48("2448"), names.aliases.get(written) ?? written);
  }
}

/**
 * The property a member expression names, however it is reached.
 * @param node - the member expression.
 * @param names - what this file renamed and what it holds in constants.
 * @returns the property name, or undefined.
 */
export function property(node: Node, names: Names): string | undefined {
  if (stryMutAct_9fa48("2449")) {
    {}
  } else {
    stryCov_9fa48("2449");
    if (stryMutAct_9fa48("2452") ? node.type === 'MemberExpression' : stryMutAct_9fa48("2451") ? false : stryMutAct_9fa48("2450") ? true : (stryCov_9fa48("2450", "2451", "2452"), node.type !== (stryMutAct_9fa48("2453") ? "" : (stryCov_9fa48("2453"), 'MemberExpression')))) return undefined;
    return stryMutAct_9fa48("2454") ? memberName(node) && staticString(names.constants, node['property']) : (stryCov_9fa48("2454"), memberName(node) ?? staticString(names.constants, node[stryMutAct_9fa48("2455") ? "" : (stryCov_9fa48("2455"), 'property')]));
  }
}

/**
 * Whether a call goes through a global of the given name, reached directly or
 * through the global object.
 * @param node - the node to test.
 * @param name - the global's name.
 * @param names - what this file renamed.
 * @returns true when the node is that call.
 */
export function callsGlobal(node: Node, name: string, names: Names): boolean {
  if (stryMutAct_9fa48("2456")) {
    {}
  } else {
    stryCov_9fa48("2456");
    if (stryMutAct_9fa48("2459") ? node.type === 'CallExpression' : stryMutAct_9fa48("2458") ? false : stryMutAct_9fa48("2457") ? true : (stryCov_9fa48("2457", "2458", "2459"), node.type !== (stryMutAct_9fa48("2460") ? "" : (stryCov_9fa48("2460"), 'CallExpression')))) return stryMutAct_9fa48("2461") ? true : (stryCov_9fa48("2461"), false);
    const callee = unwrap(node[stryMutAct_9fa48("2462") ? "" : (stryCov_9fa48("2462"), 'callee')]);
    if (stryMutAct_9fa48("2465") ? identifier(callee, names) !== name : stryMutAct_9fa48("2464") ? false : stryMutAct_9fa48("2463") ? true : (stryCov_9fa48("2463", "2464", "2465"), identifier(callee, names) === name)) return stryMutAct_9fa48("2466") ? false : (stryCov_9fa48("2466"), true);
    if (stryMutAct_9fa48("2469") ? !isNode(callee) && callee.type !== 'MemberExpression' : stryMutAct_9fa48("2468") ? false : stryMutAct_9fa48("2467") ? true : (stryCov_9fa48("2467", "2468", "2469"), (stryMutAct_9fa48("2470") ? isNode(callee) : (stryCov_9fa48("2470"), !isNode(callee))) || (stryMutAct_9fa48("2472") ? callee.type === 'MemberExpression' : stryMutAct_9fa48("2471") ? false : (stryCov_9fa48("2471", "2472"), callee.type !== (stryMutAct_9fa48("2473") ? "" : (stryCov_9fa48("2473"), 'MemberExpression')))))) return stryMutAct_9fa48("2474") ? true : (stryCov_9fa48("2474"), false);
    const host = identifier(callee[stryMutAct_9fa48("2475") ? "" : (stryCov_9fa48("2475"), 'object')], names);
    return stryMutAct_9fa48("2478") ? host === 'globalThis' || host === 'window' || host === 'self' || property(callee, names) === name : stryMutAct_9fa48("2477") ? false : stryMutAct_9fa48("2476") ? true : (stryCov_9fa48("2476", "2477", "2478"), (stryMutAct_9fa48("2480") ? (host === 'globalThis' || host === 'window') && host === 'self' : stryMutAct_9fa48("2479") ? true : (stryCov_9fa48("2479", "2480"), (stryMutAct_9fa48("2482") ? host === 'globalThis' && host === 'window' : stryMutAct_9fa48("2481") ? false : (stryCov_9fa48("2481", "2482"), (stryMutAct_9fa48("2484") ? host !== 'globalThis' : stryMutAct_9fa48("2483") ? false : (stryCov_9fa48("2483", "2484"), host === (stryMutAct_9fa48("2485") ? "" : (stryCov_9fa48("2485"), 'globalThis')))) || (stryMutAct_9fa48("2487") ? host !== 'window' : stryMutAct_9fa48("2486") ? false : (stryCov_9fa48("2486", "2487"), host === (stryMutAct_9fa48("2488") ? "" : (stryCov_9fa48("2488"), 'window')))))) || (stryMutAct_9fa48("2490") ? host !== 'self' : stryMutAct_9fa48("2489") ? false : (stryCov_9fa48("2489", "2490"), host === (stryMutAct_9fa48("2491") ? "" : (stryCov_9fa48("2491"), 'self')))))) && (stryMutAct_9fa48("2493") ? property(callee, names) !== name : stryMutAct_9fa48("2492") ? true : (stryCov_9fa48("2492", "2493"), property(callee, names) === name)));
  }
}

/**
 * Whether a call goes through a named method on a named object.
 * @param node - the node to test.
 * @param host - the object's name.
 * @param methods - the method names to reject.
 * @param names - what this file renamed.
 * @returns true when the node is one of those calls.
 */
export function callsMethod(node: Node, host: string, methods: readonly string[], names: Names): boolean {
  if (stryMutAct_9fa48("2494")) {
    {}
  } else {
    stryCov_9fa48("2494");
    if (stryMutAct_9fa48("2497") ? node.type === 'CallExpression' : stryMutAct_9fa48("2496") ? false : stryMutAct_9fa48("2495") ? true : (stryCov_9fa48("2495", "2496", "2497"), node.type !== (stryMutAct_9fa48("2498") ? "" : (stryCov_9fa48("2498"), 'CallExpression')))) return stryMutAct_9fa48("2499") ? true : (stryCov_9fa48("2499"), false);
    const callee = unwrap(node[stryMutAct_9fa48("2500") ? "" : (stryCov_9fa48("2500"), 'callee')]);
    if (stryMutAct_9fa48("2503") ? false : stryMutAct_9fa48("2502") ? true : stryMutAct_9fa48("2501") ? isNode(callee) : (stryCov_9fa48("2501", "2502", "2503"), !isNode(callee))) return stryMutAct_9fa48("2504") ? true : (stryCov_9fa48("2504"), false);
    const method = property(callee, names);
    return stryMutAct_9fa48("2507") ? method !== undefined && methods.includes(method) || identifier(callee['object'], names) === host : stryMutAct_9fa48("2506") ? false : stryMutAct_9fa48("2505") ? true : (stryCov_9fa48("2505", "2506", "2507"), (stryMutAct_9fa48("2509") ? method !== undefined || methods.includes(method) : stryMutAct_9fa48("2508") ? true : (stryCov_9fa48("2508", "2509"), (stryMutAct_9fa48("2511") ? method === undefined : stryMutAct_9fa48("2510") ? true : (stryCov_9fa48("2510", "2511"), method !== undefined)) && methods.includes(method))) && (stryMutAct_9fa48("2513") ? identifier(callee['object'], names) !== host : stryMutAct_9fa48("2512") ? true : (stryCov_9fa48("2512", "2513"), identifier(callee[stryMutAct_9fa48("2514") ? "" : (stryCov_9fa48("2514"), 'object')], names) === host)));
  }
}

/**
 * The string a literal carries, when it is a string.
 * @param value - the node to read.
 * @returns the string, or undefined.
 */
export function literalKey(value: Field | undefined): string | undefined {
  if (stryMutAct_9fa48("2515")) {
    {}
  } else {
    stryCov_9fa48("2515");
    return (stryMutAct_9fa48("2518") ? isNode(value) && value.type === 'Literal' || typeof value['value'] === 'string' : stryMutAct_9fa48("2517") ? false : stryMutAct_9fa48("2516") ? true : (stryCov_9fa48("2516", "2517", "2518"), (stryMutAct_9fa48("2520") ? isNode(value) || value.type === 'Literal' : stryMutAct_9fa48("2519") ? true : (stryCov_9fa48("2519", "2520"), isNode(value) && (stryMutAct_9fa48("2522") ? value.type !== 'Literal' : stryMutAct_9fa48("2521") ? true : (stryCov_9fa48("2521", "2522"), value.type === (stryMutAct_9fa48("2523") ? "" : (stryCov_9fa48("2523"), 'Literal')))))) && (stryMutAct_9fa48("2525") ? typeof value['value'] !== 'string' : stryMutAct_9fa48("2524") ? true : (stryCov_9fa48("2524", "2525"), typeof value[stryMutAct_9fa48("2526") ? "" : (stryCov_9fa48("2526"), 'value')] === (stryMutAct_9fa48("2527") ? "" : (stryCov_9fa48("2527"), 'string')))))) ? value[stryMutAct_9fa48("2528") ? "" : (stryCov_9fa48("2528"), 'value')] : undefined;
  }
}