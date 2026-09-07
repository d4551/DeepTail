/**
 * The inline-style ban, read off the syntax tree rather than the text.
 *
 * Every visual belongs to a stylesheet, so the two products stay one design
 * system and a token change reaches everything. Neither oxlint nor Biome has a
 * rule for `element.style.x = …` in plain DOM, so the ban is an executed gate.
 *
 * It is executed against a real parse. A gate that reads lines has to guess
 * which of them are comments, which are prose and which are its own rule
 * table, and every one of those guesses is a way through it: a different case,
 * a name in a variable, a name spelt with `+`. None of those survive a parser.
 * Scripts are parsed by oxc — the same parser the project's linter uses — and
 * markup by parse5, which implements the HTML parsing algorithm the browser
 * does. The rules below are stated about nodes, so there is nothing to spell
 * around and no allowance to grant: this module's own rule table is string
 * data in an array, which is not a property access, a call, or an attribute.
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
import { isNode, type Node, parseScript, walk } from './ast.ts';
import { MARKUP_EXTENSIONS, SCRIPT_EXTENSIONS } from './extensions.ts';
import { approximateString, type Constants, constants } from './fold.ts';
import { markupOffences, scanMarkup } from './markup-gate.ts';
import type { Offence } from './offence.ts';
import { inspectCall, keyOf, STYLE_PROPERTIES } from './style-writes.ts';
export { MARKUP_EXTENSIONS, SCRIPT_EXTENSIONS };

/**
 * Every inline style a script reaches for.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanScript(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("2191")) {
    {}
  } else {
    stryCov_9fa48("2191");
    const parsed = parseScript(label, text);
    const offences: Offence[] = stryMutAct_9fa48("2192") ? ["Stryker was here"] : (stryCov_9fa48("2192"), []);
    const report = (node: Node, why: string): void => {
      if (stryMutAct_9fa48("2193")) {
        {}
      } else {
        stryCov_9fa48("2193");
        offences.push(stryMutAct_9fa48("2195") ? {} : (stryCov_9fa48("2195"), {
          label,
          line: parsed.lineAt(node.start),
          why
        }));
      }
    };
    for (const error of parsed.errors) {
      if (stryMutAct_9fa48("2196")) {
        {}
      } else {
        stryCov_9fa48("2196");
        offences.push(stryMutAct_9fa48("2198") ? {} : (stryCov_9fa48("2198"), {
          label,
          line: 1,
          why: stryMutAct_9fa48("2199") ? `` : (stryCov_9fa48("2199"), `this file does not parse, so it cannot be checked: ${error.message}`)
        }));
      }
    }
    const env = constants(parsed.body);
    walk(parsed.body, node => {
      if (stryMutAct_9fa48("2201")) {
        {}
      } else {
        stryCov_9fa48("2201");
        if (stryMutAct_9fa48("2202")) {
          ;
        } else {
          stryCov_9fa48("2202");
          inspect(env, node, report);
        }
      }
    });
    return offences;
  }
}

/**
 * Judge one node against every rule.
 * @param env - the file's constants.
 * @param node - the node to judge.
 * @param report - records an offence against a node.
 */
function inspect(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2203")) {
    {}
  } else {
    stryCov_9fa48("2203");
    stryMutAct_9fa48("2204") ? INSPECTORS.get(node.type)(env, node, report) : (stryCov_9fa48("2204"), INSPECTORS.get(node.type)?.(env, node, report));
  }
}

/** Which rule reads which kind of node. */
const INSPECTORS = new Map<string, (env: Constants, node: Node, report: (node: Node, why: string) => void) => void>(stryMutAct_9fa48("2205") ? [] : (stryCov_9fa48("2205"), [stryMutAct_9fa48("2206") ? [] : (stryCov_9fa48("2206"), [stryMutAct_9fa48("2207") ? "" : (stryCov_9fa48("2207"), 'MemberExpression'), inspectMember]), stryMutAct_9fa48("2208") ? [] : (stryCov_9fa48("2208"), [stryMutAct_9fa48("2209") ? "" : (stryCov_9fa48("2209"), 'ObjectPattern'), inspectPattern]), stryMutAct_9fa48("2210") ? [] : (stryCov_9fa48("2210"), [stryMutAct_9fa48("2211") ? "" : (stryCov_9fa48("2211"), 'JSXAttribute'), inspectJsxAttribute]), stryMutAct_9fa48("2212") ? [] : (stryCov_9fa48("2212"), [stryMutAct_9fa48("2213") ? "" : (stryCov_9fa48("2213"), 'CallExpression'), inspectCall]), stryMutAct_9fa48("2214") ? [] : (stryCov_9fa48("2214"), [stryMutAct_9fa48("2215") ? "" : (stryCov_9fa48("2215"), 'Literal'), inspectMarkupString]), stryMutAct_9fa48("2216") ? [] : (stryCov_9fa48("2216"), [stryMutAct_9fa48("2217") ? "" : (stryCov_9fa48("2217"), 'TemplateLiteral'), inspectMarkupString]), stryMutAct_9fa48("2218") ? [] : (stryCov_9fa48("2218"), [stryMutAct_9fa48("2219") ? "" : (stryCov_9fa48("2219"), 'BinaryExpression'), inspectMarkupString])]));

