/**
 * The rules the focus ring is read against.
 *
 * The ring was read only as a keyboard nicety, and it is an invariant: a
 * control that hides the user agent's ring and never restores it is
 * unreachable by keyboard in any meaningful sense. This module is the ring
 * half of the sheet gate, split from it the day the sheet gate outgrew the
 * size its own rules allow a file to reach.
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
import { blocksOf, type Declaration } from './sheet-reader.ts';

/** The properties that can paint a focus ring. */
export const RING_PROPERTIES: ReadonlySet<string> = new Set(stryMutAct_9fa48("178") ? [] : (stryCov_9fa48("178"), [stryMutAct_9fa48("179") ? "" : (stryCov_9fa48("179"), 'outline'), stryMutAct_9fa48("180") ? "" : (stryCov_9fa48("180"), 'outline-width'), stryMutAct_9fa48("181") ? "" : (stryCov_9fa48("181"), 'outline-style'), stryMutAct_9fa48("182") ? "" : (stryCov_9fa48("182"), 'box-shadow')]));

/** A value that paints nothing. */
export const BLANK_VALUES: ReadonlySet<string> = new Set(stryMutAct_9fa48("183") ? [] : (stryCov_9fa48("183"), [stryMutAct_9fa48("184") ? "" : (stryCov_9fa48("184"), 'none'), stryMutAct_9fa48("185") ? "" : (stryCov_9fa48("185"), '0'), stryMutAct_9fa48("186") ? "" : (stryCov_9fa48("186"), '0px')]));

/** What a rule's body does to the focus ring. */
interface RingEffect {
  /** True when it switches the user agent's outline off. */
  readonly hides: boolean;
  /** True when it paints a ring of its own. */
  readonly paints: boolean;
}

/**
 * What one rule's declarations do to the focus ring.
 *
 * The declarations are read rather than matched with a lookahead: a pattern
 * that reads `outline:` and then asserts the value is not `none` can satisfy
 * the assertion by matching fewer spaces, and reads `outline: none` as a ring.
 * They come from the shared sheet reader rather than a second split of the
 * rule's text — this module had its own, which is one more notion of where a
 * declaration ends, and it read a semicolon inside a quoted value as the end
 * of one.
 * @param declarations - the rule's declarations, as the sheet reader read them.
 * @returns whether it hides a ring and whether it paints one.
 */
function ringEffect(declarations: readonly Declaration[]): RingEffect {
  if (stryMutAct_9fa48("187")) {
    {}
  } else {
    stryCov_9fa48("187");
    let hides = stryMutAct_9fa48("188") ? true : (stryCov_9fa48("188"), false);
    let paints = stryMutAct_9fa48("189") ? true : (stryCov_9fa48("189"), false);
    for (const {
      property,
      value
    } of declarations) {
      if (stryMutAct_9fa48("190")) {
        {}
      } else {
        stryCov_9fa48("190");
        // The reader refuses a declaration with no value, so a value that arrives
        // here has one; checking again would be a branch no test could reach.
        const painted = stryMutAct_9fa48("191") ? value.toUpperCase() : (stryCov_9fa48("191"), value.toLowerCase());
        if (stryMutAct_9fa48("194") ? false : stryMutAct_9fa48("193") ? true : stryMutAct_9fa48("192") ? RING_PROPERTIES.has(property) : (stryCov_9fa48("192", "193", "194"), !RING_PROPERTIES.has(property))) continue;
        if (stryMutAct_9fa48("196") ? false : stryMutAct_9fa48("195") ? true : (stryCov_9fa48("195", "196"), BLANK_VALUES.has(painted))) {
          if (stryMutAct_9fa48("197")) {
            {}
          } else {
            stryCov_9fa48("197");
            if (stryMutAct_9fa48("200") ? property === 'outline' && property === 'outline-style' : stryMutAct_9fa48("199") ? false : stryMutAct_9fa48("198") ? true : (stryCov_9fa48("198", "199", "200"), (stryMutAct_9fa48("202") ? property !== 'outline' : stryMutAct_9fa48("201") ? false : (stryCov_9fa48("201", "202"), property === (stryMutAct_9fa48("203") ? "" : (stryCov_9fa48("203"), 'outline')))) || (stryMutAct_9fa48("205") ? property !== 'outline-style' : stryMutAct_9fa48("204") ? false : (stryCov_9fa48("204", "205"), property === (stryMutAct_9fa48("206") ? "" : (stryCov_9fa48("206"), 'outline-style')))))) hides = stryMutAct_9fa48("207") ? false : (stryCov_9fa48("207"), true);
            continue;
          }
        }
        paints = stryMutAct_9fa48("208") ? false : (stryCov_9fa48("208"), true);
      }
    }
    return stryMutAct_9fa48("209") ? {} : (stryCov_9fa48("209"), {
      hides,
      paints
    });
  }
}

