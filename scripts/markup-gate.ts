/**
 * What markup is refused, read out by the parser a browser would use.
 *
 * parse5 implements the HTML parsing algorithm, so an attribute is found
 * wherever a browser would find one: in any case, quoted or not, inside a
 * template, and however the surrounding tags are malformed.
 *
 * Beyond the style attribute, what is refused is anything a page would have to
 * ship inline: an event handler, a script body, or a style block. Each of
 * those is a per-page one-off that no module ships and no gate reads once it
 * is inside a tag, so none may exist in the first place. The per-attribute
 * refusals — wiring, raw utility values, layout attributes, framework
 * directives and remote loads — live in `markup-attributes.ts`.
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
import { type DefaultTreeAdapterTypes, parse } from 'parse5';
import { type MarkupOffence, REMOTE_URL, recordAttributeOffences } from './markup-attributes.ts';
import type { Offence } from './offence.ts';

/** The attribute this gate exists to keep out of the product. */
const STYLE_ATTRIBUTE = stryMutAct_9fa48("1903") ? "" : (stryCov_9fa48("1903"), 'style');

/** An inline event handler attribute: a per-page script no module ships. */
const HANDLER = stryMutAct_9fa48("1907") ? /^on[^a-z]+$/iu : stryMutAct_9fa48("1906") ? /^on[a-z]$/iu : stryMutAct_9fa48("1905") ? /^on[a-z]+/iu : stryMutAct_9fa48("1904") ? /on[a-z]+$/iu : (stryCov_9fa48("1904", "1905", "1906", "1907"), /^on[a-z]+$/iu);

/**
 * A URL scheme that executes text as code.
 *
 * A `javascript:` URL is an inline script with nowhere to hang a handler ban,
 * so it slips past both the handler rule and the script-body rule while doing
 * exactly what they refuse. `vbscript:` is the same construct, and a
 * `data:text/html` document runs its payload in the page's origin.
 */
const SCRIPTED_URL = stryMutAct_9fa48("1908") ? /(?:javascript|vbscript):|data:text\/html/iu : (stryCov_9fa48("1908"), /^(?:javascript|vbscript):|data:text\/html/iu);

/** Attributes a browser navigates on, so a scripted URL in them runs. */
const URL_ATTRIBUTES = new Set(stryMutAct_9fa48("1909") ? [] : (stryCov_9fa48("1909"), [stryMutAct_9fa48("1910") ? "" : (stryCov_9fa48("1910"), 'href'), stryMutAct_9fa48("1911") ? "" : (stryCov_9fa48("1911"), 'src'), stryMutAct_9fa48("1912") ? "" : (stryCov_9fa48("1912"), 'action'), stryMutAct_9fa48("1913") ? "" : (stryCov_9fa48("1913"), 'formaction'), stryMutAct_9fa48("1914") ? "" : (stryCov_9fa48("1914"), 'xlink:href'), stryMutAct_9fa48("1915") ? "" : (stryCov_9fa48("1915"), 'poster'), stryMutAct_9fa48("1916") ? "" : (stryCov_9fa48("1916"), 'data'), stryMutAct_9fa48("1917") ? "" : (stryCov_9fa48("1917"), 'cite')]));

/**
 * Elements the platform retired because they decide alignment or type in the
 * tag itself.
 *
 * The centering element, the type element and the marquee are alignment,
 * type and motion a page ships inline; the sheet is where those decisions
 * live, and a tag that carries one arrives with no class for a gate to read.
 */
const PRESENTATIONAL_ELEMENTS = new Set(stryMutAct_9fa48("1918") ? [] : (stryCov_9fa48("1918"), [stryMutAct_9fa48("1919") ? "" : (stryCov_9fa48("1919"), 'center'), stryMutAct_9fa48("1920") ? "" : (stryCov_9fa48("1920"), 'font'), stryMutAct_9fa48("1921") ? "" : (stryCov_9fa48("1921"), 'marquee')]));

/** The one element a document may carry, whose duplication splits the shell a reader lands in. */
const LANDMARK = stryMutAct_9fa48("1922") ? "" : (stryCov_9fa48("1922"), 'main');

