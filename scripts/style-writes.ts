/**
 * The calls that write a styling attribute or property onto something, and the
 * names those calls carry.
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
import { type Field, isNode, memberName, type Node, unwrap } from './ast.ts';
import { type Constants, staticString } from './fold.ts';

/** Calls that set an attribute, and which argument names it. */
const ATTRIBUTE_SETTERS = new Map<string, number>(stryMutAct_9fa48("2816") ? [] : (stryCov_9fa48("2816"), [stryMutAct_9fa48("2817") ? [] : (stryCov_9fa48("2817"), [stryMutAct_9fa48("2818") ? "" : (stryCov_9fa48("2818"), 'setAttribute'), 0]), stryMutAct_9fa48("2819") ? [] : (stryCov_9fa48("2819"), [stryMutAct_9fa48("2820") ? "" : (stryCov_9fa48("2820"), 'setAttributeNS'), 1]), stryMutAct_9fa48("2821") ? [] : (stryCov_9fa48("2821"), [stryMutAct_9fa48("2822") ? "" : (stryCov_9fa48("2822"), 'createAttribute'), 0]), stryMutAct_9fa48("2823") ? [] : (stryCov_9fa48("2823"), [stryMutAct_9fa48("2824") ? "" : (stryCov_9fa48("2824"), 'createAttributeNS'), 1]), stryMutAct_9fa48("2825") ? [] : (stryCov_9fa48("2825"), [stryMutAct_9fa48("2826") ? "" : (stryCov_9fa48("2826"), 'toggleAttribute'), 0])]));

/** Calls that write a property under a name, and which argument names it. */
const KEYED_WRITES = new Map<string, number>(stryMutAct_9fa48("2827") ? [] : (stryCov_9fa48("2827"), [stryMutAct_9fa48("2828") ? [] : (stryCov_9fa48("2828"), [stryMutAct_9fa48("2829") ? "" : (stryCov_9fa48("2829"), 'set'), 1]), stryMutAct_9fa48("2830") ? [] : (stryCov_9fa48("2830"), [stryMutAct_9fa48("2831") ? "" : (stryCov_9fa48("2831"), 'defineProperty'), 1])]));

/**
 * Calls that write every property an object literal carries.
 *
 * `Object.assign(el, { style })` reaches the same declaration as `el.style`,
 * and it is already this codebase's idiom for merging onto an object, so the
 * keys of what is being merged are read.
 */
const MERGED_WRITES = new Set(stryMutAct_9fa48("2832") ? [] : (stryCov_9fa48("2832"), [stryMutAct_9fa48("2833") ? "" : (stryCov_9fa48("2833"), 'assign'), stryMutAct_9fa48("2834") ? "" : (stryCov_9fa48("2834"), 'defineProperties')]));

/** Namespaces whose keyed writes reach an object's own properties. */
const KEYED_WRITE_HOSTS = new Set(stryMutAct_9fa48("2835") ? [] : (stryCov_9fa48("2835"), [stryMutAct_9fa48("2836") ? "" : (stryCov_9fa48("2836"), 'Reflect'), stryMutAct_9fa48("2837") ? "" : (stryCov_9fa48("2837"), 'Object')]));

/** Calls that set an attribute without ever naming it in the source. */
const OPAQUE_ATTRIBUTE_CALLS = new Map<string, string>(stryMutAct_9fa48("2838") ? [] : (stryCov_9fa48("2838"), [stryMutAct_9fa48("2839") ? [] : (stryCov_9fa48("2839"), [stryMutAct_9fa48("2840") ? "" : (stryCov_9fa48("2840"), 'setAttributeNode'), stryMutAct_9fa48("2841") ? "" : (stryCov_9fa48("2841"), 'an attribute node hides its name from every checker; use setAttribute with a literal name')]), stryMutAct_9fa48("2842") ? [] : (stryCov_9fa48("2842"), [stryMutAct_9fa48("2843") ? "" : (stryCov_9fa48("2843"), 'setAttributeNodeNS'), stryMutAct_9fa48("2844") ? "" : (stryCov_9fa48("2844"), 'an attribute node hides its name from every checker; use setAttributeNS with a literal name')]), stryMutAct_9fa48("2845") ? [] : (stryCov_9fa48("2845"), [stryMutAct_9fa48("2846") ? "" : (stryCov_9fa48("2846"), 'setNamedItem'), stryMutAct_9fa48("2847") ? "" : (stryCov_9fa48("2847"), 'the attribute map hides the name from every checker; use setAttribute with a literal name')])]));

