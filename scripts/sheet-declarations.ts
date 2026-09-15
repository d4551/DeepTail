/**
 * The rules one declaration is read against.
 *
 * Split from `sheet-gate.ts` when it outgrew the size its own rules allow a
 * file to reach. The split is along a real seam: everything here reads a
 * single declaration — its property, or its value — while what is left there
 * reads the sheet as a whole, its blocks, its nests and its at-rules.
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
import { scanColour } from './colour-gate.ts';
import type { Offence } from './offence.ts';
import { declarationsOf } from './sheet-reader.ts';

/**
 * Lengths any sheet may write.
 *
 * A hairline and a focus ring are drawn, not spaced: they are one device pixel
 * and two, at every density and every scale, and naming them would be naming
 * the same number twice. Everything else is a spacing, radius or type decision
 * and belongs to the scale.
 */
export const DRAWN_LENGTHS: ReadonlySet<string> = new Set(stryMutAct_9fa48("274") ? [] : (stryCov_9fa48("274"), [stryMutAct_9fa48("275") ? "" : (stryCov_9fa48("275"), '0px'), stryMutAct_9fa48("276") ? "" : (stryCov_9fa48("276"), '1px'), stryMutAct_9fa48("277") ? "" : (stryCov_9fa48("277"), '2px'), stryMutAct_9fa48("278") ? "" : (stryCov_9fa48("278"), '3px')]));

/** A stacking order written as a bare number. */
const STACKING = stryMutAct_9fa48("283") ? /^-?\D+$/u : stryMutAct_9fa48("282") ? /^-?\d$/u : stryMutAct_9fa48("281") ? /^-\d+$/u : stryMutAct_9fa48("280") ? /^-?\d+/u : stryMutAct_9fa48("279") ? /-?\d+$/u : (stryCov_9fa48("279", "280", "281", "282", "283"), /^-?\d+$/u);

