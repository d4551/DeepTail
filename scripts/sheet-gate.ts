/**
 * The rules a stylesheet is read against.
 *
 * No gate read a `.css` file at all: the ban gate and the inline-style gate
 * both parse scripts and markup, and the whole visual layer sat outside every
 * one of them. What that left unchecked was the design system itself — a
 * spacing value written out twenty-nine times, nine hand-rolled radii, a
 * stacking order written twice and racing itself, a breakpoint restated in
 * a second syntax in a second file, and a rule set duplicated byte for byte
 * fifty-five lines from its twin.
 *
 * The rules are stated about declarations, so the sheet is read the way the
 * engine reads it: a comment that names a length is prose, and the token
 * sheet is where the scale and the palette are defined. A value defines the
 * scale or the palette exactly when it is written on a custom property of
 * that one sheet; the same value on any other property, or in any other
 * sheet, is written out.
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
import { declarationOffences } from './sheet-declarations.ts';
import { deepSelectors, MAX_COMPOUNDS } from './sheet-depth.ts';
import { duplicateRulesets } from './sheet-duplicates.ts';
import { importOffences } from './sheet-imports.ts';
import { rulesetsOf, withoutComments } from './sheet-reader.ts';
export { deepSelectors, duplicateRulesets };

/**
 * The sheet where the scale and the palette are defined.
 *
 * Named by its whole path, not by its ending — and not exempt, either: every
 * rule in this file applies to it. What makes it the one sheet whose custom
 * properties may carry raw values is that those declarations are the
 * definitions the other sheets are read against; the same value on any other
 * property of this sheet, or in any other sheet at all, is written out. A gate
 * that exempted any file whose name ended `tokens.css` exempted a file anyone
 * could add: a sheet called `probe-tokens.css` carrying a float, a physical
 * margin, a raw hex colour, a static viewport height and a remote asset passed
 * every rule here whole, because of what it was called.
 */
export const TOKEN_SHEET = stryMutAct_9fa48("483") ? "" : (stryCov_9fa48("483"), 'apps/deeptail/src/styles/tokens.css');
export { STYLE_EXTENSIONS } from './extensions.ts';

