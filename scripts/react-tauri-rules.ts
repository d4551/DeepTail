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
const REACT_REMOVED_CALLS = new Set(stryMutAct_9fa48("1867") ? [] : (stryCov_9fa48("1867"), [stryMutAct_9fa48("1868") ? "" : (stryCov_9fa48("1868"), 'render'), stryMutAct_9fa48("1869") ? "" : (stryCov_9fa48("1869"), 'hydrate'), stryMutAct_9fa48("1870") ? "" : (stryCov_9fa48("1870"), 'unmountComponentAtNode'), stryMutAct_9fa48("1871") ? "" : (stryCov_9fa48("1871"), 'findDOMNode')]));

/** The Tauri v1 API paths, which the v2 core module and plugins replaced. */
const TAURI_V1_PATHS = ['@tauri-apps/api/tauri', '@tauri-apps/api/helpers', '@tauri-apps/api/notification', '@tauri-apps/api/updater', '@tauri-apps/api/dialog', '@tauri-apps/api/fs', '@tauri-apps/api/http', '@tauri-apps/api/clipboard', '@tauri-apps/api/shell', '@tauri-apps/api/process', '@tauri-apps/api/globalShortcut', '@tauri-apps/api/os'] as const;

/**
 * Whether a JSX attribute is a string ref, the React pre-19 spelling.
 * @param node - the attribute.
 * @returns true when it is `ref="name"`.
 */
function stringRef(node: Node): boolean {
  if (stryMutAct_9fa48("1872")) {
    {}
  } else {
    stryCov_9fa48("1872");
    if (stryMutAct_9fa48("1875") ? node.type === 'JSXAttribute' : stryMutAct_9fa48("1874") ? false : stryMutAct_9fa48("1873") ? true : (stryCov_9fa48("1873", "1874", "1875"), node.type !== (stryMutAct_9fa48("1876") ? "" : (stryCov_9fa48("1876"), 'JSXAttribute')))) return stryMutAct_9fa48("1877") ? true : (stryCov_9fa48("1877"), false);
    const name = node.name;
    if (stryMutAct_9fa48("1880") ? (!isNode(name) || name.type !== 'JSXIdentifier') && name.name !== 'ref' : stryMutAct_9fa48("1879") ? false : stryMutAct_9fa48("1878") ? true : (stryCov_9fa48("1878", "1879", "1880"), (stryMutAct_9fa48("1882") ? !isNode(name) && name.type !== 'JSXIdentifier' : stryMutAct_9fa48("1881") ? false : (stryCov_9fa48("1881", "1882"), (stryMutAct_9fa48("1883") ? isNode(name) : (stryCov_9fa48("1883"), !isNode(name))) || (stryMutAct_9fa48("1885") ? name.type === 'JSXIdentifier' : stryMutAct_9fa48("1884") ? false : (stryCov_9fa48("1884", "1885"), name.type !== (stryMutAct_9fa48("1886") ? "" : (stryCov_9fa48("1886"), 'JSXIdentifier')))))) || (stryMutAct_9fa48("1888") ? name.name === 'ref' : stryMutAct_9fa48("1887") ? false : (stryCov_9fa48("1887", "1888"), name.name !== (stryMutAct_9fa48("1889") ? "" : (stryCov_9fa48("1889"), 'ref')))))) return stryMutAct_9fa48("1890") ? true : (stryCov_9fa48("1890"), false);
    const value = node.value;
    return stryMutAct_9fa48("1893") ? isNode(value) && value.type === 'Literal' || typeof value.value === 'string' : stryMutAct_9fa48("1892") ? false : stryMutAct_9fa48("1891") ? true : (stryCov_9fa48("1891", "1892", "1893"), (stryMutAct_9fa48("1895") ? isNode(value) || value.type === 'Literal' : stryMutAct_9fa48("1894") ? true : (stryCov_9fa48("1894", "1895"), isNode(value) && (stryMutAct_9fa48("1897") ? value.type !== 'Literal' : stryMutAct_9fa48("1896") ? true : (stryCov_9fa48("1896", "1897"), value.type === (stryMutAct_9fa48("1898") ? "" : (stryCov_9fa48("1898"), 'Literal')))))) && (stryMutAct_9fa48("1900") ? typeof value.value !== 'string' : stryMutAct_9fa48("1899") ? true : (stryCov_9fa48("1899", "1900"), typeof value.value === (stryMutAct_9fa48("1901") ? "" : (stryCov_9fa48("1901"), 'string')))));
  }
}

