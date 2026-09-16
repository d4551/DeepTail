/**
 * The per-attribute refusals a markup gate makes: wiring, raw values, layout,
 * framework directives and remote loads.
 *
 * Split from `markup-gate.ts` the day that module outgrew the size its own
 * rules allow a file to reach. The two halves share one vocabulary of offences,
 * and every rule here is stated about attributes, so nothing written here can
 * see past the parser the caller walks.
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
import { retiredClassTokens } from './markup-vocabulary.ts';

/**
 * The attributes an element fetches a resource from.
 *
 * A URL in one of these loads an asset — a script, a sheet, an image, a frame —
 * and a remote one is a dependency no manifest declares and no lock resolves:
 * it loads over the network on a page this product ships, unversioned and
 * unaudited. Every asset belongs to the bundle, so a remote load is refused
 * and a local one (a root-relative path) is what remains.
 */
const RESOURCE_URLS = new Map<string, readonly string[]>(stryMutAct_9fa48("1712") ? [] : (stryCov_9fa48("1712"), [stryMutAct_9fa48("1713") ? [] : (stryCov_9fa48("1713"), [stryMutAct_9fa48("1714") ? "" : (stryCov_9fa48("1714"), 'script'), stryMutAct_9fa48("1715") ? [] : (stryCov_9fa48("1715"), [stryMutAct_9fa48("1716") ? "" : (stryCov_9fa48("1716"), 'src')])]), stryMutAct_9fa48("1717") ? [] : (stryCov_9fa48("1717"), [stryMutAct_9fa48("1718") ? "" : (stryCov_9fa48("1718"), 'link'), stryMutAct_9fa48("1719") ? [] : (stryCov_9fa48("1719"), [stryMutAct_9fa48("1720") ? "" : (stryCov_9fa48("1720"), 'href')])]), stryMutAct_9fa48("1721") ? [] : (stryCov_9fa48("1721"), [stryMutAct_9fa48("1722") ? "" : (stryCov_9fa48("1722"), 'img'), stryMutAct_9fa48("1723") ? [] : (stryCov_9fa48("1723"), [stryMutAct_9fa48("1724") ? "" : (stryCov_9fa48("1724"), 'src'), stryMutAct_9fa48("1725") ? "" : (stryCov_9fa48("1725"), 'srcset')])]), stryMutAct_9fa48("1726") ? [] : (stryCov_9fa48("1726"), [stryMutAct_9fa48("1727") ? "" : (stryCov_9fa48("1727"), 'video'), stryMutAct_9fa48("1728") ? [] : (stryCov_9fa48("1728"), [stryMutAct_9fa48("1729") ? "" : (stryCov_9fa48("1729"), 'src'), stryMutAct_9fa48("1730") ? "" : (stryCov_9fa48("1730"), 'poster')])]), stryMutAct_9fa48("1731") ? [] : (stryCov_9fa48("1731"), [stryMutAct_9fa48("1732") ? "" : (stryCov_9fa48("1732"), 'audio'), stryMutAct_9fa48("1733") ? [] : (stryCov_9fa48("1733"), [stryMutAct_9fa48("1734") ? "" : (stryCov_9fa48("1734"), 'src')])]), stryMutAct_9fa48("1735") ? [] : (stryCov_9fa48("1735"), [stryMutAct_9fa48("1736") ? "" : (stryCov_9fa48("1736"), 'source'), stryMutAct_9fa48("1737") ? [] : (stryCov_9fa48("1737"), [stryMutAct_9fa48("1738") ? "" : (stryCov_9fa48("1738"), 'src'), stryMutAct_9fa48("1739") ? "" : (stryCov_9fa48("1739"), 'srcset')])]), stryMutAct_9fa48("1740") ? [] : (stryCov_9fa48("1740"), [stryMutAct_9fa48("1741") ? "" : (stryCov_9fa48("1741"), 'iframe'), stryMutAct_9fa48("1742") ? [] : (stryCov_9fa48("1742"), [stryMutAct_9fa48("1743") ? "" : (stryCov_9fa48("1743"), 'src')])]), stryMutAct_9fa48("1744") ? [] : (stryCov_9fa48("1744"), [stryMutAct_9fa48("1745") ? "" : (stryCov_9fa48("1745"), 'embed'), stryMutAct_9fa48("1746") ? [] : (stryCov_9fa48("1746"), [stryMutAct_9fa48("1747") ? "" : (stryCov_9fa48("1747"), 'src')])]), stryMutAct_9fa48("1748") ? [] : (stryCov_9fa48("1748"), [stryMutAct_9fa48("1749") ? "" : (stryCov_9fa48("1749"), 'object'), stryMutAct_9fa48("1750") ? [] : (stryCov_9fa48("1750"), [stryMutAct_9fa48("1751") ? "" : (stryCov_9fa48("1751"), 'data')])]), stryMutAct_9fa48("1752") ? [] : (stryCov_9fa48("1752"), [stryMutAct_9fa48("1753") ? "" : (stryCov_9fa48("1753"), 'track'), stryMutAct_9fa48("1754") ? [] : (stryCov_9fa48("1754"), [stryMutAct_9fa48("1755") ? "" : (stryCov_9fa48("1755"), 'src')])]), stryMutAct_9fa48("1756") ? [] : (stryCov_9fa48("1756"), [stryMutAct_9fa48("1757") ? "" : (stryCov_9fa48("1757"), 'input'), stryMutAct_9fa48("1758") ? [] : (stryCov_9fa48("1758"), [stryMutAct_9fa48("1759") ? "" : (stryCov_9fa48("1759"), 'src')])]), // A remote base re-roots every relative load in the document to that host,
// which is every resource URL above with the scheme borrowed.
stryMutAct_9fa48("1760") ? [] : (stryCov_9fa48("1760"), [stryMutAct_9fa48("1761") ? "" : (stryCov_9fa48("1761"), 'base'), stryMutAct_9fa48("1762") ? [] : (stryCov_9fa48("1762"), [stryMutAct_9fa48("1763") ? "" : (stryCov_9fa48("1763"), 'href')])])]));