/** A viewport size a media query switches layout on, in either syntax. */
// Layout switches at a size in either query family the sheets use: media for
// the document-level facts, container for a box the component fills. Both axes
// are read: a height breakpoint decides a layout exactly as a width one does,
// and while only widths were read a height could be restated in as many sheets
// as anyone liked with nothing to say so.
const BREAKPOINT = stryMutAct_9fa48("493") ? /@(?:media|container)[^{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\s*:)\s*(\D+px)/gu : stryMutAct_9fa48("492") ? /@(?:media|container)[^{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\s*:)\s*(\dpx)/gu : stryMutAct_9fa48("491") ? /@(?:media|container)[^{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\s*:)\S*(\d+px)/gu : stryMutAct_9fa48("490") ? /@(?:media|container)[^{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\s*:)\s(\d+px)/gu : stryMutAct_9fa48("489") ? /@(?:media|container)[^{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\S*:)\s*(\d+px)/gu : stryMutAct_9fa48("488") ? /@(?:media|container)[^{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\s:)\s*(\d+px)/gu : stryMutAct_9fa48("487") ? /@(?:media|container)[^{]*?\b(?:(?:width|height)\S*<=|max-(?:width|height)\s*:)\s*(\d+px)/gu : stryMutAct_9fa48("486") ? /@(?:media|container)[^{]*?\b(?:(?:width|height)\s<=|max-(?:width|height)\s*:)\s*(\d+px)/gu : stryMutAct_9fa48("485") ? /@(?:media|container)[{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\s*:)\s*(\d+px)/gu : stryMutAct_9fa48("484") ? /@(?:media|container)[^{]\b(?:(?:width|height)\s*<=|max-(?:width|height)\s*:)\s*(\d+px)/gu : (stryCov_9fa48("484", "485", "486", "487", "488", "489", "490", "491", "492", "493"), /@(?:media|container)[^{]*?\b(?:(?:width|height)\s*<=|max-(?:width|height)\s*:)\s*(\d+px)/gu);

/**
 * The at-rules the utility pipeline this product retired shipped in its sheets.
 *
 * `@apply` and its siblings compile away into the declarations a stylesheet
 * here states directly, so one of them marks a sheet written for a pipeline
 * the repository no longer runs — with a class vocabulary no gate reads. The
 * cascade layer CSS itself ships is untouched; only the pipeline's own names
 * are refused.
 */
const RETIRED_AT_RULES = stryMutAct_9fa48("495") ? /@(?:apply|tailwind|config|plugin|utility|variant|source|theme|screen|responsive|layer\S+utilities)\b/u : stryMutAct_9fa48("494") ? /@(?:apply|tailwind|config|plugin|utility|variant|source|theme|screen|responsive|layer\sutilities)\b/u : (stryCov_9fa48("494", "495"), /@(?:apply|tailwind|config|plugin|utility|variant|source|theme|screen|responsive|layer\s+utilities)\b/u);

/**
 * Every rule a sheet writes inside another rule.
 *
 * A nested rule rides its parent's scope, and the scoping it is doing — which
 * page, which state — is exactly what stops being reviewed when the rule is
 * read on its own. A selector at the top level states its own scope, so none
 * may ride on another's.
 *
 * Read from the brace structure, not from the `&` operator. CSS nesting needs
 * no `&` at all: `.a { .b { ... } }` is a nest, and while this rule looked for
 * the operator it was one keystroke to write a nest the gate said nothing
 * about — and, worse, a nest hid every declaration of its enclosing rule from
 * the reader that found rules by pattern.
 * @param text - the sheet's contents.
 * @returns one entry per nested rule, with its selector and line.
 */
function nestedSelectors(text: string): {
  readonly selector: string;
  readonly line: number;
}[] {
  if (stryMutAct_9fa48("496")) {
    {}
  } else {
    stryCov_9fa48("496");
    return stryMutAct_9fa48("497") ? rulesetsOf(text).map(rule => ({
      selector: rule.selector,
      line: rule.line
    })) : (stryCov_9fa48("497"), rulesetsOf(text).filter(stryMutAct_9fa48("498") ? () => undefined : (stryCov_9fa48("498"), rule => rule.nested)).map(stryMutAct_9fa48("499") ? () => undefined : (stryCov_9fa48("499"), rule => stryMutAct_9fa48("500") ? {} : (stryCov_9fa48("500"), {
      selector: rule.selector,
      line: rule.line
    }))));
  }
}

/**
 * Every line a sheet writes one of the retired at-rules on.
 * @param text - the sheet's contents, comments already blanked.
 * @returns one entry per retired at-rule, with its line.
 */
function retiredAtRules(text: string): {
  readonly rule: string;
  readonly line: number;
}[] {
  if (stryMutAct_9fa48("501")) {
    {}
  } else {
    stryCov_9fa48("501");
    const found: {
      rule: string;
      line: number;
    }[] = stryMutAct_9fa48("502") ? ["Stryker was here"] : (stryCov_9fa48("502"), []);
    const lines = text.split(stryMutAct_9fa48("503") ? "" : (stryCov_9fa48("503"), '\n'));
    for (const [index, line] of lines.entries()) {
      if (stryMutAct_9fa48("504")) {
        {}
      } else {
        stryCov_9fa48("504");
        const match = RETIRED_AT_RULES.exec(line);
        if (stryMutAct_9fa48("507") ? match === null : stryMutAct_9fa48("506") ? false : stryMutAct_9fa48("505") ? true : (stryCov_9fa48("505", "506", "507"), match !== null)) found.push(stryMutAct_9fa48("509") ? {} : (stryCov_9fa48("509"), {
          rule: match[0],
          line: stryMutAct_9fa48("510") ? index - 1 : (stryCov_9fa48("510"), index + 1)
        }));
      }
    }
    return found;
  }
}

/**
 * Every rule a stylesheet breaks.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per rejected construct.
 */
export function scanSheet(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("511")) {
    {}
  } else {
    stryCov_9fa48("511");
    const blanked = withoutComments(text);
    const offences: Offence[] = stryMutAct_9fa48("512") ? [] : (stryCov_9fa48("512"), [...duplicateRulesets(label, text)]);
    for (const deep of deepSelectors(text)) {
      if (stryMutAct_9fa48("513")) {
        {}
      } else {
        stryCov_9fa48("513");
        offences.push(stryMutAct_9fa48("515") ? {} : (stryCov_9fa48("515"), {
          label,
          line: deep.line,
          why: stryMutAct_9fa48("516") ? `` : (stryCov_9fa48("516"), `${deep.selector} chains past ${String(MAX_COMPOUNDS)} compounds; scope the rule by class instead of structure`)
        }));
      }
    }
    for (const nested of nestedSelectors(text)) {
      if (stryMutAct_9fa48("517")) {
        {}
      } else {
        stryCov_9fa48("517");
        offences.push(stryMutAct_9fa48("519") ? {} : (stryCov_9fa48("519"), {
          label,
          line: nested.line,
          why: stryMutAct_9fa48("520") ? `` : (stryCov_9fa48("520"), `${nested.selector} rides another rule's scope; state the selector at the top level`)
        }));
      }
    }
    for (const retired of retiredAtRules(blanked)) {
      if (stryMutAct_9fa48("521")) {
        {}
      } else {
        stryCov_9fa48("521");
        offences.push(stryMutAct_9fa48("523") ? {} : (stryCov_9fa48("523"), {
          label,
          line: retired.line,
          why: stryMutAct_9fa48("524") ? `` : (stryCov_9fa48("524"), `${retired.rule} belongs to the utility pipeline this product retired; state the declarations directly`)
        }));
      }
    }
    offences.push(...importOffences(label, blanked), ...declarationOffences(label, blanked, stryMutAct_9fa48("528") ? label !== TOKEN_SHEET : stryMutAct_9fa48("527") ? false : stryMutAct_9fa48("526") ? true : (stryCov_9fa48("526", "527", "528"), label === TOKEN_SHEET)));
    return offences;
  }
}

/**
 * Every viewport size a sheet switches its layout at, on either axis.
 *
 * Both syntaxes are read. A gate that knew only the range form reported one
 * breakpoint while a second sat in the other form, in another sheet, deciding
 * another layout — and the invariant it claimed to hold, that the number is
 * written in exactly one place, was false as shipped. Heights are read for the
 * same reason: the drawer's chrome yields at a height, and a number that
 * decides a layout is one decision wherever it is written.
 * @param text - the sheet's contents.
 * @returns the sizes, in the order they are written.
 */
export function breakpointsOf(text: string): string[] {
  if (stryMutAct_9fa48("529")) {
    {}
  } else {
    stryCov_9fa48("529");
    // Every captured group of every match, which is one group: reading it by
    // index needs a guard for a case the pattern cannot produce.
    return (stryMutAct_9fa48("530") ? [] : (stryCov_9fa48("530"), [...text.matchAll(BREAKPOINT)])).flatMap(stryMutAct_9fa48("531") ? () => undefined : (stryCov_9fa48("531"), found => stryMutAct_9fa48("532") ? [...found] : (stryCov_9fa48("532"), (stryMutAct_9fa48("533") ? [] : (stryCov_9fa48("533"), [...found])).slice(1))));
  }
}