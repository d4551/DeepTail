/**
 * Reading Rust attributes, for the bans that are stated about them.
 *
 * Rust has no parser in this repository, so its attributes are read as text.
 * What makes that safe is reading each attribute to the bracket that closes it:
 * a search that instead ran a fixed distance forward from `#[` left the
 * attribute entirely, and `#[cfg(test)]` followed by a `.expect(…)` a few lines
 * down read as a lint suppression, so every Rust test module was an offence and
 * the gate was red on a clean tree.
 *
 * @module
 */

/** Where a Rust character literal opens, so a bracket inside one is not counted. */function stryNS_9fa48() {
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
const CHARACTER = stryMutAct_9fa48("2070") ? /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]{1,6}\}|.)|[\\'\r\n])'/uy : stryMutAct_9fa48("2069") ? /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[^0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy : stryMutAct_9fa48("2068") ? /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]\}|.)|[^\\'\r\n])'/uy : stryMutAct_9fa48("2067") ? /'(?:\\(?:x[^0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy : stryMutAct_9fa48("2066") ? /'(?:\\(?:x[0-9A-Fa-f]|u\{[0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy : (stryCov_9fa48("2066", "2067", "2068", "2069", "2070"), /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy);

/** Where a Rust raw string opens, capturing the hashes its close must repeat. */
const RAW_STRING = stryMutAct_9fa48("2072") ? /b?r(#)"/uy : stryMutAct_9fa48("2071") ? /br(#*)"/uy : (stryCov_9fa48("2071", "2072"), /b?r(#*)"/uy);

/** Where a plain or byte Rust string opens. */
const STRING = stryMutAct_9fa48("2073") ? /b"/uy : (stryCov_9fa48("2073"), /b?"/uy);

/** Where a Rust attribute opens, outer (`#[`) or inner (`#![`). */
const ATTRIBUTE = stryMutAct_9fa48("2074") ? /#!\[/gu : (stryCov_9fa48("2074"), /#!?\[/gu);

/**
 * A lint level named where an attribute names one.
 *
 * `allow` and `expect` are read as path segments, which is the only place a
 * lint level can be written. The lookbehind is what separates the attribute
 * `#[expect(dead_code)]` from the method call `.expect("a fresh table")`: the
 * call is reached through a dot, and a lint level never is.
 */
export const LINT_LEVEL = stryMutAct_9fa48("2078") ? /(?<![\p{L}\p{N}_.])(?:allow|expect)\S*\(/u : stryMutAct_9fa48("2077") ? /(?<![\p{L}\p{N}_.])(?:allow|expect)\s\(/u : stryMutAct_9fa48("2076") ? /(?<![^\p{L}\p{N}_.])(?:allow|expect)\s*\(/u : stryMutAct_9fa48("2075") ? /(?<=[\p{L}\p{N}_.])(?:allow|expect)\s*\(/u : (stryCov_9fa48("2075", "2076", "2077", "2078"), /(?<![\p{L}\p{N}_.])(?:allow|expect)\s*\(/u);

/**
 * The offset just past the Rust literal starting at `cursor`, or undefined.
 *
 * A bracket inside a string closes no attribute, so literals are what the
 * bracket walk steps over rather than counts. Rust writes them plain (`"…"`),
 * raw with any number of hashes (`r#"…"#`), byte-prefixed (`b"…"`, `br#"…"#`),
 * and as characters (`'x'`). A lone `'` with no closing quote is a lifetime,
 * which carries no brackets, so it is left to the walk.
 * @param text - the file's contents.
 * @param cursor - the offset to read from.
 * @returns the offset just past the literal, or undefined when none opens here.
 */
function literalEnd(text: string, cursor: number): number | undefined {
  if (stryMutAct_9fa48("2079")) {
    {}
  } else {
    stryCov_9fa48("2079");
    CHARACTER.lastIndex = cursor;
    const character = CHARACTER.exec(text);
    if (stryMutAct_9fa48("2082") ? character === null : stryMutAct_9fa48("2081") ? false : stryMutAct_9fa48("2080") ? true : (stryCov_9fa48("2080", "2081", "2082"), character !== null)) return stryMutAct_9fa48("2083") ? cursor - character[0].length : (stryCov_9fa48("2083"), cursor + character[0].length);
    RAW_STRING.lastIndex = cursor;
    const raw = RAW_STRING.exec(text);
    if (stryMutAct_9fa48("2086") ? raw === null : stryMutAct_9fa48("2085") ? false : stryMutAct_9fa48("2084") ? true : (stryCov_9fa48("2084", "2085", "2086"), raw !== null)) {
      if (stryMutAct_9fa48("2087")) {
        {}
      } else {
        stryCov_9fa48("2087");
        const close = stryMutAct_9fa48("2088") ? `` : (stryCov_9fa48("2088"), `"${stryMutAct_9fa48("2089") ? raw[1] && '' : (stryCov_9fa48("2089"), raw[1] ?? (stryMutAct_9fa48("2090") ? "Stryker was here!" : (stryCov_9fa48("2090"), '')))}`);
        const closed = text.indexOf(close, stryMutAct_9fa48("2091") ? cursor - raw[0].length : (stryCov_9fa48("2091"), cursor + raw[0].length));
        return (stryMutAct_9fa48("2094") ? closed !== -1 : stryMutAct_9fa48("2093") ? false : stryMutAct_9fa48("2092") ? true : (stryCov_9fa48("2092", "2093", "2094"), closed === (stryMutAct_9fa48("2095") ? +1 : (stryCov_9fa48("2095"), -1)))) ? text.length : stryMutAct_9fa48("2096") ? closed - close.length : (stryCov_9fa48("2096"), closed + close.length);
      }
    }
    STRING.lastIndex = cursor;
    const plain = STRING.exec(text);
    if (stryMutAct_9fa48("2099") ? plain !== null : stryMutAct_9fa48("2098") ? false : stryMutAct_9fa48("2097") ? true : (stryCov_9fa48("2097", "2098", "2099"), plain === null)) return undefined;
    let scan = stryMutAct_9fa48("2100") ? cursor - plain[0].length : (stryCov_9fa48("2100"), cursor + plain[0].length);
    while (stryMutAct_9fa48("2103") ? scan >= text.length : stryMutAct_9fa48("2102") ? scan <= text.length : stryMutAct_9fa48("2101") ? false : (stryCov_9fa48("2101", "2102", "2103"), scan < text.length)) {
      if (stryMutAct_9fa48("2104")) {
        {}
      } else {
        stryCov_9fa48("2104");
        if (stryMutAct_9fa48("2107") ? text[scan] !== '\\' : stryMutAct_9fa48("2106") ? false : stryMutAct_9fa48("2105") ? true : (stryCov_9fa48("2105", "2106", "2107"), text[scan] === (stryMutAct_9fa48("2108") ? "" : (stryCov_9fa48("2108"), '\\')))) {
          if (stryMutAct_9fa48("2109")) {
            {}
          } else {
            stryCov_9fa48("2109");
            stryMutAct_9fa48("2110") ? scan -= 2 : (stryCov_9fa48("2110"), scan += 2);
            continue;
          }
        }
        if (stryMutAct_9fa48("2113") ? text[scan] !== '"' : stryMutAct_9fa48("2112") ? false : stryMutAct_9fa48("2111") ? true : (stryCov_9fa48("2111", "2112", "2113"), text[scan] === (stryMutAct_9fa48("2114") ? "" : (stryCov_9fa48("2114"), '"')))) return stryMutAct_9fa48("2115") ? scan - 1 : (stryCov_9fa48("2115"), scan + 1);
        stryMutAct_9fa48("2116") ? scan -= 1 : (stryCov_9fa48("2116"), scan += 1);
      }
    }
    return text.length;
  }
}

/** One Rust attribute, read to the bracket that closes it. */
export interface RustAttribute {
  /** Offset of the opening `#`. */
  readonly start: number;
  /**
   * What the brackets hold, with literals blanked out so a lint name written
   * inside a doc string is not read as a lint level; undefined when no bracket
   * closes the attribute, which is a file this reader cannot check.
   */
  readonly held: string | undefined;
}

/**
 * Every Rust attribute in a file, in source order.
 *
 * Brackets nest — `cfg_attr(all(), allow(dead_code))` is one attribute holding
 * another — so the walk counts them, and steps over literals so a bracket
 * written inside a string is not counted as one.
 * @param text - the file's contents.
 * @returns one entry per attribute.
 */
export function rustAttributes(text: string): RustAttribute[] {
  if (stryMutAct_9fa48("2117")) {
    {}
  } else {
    stryCov_9fa48("2117");
    return (stryMutAct_9fa48("2118") ? [] : (stryCov_9fa48("2118"), [...text.matchAll(ATTRIBUTE)])).map(stryMutAct_9fa48("2119") ? () => undefined : (stryCov_9fa48("2119"), opened => stryMutAct_9fa48("2120") ? {} : (stryCov_9fa48("2120"), {
      start: opened.index,
      held: attributeBody(text, stryMutAct_9fa48("2121") ? opened.index - opened[0].length : (stryCov_9fa48("2121"), opened.index + opened[0].length))
    })));
  }
}

/**
 * What one attribute holds, read from just past its opening bracket.
 *
 * A literal is blanked to its own width rather than read, so a bracket written
 * inside a string does not move the depth and every offset past it stays true.
 * @param text - the file's contents.
 * @param from - the offset just past the attribute's opening bracket.
 * @returns the contents, or undefined when the bracket is never closed.
 */
function attributeBody(text: string, from: number): string | undefined {
  if (stryMutAct_9fa48("2122")) {
    {}
  } else {
    stryCov_9fa48("2122");
    let cursor = from;
    let depth = 1;
    let held = stryMutAct_9fa48("2123") ? "Stryker was here!" : (stryCov_9fa48("2123"), '');
    while (stryMutAct_9fa48("2125") ? cursor < text.length || depth > 0 : stryMutAct_9fa48("2124") ? false : (stryCov_9fa48("2124", "2125"), (stryMutAct_9fa48("2128") ? cursor >= text.length : stryMutAct_9fa48("2127") ? cursor <= text.length : stryMutAct_9fa48("2126") ? true : (stryCov_9fa48("2126", "2127", "2128"), cursor < text.length)) && (stryMutAct_9fa48("2131") ? depth <= 0 : stryMutAct_9fa48("2130") ? depth >= 0 : stryMutAct_9fa48("2129") ? true : (stryCov_9fa48("2129", "2130", "2131"), depth > 0)))) {
      if (stryMutAct_9fa48("2132")) {
        {}
      } else {
        stryCov_9fa48("2132");
        const literal = literalEnd(text, cursor);
        if (stryMutAct_9fa48("2135") ? literal === undefined : stryMutAct_9fa48("2134") ? false : stryMutAct_9fa48("2133") ? true : (stryCov_9fa48("2133", "2134", "2135"), literal !== undefined)) {
          if (stryMutAct_9fa48("2136")) {
            {}
          } else {
            stryCov_9fa48("2136");
            stryMutAct_9fa48("2137") ? held -= ' '.repeat(literal - cursor) : (stryCov_9fa48("2137"), held += (stryMutAct_9fa48("2138") ? "" : (stryCov_9fa48("2138"), ' ')).repeat(stryMutAct_9fa48("2139") ? literal + cursor : (stryCov_9fa48("2139"), literal - cursor)));
            cursor = literal;
            continue;
          }
        }
        const character = stryMutAct_9fa48("2140") ? text[cursor] && '' : (stryCov_9fa48("2140"), text[cursor] ?? (stryMutAct_9fa48("2141") ? "Stryker was here!" : (stryCov_9fa48("2141"), '')));
        if (stryMutAct_9fa48("2144") ? character !== '[' : stryMutAct_9fa48("2143") ? false : stryMutAct_9fa48("2142") ? true : (stryCov_9fa48("2142", "2143", "2144"), character === (stryMutAct_9fa48("2145") ? "" : (stryCov_9fa48("2145"), '[')))) stryMutAct_9fa48("2146") ? depth -= 1 : (stryCov_9fa48("2146"), depth += 1);else if (stryMutAct_9fa48("2149") ? character !== ']' : stryMutAct_9fa48("2148") ? false : stryMutAct_9fa48("2147") ? true : (stryCov_9fa48("2147", "2148", "2149"), character === (stryMutAct_9fa48("2150") ? "" : (stryCov_9fa48("2150"), ']')))) stryMutAct_9fa48("2151") ? depth += 1 : (stryCov_9fa48("2151"), depth -= 1);
        if (stryMutAct_9fa48("2155") ? depth <= 0 : stryMutAct_9fa48("2154") ? depth >= 0 : stryMutAct_9fa48("2153") ? false : stryMutAct_9fa48("2152") ? true : (stryCov_9fa48("2152", "2153", "2154", "2155"), depth > 0)) stryMutAct_9fa48("2156") ? held -= character : (stryCov_9fa48("2156"), held += character);
        stryMutAct_9fa48("2157") ? cursor -= 1 : (stryCov_9fa48("2157"), cursor += 1);
      }
    }
    return (stryMutAct_9fa48("2160") ? depth !== 0 : stryMutAct_9fa48("2159") ? false : stryMutAct_9fa48("2158") ? true : (stryCov_9fa48("2158", "2159", "2160"), depth === 0)) ? held : undefined;
  }
}