/** A URL that loads from outside the shipped bundle, absolute or protocol-relative. */
export const REMOTE_URL = stryMutAct_9fa48("1766") ? /^(?:https:)?\/\//iu : stryMutAct_9fa48("1765") ? /^(?:https?:)\/\//iu : stryMutAct_9fa48("1764") ? /(?:https?:)?\/\//iu : (stryCov_9fa48("1764", "1765", "1766"), /^(?:https?:)?\/\//iu);

/**
 * An htmx wiring attribute, including HTMX 4's `:inherited` / `hx-status`
 * spellings, the `data-hx-` equivalent the docs still accept, the boolean `hx`
 * flag on a `<template>`, and the internal `htmx-partial` attribute the
 * custom element compiles to.
 *
 * An `hx-` prefix is not the whole surface. HTMX 4's documented fallback for
 * template languages that strip unknown tags is `<template hx type="partial">`
 * — a boolean `hx` with no hyphen — and the runtime's internal form is
 * `<template htmx-partial>`. A pattern that required `hx-` read both as
 * ordinary markup and said nothing.
 *
 * An `hx` attribute moves an element's behaviour into the tag: a listener, a
 * fetch and a swap all decided where the markup is written. This product wires
 * interactivity in modules, so no wiring attribute may ship.
 */
const HTMX_ATTRIBUTE = stryMutAct_9fa48("1771") ? /^(?:(?:data-)?hx(?:-.)?|htmx-partial)$/iu : stryMutAct_9fa48("1770") ? /^(?:(?:data-)?hx(?:-.*)|htmx-partial)$/iu : stryMutAct_9fa48("1769") ? /^(?:(?:data-)hx(?:-.*)?|htmx-partial)$/iu : stryMutAct_9fa48("1768") ? /^(?:(?:data-)?hx(?:-.*)?|htmx-partial)/iu : stryMutAct_9fa48("1767") ? /(?:(?:data-)?hx(?:-.*)?|htmx-partial)$/iu : (stryCov_9fa48("1767", "1768", "1769", "1770", "1771"), /^(?:(?:data-)?hx(?:-.*)?|htmx-partial)$/iu);

/**
 * A Tailwind arbitrary-value utility in a class list.
 *
 * A token whose bracketed payload follows a hyphen — a width, a colour, a font
 * size spelled inline — is syntax only a utility pipeline reads. No stylesheet
 * this repository ships selects such a token, so it names a spacing or colour
 * decision the design system never sees: the scale and the palette live in
 * tokens.css.
 */
