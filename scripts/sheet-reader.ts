/**
 * The reader a stylesheet is parsed with.
 *
 * Reading a sheet is its own concern: the rules a gate states are stated about
 * declarations and rules, and the same read — comments blanked with offsets
 * preserved, blocks found by following the braces — serves every gate that
 * walks a sheet. Keeping the read here is what keeps one gate's notion of
 * "a rule" from drifting from another's.
 *
 * The read follows brace depth rather than matching innermost brace pairs.
 * A pattern match cannot see a nest: it found the inner rule and swallowed
 * everything before it — the enclosing rule's own declarations included — as
 * part of a selector. So `.a { float: left; .b { color: red } }` reported the
 * nested colour and nothing about the float, and the depth rule read the whole
 * swallowed run as one selector. Nesting is CSS's own syntax, needs no `&`,
 * and was therefore a way past every declaration rule in the gate.
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

/** Where a comment opens and closes. */
const COMMENTS = stryMutAct_9fa48("578") ? /\/\*[\s\s]*?\*\//gu : stryMutAct_9fa48("577") ? /\/\*[\S\S]*?\*\//gu : stryMutAct_9fa48("576") ? /\/\*[^\s\S]*?\*\//gu : stryMutAct_9fa48("575") ? /\/\*[\s\S]\*\//gu : (stryCov_9fa48("575", "576", "577", "578"), /\/\*[\s\S]*?\*\//gu);

/** A class selector: a dot and the compound token that names the class. */
const CLASS_TOKEN = stryMutAct_9fa48("581") ? /\.([a-zA-Z][^a-zA-Z0-9-]*)/gu : stryMutAct_9fa48("580") ? /\.([a-zA-Z][a-zA-Z0-9-])/gu : stryMutAct_9fa48("579") ? /\.([^a-zA-Z][a-zA-Z0-9-]*)/gu : (stryCov_9fa48("579", "580", "581"), /\.([a-zA-Z][a-zA-Z0-9-]*)/gu);

/**
 * The sheet with its comments blanked out, offsets preserved.
 *
 * A comment that names a length is prose about the design, not a decision, and
 * a selector written inside one is an example rather than a rule. Blanking
 * rather than deleting keeps every offset, so a line number stays true.
 * @param text - the sheet's contents.
 * @returns the sheet, same length, comments replaced by spaces.
 */
export function withoutComments(text: string): string {
  if (stryMutAct_9fa48("582")) {
    {}
  } else {
    stryCov_9fa48("582");
    return text.replaceAll(COMMENTS, stryMutAct_9fa48("583") ? () => undefined : (stryCov_9fa48("583"), comment => comment.replaceAll(stryMutAct_9fa48("584") ? /[\n]/gu : (stryCov_9fa48("584"), /[^\n]/gu), stryMutAct_9fa48("585") ? "" : (stryCov_9fa48("585"), ' '))));
  }
}

/**
 * One declaration, and where it was written.
 *
 * Read out of the block's body rather than off a line, because one declaration
 * per line is a formatting convention, not a fact: a sheet written or minified
 * onto one line is still a sheet, and a gate that reads lines sees nothing in
 * it at all.
 */
export interface Declaration {
  /** The property name, lower case. */
  readonly property: string;
  /** Everything after the colon, trimmed. */
  readonly value: string;
  /** One-based line the declaration is written on. */
  readonly line: number;
}

/** One brace-delimited block, and what it holds directly. */
export interface Block {
  /** The text before the brace: a selector list, or an at-rule prelude. */
  readonly prelude: string;
  /** One-based line the prelude starts on. */
  readonly line: number;
  /** Whether the prelude opens an at-rule rather than a style rule. */
  readonly atRule: boolean;
  /** Whether a style rule encloses this block, which makes it a nested one. */
  readonly nested: boolean;
  /** The declarations written directly in this block, in source order. */
  readonly declarations: readonly Declaration[];
}

/** A block being read: the same block, while its declarations still arrive. */
interface OpenBlock extends Block {
  readonly declarations: Declaration[];
}

/**
 * Read one declaration out of a segment between separators.
 * @param text - the whole sheet.
 * @param from - where the segment starts.
 * @param to - where it ends.
 * @param line - the line reader.
 * @returns the declaration, or undefined when the segment holds none.
 */
