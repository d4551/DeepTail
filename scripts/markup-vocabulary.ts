/**
 * Class tokens that belong to a UI framework this product retired.
 *
 * The design system is tokens.css and the shipped sheets. A utility class, a
 * daisyUI component class, a Bootstrap grid class, or a Tailwind variant is a
 * second vocabulary no sheet here names. Distinctive tokens only: words this
 * product itself uses (`card`, `menu`, `button`, `drawer-toggle`) stay allowed,
 * because they are this design system's names, not a framework's.
 *
 * @module
 */

/**
 * Tokens that are a framework component on their own, and that this product
 * never uses as a class.
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
const RETIRED_EXACT = new Set(stryMutAct_9fa48("2107") ? [] : (stryCov_9fa48("2107"), [stryMutAct_9fa48("2108") ? "" : (stryCov_9fa48("2108"), 'btn'), stryMutAct_9fa48("2109") ? "" : (stryCov_9fa48("2109"), 'navbar'), stryMutAct_9fa48("2110") ? "" : (stryCov_9fa48("2110"), 'dropdown'), stryMutAct_9fa48("2111") ? "" : (stryCov_9fa48("2111"), 'toast'), stryMutAct_9fa48("2112") ? "" : (stryCov_9fa48("2112"), 'tooltip'), stryMutAct_9fa48("2113") ? "" : (stryCov_9fa48("2113"), 'skeleton'), stryMutAct_9fa48("2114") ? "" : (stryCov_9fa48("2114"), 'avatar'), stryMutAct_9fa48("2115") ? "" : (stryCov_9fa48("2115"), 'hero'), stryMutAct_9fa48("2116") ? "" : (stryCov_9fa48("2116"), 'dock'), stryMutAct_9fa48("2117") ? "" : (stryCov_9fa48("2117"), 'kbd'), stryMutAct_9fa48("2118") ? "" : (stryCov_9fa48("2118"), 'swap'), stryMutAct_9fa48("2119") ? "" : (stryCov_9fa48("2119"), 'join'), stryMutAct_9fa48("2120") ? "" : (stryCov_9fa48("2120"), 'tabs'), stryMutAct_9fa48("2121") ? "" : (stryCov_9fa48("2121"), 'breadcrumbs'), stryMutAct_9fa48("2122") ? "" : (stryCov_9fa48("2122"), 'pagination'), stryMutAct_9fa48("2123") ? "" : (stryCov_9fa48("2123"), 'carousel'), stryMutAct_9fa48("2124") ? "" : (stryCov_9fa48("2124"), 'accordion'), stryMutAct_9fa48("2125") ? "" : (stryCov_9fa48("2125"), 'countdown'), stryMutAct_9fa48("2126") ? "" : (stryCov_9fa48("2126"), 'indicator'), stryMutAct_9fa48("2127") ? "" : (stryCov_9fa48("2127"), 'mask'), stryMutAct_9fa48("2128") ? "" : (stryCov_9fa48("2128"), 'prose'), stryMutAct_9fa48("2129") ? "" : (stryCov_9fa48("2129"), 'glass'), stryMutAct_9fa48("2130") ? "" : (stryCov_9fa48("2130"), 'collapse'), stryMutAct_9fa48("2131") ? "" : (stryCov_9fa48("2131"), 'diff'), stryMutAct_9fa48("2132") ? "" : (stryCov_9fa48("2132"), 'fab'), stryMutAct_9fa48("2133") ? "" : (stryCov_9fa48("2133"), 'timeline'), stryMutAct_9fa48("2134") ? "" : (stryCov_9fa48("2134"), 'chat'), stryMutAct_9fa48("2135") ? "" : (stryCov_9fa48("2135"), 'stat'), stryMutAct_9fa48("2136") ? "" : (stryCov_9fa48("2136"), 'steps'), stryMutAct_9fa48("2137") ? "" : (stryCov_9fa48("2137"), 'rating'), stryMutAct_9fa48("2138") ? "" : (stryCov_9fa48("2138"), 'range'), stryMutAct_9fa48("2139") ? "" : (stryCov_9fa48("2139"), 'toggle'), stryMutAct_9fa48("2140") ? "" : (stryCov_9fa48("2140"), 'checkbox'), stryMutAct_9fa48("2141") ? "" : (stryCov_9fa48("2141"), 'badge'), stryMutAct_9fa48("2142") ? "" : (stryCov_9fa48("2142"), 'alert'), stryMutAct_9fa48("2143") ? "" : (stryCov_9fa48("2143"), 'loading'), stryMutAct_9fa48("2144") ? "" : (stryCov_9fa48("2144"), 'filter'), stryMutAct_9fa48("2145") ? "" : (stryCov_9fa48("2145"), 'stack'), stryMutAct_9fa48("2146") ? "" : (stryCov_9fa48("2146"), 'mockup'), stryMutAct_9fa48("2147") ? "" : (stryCov_9fa48("2147"), 'theme-controller'), stryMutAct_9fa48("2148") ? "" : (stryCov_9fa48("2148"), 'validator'), stryMutAct_9fa48("2149") ? "" : (stryCov_9fa48("2149"), 'list-row'), stryMutAct_9fa48("2150") ? "" : (stryCov_9fa48("2150"), 'list-col'), stryMutAct_9fa48("2151") ? "" : (stryCov_9fa48("2151"), 'list-col-wrap'), stryMutAct_9fa48("2152") ? "" : (stryCov_9fa48("2152"), 'list-col-grow'), stryMutAct_9fa48("2153") ? "" : (stryCov_9fa48("2153"), 'fieldset-legend'), stryMutAct_9fa48("2154") ? "" : (stryCov_9fa48("2154"), 'validator-hint'), stryMutAct_9fa48("2155") ? "" : (stryCov_9fa48("2155"), 'filter-reset'), stryMutAct_9fa48("2156") ? "" : (stryCov_9fa48("2156"), 'card-border'), stryMutAct_9fa48("2157") ? "" : (stryCov_9fa48("2157"), 'menu-active'), stryMutAct_9fa48("2158") ? "" : (stryCov_9fa48("2158"), 'menu-disabled'), stryMutAct_9fa48("2159") ? "" : (stryCov_9fa48("2159"), 'menu-focus'), stryMutAct_9fa48("2160") ? "" : (stryCov_9fa48("2160"), 'tabs-border'), stryMutAct_9fa48("2161") ? "" : (stryCov_9fa48("2161"), 'tabs-lift'), stryMutAct_9fa48("2162") ? "" : (stryCov_9fa48("2162"), 'tabs-box'), stryMutAct_9fa48("2163") ? "" : (stryCov_9fa48("2163"), 'card-sm'), stryMutAct_9fa48("2164") ? "" : (stryCov_9fa48("2164"), 'dock-active'), stryMutAct_9fa48("2165") ? "" : (stryCov_9fa48("2165"), 'mockup-phone-camera'), stryMutAct_9fa48("2166") ? "" : (stryCov_9fa48("2166"), 'mockup-phone-display'), stryMutAct_9fa48("2167") ? "" : (stryCov_9fa48("2167"), 'divider'), // daisyUI 5 components this list named only as compounds or not at all.
// `stack` was exact, so `stack-top` (a modifier, a different token) passed;
// `file-input`, `floating-label`, `radial-progress`, `calendar`/`cally`, and
// the `fieldset` class (not the HTML element) are the current-major names a
// reintroduction writes first.
stryMutAct_9fa48("2168") ? "" : (stryCov_9fa48("2168"), 'floating-label'), stryMutAct_9fa48("2169") ? "" : (stryCov_9fa48("2169"), 'file-input'), stryMutAct_9fa48("2170") ? "" : (stryCov_9fa48("2170"), 'radial-progress'), stryMutAct_9fa48("2171") ? "" : (stryCov_9fa48("2171"), 'calendar'), stryMutAct_9fa48("2172") ? "" : (stryCov_9fa48("2172"), 'cally'), stryMutAct_9fa48("2173") ? "" : (stryCov_9fa48("2173"), 'fieldset'), stryMutAct_9fa48("2174") ? "" : (stryCov_9fa48("2174"), 'progress'), // The spellings daisyUI 5 renamed away from. A page still writing one is a
// page on the retired framework's previous major, which is as much a second
// vocabulary as its current one — and the rename means the current-name
// rules above never see it.
stryMutAct_9fa48("2175") ? "" : (stryCov_9fa48("2175"), 'artboard'), stryMutAct_9fa48("2176") ? "" : (stryCov_9fa48("2176"), 'btm-nav'), stryMutAct_9fa48("2177") ? "" : (stryCov_9fa48("2177"), 'btm-nav-label'), stryMutAct_9fa48("2178") ? "" : (stryCov_9fa48("2178"), 'input-group'), stryMutAct_9fa48("2179") ? "" : (stryCov_9fa48("2179"), 'tabs-bordered'), stryMutAct_9fa48("2180") ? "" : (stryCov_9fa48("2180"), 'tabs-lifted'), stryMutAct_9fa48("2181") ? "" : (stryCov_9fa48("2181"), 'tabs-boxed'), stryMutAct_9fa48("2182") ? "" : (stryCov_9fa48("2182"), 'btn-group'), stryMutAct_9fa48("2183") ? "" : (stryCov_9fa48("2183"), 'form-control'), stryMutAct_9fa48("2184") ? "" : (stryCov_9fa48("2184"), 'form-group'), stryMutAct_9fa48("2185") ? "" : (stryCov_9fa48("2185"), 'container-fluid'), stryMutAct_9fa48("2186") ? "" : (stryCov_9fa48("2186"), 'navbar-toggler'), stryMutAct_9fa48("2187") ? "" : (stryCov_9fa48("2187"), 'sr-only')]));

/**
 * Prefixes that only a retired framework assigns. Product classes that share a
 * stem (`menu-item`, `modal-dialog`, `drawer-toggle`, `button-primary`,
 * `card`) are not in this list.
 */
