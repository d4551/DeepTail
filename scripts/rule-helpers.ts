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
  if (stryMutAct_9fa48("1979")) {
    {}
  } else {
    stryCov_9fa48("1979");
    const value = unwrap(holder);
    if (stryMutAct_9fa48("1982") ? (!isNode(value) || value.type !== 'Identifier') && typeof value.name !== 'string' : stryMutAct_9fa48("1981") ? false : stryMutAct_9fa48("1980") ? true : (stryCov_9fa48("1980", "1981", "1982"), (stryMutAct_9fa48("1984") ? !isNode(value) && value.type !== 'Identifier' : stryMutAct_9fa48("1983") ? false : (stryCov_9fa48("1983", "1984"), (stryMutAct_9fa48("1985") ? isNode(value) : (stryCov_9fa48("1985"), !isNode(value))) || (stryMutAct_9fa48("1987") ? value.type === 'Identifier' : stryMutAct_9fa48("1986") ? false : (stryCov_9fa48("1986", "1987"), value.type !== (stryMutAct_9fa48("1988") ? "" : (stryCov_9fa48("1988"), 'Identifier')))))) || (stryMutAct_9fa48("1990") ? typeof value.name === 'string' : stryMutAct_9fa48("1989") ? false : (stryCov_9fa48("1989", "1990"), typeof value.name !== (stryMutAct_9fa48("1991") ? "" : (stryCov_9fa48("1991"), 'string')))))) return undefined;
    const written = value.name;
    return stryMutAct_9fa48("1992") ? names.aliases.get(written) && written : (stryCov_9fa48("1992"), names.aliases.get(written) ?? written);
  }
}

/**
 * The property a member expression names, however it is reached.
 * @param node - the member expression.
 * @param names - what this file renamed and what it holds in constants.
 * @returns the property name, or undefined.
 */
