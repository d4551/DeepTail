/**
 * Names that stand for another name.
 *
 * `const d = document` and `import { it as check }` both rename something the
 * rules are written about. A rule that matches on the written name alone is a
 * rule one `const` defeats, so the gates resolve every local name through this
 * table before judging it.
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
import { isNode, type Node, unwrap, walk } from './ast.ts';

/** Local name to the name it stands for, resolved through chains. */
export type Aliases = ReadonlyMap<string, string>;

/**
 * Every local name in a file that stands for another name.
 * @param program - the parsed body.
 * @returns local name to the name it stands for, resolved through chains.
 */
export function aliases(program: readonly Node[]): Aliases {
  if (stryMutAct_9fa48("0")) {
    {}
  } else {
    stryCov_9fa48("0");
    const direct = new Map<string, string>();
    walk(program, node => {
      if (stryMutAct_9fa48("2")) {
        {}
      } else {
        stryCov_9fa48("2");
        if (stryMutAct_9fa48("5") ? node.type === 'VariableDeclaration' || node['kind'] === 'const' : stryMutAct_9fa48("4") ? false : stryMutAct_9fa48("3") ? true : (stryCov_9fa48("3", "4", "5"), (stryMutAct_9fa48("7") ? node.type !== 'VariableDeclaration' : stryMutAct_9fa48("6") ? true : (stryCov_9fa48("6", "7"), node.type === (stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), 'VariableDeclaration')))) && (stryMutAct_9fa48("10") ? node['kind'] !== 'const' : stryMutAct_9fa48("9") ? true : (stryCov_9fa48("9", "10"), node[stryMutAct_9fa48("11") ? "" : (stryCov_9fa48("11"), 'kind')] === (stryMutAct_9fa48("12") ? "" : (stryCov_9fa48("12"), 'const')))))) if (stryMutAct_9fa48("13")) {
          ;
        } else {
          stryCov_9fa48("13");
          recordConstAliases(node, direct);
        }
        if (stryMutAct_9fa48("16") ? node.type !== 'ImportSpecifier' : stryMutAct_9fa48("15") ? false : stryMutAct_9fa48("14") ? true : (stryCov_9fa48("14", "15", "16"), node.type === (stryMutAct_9fa48("17") ? "" : (stryCov_9fa48("17"), 'ImportSpecifier')))) if (stryMutAct_9fa48("18")) {
          ;
        } else {
          stryCov_9fa48("18");
          recordImportAlias(node, direct);
        }
      }
    });
    const resolved = new Map<string, string>();
    for (const [local] of direct) {
      if (stryMutAct_9fa48("19")) {
        {}
      } else {
        stryCov_9fa48("19");
        let target = local;
        // A chain of renames is still one name; the cap stops a cycle spinning.
        for (let step = 0; stryMutAct_9fa48("22") ? step >= 8 : stryMutAct_9fa48("21") ? step <= 8 : stryMutAct_9fa48("20") ? false : (stryCov_9fa48("20", "21", "22"), step < 8); stryMutAct_9fa48("23") ? step -= 1 : (stryCov_9fa48("23"), step += 1)) {
          if (stryMutAct_9fa48("24")) {
            {}
          } else {
            stryCov_9fa48("24");
            const next = direct.get(target);
            if (stryMutAct_9fa48("27") ? next === undefined && next === target : stryMutAct_9fa48("26") ? false : stryMutAct_9fa48("25") ? true : (stryCov_9fa48("25", "26", "27"), (stryMutAct_9fa48("29") ? next !== undefined : stryMutAct_9fa48("28") ? false : (stryCov_9fa48("28", "29"), next === undefined)) || (stryMutAct_9fa48("31") ? next !== target : stryMutAct_9fa48("30") ? false : (stryCov_9fa48("30", "31"), next === target)))) break;
            target = next;
          }
        }
        if (stryMutAct_9fa48("34") ? target === local : stryMutAct_9fa48("33") ? false : stryMutAct_9fa48("32") ? true : (stryCov_9fa48("32", "33", "34"), target !== local)) if (stryMutAct_9fa48("35")) {
          ;
        } else {
          stryCov_9fa48("35");
          resolved.set(local, target);
        }
      }
    }
    return resolved;
  }
}

/**
 * Record `const local = other`.
 * @param node - the declaration.
 * @param into - the map to add to.
 */