/** The attribute this gate exists to keep out of the product. */
const STYLE_ATTRIBUTE = stryMutAct_9fa48("2848") ? "" : (stryCov_9fa48("2848"), 'style');

/**
 * The key a property or member names, however it is written.
 * @param env - the file's constants.
 * @param holder - the property or member expression, parentheses and all.
 * @param computed - whether the key is an expression rather than a name.
 * @returns the key, or undefined when it is not decidable.
 */
export function keyOf(env: Constants, holder: Field | undefined, computed: boolean): string | undefined {
  if (stryMutAct_9fa48("2849")) {
    {}
  } else {
    stryCov_9fa48("2849");
    const node = unwrap(holder);
    if (stryMutAct_9fa48("2852") ? false : stryMutAct_9fa48("2851") ? true : stryMutAct_9fa48("2850") ? isNode(node) : (stryCov_9fa48("2850", "2851", "2852"), !isNode(node))) return undefined;
    if (stryMutAct_9fa48("2855") ? false : stryMutAct_9fa48("2854") ? true : stryMutAct_9fa48("2853") ? computed : (stryCov_9fa48("2853", "2854", "2855"), !computed)) {
      if (stryMutAct_9fa48("2856")) {
        {}
      } else {
        stryCov_9fa48("2856");
        if (stryMutAct_9fa48("2859") ? node.type === 'Identifier' || typeof node['name'] === 'string' : stryMutAct_9fa48("2858") ? false : stryMutAct_9fa48("2857") ? true : (stryCov_9fa48("2857", "2858", "2859"), (stryMutAct_9fa48("2861") ? node.type !== 'Identifier' : stryMutAct_9fa48("2860") ? true : (stryCov_9fa48("2860", "2861"), node.type === (stryMutAct_9fa48("2862") ? "" : (stryCov_9fa48("2862"), 'Identifier')))) && (stryMutAct_9fa48("2864") ? typeof node['name'] !== 'string' : stryMutAct_9fa48("2863") ? true : (stryCov_9fa48("2863", "2864"), typeof node[stryMutAct_9fa48("2865") ? "" : (stryCov_9fa48("2865"), 'name')] === (stryMutAct_9fa48("2866") ? "" : (stryCov_9fa48("2866"), 'string')))))) return node[stryMutAct_9fa48("2867") ? "" : (stryCov_9fa48("2867"), 'name')];
        if (stryMutAct_9fa48("2870") ? node.type === 'Literal' || typeof node['value'] === 'string' : stryMutAct_9fa48("2869") ? false : stryMutAct_9fa48("2868") ? true : (stryCov_9fa48("2868", "2869", "2870"), (stryMutAct_9fa48("2872") ? node.type !== 'Literal' : stryMutAct_9fa48("2871") ? true : (stryCov_9fa48("2871", "2872"), node.type === (stryMutAct_9fa48("2873") ? "" : (stryCov_9fa48("2873"), 'Literal')))) && (stryMutAct_9fa48("2875") ? typeof node['value'] !== 'string' : stryMutAct_9fa48("2874") ? true : (stryCov_9fa48("2874", "2875"), typeof node[stryMutAct_9fa48("2876") ? "" : (stryCov_9fa48("2876"), 'value')] === (stryMutAct_9fa48("2877") ? "" : (stryCov_9fa48("2877"), 'string')))))) return node[stryMutAct_9fa48("2878") ? "" : (stryCov_9fa48("2878"), 'value')];
        return undefined;
      }
    }
    return staticString(env, node);
  }
}

/**
 * Reject the calls that set an attribute, unless they name one that is not the
 * style attribute, in a form the gate can read.
 * @param env - the file's constants.
 * @param node - the call expression.
 * @param report - records an offence.
 */