/**
 * Whether an attribute value navigates to a scripted URL.
 *
 * A browser strips ASCII control characters and leading whitespace before it
 * reads the scheme, so the gate reads the value the same way: a tab inside
 * `java\tscript:` is how the prefix is spelled to get past a plain test.
 * @param value - the attribute's value, entities already decoded by the parser.
 * @returns true when the scheme executes text as code.
 */
function isScriptedUrl(value: string): boolean {
  if (stryMutAct_9fa48("1923")) {
    {}
  } else {
    stryCov_9fa48("1923");
    // Every character a browser skips is at or below the space, and a filter
    // over code points reads the same set without spelling control characters
    // out — the way a regex would — to a reader or a rule about them.
    const stripped = stryMutAct_9fa48("1924") ? [...value].join('') : (stryCov_9fa48("1924"), (stryMutAct_9fa48("1925") ? [] : (stryCov_9fa48("1925"), [...value])).filter(stryMutAct_9fa48("1926") ? () => undefined : (stryCov_9fa48("1926"), char => stryMutAct_9fa48("1930") ? (char.codePointAt(0) ?? 0) <= 32 : stryMutAct_9fa48("1929") ? (char.codePointAt(0) ?? 0) >= 32 : stryMutAct_9fa48("1928") ? false : stryMutAct_9fa48("1927") ? true : (stryCov_9fa48("1927", "1928", "1929", "1930"), (stryMutAct_9fa48("1931") ? char.codePointAt(0) && 0 : (stryCov_9fa48("1931"), char.codePointAt(0) ?? 0)) > 32))).join(stryMutAct_9fa48("1932") ? "Stryker was here!" : (stryCov_9fa48("1932"), '')));
    return SCRIPTED_URL.test(stripped);
  }
}

/**
 * Whether a meta refresh redirects the page to a remote address.
 *
 * A refresh is navigation the page performs on its own, and a remote target is
 * a load outside the bundle that no manifest declares; a local one is an
 * internal redirect, which is what remains.
 * @param content - the meta content value.
 * @returns true when it redirects to a remote URL.
 */
function isRemoteRefresh(content: string): boolean {
  if (stryMutAct_9fa48("1933")) {
    {}
  } else {
    stryCov_9fa48("1933");
    const target = (stryMutAct_9fa48("1941") ? /url\s*=\s*["']?(["';]+)/iu : stryMutAct_9fa48("1940") ? /url\s*=\s*["']?([^"';])/iu : stryMutAct_9fa48("1939") ? /url\s*=\s*[^"']?([^"';]+)/iu : stryMutAct_9fa48("1938") ? /url\s*=\s*["']([^"';]+)/iu : stryMutAct_9fa48("1937") ? /url\s*=\S*["']?([^"';]+)/iu : stryMutAct_9fa48("1936") ? /url\s*=\s["']?([^"';]+)/iu : stryMutAct_9fa48("1935") ? /url\S*=\s*["']?([^"';]+)/iu : stryMutAct_9fa48("1934") ? /url\s=\s*["']?([^"';]+)/iu : (stryCov_9fa48("1934", "1935", "1936", "1937", "1938", "1939", "1940", "1941"), /url\s*=\s*["']?([^"';]+)/iu)).exec(content);
    return stryMutAct_9fa48("1944") ? target !== null || REMOTE_URL.test((target[1] ?? '').trim()) : stryMutAct_9fa48("1943") ? false : stryMutAct_9fa48("1942") ? true : (stryCov_9fa48("1942", "1943", "1944"), (stryMutAct_9fa48("1946") ? target === null : stryMutAct_9fa48("1945") ? true : (stryCov_9fa48("1945", "1946"), target !== null)) && REMOTE_URL.test(stryMutAct_9fa48("1947") ? target[1] ?? '' : (stryCov_9fa48("1947"), (stryMutAct_9fa48("1948") ? target[1] && '' : (stryCov_9fa48("1948"), target[1] ?? (stryMutAct_9fa48("1949") ? "Stryker was here!" : (stryCov_9fa48("1949"), '')))).trim())));
  }
}

