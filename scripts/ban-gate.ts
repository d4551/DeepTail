/**
 * Idioms the project has moved past, and directives that switch a checker off.
 *
 * A toolchain that silently slips back, or source that revives an idiom the
 * project has left behind, is a regression no other gate reports: the build
 * still succeeds and every other suite stays green.
 *
 * Both bans are read off a parse. That matters most for the suppression ban,
 * because a directive is *only ever a comment* — so the comments are what is
 * searched, and the tables below, being string data in code, are not comments
 * and cannot match themselves. There is no declaration to skip, and therefore
 * no shape a directive can be dressed in to slip past the skipping.
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
import { aliases } from './aliases.ts';
import { type Comment, type Parsed, parseScript, walk } from './ast.ts';
import { BANNED } from './ban-rules.ts';
import { SCRIPT_EXTENSIONS } from './extensions.ts';
import { constants } from './fold.ts';
import { lineReader } from './lines.ts';
import type { Offence } from './offence.ts';
import type { Names } from './rule-helpers.ts';
import { LINT_LEVEL, rustAttributes } from './rust-attributes.ts';
export { PLAIN_EXTENSIONS } from './extensions.ts';
export { SCRIPT_EXTENSIONS };

/**
 * Directives that switch a checker off, in every language the repository uses.
 *
 * Suppressing a rule hides the defect rather than fixing it, so the ban is
 * absolute; a rule that genuinely does not apply is a rule to remove from the
 * configuration, where the removal is visible.
 */
const SUPPRESSIONS: readonly {
  readonly pattern: RegExp;
  readonly why: string;
}[] = stryMutAct_9fa48("196") ? [] : (stryCov_9fa48("196"), [stryMutAct_9fa48("197") ? {} : (stryCov_9fa48("197"), {
  pattern: /@ts-(?:ignore|nocheck|expect-error)/u,
  why: stryMutAct_9fa48("198") ? "" : (stryCov_9fa48("198"), 'suppressing the type checker hides the defect')
}), stryMutAct_9fa48("199") ? {} : (stryCov_9fa48("199"), {
  pattern: /(?:eslint|oxlint|biome|knip|rustfmt|clippy)-(?:disable|ignore)/u,
  why: stryMutAct_9fa48("200") ? "" : (stryCov_9fa48("200"), 'suppressing a rule hides the defect')
}), stryMutAct_9fa48("201") ? {} : (stryCov_9fa48("201"), {
  pattern: stryMutAct_9fa48("203") ? /(?:istanbul|c8|v8)\S+ignore/u : stryMutAct_9fa48("202") ? /(?:istanbul|c8|v8)\signore/u : (stryCov_9fa48("202", "203"), /(?:istanbul|c8|v8)\s+ignore/u),
  why: stryMutAct_9fa48("204") ? "" : (stryCov_9fa48("204"), 'excluding a line from coverage hides the gap')
}), stryMutAct_9fa48("205") ? {} : (stryCov_9fa48("205"), {
  pattern: /@public\b/u,
  why: stryMutAct_9fa48("206") ? "" : (stryCov_9fa48("206"), 'marking an unused export public hides that nothing imports it')
})]);

/**
 * Every doc comment that documents nothing.
 *
 * A doc comment attaches to whatever follows it, so one immediately followed by
 * another attaches to nothing: the reader reads the second, and the first is
 * prose about something that is no longer there. It is what a split leaves
 * behind — the function moved and its documentation stayed — so the stranded
 * block goes on describing a contract at a place that does not hold it, and the
 * function that does hold it is left with none. The rule reads a file's opening
 * block by the same predicate as every other block: a block that names its
 * subject is attached to it, and `@module` names the file itself.
 * @param parsed - the file's parse.
 * @param text - the file's contents, read for what stands between two blocks.
 * @returns one entry per stranded block, with its line.
 */
function orphanedDocs(parsed: Parsed, text: string): {
  readonly line: number;
}[] {
  if (stryMutAct_9fa48("207")) {
    {}
  } else {
    stryCov_9fa48("207");
    const docs = stryMutAct_9fa48("208") ? parsed.comments : (stryCov_9fa48("208"), parsed.comments.filter(stryMutAct_9fa48("209") ? () => undefined : (stryCov_9fa48("209"), comment => stryMutAct_9fa48("210") ? comment.value.endsWith('*') : (stryCov_9fa48("210"), comment.value.startsWith(stryMutAct_9fa48("211") ? "" : (stryCov_9fa48("211"), '*'))))));
    return docs.flatMap((comment, index) => {
      if (stryMutAct_9fa48("212")) {
        {}
      } else {
        stryCov_9fa48("212");
        const next = docs[stryMutAct_9fa48("213") ? index - 1 : (stryCov_9fa48("213"), index + 1)];
        if (stryMutAct_9fa48("216") ? next !== undefined : stryMutAct_9fa48("215") ? false : stryMutAct_9fa48("214") ? true : (stryCov_9fa48("214", "215", "216"), next === undefined)) return stryMutAct_9fa48("217") ? ["Stryker was here"] : (stryCov_9fa48("217"), []);
        // A block that names its subject documents that subject whether or not
        // code sits under it: `@module` names the file itself. A block that names
        // nothing is stranded when only prose lies between it and the next doc
        // block, because the declaration it described is no longer there.
        if (stryMutAct_9fa48("219") ? false : stryMutAct_9fa48("218") ? true : (stryCov_9fa48("218", "219"), /@\bmodule\b/u.test(comment.value))) return stryMutAct_9fa48("220") ? ["Stryker was here"] : (stryCov_9fa48("220"), []);
        return onlyComments(text, comment.end, next.start, parsed.comments) ? stryMutAct_9fa48("221") ? [] : (stryCov_9fa48("221"), [stryMutAct_9fa48("222") ? {} : (stryCov_9fa48("222"), {
          line: parsed.lineAt(comment.start)
        })]) : stryMutAct_9fa48("223") ? ["Stryker was here"] : (stryCov_9fa48("223"), []);
      }
    });
  }
}

