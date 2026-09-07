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
const RETIRED_EXACT = new Set(stryMutAct_9fa48("1677") ? [] : (stryCov_9fa48("1677"), [stryMutAct_9fa48("1678") ? "" : (stryCov_9fa48("1678"), 'btn'), stryMutAct_9fa48("1679") ? "" : (stryCov_9fa48("1679"), 'navbar'), stryMutAct_9fa48("1680") ? "" : (stryCov_9fa48("1680"), 'dropdown'), stryMutAct_9fa48("1681") ? "" : (stryCov_9fa48("1681"), 'toast'), stryMutAct_9fa48("1682") ? "" : (stryCov_9fa48("1682"), 'tooltip'), stryMutAct_9fa48("1683") ? "" : (stryCov_9fa48("1683"), 'skeleton'), stryMutAct_9fa48("1684") ? "" : (stryCov_9fa48("1684"), 'avatar'), stryMutAct_9fa48("1685") ? "" : (stryCov_9fa48("1685"), 'hero'), stryMutAct_9fa48("1686") ? "" : (stryCov_9fa48("1686"), 'dock'), stryMutAct_9fa48("1687") ? "" : (stryCov_9fa48("1687"), 'kbd'), stryMutAct_9fa48("1688") ? "" : (stryCov_9fa48("1688"), 'swap'), stryMutAct_9fa48("1689") ? "" : (stryCov_9fa48("1689"), 'join'), stryMutAct_9fa48("1690") ? "" : (stryCov_9fa48("1690"), 'tabs'), stryMutAct_9fa48("1691") ? "" : (stryCov_9fa48("1691"), 'breadcrumbs'), stryMutAct_9fa48("1692") ? "" : (stryCov_9fa48("1692"), 'pagination'), stryMutAct_9fa48("1693") ? "" : (stryCov_9fa48("1693"), 'carousel'), stryMutAct_9fa48("1694") ? "" : (stryCov_9fa48("1694"), 'accordion'), stryMutAct_9fa48("1695") ? "" : (stryCov_9fa48("1695"), 'countdown'), stryMutAct_9fa48("1696") ? "" : (stryCov_9fa48("1696"), 'indicator'), stryMutAct_9fa48("1697") ? "" : (stryCov_9fa48("1697"), 'mask'), stryMutAct_9fa48("1698") ? "" : (stryCov_9fa48("1698"), 'prose'), stryMutAct_9fa48("1699") ? "" : (stryCov_9fa48("1699"), 'glass'), stryMutAct_9fa48("1700") ? "" : (stryCov_9fa48("1700"), 'collapse'), stryMutAct_9fa48("1701") ? "" : (stryCov_9fa48("1701"), 'diff'), stryMutAct_9fa48("1702") ? "" : (stryCov_9fa48("1702"), 'fab'), stryMutAct_9fa48("1703") ? "" : (stryCov_9fa48("1703"), 'timeline'), stryMutAct_9fa48("1704") ? "" : (stryCov_9fa48("1704"), 'chat'), stryMutAct_9fa48("1705") ? "" : (stryCov_9fa48("1705"), 'stat'), stryMutAct_9fa48("1706") ? "" : (stryCov_9fa48("1706"), 'steps'), stryMutAct_9fa48("1707") ? "" : (stryCov_9fa48("1707"), 'rating'), stryMutAct_9fa48("1708") ? "" : (stryCov_9fa48("1708"), 'range'), stryMutAct_9fa48("1709") ? "" : (stryCov_9fa48("1709"), 'toggle'), stryMutAct_9fa48("1710") ? "" : (stryCov_9fa48("1710"), 'checkbox'), stryMutAct_9fa48("1711") ? "" : (stryCov_9fa48("1711"), 'badge'), stryMutAct_9fa48("1712") ? "" : (stryCov_9fa48("1712"), 'alert'), stryMutAct_9fa48("1713") ? "" : (stryCov_9fa48("1713"), 'loading'), stryMutAct_9fa48("1714") ? "" : (stryCov_9fa48("1714"), 'filter'), stryMutAct_9fa48("1715") ? "" : (stryCov_9fa48("1715"), 'stack'), stryMutAct_9fa48("1716") ? "" : (stryCov_9fa48("1716"), 'mockup'), stryMutAct_9fa48("1717") ? "" : (stryCov_9fa48("1717"), 'theme-controller'), stryMutAct_9fa48("1718") ? "" : (stryCov_9fa48("1718"), 'validator'), stryMutAct_9fa48("1719") ? "" : (stryCov_9fa48("1719"), 'list-row'), stryMutAct_9fa48("1720") ? "" : (stryCov_9fa48("1720"), 'list-col'), stryMutAct_9fa48("1721") ? "" : (stryCov_9fa48("1721"), 'list-col-wrap'), stryMutAct_9fa48("1722") ? "" : (stryCov_9fa48("1722"), 'list-col-grow'), stryMutAct_9fa48("1723") ? "" : (stryCov_9fa48("1723"), 'fieldset-legend'), stryMutAct_9fa48("1724") ? "" : (stryCov_9fa48("1724"), 'validator-hint'), stryMutAct_9fa48("1725") ? "" : (stryCov_9fa48("1725"), 'filter-reset'), stryMutAct_9fa48("1726") ? "" : (stryCov_9fa48("1726"), 'card-border'), stryMutAct_9fa48("1727") ? "" : (stryCov_9fa48("1727"), 'menu-active'), stryMutAct_9fa48("1728") ? "" : (stryCov_9fa48("1728"), 'menu-disabled'), stryMutAct_9fa48("1729") ? "" : (stryCov_9fa48("1729"), 'menu-focus'), stryMutAct_9fa48("1730") ? "" : (stryCov_9fa48("1730"), 'tabs-border'), stryMutAct_9fa48("1731") ? "" : (stryCov_9fa48("1731"), 'tabs-lift'), stryMutAct_9fa48("1732") ? "" : (stryCov_9fa48("1732"), 'tabs-box'), stryMutAct_9fa48("1733") ? "" : (stryCov_9fa48("1733"), 'card-sm'), stryMutAct_9fa48("1734") ? "" : (stryCov_9fa48("1734"), 'dock-active'), stryMutAct_9fa48("1735") ? "" : (stryCov_9fa48("1735"), 'mockup-phone-camera'), stryMutAct_9fa48("1736") ? "" : (stryCov_9fa48("1736"), 'mockup-phone-display'), stryMutAct_9fa48("1737") ? "" : (stryCov_9fa48("1737"), 'divider'), // The spellings daisyUI 5 renamed away from. A page still writing one is a
// page on the retired framework's previous major, which is as much a second
// vocabulary as its current one — and the rename means the current-name
// rules above never see it.
stryMutAct_9fa48("1738") ? "" : (stryCov_9fa48("1738"), 'artboard'), stryMutAct_9fa48("1739") ? "" : (stryCov_9fa48("1739"), 'btm-nav'), stryMutAct_9fa48("1740") ? "" : (stryCov_9fa48("1740"), 'btm-nav-label'), stryMutAct_9fa48("1741") ? "" : (stryCov_9fa48("1741"), 'input-group'), stryMutAct_9fa48("1742") ? "" : (stryCov_9fa48("1742"), 'tabs-bordered'), stryMutAct_9fa48("1743") ? "" : (stryCov_9fa48("1743"), 'tabs-lifted'), stryMutAct_9fa48("1744") ? "" : (stryCov_9fa48("1744"), 'tabs-boxed'), stryMutAct_9fa48("1745") ? "" : (stryCov_9fa48("1745"), 'btn-group'), stryMutAct_9fa48("1746") ? "" : (stryCov_9fa48("1746"), 'form-control'), stryMutAct_9fa48("1747") ? "" : (stryCov_9fa48("1747"), 'form-group'), stryMutAct_9fa48("1748") ? "" : (stryCov_9fa48("1748"), 'container-fluid'), stryMutAct_9fa48("1749") ? "" : (stryCov_9fa48("1749"), 'navbar-toggler'), stryMutAct_9fa48("1750") ? "" : (stryCov_9fa48("1750"), 'sr-only')]));