function declarationIn(text: string, from: number, to: number, line: (offset: number) => number): Declaration | undefined {
  if (stryMutAct_9fa48("586")) {
    {}
  } else {
    stryCov_9fa48("586");
    const segment = stryMutAct_9fa48("587") ? text : (stryCov_9fa48("587"), text.slice(from, to));
    const colon = segment.indexOf(stryMutAct_9fa48("588") ? "" : (stryCov_9fa48("588"), ':'));
    if (stryMutAct_9fa48("591") ? colon !== -1 : stryMutAct_9fa48("590") ? false : stryMutAct_9fa48("589") ? true : (stryCov_9fa48("589", "590", "591"), colon === (stryMutAct_9fa48("592") ? +1 : (stryCov_9fa48("592"), -1)))) return undefined;
    const property = stryMutAct_9fa48("595") ? segment.trim().toLowerCase() : stryMutAct_9fa48("594") ? segment.slice(0, colon).toLowerCase() : stryMutAct_9fa48("593") ? segment.slice(0, colon).trim().toUpperCase() : (stryCov_9fa48("593", "594", "595"), segment.slice(0, colon).trim().toLowerCase());
    const value = stryMutAct_9fa48("597") ? segment.trim() : stryMutAct_9fa48("596") ? segment.slice(colon + 1) : (stryCov_9fa48("596", "597"), segment.slice(stryMutAct_9fa48("598") ? colon - 1 : (stryCov_9fa48("598"), colon + 1)).trim());
    if (stryMutAct_9fa48("601") ? property === '' && value === '' : stryMutAct_9fa48("600") ? false : stryMutAct_9fa48("599") ? true : (stryCov_9fa48("599", "600", "601"), (stryMutAct_9fa48("603") ? property !== '' : stryMutAct_9fa48("602") ? false : (stryCov_9fa48("602", "603"), property === (stryMutAct_9fa48("604") ? "Stryker was here!" : (stryCov_9fa48("604"), '')))) || (stryMutAct_9fa48("606") ? value !== '' : stryMutAct_9fa48("605") ? false : (stryCov_9fa48("605", "606"), value === (stryMutAct_9fa48("607") ? "Stryker was here!" : (stryCov_9fa48("607"), '')))))) return undefined;
    return stryMutAct_9fa48("608") ? {} : (stryCov_9fa48("608"), {
      property,
      value,
      line: line(stryMutAct_9fa48("609") ? from - segment.indexOf(property) : (stryCov_9fa48("609"), from + segment.indexOf(property)))
    });
  }
}

/**
 * Where a quoted string ends, so its braces and semicolons are not read as
 * syntax.
 * @param text - the whole sheet.
 * @param start - the offset of the opening quote.
 * @returns the offset just past the closing quote.
 */
function endOfString(text: string, start: number): number {
  if (stryMutAct_9fa48("610")) {
    {}
  } else {
    stryCov_9fa48("610");
    const quote = text[start];
    for (let index = stryMutAct_9fa48("611") ? start - 1 : (stryCov_9fa48("611"), start + 1); stryMutAct_9fa48("614") ? index >= text.length : stryMutAct_9fa48("613") ? index <= text.length : stryMutAct_9fa48("612") ? false : (stryCov_9fa48("612", "613", "614"), index < text.length); stryMutAct_9fa48("615") ? index -= 1 : (stryCov_9fa48("615"), index += 1)) {
      if (stryMutAct_9fa48("616")) {
        {}
      } else {
        stryCov_9fa48("616");
        if (stryMutAct_9fa48("619") ? text[index] !== '\\' : stryMutAct_9fa48("618") ? false : stryMutAct_9fa48("617") ? true : (stryCov_9fa48("617", "618", "619"), text[index] === (stryMutAct_9fa48("620") ? "" : (stryCov_9fa48("620"), '\\')))) stryMutAct_9fa48("621") ? index -= 1 : (stryCov_9fa48("621"), index += 1);else if (stryMutAct_9fa48("624") ? text[index] !== quote : stryMutAct_9fa48("623") ? false : stryMutAct_9fa48("622") ? true : (stryCov_9fa48("622", "623", "624"), text[index] === quote)) return stryMutAct_9fa48("625") ? index - 1 : (stryCov_9fa48("625"), index + 1);
      }
    }
    return text.length;
  }
}

/** What one walk of a sheet found. */
interface Read {
  /** Every block, in the order they open. */
  readonly blocks: Block[];
  /** Every declaration, in source order, whatever block it sits in. */
  readonly declarations: Declaration[];
}

/**
 * Walk a sheet's braces, collecting its blocks and its declarations.
 *
 * One walk serves both readers, so a block and a declaration can never be
 * found by two different notions of where a rule ends.
 * @param text - the sheet's contents.
 * @returns the blocks and the declarations.
 */