export function inspectCall(env: Constants, node: Node, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2879")) {
    {}
  } else {
    stryCov_9fa48("2879");
    const callee = unwrap(node[stryMutAct_9fa48("2880") ? "" : (stryCov_9fa48("2880"), 'callee')]);
    if (stryMutAct_9fa48("2883") ? !isNode(callee) && callee.type !== 'MemberExpression' : stryMutAct_9fa48("2882") ? false : stryMutAct_9fa48("2881") ? true : (stryCov_9fa48("2881", "2882", "2883"), (stryMutAct_9fa48("2884") ? isNode(callee) : (stryCov_9fa48("2884"), !isNode(callee))) || (stryMutAct_9fa48("2886") ? callee.type === 'MemberExpression' : stryMutAct_9fa48("2885") ? false : (stryCov_9fa48("2885", "2886"), callee.type !== (stryMutAct_9fa48("2887") ? "" : (stryCov_9fa48("2887"), 'MemberExpression')))))) return;
    // A method reached through brackets is the same method. Reading only the
    // plainly written form let one pair of brackets step past every rule below.
    const method = stryMutAct_9fa48("2888") ? memberName(callee) && staticString(env, callee['property']) : (stryCov_9fa48("2888"), memberName(callee) ?? staticString(env, callee[stryMutAct_9fa48("2889") ? "" : (stryCov_9fa48("2889"), 'property')]));
    if (stryMutAct_9fa48("2892") ? method !== undefined : stryMutAct_9fa48("2891") ? false : stryMutAct_9fa48("2890") ? true : (stryCov_9fa48("2890", "2891", "2892"), method === undefined)) return;
    const args = Array.isArray(node[stryMutAct_9fa48("2893") ? "" : (stryCov_9fa48("2893"), 'arguments')]) ? node[stryMutAct_9fa48("2894") ? "" : (stryCov_9fa48("2894"), 'arguments')] : stryMutAct_9fa48("2895") ? ["Stryker was here"] : (stryCov_9fa48("2895"), []);
    const opaque = OPAQUE_ATTRIBUTE_CALLS.get(method);
    if (stryMutAct_9fa48("2898") ? opaque === undefined : stryMutAct_9fa48("2897") ? false : stryMutAct_9fa48("2896") ? true : (stryCov_9fa48("2896", "2897", "2898"), opaque !== undefined)) {
      if (stryMutAct_9fa48("2899")) {
        {}
      } else {
        stryCov_9fa48("2899");
        if (stryMutAct_9fa48("2900")) {
          ;
        } else {
          stryCov_9fa48("2900");
          report(node, opaque);
        }
        return;
      }
    }
    const setter = ATTRIBUTE_SETTERS.get(method);
    if (stryMutAct_9fa48("2903") ? setter === undefined : stryMutAct_9fa48("2902") ? false : stryMutAct_9fa48("2901") ? true : (stryCov_9fa48("2901", "2902", "2903"), setter !== undefined)) {
      if (stryMutAct_9fa48("2904")) {
        {}
      } else {
        stryCov_9fa48("2904");
        checkName(env, node, args[setter], stryMutAct_9fa48("2906") ? "" : (stryCov_9fa48("2906"), 'attribute'), report);
        return;
      }
    }
    const host = unwrap(callee[stryMutAct_9fa48("2907") ? "" : (stryCov_9fa48("2907"), 'object')]);
    if (stryMutAct_9fa48("2910") ? (!isNode(host) || host.type !== 'Identifier') && typeof host['name'] !== 'string' : stryMutAct_9fa48("2909") ? false : stryMutAct_9fa48("2908") ? true : (stryCov_9fa48("2908", "2909", "2910"), (stryMutAct_9fa48("2912") ? !isNode(host) && host.type !== 'Identifier' : stryMutAct_9fa48("2911") ? false : (stryCov_9fa48("2911", "2912"), (stryMutAct_9fa48("2913") ? isNode(host) : (stryCov_9fa48("2913"), !isNode(host))) || (stryMutAct_9fa48("2915") ? host.type === 'Identifier' : stryMutAct_9fa48("2914") ? false : (stryCov_9fa48("2914", "2915"), host.type !== (stryMutAct_9fa48("2916") ? "" : (stryCov_9fa48("2916"), 'Identifier')))))) || (stryMutAct_9fa48("2918") ? typeof host['name'] === 'string' : stryMutAct_9fa48("2917") ? false : (stryCov_9fa48("2917", "2918"), typeof host[stryMutAct_9fa48("2919") ? "" : (stryCov_9fa48("2919"), 'name')] !== (stryMutAct_9fa48("2920") ? "" : (stryCov_9fa48("2920"), 'string')))))) return;
    if (stryMutAct_9fa48("2923") ? false : stryMutAct_9fa48("2922") ? true : stryMutAct_9fa48("2921") ? KEYED_WRITE_HOSTS.has(host['name']) : (stryCov_9fa48("2921", "2922", "2923"), !KEYED_WRITE_HOSTS.has(host[stryMutAct_9fa48("2924") ? "" : (stryCov_9fa48("2924"), 'name')]))) return;
    const keyed = KEYED_WRITES.get(method);
    if (stryMutAct_9fa48("2927") ? keyed === undefined : stryMutAct_9fa48("2926") ? false : stryMutAct_9fa48("2925") ? true : (stryCov_9fa48("2925", "2926", "2927"), keyed !== undefined)) {
      if (stryMutAct_9fa48("2928")) {
        {}
      } else {
        stryCov_9fa48("2928");
        checkName(env, node, args[keyed], stryMutAct_9fa48("2930") ? "" : (stryCov_9fa48("2930"), 'property'), report);
        return;
      }
    }
    if (stryMutAct_9fa48("2932") ? false : stryMutAct_9fa48("2931") ? true : (stryCov_9fa48("2931", "2932"), MERGED_WRITES.has(method))) {
      if (stryMutAct_9fa48("2933")) {
        {}
      } else {
        stryCov_9fa48("2933");
        for (const argument of stryMutAct_9fa48("2934") ? args : (stryCov_9fa48("2934"), args.slice(1))) if (stryMutAct_9fa48("2935")) {
          ;
        } else {
          stryCov_9fa48("2935");
          inspectMergedKeys(env, argument, report);
        }
      }
    }
  }
}