/**
 * The offence a meta element carries, when it redirects the page to a remote
 * address.
 * @param attrs - the element's attributes.
 * @param line - the line the element starts on.
 * @returns the offence, or undefined when the meta is not a remote redirect.
 */
function metaRedirectOffence(attrs: readonly {
  readonly name: string;
  readonly value?: string;
}[], line: number): MarkupOffence | undefined {
  if (stryMutAct_9fa48("1950")) {
    {}
  } else {
    stryCov_9fa48("1950");
    const equiv = attrs.find(stryMutAct_9fa48("1951") ? () => undefined : (stryCov_9fa48("1951"), attribute => stryMutAct_9fa48("1954") ? attribute.name.toLowerCase() !== 'http-equiv' : stryMutAct_9fa48("1953") ? false : stryMutAct_9fa48("1952") ? true : (stryCov_9fa48("1952", "1953", "1954"), (stryMutAct_9fa48("1955") ? attribute.name.toUpperCase() : (stryCov_9fa48("1955"), attribute.name.toLowerCase())) === (stryMutAct_9fa48("1956") ? "" : (stryCov_9fa48("1956"), 'http-equiv')))));
    const content = attrs.find(stryMutAct_9fa48("1957") ? () => undefined : (stryCov_9fa48("1957"), attribute => stryMutAct_9fa48("1960") ? attribute.name.toLowerCase() !== 'content' : stryMutAct_9fa48("1959") ? false : stryMutAct_9fa48("1958") ? true : (stryCov_9fa48("1958", "1959", "1960"), (stryMutAct_9fa48("1961") ? attribute.name.toUpperCase() : (stryCov_9fa48("1961"), attribute.name.toLowerCase())) === (stryMutAct_9fa48("1962") ? "" : (stryCov_9fa48("1962"), 'content')))));
    if (stryMutAct_9fa48("1965") ? (equiv?.value ?? '').toLowerCase() !== 'refresh' && !isRemoteRefresh(content?.value ?? '') : stryMutAct_9fa48("1964") ? false : stryMutAct_9fa48("1963") ? true : (stryCov_9fa48("1963", "1964", "1965"), (stryMutAct_9fa48("1967") ? (equiv?.value ?? '').toLowerCase() === 'refresh' : stryMutAct_9fa48("1966") ? false : (stryCov_9fa48("1966", "1967"), (stryMutAct_9fa48("1968") ? (equiv?.value ?? '').toUpperCase() : (stryCov_9fa48("1968"), (stryMutAct_9fa48("1969") ? equiv?.value && '' : (stryCov_9fa48("1969"), (stryMutAct_9fa48("1970") ? equiv.value : (stryCov_9fa48("1970"), equiv?.value)) ?? (stryMutAct_9fa48("1971") ? "Stryker was here!" : (stryCov_9fa48("1971"), '')))).toLowerCase())) !== (stryMutAct_9fa48("1972") ? "" : (stryCov_9fa48("1972"), 'refresh')))) || (stryMutAct_9fa48("1973") ? isRemoteRefresh(content?.value ?? '') : (stryCov_9fa48("1973"), !isRemoteRefresh(stryMutAct_9fa48("1974") ? content?.value && '' : (stryCov_9fa48("1974"), (stryMutAct_9fa48("1975") ? content.value : (stryCov_9fa48("1975"), content?.value)) ?? (stryMutAct_9fa48("1976") ? "Stryker was here!" : (stryCov_9fa48("1976"), '')))))))) return undefined;
    return stryMutAct_9fa48("1977") ? {} : (stryCov_9fa48("1977"), {
      line,
      why: stryMutAct_9fa48("1978") ? "" : (stryCov_9fa48("1978"), 'a meta refresh to a remote address loads outside the bundle; redirect in a module instead')
    });
  }
}