/**
 * Whether an import names a Tauri v1 API path.
 * @param node - the import declaration.
 * @returns true when its source is one of the v1 modules.
 */
function v1TauriImport(node: Node): boolean {
  if (stryMutAct_9fa48("1902")) {
    {}
  } else {
    stryCov_9fa48("1902");
    if (stryMutAct_9fa48("1905") ? node.type === 'ImportDeclaration' : stryMutAct_9fa48("1904") ? false : stryMutAct_9fa48("1903") ? true : (stryCov_9fa48("1903", "1904", "1905"), node.type !== (stryMutAct_9fa48("1906") ? "" : (stryCov_9fa48("1906"), 'ImportDeclaration')))) return stryMutAct_9fa48("1907") ? true : (stryCov_9fa48("1907"), false);
    const source = node.source;
    if (stryMutAct_9fa48("1910") ? !isNode(source) && source.type !== 'Literal' : stryMutAct_9fa48("1909") ? false : stryMutAct_9fa48("1908") ? true : (stryCov_9fa48("1908", "1909", "1910"), (stryMutAct_9fa48("1911") ? isNode(source) : (stryCov_9fa48("1911"), !isNode(source))) || (stryMutAct_9fa48("1913") ? source.type === 'Literal' : stryMutAct_9fa48("1912") ? false : (stryCov_9fa48("1912", "1913"), source.type !== (stryMutAct_9fa48("1914") ? "" : (stryCov_9fa48("1914"), 'Literal')))))) return stryMutAct_9fa48("1915") ? true : (stryCov_9fa48("1915"), false);
    const path = source.value;
    if (stryMutAct_9fa48("1918") ? typeof path === 'string' : stryMutAct_9fa48("1917") ? false : stryMutAct_9fa48("1916") ? true : (stryCov_9fa48("1916", "1917", "1918"), typeof path !== (stryMutAct_9fa48("1919") ? "" : (stryCov_9fa48("1919"), 'string')))) return stryMutAct_9fa48("1920") ? true : (stryCov_9fa48("1920"), false);
    return stryMutAct_9fa48("1921") ? TAURI_V1_PATHS.every(entry => path === entry || path.startsWith(`${entry}/`)) : (stryCov_9fa48("1921"), TAURI_V1_PATHS.some(stryMutAct_9fa48("1922") ? () => undefined : (stryCov_9fa48("1922"), entry => stryMutAct_9fa48("1925") ? path === entry && path.startsWith(`${entry}/`) : stryMutAct_9fa48("1924") ? false : stryMutAct_9fa48("1923") ? true : (stryCov_9fa48("1923", "1924", "1925"), (stryMutAct_9fa48("1927") ? path !== entry : stryMutAct_9fa48("1926") ? false : (stryCov_9fa48("1926", "1927"), path === entry)) || (stryMutAct_9fa48("1928") ? path.endsWith(`${entry}/`) : (stryCov_9fa48("1928"), path.startsWith(stryMutAct_9fa48("1929") ? `` : (stryCov_9fa48("1929"), `${entry}/`))))))));
  }
}

/** A member that names the wanted property, read through renames. */
function namesMember(node: Node, wanted: string, names: Names): boolean {
  if (stryMutAct_9fa48("1930")) {
    {}
  } else {
    stryCov_9fa48("1930");
    return stryMutAct_9fa48("1933") ? node.type === 'MemberExpression' || property(node, names) === wanted : stryMutAct_9fa48("1932") ? false : stryMutAct_9fa48("1931") ? true : (stryCov_9fa48("1931", "1932", "1933"), (stryMutAct_9fa48("1935") ? node.type !== 'MemberExpression' : stryMutAct_9fa48("1934") ? true : (stryCov_9fa48("1934", "1935"), node.type === (stryMutAct_9fa48("1936") ? "" : (stryCov_9fa48("1936"), 'MemberExpression')))) && (stryMutAct_9fa48("1938") ? property(node, names) !== wanted : stryMutAct_9fa48("1937") ? true : (stryCov_9fa48("1937", "1938"), property(node, names) === wanted)));
  }
}