// Tailwind 3 wrote an arbitrary value in square brackets and Tailwind 4 writes
// a custom property in parentheses — `bg-[--brand]` became `bg-(--brand)`. A
// pattern that knew only the bracket form read the current spelling as an
// ordinary class name.
const ARBITRARY_UTILITY = stryMutAct_9fa48("1778") ? /-[^\s"']*(?:\[[^\]]+\]|\((?:--)[)]+\))/u : stryMutAct_9fa48("1777") ? /-[^\s"']*(?:\[[^\]]+\]|\((?:--)[^)]\))/u : stryMutAct_9fa48("1776") ? /-[^\s"']*(?:\[[\]]+\]|\((?:--)[^)]+\))/u : stryMutAct_9fa48("1775") ? /-[^\s"']*(?:\[[^\]]\]|\((?:--)[^)]+\))/u : stryMutAct_9fa48("1774") ? /-[^\S"']*(?:\[[^\]]+\]|\((?:--)[^)]+\))/u : stryMutAct_9fa48("1773") ? /-[\s"']*(?:\[[^\]]+\]|\((?:--)[^)]+\))/u : stryMutAct_9fa48("1772") ? /-[^\s"'](?:\[[^\]]+\]|\((?:--)[^)]+\))/u : (stryCov_9fa48("1772", "1773", "1774", "1775", "1776", "1777", "1778"), /-[^\s"']*(?:\[[^\]]+\]|\((?:--)[^)]+\))/u);

/**
 * Attributes that move a box or its content from the tag.
 *
 * `align`, `valign` and their spacing kin are layout written where markup
 * goes, so the alignment never reaches the sheet the grid rules read.
 */
const ALIGNMENT_ATTRIBUTES = new Set(stryMutAct_9fa48("1779") ? [] : (stryCov_9fa48("1779"), [stryMutAct_9fa48("1780") ? "" : (stryCov_9fa48("1780"), 'align'), stryMutAct_9fa48("1781") ? "" : (stryCov_9fa48("1781"), 'valign'), stryMutAct_9fa48("1782") ? "" : (stryCov_9fa48("1782"), 'hspace'), stryMutAct_9fa48("1783") ? "" : (stryCov_9fa48("1783"), 'vspace'), stryMutAct_9fa48("1784") ? "" : (stryCov_9fa48("1784"), 'cellpadding'), stryMutAct_9fa48("1785") ? "" : (stryCov_9fa48("1785"), 'cellspacing')]));

/**
 * Attributes that decide size or type in the tag.
 *
 * `width` and `height` stay allowed on `img`, where they are the aspect-ratio
 * hint that stops a layout shift before the sheet applies — on every other
 * element they are sizing decided in markup. The colour and border attributes
 * are palette decisions in the tag; `size`, `face`, `clear`, `nowrap` and the
 * table chrome are type and layout that belong to a class.
 */
const PRESENTATIONAL_ATTRIBUTES = new Set(stryMutAct_9fa48("1786") ? [] : (stryCov_9fa48("1786"), [stryMutAct_9fa48("1787") ? "" : (stryCov_9fa48("1787"), 'width'), stryMutAct_9fa48("1788") ? "" : (stryCov_9fa48("1788"), 'height'), stryMutAct_9fa48("1789") ? "" : (stryCov_9fa48("1789"), 'border'), stryMutAct_9fa48("1790") ? "" : (stryCov_9fa48("1790"), 'bgcolor'), stryMutAct_9fa48("1791") ? "" : (stryCov_9fa48("1791"), 'background'), stryMutAct_9fa48("1792") ? "" : (stryCov_9fa48("1792"), 'color'), stryMutAct_9fa48("1793") ? "" : (stryCov_9fa48("1793"), 'face'), stryMutAct_9fa48("1794") ? "" : (stryCov_9fa48("1794"), 'size'), stryMutAct_9fa48("1795") ? "" : (stryCov_9fa48("1795"), 'clear'), stryMutAct_9fa48("1796") ? "" : (stryCov_9fa48("1796"), 'nowrap'), stryMutAct_9fa48("1797") ? "" : (stryCov_9fa48("1797"), 'bordercolor'), stryMutAct_9fa48("1798") ? "" : (stryCov_9fa48("1798"), 'rules'), stryMutAct_9fa48("1799") ? "" : (stryCov_9fa48("1799"), 'frame')]));

/**
 * An attribute that is a framework's directive, the utilities this product
 * retired by name.
 *
 * `data-theme` is the daisyUI theme hook: the palette this product ships is
 * tokens.css, and a second theme switch on the tag is a second palette. The
 * `x-`, `@` and `:` prefixes are the Alpine and Vue directive shorthands, one
 * more way a listener or a binding can move into the tag where no module
 * ships it and no gate reads it.
 */
const DIRECTIVE_ATTRIBUTES: readonly {
  readonly pattern: RegExp;
  readonly why: string;
}[] = stryMutAct_9fa48("1800") ? [] : (stryCov_9fa48("1800"), [stryMutAct_9fa48("1801") ? {} : (stryCov_9fa48("1801"), {
  pattern: stryMutAct_9fa48("1803") ? /^data-theme/iu : stryMutAct_9fa48("1802") ? /data-theme$/iu : (stryCov_9fa48("1802", "1803"), /^data-theme$/iu),
  why: stryMutAct_9fa48("1804") ? "" : (stryCov_9fa48("1804"), 'data-theme is the daisyUI theme hook; the palette lives in tokens.css')
}), stryMutAct_9fa48("1805") ? {} : (stryCov_9fa48("1805"), {
  pattern: stryMutAct_9fa48("1806") ? /(?:x-|@|:)/u : (stryCov_9fa48("1806"), /^(?:x-|@|:)/u),
  why: stryMutAct_9fa48("1807") ? "" : (stryCov_9fa48("1807"), 'a directive attribute wires behaviour into the tag; attach the listener in a module')
}), stryMutAct_9fa48("1808") ? {} : (stryCov_9fa48("1808"), {
  pattern: stryMutAct_9fa48("1809") ? /v-/u : (stryCov_9fa48("1809"), /^v-/u),
  why: stryMutAct_9fa48("1810") ? "" : (stryCov_9fa48("1810"), 'a Vue directive wires behaviour into the tag; attach the listener in a module')
}), stryMutAct_9fa48("1811") ? {} : (stryCov_9fa48("1811"), {
  pattern: stryMutAct_9fa48("1812") ? /data-bs-/iu : (stryCov_9fa48("1812"), /^data-bs-/iu),
  why: stryMutAct_9fa48("1813") ? "" : (stryCov_9fa48("1813"), 'a Bootstrap data-bs attribute is a retired framework hook; attach the listener in a module')
})]);

/** One refusal, with its line. */
export interface MarkupOffence {
  readonly line: number;
  readonly why: string;
}

/**
 * Whether a URL attribute value loads from outside the shipped bundle.
 * @param value - the attribute's value.
 * @param candidates - true for a list attribute, where each entry is one URL.
 * @returns true when any URL is remote.
 */
function isRemoteLoad(value: string, candidates: boolean): boolean {
  if (stryMutAct_9fa48("1814")) {
    {}
  } else {
    stryCov_9fa48("1814");
    if (stryMutAct_9fa48("1817") ? false : stryMutAct_9fa48("1816") ? true : stryMutAct_9fa48("1815") ? candidates : (stryCov_9fa48("1815", "1816", "1817"), !candidates)) return REMOTE_URL.test(stryMutAct_9fa48("1818") ? value : (stryCov_9fa48("1818"), value.trim()));
    return stryMutAct_9fa48("1819") ? value.split(',').every(candidate => REMOTE_URL.test((candidate.trim().split(/\s+/u)[0] ?? '').trim())) : (stryCov_9fa48("1819"), value.split(stryMutAct_9fa48("1820") ? "" : (stryCov_9fa48("1820"), ',')).some(stryMutAct_9fa48("1821") ? () => undefined : (stryCov_9fa48("1821"), candidate => REMOTE_URL.test(stryMutAct_9fa48("1822") ? candidate.trim().split(/\s+/u)[0] ?? '' : (stryCov_9fa48("1822"), (stryMutAct_9fa48("1823") ? candidate.trim().split(/\s+/u)[0] && '' : (stryCov_9fa48("1823"), (stryMutAct_9fa48("1824") ? candidate.split(/\s+/u)[0] : (stryCov_9fa48("1824"), candidate.trim().split(stryMutAct_9fa48("1826") ? /\S+/u : stryMutAct_9fa48("1825") ? /\s/u : (stryCov_9fa48("1825", "1826"), /\s+/u))[0])) ?? (stryMutAct_9fa48("1827") ? "Stryker was here!" : (stryCov_9fa48("1827"), '')))).trim())))));
  }
}

/**
 * The per-attribute refusals a tag carries: wiring, raw values and layout.
 *
 * @param attrs - the element's attributes, as the parser read them.
 * @param tag - the element's name, lowercased when it has one.
 * @param line - the line the element starts on.
 * @param found - the refusal list to append to.
 */
export function recordAttributeOffences(attrs: readonly {
  readonly name: string;
  readonly value?: string;
}[], tag: string | undefined, line: number, found: MarkupOffence[]): void {
  if (stryMutAct_9fa48("1828")) {
    {}
  } else {
    stryCov_9fa48("1828");
    for (const attribute of attrs) {
      if (stryMutAct_9fa48("1829")) {
        {}
      } else {
        stryCov_9fa48("1829");
        const name = stryMutAct_9fa48("1830") ? attribute.name.toUpperCase() : (stryCov_9fa48("1830"), attribute.name.toLowerCase());
        if (stryMutAct_9fa48("1832") ? false : stryMutAct_9fa48("1831") ? true : (stryCov_9fa48("1831", "1832"), HTMX_ATTRIBUTE.test(attribute.name))) {
          if (stryMutAct_9fa48("1833")) {
            {}
          } else {
            stryCov_9fa48("1833");
            found.push(stryMutAct_9fa48("1835") ? {} : (stryCov_9fa48("1835"), {
              line,
              why: stryMutAct_9fa48("1836") ? "" : (stryCov_9fa48("1836"), 'an hx attribute wires behaviour into the tag; attach the listener in a module')
            }));
          }
        }
        for (const {
          pattern,
          why
        } of DIRECTIVE_ATTRIBUTES) {
          if (stryMutAct_9fa48("1837")) {
            {}
          } else {
            stryCov_9fa48("1837");
            if (stryMutAct_9fa48("1839") ? false : stryMutAct_9fa48("1838") ? true : (stryCov_9fa48("1838", "1839"), pattern.test(attribute.name))) found.push(stryMutAct_9fa48("1841") ? {} : (stryCov_9fa48("1841"), {
              line,
              why
            }));
          }
        }
        if (stryMutAct_9fa48("1844") ? name !== 'class' : stryMutAct_9fa48("1843") ? false : stryMutAct_9fa48("1842") ? true : (stryCov_9fa48("1842", "1843", "1844"), name === (stryMutAct_9fa48("1845") ? "" : (stryCov_9fa48("1845"), 'class')))) {
          if (stryMutAct_9fa48("1846")) {
            {}
          } else {
            stryCov_9fa48("1846");
            const value = stryMutAct_9fa48("1847") ? attribute.value && '' : (stryCov_9fa48("1847"), attribute.value ?? (stryMutAct_9fa48("1848") ? "Stryker was here!" : (stryCov_9fa48("1848"), '')));
            if (stryMutAct_9fa48("1850") ? false : stryMutAct_9fa48("1849") ? true : (stryCov_9fa48("1849", "1850"), ARBITRARY_UTILITY.test(value))) {
              if (stryMutAct_9fa48("1851")) {
                {}
              } else {
                stryCov_9fa48("1851");
                found.push(stryMutAct_9fa48("1853") ? {} : (stryCov_9fa48("1853"), {
                  line,
                  why: stryMutAct_9fa48("1854") ? "" : (stryCov_9fa48("1854"), 'a bracketed utility class carries a raw value; read the size or colour from tokens.css')
                }));
              }
            }
            for (const token of retiredClassTokens(value)) {
              if (stryMutAct_9fa48("1855")) {
                {}
              } else {
                stryCov_9fa48("1855");
                found.push(stryMutAct_9fa48("1857") ? {} : (stryCov_9fa48("1857"), {
                  line,
                  why: stryMutAct_9fa48("1858") ? `` : (stryCov_9fa48("1858"), `retired-class: "${token}" belongs to a UI framework this product retired`)
                }));
              }
            }
          }
        }
        if (stryMutAct_9fa48("1860") ? false : stryMutAct_9fa48("1859") ? true : (stryCov_9fa48("1859", "1860"), ALIGNMENT_ATTRIBUTES.has(name))) {
          if (stryMutAct_9fa48("1861")) {
            {}
          } else {
            stryCov_9fa48("1861");
            found.push(stryMutAct_9fa48("1863") ? {} : (stryCov_9fa48("1863"), {
              line,
              why: stryMutAct_9fa48("1864") ? "" : (stryCov_9fa48("1864"), 'an alignment attribute is layout in the tag; put the alignment in a stylesheet and add a class')
            }));
          }
        }
        if (stryMutAct_9fa48("1867") ? PRESENTATIONAL_ATTRIBUTES.has(name) || !(tag === 'img' && (name === 'width' || name === 'height')) : stryMutAct_9fa48("1866") ? false : stryMutAct_9fa48("1865") ? true : (stryCov_9fa48("1865", "1866", "1867"), PRESENTATIONAL_ATTRIBUTES.has(name) && (stryMutAct_9fa48("1868") ? tag === 'img' && (name === 'width' || name === 'height') : (stryCov_9fa48("1868"), !(stryMutAct_9fa48("1871") ? tag === 'img' || name === 'width' || name === 'height' : stryMutAct_9fa48("1870") ? false : stryMutAct_9fa48("1869") ? true : (stryCov_9fa48("1869", "1870", "1871"), (stryMutAct_9fa48("1873") ? tag !== 'img' : stryMutAct_9fa48("1872") ? true : (stryCov_9fa48("1872", "1873"), tag === (stryMutAct_9fa48("1874") ? "" : (stryCov_9fa48("1874"), 'img')))) && (stryMutAct_9fa48("1876") ? name === 'width' && name === 'height' : stryMutAct_9fa48("1875") ? true : (stryCov_9fa48("1875", "1876"), (stryMutAct_9fa48("1878") ? name !== 'width' : stryMutAct_9fa48("1877") ? false : (stryCov_9fa48("1877", "1878"), name === (stryMutAct_9fa48("1879") ? "" : (stryCov_9fa48("1879"), 'width')))) || (stryMutAct_9fa48("1881") ? name !== 'height' : stryMutAct_9fa48("1880") ? false : (stryCov_9fa48("1880", "1881"), name === (stryMutAct_9fa48("1882") ? "" : (stryCov_9fa48("1882"), 'height')))))))))))) {
          if (stryMutAct_9fa48("1883")) {
            {}
          } else {
            stryCov_9fa48("1883");
            found.push(stryMutAct_9fa48("1885") ? {} : (stryCov_9fa48("1885"), {
              line,
              why: stryMutAct_9fa48("1886") ? "" : (stryCov_9fa48("1886"), 'a presentational attribute decides size or type in the tag; put it in a stylesheet and add a class')
            }));
          }
        }
        const resource = RESOURCE_URLS.get(stryMutAct_9fa48("1887") ? tag && '' : (stryCov_9fa48("1887"), tag ?? (stryMutAct_9fa48("1888") ? "Stryker was here!" : (stryCov_9fa48("1888"), ''))));
        if (stryMutAct_9fa48("1891") ? resource?.includes(name) || isRemoteLoad(attribute.value ?? '', name === 'srcset') : stryMutAct_9fa48("1890") ? false : stryMutAct_9fa48("1889") ? true : (stryCov_9fa48("1889", "1890", "1891"), (stryMutAct_9fa48("1892") ? resource.includes(name) : (stryCov_9fa48("1892"), resource?.includes(name))) && isRemoteLoad(stryMutAct_9fa48("1893") ? attribute.value && '' : (stryCov_9fa48("1893"), attribute.value ?? (stryMutAct_9fa48("1894") ? "Stryker was here!" : (stryCov_9fa48("1894"), ''))), stryMutAct_9fa48("1897") ? name !== 'srcset' : stryMutAct_9fa48("1896") ? false : stryMutAct_9fa48("1895") ? true : (stryCov_9fa48("1895", "1896", "1897"), name === (stryMutAct_9fa48("1898") ? "" : (stryCov_9fa48("1898"), 'srcset')))))) {
          if (stryMutAct_9fa48("1899")) {
            {}
          } else {
            stryCov_9fa48("1899");
            found.push(stryMutAct_9fa48("1901") ? {} : (stryCov_9fa48("1901"), {
              line,
              why: stryMutAct_9fa48("1902") ? "" : (stryCov_9fa48("1902"), 'a remote resource URL loads an asset no local install ships; ship the asset in the bundle')
            }));
          }
        }
      }
    }
  }
}