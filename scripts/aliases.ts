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
        if (stryMutAct_9fa48("5") ? node.type === 'VariableDeclaration' || node.kind === 'const' : stryMutAct_9fa48("4") ? false : stryMutAct_9fa48("3") ? true : (stryCov_9fa48("3", "4", "5"), (stryMutAct_9fa48("7") ? node.type !== 'VariableDeclaration' : stryMutAct_9fa48("6") ? true : (stryCov_9fa48("6", "7"), node.type === (stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), 'VariableDeclaration')))) && (stryMutAct_9fa48("10") ? node.kind !== 'const' : stryMutAct_9fa48("9") ? true : (stryCov_9fa48("9", "10"), node.kind === (stryMutAct_9fa48("11") ? "" : (stryCov_9fa48("11"), 'const')))))) if (stryMutAct_9fa48("12")) {
          ;
        } else {
          stryCov_9fa48("12");
          recordConstAliases(node, direct);
        }
        if (stryMutAct_9fa48("15") ? node.type !== 'ImportSpecifier' : stryMutAct_9fa48("14") ? false : stryMutAct_9fa48("13") ? true : (stryCov_9fa48("13", "14", "15"), node.type === (stryMutAct_9fa48("16") ? "" : (stryCov_9fa48("16"), 'ImportSpecifier')))) if (stryMutAct_9fa48("17")) {
          ;
        } else {
          stryCov_9fa48("17");
          recordImportAlias(node, direct);
        }
      }
    });
    const resolved = new Map<string, string>();
    for (const [local] of direct) {
      if (stryMutAct_9fa48("18")) {
        {}
      } else {
        stryCov_9fa48("18");
        let target = local;
        // A chain of renames is still one name; the cap stops a cycle spinning.
        for (let step = 0; stryMutAct_9fa48("21") ? step >= 8 : stryMutAct_9fa48("20") ? step <= 8 : stryMutAct_9fa48("19") ? false : (stryCov_9fa48("19", "20", "21"), step < 8); stryMutAct_9fa48("22") ? step -= 1 : (stryCov_9fa48("22"), step += 1)) {
          if (stryMutAct_9fa48("23")) {
            {}
          } else {
            stryCov_9fa48("23");
            const next = direct.get(target);
            if (stryMutAct_9fa48("26") ? next === undefined && next === target : stryMutAct_9fa48("25") ? false : stryMutAct_9fa48("24") ? true : (stryCov_9fa48("24", "25", "26"), (stryMutAct_9fa48("28") ? next !== undefined : stryMutAct_9fa48("27") ? false : (stryCov_9fa48("27", "28"), next === undefined)) || (stryMutAct_9fa48("30") ? next !== target : stryMutAct_9fa48("29") ? false : (stryCov_9fa48("29", "30"), next === target)))) break;
            target = next;
          }
        }
        if (stryMutAct_9fa48("33") ? target === local : stryMutAct_9fa48("32") ? false : stryMutAct_9fa48("31") ? true : (stryCov_9fa48("31", "32", "33"), target !== local)) if (stryMutAct_9fa48("34")) {
          ;
        } else {
          stryCov_9fa48("34");
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
  if (stryMutAct_9fa48("35")) {
    {}
  } else {
    stryCov_9fa48("35");
    const declarations = node.declarations;
    if (stryMutAct_9fa48("38") ? false : stryMutAct_9fa48("37") ? true : stryMutAct_9fa48("36") ? Array.isArray(declarations) : (stryCov_9fa48("36", "37", "38"), !Array.isArray(declarations))) return;
    for (const declaration of declarations) {
      if (stryMutAct_9fa48("39")) {
        {}
      } else {
        stryCov_9fa48("39");
        if (stryMutAct_9fa48("42") ? false : stryMutAct_9fa48("41") ? true : stryMutAct_9fa48("40") ? isNode(declaration) : (stryCov_9fa48("40", "41", "42"), !isNode(declaration))) continue;
        const id = unwrap(declaration.id);
        const init = unwrap(declaration.init);
        if (stryMutAct_9fa48("45") ? (!isNode(id) || id.type !== 'Identifier' || !isNode(init)) && init.type !== 'Identifier' : stryMutAct_9fa48("44") ? false : stryMutAct_9fa48("43") ? true : (stryCov_9fa48("43", "44", "45"), (stryMutAct_9fa48("47") ? (!isNode(id) || id.type !== 'Identifier') && !isNode(init) : stryMutAct_9fa48("46") ? false : (stryCov_9fa48("46", "47"), (stryMutAct_9fa48("49") ? !isNode(id) && id.type !== 'Identifier' : stryMutAct_9fa48("48") ? false : (stryCov_9fa48("48", "49"), (stryMutAct_9fa48("50") ? isNode(id) : (stryCov_9fa48("50"), !isNode(id))) || (stryMutAct_9fa48("52") ? id.type === 'Identifier' : stryMutAct_9fa48("51") ? false : (stryCov_9fa48("51", "52"), id.type !== (stryMutAct_9fa48("53") ? "" : (stryCov_9fa48("53"), 'Identifier')))))) || (stryMutAct_9fa48("54") ? isNode(init) : (stryCov_9fa48("54"), !isNode(init))))) || (stryMutAct_9fa48("56") ? init.type === 'Identifier' : stryMutAct_9fa48("55") ? false : (stryCov_9fa48("55", "56"), init.type !== (stryMutAct_9fa48("57") ? "" : (stryCov_9fa48("57"), 'Identifier')))))) continue;
        if (stryMutAct_9fa48("60") ? typeof id.name !== 'string' && typeof init.name !== 'string' : stryMutAct_9fa48("59") ? false : stryMutAct_9fa48("58") ? true : (stryCov_9fa48("58", "59", "60"), (stryMutAct_9fa48("62") ? typeof id.name === 'string' : stryMutAct_9fa48("61") ? false : (stryCov_9fa48("61", "62"), typeof id.name !== (stryMutAct_9fa48("63") ? "" : (stryCov_9fa48("63"), 'string')))) || (stryMutAct_9fa48("65") ? typeof init.name === 'string' : stryMutAct_9fa48("64") ? false : (stryCov_9fa48("64", "65"), typeof init.name !== (stryMutAct_9fa48("66") ? "" : (stryCov_9fa48("66"), 'string')))))) continue;
        if (stryMutAct_9fa48("67")) {
          ;
        } else {
          stryCov_9fa48("67");
          into.set(id.name, init.name);
        }
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
  if (stryMutAct_9fa48("68")) {
    {}
  } else {
    stryCov_9fa48("68");
    const imported = node.imported;
    const local = node.local;
    if (stryMutAct_9fa48("71") ? !isNode(imported) && !isNode(local) : stryMutAct_9fa48("70") ? false : stryMutAct_9fa48("69") ? true : (stryCov_9fa48("69", "70", "71"), (stryMutAct_9fa48("72") ? isNode(imported) : (stryCov_9fa48("72"), !isNode(imported))) || (stryMutAct_9fa48("73") ? isNode(local) : (stryCov_9fa48("73"), !isNode(local))))) return;
    const from = (stryMutAct_9fa48("76") ? imported.type !== 'Identifier' : stryMutAct_9fa48("75") ? false : stryMutAct_9fa48("74") ? true : (stryCov_9fa48("74", "75", "76"), imported.type === (stryMutAct_9fa48("77") ? "" : (stryCov_9fa48("77"), 'Identifier')))) ? imported.name : imported.value;
    if (stryMutAct_9fa48("80") ? (typeof from !== 'string' || typeof local.name !== 'string') && local.name === from : stryMutAct_9fa48("79") ? false : stryMutAct_9fa48("78") ? true : (stryCov_9fa48("78", "79", "80"), (stryMutAct_9fa48("82") ? typeof from !== 'string' && typeof local.name !== 'string' : stryMutAct_9fa48("81") ? false : (stryCov_9fa48("81", "82"), (stryMutAct_9fa48("84") ? typeof from === 'string' : stryMutAct_9fa48("83") ? false : (stryCov_9fa48("83", "84"), typeof from !== (stryMutAct_9fa48("85") ? "" : (stryCov_9fa48("85"), 'string')))) || (stryMutAct_9fa48("87") ? typeof local.name === 'string' : stryMutAct_9fa48("86") ? false : (stryCov_9fa48("86", "87"), typeof local.name !== (stryMutAct_9fa48("88") ? "" : (stryCov_9fa48("88"), 'string')))))) || (stryMutAct_9fa48("90") ? local.name !== from : stryMutAct_9fa48("89") ? false : (stryCov_9fa48("89", "90"), local.name === from)))) return;
    if (stryMutAct_9fa48("91")) {
      ;
    } else {
      stryCov_9fa48("91");
      into.set(local.name, from);
    }
  }
}