const RETIRED_PREFIXES = stryMutAct_9fa48("2188") ? [] : (stryCov_9fa48("2188"), [stryMutAct_9fa48("2189") ? "" : (stryCov_9fa48("2189"), 'btn-'), stryMutAct_9fa48("2190") ? "" : (stryCov_9fa48("2190"), 'navbar-'), stryMutAct_9fa48("2191") ? "" : (stryCov_9fa48("2191"), 'dropdown-'), stryMutAct_9fa48("2192") ? "" : (stryCov_9fa48("2192"), 'swap-'), stryMutAct_9fa48("2193") ? "" : (stryCov_9fa48("2193"), 'join-'), stryMutAct_9fa48("2194") ? "" : (stryCov_9fa48("2194"), 'tab-'), stryMutAct_9fa48("2195") ? "" : (stryCov_9fa48("2195"), 'tabs-'), stryMutAct_9fa48("2196") ? "" : (stryCov_9fa48("2196"), 'toast-'), stryMutAct_9fa48("2197") ? "" : (stryCov_9fa48("2197"), 'tooltip-'), stryMutAct_9fa48("2198") ? "" : (stryCov_9fa48("2198"), 'skeleton-'), stryMutAct_9fa48("2199") ? "" : (stryCov_9fa48("2199"), 'avatar-'), stryMutAct_9fa48("2200") ? "" : (stryCov_9fa48("2200"), 'hero-'), stryMutAct_9fa48("2201") ? "" : (stryCov_9fa48("2201"), 'dock-'), stryMutAct_9fa48("2202") ? "" : (stryCov_9fa48("2202"), 'kbd-'), stryMutAct_9fa48("2203") ? "" : (stryCov_9fa48("2203"), 'badge-'), stryMutAct_9fa48("2204") ? "" : (stryCov_9fa48("2204"), 'alert-'), stryMutAct_9fa48("2205") ? "" : (stryCov_9fa48("2205"), 'loading-'), stryMutAct_9fa48("2206") ? "" : (stryCov_9fa48("2206"), 'mockup-'), stryMutAct_9fa48("2207") ? "" : (stryCov_9fa48("2207"), 'theme-'), stryMutAct_9fa48("2208") ? "" : (stryCov_9fa48("2208"), 'card-body'), stryMutAct_9fa48("2209") ? "" : (stryCov_9fa48("2209"), 'card-title'), stryMutAct_9fa48("2210") ? "" : (stryCov_9fa48("2210"), 'card-actions'), stryMutAct_9fa48("2211") ? "" : (stryCov_9fa48("2211"), 'card-compact'), stryMutAct_9fa48("2212") ? "" : (stryCov_9fa48("2212"), 'modal-box'), stryMutAct_9fa48("2213") ? "" : (stryCov_9fa48("2213"), 'modal-backdrop'), stryMutAct_9fa48("2214") ? "" : (stryCov_9fa48("2214"), 'drawer-side'), stryMutAct_9fa48("2215") ? "" : (stryCov_9fa48("2215"), 'drawer-overlay'), stryMutAct_9fa48("2216") ? "" : (stryCov_9fa48("2216"), 'drawer-content'), stryMutAct_9fa48("2217") ? "" : (stryCov_9fa48("2217"), 'menu-title'), stryMutAct_9fa48("2218") ? "" : (stryCov_9fa48("2218"), 'menu-dropdown'), stryMutAct_9fa48("2219") ? "" : (stryCov_9fa48("2219"), 'daisy-'), stryMutAct_9fa48("2220") ? "" : (stryCov_9fa48("2220"), 'bg-primary'), stryMutAct_9fa48("2221") ? "" : (stryCov_9fa48("2221"), 'bg-secondary'), stryMutAct_9fa48("2222") ? "" : (stryCov_9fa48("2222"), 'bg-accent'), stryMutAct_9fa48("2223") ? "" : (stryCov_9fa48("2223"), 'bg-neutral'), stryMutAct_9fa48("2224") ? "" : (stryCov_9fa48("2224"), 'bg-base-'), stryMutAct_9fa48("2225") ? "" : (stryCov_9fa48("2225"), 'text-primary'), stryMutAct_9fa48("2226") ? "" : (stryCov_9fa48("2226"), 'text-secondary'), stryMutAct_9fa48("2227") ? "" : (stryCov_9fa48("2227"), 'text-accent'), stryMutAct_9fa48("2228") ? "" : (stryCov_9fa48("2228"), 'text-neutral'), stryMutAct_9fa48("2229") ? "" : (stryCov_9fa48("2229"), 'text-base-'), stryMutAct_9fa48("2230") ? "" : (stryCov_9fa48("2230"), 'border-base-'), stryMutAct_9fa48("2231") ? "" : (stryCov_9fa48("2231"), 'border-primary'), stryMutAct_9fa48("2232") ? "" : (stryCov_9fa48("2232"), 'col-xs-'), stryMutAct_9fa48("2233") ? "" : (stryCov_9fa48("2233"), 'col-sm-'), stryMutAct_9fa48("2234") ? "" : (stryCov_9fa48("2234"), 'col-md-'), stryMutAct_9fa48("2235") ? "" : (stryCov_9fa48("2235"), 'col-lg-'), stryMutAct_9fa48("2236") ? "" : (stryCov_9fa48("2236"), 'col-xl-'), stryMutAct_9fa48("2237") ? "" : (stryCov_9fa48("2237"), 'col-xxl-'), stryMutAct_9fa48("2238") ? "" : (stryCov_9fa48("2238"), 'input-'), stryMutAct_9fa48("2239") ? "" : (stryCov_9fa48("2239"), 'status-'), stryMutAct_9fa48("2240") ? "" : (stryCov_9fa48("2240"), 'mask-'), stryMutAct_9fa48("2241") ? "" : (stryCov_9fa48("2241"), 'bg-linear-'), stryMutAct_9fa48("2242") ? "" : (stryCov_9fa48("2242"), 'bg-radial-'), stryMutAct_9fa48("2243") ? "" : (stryCov_9fa48("2243"), 'bg-conic-'), stryMutAct_9fa48("2244") ? "" : (stryCov_9fa48("2244"), 'field-sizing-'), stryMutAct_9fa48("2245") ? "" : (stryCov_9fa48("2245"), 'scrollbar-'), stryMutAct_9fa48("2246") ? "" : (stryCov_9fa48("2246"), 'text-shadow-'), stryMutAct_9fa48("2247") ? "" : (stryCov_9fa48("2247"), 'inset-shadow-'), stryMutAct_9fa48("2248") ? "" : (stryCov_9fa48("2248"), 'ring-offset-'), stryMutAct_9fa48("2249") ? "" : (stryCov_9fa48("2249"), 'offset-'), // Renamed away from in daisyUI 5, so the current-name prefixes miss them.
stryMutAct_9fa48("2250") ? "" : (stryCov_9fa48("2250"), 'btm-nav-'), stryMutAct_9fa48("2251") ? "" : (stryCov_9fa48("2251"), 'artboard-'), stryMutAct_9fa48("2252") ? "" : (stryCov_9fa48("2252"), 'phone-'), stryMutAct_9fa48("2253") ? "" : (stryCov_9fa48("2253"), 'd-flex'), stryMutAct_9fa48("2254") ? "" : (stryCov_9fa48("2254"), 'd-none'), stryMutAct_9fa48("2255") ? "" : (stryCov_9fa48("2255"), 'd-block'), stryMutAct_9fa48("2256") ? "" : (stryCov_9fa48("2256"), 'd-inline'), stryMutAct_9fa48("2257") ? "" : (stryCov_9fa48("2257"), 'd-grid'), // daisyUI 5 modifiers whose bare component is already exact, so a sized or
// coloured variant (`stack-top`, `checkbox-primary`, `file-input-sm`) was a
// different token the exact set never saw.
stryMutAct_9fa48("2258") ? "" : (stryCov_9fa48("2258"), 'stack-'), stryMutAct_9fa48("2259") ? "" : (stryCov_9fa48("2259"), 'file-input-'), stryMutAct_9fa48("2260") ? "" : (stryCov_9fa48("2260"), 'checkbox-'), stryMutAct_9fa48("2261") ? "" : (stryCov_9fa48("2261"), 'radio-'), stryMutAct_9fa48("2262") ? "" : (stryCov_9fa48("2262"), 'toggle-'), stryMutAct_9fa48("2263") ? "" : (stryCov_9fa48("2263"), 'range-'), stryMutAct_9fa48("2264") ? "" : (stryCov_9fa48("2264"), 'rating-'), stryMutAct_9fa48("2265") ? "" : (stryCov_9fa48("2265"), 'steps-'), stryMutAct_9fa48("2266") ? "" : (stryCov_9fa48("2266"), 'progress-'), stryMutAct_9fa48("2267") ? "" : (stryCov_9fa48("2267"), 'fieldset-'), stryMutAct_9fa48("2268") ? "" : (stryCov_9fa48("2268"), 'calendar-')]);

