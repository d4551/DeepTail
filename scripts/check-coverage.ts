/**
 * Hold the unit chain to the detection it measured, file by file.
 *
 * `bun test --coverage` prints the table, and nothing read it: a suite quietly
 * dropped from the unit command, or a module a rename detached from every
 * suite, moved the table and moved nothing else. This runs the same suites the
 * unit command names, reads the table bun prints, and holds every file it
 * measured to a floor pinned in `coverage-floors.ts` — at the value the chain
 * measured, so a regression fails by name and an improvement has to be
 * restated there, the same hold `tests/stack.spec.ts` puts on the toolchain
 * pins.
 *
 * A file the chain measures with no floor stated is an offence, and so is a
 * floor stated for a file the chain no longer reaches: nothing joins without a
 * floor, and nothing stays behind as decoration.
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
import { allThree } from './captures.ts';
import { FLOORS, OVERALL_FLOOR } from './coverage-floors.ts';

/**
 * The directories the unit command names, and the pattern each is scanned
 * with.
 *
 * The unit command hands the shell three globs; a spawned process is handed
 * none, so the same three are scanned here and the files passed by path — the
 * suite list stays the one the command names, read rather than restated.
 */
const SUITE_GLOBS: readonly (readonly [directory: string, pattern: string])[] = stryMutAct_9fa48("806") ? [] : (stryCov_9fa48("806"), [stryMutAct_9fa48("807") ? [] : (stryCov_9fa48("807"), [stryMutAct_9fa48("808") ? "" : (stryCov_9fa48("808"), 'packages/host-fleet/tests'), stryMutAct_9fa48("809") ? "" : (stryCov_9fa48("809"), '*.spec.ts')]), stryMutAct_9fa48("810") ? [] : (stryCov_9fa48("810"), [stryMutAct_9fa48("811") ? "" : (stryCov_9fa48("811"), 'tests'), stryMutAct_9fa48("812") ? "" : (stryCov_9fa48("812"), '*.spec.ts')]), stryMutAct_9fa48("813") ? [] : (stryCov_9fa48("813"), [stryMutAct_9fa48("814") ? "" : (stryCov_9fa48("814"), 'tests/tree'), stryMutAct_9fa48("815") ? "" : (stryCov_9fa48("815"), '*.spec.ts')])]);

/**
 * Every suite the unit command runs, by path.
 * @returns the files, in path order, so a run reads the same twice.
 */
export async function suiteFiles(): Promise<readonly string[]> {
  if (stryMutAct_9fa48("816")) {
    {}
  } else {
    stryCov_9fa48("816");
    const scans = await Promise.all(SUITE_GLOBS.map(async ([directory, pattern]) => {
      if (stryMutAct_9fa48("817")) {
        {}
      } else {
        stryCov_9fa48("817");
        const paths = await Array.fromAsync(new Bun.Glob(pattern).scan(stryMutAct_9fa48("818") ? {} : (stryCov_9fa48("818"), {
          cwd: directory,
          onlyFiles: stryMutAct_9fa48("819") ? false : (stryCov_9fa48("819"), true)
        })));
        return paths.map(stryMutAct_9fa48("820") ? () => undefined : (stryCov_9fa48("820"), path => stryMutAct_9fa48("821") ? `` : (stryCov_9fa48("821"), `${directory}/${path}`)));
      }
    }));
    return scans.flat().toSorted();
  }
}

/** One file's row of the table bun prints. */
export interface CoverageRow {
  /** The file, by repository-relative path, or the table's summary name. */
  readonly file: string;
  /** The percentage of functions the chain reached. */
  readonly funcs: number;
  /** The percentage of lines the chain reached. */
  readonly lines: number;
}

/** The row the table sums across every file it measured. */
export const OVERALL = stryMutAct_9fa48("822") ? "" : (stryCov_9fa48("822"), 'All files');