/**
 * Prefixes that only a retired framework assigns. Product classes that share a
 * stem (`menu-item`, `modal-dialog`, `drawer-toggle`, `button-primary`,
 * `card`) are not in this list.
 */
const RETIRED_PREFIXES = stryMutAct_9fa48("1751") ? [] : (stryCov_9fa48("1751"), [stryMutAct_9fa48("1752") ? "" : (stryCov_9fa48("1752"), 'btn-'), stryMutAct_9fa48("1753") ? "" : (stryCov_9fa48("1753"), 'navbar-'), stryMutAct_9fa48("1754") ? "" : (stryCov_9fa48("1754"), 'dropdown-'), stryMutAct_9fa48("1755") ? "" : (stryCov_9fa48("1755"), 'swap-'), stryMutAct_9fa48("1756") ? "" : (stryCov_9fa48("1756"), 'join-'), stryMutAct_9fa48("1757") ? "" : (stryCov_9fa48("1757"), 'tab-'), stryMutAct_9fa48("1758") ? "" : (stryCov_9fa48("1758"), 'tabs-'), stryMutAct_9fa48("1759") ? "" : (stryCov_9fa48("1759"), 'toast-'), stryMutAct_9fa48("1760") ? "" : (stryCov_9fa48("1760"), 'tooltip-'), stryMutAct_9fa48("1761") ? "" : (stryCov_9fa48("1761"), 'skeleton-'), stryMutAct_9fa48("1762") ? "" : (stryCov_9fa48("1762"), 'avatar-'), stryMutAct_9fa48("1763") ? "" : (stryCov_9fa48("1763"), 'hero-'), stryMutAct_9fa48("1764") ? "" : (stryCov_9fa48("1764"), 'dock-'), stryMutAct_9fa48("1765") ? "" : (stryCov_9fa48("1765"), 'kbd-'), stryMutAct_9fa48("1766") ? "" : (stryCov_9fa48("1766"), 'badge-'), stryMutAct_9fa48("1767") ? "" : (stryCov_9fa48("1767"), 'alert-'), stryMutAct_9fa48("1768") ? "" : (stryCov_9fa48("1768"), 'loading-'), stryMutAct_9fa48("1769") ? "" : (stryCov_9fa48("1769"), 'mockup-'), stryMutAct_9fa48("1770") ? "" : (stryCov_9fa48("1770"), 'theme-'), stryMutAct_9fa48("1771") ? "" : (stryCov_9fa48("1771"), 'card-body'), stryMutAct_9fa48("1772") ? "" : (stryCov_9fa48("1772"), 'card-title'), stryMutAct_9fa48("1773") ? "" : (stryCov_9fa48("1773"), 'card-actions'), stryMutAct_9fa48("1774") ? "" : (stryCov_9fa48("1774"), 'card-compact'), stryMutAct_9fa48("1775") ? "" : (stryCov_9fa48("1775"), 'modal-box'), stryMutAct_9fa48("1776") ? "" : (stryCov_9fa48("1776"), 'modal-backdrop'), stryMutAct_9fa48("1777") ? "" : (stryCov_9fa48("1777"), 'drawer-side'), stryMutAct_9fa48("1778") ? "" : (stryCov_9fa48("1778"), 'drawer-overlay'), stryMutAct_9fa48("1779") ? "" : (stryCov_9fa48("1779"), 'drawer-content'), stryMutAct_9fa48("1780") ? "" : (stryCov_9fa48("1780"), 'menu-title'), stryMutAct_9fa48("1781") ? "" : (stryCov_9fa48("1781"), 'menu-dropdown'), stryMutAct_9fa48("1782") ? "" : (stryCov_9fa48("1782"), 'daisy-'), stryMutAct_9fa48("1783") ? "" : (stryCov_9fa48("1783"), 'bg-primary'), stryMutAct_9fa48("1784") ? "" : (stryCov_9fa48("1784"), 'bg-secondary'), stryMutAct_9fa48("1785") ? "" : (stryCov_9fa48("1785"), 'bg-accent'), stryMutAct_9fa48("1786") ? "" : (stryCov_9fa48("1786"), 'bg-neutral'), stryMutAct_9fa48("1787") ? "" : (stryCov_9fa48("1787"), 'bg-base-'), stryMutAct_9fa48("1788") ? "" : (stryCov_9fa48("1788"), 'text-primary'), stryMutAct_9fa48("1789") ? "" : (stryCov_9fa48("1789"), 'text-secondary'), stryMutAct_9fa48("1790") ? "" : (stryCov_9fa48("1790"), 'text-accent'), stryMutAct_9fa48("1791") ? "" : (stryCov_9fa48("1791"), 'text-neutral'), stryMutAct_9fa48("1792") ? "" : (stryCov_9fa48("1792"), 'text-base-'), stryMutAct_9fa48("1793") ? "" : (stryCov_9fa48("1793"), 'border-base-'), stryMutAct_9fa48("1794") ? "" : (stryCov_9fa48("1794"), 'border-primary'), stryMutAct_9fa48("1795") ? "" : (stryCov_9fa48("1795"), 'col-xs-'), stryMutAct_9fa48("1796") ? "" : (stryCov_9fa48("1796"), 'col-sm-'), stryMutAct_9fa48("1797") ? "" : (stryCov_9fa48("1797"), 'col-md-'), stryMutAct_9fa48("1798") ? "" : (stryCov_9fa48("1798"), 'col-lg-'), stryMutAct_9fa48("1799") ? "" : (stryCov_9fa48("1799"), 'col-xl-'), stryMutAct_9fa48("1800") ? "" : (stryCov_9fa48("1800"), 'col-xxl-'), stryMutAct_9fa48("1801") ? "" : (stryCov_9fa48("1801"), 'input-'), stryMutAct_9fa48("1802") ? "" : (stryCov_9fa48("1802"), 'status-'), stryMutAct_9fa48("1803") ? "" : (stryCov_9fa48("1803"), 'mask-'), stryMutAct_9fa48("1804") ? "" : (stryCov_9fa48("1804"), 'bg-linear-'), stryMutAct_9fa48("1805") ? "" : (stryCov_9fa48("1805"), 'bg-radial-'), stryMutAct_9fa48("1806") ? "" : (stryCov_9fa48("1806"), 'bg-conic-'), stryMutAct_9fa48("1807") ? "" : (stryCov_9fa48("1807"), 'field-sizing-'), stryMutAct_9fa48("1808") ? "" : (stryCov_9fa48("1808"), 'scrollbar-'), stryMutAct_9fa48("1809") ? "" : (stryCov_9fa48("1809"), 'text-shadow-'), stryMutAct_9fa48("1810") ? "" : (stryCov_9fa48("1810"), 'inset-shadow-'), stryMutAct_9fa48("1811") ? "" : (stryCov_9fa48("1811"), 'ring-offset-'), stryMutAct_9fa48("1812") ? "" : (stryCov_9fa48("1812"), 'offset-'), // Renamed away from in daisyUI 5, so the current-name prefixes miss them.
stryMutAct_9fa48("1813") ? "" : (stryCov_9fa48("1813"), 'btm-nav-'), stryMutAct_9fa48("1814") ? "" : (stryCov_9fa48("1814"), 'artboard-'), stryMutAct_9fa48("1815") ? "" : (stryCov_9fa48("1815"), 'phone-'), stryMutAct_9fa48("1816") ? "" : (stryCov_9fa48("1816"), 'd-flex'), stryMutAct_9fa48("1817") ? "" : (stryCov_9fa48("1817"), 'd-none'), stryMutAct_9fa48("1818") ? "" : (stryCov_9fa48("1818"), 'd-block'), stryMutAct_9fa48("1819") ? "" : (stryCov_9fa48("1819"), 'd-inline'), stryMutAct_9fa48("1820") ? "" : (stryCov_9fa48("1820"), 'd-grid')]);