/**
 * Reject an object literal being merged onto something when it names the style
 * declaration.
 * @param env - the file's constants.
 * @param merged - the object being merged, parentheses and all.
 * @param report - records an offence.
 */
function inspectMergedKeys(env: Constants, merged: Field | undefined, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2936")) {
    {}
  } else {
    stryCov_9fa48("2936");
    const argument = unwrap(merged);
    if (stryMutAct_9fa48("2939") ? !isNode(argument) && argument.type !== 'ObjectExpression' : stryMutAct_9fa48("2938") ? false : stryMutAct_9fa48("2937") ? true : (stryCov_9fa48("2937", "2938", "2939"), (stryMutAct_9fa48("2940") ? isNode(argument) : (stryCov_9fa48("2940"), !isNode(argument))) || (stryMutAct_9fa48("2942") ? argument.type === 'ObjectExpression' : stryMutAct_9fa48("2941") ? false : (stryCov_9fa48("2941", "2942"), argument.type !== (stryMutAct_9fa48("2943") ? "" : (stryCov_9fa48("2943"), 'ObjectExpression')))))) return;
    const properties = argument[stryMutAct_9fa48("2944") ? "" : (stryCov_9fa48("2944"), 'properties')];
    if (stryMutAct_9fa48("2947") ? false : stryMutAct_9fa48("2946") ? true : stryMutAct_9fa48("2945") ? Array.isArray(properties) : (stryCov_9fa48("2945", "2946", "2947"), !Array.isArray(properties))) return;
    for (const property of properties) {
      if (stryMutAct_9fa48("2948")) {
        {}
      } else {
        stryCov_9fa48("2948");
        if (stryMutAct_9fa48("2951") ? !isNode(property) && property.type !== 'Property' : stryMutAct_9fa48("2950") ? false : stryMutAct_9fa48("2949") ? true : (stryCov_9fa48("2949", "2950", "2951"), (stryMutAct_9fa48("2952") ? isNode(property) : (stryCov_9fa48("2952"), !isNode(property))) || (stryMutAct_9fa48("2954") ? property.type === 'Property' : stryMutAct_9fa48("2953") ? false : (stryCov_9fa48("2953", "2954"), property.type !== (stryMutAct_9fa48("2955") ? "" : (stryCov_9fa48("2955"), 'Property')))))) continue;
        const key = keyOf(env, property[stryMutAct_9fa48("2956") ? "" : (stryCov_9fa48("2956"), 'key')], stryMutAct_9fa48("2959") ? property['computed'] !== true : stryMutAct_9fa48("2958") ? false : stryMutAct_9fa48("2957") ? true : (stryCov_9fa48("2957", "2958", "2959"), property[stryMutAct_9fa48("2960") ? "" : (stryCov_9fa48("2960"), 'computed')] === (stryMutAct_9fa48("2961") ? false : (stryCov_9fa48("2961"), true))));
        const why = (stryMutAct_9fa48("2964") ? key !== undefined : stryMutAct_9fa48("2963") ? false : stryMutAct_9fa48("2962") ? true : (stryCov_9fa48("2962", "2963", "2964"), key === undefined)) ? undefined : STYLE_PROPERTIES.get(stryMutAct_9fa48("2965") ? key.toUpperCase() : (stryCov_9fa48("2965"), key.toLowerCase()));
        if (stryMutAct_9fa48("2968") ? why === undefined : stryMutAct_9fa48("2967") ? false : stryMutAct_9fa48("2966") ? true : (stryCov_9fa48("2966", "2967", "2968"), why !== undefined)) if (stryMutAct_9fa48("2969")) {
          ;
        } else {
          stryCov_9fa48("2969");
          report(property, why);
        }
      }
    }
  }
}