/**
 * Reject reaching an element's style declaration, spelt plainly or computed.
 * @param env - the file's constants.
 * @param node - the member expression.
 * @param report - records an offence.
 */
function inspectMember(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2220")) {
    {}
  } else {
    stryCov_9fa48("2220");
    const key = keyOf(env, node.property, stryMutAct_9fa48("2223") ? node.computed !== true : stryMutAct_9fa48("2222") ? false : stryMutAct_9fa48("2221") ? true : (stryCov_9fa48("2221", "2222", "2223"), node.computed === (stryMutAct_9fa48("2224") ? false : (stryCov_9fa48("2224"), true))));
    if (stryMutAct_9fa48("2227") ? key !== undefined : stryMutAct_9fa48("2226") ? false : stryMutAct_9fa48("2225") ? true : (stryCov_9fa48("2225", "2226", "2227"), key === undefined)) return;
    const why = STYLE_PROPERTIES.get(stryMutAct_9fa48("2228") ? key.toUpperCase() : (stryCov_9fa48("2228"), key.toLowerCase()));
    if (stryMutAct_9fa48("2231") ? why === undefined : stryMutAct_9fa48("2230") ? false : stryMutAct_9fa48("2229") ? true : (stryCov_9fa48("2229", "2230", "2231"), why !== undefined)) if (stryMutAct_9fa48("2232")) {
      ;
    } else {
      stryCov_9fa48("2232");
      report(node, why);
    }
  }
}

/**
 * Reject taking the style declaration out of an element by destructuring it.
 *
 * Only a binding pattern is judged, not every object that happens to carry a
 * key of that name: `{ style: 'narrow' }` is an option some platform formatters
 * take, and an object built with such a key can only become an inline style by
 * passing through one of the writes above, each of which is already refused.
 * @param env - the file's constants.
 * @param node - the object pattern.
 * @param report - records an offence.
 */
function inspectPattern(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2233")) {
    {}
  } else {
    stryCov_9fa48("2233");
    const properties = node.properties;
    if (stryMutAct_9fa48("2236") ? false : stryMutAct_9fa48("2235") ? true : stryMutAct_9fa48("2234") ? Array.isArray(properties) : (stryCov_9fa48("2234", "2235", "2236"), !Array.isArray(properties))) return;
    for (const property of properties) {
      if (stryMutAct_9fa48("2237")) {
        {}
      } else {
        stryCov_9fa48("2237");
        if (stryMutAct_9fa48("2240") ? !isNode(property) && property.type !== 'Property' : stryMutAct_9fa48("2239") ? false : stryMutAct_9fa48("2238") ? true : (stryCov_9fa48("2238", "2239", "2240"), (stryMutAct_9fa48("2241") ? isNode(property) : (stryCov_9fa48("2241"), !isNode(property))) || (stryMutAct_9fa48("2243") ? property.type === 'Property' : stryMutAct_9fa48("2242") ? false : (stryCov_9fa48("2242", "2243"), property.type !== (stryMutAct_9fa48("2244") ? "" : (stryCov_9fa48("2244"), 'Property')))))) continue;
        const key = keyOf(env, property.key, stryMutAct_9fa48("2247") ? property.computed !== true : stryMutAct_9fa48("2246") ? false : stryMutAct_9fa48("2245") ? true : (stryCov_9fa48("2245", "2246", "2247"), property.computed === (stryMutAct_9fa48("2248") ? false : (stryCov_9fa48("2248"), true))));
        if (stryMutAct_9fa48("2251") ? key !== undefined : stryMutAct_9fa48("2250") ? false : stryMutAct_9fa48("2249") ? true : (stryCov_9fa48("2249", "2250", "2251"), key === undefined)) continue;
        const why = STYLE_PROPERTIES.get(stryMutAct_9fa48("2252") ? key.toUpperCase() : (stryCov_9fa48("2252"), key.toLowerCase()));
        if (stryMutAct_9fa48("2255") ? why === undefined : stryMutAct_9fa48("2254") ? false : stryMutAct_9fa48("2253") ? true : (stryCov_9fa48("2253", "2254", "2255"), why !== undefined)) if (stryMutAct_9fa48("2256")) {
          ;
        } else {
          stryCov_9fa48("2256");
          report(property, why);
        }
      }
    }
  }
}

