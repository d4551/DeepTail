/**
 * How far a selector may reach through the DOM.
 *
 * Split from `sheet-gate.ts` when it outgrew the size the linter allows one
 * file. Depth is its own decision: everything else that gate states is about a
 * declaration, and this is the one rule about the selector.
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
import { rulesetsOf } from './sheet-reader.ts';

/** How a selector may reach from one compound to the next. */
const COMBINATORS = stryMutAct_9fa48("451") ? /\s*[>+~]\s*|\S+/gu : stryMutAct_9fa48("450") ? /\s*[>+~]\s*|\s/gu : stryMutAct_9fa48("449") ? /\s*[>+~]\S*|\s+/gu : stryMutAct_9fa48("448") ? /\s*[>+~]\s|\s+/gu : stryMutAct_9fa48("447") ? /\s*[^>+~]\s*|\s+/gu : stryMutAct_9fa48("446") ? /\S*[>+~]\s*|\s+/gu : stryMutAct_9fa48("445") ? /\s[>+~]\s*|\s+/gu : (stryCov_9fa48("445", "446", "447", "448", "449", "450", "451"), /\s*[>+~]\s*|\s+/gu);

/**
 * The most compounds a selector may chain.
 *
 * Every chain past three is layout reaching through the DOM rather than
 * through a class: it couples a rule to a structure the markup can change
 * without the sheet ever being told, and it is how a sheet grows a branch per
 * page instead of a class per role.
 */
export const MAX_COMPOUNDS = 3;

/**
 * How many compounds one comma-separated selector chains.
 * @param one - a single selector, no commas.
 * @returns the count of compounds the selector reaches through.
 */
function compoundsOf(one: string): number {
  if (stryMutAct_9fa48("452")) {
    {}
  } else {
    stryCov_9fa48("452");
    return stryMutAct_9fa48("453") ? one.split(COMBINATORS).length : (stryCov_9fa48("453"), one.split(COMBINATORS).filter(stryMutAct_9fa48("454") ? () => undefined : (stryCov_9fa48("454"), compound => stryMutAct_9fa48("457") ? compound === '' : stryMutAct_9fa48("456") ? false : stryMutAct_9fa48("455") ? true : (stryCov_9fa48("455", "456", "457"), compound !== (stryMutAct_9fa48("458") ? "Stryker was here!" : (stryCov_9fa48("458"), ''))))).length);
  }
}

/**
 * Every selector that chains more compounds than the design allows.
 *
 * @param text - the sheet's contents.
 * @returns one entry per over-deep selector, with the line its rule opens on.
 */
export function deepSelectors(text: string): {
  readonly selector: string;
  readonly line: number;
}[] {
  if (stryMutAct_9fa48("459")) {
    {}
  } else {
    stryCov_9fa48("459");
    return stryMutAct_9fa48("460") ? rulesetsOf(text).flatMap(rule => rule.selector.split(',').map(one => ({
      selector: one.trim(),
      line: rule.line
    }) as const)).map(one => ({
      selector: one.selector,
      line: one.line
    })) : (stryCov_9fa48("460"), rulesetsOf(text).flatMap(stryMutAct_9fa48("461") ? () => undefined : (stryCov_9fa48("461"), rule => rule.selector.split(stryMutAct_9fa48("462") ? "" : (stryCov_9fa48("462"), ',')).map(stryMutAct_9fa48("463") ? () => undefined : (stryCov_9fa48("463"), one => ({
      selector: one.trim(),
      line: rule.line
    }) as const)))).filter(stryMutAct_9fa48("464") ? () => undefined : (stryCov_9fa48("464"), one => stryMutAct_9fa48("468") ? compoundsOf(one.selector) <= MAX_COMPOUNDS : stryMutAct_9fa48("467") ? compoundsOf(one.selector) >= MAX_COMPOUNDS : stryMutAct_9fa48("466") ? false : stryMutAct_9fa48("465") ? true : (stryCov_9fa48("465", "466", "467", "468"), compoundsOf(one.selector) > MAX_COMPOUNDS))).map(stryMutAct_9fa48("469") ? () => undefined : (stryCov_9fa48("469"), one => stryMutAct_9fa48("470") ? {} : (stryCov_9fa48("470"), {
      selector: one.selector,
      line: one.line
    }))));
  }
}