function scan(text: string): Read {
  if (stryMutAct_9fa48("626")) {
    {}
  } else {
    stryCov_9fa48("626");
    const sheet = withoutComments(text);
    const line = lineReader(sheet);
    const stack: OpenBlock[] = stryMutAct_9fa48("627") ? ["Stryker was here"] : (stryCov_9fa48("627"), []);
    const read: Read = stryMutAct_9fa48("628") ? {} : (stryCov_9fa48("628"), {
      blocks: stryMutAct_9fa48("629") ? ["Stryker was here"] : (stryCov_9fa48("629"), []),
      declarations: stryMutAct_9fa48("630") ? ["Stryker was here"] : (stryCov_9fa48("630"), [])
    });
    let segment = 0;
    for (let index = 0; stryMutAct_9fa48("633") ? index >= sheet.length : stryMutAct_9fa48("632") ? index <= sheet.length : stryMutAct_9fa48("631") ? false : (stryCov_9fa48("631", "632", "633"), index < sheet.length); stryMutAct_9fa48("634") ? index -= 1 : (stryCov_9fa48("634"), index += 1)) {
      if (stryMutAct_9fa48("635")) {
        {}
      } else {
        stryCov_9fa48("635");
        const character = sheet[index];
        if (stryMutAct_9fa48("638") ? character === '"' && character === "'" : stryMutAct_9fa48("637") ? false : stryMutAct_9fa48("636") ? true : (stryCov_9fa48("636", "637", "638"), (stryMutAct_9fa48("640") ? character !== '"' : stryMutAct_9fa48("639") ? false : (stryCov_9fa48("639", "640"), character === (stryMutAct_9fa48("641") ? "" : (stryCov_9fa48("641"), '"')))) || (stryMutAct_9fa48("643") ? character !== "'" : stryMutAct_9fa48("642") ? false : (stryCov_9fa48("642", "643"), character === (stryMutAct_9fa48("644") ? "" : (stryCov_9fa48("644"), "'")))))) {
          if (stryMutAct_9fa48("645")) {
            {}
          } else {
            stryCov_9fa48("645");
            index = stryMutAct_9fa48("646") ? endOfString(sheet, index) + 1 : (stryCov_9fa48("646"), endOfString(sheet, index) - 1);
            continue;
          }
        }
        if (stryMutAct_9fa48("649") ? character !== '{' : stryMutAct_9fa48("648") ? false : stryMutAct_9fa48("647") ? true : (stryCov_9fa48("647", "648", "649"), character === (stryMutAct_9fa48("650") ? "" : (stryCov_9fa48("650"), '{')))) {
          if (stryMutAct_9fa48("651")) {
            {}
          } else {
            stryCov_9fa48("651");
            const prelude = stryMutAct_9fa48("652") ? sheet : (stryCov_9fa48("652"), sheet.slice(segment, index));
            const block: OpenBlock = stryMutAct_9fa48("653") ? {} : (stryCov_9fa48("653"), {
              prelude: stryMutAct_9fa48("654") ? prelude.replaceAll(/\s+/gu, ' ') : (stryCov_9fa48("654"), prelude.trim().replaceAll(stryMutAct_9fa48("656") ? /\S+/gu : stryMutAct_9fa48("655") ? /\s/gu : (stryCov_9fa48("655", "656"), /\s+/gu), stryMutAct_9fa48("657") ? "" : (stryCov_9fa48("657"), ' '))),
              line: line(stryMutAct_9fa48("658") ? segment - (prelude.length - prelude.trimStart().length) : (stryCov_9fa48("658"), segment + (stryMutAct_9fa48("659") ? prelude.length + prelude.trimStart().length : (stryCov_9fa48("659"), prelude.length - (stryMutAct_9fa48("660") ? prelude.trimEnd().length : (stryCov_9fa48("660"), prelude.trimStart().length)))))),
              atRule: stryMutAct_9fa48("662") ? prelude.trimEnd().startsWith('@') : stryMutAct_9fa48("661") ? prelude.trimStart().endsWith('@') : (stryCov_9fa48("661", "662"), prelude.trimStart().startsWith(stryMutAct_9fa48("663") ? "" : (stryCov_9fa48("663"), '@'))),
              nested: stryMutAct_9fa48("664") ? stack.every(open => !open.atRule) : (stryCov_9fa48("664"), stack.some(stryMutAct_9fa48("665") ? () => undefined : (stryCov_9fa48("665"), open => stryMutAct_9fa48("666") ? open.atRule : (stryCov_9fa48("666"), !open.atRule)))),
              declarations: stryMutAct_9fa48("667") ? ["Stryker was here"] : (stryCov_9fa48("667"), [])
            });
            if (stryMutAct_9fa48("668")) {
              ;
            } else {
              stryCov_9fa48("668");
              stack.push(block);
            }
            if (stryMutAct_9fa48("669")) {
              ;
            } else {
              stryCov_9fa48("669");
              read.blocks.push(block);
            }
            segment = stryMutAct_9fa48("670") ? index - 1 : (stryCov_9fa48("670"), index + 1);
            continue;
          }
        }
        if (stryMutAct_9fa48("673") ? character !== ';' || character !== '}' : stryMutAct_9fa48("672") ? false : stryMutAct_9fa48("671") ? true : (stryCov_9fa48("671", "672", "673"), (stryMutAct_9fa48("675") ? character === ';' : stryMutAct_9fa48("674") ? true : (stryCov_9fa48("674", "675"), character !== (stryMutAct_9fa48("676") ? "" : (stryCov_9fa48("676"), ';')))) && (stryMutAct_9fa48("678") ? character === '}' : stryMutAct_9fa48("677") ? true : (stryCov_9fa48("677", "678"), character !== (stryMutAct_9fa48("679") ? "" : (stryCov_9fa48("679"), '}')))))) continue;
        const open = stack.at(stryMutAct_9fa48("680") ? +1 : (stryCov_9fa48("680"), -1));
        if (stryMutAct_9fa48("683") ? open === undefined : stryMutAct_9fa48("682") ? false : stryMutAct_9fa48("681") ? true : (stryCov_9fa48("681", "682", "683"), open !== undefined)) {
          if (stryMutAct_9fa48("684")) {
            {}
          } else {
            stryCov_9fa48("684");
            const found = declarationIn(sheet, segment, index, line);
            if (stryMutAct_9fa48("687") ? found === undefined : stryMutAct_9fa48("686") ? false : stryMutAct_9fa48("685") ? true : (stryCov_9fa48("685", "686", "687"), found !== undefined)) {
              if (stryMutAct_9fa48("688")) {
                {}
              } else {
                stryCov_9fa48("688");
                if (stryMutAct_9fa48("689")) {
                  ;
                } else {
                  stryCov_9fa48("689");
                  open.declarations.push(found);
                }
                if (stryMutAct_9fa48("690")) {
                  ;
                } else {
                  stryCov_9fa48("690");
                  read.declarations.push(found);
                }
              }
            }
          }
        }
        segment = stryMutAct_9fa48("691") ? index - 1 : (stryCov_9fa48("691"), index + 1);
        // Popping an empty stack is a no-op, so the brace alone decides: stating
        // the same guard twice is one statement that can be deleted unnoticed.
        if (stryMutAct_9fa48("694") ? character !== '}' : stryMutAct_9fa48("693") ? false : stryMutAct_9fa48("692") ? true : (stryCov_9fa48("692", "693", "694"), character === (stryMutAct_9fa48("695") ? "" : (stryCov_9fa48("695"), '}')))) if (stryMutAct_9fa48("696")) {
          ;
        } else {
          stryCov_9fa48("696");
          stack.pop();
        }
      }
    }
    return read;
  }
}