/** Idioms React 19 and Tauri 2 removed, stated about the tree. */
export const LEGACY_RULES: readonly Rule[] = stryMutAct_9fa48("1939") ? [] : (stryCov_9fa48("1939"), [stryMutAct_9fa48("1940") ? {} : (stryCov_9fa48("1940"), {
  holds: stryMutAct_9fa48("1941") ? () => undefined : (stryCov_9fa48("1941"), (node, names) => callsMethod(node, stryMutAct_9fa48("1942") ? "" : (stryCov_9fa48("1942"), 'ReactDOM'), stryMutAct_9fa48("1943") ? [] : (stryCov_9fa48("1943"), [...REACT_REMOVED_CALLS]), names)),
  why: stryMutAct_9fa48("1944") ? "" : (stryCov_9fa48("1944"), 'ReactDOM render and its siblings were removed in React 19; use createRoot and refs')
}), stryMutAct_9fa48("1945") ? {} : (stryCov_9fa48("1945"), {
  holds: stryMutAct_9fa48("1946") ? () => undefined : (stryCov_9fa48("1946"), (node, names) => callsGlobal(node, stryMutAct_9fa48("1947") ? "" : (stryCov_9fa48("1947"), 'findDOMNode'), names)),
  why: stryMutAct_9fa48("1948") ? "" : (stryCov_9fa48("1948"), 'findDOMNode was removed in React 19; use a ref')
}), stryMutAct_9fa48("1949") ? {} : (stryCov_9fa48("1949"), {
  holds: stryMutAct_9fa48("1950") ? () => undefined : (stryCov_9fa48("1950"), (node, names) => namesMember(node, stryMutAct_9fa48("1951") ? "" : (stryCov_9fa48("1951"), 'defaultProps'), names)),
  why: stryMutAct_9fa48("1952") ? "" : (stryCov_9fa48("1952"), 'defaultProps on a component was removed in React 19; use default parameters')
}), stryMutAct_9fa48("1953") ? {} : (stryCov_9fa48("1953"), {
  holds: stryMutAct_9fa48("1954") ? () => undefined : (stryCov_9fa48("1954"), (node, names) => stryMutAct_9fa48("1957") ? namesMember(node, 'childContextTypes', names) && namesMember(node, 'getChildContext', names) : stryMutAct_9fa48("1956") ? false : stryMutAct_9fa48("1955") ? true : (stryCov_9fa48("1955", "1956", "1957"), namesMember(node, stryMutAct_9fa48("1958") ? "" : (stryCov_9fa48("1958"), 'childContextTypes'), names) || namesMember(node, stryMutAct_9fa48("1959") ? "" : (stryCov_9fa48("1959"), 'getChildContext'), names))),
  why: stryMutAct_9fa48("1960") ? "" : (stryCov_9fa48("1960"), 'legacy context was removed in React 19; use the Context API')
}), stryMutAct_9fa48("1961") ? {} : (stryCov_9fa48("1961"), {
  holds: stryMutAct_9fa48("1962") ? () => undefined : (stryCov_9fa48("1962"), node => stringRef(node)),
  why: stryMutAct_9fa48("1963") ? "" : (stryCov_9fa48("1963"), 'a string ref was removed in React 19; use a ref object or callback')
}), stryMutAct_9fa48("1964") ? {} : (stryCov_9fa48("1964"), {
  holds: stryMutAct_9fa48("1965") ? () => undefined : (stryCov_9fa48("1965"), node => v1TauriImport(node)),
  why: stryMutAct_9fa48("1966") ? "" : (stryCov_9fa48("1966"), 'this is a Tauri v1 API path; use @tauri-apps/api/core or the v2 plugin')
}), stryMutAct_9fa48("1967") ? {} : (stryCov_9fa48("1967"), {
  holds: stryMutAct_9fa48("1968") ? () => undefined : (stryCov_9fa48("1968"), (node, names) => stryMutAct_9fa48("1971") ? node.type === 'MemberExpression' || property(node, names) === '__TAURI__' : stryMutAct_9fa48("1970") ? false : stryMutAct_9fa48("1969") ? true : (stryCov_9fa48("1969", "1970", "1971"), (stryMutAct_9fa48("1973") ? node.type !== 'MemberExpression' : stryMutAct_9fa48("1972") ? true : (stryCov_9fa48("1972", "1973"), node.type === (stryMutAct_9fa48("1974") ? "" : (stryCov_9fa48("1974"), 'MemberExpression')))) && (stryMutAct_9fa48("1976") ? property(node, names) !== '__TAURI__' : stryMutAct_9fa48("1975") ? true : (stryCov_9fa48("1975", "1976"), property(node, names) === (stryMutAct_9fa48("1977") ? "" : (stryCov_9fa48("1977"), '__TAURI__')))))),
  why: stryMutAct_9fa48("1978") ? "" : (stryCov_9fa48("1978"), 'the __TAURI__ global is the Tauri v1 API; use invoke from @tauri-apps/api/core')
})]);