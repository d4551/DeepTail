/**
 * Every file the repository ships, as git itself defines it.
 *
 * A gate that walks a hand-written list of directories is only as complete as
 * that list, and a gate that walks the working tree also reads build output,
 * so its file count moves with whether someone has run a build. Git already
 * answers the question exactly once, in `.gitignore`: tracked files plus files
 * that are not ignored. That answer is the one the checkers, the packager and
 * CI all use, so the gates use it too and cannot drift from it.
 *
 * A path git lists from its index whose bytes are gone is a deletion waiting to
 * be recorded, and a file that is not on disk ships to nobody. It is left out of
 * the list; every path that does have bytes is read, including one git has never
 * seen, so nothing a gate should read can hide behind the index.
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
import { existsSync } from 'node:fs';

/** The repository root, resolved from this module's own location. */
export const ROOT = new URL(stryMutAct_9fa48("2161") ? "" : (stryCov_9fa48("2161"), '../'), import.meta.url).pathname;

/** One file to scan, and the path it is reported under. */
export interface SourceFile {
  /** Repository-relative path, used both to read the file and to report it. */
  readonly label: string;
  /** Absolute path on disk. */
  readonly path: string;
}

/**
 * The files whose bytes are on disk.
 *
 * Exported because it is the whole of the rule the index forces on the list: a
 * path git still carries whose bytes are gone is a deletion waiting to be
 * recorded, and there is nothing in it for a gate to read.
 * @param files - the paths git listed, in any order.
 * @returns the ones that exist, in the order they were given.
 */
export function onlyPresent(files: readonly SourceFile[]): SourceFile[] {
  if (stryMutAct_9fa48("2162")) {
    {}
  } else {
    stryCov_9fa48("2162");
    return stryMutAct_9fa48("2163") ? files : (stryCov_9fa48("2163"), files.filter(stryMutAct_9fa48("2164") ? () => undefined : (stryCov_9fa48("2164"), file => existsSync(file.path))));
  }
}

/** The command that answers which files the repository ships. */
export const LISTING_COMMAND = ['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'] as const;

/**
 * The files a listing names, of the kinds a gate asked for.
 *
 * Separated from the command that produces the listing: a shell call and a
 * parse are two things, and only one of them can be driven by a test. The
 * listing is NUL-separated and ends with a separator, so the last field is
 * always empty and is not a path.
 * @param output - what the listing command wrote.
 * @param extensions - the suffixes to keep, each including its dot.
 * @returns the matching files, in path order, each with a path that opens it.
 */
export function listedFiles(output: string, extensions: readonly string[]): SourceFile[] {
  if (stryMutAct_9fa48("2165")) {
    {}
  } else {
    stryCov_9fa48("2165");
    // `ROOT` ends with its separator, and the listing reports paths relative to
    // it, so the join is concatenation.
    return stryMutAct_9fa48("2166") ? output.split('\0').toSorted().map(label => ({
      label,
      path: `${ROOT}${label}`
    })) : (stryCov_9fa48("2166"), output.split(stryMutAct_9fa48("2167") ? "" : (stryCov_9fa48("2167"), '\0')).filter(stryMutAct_9fa48("2168") ? () => undefined : (stryCov_9fa48("2168"), label => stryMutAct_9fa48("2171") ? label !== '' || extensions.some(extension => label.endsWith(extension)) : stryMutAct_9fa48("2170") ? false : stryMutAct_9fa48("2169") ? true : (stryCov_9fa48("2169", "2170", "2171"), (stryMutAct_9fa48("2173") ? label === '' : stryMutAct_9fa48("2172") ? true : (stryCov_9fa48("2172", "2173"), label !== (stryMutAct_9fa48("2174") ? "Stryker was here!" : (stryCov_9fa48("2174"), '')))) && (stryMutAct_9fa48("2175") ? extensions.every(extension => label.endsWith(extension)) : (stryCov_9fa48("2175"), extensions.some(stryMutAct_9fa48("2176") ? () => undefined : (stryCov_9fa48("2176"), extension => stryMutAct_9fa48("2177") ? label.startsWith(extension) : (stryCov_9fa48("2177"), label.endsWith(extension))))))))).toSorted().map(stryMutAct_9fa48("2178") ? () => undefined : (stryCov_9fa48("2178"), label => stryMutAct_9fa48("2179") ? {} : (stryCov_9fa48("2179"), {
      label,
      path: stryMutAct_9fa48("2180") ? `` : (stryCov_9fa48("2180"), `${ROOT}${label}`)
    }))));
  }
}

/**
 * What a finished listing command answers with.
 *
 * A non-zero exit is git refusing to answer, and a gate that read its empty
 * output as "the repository ships nothing" would pass every rule it has.
 * @param exitCode - the command's exit status.
 * @param stdout - what it wrote to its output.
 * @param stderr - what it wrote to its error output.
 * @returns the listing.
 * @throws Error when the command refused to answer.
 */
export function readListing(exitCode: number, stdout: string, stderr: string): string {
  if (stryMutAct_9fa48("2181")) {
    {}
  } else {
    stryCov_9fa48("2181");
    if (stryMutAct_9fa48("2184") ? exitCode === 0 : stryMutAct_9fa48("2183") ? false : stryMutAct_9fa48("2182") ? true : (stryCov_9fa48("2182", "2183", "2184"), exitCode !== 0)) throw new Error(stryMutAct_9fa48("2186") ? `` : (stryCov_9fa48("2186"), `source-tree: git ls-files exited ${String(exitCode)}: ${stderr}`));
    return stdout;
  }
}

/**
 * Every file in the repository whose name ends in one of the given extensions.
 * @param extensions - the suffixes to keep, each including its dot.
 * @returns the matching files, in path order.
 */
export function repositoryFiles(extensions: readonly string[]): SourceFile[] {
  if (stryMutAct_9fa48("2187")) {
    {}
  } else {
    stryCov_9fa48("2187");
    const listed = Bun.spawnSync(stryMutAct_9fa48("2188") ? [] : (stryCov_9fa48("2188"), [...LISTING_COMMAND]), stryMutAct_9fa48("2189") ? {} : (stryCov_9fa48("2189"), {
      cwd: ROOT,
      stderr: stryMutAct_9fa48("2190") ? "" : (stryCov_9fa48("2190"), 'pipe')
    }));
    const output = readListing(listed.exitCode, listed.stdout.toString(), listed.stderr.toString());
    return onlyPresent(listedFiles(output, extensions));
  }
}