/**
 * Reject the style attribute written in JSX.
 *
 * The dialects this gate reads include the ones that carry JSX, so the markup
 * form of the attribute has to be refused there as well as in a string.
 * @param _env - the file's constants, which a written attribute name needs none of.
 * @param node - the JSX attribute.
 * @param report - records an offence.
 */
function inspectJsxAttribute(_env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2257")) {
    {}
  } else {
    stryCov_9fa48("2257");
    const name = node.name;
    if (stryMutAct_9fa48("2260") ? false : stryMutAct_9fa48("2259") ? true : stryMutAct_9fa48("2258") ? isNode(name) : (stryCov_9fa48("2258", "2259", "2260"), !isNode(name))) return;
    const written = (stryMutAct_9fa48("2263") ? typeof name.name !== 'string' : stryMutAct_9fa48("2262") ? false : stryMutAct_9fa48("2261") ? true : (stryCov_9fa48("2261", "2262", "2263"), typeof name.name === (stryMutAct_9fa48("2264") ? "" : (stryCov_9fa48("2264"), 'string')))) ? name.name : undefined;
    if (stryMutAct_9fa48("2267") ? written !== undefined : stryMutAct_9fa48("2266") ? false : stryMutAct_9fa48("2265") ? true : (stryCov_9fa48("2265", "2266", "2267"), written === undefined)) return;
    const why = STYLE_PROPERTIES.get(stryMutAct_9fa48("2268") ? written.toUpperCase() : (stryCov_9fa48("2268"), written.toLowerCase()));
    if (stryMutAct_9fa48("2271") ? why === undefined : stryMutAct_9fa48("2270") ? false : stryMutAct_9fa48("2269") ? true : (stryCov_9fa48("2269", "2270", "2271"), why !== undefined)) if (stryMutAct_9fa48("2272")) {
      ;
    } else {
      stryCov_9fa48("2272");
      report(node, why);
    }
  }
}

/**
 * Reject markup written in the source that carries a style attribute, whatever
 * is going to insert it.
 * @param env - the file's constants.
 * @param node - a string-producing expression.
 * @param report - records an offence.
 */
function inspectMarkupString(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2273")) {
    {}
  } else {
    stryCov_9fa48("2273");
    // Read as far as it can be read: a value interpolated into the markup stands
    // in as a placeholder, so a tag whose refused attribute is written half in
    // the source still names that attribute. Requiring the whole string to fold
    // let every runtime-assembled fragment through.
    const text = approximateString(env, node);
    if (stryMutAct_9fa48("2276") ? text === undefined && !text.includes('<') : stryMutAct_9fa48("2275") ? false : stryMutAct_9fa48("2274") ? true : (stryCov_9fa48("2274", "2275", "2276"), (stryMutAct_9fa48("2278") ? text !== undefined : stryMutAct_9fa48("2277") ? false : (stryCov_9fa48("2277", "2278"), text === undefined)) || (stryMutAct_9fa48("2279") ? text.includes('<') : (stryCov_9fa48("2279"), !text.includes(stryMutAct_9fa48("2280") ? "" : (stryCov_9fa48("2280"), '<')))))) return;
    const found = markupOffences(text);
    if (stryMutAct_9fa48("2283") ? found.length !== 0 : stryMutAct_9fa48("2282") ? false : stryMutAct_9fa48("2281") ? true : (stryCov_9fa48("2281", "2282", "2283"), found.length === 0)) return;
    for (const offence of found) if (stryMutAct_9fa48("2284")) {
      ;
    } else {
      stryCov_9fa48("2284");
      report(node, offence.why);
    }
  }
}

/**
 * Scan one file, choosing the reader its extension calls for.
 * @param label - the path, which also selects the reader.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanSource(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("2285")) {
    {}
  } else {
    stryCov_9fa48("2285");
    if (stryMutAct_9fa48("2288") ? MARKUP_EXTENSIONS.every(extension => label.endsWith(extension)) : stryMutAct_9fa48("2287") ? false : stryMutAct_9fa48("2286") ? true : (stryCov_9fa48("2286", "2287", "2288"), MARKUP_EXTENSIONS.some(stryMutAct_9fa48("2289") ? () => undefined : (stryCov_9fa48("2289"), extension => stryMutAct_9fa48("2290") ? label.startsWith(extension) : (stryCov_9fa48("2290"), label.endsWith(extension)))))) return scanMarkup(label, text);
    return scanScript(label, text);
  }
}