/**
 * Every brace-delimited block a sheet holds, in the order they open.
 * @param text - the sheet's contents.
 * @returns one entry per block, with the declarations written directly in it.
 */
export function blocksOf(text: string): Block[] {
  if (stryMutAct_9fa48("697")) {
    {}
  } else {
    stryCov_9fa48("697");
    return scan(text).blocks;
  }
}

/** A rule's selector list and the declarations it holds, normalized. */
export interface Ruleset {
  /** The selectors, comma-separated as written, with whitespace collapsed. */
  readonly selector: string;
  /** The declarations, in source order, with whitespace collapsed. */
  readonly body: string;
  /** One-based line the selector opens on. */
  readonly line: number;
  /** Whether a style rule encloses this one. */
  readonly nested: boolean;
}

/**
 * Every rule a sheet declares, with its comments stripped.
 *
 * Read so that two rules with the same selector and the same declarations can
 * be found: the token sheet carried the same four-line block twice, fifty-five
 * lines apart, each with its own paragraph explaining why it was needed, and
 * every gate that read the sheet read right past it.
 * @param text - the sheet's contents.
 * @returns one entry per rule, in source order.
 */
export function rulesetsOf(text: string): Ruleset[] {
  if (stryMutAct_9fa48("698")) {
    {}
  } else {
    stryCov_9fa48("698");
    return stryMutAct_9fa48("699") ? blocksOf(text).map(block => ({
      selector: block.prelude,
      body: block.declarations.map(one => `${one.property}: ${one.value}`).join('; '),
      line: block.line,
      nested: block.nested
    })) : (stryCov_9fa48("699"), blocksOf(text).filter(stryMutAct_9fa48("700") ? () => undefined : (stryCov_9fa48("700"), block => stryMutAct_9fa48("703") ? !block.atRule && block.prelude !== '' || block.declarations.length > 0 : stryMutAct_9fa48("702") ? false : stryMutAct_9fa48("701") ? true : (stryCov_9fa48("701", "702", "703"), (stryMutAct_9fa48("705") ? !block.atRule || block.prelude !== '' : stryMutAct_9fa48("704") ? true : (stryCov_9fa48("704", "705"), (stryMutAct_9fa48("706") ? block.atRule : (stryCov_9fa48("706"), !block.atRule)) && (stryMutAct_9fa48("708") ? block.prelude === '' : stryMutAct_9fa48("707") ? true : (stryCov_9fa48("707", "708"), block.prelude !== (stryMutAct_9fa48("709") ? "Stryker was here!" : (stryCov_9fa48("709"), '')))))) && (stryMutAct_9fa48("712") ? block.declarations.length <= 0 : stryMutAct_9fa48("711") ? block.declarations.length >= 0 : stryMutAct_9fa48("710") ? true : (stryCov_9fa48("710", "711", "712"), block.declarations.length > 0))))).map(stryMutAct_9fa48("713") ? () => undefined : (stryCov_9fa48("713"), block => stryMutAct_9fa48("714") ? {} : (stryCov_9fa48("714"), {
      selector: block.prelude,
      body: block.declarations.map(stryMutAct_9fa48("715") ? () => undefined : (stryCov_9fa48("715"), one => stryMutAct_9fa48("716") ? `` : (stryCov_9fa48("716"), `${one.property}: ${one.value}`))).join(stryMutAct_9fa48("717") ? "" : (stryCov_9fa48("717"), '; ')),
      line: block.line,
      nested: block.nested
    }))));
  }
}

