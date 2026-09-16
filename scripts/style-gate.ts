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
  if (stryMutAct_9fa48("2707")) {
    {}
  } else {
    stryCov_9fa48("2707");
    const parsed = parseScript(label, text);
    const offences: Offence[] = stryMutAct_9fa48("2708") ? ["Stryker was here"] : (stryCov_9fa48("2708"), []);
    const report = (node: Node, why: string): void => {
      if (stryMutAct_9fa48("2709")) {
        {}
      } else {
        stryCov_9fa48("2709");
        offences.push(stryMutAct_9fa48("2711") ? {} : (stryCov_9fa48("2711"), {
          label,
          line: parsed.lineAt(node[stryMutAct_9fa48("2712") ? "" : (stryCov_9fa48("2712"), 'start')]),
          why
        }));
      }
    };
    for (const error of parsed.errors) {
      if (stryMutAct_9fa48("2713")) {
        {}
      } else {
        stryCov_9fa48("2713");
        offences.push(stryMutAct_9fa48("2715") ? {} : (stryCov_9fa48("2715"), {
          label,
          line: 1,
          why: stryMutAct_9fa48("2716") ? `` : (stryCov_9fa48("2716"), `this file does not parse, so it cannot be checked: ${error.message}`)
        }));
      }
    }
    const env = constants(parsed.body);
    walk(parsed.body, node => {
      if (stryMutAct_9fa48("2718")) {
        {}
      } else {
        stryCov_9fa48("2718");
        if (stryMutAct_9fa48("2719")) {
          ;
        } else {
          stryCov_9fa48("2719");
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
  if (stryMutAct_9fa48("2720")) {
    {}
  } else {
    stryCov_9fa48("2720");
    stryMutAct_9fa48("2721") ? INSPECTORS.get(node.type)(env, node, report) : (stryCov_9fa48("2721"), INSPECTORS.get(node.type)?.(env, node, report));
  }
}

/** Which rule reads which kind of node. */
const INSPECTORS = new Map<string, (env: Constants, node: Node, report: (node: Node, why: string) => void) => void>(stryMutAct_9fa48("2722") ? [] : (stryCov_9fa48("2722"), [stryMutAct_9fa48("2723") ? [] : (stryCov_9fa48("2723"), [stryMutAct_9fa48("2724") ? "" : (stryCov_9fa48("2724"), 'MemberExpression'), inspectMember]), stryMutAct_9fa48("2725") ? [] : (stryCov_9fa48("2725"), [stryMutAct_9fa48("2726") ? "" : (stryCov_9fa48("2726"), 'ObjectPattern'), inspectPattern]), stryMutAct_9fa48("2727") ? [] : (stryCov_9fa48("2727"), [stryMutAct_9fa48("2728") ? "" : (stryCov_9fa48("2728"), 'JSXAttribute'), inspectJsxAttribute]), stryMutAct_9fa48("2729") ? [] : (stryCov_9fa48("2729"), [stryMutAct_9fa48("2730") ? "" : (stryCov_9fa48("2730"), 'CallExpression'), inspectCall]), stryMutAct_9fa48("2731") ? [] : (stryCov_9fa48("2731"), [stryMutAct_9fa48("2732") ? "" : (stryCov_9fa48("2732"), 'Literal'), inspectMarkupString]), stryMutAct_9fa48("2733") ? [] : (stryCov_9fa48("2733"), [stryMutAct_9fa48("2734") ? "" : (stryCov_9fa48("2734"), 'TemplateLiteral'), inspectMarkupString]), stryMutAct_9fa48("2735") ? [] : (stryCov_9fa48("2735"), [stryMutAct_9fa48("2736") ? "" : (stryCov_9fa48("2736"), 'BinaryExpression'), inspectMarkupString])]));

/**
 * Reject reaching an element's style declaration, spelt plainly or computed.
 * @param env - the file's constants.
 * @param node - the member expression.
 * @param report - records an offence.
 */
function inspectMember(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2737")) {
    {}
  } else {
    stryCov_9fa48("2737");
    const key = keyOf(env, node[stryMutAct_9fa48("2738") ? "" : (stryCov_9fa48("2738"), 'property')], stryMutAct_9fa48("2741") ? node['computed'] !== true : stryMutAct_9fa48("2740") ? false : stryMutAct_9fa48("2739") ? true : (stryCov_9fa48("2739", "2740", "2741"), node[stryMutAct_9fa48("2742") ? "" : (stryCov_9fa48("2742"), 'computed')] === (stryMutAct_9fa48("2743") ? false : (stryCov_9fa48("2743"), true))));
    if (stryMutAct_9fa48("2746") ? key !== undefined : stryMutAct_9fa48("2745") ? false : stryMutAct_9fa48("2744") ? true : (stryCov_9fa48("2744", "2745", "2746"), key === undefined)) return;
    const why = STYLE_PROPERTIES.get(stryMutAct_9fa48("2747") ? key.toUpperCase() : (stryCov_9fa48("2747"), key.toLowerCase()));
    if (stryMutAct_9fa48("2750") ? why === undefined : stryMutAct_9fa48("2749") ? false : stryMutAct_9fa48("2748") ? true : (stryCov_9fa48("2748", "2749", "2750"), why !== undefined)) if (stryMutAct_9fa48("2751")) {
      ;
    } else {
      stryCov_9fa48("2751");
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
  if (stryMutAct_9fa48("2752")) {
    {}
  } else {
    stryCov_9fa48("2752");
    const properties = node[stryMutAct_9fa48("2753") ? "" : (stryCov_9fa48("2753"), 'properties')];
    if (stryMutAct_9fa48("2756") ? false : stryMutAct_9fa48("2755") ? true : stryMutAct_9fa48("2754") ? Array.isArray(properties) : (stryCov_9fa48("2754", "2755", "2756"), !Array.isArray(properties))) return;
    for (const property of properties) {
      if (stryMutAct_9fa48("2757")) {
        {}
      } else {
        stryCov_9fa48("2757");
        if (stryMutAct_9fa48("2760") ? !isNode(property) && property.type !== 'Property' : stryMutAct_9fa48("2759") ? false : stryMutAct_9fa48("2758") ? true : (stryCov_9fa48("2758", "2759", "2760"), (stryMutAct_9fa48("2761") ? isNode(property) : (stryCov_9fa48("2761"), !isNode(property))) || (stryMutAct_9fa48("2763") ? property.type === 'Property' : stryMutAct_9fa48("2762") ? false : (stryCov_9fa48("2762", "2763"), property.type !== (stryMutAct_9fa48("2764") ? "" : (stryCov_9fa48("2764"), 'Property')))))) continue;
        const key = keyOf(env, property[stryMutAct_9fa48("2765") ? "" : (stryCov_9fa48("2765"), 'key')], stryMutAct_9fa48("2768") ? property['computed'] !== true : stryMutAct_9fa48("2767") ? false : stryMutAct_9fa48("2766") ? true : (stryCov_9fa48("2766", "2767", "2768"), property[stryMutAct_9fa48("2769") ? "" : (stryCov_9fa48("2769"), 'computed')] === (stryMutAct_9fa48("2770") ? false : (stryCov_9fa48("2770"), true))));
        if (stryMutAct_9fa48("2773") ? key !== undefined : stryMutAct_9fa48("2772") ? false : stryMutAct_9fa48("2771") ? true : (stryCov_9fa48("2771", "2772", "2773"), key === undefined)) continue;
        const why = STYLE_PROPERTIES.get(stryMutAct_9fa48("2774") ? key.toUpperCase() : (stryCov_9fa48("2774"), key.toLowerCase()));
        if (stryMutAct_9fa48("2777") ? why === undefined : stryMutAct_9fa48("2776") ? false : stryMutAct_9fa48("2775") ? true : (stryCov_9fa48("2775", "2776", "2777"), why !== undefined)) if (stryMutAct_9fa48("2778")) {
          ;
        } else {
          stryCov_9fa48("2778");
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
  if (stryMutAct_9fa48("2779")) {
    {}
  } else {
    stryCov_9fa48("2779");
    const name = node[stryMutAct_9fa48("2780") ? "" : (stryCov_9fa48("2780"), 'name')];
    if (stryMutAct_9fa48("2783") ? false : stryMutAct_9fa48("2782") ? true : stryMutAct_9fa48("2781") ? isNode(name) : (stryCov_9fa48("2781", "2782", "2783"), !isNode(name))) return;
    const written = (stryMutAct_9fa48("2786") ? typeof name['name'] !== 'string' : stryMutAct_9fa48("2785") ? false : stryMutAct_9fa48("2784") ? true : (stryCov_9fa48("2784", "2785", "2786"), typeof name[stryMutAct_9fa48("2787") ? "" : (stryCov_9fa48("2787"), 'name')] === (stryMutAct_9fa48("2788") ? "" : (stryCov_9fa48("2788"), 'string')))) ? name[stryMutAct_9fa48("2789") ? "" : (stryCov_9fa48("2789"), 'name')] : undefined;
    if (stryMutAct_9fa48("2792") ? written !== undefined : stryMutAct_9fa48("2791") ? false : stryMutAct_9fa48("2790") ? true : (stryCov_9fa48("2790", "2791", "2792"), written === undefined)) return;
    const why = STYLE_PROPERTIES.get(stryMutAct_9fa48("2793") ? written.toUpperCase() : (stryCov_9fa48("2793"), written.toLowerCase()));
    if (stryMutAct_9fa48("2796") ? why === undefined : stryMutAct_9fa48("2795") ? false : stryMutAct_9fa48("2794") ? true : (stryCov_9fa48("2794", "2795", "2796"), why !== undefined)) if (stryMutAct_9fa48("2797")) {
      ;
    } else {
      stryCov_9fa48("2797");
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
  if (stryMutAct_9fa48("2798")) {
    {}
  } else {
    stryCov_9fa48("2798");
    // Read as far as it can be read: a value interpolated into the markup stands
    // in as a placeholder, so a tag whose refused attribute is written half in
    // the source still names that attribute. Requiring the whole string to fold
    // let every runtime-assembled fragment through.
    const text = approximateString(env, node);
    if (stryMutAct_9fa48("2801") ? text === undefined && !text.includes('<') : stryMutAct_9fa48("2800") ? false : stryMutAct_9fa48("2799") ? true : (stryCov_9fa48("2799", "2800", "2801"), (stryMutAct_9fa48("2803") ? text !== undefined : stryMutAct_9fa48("2802") ? false : (stryCov_9fa48("2802", "2803"), text === undefined)) || (stryMutAct_9fa48("2804") ? text.includes('<') : (stryCov_9fa48("2804"), !text.includes(stryMutAct_9fa48("2805") ? "" : (stryCov_9fa48("2805"), '<')))))) return;
    const found = markupOffences(text);
    if (stryMutAct_9fa48("2808") ? found.length !== 0 : stryMutAct_9fa48("2807") ? false : stryMutAct_9fa48("2806") ? true : (stryCov_9fa48("2806", "2807", "2808"), found.length === 0)) return;
    for (const offence of found) if (stryMutAct_9fa48("2809")) {
      ;
    } else {
      stryCov_9fa48("2809");
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
  if (stryMutAct_9fa48("2810")) {
    {}
  } else {
    stryCov_9fa48("2810");
    if (stryMutAct_9fa48("2813") ? MARKUP_EXTENSIONS.every(extension => label.endsWith(extension)) : stryMutAct_9fa48("2812") ? false : stryMutAct_9fa48("2811") ? true : (stryCov_9fa48("2811", "2812", "2813"), MARKUP_EXTENSIONS.some(stryMutAct_9fa48("2814") ? () => undefined : (stryCov_9fa48("2814"), extension => stryMutAct_9fa48("2815") ? label.startsWith(extension) : (stryCov_9fa48("2815"), label.endsWith(extension)))))) return scanMarkup(label, text);
    return scanScript(label, text);
  }
}