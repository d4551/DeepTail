/**
 * The bans on idioms the frameworks this product uses removed.
 *
 * React 19 deleted `ReactDOM.render` and its siblings, `findDOMNode`, string
 * refs, `defaultProps` and legacy context; Tauri 2 moved the API out of the
 * v1 module paths and off the `__TAURI__` global. A source that revives one of
 * them still builds — nothing at runtime stops a removed import from being
 * written — so they are banned here, read off the same parse as every other
 * rule.
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
import { isNode, type Node } from './ast.ts';
import { callsGlobal, callsMethod, type Names, property, type Rule } from './rule-helpers.ts';

/** React DOM entry points removed in React 19, replaced by createRoot and refs. */
const REACT_REMOVED_CALLS = new Set(stryMutAct_9fa48("2315") ? [] : (stryCov_9fa48("2315"), [stryMutAct_9fa48("2316") ? "" : (stryCov_9fa48("2316"), 'render'), stryMutAct_9fa48("2317") ? "" : (stryCov_9fa48("2317"), 'hydrate'), stryMutAct_9fa48("2318") ? "" : (stryCov_9fa48("2318"), 'unmountComponentAtNode'), stryMutAct_9fa48("2319") ? "" : (stryCov_9fa48("2319"), 'findDOMNode')]));

/** The Tauri v1 API paths, which the v2 core module and plugins replaced. */
const TAURI_V1_PATHS = ['@tauri-apps/api/tauri', '@tauri-apps/api/helpers', '@tauri-apps/api/notification', '@tauri-apps/api/updater', '@tauri-apps/api/dialog', '@tauri-apps/api/fs', '@tauri-apps/api/http', '@tauri-apps/api/clipboard', '@tauri-apps/api/shell', '@tauri-apps/api/process', '@tauri-apps/api/globalShortcut', '@tauri-apps/api/os'] as const;

/**
 * Whether a JSX attribute is a string ref, the React pre-19 spelling.
 * @param node - the attribute.
 * @returns true when it is `ref="name"`.
 */
function stringRef(node: Node): boolean {
  if (stryMutAct_9fa48("2320")) {
    {}
  } else {
    stryCov_9fa48("2320");
    if (stryMutAct_9fa48("2323") ? node.type === 'JSXAttribute' : stryMutAct_9fa48("2322") ? false : stryMutAct_9fa48("2321") ? true : (stryCov_9fa48("2321", "2322", "2323"), node.type !== (stryMutAct_9fa48("2324") ? "" : (stryCov_9fa48("2324"), 'JSXAttribute')))) return stryMutAct_9fa48("2325") ? true : (stryCov_9fa48("2325"), false);
    const name = node[stryMutAct_9fa48("2326") ? "" : (stryCov_9fa48("2326"), 'name')];
    if (stryMutAct_9fa48("2329") ? (!isNode(name) || name.type !== 'JSXIdentifier') && name['name'] !== 'ref' : stryMutAct_9fa48("2328") ? false : stryMutAct_9fa48("2327") ? true : (stryCov_9fa48("2327", "2328", "2329"), (stryMutAct_9fa48("2331") ? !isNode(name) && name.type !== 'JSXIdentifier' : stryMutAct_9fa48("2330") ? false : (stryCov_9fa48("2330", "2331"), (stryMutAct_9fa48("2332") ? isNode(name) : (stryCov_9fa48("2332"), !isNode(name))) || (stryMutAct_9fa48("2334") ? name.type === 'JSXIdentifier' : stryMutAct_9fa48("2333") ? false : (stryCov_9fa48("2333", "2334"), name.type !== (stryMutAct_9fa48("2335") ? "" : (stryCov_9fa48("2335"), 'JSXIdentifier')))))) || (stryMutAct_9fa48("2337") ? name['name'] === 'ref' : stryMutAct_9fa48("2336") ? false : (stryCov_9fa48("2336", "2337"), name[stryMutAct_9fa48("2338") ? "" : (stryCov_9fa48("2338"), 'name')] !== (stryMutAct_9fa48("2339") ? "" : (stryCov_9fa48("2339"), 'ref')))))) return stryMutAct_9fa48("2340") ? true : (stryCov_9fa48("2340"), false);
    const value = node[stryMutAct_9fa48("2341") ? "" : (stryCov_9fa48("2341"), 'value')];
    return stryMutAct_9fa48("2344") ? isNode(value) && value.type === 'Literal' || typeof value['value'] === 'string' : stryMutAct_9fa48("2343") ? false : stryMutAct_9fa48("2342") ? true : (stryCov_9fa48("2342", "2343", "2344"), (stryMutAct_9fa48("2346") ? isNode(value) || value.type === 'Literal' : stryMutAct_9fa48("2345") ? true : (stryCov_9fa48("2345", "2346"), isNode(value) && (stryMutAct_9fa48("2348") ? value.type !== 'Literal' : stryMutAct_9fa48("2347") ? true : (stryCov_9fa48("2347", "2348"), value.type === (stryMutAct_9fa48("2349") ? "" : (stryCov_9fa48("2349"), 'Literal')))))) && (stryMutAct_9fa48("2351") ? typeof value['value'] !== 'string' : stryMutAct_9fa48("2350") ? true : (stryCov_9fa48("2350", "2351"), typeof value[stryMutAct_9fa48("2352") ? "" : (stryCov_9fa48("2352"), 'value')] === (stryMutAct_9fa48("2353") ? "" : (stryCov_9fa48("2353"), 'string')))));
  }
}