export function property(node: Node, names: Names): string | undefined {
  if (stryMutAct_9fa48("1993")) {
    {}
  } else {
    stryCov_9fa48("1993");
    if (stryMutAct_9fa48("1996") ? node.type === 'MemberExpression' : stryMutAct_9fa48("1995") ? false : stryMutAct_9fa48("1994") ? true : (stryCov_9fa48("1994", "1995", "1996"), node.type !== (stryMutAct_9fa48("1997") ? "" : (stryCov_9fa48("1997"), 'MemberExpression')))) return undefined;
    return stryMutAct_9fa48("1998") ? memberName(node) && staticString(names.constants, node.property) : (stryCov_9fa48("1998"), memberName(node) ?? staticString(names.constants, node.property));
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
  if (stryMutAct_9fa48("1999")) {
    {}
  } else {
    stryCov_9fa48("1999");
    if (stryMutAct_9fa48("2002") ? node.type === 'CallExpression' : stryMutAct_9fa48("2001") ? false : stryMutAct_9fa48("2000") ? true : (stryCov_9fa48("2000", "2001", "2002"), node.type !== (stryMutAct_9fa48("2003") ? "" : (stryCov_9fa48("2003"), 'CallExpression')))) return stryMutAct_9fa48("2004") ? true : (stryCov_9fa48("2004"), false);
    const callee = unwrap(node.callee);
    if (stryMutAct_9fa48("2007") ? identifier(callee, names) !== name : stryMutAct_9fa48("2006") ? false : stryMutAct_9fa48("2005") ? true : (stryCov_9fa48("2005", "2006", "2007"), identifier(callee, names) === name)) return stryMutAct_9fa48("2008") ? false : (stryCov_9fa48("2008"), true);
    if (stryMutAct_9fa48("2011") ? !isNode(callee) && callee.type !== 'MemberExpression' : stryMutAct_9fa48("2010") ? false : stryMutAct_9fa48("2009") ? true : (stryCov_9fa48("2009", "2010", "2011"), (stryMutAct_9fa48("2012") ? isNode(callee) : (stryCov_9fa48("2012"), !isNode(callee))) || (stryMutAct_9fa48("2014") ? callee.type === 'MemberExpression' : stryMutAct_9fa48("2013") ? false : (stryCov_9fa48("2013", "2014"), callee.type !== (stryMutAct_9fa48("2015") ? "" : (stryCov_9fa48("2015"), 'MemberExpression')))))) return stryMutAct_9fa48("2016") ? true : (stryCov_9fa48("2016"), false);
    const host = identifier(callee.object, names);
    return stryMutAct_9fa48("2019") ? host === 'globalThis' || host === 'window' || host === 'self' || property(callee, names) === name : stryMutAct_9fa48("2018") ? false : stryMutAct_9fa48("2017") ? true : (stryCov_9fa48("2017", "2018", "2019"), (stryMutAct_9fa48("2021") ? (host === 'globalThis' || host === 'window') && host === 'self' : stryMutAct_9fa48("2020") ? true : (stryCov_9fa48("2020", "2021"), (stryMutAct_9fa48("2023") ? host === 'globalThis' && host === 'window' : stryMutAct_9fa48("2022") ? false : (stryCov_9fa48("2022", "2023"), (stryMutAct_9fa48("2025") ? host !== 'globalThis' : stryMutAct_9fa48("2024") ? false : (stryCov_9fa48("2024", "2025"), host === (stryMutAct_9fa48("2026") ? "" : (stryCov_9fa48("2026"), 'globalThis')))) || (stryMutAct_9fa48("2028") ? host !== 'window' : stryMutAct_9fa48("2027") ? false : (stryCov_9fa48("2027", "2028"), host === (stryMutAct_9fa48("2029") ? "" : (stryCov_9fa48("2029"), 'window')))))) || (stryMutAct_9fa48("2031") ? host !== 'self' : stryMutAct_9fa48("2030") ? false : (stryCov_9fa48("2030", "2031"), host === (stryMutAct_9fa48("2032") ? "" : (stryCov_9fa48("2032"), 'self')))))) && (stryMutAct_9fa48("2034") ? property(callee, names) !== name : stryMutAct_9fa48("2033") ? true : (stryCov_9fa48("2033", "2034"), property(callee, names) === name)));
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
  if (stryMutAct_9fa48("2035")) {
    {}
  } else {
    stryCov_9fa48("2035");
    if (stryMutAct_9fa48("2038") ? node.type === 'CallExpression' : stryMutAct_9fa48("2037") ? false : stryMutAct_9fa48("2036") ? true : (stryCov_9fa48("2036", "2037", "2038"), node.type !== (stryMutAct_9fa48("2039") ? "" : (stryCov_9fa48("2039"), 'CallExpression')))) return stryMutAct_9fa48("2040") ? true : (stryCov_9fa48("2040"), false);
    const callee = unwrap(node.callee);
    if (stryMutAct_9fa48("2043") ? false : stryMutAct_9fa48("2042") ? true : stryMutAct_9fa48("2041") ? isNode(callee) : (stryCov_9fa48("2041", "2042", "2043"), !isNode(callee))) return stryMutAct_9fa48("2044") ? true : (stryCov_9fa48("2044"), false);
    const method = property(callee, names);
    return stryMutAct_9fa48("2047") ? method !== undefined && methods.includes(method) || identifier(callee.object, names) === host : stryMutAct_9fa48("2046") ? false : stryMutAct_9fa48("2045") ? true : (stryCov_9fa48("2045", "2046", "2047"), (stryMutAct_9fa48("2049") ? method !== undefined || methods.includes(method) : stryMutAct_9fa48("2048") ? true : (stryCov_9fa48("2048", "2049"), (stryMutAct_9fa48("2051") ? method === undefined : stryMutAct_9fa48("2050") ? true : (stryCov_9fa48("2050", "2051"), method !== undefined)) && methods.includes(method))) && (stryMutAct_9fa48("2053") ? identifier(callee.object, names) !== host : stryMutAct_9fa48("2052") ? true : (stryCov_9fa48("2052", "2053"), identifier(callee.object, names) === host)));
  }
}

/**
 * The string a literal carries, when it is a string.
 * @param value - the node to read.
 * @returns the string, or undefined.
 */
export function literalKey(value: Field | undefined): string | undefined {
  if (stryMutAct_9fa48("2054")) {
    {}
  } else {
    stryCov_9fa48("2054");
    return (stryMutAct_9fa48("2057") ? isNode(value) && value.type === 'Literal' || typeof value.value === 'string' : stryMutAct_9fa48("2056") ? false : stryMutAct_9fa48("2055") ? true : (stryCov_9fa48("2055", "2056", "2057"), (stryMutAct_9fa48("2059") ? isNode(value) || value.type === 'Literal' : stryMutAct_9fa48("2058") ? true : (stryCov_9fa48("2058", "2059"), isNode(value) && (stryMutAct_9fa48("2061") ? value.type !== 'Literal' : stryMutAct_9fa48("2060") ? true : (stryCov_9fa48("2060", "2061"), value.type === (stryMutAct_9fa48("2062") ? "" : (stryCov_9fa48("2062"), 'Literal')))))) && (stryMutAct_9fa48("2064") ? typeof value.value !== 'string' : stryMutAct_9fa48("2063") ? true : (stryCov_9fa48("2063", "2064"), typeof value.value === (stryMutAct_9fa48("2065") ? "" : (stryCov_9fa48("2065"), 'string')))))) ? value.value : undefined;
  }
}