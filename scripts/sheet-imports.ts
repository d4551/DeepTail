/**
 * The import rules a stylesheet is read against.
 *
 * Split from `sheet-gate.ts` the day that module outgrew the size its own
 * rules allow a file to reach. An import is read off the whole sheet rather
 * than off the rule bodies: it sits at the top of the sheet, outside every
 * rule, and a reader that walks only rulesets never sees it — which is how a
 * sheet could import a retired framework's pipeline with every other check
 * green.
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
import { lineReader } from './lines.ts';
import type { Offence } from './offence.ts';

/** An `@import` target that pulls a retired framework's pipeline in. */
const RETIRED_IMPORT = stryMutAct_9fa48("537") ? /^@?(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx(?:\.org)?|alpinejs|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|[^"';]|$)/iu : stryMutAct_9fa48("536") ? /^@?(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx(?:\.org)?|alpinejs|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|["';])/iu : stryMutAct_9fa48("535") ? /^@?(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx(?:\.org)|alpinejs|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|["';]|$)/iu : stryMutAct_9fa48("534") ? /^@(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx(?:\.org)?|alpinejs|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|["';]|$)/iu : stryMutAct_9fa48("533") ? /@?(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx(?:\.org)?|alpinejs|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|["';]|$)/iu : (stryCov_9fa48("533", "534", "535", "536", "537"), /^@?(?:tailwindcss|daisyui|bootstrap|bulma|foundation-sites|htmx(?:\.org)?|alpinejs|materialize-css|semantic-ui|uikit|animate\.css|normalize\.css)(?:\/|\.|["';]|$)/iu);

/** A URL that loads from outside the shipped bundle, absolute or protocol-relative. */
const REMOTE_URL = stryMutAct_9fa48("540") ? /^(?:https:)?\/\//iu : stryMutAct_9fa48("539") ? /^(?:https?:)\/\//iu : stryMutAct_9fa48("538") ? /(?:https?:)?\/\//iu : (stryCov_9fa48("538", "539", "540"), /^(?:https?:)?\/\//iu);

/** One `@import` target, with the line it is written on. */
export interface SheetImport {
  /** The imported path, quotes and `url()` stripped. */
  readonly target: string;
  /** The line the import opens on. */
  readonly line: number;
}

/**
 * The line an offset falls on.
 * @param text - the sheet's contents.
 * @param at - the offset.
 * @returns the one-based line.
 */
function lineOf(text: string, at: number): number {
  if (stryMutAct_9fa48("541")) {
    {}
  } else {
    stryCov_9fa48("541");
    return lineReader(text)(at);
  }
}

/**
 * Every `@import` target a sheet names.
 *
 * Exported because it is a contract of its own: what counts as the target of an
 * import, and which line it is written on, is what every rule below is stated
 * about, and neither is observable through those rules once a target has been
 * judged.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one entry per import.
 */
export function importsOf(text: string): SheetImport[] {
  if (stryMutAct_9fa48("542")) {
    {}
  } else {
    stryCov_9fa48("542");
    const found: SheetImport[] = stryMutAct_9fa48("543") ? ["Stryker was here"] : (stryCov_9fa48("543"), []);
    // The target stops at the closing quote, the parenthesis or the semicolon,
    // so nothing after it needs matching; and the capture is read as the group it
    // is rather than by an index that has to be defended against being absent.
    for (const match of text.matchAll(stryMutAct_9fa48("552") ? /@import\s+(?:url\(\s*)?["']?(["');]+)/gu : stryMutAct_9fa48("551") ? /@import\s+(?:url\(\s*)?["']?([^"');])/gu : stryMutAct_9fa48("550") ? /@import\s+(?:url\(\s*)?[^"']?([^"');]+)/gu : stryMutAct_9fa48("549") ? /@import\s+(?:url\(\s*)?["']([^"');]+)/gu : stryMutAct_9fa48("548") ? /@import\s+(?:url\(\S*)?["']?([^"');]+)/gu : stryMutAct_9fa48("547") ? /@import\s+(?:url\(\s)?["']?([^"');]+)/gu : stryMutAct_9fa48("546") ? /@import\s+(?:url\(\s*)["']?([^"');]+)/gu : stryMutAct_9fa48("545") ? /@import\S+(?:url\(\s*)?["']?([^"');]+)/gu : stryMutAct_9fa48("544") ? /@import\s(?:url\(\s*)?["']?([^"');]+)/gu : (stryCov_9fa48("544", "545", "546", "547", "548", "549", "550", "551", "552"), /@import\s+(?:url\(\s*)?["']?([^"');]+)/gu))) {
      if (stryMutAct_9fa48("553")) {
        {}
      } else {
        stryCov_9fa48("553");
        for (const target of stryMutAct_9fa48("554") ? [...match] : (stryCov_9fa48("554"), (stryMutAct_9fa48("555") ? [] : (stryCov_9fa48("555"), [...match])).slice(1))) {
          if (stryMutAct_9fa48("556")) {
            {}
          } else {
            stryCov_9fa48("556");
            found.push(stryMutAct_9fa48("558") ? {} : (stryCov_9fa48("558"), {
              target,
              line: lineOf(text, match.index)
            }));
          }
        }
      }
    }
    return found;
  }
}

/**
 * Every import a sheet makes that it may not make.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one offence per remote or retired import.
 */
export function importOffences(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("559")) {
    {}
  } else {
    stryCov_9fa48("559");
    const offences: Offence[] = stryMutAct_9fa48("560") ? ["Stryker was here"] : (stryCov_9fa48("560"), []);
    for (const imported of importsOf(text)) {
      if (stryMutAct_9fa48("561")) {
        {}
      } else {
        stryCov_9fa48("561");
        if (stryMutAct_9fa48("563") ? false : stryMutAct_9fa48("562") ? true : (stryCov_9fa48("562", "563"), REMOTE_URL.test(imported.target))) {
          if (stryMutAct_9fa48("564")) {
            {}
          } else {
            stryCov_9fa48("564");
            offences.push(stryMutAct_9fa48("566") ? {} : (stryCov_9fa48("566"), {
              label,
              line: imported.line,
              why: stryMutAct_9fa48("567") ? "" : (stryCov_9fa48("567"), 'a remote import loads a sheet no local install ships; ship the sheet in the bundle')
            }));
            continue;
          }
        }
        if (stryMutAct_9fa48("569") ? false : stryMutAct_9fa48("568") ? true : (stryCov_9fa48("568", "569"), RETIRED_IMPORT.test(imported.target))) {
          if (stryMutAct_9fa48("570")) {
            {}
          } else {
            stryCov_9fa48("570");
            offences.push(stryMutAct_9fa48("572") ? {} : (stryCov_9fa48("572"), {
              label,
              line: imported.line,
              why: stryMutAct_9fa48("573") ? `` : (stryCov_9fa48("573"), `${imported.target} is a retired framework's pipeline; state the declarations directly`)
            }));
          }
        }
      }
    }
    return offences;
  }
}