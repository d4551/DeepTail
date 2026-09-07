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
const ATTRIBUTE_SETTERS = new Map<string, number>(stryMutAct_9fa48("2291") ? [] : (stryCov_9fa48("2291"), [stryMutAct_9fa48("2292") ? [] : (stryCov_9fa48("2292"), [stryMutAct_9fa48("2293") ? "" : (stryCov_9fa48("2293"), 'setAttribute'), 0]), stryMutAct_9fa48("2294") ? [] : (stryCov_9fa48("2294"), [stryMutAct_9fa48("2295") ? "" : (stryCov_9fa48("2295"), 'setAttributeNS'), 1]), stryMutAct_9fa48("2296") ? [] : (stryCov_9fa48("2296"), [stryMutAct_9fa48("2297") ? "" : (stryCov_9fa48("2297"), 'createAttribute'), 0]), stryMutAct_9fa48("2298") ? [] : (stryCov_9fa48("2298"), [stryMutAct_9fa48("2299") ? "" : (stryCov_9fa48("2299"), 'createAttributeNS'), 1]), stryMutAct_9fa48("2300") ? [] : (stryCov_9fa48("2300"), [stryMutAct_9fa48("2301") ? "" : (stryCov_9fa48("2301"), 'toggleAttribute'), 0])]));

/** Calls that write a property under a name, and which argument names it. */
const KEYED_WRITES = new Map<string, number>(stryMutAct_9fa48("2302") ? [] : (stryCov_9fa48("2302"), [stryMutAct_9fa48("2303") ? [] : (stryCov_9fa48("2303"), [stryMutAct_9fa48("2304") ? "" : (stryCov_9fa48("2304"), 'set'), 1]), stryMutAct_9fa48("2305") ? [] : (stryCov_9fa48("2305"), [stryMutAct_9fa48("2306") ? "" : (stryCov_9fa48("2306"), 'defineProperty'), 1])]));

/**
 * Calls that write every property an object literal carries.
 *
 * `Object.assign(el, { style })` reaches the same declaration as `el.style`,
 * and it is already this codebase's idiom for merging onto an object, so the
 * keys of what is being merged are read.
 */
const MERGED_WRITES = new Set(stryMutAct_9fa48("2307") ? [] : (stryCov_9fa48("2307"), [stryMutAct_9fa48("2308") ? "" : (stryCov_9fa48("2308"), 'assign'), stryMutAct_9fa48("2309") ? "" : (stryCov_9fa48("2309"), 'defineProperties')]));

/** Namespaces whose keyed writes reach an object's own properties. */
const KEYED_WRITE_HOSTS = new Set(stryMutAct_9fa48("2310") ? [] : (stryCov_9fa48("2310"), [stryMutAct_9fa48("2311") ? "" : (stryCov_9fa48("2311"), 'Reflect'), stryMutAct_9fa48("2312") ? "" : (stryCov_9fa48("2312"), 'Object')]));

/** Calls that set an attribute without ever naming it in the source. */
const OPAQUE_ATTRIBUTE_CALLS = new Map<string, string>(stryMutAct_9fa48("2313") ? [] : (stryCov_9fa48("2313"), [stryMutAct_9fa48("2314") ? [] : (stryCov_9fa48("2314"), [stryMutAct_9fa48("2315") ? "" : (stryCov_9fa48("2315"), 'setAttributeNode'), stryMutAct_9fa48("2316") ? "" : (stryCov_9fa48("2316"), 'an attribute node hides its name from every checker; use setAttribute with a literal name')]), stryMutAct_9fa48("2317") ? [] : (stryCov_9fa48("2317"), [stryMutAct_9fa48("2318") ? "" : (stryCov_9fa48("2318"), 'setAttributeNodeNS'), stryMutAct_9fa48("2319") ? "" : (stryCov_9fa48("2319"), 'an attribute node hides its name from every checker; use setAttributeNS with a literal name')]), stryMutAct_9fa48("2320") ? [] : (stryCov_9fa48("2320"), [stryMutAct_9fa48("2321") ? "" : (stryCov_9fa48("2321"), 'setNamedItem'), stryMutAct_9fa48("2322") ? "" : (stryCov_9fa48("2322"), 'the attribute map hides the name from every checker; use setAttribute with a literal name')])]));

