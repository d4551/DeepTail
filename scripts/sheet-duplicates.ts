/**
 * Duplicate ruleset detection for the stylesheet gate.
 *
 * Split from `sheet-gate.ts` so that module stays under the size its own
 * rules allow a file to reach. A duplicated ruleset is a DRY hole: two copies
 * of the same decision that drift the first time one of them is edited.
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
import type { Offence } from './offence.ts';
import { rulesetsOf } from './sheet-reader.ts';

/**
 * Every rule set a sheet declares more than once, byte for byte.
 *
 * The token sheet is not exempt — that is where a four-line block sat twice,
 * fifty-five lines apart, and no length rule could see it because the token
 * sheet is allowed raw values.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per repeated ruleset, on the second (and later) copy.
 */
export function duplicateRulesets(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("471")) {
    {}
  } else {
    stryCov_9fa48("471");
    const seen = new Map<string, number>();
    const offences: Offence[] = stryMutAct_9fa48("472") ? ["Stryker was here"] : (stryCov_9fa48("472"), []);
    for (const rule of rulesetsOf(text)) {
      if (stryMutAct_9fa48("473")) {
        {}
      } else {
        stryCov_9fa48("473");
        const key = stryMutAct_9fa48("474") ? `` : (stryCov_9fa48("474"), `${rule.selector} { ${rule.body} }`);
        const first = seen.get(key);
        if (stryMutAct_9fa48("477") ? first !== undefined : stryMutAct_9fa48("476") ? false : stryMutAct_9fa48("475") ? true : (stryCov_9fa48("475", "476", "477"), first === undefined)) {
          if (stryMutAct_9fa48("478")) {
            {}
          } else {
            stryCov_9fa48("478");
            if (stryMutAct_9fa48("479")) {
              ;
            } else {
              stryCov_9fa48("479");
              seen.set(key, rule.line);
            }
            continue;
          }
        }
        offences.push(stryMutAct_9fa48("481") ? {} : (stryCov_9fa48("481"), {
          label,
          line: rule.line,
          why: stryMutAct_9fa48("482") ? `` : (stryCov_9fa48("482"), `duplicate-ruleset: ${rule.selector} is declared more than once (first at line ${String(first)})`)
        }));
      }
    }
    return offences;
  }
}