/**
 * A Tailwind numeric or keyword utility: `p-4`, `w-full`, `text-sm`, `gap-2`.
 *
 * The scale lives in tokens.css. A class that encodes a spacing or type
 * decision is a second scale no gate reads.
 */
const TAILWIND_UTILITY = (stryMutAct_9fa48("2269") ? "" : (stryCov_9fa48("2269"), '-?(?:p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml|gap|inset|top|right|bottom|left|z|w|h|min-w|min-h|max-w|max-h|text|leading|tracking|rounded|shadow|opacity|basis|grow|shrink|order|col-span|row-span|grid-cols|grid-rows|space-x|space-y|translate-x|translate-y|scale|rotate|inset-x|inset-y|indent|scroll-m|scroll-p')) + (// Families Tailwind 4 added or renamed into. Written against v3 alone, the
// list read `bg-gradient-to-r` and let `bg-linear-to-r` — the same utility
// under its current name — through untouched.
stryMutAct_9fa48("2270") ? "" : (stryCov_9fa48("2270"), '|outline|ring|ring-offset|size|mask|bg-linear|bg-radial|bg-conic|text-shadow|inset-shadow|field-sizing|scrollbar|zoom')) + (// The logical-property families, which are how a spacing decision is written
// for a document whose direction can reverse. Written against the physical
// families alone, the list read `ml-4` and let `ms-4` — the same decision,
// spelt the way the current major recommends — through untouched.
stryMutAct_9fa48("2271") ? "" : (stryCov_9fa48("2271"), '|ms|me|ps|pe|start|end|tab')) + (stryMutAct_9fa48("2272") ? "" : (stryCov_9fa48("2272"), ')-'));
const TAILWIND_NAMED = stryMutAct_9fa48("2274") ? /^(?:flex-col|flex-row|flex-wrap|flex-nowrap|items-center|items-start|items-end|items-stretch|justify-between|justify-center|justify-start|justify-end|justify-around|justify-evenly|place-items-center|grid-flow-col|grid-flow-row|sr-only|not-sr-only|container|prose|outline-hidden|outline-none|bg-radial|bg-conic|border-s|border-e|scheme-light|scheme-dark|scheme-normal|scheme-only-light|scheme-only-dark)/u : stryMutAct_9fa48("2273") ? /(?:flex-col|flex-row|flex-wrap|flex-nowrap|items-center|items-start|items-end|items-stretch|justify-between|justify-center|justify-start|justify-end|justify-around|justify-evenly|place-items-center|grid-flow-col|grid-flow-row|sr-only|not-sr-only|container|prose|outline-hidden|outline-none|bg-radial|bg-conic|border-s|border-e|scheme-light|scheme-dark|scheme-normal|scheme-only-light|scheme-only-dark)$/u : (stryCov_9fa48("2273", "2274"), /^(?:flex-col|flex-row|flex-wrap|flex-nowrap|items-center|items-start|items-end|items-stretch|justify-between|justify-center|justify-start|justify-end|justify-around|justify-evenly|place-items-center|grid-flow-col|grid-flow-row|sr-only|not-sr-only|container|prose|outline-hidden|outline-none|bg-radial|bg-conic|border-s|border-e|scheme-light|scheme-dark|scheme-normal|scheme-only-light|scheme-only-dark)$/u);
const TAILWIND_SCALE = stryMutAct_9fa48("2275") ? "" : (stryCov_9fa48("2275"), '(?:\\d+|px|auto|full|screen|fit|min|max|svh|lvh|dvh|svw|lvw|dvw|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|none|tight|snug|normal|relaxed|loose)');
const TAILWIND_UTILITY_RE = new RegExp(stryMutAct_9fa48("2276") ? `` : (stryCov_9fa48("2276"), `^(?:${TAILWIND_UTILITY})${TAILWIND_SCALE}$`), stryMutAct_9fa48("2277") ? "" : (stryCov_9fa48("2277"), 'u'));

