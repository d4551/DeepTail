/**
 * A package manifest, read onto the closed JSON model rather than claimed.
 *
 * Five readers each opened `package.json` with `JSON.parse` and then told the
 * compiler what they had found, which is a claim about a file on disk that
 * nothing checks: a manifest whose `scripts` is a string, or whose commands are
 * numbers, reads as the declared shape and fails somewhere else entirely. The
 * document goes through the shared JSONC reader here, and what is not a string
 * is not a command.
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
import { readFileSync } from 'node:fs';
import { EMPTY_SECTION, isJsonObject, type Json, readJsonc } from './jsonc.ts';

/**
 * One manifest, on the closed JSON model.
 * @param path - the manifest to read.
 * @returns its members.
 */
export function readManifest(path: string): {
  [key: string]: Json;
} {
  if (stryMutAct_9fa48("1700")) {
    {}
  } else {
    stryCov_9fa48("1700");
    return readJsonc(readFileSync(path, stryMutAct_9fa48("1701") ? "" : (stryCov_9fa48("1701"), 'utf8')));
  }
}

/**
 * The string members of one section of a manifest.
 *
 * A section that is not an object declares nothing, and a member that is not a
 * string is not the thing the section holds — a command, a range, a name — so
 * neither reads as one.
 * @param manifest - the manifest's members.
 * @param section - the key the section is written under.
 * @returns each member that is a string, in the order the file writes them.
 */
export function sectionOf(manifest: {
  [key: string]: Json;
}, section: string): Map<string, string> {
  if (stryMutAct_9fa48("1702")) {
    {}
  } else {
    stryCov_9fa48("1702");
    const held = manifest[section];
    const declared = isJsonObject(held) ? held : EMPTY_SECTION;
    const found = new Map<string, string>();
    for (const [name, value] of Object.entries(declared)) {
      if (stryMutAct_9fa48("1703")) {
        {}
      } else {
        stryCov_9fa48("1703");
        if (stryMutAct_9fa48("1706") ? typeof value !== 'string' : stryMutAct_9fa48("1705") ? false : stryMutAct_9fa48("1704") ? true : (stryCov_9fa48("1704", "1705", "1706"), typeof value === (stryMutAct_9fa48("1707") ? "" : (stryCov_9fa48("1707"), 'string')))) if (stryMutAct_9fa48("1708")) {
          ;
        } else {
          stryCov_9fa48("1708");
          found.set(name, value);
        }
      }
    }
    return found;
  }
}

/**
 * The scripts one manifest declares.
 * @param path - the manifest to read.
 * @returns script name to the command it runs.
 */
export function manifestScripts(path = stryMutAct_9fa48("1709") ? "" : (stryCov_9fa48("1709"), 'package.json')): Map<string, string> {
  if (stryMutAct_9fa48("1710")) {
    {}
  } else {
    stryCov_9fa48("1710");
    return sectionOf(readManifest(path), stryMutAct_9fa48("1711") ? "" : (stryCov_9fa48("1711"), 'scripts'));
  }
}