/** Properties that reach an element's own style declaration, keyed in lower case. */
export const STYLE_PROPERTIES = new Map<string, string>(stryMutAct_9fa48("2970") ? [] : (stryCov_9fa48("2970"), [stryMutAct_9fa48("2971") ? [] : (stryCov_9fa48("2971"), [stryMutAct_9fa48("2972") ? "" : (stryCov_9fa48("2972"), 'style'), stryMutAct_9fa48("2973") ? "" : (stryCov_9fa48("2973"), 'an element style declaration is an inline style; put the rule in a stylesheet and add a class')]), stryMutAct_9fa48("2974") ? [] : (stryCov_9fa48("2974"), [stryMutAct_9fa48("2975") ? "" : (stryCov_9fa48("2975"), 'csstext'), stryMutAct_9fa48("2976") ? "" : (stryCov_9fa48("2976"), 'writing cssText replaces an inline style block; put the rule in a stylesheet and add a class')]), stryMutAct_9fa48("2977") ? [] : (stryCov_9fa48("2977"), [stryMutAct_9fa48("2978") ? "" : (stryCov_9fa48("2978"), 'attributestylemap'), stryMutAct_9fa48("2979") ? "" : (stryCov_9fa48("2979"), 'the typed style map is the style attribute; put the rule in a stylesheet and add a class')])]));

/**
 * Require a name the gate can read, and reject it when it is the style one.
 * @param env - the file's constants.
 * @param node - the call, for the line it is reported on.
 * @param argument - the expression that names the attribute or property.
 * @param kind - the word the message uses for what is being named.
 * @param report - records an offence.
 */
function checkName(env: Constants, node: Node, argument: Field | undefined, kind: string, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2980")) {
    {}
  } else {
    stryCov_9fa48("2980");
    if (stryMutAct_9fa48("2983") ? argument !== undefined : stryMutAct_9fa48("2982") ? false : stryMutAct_9fa48("2981") ? true : (stryCov_9fa48("2981", "2982", "2983"), argument === undefined)) return;
    const name = staticString(env, argument);
    if (stryMutAct_9fa48("2986") ? name !== undefined : stryMutAct_9fa48("2985") ? false : stryMutAct_9fa48("2984") ? true : (stryCov_9fa48("2984", "2985", "2986"), name === undefined)) {
      if (stryMutAct_9fa48("2987")) {
        {}
      } else {
        stryCov_9fa48("2987");
        report(node, stryMutAct_9fa48("2989") ? `` : (stryCov_9fa48("2989"), `the ${kind} name must be written as a literal, so this gate and the next reader can both read it`));
        return;
      }
    }
    if (stryMutAct_9fa48("2992") ? name.toLowerCase() !== STYLE_ATTRIBUTE : stryMutAct_9fa48("2991") ? false : stryMutAct_9fa48("2990") ? true : (stryCov_9fa48("2990", "2991", "2992"), (stryMutAct_9fa48("2993") ? name.toUpperCase() : (stryCov_9fa48("2993"), name.toLowerCase())) === STYLE_ATTRIBUTE)) {
      if (stryMutAct_9fa48("2994")) {
        {}
      } else {
        stryCov_9fa48("2994");
        report(node, stryMutAct_9fa48("2996") ? `` : (stryCov_9fa48("2996"), `setting the ${kind} named style is an inline style; put the rule in a stylesheet and add a class`));
      }
    }
  }
}