/** A parse5 element, and the children every node may carry. */
type Parsed = DefaultTreeAdapterTypes.Node & {
  childNodes?: readonly DefaultTreeAdapterTypes.Node[];
  content?: DefaultTreeAdapterTypes.DocumentFragment;
  attrs?: readonly {
    readonly name: string;
    readonly value?: string;
  }[];
  tagName?: string;
  sourceCodeLocation?: {
    readonly startLine?: number;
  } | null;
};

/**
 * An htmx custom element. htmx 4 introduced tags of its own alongside its
 * attributes, and they carry the same behaviour-in-the-markup this refuses.
 */
const HTMX_ELEMENT = stryMutAct_9fa48("1979") ? /hx-/u : (stryCov_9fa48("1979"), /^hx-/u);

/**
 * What one element carries in its own tag: an inline style, an inline handler,
 * or a tag name a retired framework defines.
 * @param attrs - the element's attributes.
 * @param tag - the lowercased tag name, when the node has one.
 * @param line - the line the element opens on.
 * @param found - collects the offences.
 */
function recordElementOffences(attrs: readonly {
  readonly name: string;
  readonly value?: string;
}[], tag: string | undefined, line: number, found: {
  line: number;
  why: string;
}[]): void {
  if (stryMutAct_9fa48("1980")) {
    {}
  } else {
    stryCov_9fa48("1980");
    if (stryMutAct_9fa48("1983") ? attrs.every(attribute => attribute.name.toLowerCase() === STYLE_ATTRIBUTE) : stryMutAct_9fa48("1982") ? false : stryMutAct_9fa48("1981") ? true : (stryCov_9fa48("1981", "1982", "1983"), attrs.some(stryMutAct_9fa48("1984") ? () => undefined : (stryCov_9fa48("1984"), attribute => stryMutAct_9fa48("1987") ? attribute.name.toLowerCase() !== STYLE_ATTRIBUTE : stryMutAct_9fa48("1986") ? false : stryMutAct_9fa48("1985") ? true : (stryCov_9fa48("1985", "1986", "1987"), (stryMutAct_9fa48("1988") ? attribute.name.toUpperCase() : (stryCov_9fa48("1988"), attribute.name.toLowerCase())) === STYLE_ATTRIBUTE))))) {
      if (stryMutAct_9fa48("1989")) {
        {}
      } else {
        stryCov_9fa48("1989");
        found.push(stryMutAct_9fa48("1991") ? {} : (stryCov_9fa48("1991"), {
          line,
          why: stryMutAct_9fa48("1992") ? "" : (stryCov_9fa48("1992"), 'a style attribute is an inline style; put the rule in a stylesheet and add a class')
        }));
      }
    }
    if (stryMutAct_9fa48("1995") ? attrs.every(attribute => HANDLER.test(attribute.name)) : stryMutAct_9fa48("1994") ? false : stryMutAct_9fa48("1993") ? true : (stryCov_9fa48("1993", "1994", "1995"), attrs.some(stryMutAct_9fa48("1996") ? () => undefined : (stryCov_9fa48("1996"), attribute => HANDLER.test(attribute.name))))) {
      if (stryMutAct_9fa48("1997")) {
        {}
      } else {
        stryCov_9fa48("1997");
        found.push(stryMutAct_9fa48("1999") ? {} : (stryCov_9fa48("1999"), {
          line,
          why: stryMutAct_9fa48("2000") ? "" : (stryCov_9fa48("2000"), 'an inline event handler is a per-page script; attach the listener in a module')
        }));
      }
    }
    // htmx 4 ships custom elements, not only attributes: its partial tag is the
    // documented replacement for the out-of-band swap attribute. A gate that
    // reads attributes alone sees an ordinary unknown element and says nothing.
    if (stryMutAct_9fa48("2003") ? tag !== undefined || HTMX_ELEMENT.test(tag) : stryMutAct_9fa48("2002") ? false : stryMutAct_9fa48("2001") ? true : (stryCov_9fa48("2001", "2002", "2003"), (stryMutAct_9fa48("2005") ? tag === undefined : stryMutAct_9fa48("2004") ? true : (stryCov_9fa48("2004", "2005"), tag !== undefined)) && HTMX_ELEMENT.test(tag))) {
      if (stryMutAct_9fa48("2006")) {
        {}
      } else {
        stryCov_9fa48("2006");
        found.push(stryMutAct_9fa48("2008") ? {} : (stryCov_9fa48("2008"), {
          line,
          why: stryMutAct_9fa48("2009") ? `` : (stryCov_9fa48("2009"), `<${tag}> is an htmx element; render the markup and attach the listener in a module`)
        }));
      }
    }
  }
}

