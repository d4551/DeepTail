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
 * Directives that switch a checker off, and markers that stand in for work, in
 * every language the repository uses.
 *
 * Suppressing a rule hides the defect rather than fixing it, so the ban is
 * absolute; a rule that genuinely does not apply is a rule to remove from the
 * configuration, where the removal is visible. A debt marker is the same
 * evasion written as prose: it records that something is wrong and leaves it
 * wrong, and it is read here rather than in the tree because a marker is only
 * ever a comment.
 */
const SUPPRESSIONS: readonly {
  readonly pattern: RegExp;
  readonly why: string;
}[] = stryMutAct_9fa48("308") ? [] : (stryCov_9fa48("308"), [stryMutAct_9fa48("309") ? {} : (stryCov_9fa48("309"), {
  pattern: /@ts-(?:ignore|nocheck|expect-error)/u,
  why: stryMutAct_9fa48("310") ? "" : (stryCov_9fa48("310"), 'suppressing the type checker hides the defect')
}), stryMutAct_9fa48("311") ? {} : (stryCov_9fa48("311"), {
  pattern: /(?:eslint|oxlint|biome|knip|rustfmt|clippy)-(?:disable|ignore)/u,
  why: stryMutAct_9fa48("312") ? "" : (stryCov_9fa48("312"), 'suppressing a rule hides the defect')
}), stryMutAct_9fa48("313") ? {} : (stryCov_9fa48("313"), {
  pattern: stryMutAct_9fa48("315") ? /(?:istanbul|c8|v8)\S+ignore/u : stryMutAct_9fa48("314") ? /(?:istanbul|c8|v8)\signore/u : (stryCov_9fa48("314", "315"), /(?:istanbul|c8|v8)\s+ignore/u),
  why: stryMutAct_9fa48("316") ? "" : (stryCov_9fa48("316"), 'excluding a line from coverage hides the gap')
}), stryMutAct_9fa48("317") ? {} : (stryCov_9fa48("317"), {
  pattern: /@public\b/u,
  why: stryMutAct_9fa48("318") ? "" : (stryCov_9fa48("318"), 'marking an unused export public hides that nothing imports it')
}), stryMutAct_9fa48("319") ? {} : (stryCov_9fa48("319"), {
  pattern: /\b(?:TODO|FIXME|HACK|XXX)\b/u,
  why: stryMutAct_9fa48("320") ? "" : (stryCov_9fa48("320"), 'a marker records work left undone; do the work, or delete what is not wanted')
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
  if (stryMutAct_9fa48("321")) {
    {}
  } else {
    stryCov_9fa48("321");
    const docs = stryMutAct_9fa48("322") ? parsed.comments : (stryCov_9fa48("322"), parsed.comments.filter(stryMutAct_9fa48("323") ? () => undefined : (stryCov_9fa48("323"), comment => stryMutAct_9fa48("324") ? comment.value.endsWith('*') : (stryCov_9fa48("324"), comment.value.startsWith(stryMutAct_9fa48("325") ? "" : (stryCov_9fa48("325"), '*'))))));
    return docs.flatMap((comment, index) => {
      if (stryMutAct_9fa48("326")) {
        {}
      } else {
        stryCov_9fa48("326");
        const next = docs[stryMutAct_9fa48("327") ? index - 1 : (stryCov_9fa48("327"), index + 1)];
        if (stryMutAct_9fa48("330") ? next !== undefined : stryMutAct_9fa48("329") ? false : stryMutAct_9fa48("328") ? true : (stryCov_9fa48("328", "329", "330"), next === undefined)) return stryMutAct_9fa48("331") ? ["Stryker was here"] : (stryCov_9fa48("331"), []);
        // A block that names its subject documents that subject whether or not
        // code sits under it: `@module` names the file itself. A block that names
        // nothing is stranded when only prose lies between it and the next doc
        // block, because the declaration it described is no longer there.
        if (stryMutAct_9fa48("333") ? false : stryMutAct_9fa48("332") ? true : (stryCov_9fa48("332", "333"), /@\bmodule\b/u.test(comment.value))) return stryMutAct_9fa48("334") ? ["Stryker was here"] : (stryCov_9fa48("334"), []);
        return onlyComments(text, comment.end, next.start, parsed.comments) ? stryMutAct_9fa48("335") ? [] : (stryCov_9fa48("335"), [stryMutAct_9fa48("336") ? {} : (stryCov_9fa48("336"), {
          line: parsed.lineAt(comment.start)
        })]) : stryMutAct_9fa48("337") ? ["Stryker was here"] : (stryCov_9fa48("337"), []);
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
  if (stryMutAct_9fa48("338")) {
    {}
  } else {
    stryCov_9fa48("338");
    for (let at = from; stryMutAct_9fa48("341") ? at >= to : stryMutAct_9fa48("340") ? at <= to : stryMutAct_9fa48("339") ? false : (stryCov_9fa48("339", "340", "341"), at < to); stryMutAct_9fa48("342") ? at -= 1 : (stryCov_9fa48("342"), at += 1)) {
      if (stryMutAct_9fa48("343")) {
        {}
      } else {
        stryCov_9fa48("343");
        const character = stryMutAct_9fa48("344") ? text[at] && '' : (stryCov_9fa48("344"), text[at] ?? (stryMutAct_9fa48("345") ? "Stryker was here!" : (stryCov_9fa48("345"), '')));
        if (stryMutAct_9fa48("348") ? character.trim() !== '' : stryMutAct_9fa48("347") ? false : stryMutAct_9fa48("346") ? true : (stryCov_9fa48("346", "347", "348"), (stryMutAct_9fa48("349") ? character : (stryCov_9fa48("349"), character.trim())) === (stryMutAct_9fa48("350") ? "Stryker was here!" : (stryCov_9fa48("350"), '')))) continue;
        if (stryMutAct_9fa48("353") ? false : stryMutAct_9fa48("352") ? true : stryMutAct_9fa48("351") ? comments.some(comment => comment.start <= at && at < comment.end) : (stryCov_9fa48("351", "352", "353"), !(stryMutAct_9fa48("354") ? comments.every(comment => comment.start <= at && at < comment.end) : (stryCov_9fa48("354"), comments.some(stryMutAct_9fa48("355") ? () => undefined : (stryCov_9fa48("355"), comment => stryMutAct_9fa48("358") ? comment.start <= at || at < comment.end : stryMutAct_9fa48("357") ? false : stryMutAct_9fa48("356") ? true : (stryCov_9fa48("356", "357", "358"), (stryMutAct_9fa48("361") ? comment.start > at : stryMutAct_9fa48("360") ? comment.start < at : stryMutAct_9fa48("359") ? true : (stryCov_9fa48("359", "360", "361"), comment.start <= at)) && (stryMutAct_9fa48("364") ? at >= comment.end : stryMutAct_9fa48("363") ? at <= comment.end : stryMutAct_9fa48("362") ? true : (stryCov_9fa48("362", "363", "364"), at < comment.end))))))))) return stryMutAct_9fa48("365") ? true : (stryCov_9fa48("365"), false);
      }
    }
    return stryMutAct_9fa48("366") ? false : (stryCov_9fa48("366"), true);
  }
}

/**
 * Every ban a script breaks.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per rejected construct.
 */
export function scanScript(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("367")) {
    {}
  } else {
    stryCov_9fa48("367");
    const parsed = parseScript(label, text);
    const offences: Offence[] = parsed.errors.map(stryMutAct_9fa48("368") ? () => undefined : (stryCov_9fa48("368"), error => stryMutAct_9fa48("369") ? {} : (stryCov_9fa48("369"), {
      label,
      line: 1,
      why: stryMutAct_9fa48("370") ? `` : (stryCov_9fa48("370"), `this file does not parse, so it cannot be checked: ${error.message}`)
    })));
    for (const comment of parsed.comments) {
      if (stryMutAct_9fa48("371")) {
        {}
      } else {
        stryCov_9fa48("371");
        for (const {
          pattern,
          why
        } of SUPPRESSIONS) {
          if (stryMutAct_9fa48("372")) {
            {}
          } else {
            stryCov_9fa48("372");
            if (stryMutAct_9fa48("374") ? false : stryMutAct_9fa48("373") ? true : (stryCov_9fa48("373", "374"), pattern.test(comment.value))) offences.push(stryMutAct_9fa48("376") ? {} : (stryCov_9fa48("376"), {
              label,
              line: parsed.lineAt(comment.start),
              why
            }));
          }
        }
      }
    }
    for (const orphan of orphanedDocs(parsed, text)) {
      if (stryMutAct_9fa48("377")) {
        {}
      } else {
        stryCov_9fa48("377");
        offences.push(stryMutAct_9fa48("379") ? {} : (stryCov_9fa48("379"), {
          label,
          line: orphan.line,
          why: stryMutAct_9fa48("380") ? "" : (stryCov_9fa48("380"), 'this doc comment is followed by another, so it documents nothing; move it to what it describes')
        }));
      }
    }
    const names: Names = stryMutAct_9fa48("381") ? {} : (stryCov_9fa48("381"), {
      aliases: aliases(parsed.body),
      constants: constants(parsed.body)
    });
    walk(parsed.body, node => {
      if (stryMutAct_9fa48("383")) {
        {}
      } else {
        stryCov_9fa48("383");
        for (const {
          holds,
          why
        } of BANNED) {
          if (stryMutAct_9fa48("384")) {
            {}
          } else {
            stryCov_9fa48("384");
            if (stryMutAct_9fa48("386") ? false : stryMutAct_9fa48("385") ? true : (stryCov_9fa48("385", "386"), holds(node, names))) offences.push(stryMutAct_9fa48("388") ? {} : (stryCov_9fa48("388"), {
              label,
              line: parsed.lineAt(node[stryMutAct_9fa48("389") ? "" : (stryCov_9fa48("389"), 'start')]),
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
  if (stryMutAct_9fa48("390")) {
    {}
  } else {
    stryCov_9fa48("390");
    const offences: Offence[] = stryMutAct_9fa48("391") ? ["Stryker was here"] : (stryCov_9fa48("391"), []);
    const at = lineReader(text);
    for (const [index, line] of text.split(stryMutAct_9fa48("392") ? "" : (stryCov_9fa48("392"), '\n')).entries()) {
      if (stryMutAct_9fa48("393")) {
        {}
      } else {
        stryCov_9fa48("393");
        for (const {
          pattern,
          why
        } of SUPPRESSIONS) {
          if (stryMutAct_9fa48("394")) {
            {}
          } else {
            stryCov_9fa48("394");
            if (stryMutAct_9fa48("396") ? false : stryMutAct_9fa48("395") ? true : (stryCov_9fa48("395", "396"), pattern.test(line))) offences.push(stryMutAct_9fa48("398") ? {} : (stryCov_9fa48("398"), {
              label,
              line: stryMutAct_9fa48("399") ? index - 1 : (stryCov_9fa48("399"), index + 1),
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
      if (stryMutAct_9fa48("400")) {
        {}
      } else {
        stryCov_9fa48("400");
        if (stryMutAct_9fa48("403") ? held !== undefined : stryMutAct_9fa48("402") ? false : stryMutAct_9fa48("401") ? true : (stryCov_9fa48("401", "402", "403"), held === undefined)) {
          if (stryMutAct_9fa48("404")) {
            {}
          } else {
            stryCov_9fa48("404");
            offences.push(stryMutAct_9fa48("406") ? {} : (stryCov_9fa48("406"), {
              label,
              line: at(start),
              why: stryMutAct_9fa48("407") ? "" : (stryCov_9fa48("407"), 'this attribute never closes, so it cannot be checked')
            }));
            continue;
          }
        }
        if (stryMutAct_9fa48("409") ? false : stryMutAct_9fa48("408") ? true : (stryCov_9fa48("408", "409"), LINT_LEVEL.test(held))) {
          if (stryMutAct_9fa48("410")) {
            {}
          } else {
            stryCov_9fa48("410");
            offences.push(stryMutAct_9fa48("412") ? {} : (stryCov_9fa48("412"), {
              label,
              line: at(start),
              why: stryMutAct_9fa48("413") ? "" : (stryCov_9fa48("413"), 'suppressing a Rust lint hides the defect')
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
  if (stryMutAct_9fa48("414")) {
    {}
  } else {
    stryCov_9fa48("414");
    if (stryMutAct_9fa48("417") ? SCRIPT_EXTENSIONS.every(extension => label.endsWith(extension)) : stryMutAct_9fa48("416") ? false : stryMutAct_9fa48("415") ? true : (stryCov_9fa48("415", "416", "417"), SCRIPT_EXTENSIONS.some(stryMutAct_9fa48("418") ? () => undefined : (stryCov_9fa48("418"), extension => stryMutAct_9fa48("419") ? label.startsWith(extension) : (stryCov_9fa48("419"), label.endsWith(extension)))))) return scanScript(label, text);
    return scanPlain(label, text);
  }
}