/** The attribute this gate exists to keep out of the product. */
const STYLE_ATTRIBUTE = stryMutAct_9fa48("2323") ? "" : (stryCov_9fa48("2323"), 'style');

/**
 * The key a property or member names, however it is written.
 * @param env - the file's constants.
 * @param holder - the property or member expression, parentheses and all.
 * @param computed - whether the key is an expression rather than a name.
 * @returns the key, or undefined when it is not decidable.
 */
export function keyOf(env: Constants, holder: Field | undefined, computed: boolean): string | undefined {
  if (stryMutAct_9fa48("2324")) {
    {}
  } else {
    stryCov_9fa48("2324");
    const node = unwrap(holder);
    if (stryMutAct_9fa48("2327") ? false : stryMutAct_9fa48("2326") ? true : stryMutAct_9fa48("2325") ? isNode(node) : (stryCov_9fa48("2325", "2326", "2327"), !isNode(node))) return undefined;
    if (stryMutAct_9fa48("2330") ? false : stryMutAct_9fa48("2329") ? true : stryMutAct_9fa48("2328") ? computed : (stryCov_9fa48("2328", "2329", "2330"), !computed)) {
      if (stryMutAct_9fa48("2331")) {
        {}
      } else {
        stryCov_9fa48("2331");
        if (stryMutAct_9fa48("2334") ? node.type === 'Identifier' || typeof node.name === 'string' : stryMutAct_9fa48("2333") ? false : stryMutAct_9fa48("2332") ? true : (stryCov_9fa48("2332", "2333", "2334"), (stryMutAct_9fa48("2336") ? node.type !== 'Identifier' : stryMutAct_9fa48("2335") ? true : (stryCov_9fa48("2335", "2336"), node.type === (stryMutAct_9fa48("2337") ? "" : (stryCov_9fa48("2337"), 'Identifier')))) && (stryMutAct_9fa48("2339") ? typeof node.name !== 'string' : stryMutAct_9fa48("2338") ? true : (stryCov_9fa48("2338", "2339"), typeof node.name === (stryMutAct_9fa48("2340") ? "" : (stryCov_9fa48("2340"), 'string')))))) return node.name;
        if (stryMutAct_9fa48("2343") ? node.type === 'Literal' || typeof node.value === 'string' : stryMutAct_9fa48("2342") ? false : stryMutAct_9fa48("2341") ? true : (stryCov_9fa48("2341", "2342", "2343"), (stryMutAct_9fa48("2345") ? node.type !== 'Literal' : stryMutAct_9fa48("2344") ? true : (stryCov_9fa48("2344", "2345"), node.type === (stryMutAct_9fa48("2346") ? "" : (stryCov_9fa48("2346"), 'Literal')))) && (stryMutAct_9fa48("2348") ? typeof node.value !== 'string' : stryMutAct_9fa48("2347") ? true : (stryCov_9fa48("2347", "2348"), typeof node.value === (stryMutAct_9fa48("2349") ? "" : (stryCov_9fa48("2349"), 'string')))))) return node.value;
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
  if (stryMutAct_9fa48("2350")) {
    {}
  } else {
    stryCov_9fa48("2350");
    const callee = unwrap(node.callee);
    if (stryMutAct_9fa48("2353") ? !isNode(callee) && callee.type !== 'MemberExpression' : stryMutAct_9fa48("2352") ? false : stryMutAct_9fa48("2351") ? true : (stryCov_9fa48("2351", "2352", "2353"), (stryMutAct_9fa48("2354") ? isNode(callee) : (stryCov_9fa48("2354"), !isNode(callee))) || (stryMutAct_9fa48("2356") ? callee.type === 'MemberExpression' : stryMutAct_9fa48("2355") ? false : (stryCov_9fa48("2355", "2356"), callee.type !== (stryMutAct_9fa48("2357") ? "" : (stryCov_9fa48("2357"), 'MemberExpression')))))) return;
    // A method reached through brackets is the same method. Reading only the
    // plainly written form let one pair of brackets step past every rule below.
    const method = stryMutAct_9fa48("2358") ? memberName(callee) && staticString(env, callee.property) : (stryCov_9fa48("2358"), memberName(callee) ?? staticString(env, callee.property));
    if (stryMutAct_9fa48("2361") ? method !== undefined : stryMutAct_9fa48("2360") ? false : stryMutAct_9fa48("2359") ? true : (stryCov_9fa48("2359", "2360", "2361"), method === undefined)) return;
    const args = Array.isArray(node.arguments) ? node.arguments : stryMutAct_9fa48("2362") ? ["Stryker was here"] : (stryCov_9fa48("2362"), []);
    const opaque = OPAQUE_ATTRIBUTE_CALLS.get(method);
    if (stryMutAct_9fa48("2365") ? opaque === undefined : stryMutAct_9fa48("2364") ? false : stryMutAct_9fa48("2363") ? true : (stryCov_9fa48("2363", "2364", "2365"), opaque !== undefined)) {
      if (stryMutAct_9fa48("2366")) {
        {}
      } else {
        stryCov_9fa48("2366");
        if (stryMutAct_9fa48("2367")) {
          ;
        } else {
          stryCov_9fa48("2367");
          report(node, opaque);
        }
        return;
      }
    }
    const setter = ATTRIBUTE_SETTERS.get(method);
    if (stryMutAct_9fa48("2370") ? setter === undefined : stryMutAct_9fa48("2369") ? false : stryMutAct_9fa48("2368") ? true : (stryCov_9fa48("2368", "2369", "2370"), setter !== undefined)) {
      if (stryMutAct_9fa48("2371")) {
        {}
      } else {
        stryCov_9fa48("2371");
        checkName(env, node, args[setter], stryMutAct_9fa48("2373") ? "" : (stryCov_9fa48("2373"), 'attribute'), report);
        return;
      }
    }
    if (stryMutAct_9fa48("2374")) {
      ;
    } else {
      stryCov_9fa48("2374");
      inspectHostWrite(env, node, callee, method, args, report);
    }
  }
}

/**
 * Reject the writes that reach a style declaration through a host the gate
 * knows: a key written onto it, or an object merged into it.
 *
 * Read apart from the attribute calls above, which decide on the method name
 * alone. These have to establish what the method was called on first, so the
 * two halves ask different questions of the same call.
 * @param env - the file's constants.
 * @param node - the call expression.
 * @param callee - its callee, already known to be a member expression.
 * @param method - the method name, however it was written.
 * @param args - the call's arguments.
 * @param report - records an offence.
 */
function inspectHostWrite(env: Constants, node: Node, callee: Node, method: string, args: readonly Field[], report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2375")) {
    {}
  } else {
    stryCov_9fa48("2375");
    const host = unwrap(callee.object);
    if (stryMutAct_9fa48("2378") ? (!isNode(host) || host.type !== 'Identifier') && typeof host.name !== 'string' : stryMutAct_9fa48("2377") ? false : stryMutAct_9fa48("2376") ? true : (stryCov_9fa48("2376", "2377", "2378"), (stryMutAct_9fa48("2380") ? !isNode(host) && host.type !== 'Identifier' : stryMutAct_9fa48("2379") ? false : (stryCov_9fa48("2379", "2380"), (stryMutAct_9fa48("2381") ? isNode(host) : (stryCov_9fa48("2381"), !isNode(host))) || (stryMutAct_9fa48("2383") ? host.type === 'Identifier' : stryMutAct_9fa48("2382") ? false : (stryCov_9fa48("2382", "2383"), host.type !== (stryMutAct_9fa48("2384") ? "" : (stryCov_9fa48("2384"), 'Identifier')))))) || (stryMutAct_9fa48("2386") ? typeof host.name === 'string' : stryMutAct_9fa48("2385") ? false : (stryCov_9fa48("2385", "2386"), typeof host.name !== (stryMutAct_9fa48("2387") ? "" : (stryCov_9fa48("2387"), 'string')))))) return;
    if (stryMutAct_9fa48("2390") ? false : stryMutAct_9fa48("2389") ? true : stryMutAct_9fa48("2388") ? KEYED_WRITE_HOSTS.has(host.name) : (stryCov_9fa48("2388", "2389", "2390"), !KEYED_WRITE_HOSTS.has(host.name))) return;
    const keyed = KEYED_WRITES.get(method);
    if (stryMutAct_9fa48("2393") ? keyed === undefined : stryMutAct_9fa48("2392") ? false : stryMutAct_9fa48("2391") ? true : (stryCov_9fa48("2391", "2392", "2393"), keyed !== undefined)) {
      if (stryMutAct_9fa48("2394")) {
        {}
      } else {
        stryCov_9fa48("2394");
        checkName(env, node, args[keyed], stryMutAct_9fa48("2396") ? "" : (stryCov_9fa48("2396"), 'property'), report);
        return;
      }
    }
    if (stryMutAct_9fa48("2398") ? false : stryMutAct_9fa48("2397") ? true : (stryCov_9fa48("2397", "2398"), MERGED_WRITES.has(method))) {
      if (stryMutAct_9fa48("2399")) {
        {}
      } else {
        stryCov_9fa48("2399");
        for (const argument of stryMutAct_9fa48("2400") ? args : (stryCov_9fa48("2400"), args.slice(1))) if (stryMutAct_9fa48("2401")) {
          ;
        } else {
          stryCov_9fa48("2401");
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
  if (stryMutAct_9fa48("2402")) {
    {}
  } else {
    stryCov_9fa48("2402");
    const argument = unwrap(merged);
    if (stryMutAct_9fa48("2405") ? !isNode(argument) && argument.type !== 'ObjectExpression' : stryMutAct_9fa48("2404") ? false : stryMutAct_9fa48("2403") ? true : (stryCov_9fa48("2403", "2404", "2405"), (stryMutAct_9fa48("2406") ? isNode(argument) : (stryCov_9fa48("2406"), !isNode(argument))) || (stryMutAct_9fa48("2408") ? argument.type === 'ObjectExpression' : stryMutAct_9fa48("2407") ? false : (stryCov_9fa48("2407", "2408"), argument.type !== (stryMutAct_9fa48("2409") ? "" : (stryCov_9fa48("2409"), 'ObjectExpression')))))) return;
    const properties = argument.properties;
    if (stryMutAct_9fa48("2412") ? false : stryMutAct_9fa48("2411") ? true : stryMutAct_9fa48("2410") ? Array.isArray(properties) : (stryCov_9fa48("2410", "2411", "2412"), !Array.isArray(properties))) return;
    for (const property of properties) {
      if (stryMutAct_9fa48("2413")) {
        {}
      } else {
        stryCov_9fa48("2413");
        if (stryMutAct_9fa48("2416") ? !isNode(property) && property.type !== 'Property' : stryMutAct_9fa48("2415") ? false : stryMutAct_9fa48("2414") ? true : (stryCov_9fa48("2414", "2415", "2416"), (stryMutAct_9fa48("2417") ? isNode(property) : (stryCov_9fa48("2417"), !isNode(property))) || (stryMutAct_9fa48("2419") ? property.type === 'Property' : stryMutAct_9fa48("2418") ? false : (stryCov_9fa48("2418", "2419"), property.type !== (stryMutAct_9fa48("2420") ? "" : (stryCov_9fa48("2420"), 'Property')))))) continue;
        const key = keyOf(env, property.key, stryMutAct_9fa48("2423") ? property.computed !== true : stryMutAct_9fa48("2422") ? false : stryMutAct_9fa48("2421") ? true : (stryCov_9fa48("2421", "2422", "2423"), property.computed === (stryMutAct_9fa48("2424") ? false : (stryCov_9fa48("2424"), true))));
        const why = (stryMutAct_9fa48("2427") ? key !== undefined : stryMutAct_9fa48("2426") ? false : stryMutAct_9fa48("2425") ? true : (stryCov_9fa48("2425", "2426", "2427"), key === undefined)) ? undefined : STYLE_PROPERTIES.get(stryMutAct_9fa48("2428") ? key.toUpperCase() : (stryCov_9fa48("2428"), key.toLowerCase()));
        if (stryMutAct_9fa48("2431") ? why === undefined : stryMutAct_9fa48("2430") ? false : stryMutAct_9fa48("2429") ? true : (stryCov_9fa48("2429", "2430", "2431"), why !== undefined)) if (stryMutAct_9fa48("2432")) {
          ;
        } else {
          stryCov_9fa48("2432");
          report(property, why);
        }
      }
    }
  }
}

/** Properties that reach an element's own style declaration, keyed in lower case. */
export const STYLE_PROPERTIES = new Map<string, string>(stryMutAct_9fa48("2433") ? [] : (stryCov_9fa48("2433"), [stryMutAct_9fa48("2434") ? [] : (stryCov_9fa48("2434"), [stryMutAct_9fa48("2435") ? "" : (stryCov_9fa48("2435"), 'style'), stryMutAct_9fa48("2436") ? "" : (stryCov_9fa48("2436"), 'an element style declaration is an inline style; put the rule in a stylesheet and add a class')]), stryMutAct_9fa48("2437") ? [] : (stryCov_9fa48("2437"), [stryMutAct_9fa48("2438") ? "" : (stryCov_9fa48("2438"), 'csstext'), stryMutAct_9fa48("2439") ? "" : (stryCov_9fa48("2439"), 'writing cssText replaces an inline style block; put the rule in a stylesheet and add a class')]), stryMutAct_9fa48("2440") ? [] : (stryCov_9fa48("2440"), [stryMutAct_9fa48("2441") ? "" : (stryCov_9fa48("2441"), 'attributestylemap'), stryMutAct_9fa48("2442") ? "" : (stryCov_9fa48("2442"), 'the typed style map is the style attribute; put the rule in a stylesheet and add a class')])]));

/**
 * Require a name the gate can read, and reject it when it is the style one.
 * @param env - the file's constants.
 * @param node - the call, for the line it is reported on.
 * @param argument - the expression that names the attribute or property.
 * @param kind - the word the message uses for what is being named.
 * @param report - records an offence.
 */
function checkName(env: Constants, node: Node, argument: Field | undefined, kind: string, report: (node: Node, why: string) => void): void {
  if (stryMutAct_9fa48("2443")) {
    {}
  } else {
    stryCov_9fa48("2443");
    if (stryMutAct_9fa48("2446") ? argument !== undefined : stryMutAct_9fa48("2445") ? false : stryMutAct_9fa48("2444") ? true : (stryCov_9fa48("2444", "2445", "2446"), argument === undefined)) return;
    const name = staticString(env, argument);
    if (stryMutAct_9fa48("2449") ? name !== undefined : stryMutAct_9fa48("2448") ? false : stryMutAct_9fa48("2447") ? true : (stryCov_9fa48("2447", "2448", "2449"), name === undefined)) {
      if (stryMutAct_9fa48("2450")) {
        {}
      } else {
        stryCov_9fa48("2450");
        report(node, stryMutAct_9fa48("2452") ? `` : (stryCov_9fa48("2452"), `the ${kind} name must be written as a literal, so this gate and the next reader can both read it`));
        return;
      }
    }
    if (stryMutAct_9fa48("2455") ? name.toLowerCase() !== STYLE_ATTRIBUTE : stryMutAct_9fa48("2454") ? false : stryMutAct_9fa48("2453") ? true : (stryCov_9fa48("2453", "2454", "2455"), (stryMutAct_9fa48("2456") ? name.toUpperCase() : (stryCov_9fa48("2456"), name.toLowerCase())) === STYLE_ATTRIBUTE)) {
      if (stryMutAct_9fa48("2457")) {
        {}
      } else {
        stryCov_9fa48("2457");
        report(node, stryMutAct_9fa48("2459") ? `` : (stryCov_9fa48("2459"), `setting the ${kind} named style is an inline style; put the rule in a stylesheet and add a class`));
      }
    }
  }
}