/**
 * Every construct a fragment carries that no page may ship inline.
 *
 * Parsed in document mode, not fragment mode: the fragment algorithm ignores
 * `html`, `head` and `body` start tags, and those are exactly where a theme
 * hook such as daisyUI's `data-theme` is written. A document parse keeps those
 * elements and their attributes in the tree, so the refusal reaches the shape
 * a framework reintroduction would actually take.
 * @param text - the markup.
 * @returns one entry per refused construct, with the line it starts on.
 */
export function markupOffences(text: string): MarkupOffence[] {
  if (stryMutAct_9fa48("2010")) {
    {}
  } else {
    stryCov_9fa48("2010");
    const found: MarkupOffence[] = stryMutAct_9fa48("2011") ? ["Stryker was here"] : (stryCov_9fa48("2011"), []);
    let landmarks = 0;
    const visit = (node: Parsed): void => {
      if (stryMutAct_9fa48("2012")) {
        {}
      } else {
        stryCov_9fa48("2012");
        const line = stryMutAct_9fa48("2013") ? node.sourceCodeLocation?.startLine && 1 : (stryCov_9fa48("2013"), (stryMutAct_9fa48("2014") ? node.sourceCodeLocation.startLine : (stryCov_9fa48("2014"), node.sourceCodeLocation?.startLine)) ?? 1);
        const attrs = stryMutAct_9fa48("2015") ? node.attrs && [] : (stryCov_9fa48("2015"), node.attrs ?? (stryMutAct_9fa48("2016") ? ["Stryker was here"] : (stryCov_9fa48("2016"), [])));
        const tag = (stryMutAct_9fa48("2019") ? typeof node.tagName !== 'string' : stryMutAct_9fa48("2018") ? false : stryMutAct_9fa48("2017") ? true : (stryCov_9fa48("2017", "2018", "2019"), typeof node.tagName === (stryMutAct_9fa48("2020") ? "" : (stryCov_9fa48("2020"), 'string')))) ? stryMutAct_9fa48("2021") ? node.tagName.toUpperCase() : (stryCov_9fa48("2021"), node.tagName.toLowerCase()) : undefined;
        if (stryMutAct_9fa48("2022")) {
          ;
        } else {
          stryCov_9fa48("2022");
          recordElementOffences(attrs, tag, line, found);
        }
        if (stryMutAct_9fa48("2023")) {
          ;
        } else {
          stryCov_9fa48("2023");
          recordAttributeOffences(attrs, tag, line, found);
        }
        for (const attribute of attrs) {
          if (stryMutAct_9fa48("2024")) {
            {}
          } else {
            stryCov_9fa48("2024");
            if (stryMutAct_9fa48("2027") ? false : stryMutAct_9fa48("2026") ? true : stryMutAct_9fa48("2025") ? URL_ATTRIBUTES.has(attribute.name.toLowerCase()) : (stryCov_9fa48("2025", "2026", "2027"), !URL_ATTRIBUTES.has(stryMutAct_9fa48("2028") ? attribute.name.toUpperCase() : (stryCov_9fa48("2028"), attribute.name.toLowerCase())))) continue;
            const url = stryMutAct_9fa48("2029") ? attribute.value && '' : (stryCov_9fa48("2029"), attribute.value ?? (stryMutAct_9fa48("2030") ? "Stryker was here!" : (stryCov_9fa48("2030"), '')));
            if (stryMutAct_9fa48("2032") ? false : stryMutAct_9fa48("2031") ? true : (stryCov_9fa48("2031", "2032"), isScriptedUrl(url))) {
              if (stryMutAct_9fa48("2033")) {
                {}
              } else {
                stryCov_9fa48("2033");
                found.push(stryMutAct_9fa48("2035") ? {} : (stryCov_9fa48("2035"), {
                  line,
                  why: stryMutAct_9fa48("2036") ? "" : (stryCov_9fa48("2036"), 'a URL that executes text as code is an inline script; navigate by address or call a module')
                }));
              }
            }
          }
        }
        if (stryMutAct_9fa48("2039") ? tag === 'script' || !attrs.some(attribute => attribute.name.toLowerCase() === 'src') : stryMutAct_9fa48("2038") ? false : stryMutAct_9fa48("2037") ? true : (stryCov_9fa48("2037", "2038", "2039"), (stryMutAct_9fa48("2041") ? tag !== 'script' : stryMutAct_9fa48("2040") ? true : (stryCov_9fa48("2040", "2041"), tag === (stryMutAct_9fa48("2042") ? "" : (stryCov_9fa48("2042"), 'script')))) && (stryMutAct_9fa48("2043") ? attrs.some(attribute => attribute.name.toLowerCase() === 'src') : (stryCov_9fa48("2043"), !(stryMutAct_9fa48("2044") ? attrs.every(attribute => attribute.name.toLowerCase() === 'src') : (stryCov_9fa48("2044"), attrs.some(stryMutAct_9fa48("2045") ? () => undefined : (stryCov_9fa48("2045"), attribute => stryMutAct_9fa48("2048") ? attribute.name.toLowerCase() !== 'src' : stryMutAct_9fa48("2047") ? false : stryMutAct_9fa48("2046") ? true : (stryCov_9fa48("2046", "2047", "2048"), (stryMutAct_9fa48("2049") ? attribute.name.toUpperCase() : (stryCov_9fa48("2049"), attribute.name.toLowerCase())) === (stryMutAct_9fa48("2050") ? "" : (stryCov_9fa48("2050"), 'src'))))))))))) {
          if (stryMutAct_9fa48("2051")) {
            {}
          } else {
            stryCov_9fa48("2051");
            found.push(stryMutAct_9fa48("2053") ? {} : (stryCov_9fa48("2053"), {
              line,
              why: stryMutAct_9fa48("2054") ? "" : (stryCov_9fa48("2054"), 'an inline script is a per-page script; ship a module and load it by src')
            }));
          }
        }
        if (stryMutAct_9fa48("2057") ? tag !== 'style' : stryMutAct_9fa48("2056") ? false : stryMutAct_9fa48("2055") ? true : (stryCov_9fa48("2055", "2056", "2057"), tag === (stryMutAct_9fa48("2058") ? "" : (stryCov_9fa48("2058"), 'style')))) {
          if (stryMutAct_9fa48("2059")) {
            {}
          } else {
            stryCov_9fa48("2059");
            found.push(stryMutAct_9fa48("2061") ? {} : (stryCov_9fa48("2061"), {
              line,
              why: stryMutAct_9fa48("2062") ? "" : (stryCov_9fa48("2062"), 'an inline stylesheet is a per-page sheet; ship a file and link it')
            }));
          }
        }
        if (stryMutAct_9fa48("2065") ? tag !== 'meta' : stryMutAct_9fa48("2064") ? false : stryMutAct_9fa48("2063") ? true : (stryCov_9fa48("2063", "2064", "2065"), tag === (stryMutAct_9fa48("2066") ? "" : (stryCov_9fa48("2066"), 'meta')))) {
          if (stryMutAct_9fa48("2067")) {
            {}
          } else {
            stryCov_9fa48("2067");
            const redirect = metaRedirectOffence(attrs, line);
            if (stryMutAct_9fa48("2070") ? redirect === undefined : stryMutAct_9fa48("2069") ? false : stryMutAct_9fa48("2068") ? true : (stryCov_9fa48("2068", "2069", "2070"), redirect !== undefined)) if (stryMutAct_9fa48("2071")) {
              ;
            } else {
              stryCov_9fa48("2071");
              found.push(redirect);
            }
          }
        }
        if (stryMutAct_9fa48("2074") ? tag !== undefined || PRESENTATIONAL_ELEMENTS.has(tag) : stryMutAct_9fa48("2073") ? false : stryMutAct_9fa48("2072") ? true : (stryCov_9fa48("2072", "2073", "2074"), (stryMutAct_9fa48("2076") ? tag === undefined : stryMutAct_9fa48("2075") ? true : (stryCov_9fa48("2075", "2076"), tag !== undefined)) && PRESENTATIONAL_ELEMENTS.has(tag))) {
          if (stryMutAct_9fa48("2077")) {
            {}
          } else {
            stryCov_9fa48("2077");
            found.push(stryMutAct_9fa48("2079") ? {} : (stryCov_9fa48("2079"), {
              line,
              why: stryMutAct_9fa48("2080") ? "" : (stryCov_9fa48("2080"), 'a retired presentational tag is alignment or type in markup; use the stylesheet')
            }));
          }
        }
        if (stryMutAct_9fa48("2083") ? tag !== LANDMARK : stryMutAct_9fa48("2082") ? false : stryMutAct_9fa48("2081") ? true : (stryCov_9fa48("2081", "2082", "2083"), tag === LANDMARK)) {
          if (stryMutAct_9fa48("2084")) {
            {}
          } else {
            stryCov_9fa48("2084");
            stryMutAct_9fa48("2085") ? landmarks -= 1 : (stryCov_9fa48("2085"), landmarks += 1);
            if (stryMutAct_9fa48("2089") ? landmarks <= 1 : stryMutAct_9fa48("2088") ? landmarks >= 1 : stryMutAct_9fa48("2087") ? false : stryMutAct_9fa48("2086") ? true : (stryCov_9fa48("2086", "2087", "2088", "2089"), landmarks > 1)) {
              if (stryMutAct_9fa48("2090")) {
                {}
              } else {
                stryCov_9fa48("2090");
                found.push(stryMutAct_9fa48("2092") ? {} : (stryCov_9fa48("2092"), {
                  line,
                  why: stryMutAct_9fa48("2093") ? "" : (stryCov_9fa48("2093"), 'a second main splits the shell; a document carries one')
                }));
              }
            }
          }
        }
        for (const child of stryMutAct_9fa48("2094") ? node.childNodes && [] : (stryCov_9fa48("2094"), node.childNodes ?? (stryMutAct_9fa48("2095") ? ["Stryker was here"] : (stryCov_9fa48("2095"), [])))) if (stryMutAct_9fa48("2096")) {
          ;
        } else {
          stryCov_9fa48("2096");
          visit(child);
        }
        for (const child of stryMutAct_9fa48("2097") ? node.content?.childNodes && [] : (stryCov_9fa48("2097"), (stryMutAct_9fa48("2098") ? node.content.childNodes : (stryCov_9fa48("2098"), node.content?.childNodes)) ?? (stryMutAct_9fa48("2099") ? ["Stryker was here"] : (stryCov_9fa48("2099"), [])))) if (stryMutAct_9fa48("2100")) {
          ;
        } else {
          stryCov_9fa48("2100");
          visit(child);
        }
      }
    };
    visit(parse(text, stryMutAct_9fa48("2102") ? {} : (stryCov_9fa48("2102"), {
      sourceCodeLocationInfo: stryMutAct_9fa48("2103") ? false : (stryCov_9fa48("2103"), true)
    })));
    return found;
  }
}

/**
 * Every refused construct a markup file carries.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per refused construct.
 */
export function scanMarkup(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("2104")) {
    {}
  } else {
    stryCov_9fa48("2104");
    return markupOffences(text).map(stryMutAct_9fa48("2105") ? () => undefined : (stryCov_9fa48("2105"), offence => stryMutAct_9fa48("2106") ? {} : (stryCov_9fa48("2106"), {
      label,
      line: offence.line,
      why: offence.why
    })));
  }
}