/**
 * Selectors that switch the focus ring off without writing one back.
 *
 * `select` and `textarea` shipped that way, hidden by a class rule while the
 * rule that gave the ring back named elements the class did not cover. The
 * restoration is required on the selector that did the hiding, so the two are
 * read together rather than one relying on a coincidence in the other.
 *
 * Every rule a selector appears in is combined before it is judged, because a
 * sheet is read that way: a selector whose outline one rule switches off and
 * another paints a shadow ring on has a ring, and reading the two rules apart
 * reported it as having none — as it did for the idiomatic custom ring, an
 * `outline: none` and a `box-shadow` written together on `:focus-visible`.
 * @param text - the sheet's contents.
 * @returns each selector that hides the ring and restores nothing.
 */
export function unringedSelectors(text: string): string[] {
  if (stryMutAct_9fa48("210")) {
    {}
  } else {
    stryCov_9fa48("210");
    const effects = new Map<string, RingEffect>();
    for (const block of blocksOf(text)) {
      if (stryMutAct_9fa48("211")) {
        {}
      } else {
        stryCov_9fa48("211");
        // An at-rule's block holds descriptors rather than a selector's
        // declarations, so it can neither hide a ring nor paint one.
        if (stryMutAct_9fa48("213") ? false : stryMutAct_9fa48("212") ? true : (stryCov_9fa48("212", "213"), block.atRule)) continue;
        const effect = ringEffect(block.declarations);
        for (const one of block.prelude.split(stryMutAct_9fa48("214") ? "" : (stryCov_9fa48("214"), ','))) {
          if (stryMutAct_9fa48("215")) {
            {}
          } else {
            stryCov_9fa48("215");
            const base = stryMutAct_9fa48("216") ? one : (stryCov_9fa48("216"), one.trim());
            if (stryMutAct_9fa48("219") ? base !== '' : stryMutAct_9fa48("218") ? false : stryMutAct_9fa48("217") ? true : (stryCov_9fa48("217", "218", "219"), base === (stryMutAct_9fa48("220") ? "Stryker was here!" : (stryCov_9fa48("220"), '')))) continue;
            const held = effects.get(base);
            effects.set(base, stryMutAct_9fa48("222") ? {} : (stryCov_9fa48("222"), {
              hides: stryMutAct_9fa48("225") ? effect.hides && held?.hides === true : stryMutAct_9fa48("224") ? false : stryMutAct_9fa48("223") ? true : (stryCov_9fa48("223", "224", "225"), effect.hides || (stryMutAct_9fa48("227") ? held?.hides !== true : stryMutAct_9fa48("226") ? false : (stryCov_9fa48("226", "227"), (stryMutAct_9fa48("228") ? held.hides : (stryCov_9fa48("228"), held?.hides)) === (stryMutAct_9fa48("229") ? false : (stryCov_9fa48("229"), true))))),
              paints: stryMutAct_9fa48("232") ? effect.paints && held?.paints === true : stryMutAct_9fa48("231") ? false : stryMutAct_9fa48("230") ? true : (stryCov_9fa48("230", "231", "232"), effect.paints || (stryMutAct_9fa48("234") ? held?.paints !== true : stryMutAct_9fa48("233") ? false : (stryCov_9fa48("233", "234"), (stryMutAct_9fa48("235") ? held.paints : (stryCov_9fa48("235"), held?.paints)) === (stryMutAct_9fa48("236") ? false : (stryCov_9fa48("236"), true)))))
            }));
          }
        }
      }
    }
    const hidden: string[] = stryMutAct_9fa48("237") ? ["Stryker was here"] : (stryCov_9fa48("237"), []);
    for (const [selector, effect] of effects) {
      if (stryMutAct_9fa48("238")) {
        {}
      } else {
        stryCov_9fa48("238");
        if (stryMutAct_9fa48("241") ? !effect.hides && effect.paints : stryMutAct_9fa48("240") ? false : stryMutAct_9fa48("239") ? true : (stryCov_9fa48("239", "240", "241"), (stryMutAct_9fa48("242") ? effect.hides : (stryCov_9fa48("242"), !effect.hides)) || effect.paints)) continue;
        // The state that paints it back is the same selector focused from the
        // keyboard; a ring painted on any other state is one this selector does
        // not get when it is merely focused.
        if (stryMutAct_9fa48("245") ? effects.get(`${selector}:focus-visible`)?.paints === true : stryMutAct_9fa48("244") ? false : stryMutAct_9fa48("243") ? true : (stryCov_9fa48("243", "244", "245"), (stryMutAct_9fa48("246") ? effects.get(`${selector}:focus-visible`).paints : (stryCov_9fa48("246"), effects.get(stryMutAct_9fa48("247") ? `` : (stryCov_9fa48("247"), `${selector}:focus-visible`))?.paints)) !== (stryMutAct_9fa48("248") ? false : (stryCov_9fa48("248"), true)))) if (stryMutAct_9fa48("249")) {
          ;
        } else {
          stryCov_9fa48("249");
          hidden.push(selector);
        }
      }
    }
    return hidden;
  }
}