/**
 * A Tailwind numeric or keyword utility: `p-4`, `w-full`, `text-sm`, `gap-2`.
 *
 * The scale lives in tokens.css. A class that encodes a spacing or type
 * decision is a second scale no gate reads.
 */
const TAILWIND_UTILITY = (stryMutAct_9fa48("1821") ? "" : (stryCov_9fa48("1821"), '-?(?:p|m|px|py|pt|pr|pb|pl|mx|my|mt|mr|mb|ml|gap|inset|top|right|bottom|left|z|w|h|min-w|min-h|max-w|max-h|text|leading|tracking|rounded|shadow|opacity|basis|grow|shrink|order|col-span|row-span|grid-cols|grid-rows|space-x|space-y|translate-x|translate-y|scale|rotate|inset-x|inset-y|indent|scroll-m|scroll-p')) + (// Families Tailwind 4 added or renamed into. Written against v3 alone, the
// list read `bg-gradient-to-r` and let `bg-linear-to-r` — the same utility
// under its current name — through untouched.
stryMutAct_9fa48("1822") ? "" : (stryCov_9fa48("1822"), '|outline|ring|ring-offset|size|mask|bg-linear|bg-radial|bg-conic|text-shadow|inset-shadow|field-sizing|scrollbar|zoom')) + (// The logical-property families, which are how a spacing decision is written
// for a document whose direction can reverse. Written against the physical
// families alone, the list read `ml-4` and let `ms-4` — the same decision,
// spelt the way the current major recommends — through untouched.
stryMutAct_9fa48("1823") ? "" : (stryCov_9fa48("1823"), '|ms|me|ps|pe|start|end|tab')) + (stryMutAct_9fa48("1824") ? "" : (stryCov_9fa48("1824"), ')-'));
const TAILWIND_NAMED = stryMutAct_9fa48("1826") ? /^(?:flex-col|flex-row|flex-wrap|flex-nowrap|items-center|items-start|items-end|items-stretch|justify-between|justify-center|justify-start|justify-end|justify-around|justify-evenly|place-items-center|grid-flow-col|grid-flow-row|sr-only|not-sr-only|container|prose|outline-hidden|outline-none|bg-radial|bg-conic|border-s|border-e|scheme-light|scheme-dark|scheme-normal|scheme-only-light|scheme-only-dark)/u : stryMutAct_9fa48("1825") ? /(?:flex-col|flex-row|flex-wrap|flex-nowrap|items-center|items-start|items-end|items-stretch|justify-between|justify-center|justify-start|justify-end|justify-around|justify-evenly|place-items-center|grid-flow-col|grid-flow-row|sr-only|not-sr-only|container|prose|outline-hidden|outline-none|bg-radial|bg-conic|border-s|border-e|scheme-light|scheme-dark|scheme-normal|scheme-only-light|scheme-only-dark)$/u : (stryCov_9fa48("1825", "1826"), /^(?:flex-col|flex-row|flex-wrap|flex-nowrap|items-center|items-start|items-end|items-stretch|justify-between|justify-center|justify-start|justify-end|justify-around|justify-evenly|place-items-center|grid-flow-col|grid-flow-row|sr-only|not-sr-only|container|prose|outline-hidden|outline-none|bg-radial|bg-conic|border-s|border-e|scheme-light|scheme-dark|scheme-normal|scheme-only-light|scheme-only-dark)$/u);
const TAILWIND_SCALE = stryMutAct_9fa48("1827") ? "" : (stryCov_9fa48("1827"), '(?:\\d+|px|auto|full|screen|fit|min|max|svh|lvh|dvh|svw|lvw|dvw|xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|none|tight|snug|normal|relaxed|loose)');
const TAILWIND_UTILITY_RE = new RegExp(stryMutAct_9fa48("1828") ? `` : (stryCov_9fa48("1828"), `^(?:${TAILWIND_UTILITY})${TAILWIND_SCALE}$`), stryMutAct_9fa48("1829") ? "" : (stryCov_9fa48("1829"), 'u'));