/**
 * Whether an import names a Tauri v1 API path.
 * @param node - the import declaration.
 * @returns true when its source is one of the v1 modules.
 */
function v1TauriImport(node: Node): boolean {
  if (stryMutAct_9fa48("2354")) {
    {}
  } else {
    stryCov_9fa48("2354");
    if (stryMutAct_9fa48("2357") ? node.type === 'ImportDeclaration' : stryMutAct_9fa48("2356") ? false : stryMutAct_9fa48("2355") ? true : (stryCov_9fa48("2355", "2356", "2357"), node.type !== (stryMutAct_9fa48("2358") ? "" : (stryCov_9fa48("2358"), 'ImportDeclaration')))) return stryMutAct_9fa48("2359") ? true : (stryCov_9fa48("2359"), false);
    const source = node[stryMutAct_9fa48("2360") ? "" : (stryCov_9fa48("2360"), 'source')];
    if (stryMutAct_9fa48("2363") ? !isNode(source) && source.type !== 'Literal' : stryMutAct_9fa48("2362") ? false : stryMutAct_9fa48("2361") ? true : (stryCov_9fa48("2361", "2362", "2363"), (stryMutAct_9fa48("2364") ? isNode(source) : (stryCov_9fa48("2364"), !isNode(source))) || (stryMutAct_9fa48("2366") ? source.type === 'Literal' : stryMutAct_9fa48("2365") ? false : (stryCov_9fa48("2365", "2366"), source.type !== (stryMutAct_9fa48("2367") ? "" : (stryCov_9fa48("2367"), 'Literal')))))) return stryMutAct_9fa48("2368") ? true : (stryCov_9fa48("2368"), false);
    const path = source[stryMutAct_9fa48("2369") ? "" : (stryCov_9fa48("2369"), 'value')];
    if (stryMutAct_9fa48("2372") ? typeof path === 'string' : stryMutAct_9fa48("2371") ? false : stryMutAct_9fa48("2370") ? true : (stryCov_9fa48("2370", "2371", "2372"), typeof path !== (stryMutAct_9fa48("2373") ? "" : (stryCov_9fa48("2373"), 'string')))) return stryMutAct_9fa48("2374") ? true : (stryCov_9fa48("2374"), false);
    return stryMutAct_9fa48("2375") ? TAURI_V1_PATHS.every(entry => path === entry || path.startsWith(`${entry}/`)) : (stryCov_9fa48("2375"), TAURI_V1_PATHS.some(stryMutAct_9fa48("2376") ? () => undefined : (stryCov_9fa48("2376"), entry => stryMutAct_9fa48("2379") ? path === entry && path.startsWith(`${entry}/`) : stryMutAct_9fa48("2378") ? false : stryMutAct_9fa48("2377") ? true : (stryCov_9fa48("2377", "2378", "2379"), (stryMutAct_9fa48("2381") ? path !== entry : stryMutAct_9fa48("2380") ? false : (stryCov_9fa48("2380", "2381"), path === entry)) || (stryMutAct_9fa48("2382") ? path.endsWith(`${entry}/`) : (stryCov_9fa48("2382"), path.startsWith(stryMutAct_9fa48("2383") ? `` : (stryCov_9fa48("2383"), `${entry}/`))))))));
  }
}

/** A member that names the wanted property, read through renames. */
function namesMember(node: Node, wanted: string, names: Names): boolean {
  if (stryMutAct_9fa48("2384")) {
    {}
  } else {
    stryCov_9fa48("2384");
    return stryMutAct_9fa48("2387") ? node.type === 'MemberExpression' || property(node, names) === wanted : stryMutAct_9fa48("2386") ? false : stryMutAct_9fa48("2385") ? true : (stryCov_9fa48("2385", "2386", "2387"), (stryMutAct_9fa48("2389") ? node.type !== 'MemberExpression' : stryMutAct_9fa48("2388") ? true : (stryCov_9fa48("2388", "2389"), node.type === (stryMutAct_9fa48("2390") ? "" : (stryCov_9fa48("2390"), 'MemberExpression')))) && (stryMutAct_9fa48("2392") ? property(node, names) !== wanted : stryMutAct_9fa48("2391") ? true : (stryCov_9fa48("2391", "2392"), property(node, names) === wanted)));
  }
}