/** A `url()` that loads from outside the shipped bundle. */
// No `g` flag: this is tested with RegExp.test across declarations, and a
// global regex keeps lastIndex between calls, so one match would hide the next.
const REMOTE_URL_VALUE = stryMutAct_9fa48("289") ? /url\(\s*["']?(?:https:)?\/\//iu : stryMutAct_9fa48("288") ? /url\(\s*["']?(?:https?:)\/\//iu : stryMutAct_9fa48("287") ? /url\(\s*[^"']?(?:https?:)?\/\//iu : stryMutAct_9fa48("286") ? /url\(\s*["'](?:https?:)?\/\//iu : stryMutAct_9fa48("285") ? /url\(\S*["']?(?:https?:)?\/\//iu : stryMutAct_9fa48("284") ? /url\(\s["']?(?:https?:)?\/\//iu : (stryCov_9fa48("284", "285", "286", "287", "288", "289"), /url\(\s*["']?(?:https?:)?\/\//iu);

/**
 * The viewport units that report a box the reader cannot see.
 *
 * `vh` is the *large* viewport: on a mobile browser it is measured as though
 * the retractable chrome were retracted, so a box sized by it is taller than
 * what is on screen whenever the chrome is showing, and its tail is unreachable
 * — the menu's pinned footer sat exactly there. `vw` has the same shape of
 * problem with a classic scrollbar. The dynamic units (`dvh`, `dvw`) track what
 * is actually visible, and `svh`/`lvh` name a specific end of that range on
 * purpose, so all of those are allowed and only the two that quietly lie are
 * refused.
 */
const STATIC_VIEWPORT_UNIT = stryMutAct_9fa48("294") ? /\b\d+(?:\.\D+)?(vh|vw)\b/u : stryMutAct_9fa48("293") ? /\b\d+(?:\.\d)?(vh|vw)\b/u : stryMutAct_9fa48("292") ? /\b\d+(?:\.\d+)(vh|vw)\b/u : stryMutAct_9fa48("291") ? /\b\D+(?:\.\d+)?(vh|vw)\b/u : stryMutAct_9fa48("290") ? /\b\d(?:\.\d+)?(vh|vw)\b/u : (stryCov_9fa48("290", "291", "292", "293", "294"), /\b\d+(?:\.\d+)?(vh|vw)\b/u);

/** A length written as a number of pixels. */
const PIXELS = stryMutAct_9fa48("296") ? /\b\D+px\b/gu : stryMutAct_9fa48("295") ? /\b\dpx\b/gu : (stryCov_9fa48("295", "296"), /\b\d+px\b/gu);

/** Properties whose lengths are spacing, radius or type decisions. */
const SCALED = new RegExp((stryMutAct_9fa48("297") ? "" : (stryCov_9fa48("297"), '^(margin|padding|gap|row-gap|column-gap|inset|top|right|bottom|left')) + (stryMutAct_9fa48("298") ? "" : (stryCov_9fa48("298"), '|margin-(top|right|bottom|left|block|inline)(-start|-end)?')) + (stryMutAct_9fa48("299") ? "" : (stryCov_9fa48("299"), '|padding-(top|right|bottom|left|block|inline)(-start|-end)?')) + (stryMutAct_9fa48("300") ? "" : (stryCov_9fa48("300"), '|inset-(block|inline)(-start|-end)?')) + (stryMutAct_9fa48("301") ? "" : (stryCov_9fa48("301"), '|(min-|max-)?(width|height)|(min-|max-)?(block|inline)-size')) + (stryMutAct_9fa48("302") ? "" : (stryCov_9fa48("302"), '|border-radius|font-size|line-height|grid-template-columns|grid-template-rows')) + (stryMutAct_9fa48("303") ? "" : (stryCov_9fa48("303"), '|scroll-margin|scroll-padding)$')), stryMutAct_9fa48("304") ? "" : (stryCov_9fa48("304"), 'u'));

/**
 * The physical side properties, which break when the document direction
 * reverses.
 *
 * A sheet written with left and right sides is a sheet that only reads
 * correctly in one writing mode: the logical start/end spellings follow the
 * direction, so they are the only side spellings a sheet may use.
 */
export const PHYSICAL_SIDES: ReadonlySet<string> = new Set(stryMutAct_9fa48("305") ? [] : (stryCov_9fa48("305"), [stryMutAct_9fa48("306") ? "" : (stryCov_9fa48("306"), 'margin-left'), stryMutAct_9fa48("307") ? "" : (stryCov_9fa48("307"), 'margin-right'), stryMutAct_9fa48("308") ? "" : (stryCov_9fa48("308"), 'padding-left'), stryMutAct_9fa48("309") ? "" : (stryCov_9fa48("309"), 'padding-right'), stryMutAct_9fa48("310") ? "" : (stryCov_9fa48("310"), 'border-left'), stryMutAct_9fa48("311") ? "" : (stryCov_9fa48("311"), 'border-right'), stryMutAct_9fa48("312") ? "" : (stryCov_9fa48("312"), 'border-left-width'), stryMutAct_9fa48("313") ? "" : (stryCov_9fa48("313"), 'border-right-width'), stryMutAct_9fa48("314") ? "" : (stryCov_9fa48("314"), 'border-left-color'), stryMutAct_9fa48("315") ? "" : (stryCov_9fa48("315"), 'border-right-color'), stryMutAct_9fa48("316") ? "" : (stryCov_9fa48("316"), 'border-left-style'), stryMutAct_9fa48("317") ? "" : (stryCov_9fa48("317"), 'border-right-style'), stryMutAct_9fa48("318") ? "" : (stryCov_9fa48("318"), 'left'), stryMutAct_9fa48("319") ? "" : (stryCov_9fa48("319"), 'right')]));

/**
 * The rules that are about which property a declaration writes.
 *
 * These read the property name, so a custom property — which names a value
 * rather than a box — is not one of them, and asks its own question below.
 * @param label - the path to report offences under.
 * @param property - the property being written.
 * @param value - what it is set to.
 * @param line - the line it is written on.
 * @returns the offences, or an empty list.
 */
function propertyOffences(label: string, property: string, value: string, line: number): Offence[] {
  if (stryMutAct_9fa48("320")) {
    {}
  } else {
    stryCov_9fa48("320");
    if (stryMutAct_9fa48("323") ? property !== 'z-index' : stryMutAct_9fa48("322") ? false : stryMutAct_9fa48("321") ? true : (stryCov_9fa48("321", "322", "323"), property === (stryMutAct_9fa48("324") ? "" : (stryCov_9fa48("324"), 'z-index')))) {
      if (stryMutAct_9fa48("325")) {
        {}
      } else {
        stryCov_9fa48("325");
        return STACKING.test(value) ? stryMutAct_9fa48("326") ? [] : (stryCov_9fa48("326"), [stryMutAct_9fa48("327") ? {} : (stryCov_9fa48("327"), {
          label,
          line,
          why: stryMutAct_9fa48("328") ? "" : (stryCov_9fa48("328"), 'a stacking order belongs to the z-index scale in tokens.css')
        })]) : stryMutAct_9fa48("329") ? ["Stryker was here"] : (stryCov_9fa48("329"), []);
      }
    }
    if (stryMutAct_9fa48("332") ? property !== 'float' : stryMutAct_9fa48("331") ? false : stryMutAct_9fa48("330") ? true : (stryCov_9fa48("330", "331", "332"), property === (stryMutAct_9fa48("333") ? "" : (stryCov_9fa48("333"), 'float')))) return stryMutAct_9fa48("334") ? [] : (stryCov_9fa48("334"), [stryMutAct_9fa48("335") ? {} : (stryCov_9fa48("335"), {
      label,
      line,
      why: stryMutAct_9fa48("336") ? "" : (stryCov_9fa48("336"), 'float is legacy layout; use flex or grid')
    })]);
    if (stryMutAct_9fa48("338") ? false : stryMutAct_9fa48("337") ? true : (stryCov_9fa48("337", "338"), PHYSICAL_SIDES.has(property))) {
      if (stryMutAct_9fa48("339")) {
        {}
      } else {
        stryCov_9fa48("339");
        return stryMutAct_9fa48("340") ? [] : (stryCov_9fa48("340"), [stryMutAct_9fa48("341") ? {} : (stryCov_9fa48("341"), {
          label,
          line,
          why: stryMutAct_9fa48("342") ? `` : (stryCov_9fa48("342"), `${property} is a physical side; use the logical start or end spelling so the direction follows the writing mode`)
        })]);
      }
    }
    if (stryMutAct_9fa48("345") ? property === 'text-align' || value.includes('justify') || value === 'left' || value === 'right' : stryMutAct_9fa48("344") ? false : stryMutAct_9fa48("343") ? true : (stryCov_9fa48("343", "344", "345"), (stryMutAct_9fa48("347") ? property !== 'text-align' : stryMutAct_9fa48("346") ? true : (stryCov_9fa48("346", "347"), property === (stryMutAct_9fa48("348") ? "" : (stryCov_9fa48("348"), 'text-align')))) && (stryMutAct_9fa48("350") ? (value.includes('justify') || value === 'left') && value === 'right' : stryMutAct_9fa48("349") ? true : (stryCov_9fa48("349", "350"), (stryMutAct_9fa48("352") ? value.includes('justify') && value === 'left' : stryMutAct_9fa48("351") ? false : (stryCov_9fa48("351", "352"), value.includes(stryMutAct_9fa48("353") ? "" : (stryCov_9fa48("353"), 'justify')) || (stryMutAct_9fa48("355") ? value !== 'left' : stryMutAct_9fa48("354") ? false : (stryCov_9fa48("354", "355"), value === (stryMutAct_9fa48("356") ? "" : (stryCov_9fa48("356"), 'left')))))) || (stryMutAct_9fa48("358") ? value !== 'right' : stryMutAct_9fa48("357") ? false : (stryCov_9fa48("357", "358"), value === (stryMutAct_9fa48("359") ? "" : (stryCov_9fa48("359"), 'right')))))))) {
      if (stryMutAct_9fa48("360")) {
        {}
      } else {
        stryCov_9fa48("360");
        return stryMutAct_9fa48("361") ? [] : (stryCov_9fa48("361"), [stryMutAct_9fa48("362") ? {} : (stryCov_9fa48("362"), {
          label,
          line,
          why: stryMutAct_9fa48("363") ? "" : (stryCov_9fa48("363"), 'justified or physical text alignment is an alignment defect; use text-align start or end')
        })]);
      }
    }
    return scaledLengthOffences(label, property, value, line);
  }
}

/**
 * The rules that are about what a declaration's value says.
 *
 * Every declaration answers these, custom properties included. While they did
 * not, a custom property was a way past every rule in this file at once: the
 * engine substitutes the value wherever it is read, so `--x: 100vh` is a static
 * viewport height, `--x: #ff0000` is a raw colour and `--x: 37px` is a length
 * off the scale, each of them exactly as much so as writing it in place.
 * @param label - the path to report offences under.
 * @param value - what the property is set to.
 * @param line - the line it is written on.
 * @param paletteDefinition - whether this declaration is one of the palette's
 * own definitions, which is the one place a colour function states the palette
 * rather than second-guessing it.
 * @returns the offences, or an empty list.
 */
function valueOffences(label: string, value: string, line: number, paletteDefinition: boolean): Offence[] {
  if (stryMutAct_9fa48("364")) {
    {}
  } else {
    stryCov_9fa48("364");
    const offences: Offence[] = stryMutAct_9fa48("365") ? ["Stryker was here"] : (stryCov_9fa48("365"), []);
    const viewportUnit = STATIC_VIEWPORT_UNIT.exec(value);
    if (stryMutAct_9fa48("368") ? viewportUnit === null : stryMutAct_9fa48("367") ? false : stryMutAct_9fa48("366") ? true : (stryCov_9fa48("366", "367", "368"), viewportUnit !== null)) {
      if (stryMutAct_9fa48("369")) {
        {}
      } else {
        stryCov_9fa48("369");
        offences.push(stryMutAct_9fa48("371") ? {} : (stryCov_9fa48("371"), {
          label,
          line,
          // The dynamic spelling is the static one with a `d` in front, read off
          // what was found rather than off a capture that has to be defended
          // against being absent when the pattern cannot leave it so.
          why: stryMutAct_9fa48("372") ? `` : (stryCov_9fa48("372"), `${viewportUnit[0]} is measured against a viewport the reader may not have; use the dynamic unit d${stryMutAct_9fa48("373") ? viewportUnit[0] : (stryCov_9fa48("373"), viewportUnit[0].slice(stryMutAct_9fa48("374") ? +2 : (stryCov_9fa48("374"), -2)))}`)
        }));
      }
    }
    if (stryMutAct_9fa48("376") ? false : stryMutAct_9fa48("375") ? true : (stryCov_9fa48("375", "376"), REMOTE_URL_VALUE.test(value))) {
      if (stryMutAct_9fa48("377")) {
        {}
      } else {
        stryCov_9fa48("377");
        offences.push(stryMutAct_9fa48("379") ? {} : (stryCov_9fa48("379"), {
          label,
          line,
          why: stryMutAct_9fa48("380") ? "" : (stryCov_9fa48("380"), 'a remote URL loads an asset no local install ships; ship the asset in the bundle')
        }));
      }
    }
    if (stryMutAct_9fa48("381")) {
      ;
    } else {
      stryCov_9fa48("381");
      offences.push(...scanColour(label, value, line, paletteDefinition));
    }
    return offences;
  }
}

/**
 * Every declaration a sheet writes that it may not write.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents, comments already blanked.
 * @param defines - whether this sheet is the one whose custom properties
 * define the scale and the palette. A pixel length or a colour function on a
 * custom property of that sheet states the scale or the palette; the same
 * value on any other property of any sheet is a decision made outside the one
 * place that owns it.
 * @returns one offence per rejected declaration.
 */
export function declarationOffences(label: string, text: string, defines: boolean): Offence[] {
  if (stryMutAct_9fa48("382")) {
    {}
  } else {
    stryCov_9fa48("382");
    const offences: Offence[] = stryMutAct_9fa48("383") ? ["Stryker was here"] : (stryCov_9fa48("383"), []);
    for (const {
      property,
      value,
      line
    } of declarationsOf(text)) {
      if (stryMutAct_9fa48("384")) {
        {}
      } else {
        stryCov_9fa48("384");
        const custom = stryMutAct_9fa48("385") ? property.endsWith('--') : (stryCov_9fa48("385"), property.startsWith(stryMutAct_9fa48("386") ? "" : (stryCov_9fa48("386"), '--')));
        offences.push(...valueOffences(label, value, line, stryMutAct_9fa48("390") ? defines || custom : stryMutAct_9fa48("389") ? false : stryMutAct_9fa48("388") ? true : (stryCov_9fa48("388", "389", "390"), defines && custom)));
        if (stryMutAct_9fa48("392") ? false : stryMutAct_9fa48("391") ? true : (stryCov_9fa48("391", "392"), custom)) {
          if (stryMutAct_9fa48("393")) {
            {}
          } else {
            stryCov_9fa48("393");
            // A custom property names a value, so no property rule reads it; the
            // length it holds is still a length, and outside the sheet that defines
            // the scale it is one written out rather than read from it.
            const lengths = stryMutAct_9fa48("394") ? [...value.matchAll(PIXELS)].map(found => found[0]) : (stryCov_9fa48("394"), (stryMutAct_9fa48("395") ? [] : (stryCov_9fa48("395"), [...value.matchAll(PIXELS)])).map(stryMutAct_9fa48("396") ? () => undefined : (stryCov_9fa48("396"), found => found[0])).filter(stryMutAct_9fa48("397") ? () => undefined : (stryCov_9fa48("397"), px => stryMutAct_9fa48("398") ? DRAWN_LENGTHS.has(px) : (stryCov_9fa48("398"), !DRAWN_LENGTHS.has(px)))));
            if (stryMutAct_9fa48("401") ? lengths.length > 0 || !defines : stryMutAct_9fa48("400") ? false : stryMutAct_9fa48("399") ? true : (stryCov_9fa48("399", "400", "401"), (stryMutAct_9fa48("404") ? lengths.length <= 0 : stryMutAct_9fa48("403") ? lengths.length >= 0 : stryMutAct_9fa48("402") ? true : (stryCov_9fa48("402", "403", "404"), lengths.length > 0)) && (stryMutAct_9fa48("405") ? defines : (stryCov_9fa48("405"), !defines)))) {
              if (stryMutAct_9fa48("406")) {
                {}
              } else {
                stryCov_9fa48("406");
                offences.push(stryMutAct_9fa48("408") ? {} : (stryCov_9fa48("408"), {
                  label,
                  line,
                  why: stryMutAct_9fa48("409") ? `` : (stryCov_9fa48("409"), `${lengths.join(stryMutAct_9fa48("410") ? "" : (stryCov_9fa48("410"), ', '))} is written out rather than read from the scale in tokens.css`)
                }));
              }
            }
            continue;
          }
        }
        if (stryMutAct_9fa48("411")) {
          ;
        } else {
          stryCov_9fa48("411");
          offences.push(...propertyOffences(label, property, value, line));
        }
      }
    }
    return offences;
  }
}
function scaledLengthOffences(label: string, property: string, value: string, line: number): Offence[] {
  if (stryMutAct_9fa48("412")) {
    {}
  } else {
    stryCov_9fa48("412");
    if (stryMutAct_9fa48("415") ? false : stryMutAct_9fa48("414") ? true : stryMutAct_9fa48("413") ? SCALED.test(property) : (stryCov_9fa48("413", "414", "415"), !SCALED.test(property))) return stryMutAct_9fa48("416") ? ["Stryker was here"] : (stryCov_9fa48("416"), []);
    const lengths = stryMutAct_9fa48("417") ? [...value.matchAll(PIXELS)].map(found => found[0]) : (stryCov_9fa48("417"), (stryMutAct_9fa48("418") ? [] : (stryCov_9fa48("418"), [...value.matchAll(PIXELS)])).map(stryMutAct_9fa48("419") ? () => undefined : (stryCov_9fa48("419"), found => found[0])).filter(stryMutAct_9fa48("420") ? () => undefined : (stryCov_9fa48("420"), px => stryMutAct_9fa48("421") ? DRAWN_LENGTHS.has(px) : (stryCov_9fa48("421"), !DRAWN_LENGTHS.has(px)))));
    if (stryMutAct_9fa48("424") ? lengths.length !== 0 : stryMutAct_9fa48("423") ? false : stryMutAct_9fa48("422") ? true : (stryCov_9fa48("422", "423", "424"), lengths.length === 0)) return stryMutAct_9fa48("425") ? ["Stryker was here"] : (stryCov_9fa48("425"), []);
    if (stryMutAct_9fa48("428") ? property === 'grid-template-columns' && property === 'grid-template-rows' : stryMutAct_9fa48("427") ? false : stryMutAct_9fa48("426") ? true : (stryCov_9fa48("426", "427", "428"), (stryMutAct_9fa48("430") ? property !== 'grid-template-columns' : stryMutAct_9fa48("429") ? false : (stryCov_9fa48("429", "430"), property === (stryMutAct_9fa48("431") ? "" : (stryCov_9fa48("431"), 'grid-template-columns')))) || (stryMutAct_9fa48("433") ? property !== 'grid-template-rows' : stryMutAct_9fa48("432") ? false : (stryCov_9fa48("432", "433"), property === (stryMutAct_9fa48("434") ? "" : (stryCov_9fa48("434"), 'grid-template-rows')))))) {
      if (stryMutAct_9fa48("435")) {
        {}
      } else {
        stryCov_9fa48("435");
        return stryMutAct_9fa48("436") ? [] : (stryCov_9fa48("436"), [stryMutAct_9fa48("437") ? {} : (stryCov_9fa48("437"), {
          label,
          line,
          why: stryMutAct_9fa48("438") ? `` : (stryCov_9fa48("438"), `hardcoded-grid: ${lengths.join(stryMutAct_9fa48("439") ? "" : (stryCov_9fa48("439"), ', '))} in ${property} belongs to the scale in tokens.css`)
        })]);
      }
    }
    return stryMutAct_9fa48("440") ? [] : (stryCov_9fa48("440"), [stryMutAct_9fa48("441") ? {} : (stryCov_9fa48("441"), {
      label,
      line,
      why: stryMutAct_9fa48("442") ? `` : (stryCov_9fa48("442"), `${lengths.join(stryMutAct_9fa48("443") ? "" : (stryCov_9fa48("443"), ', '))} is written out rather than read from the scale in tokens.css`)
    })]);
  }
}