function recordConstAliases(node: Node, into: Map<string, string>): void {
  if (stryMutAct_9fa48("36")) {
    {}
  } else {
    stryCov_9fa48("36");
    const declarations = node[stryMutAct_9fa48("37") ? "" : (stryCov_9fa48("37"), 'declarations')];
    if (stryMutAct_9fa48("40") ? false : stryMutAct_9fa48("39") ? true : stryMutAct_9fa48("38") ? Array.isArray(declarations) : (stryCov_9fa48("38", "39", "40"), !Array.isArray(declarations))) return;
    for (const declaration of declarations) {
      if (stryMutAct_9fa48("41")) {
        {}
      } else {
        stryCov_9fa48("41");
        if (stryMutAct_9fa48("44") ? false : stryMutAct_9fa48("43") ? true : stryMutAct_9fa48("42") ? isNode(declaration) : (stryCov_9fa48("42", "43", "44"), !isNode(declaration))) continue;
        const id = unwrap(declaration[stryMutAct_9fa48("45") ? "" : (stryCov_9fa48("45"), 'id')]);
        const init = unwrap(declaration[stryMutAct_9fa48("46") ? "" : (stryCov_9fa48("46"), 'init')]);
        if (stryMutAct_9fa48("49") ? (!isNode(id) || id.type !== 'Identifier' || !isNode(init)) && init.type !== 'Identifier' : stryMutAct_9fa48("48") ? false : stryMutAct_9fa48("47") ? true : (stryCov_9fa48("47", "48", "49"), (stryMutAct_9fa48("51") ? (!isNode(id) || id.type !== 'Identifier') && !isNode(init) : stryMutAct_9fa48("50") ? false : (stryCov_9fa48("50", "51"), (stryMutAct_9fa48("53") ? !isNode(id) && id.type !== 'Identifier' : stryMutAct_9fa48("52") ? false : (stryCov_9fa48("52", "53"), (stryMutAct_9fa48("54") ? isNode(id) : (stryCov_9fa48("54"), !isNode(id))) || (stryMutAct_9fa48("56") ? id.type === 'Identifier' : stryMutAct_9fa48("55") ? false : (stryCov_9fa48("55", "56"), id.type !== (stryMutAct_9fa48("57") ? "" : (stryCov_9fa48("57"), 'Identifier')))))) || (stryMutAct_9fa48("58") ? isNode(init) : (stryCov_9fa48("58"), !isNode(init))))) || (stryMutAct_9fa48("60") ? init.type === 'Identifier' : stryMutAct_9fa48("59") ? false : (stryCov_9fa48("59", "60"), init.type !== (stryMutAct_9fa48("61") ? "" : (stryCov_9fa48("61"), 'Identifier')))))) continue;
        if (stryMutAct_9fa48("64") ? typeof id['name'] !== 'string' && typeof init['name'] !== 'string' : stryMutAct_9fa48("63") ? false : stryMutAct_9fa48("62") ? true : (stryCov_9fa48("62", "63", "64"), (stryMutAct_9fa48("66") ? typeof id['name'] === 'string' : stryMutAct_9fa48("65") ? false : (stryCov_9fa48("65", "66"), typeof id[stryMutAct_9fa48("67") ? "" : (stryCov_9fa48("67"), 'name')] !== (stryMutAct_9fa48("68") ? "" : (stryCov_9fa48("68"), 'string')))) || (stryMutAct_9fa48("70") ? typeof init['name'] === 'string' : stryMutAct_9fa48("69") ? false : (stryCov_9fa48("69", "70"), typeof init[stryMutAct_9fa48("71") ? "" : (stryCov_9fa48("71"), 'name')] !== (stryMutAct_9fa48("72") ? "" : (stryCov_9fa48("72"), 'string')))))) continue;
        into.set(id[stryMutAct_9fa48("74") ? "" : (stryCov_9fa48("74"), 'name')], init[stryMutAct_9fa48("75") ? "" : (stryCov_9fa48("75"), 'name')]);
      }
    }
  }
}

/**
 * Record `import { imported as local }`.
 * @param node - the specifier.
 * @param into - the map to add to.
 */
function recordImportAlias(node: Node, into: Map<string, string>): void {
  if (stryMutAct_9fa48("76")) {
    {}
  } else {
    stryCov_9fa48("76");
    const imported = node[stryMutAct_9fa48("77") ? "" : (stryCov_9fa48("77"), 'imported')];
    const local = node[stryMutAct_9fa48("78") ? "" : (stryCov_9fa48("78"), 'local')];
    if (stryMutAct_9fa48("81") ? !isNode(imported) && !isNode(local) : stryMutAct_9fa48("80") ? false : stryMutAct_9fa48("79") ? true : (stryCov_9fa48("79", "80", "81"), (stryMutAct_9fa48("82") ? isNode(imported) : (stryCov_9fa48("82"), !isNode(imported))) || (stryMutAct_9fa48("83") ? isNode(local) : (stryCov_9fa48("83"), !isNode(local))))) return;
    const from = (stryMutAct_9fa48("86") ? imported.type !== 'Identifier' : stryMutAct_9fa48("85") ? false : stryMutAct_9fa48("84") ? true : (stryCov_9fa48("84", "85", "86"), imported.type === (stryMutAct_9fa48("87") ? "" : (stryCov_9fa48("87"), 'Identifier')))) ? imported[stryMutAct_9fa48("88") ? "" : (stryCov_9fa48("88"), 'name')] : imported[stryMutAct_9fa48("89") ? "" : (stryCov_9fa48("89"), 'value')];
    if (stryMutAct_9fa48("92") ? (typeof from !== 'string' || typeof local['name'] !== 'string') && local['name'] === from : stryMutAct_9fa48("91") ? false : stryMutAct_9fa48("90") ? true : (stryCov_9fa48("90", "91", "92"), (stryMutAct_9fa48("94") ? typeof from !== 'string' && typeof local['name'] !== 'string' : stryMutAct_9fa48("93") ? false : (stryCov_9fa48("93", "94"), (stryMutAct_9fa48("96") ? typeof from === 'string' : stryMutAct_9fa48("95") ? false : (stryCov_9fa48("95", "96"), typeof from !== (stryMutAct_9fa48("97") ? "" : (stryCov_9fa48("97"), 'string')))) || (stryMutAct_9fa48("99") ? typeof local['name'] === 'string' : stryMutAct_9fa48("98") ? false : (stryCov_9fa48("98", "99"), typeof local[stryMutAct_9fa48("100") ? "" : (stryCov_9fa48("100"), 'name')] !== (stryMutAct_9fa48("101") ? "" : (stryCov_9fa48("101"), 'string')))))) || (stryMutAct_9fa48("103") ? local['name'] !== from : stryMutAct_9fa48("102") ? false : (stryCov_9fa48("102", "103"), local[stryMutAct_9fa48("104") ? "" : (stryCov_9fa48("104"), 'name')] === from)))) return;
    into.set(local[stryMutAct_9fa48("106") ? "" : (stryCov_9fa48("106"), 'name')], from);
  }
}