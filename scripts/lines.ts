/**
 * Where an offset falls, as a line.
 *
 * Both readers in this repository needed it and both had written it: the script
 * gates read a parse and the sheet gates read braces, and each carried its own
 * binary search over its own list of newline offsets. One notion of "the line a
 * thing is on" is one place to be wrong, so the search lives here and the
 * readers share it.
 *
 * @module
 */

/**
 * A reader that turns a byte offset into a line number.
 * @param text - the whole file.
 * @returns the reader.
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
export function lineReader(text: string): (offset: number) => number {
  if (stryMutAct_9fa48("249")) {
    {}
  } else {
    stryCov_9fa48("249");
    const starts = stryMutAct_9fa48("250") ? [] : (stryCov_9fa48("250"), [0]);
    for (const [index, character] of (stryMutAct_9fa48("251") ? [] : (stryCov_9fa48("251"), [...text])).entries()) {
      if (stryMutAct_9fa48("252")) {
        {}
      } else {
        stryCov_9fa48("252");
        if (stryMutAct_9fa48("255") ? character !== '\n' : stryMutAct_9fa48("254") ? false : stryMutAct_9fa48("253") ? true : (stryCov_9fa48("253", "254", "255"), character === (stryMutAct_9fa48("256") ? "" : (stryCov_9fa48("256"), '\n')))) starts.push(stryMutAct_9fa48("258") ? index - 1 : (stryCov_9fa48("258"), index + 1));
      }
    }
    return offset => {
      if (stryMutAct_9fa48("259")) {
        {}
      } else {
        stryCov_9fa48("259");
        let low = 0;
        let high = stryMutAct_9fa48("260") ? starts.length + 1 : (stryCov_9fa48("260"), starts.length - 1);
        while (stryMutAct_9fa48("263") ? low >= high : stryMutAct_9fa48("262") ? low <= high : stryMutAct_9fa48("261") ? false : (stryCov_9fa48("261", "262", "263"), low < high)) {
          if (stryMutAct_9fa48("264")) {
            {}
          } else {
            stryCov_9fa48("264");
            const middle = Math.ceil(stryMutAct_9fa48("265") ? (low + high) * 2 : (stryCov_9fa48("265"), (stryMutAct_9fa48("266") ? low - high : (stryCov_9fa48("266"), low + high)) / 2));
            if (stryMutAct_9fa48("270") ? (starts[middle] ?? 0) > offset : stryMutAct_9fa48("269") ? (starts[middle] ?? 0) < offset : stryMutAct_9fa48("268") ? false : stryMutAct_9fa48("267") ? true : (stryCov_9fa48("267", "268", "269", "270"), (stryMutAct_9fa48("271") ? starts[middle] && 0 : (stryCov_9fa48("271"), starts[middle] ?? 0)) <= offset)) low = middle;else high = stryMutAct_9fa48("272") ? middle + 1 : (stryCov_9fa48("272"), middle - 1);
          }
        }
        return stryMutAct_9fa48("273") ? low - 1 : (stryCov_9fa48("273"), low + 1);
      }
    };
  }
}