/**
 * The utility a class token names, after Tailwind/daisyUI variants are peeled.
 * @param token - one class attribute token.
 * @returns the trailing utility (`md:hover:p-4` → `p-4`).
 */
function utilityOf(token: string): string {
  if (stryMutAct_9fa48("1830")) {
    {}
  } else {
    stryCov_9fa48("1830");
    // Tailwind 3 wrote important as a prefix and Tailwind 4 writes it as a
    // suffix. Peeling only the prefix meant `p-4!` — the current spelling of a
    // token the gate already refuses as `p-4` — was not recognised at all.
    const leading = (stryMutAct_9fa48("1831") ? token.endsWith('!') : (stryCov_9fa48("1831"), token.startsWith(stryMutAct_9fa48("1832") ? "" : (stryCov_9fa48("1832"), '!')))) ? stryMutAct_9fa48("1833") ? token : (stryCov_9fa48("1833"), token.slice(1)) : token;
    const important = (stryMutAct_9fa48("1834") ? leading.startsWith('!') : (stryCov_9fa48("1834"), leading.endsWith(stryMutAct_9fa48("1835") ? "" : (stryCov_9fa48("1835"), '!')))) ? stryMutAct_9fa48("1836") ? leading : (stryCov_9fa48("1836"), leading.slice(0, stryMutAct_9fa48("1837") ? +1 : (stryCov_9fa48("1837"), -1))) : leading;
    const parts = important.split(stryMutAct_9fa48("1838") ? "" : (stryCov_9fa48("1838"), ':'));
    return stryMutAct_9fa48("1839") ? parts.at(-1) && important : (stryCov_9fa48("1839"), parts.at(stryMutAct_9fa48("1840") ? +1 : (stryCov_9fa48("1840"), -1)) ?? important);
  }
}

