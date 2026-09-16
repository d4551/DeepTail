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
const CHARACTER = stryMutAct_9fa48("2533") ? /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]{1,6}\}|.)|[\\'\r\n])'/uy : stryMutAct_9fa48("2532") ? /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[^0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy : stryMutAct_9fa48("2531") ? /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]\}|.)|[^\\'\r\n])'/uy : stryMutAct_9fa48("2530") ? /'(?:\\(?:x[^0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy : stryMutAct_9fa48("2529") ? /'(?:\\(?:x[0-9A-Fa-f]|u\{[0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy : (stryCov_9fa48("2529", "2530", "2531", "2532", "2533"), /'(?:\\(?:x[0-9A-Fa-f]{2}|u\{[0-9A-Fa-f]{1,6}\}|.)|[^\\'\r\n])'/uy);

/** Where a Rust raw string opens, capturing the hashes its close must repeat. */
const RAW_STRING = stryMutAct_9fa48("2535") ? /b?r(#)"/uy : stryMutAct_9fa48("2534") ? /br(#*)"/uy : (stryCov_9fa48("2534", "2535"), /b?r(#*)"/uy);

/** Where a plain or byte Rust string opens. */
const STRING = stryMutAct_9fa48("2536") ? /b"/uy : (stryCov_9fa48("2536"), /b?"/uy);

/** Where a Rust attribute opens, outer (`#[`) or inner (`#![`). */
const ATTRIBUTE = stryMutAct_9fa48("2537") ? /#!\[/gu : (stryCov_9fa48("2537"), /#!?\[/gu);

/**
 * A lint level named where an attribute names one.
 *
 * `allow` and `expect` are read as path segments, which is the only place a
 * lint level can be written. The lookbehind is what separates the attribute
 * `#[expect(dead_code)]` from the method call `.expect("a fresh table")`: the
 * call is reached through a dot, and a lint level never is.
 */
export const LINT_LEVEL = stryMutAct_9fa48("2541") ? /(?<![\p{L}\p{N}_.])(?:allow|expect)\S*\(/u : stryMutAct_9fa48("2540") ? /(?<![\p{L}\p{N}_.])(?:allow|expect)\s\(/u : stryMutAct_9fa48("2539") ? /(?<![^\p{L}\p{N}_.])(?:allow|expect)\s*\(/u : stryMutAct_9fa48("2538") ? /(?<=[\p{L}\p{N}_.])(?:allow|expect)\s*\(/u : (stryCov_9fa48("2538", "2539", "2540", "2541"), /(?<![\p{L}\p{N}_.])(?:allow|expect)\s*\(/u);

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
  if (stryMutAct_9fa48("2542")) {
    {}
  } else {
    stryCov_9fa48("2542");
    CHARACTER.lastIndex = cursor;
    const character = CHARACTER.exec(text);
    if (stryMutAct_9fa48("2545") ? character === null : stryMutAct_9fa48("2544") ? false : stryMutAct_9fa48("2543") ? true : (stryCov_9fa48("2543", "2544", "2545"), character !== null)) return stryMutAct_9fa48("2546") ? cursor - character[0].length : (stryCov_9fa48("2546"), cursor + character[0].length);
    RAW_STRING.lastIndex = cursor;
    const raw = RAW_STRING.exec(text);
    if (stryMutAct_9fa48("2549") ? raw === null : stryMutAct_9fa48("2548") ? false : stryMutAct_9fa48("2547") ? true : (stryCov_9fa48("2547", "2548", "2549"), raw !== null)) {
      if (stryMutAct_9fa48("2550")) {
        {}
      } else {
        stryCov_9fa48("2550");
        const close = stryMutAct_9fa48("2551") ? `` : (stryCov_9fa48("2551"), `"${stryMutAct_9fa48("2552") ? raw[1] && '' : (stryCov_9fa48("2552"), raw[1] ?? (stryMutAct_9fa48("2553") ? "Stryker was here!" : (stryCov_9fa48("2553"), '')))}`);
        const closed = text.indexOf(close, stryMutAct_9fa48("2554") ? cursor - raw[0].length : (stryCov_9fa48("2554"), cursor + raw[0].length));
        return (stryMutAct_9fa48("2557") ? closed !== -1 : stryMutAct_9fa48("2556") ? false : stryMutAct_9fa48("2555") ? true : (stryCov_9fa48("2555", "2556", "2557"), closed === (stryMutAct_9fa48("2558") ? +1 : (stryCov_9fa48("2558"), -1)))) ? text.length : stryMutAct_9fa48("2559") ? closed - close.length : (stryCov_9fa48("2559"), closed + close.length);
      }
    }
    STRING.lastIndex = cursor;
    const plain = STRING.exec(text);
    if (stryMutAct_9fa48("2562") ? plain !== null : stryMutAct_9fa48("2561") ? false : stryMutAct_9fa48("2560") ? true : (stryCov_9fa48("2560", "2561", "2562"), plain === null)) return undefined;
    let scan = stryMutAct_9fa48("2563") ? cursor - plain[0].length : (stryCov_9fa48("2563"), cursor + plain[0].length);
    while (stryMutAct_9fa48("2566") ? scan >= text.length : stryMutAct_9fa48("2565") ? scan <= text.length : stryMutAct_9fa48("2564") ? false : (stryCov_9fa48("2564", "2565", "2566"), scan < text.length)) {
      if (stryMutAct_9fa48("2567")) {
        {}
      } else {
        stryCov_9fa48("2567");
        if (stryMutAct_9fa48("2570") ? text[scan] !== '\\' : stryMutAct_9fa48("2569") ? false : stryMutAct_9fa48("2568") ? true : (stryCov_9fa48("2568", "2569", "2570"), text[scan] === (stryMutAct_9fa48("2571") ? "" : (stryCov_9fa48("2571"), '\\')))) {
          if (stryMutAct_9fa48("2572")) {
            {}
          } else {
            stryCov_9fa48("2572");
            stryMutAct_9fa48("2573") ? scan -= 2 : (stryCov_9fa48("2573"), scan += 2);
            continue;
          }
        }
        if (stryMutAct_9fa48("2576") ? text[scan] !== '"' : stryMutAct_9fa48("2575") ? false : stryMutAct_9fa48("2574") ? true : (stryCov_9fa48("2574", "2575", "2576"), text[scan] === (stryMutAct_9fa48("2577") ? "" : (stryCov_9fa48("2577"), '"')))) return stryMutAct_9fa48("2578") ? scan - 1 : (stryCov_9fa48("2578"), scan + 1);
        stryMutAct_9fa48("2579") ? scan -= 1 : (stryCov_9fa48("2579"), scan += 1);
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
  if (stryMutAct_9fa48("2580")) {
    {}
  } else {
    stryCov_9fa48("2580");
    const attributes: RustAttribute[] = stryMutAct_9fa48("2581") ? ["Stryker was here"] : (stryCov_9fa48("2581"), []);
    for (const opened of text.matchAll(ATTRIBUTE)) {
      if (stryMutAct_9fa48("2582")) {
        {}
      } else {
        stryCov_9fa48("2582");
        let cursor = stryMutAct_9fa48("2583") ? opened.index - opened[0].length : (stryCov_9fa48("2583"), opened.index + opened[0].length);
        let depth = 1;
        let held = stryMutAct_9fa48("2584") ? "Stryker was here!" : (stryCov_9fa48("2584"), '');
        while (stryMutAct_9fa48("2586") ? cursor < text.length || depth > 0 : stryMutAct_9fa48("2585") ? false : (stryCov_9fa48("2585", "2586"), (stryMutAct_9fa48("2589") ? cursor >= text.length : stryMutAct_9fa48("2588") ? cursor <= text.length : stryMutAct_9fa48("2587") ? true : (stryCov_9fa48("2587", "2588", "2589"), cursor < text.length)) && (stryMutAct_9fa48("2592") ? depth <= 0 : stryMutAct_9fa48("2591") ? depth >= 0 : stryMutAct_9fa48("2590") ? true : (stryCov_9fa48("2590", "2591", "2592"), depth > 0)))) {
          if (stryMutAct_9fa48("2593")) {
            {}
          } else {
            stryCov_9fa48("2593");
            const literal = literalEnd(text, cursor);
            if (stryMutAct_9fa48("2596") ? literal === undefined : stryMutAct_9fa48("2595") ? false : stryMutAct_9fa48("2594") ? true : (stryCov_9fa48("2594", "2595", "2596"), literal !== undefined)) {
              if (stryMutAct_9fa48("2597")) {
                {}
              } else {
                stryCov_9fa48("2597");
                stryMutAct_9fa48("2598") ? held -= ' '.repeat(literal - cursor) : (stryCov_9fa48("2598"), held += (stryMutAct_9fa48("2599") ? "" : (stryCov_9fa48("2599"), ' ')).repeat(stryMutAct_9fa48("2600") ? literal + cursor : (stryCov_9fa48("2600"), literal - cursor)));
                cursor = literal;
                continue;
              }
            }
            const character = stryMutAct_9fa48("2601") ? text[cursor] && '' : (stryCov_9fa48("2601"), text[cursor] ?? (stryMutAct_9fa48("2602") ? "Stryker was here!" : (stryCov_9fa48("2602"), '')));
            if (stryMutAct_9fa48("2605") ? character !== '[' : stryMutAct_9fa48("2604") ? false : stryMutAct_9fa48("2603") ? true : (stryCov_9fa48("2603", "2604", "2605"), character === (stryMutAct_9fa48("2606") ? "" : (stryCov_9fa48("2606"), '[')))) stryMutAct_9fa48("2607") ? depth -= 1 : (stryCov_9fa48("2607"), depth += 1);else if (stryMutAct_9fa48("2610") ? character !== ']' : stryMutAct_9fa48("2609") ? false : stryMutAct_9fa48("2608") ? true : (stryCov_9fa48("2608", "2609", "2610"), character === (stryMutAct_9fa48("2611") ? "" : (stryCov_9fa48("2611"), ']')))) stryMutAct_9fa48("2612") ? depth += 1 : (stryCov_9fa48("2612"), depth -= 1);
            if (stryMutAct_9fa48("2616") ? depth <= 0 : stryMutAct_9fa48("2615") ? depth >= 0 : stryMutAct_9fa48("2614") ? false : stryMutAct_9fa48("2613") ? true : (stryCov_9fa48("2613", "2614", "2615", "2616"), depth > 0)) stryMutAct_9fa48("2617") ? held -= character : (stryCov_9fa48("2617"), held += character);
            stryMutAct_9fa48("2618") ? cursor -= 1 : (stryCov_9fa48("2618"), cursor += 1);
          }
        }
        attributes.push(stryMutAct_9fa48("2620") ? {} : (stryCov_9fa48("2620"), {
          start: opened.index,
          held: (stryMutAct_9fa48("2623") ? depth !== 0 : stryMutAct_9fa48("2622") ? false : stryMutAct_9fa48("2621") ? true : (stryCov_9fa48("2621", "2622", "2623"), depth === 0)) ? held : undefined
        }));
      }
    }
    return attributes;
  }
}