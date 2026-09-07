/**
 * The reading every gate in the chain shares.
 *
 * Five gates had written this out apiece — walk the files, render an offence,
 * choose an exit status — and every copy sat inside an `import.meta.main`
 * guard, where nothing but the command line could reach it. A refusal could
 * have been emptied, a count could have overstated what was read, and every
 * suite would have stayed green while the chain went on printing a clean line
 * over nothing.
 *
 * It is stated here once, and driven directly by `tests/gate-runner.spec.ts`
 * and `tests/gate-declarations.spec.ts`. The streams are a parameter rather
 * than a global so the report is a value a case can read, not a side effect it
 * has to intercept.
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
import { readFile } from 'node:fs/promises';
import type { Offence } from './offence.ts';
import type { SourceFile } from './source-tree.ts';

/**
 * What one gate declares about itself.
 *
 * Every field is what a reader of the chain's output acts on, so every field is
 * reachable from a suite: the kinds of file the gate opens, the two sentences it
 * prints, and the rule it applies to one file's text.
 */
export interface Gate {
  /** The file kinds this gate opens, each including its dot. */
  readonly extensions: readonly string[];
  /** The sentence printed above the offences, without its colon. */
  readonly refusal: string;
  /**
   * The sentence printed when nothing was refused.
   * @param files - how many files were actually read.
   * @returns the line, without its newline.
   */
  readonly clean: (files: number) => string;
  /**
   * The rule, applied to one file.
   * @param label - the file's repository-relative path.
   * @param text - the file's contents.
   * @returns one entry per rejected construct.
   */
  readonly scan: (label: string, text: string) => readonly Offence[];
  /**
   * Which of the listed files this gate reads, when it reads a subset.
   *
   * A gate that narrows here also counts what it narrowed to: a gate that read
   * a subset and reported the whole list would overstate its own reach.
   * @param file - one file from the listing.
   * @returns true when this gate reads it.
   */
  readonly only?: (file: SourceFile) => boolean;
}

/** What a gate said, and whether the chain may continue past it. */
export interface GateOutcome {
  /** True when the gate refused nothing. */
  readonly ok: boolean;
  /** Everything the gate has to say, newline-terminated. */
  readonly text: string;
}

/**
 * The streams a gate run from the command line writes to.
 *
 * The pair a report is written to is typed from this object rather than
 * declared beside it: a second declaration is a shape that can drift from the
 * one thing that actually reaches a person.
 */
export const CONSOLE = stryMutAct_9fa48("1237") ? {} : (stryCov_9fa48("1237"), {
  /**
   * Write a clean run.
   * @param text - the line to write, newline included.
   */
  out(text: string) {
    if (stryMutAct_9fa48("1238")) {
      {}
    } else {
      stryCov_9fa48("1238");
      if (stryMutAct_9fa48("1239")) {
        ;
      } else {
        stryCov_9fa48("1239");
        process.stdout.write(text);
      }
    }
  },
  /**
   * Write a refusal.
   * @param text - the report to write, newline included.
   */
  err(text: string) {
    if (stryMutAct_9fa48("1240")) {
      {}
    } else {
      stryCov_9fa48("1240");
      if (stryMutAct_9fa48("1241")) {
        ;
      } else {
        stryCov_9fa48("1241");
        process.stderr.write(text);
      }
    }
  }
});

/** The two streams a report is written to. */
export type GateStreams = typeof CONSOLE;

/**
 * One offence, as a reader sees it: indented under the refusal above it.
 * @param offence - the rejected construct.
 * @returns the line, without its newline.
 */
export function renderOffence(offence: Offence): string {
  if (stryMutAct_9fa48("1242")) {
    {}
  } else {
    stryCov_9fa48("1242");
    return stryMutAct_9fa48("1243") ? `` : (stryCov_9fa48("1243"), `  ${offence.label}:${String(offence.line)}: ${offence.why}`);
  }
}

/**
 * Run one gate over the files it reads.
 * @param gate - the gate to drive.
 * @param files - the listing to read it through.
 * @returns what the gate has to say, and whether it refused anything.
 */
export async function readGate(gate: Gate, files: readonly SourceFile[]): Promise<GateOutcome> {
  if (stryMutAct_9fa48("1244")) {
    {}
  } else {
    stryCov_9fa48("1244");
    const narrow = gate.only;
    const read = (stryMutAct_9fa48("1247") ? narrow !== undefined : stryMutAct_9fa48("1246") ? false : stryMutAct_9fa48("1245") ? true : (stryCov_9fa48("1245", "1246", "1247"), narrow === undefined)) ? files : stryMutAct_9fa48("1248") ? files : (stryCov_9fa48("1248"), files.filter(stryMutAct_9fa48("1249") ? () => undefined : (stryCov_9fa48("1249"), file => narrow(file))));
    const scanned = await Promise.all(read.map(stryMutAct_9fa48("1250") ? () => undefined : (stryCov_9fa48("1250"), async file => gate.scan(file.label, await readFile(file.path, stryMutAct_9fa48("1251") ? "" : (stryCov_9fa48("1251"), 'utf8'))))));
    const offences = scanned.flat();
    if (stryMutAct_9fa48("1255") ? offences.length <= 0 : stryMutAct_9fa48("1254") ? offences.length >= 0 : stryMutAct_9fa48("1253") ? false : stryMutAct_9fa48("1252") ? true : (stryCov_9fa48("1252", "1253", "1254", "1255"), offences.length > 0)) {
      if (stryMutAct_9fa48("1256")) {
        {}
      } else {
        stryCov_9fa48("1256");
        return stryMutAct_9fa48("1257") ? {} : (stryCov_9fa48("1257"), {
          ok: stryMutAct_9fa48("1258") ? true : (stryCov_9fa48("1258"), false),
          text: stryMutAct_9fa48("1259") ? `` : (stryCov_9fa48("1259"), `${gate.refusal}:\n${offences.map(stryMutAct_9fa48("1260") ? () => undefined : (stryCov_9fa48("1260"), offence => renderOffence(offence))).join(stryMutAct_9fa48("1261") ? "" : (stryCov_9fa48("1261"), '\n'))}\n`)
        });
      }
    }
    // The count is of what was read, not of what was listed: the clean line is a
    // claim about how much was looked at.
    return stryMutAct_9fa48("1262") ? {} : (stryCov_9fa48("1262"), {
      ok: stryMutAct_9fa48("1263") ? false : (stryCov_9fa48("1263"), true),
      text: stryMutAct_9fa48("1264") ? `` : (stryCov_9fa48("1264"), `${gate.clean(read.length)}\n`)
    });
  }
}

/**
 * Write one gate's report and answer with the status the chain exits on.
 * @param outcome - what the gate said.
 * @param streams - where to write it.
 * @returns the exit status: zero when the gate refused nothing.
 */
export function reportGate(outcome: GateOutcome, streams: GateStreams): number {
  if (stryMutAct_9fa48("1265")) {
    {}
  } else {
    stryCov_9fa48("1265");
    if (stryMutAct_9fa48("1267") ? false : stryMutAct_9fa48("1266") ? true : (stryCov_9fa48("1266", "1267"), outcome.ok)) {
      if (stryMutAct_9fa48("1268")) {
        {}
      } else {
        stryCov_9fa48("1268");
        if (stryMutAct_9fa48("1269")) {
          ;
        } else {
          stryCov_9fa48("1269");
          streams.out(outcome.text);
        }
        return 0;
      }
    }
    if (stryMutAct_9fa48("1270")) {
      ;
    } else {
      stryCov_9fa48("1270");
      streams.err(outcome.text);
    }
    return 1;
  }
}