/**
 * Every declaration a sheet holds, in source order.
 * @param text - the sheet's contents, comments already blanked.
 * @returns the declarations.
 */
export function declarationsOf(text: string): Declaration[] {
  if (stryMutAct_9fa48("718")) {
    {}
  } else {
    stryCov_9fa48("718");
    return scan(text).declarations;
  }
}

/**
 * Every class name a sheet's selectors name.
 *
 * The set is the shipped class vocabulary: the one place a class is given
 * meaning. A class a stylesheet never names carries no style and no reviewer,
 * so markup or script that writes one is shipping a decision outside the
 * design system.
 * @param text - the sheet's contents.
 * @returns the class names, in the order first written, duplicates removed.
 */
export function classTokensOf(text: string): string[] {
  if (stryMutAct_9fa48("719")) {
    {}
  } else {
    stryCov_9fa48("719");
    const found: string[] = stryMutAct_9fa48("720") ? ["Stryker was here"] : (stryCov_9fa48("720"), []);
    for (const block of blocksOf(text)) {
      if (stryMutAct_9fa48("721")) {
        {}
      } else {
        stryCov_9fa48("721");
        if (stryMutAct_9fa48("723") ? false : stryMutAct_9fa48("722") ? true : (stryCov_9fa48("722", "723"), block.atRule)) continue;
        // Every captured group of every match, which is one group: reading it by
        // index needs a guard for a case the pattern cannot produce, and a guard
        // for an impossible case is a line no test can ever reach.
        found.push(...(stryMutAct_9fa48("725") ? [] : (stryCov_9fa48("725"), [...block.prelude.matchAll(CLASS_TOKEN)])).flatMap(stryMutAct_9fa48("726") ? () => undefined : (stryCov_9fa48("726"), match => stryMutAct_9fa48("727") ? [...match] : (stryCov_9fa48("727"), (stryMutAct_9fa48("728") ? [] : (stryCov_9fa48("728"), [...match])).slice(1)))));
      }
    }
    return stryMutAct_9fa48("729") ? [] : (stryCov_9fa48("729"), [...new Set(found)]);
  }
}