/**
 * The utility a class token names, after Tailwind/daisyUI variants are peeled.
 * @param token - one class attribute token.
 * @returns the trailing utility (`md:hover:p-4` → `p-4`).
 */
function utilityOf(token: string): string {
  if (stryMutAct_9fa48("2278")) {
    {}
  } else {
    stryCov_9fa48("2278");
    // Tailwind 3 wrote important as a prefix and Tailwind 4 writes it as a
    // suffix. Peeling only the prefix meant `p-4!` — the current spelling of a
    // token the gate already refuses as `p-4` — was not recognised at all.
    const leading = (stryMutAct_9fa48("2279") ? token.endsWith('!') : (stryCov_9fa48("2279"), token.startsWith(stryMutAct_9fa48("2280") ? "" : (stryCov_9fa48("2280"), '!')))) ? stryMutAct_9fa48("2281") ? token : (stryCov_9fa48("2281"), token.slice(1)) : token;
    const important = (stryMutAct_9fa48("2282") ? leading.startsWith('!') : (stryCov_9fa48("2282"), leading.endsWith(stryMutAct_9fa48("2283") ? "" : (stryCov_9fa48("2283"), '!')))) ? stryMutAct_9fa48("2284") ? leading : (stryCov_9fa48("2284"), leading.slice(0, stryMutAct_9fa48("2285") ? +1 : (stryCov_9fa48("2285"), -1))) : leading;
    const parts = important.split(stryMutAct_9fa48("2286") ? "" : (stryCov_9fa48("2286"), ':'));
    return stryMutAct_9fa48("2287") ? parts.at(-1) && important : (stryCov_9fa48("2287"), parts.at(stryMutAct_9fa48("2288") ? +1 : (stryCov_9fa48("2288"), -1)) ?? important);
  }
}