/**
 * Whether a span of a file holds nothing but whitespace and comments.
 * @param text - the file's contents.
 * @param from - where the span starts.
 * @param to - where it ends.
 * @param comments - every comment in the file.
 * @returns true when nothing in the span is code.
 */
function onlyComments(text: string, from: number, to: number, comments: readonly Comment[]): boolean {
  if (stryMutAct_9fa48("224")) {
    {}
  } else {
    stryCov_9fa48("224");
    for (let at = from; stryMutAct_9fa48("227") ? at >= to : stryMutAct_9fa48("226") ? at <= to : stryMutAct_9fa48("225") ? false : (stryCov_9fa48("225", "226", "227"), at < to); stryMutAct_9fa48("228") ? at -= 1 : (stryCov_9fa48("228"), at += 1)) {
      if (stryMutAct_9fa48("229")) {
        {}
      } else {
        stryCov_9fa48("229");
        const character = stryMutAct_9fa48("230") ? text[at] && '' : (stryCov_9fa48("230"), text[at] ?? (stryMutAct_9fa48("231") ? "Stryker was here!" : (stryCov_9fa48("231"), '')));
        if (stryMutAct_9fa48("234") ? character.trim() !== '' : stryMutAct_9fa48("233") ? false : stryMutAct_9fa48("232") ? true : (stryCov_9fa48("232", "233", "234"), (stryMutAct_9fa48("235") ? character : (stryCov_9fa48("235"), character.trim())) === (stryMutAct_9fa48("236") ? "Stryker was here!" : (stryCov_9fa48("236"), '')))) continue;
        if (stryMutAct_9fa48("239") ? false : stryMutAct_9fa48("238") ? true : stryMutAct_9fa48("237") ? comments.some(comment => comment.start <= at && at < comment.end) : (stryCov_9fa48("237", "238", "239"), !(stryMutAct_9fa48("240") ? comments.every(comment => comment.start <= at && at < comment.end) : (stryCov_9fa48("240"), comments.some(stryMutAct_9fa48("241") ? () => undefined : (stryCov_9fa48("241"), comment => stryMutAct_9fa48("244") ? comment.start <= at || at < comment.end : stryMutAct_9fa48("243") ? false : stryMutAct_9fa48("242") ? true : (stryCov_9fa48("242", "243", "244"), (stryMutAct_9fa48("247") ? comment.start > at : stryMutAct_9fa48("246") ? comment.start < at : stryMutAct_9fa48("245") ? true : (stryCov_9fa48("245", "246", "247"), comment.start <= at)) && (stryMutAct_9fa48("250") ? at >= comment.end : stryMutAct_9fa48("249") ? at <= comment.end : stryMutAct_9fa48("248") ? true : (stryCov_9fa48("248", "249", "250"), at < comment.end))))))))) return stryMutAct_9fa48("251") ? true : (stryCov_9fa48("251"), false);
      }
    }
    return stryMutAct_9fa48("252") ? false : (stryCov_9fa48("252"), true);
  }
}