/** One table row: a name, two percentages, and the uncovered lines after the last pipe. */
const ROW = stryMutAct_9fa48("842") ? /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\S*\|/u : stryMutAct_9fa48("841") ? /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s\|/u : stryMutAct_9fa48("840") ? /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\D.]+)\s*\|/u : stryMutAct_9fa48("839") ? /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([^\d.]+)\s*\|/u : stryMutAct_9fa48("838") ? /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.])\s*\|/u : stryMutAct_9fa48("837") ? /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\S*([\d.]+)\s*\|/u : stryMutAct_9fa48("836") ? /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s([\d.]+)\s*\|/u : stryMutAct_9fa48("835") ? /^\s*(.+?)\s*\|\s*([\d.]+)\S*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("834") ? /^\s*(.+?)\s*\|\s*([\d.]+)\s\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("833") ? /^\s*(.+?)\s*\|\s*([\D.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("832") ? /^\s*(.+?)\s*\|\s*([^\d.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("831") ? /^\s*(.+?)\s*\|\s*([\d.])\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("830") ? /^\s*(.+?)\s*\|\S*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("829") ? /^\s*(.+?)\s*\|\s([\d.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("828") ? /^\s*(.+?)\S*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("827") ? /^\s*(.+?)\s\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("826") ? /^\s*(.)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("825") ? /^\S*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("824") ? /^\s(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u : stryMutAct_9fa48("823") ? /\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u : (stryCov_9fa48("823", "824", "825", "826", "827", "828", "829", "830", "831", "832", "833", "834", "835", "836", "837", "838", "839", "840", "841", "842"), /^\s*(.+?)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|/u);

/**
 * The rows of one coverage table.
 * @param output - everything the run printed.
 * @returns one entry per row, in the order the table lists them.
 */
export function coverageRows(output: string): readonly CoverageRow[] {
  if (stryMutAct_9fa48("843")) {
    {}
  } else {
    stryCov_9fa48("843");
    const rows: CoverageRow[] = stryMutAct_9fa48("844") ? ["Stryker was here"] : (stryCov_9fa48("844"), []);
    for (const line of output.split(stryMutAct_9fa48("845") ? "" : (stryCov_9fa48("845"), '\n'))) {
      if (stryMutAct_9fa48("846")) {
        {}
      } else {
        stryCov_9fa48("846");
        const found = ROW.exec(line);
        const parts = (stryMutAct_9fa48("849") ? found !== null : stryMutAct_9fa48("848") ? false : stryMutAct_9fa48("847") ? true : (stryCov_9fa48("847", "848", "849"), found === null)) ? undefined : allThree(stryMutAct_9fa48("850") ? [] : (stryCov_9fa48("850"), [found[1], found[2], found[3]]));
        if (stryMutAct_9fa48("853") ? parts === undefined : stryMutAct_9fa48("852") ? false : stryMutAct_9fa48("851") ? true : (stryCov_9fa48("851", "852", "853"), parts !== undefined)) rows.push(stryMutAct_9fa48("855") ? {} : (stryCov_9fa48("855"), {
          file: parts[0],
          funcs: Number(parts[1]),
          lines: Number(parts[2])
        }));
      }
    }
    return rows;
  }
}

/** What the gate tells a reader, a shell, and each of the two streams. */
export interface CoverageOutcome {
  /** What is written to the output stream. */
  readonly out: string;
  /** What is written to the error stream. */
  readonly err: string;
  /** The code the shell is given. */
  readonly code: number;
}

/**
 * What the gate reports for one coverage table.
 *
 * Separated from the run that produces the table, because the decision — what
 * a reader is told, and what the shell is told — is the half a suite can drive
 * without running the chain. The floors are arguments with the pinned values
 * behind them, so a suite drives the decision off floors of its own and the
 * program holds the chain to the ones pinned here.
 * @param output - everything the run printed.
 * @param floors - the line floor per file, defaulting to the pinned table.
 * @param overallFloor - the line floor for the whole chain, defaulting to the pin.
 * @returns the two streams and the exit code.
 */
export function coverageReport(output: string, floors: Readonly<Record<string, number>> = FLOORS, overallFloor: number = OVERALL_FLOOR): CoverageOutcome {
  if (stryMutAct_9fa48("856")) {
    {}
  } else {
    stryCov_9fa48("856");
    const rows = coverageRows(output);
    const overall = rows.find(stryMutAct_9fa48("857") ? () => undefined : (stryCov_9fa48("857"), row => stryMutAct_9fa48("860") ? row.file !== OVERALL : stryMutAct_9fa48("859") ? false : stryMutAct_9fa48("858") ? true : (stryCov_9fa48("858", "859", "860"), row.file === OVERALL)));
    const files = stryMutAct_9fa48("861") ? rows : (stryCov_9fa48("861"), rows.filter(stryMutAct_9fa48("862") ? () => undefined : (stryCov_9fa48("862"), row => stryMutAct_9fa48("865") ? row.file === OVERALL : stryMutAct_9fa48("864") ? false : stryMutAct_9fa48("863") ? true : (stryCov_9fa48("863", "864", "865"), row.file !== OVERALL))));
    if (stryMutAct_9fa48("868") ? overall !== undefined : stryMutAct_9fa48("867") ? false : stryMutAct_9fa48("866") ? true : (stryCov_9fa48("866", "867", "868"), overall === undefined)) {
      if (stryMutAct_9fa48("869")) {
        {}
      } else {
        stryCov_9fa48("869");
        return stryMutAct_9fa48("870") ? {} : (stryCov_9fa48("870"), {
          out: stryMutAct_9fa48("871") ? "Stryker was here!" : (stryCov_9fa48("871"), ''),
          err: stryMutAct_9fa48("872") ? "" : (stryCov_9fa48("872"), 'check-coverage: the run printed no coverage table\n'),
          code: 1
        });
      }
    }
    const offences: string[] = stryMutAct_9fa48("873") ? ["Stryker was here"] : (stryCov_9fa48("873"), []);
    for (const row of files) {
      if (stryMutAct_9fa48("874")) {
        {}
      } else {
        stryCov_9fa48("874");
        const floor = floors[row.file];
        if (stryMutAct_9fa48("877") ? floor !== undefined : stryMutAct_9fa48("876") ? false : stryMutAct_9fa48("875") ? true : (stryCov_9fa48("875", "876", "877"), floor === undefined)) {
          if (stryMutAct_9fa48("878")) {
            {}
          } else {
            stryCov_9fa48("878");
            offences.push(stryMutAct_9fa48("880") ? `` : (stryCov_9fa48("880"), `  ${row.file}: measured ${row.lines.toFixed(2)}, and no floor is stated for it`));
          }
        } else if (stryMutAct_9fa48("884") ? row.lines >= floor : stryMutAct_9fa48("883") ? row.lines <= floor : stryMutAct_9fa48("882") ? false : stryMutAct_9fa48("881") ? true : (stryCov_9fa48("881", "882", "883", "884"), row.lines < floor)) {
          if (stryMutAct_9fa48("885")) {
            {}
          } else {
            stryCov_9fa48("885");
            offences.push(stryMutAct_9fa48("887") ? `` : (stryCov_9fa48("887"), `  ${row.file}: measured ${row.lines.toFixed(2)}, below its floor of ${floor.toFixed(2)}`));
          }
        }
      }
    }
    for (const file of Object.keys(floors)) {
      if (stryMutAct_9fa48("888")) {
        {}
      } else {
        stryCov_9fa48("888");
        if (stryMutAct_9fa48("891") ? false : stryMutAct_9fa48("890") ? true : stryMutAct_9fa48("889") ? files.some(row => row.file === file) : (stryCov_9fa48("889", "890", "891"), !(stryMutAct_9fa48("892") ? files.every(row => row.file === file) : (stryCov_9fa48("892"), files.some(stryMutAct_9fa48("893") ? () => undefined : (stryCov_9fa48("893"), row => stryMutAct_9fa48("896") ? row.file !== file : stryMutAct_9fa48("895") ? false : stryMutAct_9fa48("894") ? true : (stryCov_9fa48("894", "895", "896"), row.file === file))))))) {
          if (stryMutAct_9fa48("897")) {
            {}
          } else {
            stryCov_9fa48("897");
            offences.push(stryMutAct_9fa48("899") ? `` : (stryCov_9fa48("899"), `  ${file}: a floor is stated for it, and the chain measured nothing there`));
          }
        }
      }
    }
    if (stryMutAct_9fa48("903") ? overall.lines >= overallFloor : stryMutAct_9fa48("902") ? overall.lines <= overallFloor : stryMutAct_9fa48("901") ? false : stryMutAct_9fa48("900") ? true : (stryCov_9fa48("900", "901", "902", "903"), overall.lines < overallFloor)) {
      if (stryMutAct_9fa48("904")) {
        {}
      } else {
        stryCov_9fa48("904");
        offences.push(stryMutAct_9fa48("906") ? `` : (stryCov_9fa48("906"), `  ${OVERALL}: measured ${overall.lines.toFixed(2)}, below the floor of ${overallFloor.toFixed(2)}`));
      }
    }
    if (stryMutAct_9fa48("910") ? offences.length <= 0 : stryMutAct_9fa48("909") ? offences.length >= 0 : stryMutAct_9fa48("908") ? false : stryMutAct_9fa48("907") ? true : (stryCov_9fa48("907", "908", "909", "910"), offences.length > 0)) {
      if (stryMutAct_9fa48("911")) {
        {}
      } else {
        stryCov_9fa48("911");
        return stryMutAct_9fa48("912") ? {} : (stryCov_9fa48("912"), {
          out: stryMutAct_9fa48("913") ? "Stryker was here!" : (stryCov_9fa48("913"), ''),
          err: stryMutAct_9fa48("914") ? `` : (stryCov_9fa48("914"), `check-coverage: the unit chain does not reach what its floors state:\n${offences.join(stryMutAct_9fa48("915") ? "" : (stryCov_9fa48("915"), '\n'))}\n`),
          code: 1
        });
      }
    }
    return stryMutAct_9fa48("916") ? {} : (stryCov_9fa48("916"), {
      out: stryMutAct_9fa48("917") ? `` : (stryCov_9fa48("917"), `check-coverage: every file the unit chain reaches is held at the detection measured: ${String(files.length)} files, ${OVERALL} at ${overall.lines.toFixed(2)}\n`),
      err: stryMutAct_9fa48("918") ? "Stryker was here!" : (stryCov_9fa48("918"), ''),
      code: 0
    });
  }
}

// Guarded, as every runnable script here is: importing a module must run
// nothing. A suite that imports one for the readers it exports would
// otherwise run the whole gate as a side effect of the import.
if (stryMutAct_9fa48("920") ? false : stryMutAct_9fa48("919") ? true : (stryCov_9fa48("919", "920"), import.meta.main)) {
  if (stryMutAct_9fa48("921")) {
    {}
  } else {
    stryCov_9fa48("921");
    const [table] = stryMutAct_9fa48("922") ? Bun.argv : (stryCov_9fa48("922"), Bun.argv.slice(2));
    if (stryMutAct_9fa48("925") ? table !== undefined : stryMutAct_9fa48("924") ? false : stryMutAct_9fa48("923") ? true : (stryCov_9fa48("923", "924", "925"), table === undefined)) {
      if (stryMutAct_9fa48("926")) {
        {}
      } else {
        stryCov_9fa48("926");
        const run = Bun.spawnSync(stryMutAct_9fa48("927") ? [] : (stryCov_9fa48("927"), [stryMutAct_9fa48("928") ? "" : (stryCov_9fa48("928"), 'bun'), stryMutAct_9fa48("929") ? "" : (stryCov_9fa48("929"), 'test'), stryMutAct_9fa48("930") ? "" : (stryCov_9fa48("930"), '--coverage'), stryMutAct_9fa48("931") ? "" : (stryCov_9fa48("931"), '--timeout'), stryMutAct_9fa48("932") ? "" : (stryCov_9fa48("932"), '180000'), ...(await suiteFiles())]), stryMutAct_9fa48("933") ? {} : (stryCov_9fa48("933"), {
          stdout: stryMutAct_9fa48("934") ? "" : (stryCov_9fa48("934"), 'pipe'),
          stderr: stryMutAct_9fa48("935") ? "" : (stryCov_9fa48("935"), 'pipe')
        }));
        if (stryMutAct_9fa48("938") ? run.exitCode !== 0 : stryMutAct_9fa48("937") ? false : stryMutAct_9fa48("936") ? true : (stryCov_9fa48("936", "937", "938"), run.exitCode === 0)) {
          if (stryMutAct_9fa48("939")) {
            {}
          } else {
            stryCov_9fa48("939");
            // The table is written with the test output, and bun writes that to
            // stderr, so the two are read together rather than one of them guessed
            // at — the same read the cargo gate makes of cargo's own report.
            const report = coverageReport(stryMutAct_9fa48("940") ? `` : (stryCov_9fa48("940"), `${run.stdout.toString()}\n${run.stderr.toString()}`));
            if (stryMutAct_9fa48("941")) {
              ;
            } else {
              stryCov_9fa48("941");
              process.stdout.write(report.out);
            }
            if (stryMutAct_9fa48("942")) {
              ;
            } else {
              stryCov_9fa48("942");
              process.stderr.write(report.err);
            }
            process.exitCode = report.code;
          }
        } else {
          if (stryMutAct_9fa48("943")) {
            {}
          } else {
            stryCov_9fa48("943");
            process.stderr.write(stryMutAct_9fa48("945") ? `` : (stryCov_9fa48("945"), `check-coverage: the unit chain exited ${String(run.exitCode)}\n${run.stderr.toString()}`));
            process.exitCode = 1;
          }
        }
      }
    } else {
      if (stryMutAct_9fa48("946")) {
        {}
      } else {
        stryCov_9fa48("946");
        // A table handed in by path: the suite drives the report off a captured
        // run, so the decision is reachable without re-running the chain.
        const report = coverageReport(await readFile(table, stryMutAct_9fa48("947") ? "" : (stryCov_9fa48("947"), 'utf8')));
        if (stryMutAct_9fa48("948")) {
          ;
        } else {
          stryCov_9fa48("948");
          process.stdout.write(report.out);
        }
        if (stryMutAct_9fa48("949")) {
          ;
        } else {
          stryCov_9fa48("949");
          process.stderr.write(report.err);
        }
        process.exitCode = report.code;
      }
    }
  }
}