/**
 * Whether one class token belongs to a retired framework.
 * @param token - one class attribute token.
 * @returns true when the token is a retired framework's vocabulary.
 */
export function isRetiredClassToken(token: string): boolean {
  if (stryMutAct_9fa48("2289")) {
    {}
  } else {
    stryCov_9fa48("2289");
    if (stryMutAct_9fa48("2292") ? token !== '' : stryMutAct_9fa48("2291") ? false : stryMutAct_9fa48("2290") ? true : (stryCov_9fa48("2290", "2291", "2292"), token === (stryMutAct_9fa48("2293") ? "Stryker was here!" : (stryCov_9fa48("2293"), '')))) return stryMutAct_9fa48("2294") ? true : (stryCov_9fa48("2294"), false);
    const utility = utilityOf(token);
    if (stryMutAct_9fa48("2297") ? RETIRED_EXACT.has(utility) && RETIRED_EXACT.has(token) : stryMutAct_9fa48("2296") ? false : stryMutAct_9fa48("2295") ? true : (stryCov_9fa48("2295", "2296", "2297"), RETIRED_EXACT.has(utility) || RETIRED_EXACT.has(token))) return stryMutAct_9fa48("2298") ? false : (stryCov_9fa48("2298"), true);
    if (stryMutAct_9fa48("2301") ? TAILWIND_NAMED.test(utility) && TAILWIND_UTILITY_RE.test(utility) : stryMutAct_9fa48("2300") ? false : stryMutAct_9fa48("2299") ? true : (stryCov_9fa48("2299", "2300", "2301"), TAILWIND_NAMED.test(utility) || TAILWIND_UTILITY_RE.test(utility))) return stryMutAct_9fa48("2302") ? false : (stryCov_9fa48("2302"), true);
    return stryMutAct_9fa48("2303") ? RETIRED_PREFIXES.every(prefix => utility.startsWith(prefix) || token.startsWith(prefix)) : (stryCov_9fa48("2303"), RETIRED_PREFIXES.some(stryMutAct_9fa48("2304") ? () => undefined : (stryCov_9fa48("2304"), prefix => stryMutAct_9fa48("2307") ? utility.startsWith(prefix) && token.startsWith(prefix) : stryMutAct_9fa48("2306") ? false : stryMutAct_9fa48("2305") ? true : (stryCov_9fa48("2305", "2306", "2307"), (stryMutAct_9fa48("2308") ? utility.endsWith(prefix) : (stryCov_9fa48("2308"), utility.startsWith(prefix))) || (stryMutAct_9fa48("2309") ? token.endsWith(prefix) : (stryCov_9fa48("2309"), token.startsWith(prefix)))))));
  }
}

/**
 * Every retired-framework class a class attribute carries.
 * @param value - the class attribute value.
 * @returns the tokens that belong to a retired framework.
 */
export function retiredClassTokens(value: string): string[] {
  if (stryMutAct_9fa48("2310")) {
    {}
  } else {
    stryCov_9fa48("2310");
    return stryMutAct_9fa48("2311") ? value.split(/\s+/u) : (stryCov_9fa48("2311"), value.split(stryMutAct_9fa48("2313") ? /\S+/u : stryMutAct_9fa48("2312") ? /\s/u : (stryCov_9fa48("2312", "2313"), /\s+/u)).filter(stryMutAct_9fa48("2314") ? () => undefined : (stryCov_9fa48("2314"), token => isRetiredClassToken(token))));
  }
}