/** Idioms React 19 and Tauri 2 removed, stated about the tree. */
export const SUPERSEDED_RULES: readonly Rule[] = stryMutAct_9fa48("2393") ? [] : (stryCov_9fa48("2393"), [stryMutAct_9fa48("2394") ? {} : (stryCov_9fa48("2394"), {
  holds: stryMutAct_9fa48("2395") ? () => undefined : (stryCov_9fa48("2395"), (node, names) => callsMethod(node, stryMutAct_9fa48("2396") ? "" : (stryCov_9fa48("2396"), 'ReactDOM'), stryMutAct_9fa48("2397") ? [] : (stryCov_9fa48("2397"), [...REACT_REMOVED_CALLS]), names)),
  why: stryMutAct_9fa48("2398") ? "" : (stryCov_9fa48("2398"), 'ReactDOM render and its siblings were removed in React 19; use createRoot and refs')
}), stryMutAct_9fa48("2399") ? {} : (stryCov_9fa48("2399"), {
  holds: stryMutAct_9fa48("2400") ? () => undefined : (stryCov_9fa48("2400"), (node, names) => callsGlobal(node, stryMutAct_9fa48("2401") ? "" : (stryCov_9fa48("2401"), 'findDOMNode'), names)),
  why: stryMutAct_9fa48("2402") ? "" : (stryCov_9fa48("2402"), 'findDOMNode was removed in React 19; use a ref')
}), stryMutAct_9fa48("2403") ? {} : (stryCov_9fa48("2403"), {
  holds: stryMutAct_9fa48("2404") ? () => undefined : (stryCov_9fa48("2404"), (node, names) => namesMember(node, stryMutAct_9fa48("2405") ? "" : (stryCov_9fa48("2405"), 'defaultProps'), names)),
  why: stryMutAct_9fa48("2406") ? "" : (stryCov_9fa48("2406"), 'defaultProps on a component was removed in React 19; use default parameters')
}), stryMutAct_9fa48("2407") ? {} : (stryCov_9fa48("2407"), {
  holds: stryMutAct_9fa48("2408") ? () => undefined : (stryCov_9fa48("2408"), (node, names) => stryMutAct_9fa48("2411") ? namesMember(node, 'childContextTypes', names) && namesMember(node, 'getChildContext', names) : stryMutAct_9fa48("2410") ? false : stryMutAct_9fa48("2409") ? true : (stryCov_9fa48("2409", "2410", "2411"), namesMember(node, stryMutAct_9fa48("2412") ? "" : (stryCov_9fa48("2412"), 'childContextTypes'), names) || namesMember(node, stryMutAct_9fa48("2413") ? "" : (stryCov_9fa48("2413"), 'getChildContext'), names))),
  why: stryMutAct_9fa48("2414") ? "" : (stryCov_9fa48("2414"), 'legacy context was removed in React 19; use the Context API')
}), stryMutAct_9fa48("2415") ? {} : (stryCov_9fa48("2415"), {
  holds: stryMutAct_9fa48("2416") ? () => undefined : (stryCov_9fa48("2416"), node => stringRef(node)),
  why: stryMutAct_9fa48("2417") ? "" : (stryCov_9fa48("2417"), 'a string ref was removed in React 19; use a ref object or callback')
}), stryMutAct_9fa48("2418") ? {} : (stryCov_9fa48("2418"), {
  holds: stryMutAct_9fa48("2419") ? () => undefined : (stryCov_9fa48("2419"), node => v1TauriImport(node)),
  why: stryMutAct_9fa48("2420") ? "" : (stryCov_9fa48("2420"), 'this is a Tauri v1 API path; use @tauri-apps/api/core or the v2 plugin')
}), stryMutAct_9fa48("2421") ? {} : (stryCov_9fa48("2421"), {
  holds: stryMutAct_9fa48("2422") ? () => undefined : (stryCov_9fa48("2422"), (node, names) => stryMutAct_9fa48("2425") ? node.type === 'MemberExpression' || property(node, names) === '__TAURI__' : stryMutAct_9fa48("2424") ? false : stryMutAct_9fa48("2423") ? true : (stryCov_9fa48("2423", "2424", "2425"), (stryMutAct_9fa48("2427") ? node.type !== 'MemberExpression' : stryMutAct_9fa48("2426") ? true : (stryCov_9fa48("2426", "2427"), node.type === (stryMutAct_9fa48("2428") ? "" : (stryCov_9fa48("2428"), 'MemberExpression')))) && (stryMutAct_9fa48("2430") ? property(node, names) !== '__TAURI__' : stryMutAct_9fa48("2429") ? true : (stryCov_9fa48("2429", "2430"), property(node, names) === (stryMutAct_9fa48("2431") ? "" : (stryCov_9fa48("2431"), '__TAURI__')))))),
  why: stryMutAct_9fa48("2432") ? "" : (stryCov_9fa48("2432"), 'the __TAURI__ global is the Tauri v1 API; use invoke from @tauri-apps/api/core')
})]);