/**
 * Every ban a script breaks.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanScript(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("253")) {
    {}
  } else {
    stryCov_9fa48("253");
    const parsed = parseScript(label, text);
    const offences: Offence[] = parsed.errors.map(stryMutAct_9fa48("254") ? () => undefined : (stryCov_9fa48("254"), error => stryMutAct_9fa48("255") ? {} : (stryCov_9fa48("255"), {
      label,
      line: 1,
      why: stryMutAct_9fa48("256") ? `` : (stryCov_9fa48("256"), `this file does not parse, so it cannot be checked: ${error.message}`)
    })));
    for (const comment of parsed.comments) {
      if (stryMutAct_9fa48("257")) {
        {}
      } else {
        stryCov_9fa48("257");
        for (const {
          pattern,
          why
        } of SUPPRESSIONS) {
          if (stryMutAct_9fa48("258")) {
            {}
          } else {
            stryCov_9fa48("258");
            if (stryMutAct_9fa48("260") ? false : stryMutAct_9fa48("259") ? true : (stryCov_9fa48("259", "260"), pattern.test(comment.value))) offences.push(stryMutAct_9fa48("262") ? {} : (stryCov_9fa48("262"), {
              label,
              line: parsed.lineAt(comment.start),
              why
            }));
          }
        }
      }
    }
    for (const orphan of orphanedDocs(parsed, text)) {
      if (stryMutAct_9fa48("263")) {
        {}
      } else {
        stryCov_9fa48("263");
        offences.push(stryMutAct_9fa48("265") ? {} : (stryCov_9fa48("265"), {
          label,
          line: orphan.line,
          why: stryMutAct_9fa48("266") ? "" : (stryCov_9fa48("266"), 'this doc comment is followed by another, so it documents nothing; move it to what it describes')
        }));
      }
    }
    const names: Names = stryMutAct_9fa48("267") ? {} : (stryCov_9fa48("267"), {
      aliases: aliases(parsed.body),
      constants: constants(parsed.body)
    });
    walk(parsed.body, node => {
      if (stryMutAct_9fa48("269")) {
        {}
      } else {
        stryCov_9fa48("269");
        for (const {
          holds,
          why
        } of BANNED) {
          if (stryMutAct_9fa48("270")) {
            {}
          } else {
            stryCov_9fa48("270");
            if (stryMutAct_9fa48("272") ? false : stryMutAct_9fa48("271") ? true : (stryCov_9fa48("271", "272"), holds(node, names))) offences.push(stryMutAct_9fa48("274") ? {} : (stryCov_9fa48("274"), {
              label,
              line: parsed.lineAt(node.start),
              why
            }));
          }
        }
      }
    });
    return offences;
  }
}

/**
 * Every suppression a file with no parser here carries.
 *
 * Rust and the configuration formats have no parser in this repository, so they
 * are read as text. A directive named inside one of their comments is still
 * rejected: a directive that is merely commented out is one someone is keeping.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per directive.
 */
export function scanPlain(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("275")) {
    {}
  } else {
    stryCov_9fa48("275");
    const offences: Offence[] = stryMutAct_9fa48("276") ? ["Stryker was here"] : (stryCov_9fa48("276"), []);
    const at = lineReader(text);
    for (const [index, line] of text.split(stryMutAct_9fa48("277") ? "" : (stryCov_9fa48("277"), '\n')).entries()) {
      if (stryMutAct_9fa48("278")) {
        {}
      } else {
        stryCov_9fa48("278");
        for (const {
          pattern,
          why
        } of SUPPRESSIONS) {
          if (stryMutAct_9fa48("279")) {
            {}
          } else {
            stryCov_9fa48("279");
            if (stryMutAct_9fa48("281") ? false : stryMutAct_9fa48("280") ? true : (stryCov_9fa48("280", "281"), pattern.test(line))) offences.push(stryMutAct_9fa48("283") ? {} : (stryCov_9fa48("283"), {
              label,
              line: stryMutAct_9fa48("284") ? index - 1 : (stryCov_9fa48("284"), index + 1),
              why
            }));
          }
        }
      }
    }
    for (const {
      start,
      held
    } of rustAttributes(text)) {
      if (stryMutAct_9fa48("285")) {
        {}
      } else {
        stryCov_9fa48("285");
        if (stryMutAct_9fa48("288") ? held !== undefined : stryMutAct_9fa48("287") ? false : stryMutAct_9fa48("286") ? true : (stryCov_9fa48("286", "287", "288"), held === undefined)) {
          if (stryMutAct_9fa48("289")) {
            {}
          } else {
            stryCov_9fa48("289");
            offences.push(stryMutAct_9fa48("291") ? {} : (stryCov_9fa48("291"), {
              label,
              line: at(start),
              why: stryMutAct_9fa48("292") ? "" : (stryCov_9fa48("292"), 'this attribute never closes, so it cannot be checked')
            }));
            continue;
          }
        }
        if (stryMutAct_9fa48("294") ? false : stryMutAct_9fa48("293") ? true : (stryCov_9fa48("293", "294"), LINT_LEVEL.test(held))) {
          if (stryMutAct_9fa48("295")) {
            {}
          } else {
            stryCov_9fa48("295");
            offences.push(stryMutAct_9fa48("297") ? {} : (stryCov_9fa48("297"), {
              label,
              line: at(start),
              why: stryMutAct_9fa48("298") ? "" : (stryCov_9fa48("298"), 'suppressing a Rust lint hides the defect')
            }));
          }
        }
      }
    }
    return offences;
  }
}

/**
 * Scan one file, choosing the reader its extension calls for.
 * @param label - the path, which also selects the reader.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanSource(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("299")) {
    {}
  } else {
    stryCov_9fa48("299");
    if (stryMutAct_9fa48("302") ? SCRIPT_EXTENSIONS.every(extension => label.endsWith(extension)) : stryMutAct_9fa48("301") ? false : stryMutAct_9fa48("300") ? true : (stryCov_9fa48("300", "301", "302"), SCRIPT_EXTENSIONS.some(stryMutAct_9fa48("303") ? () => undefined : (stryCov_9fa48("303"), extension => stryMutAct_9fa48("304") ? label.startsWith(extension) : (stryCov_9fa48("304"), label.endsWith(extension)))))) return scanScript(label, text);
    return scanPlain(label, text);
  }
}