/**
 * Whether one class token belongs to a retired framework.
 * @param token - one class attribute token.
 * @returns true when the token is a retired framework's vocabulary.
 */
export function isRetiredClassToken(token: string): boolean {
  if (stryMutAct_9fa48("1841")) {
    {}
  } else {
    stryCov_9fa48("1841");
    if (stryMutAct_9fa48("1844") ? token !== '' : stryMutAct_9fa48("1843") ? false : stryMutAct_9fa48("1842") ? true : (stryCov_9fa48("1842", "1843", "1844"), token === (stryMutAct_9fa48("1845") ? "Stryker was here!" : (stryCov_9fa48("1845"), '')))) return stryMutAct_9fa48("1846") ? true : (stryCov_9fa48("1846"), false);
    const utility = utilityOf(token);
    if (stryMutAct_9fa48("1849") ? RETIRED_EXACT.has(utility) && RETIRED_EXACT.has(token) : stryMutAct_9fa48("1848") ? false : stryMutAct_9fa48("1847") ? true : (stryCov_9fa48("1847", "1848", "1849"), RETIRED_EXACT.has(utility) || RETIRED_EXACT.has(token))) return stryMutAct_9fa48("1850") ? false : (stryCov_9fa48("1850"), true);
    if (stryMutAct_9fa48("1853") ? TAILWIND_NAMED.test(utility) && TAILWIND_UTILITY_RE.test(utility) : stryMutAct_9fa48("1852") ? false : stryMutAct_9fa48("1851") ? true : (stryCov_9fa48("1851", "1852", "1853"), TAILWIND_NAMED.test(utility) || TAILWIND_UTILITY_RE.test(utility))) return stryMutAct_9fa48("1854") ? false : (stryCov_9fa48("1854"), true);
    return stryMutAct_9fa48("1855") ? RETIRED_PREFIXES.every(prefix => utility.startsWith(prefix) || token.startsWith(prefix)) : (stryCov_9fa48("1855"), RETIRED_PREFIXES.some(stryMutAct_9fa48("1856") ? () => undefined : (stryCov_9fa48("1856"), prefix => stryMutAct_9fa48("1859") ? utility.startsWith(prefix) && token.startsWith(prefix) : stryMutAct_9fa48("1858") ? false : stryMutAct_9fa48("1857") ? true : (stryCov_9fa48("1857", "1858", "1859"), (stryMutAct_9fa48("1860") ? utility.endsWith(prefix) : (stryCov_9fa48("1860"), utility.startsWith(prefix))) || (stryMutAct_9fa48("1861") ? token.endsWith(prefix) : (stryCov_9fa48("1861"), token.startsWith(prefix)))))));
  }
}

/**
 * Every retired-framework class a class attribute carries.
 * @param value - the class attribute value.
 * @returns the tokens that belong to a retired framework.
 */
export function retiredClassTokens(value: string): string[] {
  if (stryMutAct_9fa48("1862")) {
    {}
  } else {
    stryCov_9fa48("1862");
    return stryMutAct_9fa48("1863") ? value.split(/\s+/u) : (stryCov_9fa48("1863"), value.split(stryMutAct_9fa48("1865") ? /\S+/u : stryMutAct_9fa48("1864") ? /\s/u : (stryCov_9fa48("1864", "1865"), /\s+/u)).filter(stryMutAct_9fa48("1866") ? () => undefined : (stryCov_9fa48("1866"), token => isRetiredClassToken(token))));
  }
}