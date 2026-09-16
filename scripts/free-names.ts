/**
 * The names a piece of source reaches for but does not bring with it.
 *
 * A name is free when nothing in the source binds it, so the reader here is a
 * scope walk rather than a search: parameters, declarations, catch bindings,
 * class and function names all bind, while a property name, a label and an
 * import's remote name are not references at all. What is left is what the
 * evaluating realm has to supply, and the caller is what decides whether it
 * does — the page's own globals, for injected source.
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
import { type Field, fieldOf, isNode, type Node, nodeAt, nodesAt, parseScript } from './ast.ts';

/** One lexical scope, and the names it binds. */
interface Scope {
  /** Whether this scope holds `var` and hoisted function declarations. */
  readonly holdsVars: boolean;
  readonly names: Set<string>;
  readonly parent?: Scope;
}

/** Node types that open a scope holding `var` declarations. */
const FUNCTION_LIKE = new Set(stryMutAct_9fa48("1399") ? [] : (stryCov_9fa48("1399"), [stryMutAct_9fa48("1400") ? "" : (stryCov_9fa48("1400"), 'FunctionDeclaration'), stryMutAct_9fa48("1401") ? "" : (stryCov_9fa48("1401"), 'FunctionExpression'), stryMutAct_9fa48("1402") ? "" : (stryCov_9fa48("1402"), 'ArrowFunctionExpression')]));

/** Node types that open a block scope. */
const BLOCK_LIKE = new Set(stryMutAct_9fa48("1403") ? [] : (stryCov_9fa48("1403"), [stryMutAct_9fa48("1404") ? "" : (stryCov_9fa48("1404"), 'BlockStatement'), stryMutAct_9fa48("1405") ? "" : (stryCov_9fa48("1405"), 'StaticBlock'), stryMutAct_9fa48("1406") ? "" : (stryCov_9fa48("1406"), 'ForStatement'), stryMutAct_9fa48("1407") ? "" : (stryCov_9fa48("1407"), 'ForInStatement'), stryMutAct_9fa48("1408") ? "" : (stryCov_9fa48("1408"), 'ForOfStatement'), stryMutAct_9fa48("1409") ? "" : (stryCov_9fa48("1409"), 'CatchClause'), stryMutAct_9fa48("1410") ? "" : (stryCov_9fa48("1410"), 'SwitchStatement'), stryMutAct_9fa48("1411") ? "" : (stryCov_9fa48("1411"), 'ClassDeclaration'), stryMutAct_9fa48("1412") ? "" : (stryCov_9fa48("1412"), 'ClassExpression')]));

/**
 * Whether an identifier in this slot of its parent is a reference to a binding.
 *
 * A property name, a label and an import's remote name are spelt as
 * identifiers and name nothing in scope; everything else an identifier is
 * written as reads a binding, including the declaration ids, which read the
 * binding they themselves make.
 * @param parent - the node the identifier hangs off, or undefined when the
 * identifier is the whole expression.
 * @param key - the property of the parent the identifier sits under.
 * @returns true when the identifier reads a binding.
 */
function isReference(parent: Node | undefined, key: string): boolean {
  if (stryMutAct_9fa48("1413")) {
    {}
  } else {
    stryCov_9fa48("1413");
    if (stryMutAct_9fa48("1416") ? parent !== undefined : stryMutAct_9fa48("1415") ? false : stryMutAct_9fa48("1414") ? true : (stryCov_9fa48("1414", "1415", "1416"), parent === undefined)) return stryMutAct_9fa48("1417") ? false : (stryCov_9fa48("1417"), true);
    const computed = stryMutAct_9fa48("1420") ? fieldOf(parent, 'computed') !== true : stryMutAct_9fa48("1419") ? false : stryMutAct_9fa48("1418") ? true : (stryCov_9fa48("1418", "1419", "1420"), fieldOf(parent, stryMutAct_9fa48("1421") ? "" : (stryCov_9fa48("1421"), 'computed')) === (stryMutAct_9fa48("1422") ? false : (stryCov_9fa48("1422"), true)));
    switch (parent.type) {
      case stryMutAct_9fa48("1424") ? "" : (stryCov_9fa48("1424"), 'MemberExpression'):
        if (stryMutAct_9fa48("1423")) {} else {
          stryCov_9fa48("1423");
          return stryMutAct_9fa48("1427") ? key !== 'property' && computed : stryMutAct_9fa48("1426") ? false : stryMutAct_9fa48("1425") ? true : (stryCov_9fa48("1425", "1426", "1427"), (stryMutAct_9fa48("1429") ? key === 'property' : stryMutAct_9fa48("1428") ? false : (stryCov_9fa48("1428", "1429"), key !== (stryMutAct_9fa48("1430") ? "" : (stryCov_9fa48("1430"), 'property')))) || computed);
        }
      case stryMutAct_9fa48("1431") ? "" : (stryCov_9fa48("1431"), 'Property'):
      case stryMutAct_9fa48("1432") ? "" : (stryCov_9fa48("1432"), 'PropertyDefinition'):
      case stryMutAct_9fa48("1433") ? "" : (stryCov_9fa48("1433"), 'MethodDefinition'):
      case stryMutAct_9fa48("1435") ? "" : (stryCov_9fa48("1435"), 'AccessorProperty'):
        if (stryMutAct_9fa48("1434")) {} else {
          stryCov_9fa48("1434");
          return stryMutAct_9fa48("1438") ? key !== 'key' && computed : stryMutAct_9fa48("1437") ? false : stryMutAct_9fa48("1436") ? true : (stryCov_9fa48("1436", "1437", "1438"), (stryMutAct_9fa48("1440") ? key === 'key' : stryMutAct_9fa48("1439") ? false : (stryCov_9fa48("1439", "1440"), key !== (stryMutAct_9fa48("1441") ? "" : (stryCov_9fa48("1441"), 'key')))) || computed);
        }
      case stryMutAct_9fa48("1442") ? "" : (stryCov_9fa48("1442"), 'LabeledStatement'):
      case stryMutAct_9fa48("1443") ? "" : (stryCov_9fa48("1443"), 'BreakStatement'):
      case stryMutAct_9fa48("1445") ? "" : (stryCov_9fa48("1445"), 'ContinueStatement'):
        if (stryMutAct_9fa48("1444")) {} else {
          stryCov_9fa48("1444");
          return stryMutAct_9fa48("1448") ? key === 'label' : stryMutAct_9fa48("1447") ? false : stryMutAct_9fa48("1446") ? true : (stryCov_9fa48("1446", "1447", "1448"), key !== (stryMutAct_9fa48("1449") ? "" : (stryCov_9fa48("1449"), 'label')));
        }
      case stryMutAct_9fa48("1451") ? "" : (stryCov_9fa48("1451"), 'ImportSpecifier'):
        if (stryMutAct_9fa48("1450")) {} else {
          stryCov_9fa48("1450");
          return stryMutAct_9fa48("1454") ? key === 'imported' : stryMutAct_9fa48("1453") ? false : stryMutAct_9fa48("1452") ? true : (stryCov_9fa48("1452", "1453", "1454"), key !== (stryMutAct_9fa48("1455") ? "" : (stryCov_9fa48("1455"), 'imported')));
        }
      case stryMutAct_9fa48("1457") ? "" : (stryCov_9fa48("1457"), 'ExportSpecifier'):
        if (stryMutAct_9fa48("1456")) {} else {
          stryCov_9fa48("1456");
          return stryMutAct_9fa48("1460") ? key !== 'exported' || key !== 'local' : stryMutAct_9fa48("1459") ? false : stryMutAct_9fa48("1458") ? true : (stryCov_9fa48("1458", "1459", "1460"), (stryMutAct_9fa48("1462") ? key === 'exported' : stryMutAct_9fa48("1461") ? true : (stryCov_9fa48("1461", "1462"), key !== (stryMutAct_9fa48("1463") ? "" : (stryCov_9fa48("1463"), 'exported')))) && (stryMutAct_9fa48("1465") ? key === 'local' : stryMutAct_9fa48("1464") ? true : (stryCov_9fa48("1464", "1465"), key !== (stryMutAct_9fa48("1466") ? "" : (stryCov_9fa48("1466"), 'local')))));
        }
      case stryMutAct_9fa48("1468") ? "" : (stryCov_9fa48("1468"), 'MetaProperty'):
        if (stryMutAct_9fa48("1467")) {} else {
          stryCov_9fa48("1467");
          return stryMutAct_9fa48("1469") ? true : (stryCov_9fa48("1469"), false);
        }
      default:
        if (stryMutAct_9fa48("1470")) {} else {
          stryCov_9fa48("1470");
          return stryMutAct_9fa48("1471") ? false : (stryCov_9fa48("1471"), true);
        }
    }
  }
}

/**
 * Bind every name a binding pattern introduces.
 * @param pattern - an identifier, or any destructuring pattern around one.
 * @param into - the scope to bind them in.
 */
function declarePattern(pattern: Field | undefined, into: Set<string>): void {
  if (stryMutAct_9fa48("1472")) {
    {}
  } else {
    stryCov_9fa48("1472");
    if (stryMutAct_9fa48("1474") ? false : stryMutAct_9fa48("1473") ? true : (stryCov_9fa48("1473", "1474"), Array.isArray(pattern))) {
      if (stryMutAct_9fa48("1475")) {
        {}
      } else {
        stryCov_9fa48("1475");
        for (const item of pattern) if (stryMutAct_9fa48("1476")) {
          ;
        } else {
          stryCov_9fa48("1476");
          declarePattern(item, into);
        }
        return;
      }
    }
    if (stryMutAct_9fa48("1479") ? false : stryMutAct_9fa48("1478") ? true : stryMutAct_9fa48("1477") ? isNode(pattern) : (stryCov_9fa48("1477", "1478", "1479"), !isNode(pattern))) return;
    const node = pattern;
    if (stryMutAct_9fa48("1482") ? node.type === 'Identifier' || typeof node['name'] === 'string' : stryMutAct_9fa48("1481") ? false : stryMutAct_9fa48("1480") ? true : (stryCov_9fa48("1480", "1481", "1482"), (stryMutAct_9fa48("1484") ? node.type !== 'Identifier' : stryMutAct_9fa48("1483") ? true : (stryCov_9fa48("1483", "1484"), node.type === (stryMutAct_9fa48("1485") ? "" : (stryCov_9fa48("1485"), 'Identifier')))) && (stryMutAct_9fa48("1487") ? typeof node['name'] !== 'string' : stryMutAct_9fa48("1486") ? true : (stryCov_9fa48("1486", "1487"), typeof node[stryMutAct_9fa48("1488") ? "" : (stryCov_9fa48("1488"), 'name')] === (stryMutAct_9fa48("1489") ? "" : (stryCov_9fa48("1489"), 'string')))))) {
      if (stryMutAct_9fa48("1490")) {
        {}
      } else {
        stryCov_9fa48("1490");
        into.add(node[stryMutAct_9fa48("1492") ? "" : (stryCov_9fa48("1492"), 'name')]);
        return;
      }
    }
    for (const key of stryMutAct_9fa48("1493") ? [] : (stryCov_9fa48("1493"), [stryMutAct_9fa48("1494") ? "" : (stryCov_9fa48("1494"), 'properties'), stryMutAct_9fa48("1495") ? "" : (stryCov_9fa48("1495"), 'elements'), stryMutAct_9fa48("1496") ? "" : (stryCov_9fa48("1496"), 'value'), stryMutAct_9fa48("1497") ? "" : (stryCov_9fa48("1497"), 'left'), stryMutAct_9fa48("1498") ? "" : (stryCov_9fa48("1498"), 'argument')])) if (stryMutAct_9fa48("1499")) {
      ;
    } else {
      stryCov_9fa48("1499");
      declarePattern(fieldOf(node, key), into);
    }
  }
}

/**
 * Bind the `var` and function declarations anywhere below a node, without
 * descending into a nested function, which holds its own.
 * @param value - the node or list to sweep.
 * @param into - the function scope to bind them in.
 */
function hoistVars(value: Field | undefined, into: Set<string>): void {
  if (stryMutAct_9fa48("1500")) {
    {}
  } else {
    stryCov_9fa48("1500");
    if (stryMutAct_9fa48("1502") ? false : stryMutAct_9fa48("1501") ? true : (stryCov_9fa48("1501", "1502"), Array.isArray(value))) {
      if (stryMutAct_9fa48("1503")) {
        {}
      } else {
        stryCov_9fa48("1503");
        for (const item of value) if (stryMutAct_9fa48("1504")) {
          ;
        } else {
          stryCov_9fa48("1504");
          hoistVars(item, into);
        }
        return;
      }
    }
    if (stryMutAct_9fa48("1507") ? false : stryMutAct_9fa48("1506") ? true : stryMutAct_9fa48("1505") ? isNode(value) : (stryCov_9fa48("1505", "1506", "1507"), !isNode(value))) return;
    const node = value;
    if (stryMutAct_9fa48("1509") ? false : stryMutAct_9fa48("1508") ? true : (stryCov_9fa48("1508", "1509"), FUNCTION_LIKE.has(node.type))) {
      if (stryMutAct_9fa48("1510")) {
        {}
      } else {
        stryCov_9fa48("1510");
        if (stryMutAct_9fa48("1513") ? node.type !== 'FunctionDeclaration' : stryMutAct_9fa48("1512") ? false : stryMutAct_9fa48("1511") ? true : (stryCov_9fa48("1511", "1512", "1513"), node.type === (stryMutAct_9fa48("1514") ? "" : (stryCov_9fa48("1514"), 'FunctionDeclaration')))) declarePattern(node[stryMutAct_9fa48("1516") ? "" : (stryCov_9fa48("1516"), 'id')], into);
        return;
      }
    }
    if (stryMutAct_9fa48("1519") ? node.type === 'VariableDeclaration' || node['kind'] === 'var' : stryMutAct_9fa48("1518") ? false : stryMutAct_9fa48("1517") ? true : (stryCov_9fa48("1517", "1518", "1519"), (stryMutAct_9fa48("1521") ? node.type !== 'VariableDeclaration' : stryMutAct_9fa48("1520") ? true : (stryCov_9fa48("1520", "1521"), node.type === (stryMutAct_9fa48("1522") ? "" : (stryCov_9fa48("1522"), 'VariableDeclaration')))) && (stryMutAct_9fa48("1524") ? node['kind'] !== 'var' : stryMutAct_9fa48("1523") ? true : (stryCov_9fa48("1523", "1524"), node[stryMutAct_9fa48("1525") ? "" : (stryCov_9fa48("1525"), 'kind')] === (stryMutAct_9fa48("1526") ? "" : (stryCov_9fa48("1526"), 'var')))))) {
      if (stryMutAct_9fa48("1527")) {
        {}
      } else {
        stryCov_9fa48("1527");
        for (const declarator of nodesAt(node, stryMutAct_9fa48("1528") ? "" : (stryCov_9fa48("1528"), 'declarations'))) {
          if (stryMutAct_9fa48("1529")) {
            {}
          } else {
            stryCov_9fa48("1529");
            declarePattern(fieldOf(declarator, stryMutAct_9fa48("1531") ? "" : (stryCov_9fa48("1531"), 'id')), into);
          }
        }
      }
    }
    if (stryMutAct_9fa48("1534") ? node.type !== 'FunctionDeclaration' : stryMutAct_9fa48("1533") ? false : stryMutAct_9fa48("1532") ? true : (stryCov_9fa48("1532", "1533", "1534"), node.type === (stryMutAct_9fa48("1535") ? "" : (stryCov_9fa48("1535"), 'FunctionDeclaration')))) declarePattern(node[stryMutAct_9fa48("1537") ? "" : (stryCov_9fa48("1537"), 'id')], into);
    for (const [key, child] of Object.entries(node)) {
      if (stryMutAct_9fa48("1538")) {
        {}
      } else {
        stryCov_9fa48("1538");
        if (stryMutAct_9fa48("1541") ? key === 'type' : stryMutAct_9fa48("1540") ? false : stryMutAct_9fa48("1539") ? true : (stryCov_9fa48("1539", "1540", "1541"), key !== (stryMutAct_9fa48("1542") ? "" : (stryCov_9fa48("1542"), 'type')))) if (stryMutAct_9fa48("1543")) {
          ;
        } else {
          stryCov_9fa48("1543");
          hoistVars(child, into);
        }
      }
    }
  }
}

/**
 * Bind everything one statement list declares directly in its own scope.
 * @param statements - the list.
 * @param into - the scope to bind them in.
 */
function declareStatements(statements: readonly Node[], into: Set<string>): void {
  if (stryMutAct_9fa48("1544")) {
    {}
  } else {
    stryCov_9fa48("1544");
    for (const statement of statements) {
      if (stryMutAct_9fa48("1545")) {
        {}
      } else {
        stryCov_9fa48("1545");
        const node = (stryMutAct_9fa48("1548") ? statement.type === 'ExportNamedDeclaration' && statement.type === 'ExportDefaultDeclaration' : stryMutAct_9fa48("1547") ? false : stryMutAct_9fa48("1546") ? true : (stryCov_9fa48("1546", "1547", "1548"), (stryMutAct_9fa48("1550") ? statement.type !== 'ExportNamedDeclaration' : stryMutAct_9fa48("1549") ? false : (stryCov_9fa48("1549", "1550"), statement.type === (stryMutAct_9fa48("1551") ? "" : (stryCov_9fa48("1551"), 'ExportNamedDeclaration')))) || (stryMutAct_9fa48("1553") ? statement.type !== 'ExportDefaultDeclaration' : stryMutAct_9fa48("1552") ? false : (stryCov_9fa48("1552", "1553"), statement.type === (stryMutAct_9fa48("1554") ? "" : (stryCov_9fa48("1554"), 'ExportDefaultDeclaration')))))) ? stryMutAct_9fa48("1555") ? nodeAt(statement, 'declaration') && statement : (stryCov_9fa48("1555"), nodeAt(statement, stryMutAct_9fa48("1556") ? "" : (stryCov_9fa48("1556"), 'declaration')) ?? statement) : statement;
        if (stryMutAct_9fa48("1559") ? node.type === 'FunctionDeclaration' && node.type === 'ClassDeclaration' : stryMutAct_9fa48("1558") ? false : stryMutAct_9fa48("1557") ? true : (stryCov_9fa48("1557", "1558", "1559"), (stryMutAct_9fa48("1561") ? node.type !== 'FunctionDeclaration' : stryMutAct_9fa48("1560") ? false : (stryCov_9fa48("1560", "1561"), node.type === (stryMutAct_9fa48("1562") ? "" : (stryCov_9fa48("1562"), 'FunctionDeclaration')))) || (stryMutAct_9fa48("1564") ? node.type !== 'ClassDeclaration' : stryMutAct_9fa48("1563") ? false : (stryCov_9fa48("1563", "1564"), node.type === (stryMutAct_9fa48("1565") ? "" : (stryCov_9fa48("1565"), 'ClassDeclaration')))))) declarePattern(node[stryMutAct_9fa48("1567") ? "" : (stryCov_9fa48("1567"), 'id')], into);
        if (stryMutAct_9fa48("1570") ? node.type !== 'VariableDeclaration' : stryMutAct_9fa48("1569") ? false : stryMutAct_9fa48("1568") ? true : (stryCov_9fa48("1568", "1569", "1570"), node.type === (stryMutAct_9fa48("1571") ? "" : (stryCov_9fa48("1571"), 'VariableDeclaration')))) {
          if (stryMutAct_9fa48("1572")) {
            {}
          } else {
            stryCov_9fa48("1572");
            for (const declarator of nodesAt(node, stryMutAct_9fa48("1573") ? "" : (stryCov_9fa48("1573"), 'declarations'))) {
              if (stryMutAct_9fa48("1574")) {
                {}
              } else {
                stryCov_9fa48("1574");
                declarePattern(fieldOf(declarator, stryMutAct_9fa48("1576") ? "" : (stryCov_9fa48("1576"), 'id')), into);
              }
            }
          }
        }
        if (stryMutAct_9fa48("1579") ? node.type !== 'ImportDeclaration' : stryMutAct_9fa48("1578") ? false : stryMutAct_9fa48("1577") ? true : (stryCov_9fa48("1577", "1578", "1579"), node.type === (stryMutAct_9fa48("1580") ? "" : (stryCov_9fa48("1580"), 'ImportDeclaration')))) {
          if (stryMutAct_9fa48("1581")) {
            {}
          } else {
            stryCov_9fa48("1581");
            for (const specifier of nodesAt(node, stryMutAct_9fa48("1582") ? "" : (stryCov_9fa48("1582"), 'specifiers'))) {
              if (stryMutAct_9fa48("1583")) {
                {}
              } else {
                stryCov_9fa48("1583");
                declarePattern(fieldOf(specifier, stryMutAct_9fa48("1585") ? "" : (stryCov_9fa48("1585"), 'local')), into);
              }
            }
          }
        }
      }
    }
  }
}

/**
 * Open the scope a node introduces, with everything it binds already in it.
 * @param node - the node being entered.
 * @param parent - the scope it sits in.
 * @returns the new scope, or the parent when the node opens none.
 */
function scopeFor(node: Node, parent: Scope): Scope {
  if (stryMutAct_9fa48("1586")) {
    {}
  } else {
    stryCov_9fa48("1586");
    const isFunction = FUNCTION_LIKE.has(node.type);
    if (stryMutAct_9fa48("1589") ? !isFunction || !BLOCK_LIKE.has(node.type) : stryMutAct_9fa48("1588") ? false : stryMutAct_9fa48("1587") ? true : (stryCov_9fa48("1587", "1588", "1589"), (stryMutAct_9fa48("1590") ? isFunction : (stryCov_9fa48("1590"), !isFunction)) && (stryMutAct_9fa48("1591") ? BLOCK_LIKE.has(node.type) : (stryCov_9fa48("1591"), !BLOCK_LIKE.has(node.type))))) return parent;
    const names = new Set<string>();
    const scope: Scope = stryMutAct_9fa48("1592") ? {} : (stryCov_9fa48("1592"), {
      holdsVars: isFunction,
      names,
      parent
    });
    if (stryMutAct_9fa48("1594") ? false : stryMutAct_9fa48("1593") ? true : (stryCov_9fa48("1593", "1594"), isFunction)) {
      if (stryMutAct_9fa48("1595")) {
        {}
      } else {
        stryCov_9fa48("1595");
        declarePattern(fieldOf(node, stryMutAct_9fa48("1597") ? "" : (stryCov_9fa48("1597"), 'id')), names);
        for (const param of nodesAt(node, stryMutAct_9fa48("1598") ? "" : (stryCov_9fa48("1598"), 'params'))) if (stryMutAct_9fa48("1599")) {
          ;
        } else {
          stryCov_9fa48("1599");
          declarePattern(param, names);
        }
        hoistVars(fieldOf(node, stryMutAct_9fa48("1601") ? "" : (stryCov_9fa48("1601"), 'body')), names);
      }
    }
    if (stryMutAct_9fa48("1604") ? node.type !== 'CatchClause' : stryMutAct_9fa48("1603") ? false : stryMutAct_9fa48("1602") ? true : (stryCov_9fa48("1602", "1603", "1604"), node.type === (stryMutAct_9fa48("1605") ? "" : (stryCov_9fa48("1605"), 'CatchClause')))) declarePattern(fieldOf(node, stryMutAct_9fa48("1607") ? "" : (stryCov_9fa48("1607"), 'param')), names);
    if (stryMutAct_9fa48("1610") ? node.type === 'ClassDeclaration' && node.type === 'ClassExpression' : stryMutAct_9fa48("1609") ? false : stryMutAct_9fa48("1608") ? true : (stryCov_9fa48("1608", "1609", "1610"), (stryMutAct_9fa48("1612") ? node.type !== 'ClassDeclaration' : stryMutAct_9fa48("1611") ? false : (stryCov_9fa48("1611", "1612"), node.type === (stryMutAct_9fa48("1613") ? "" : (stryCov_9fa48("1613"), 'ClassDeclaration')))) || (stryMutAct_9fa48("1615") ? node.type !== 'ClassExpression' : stryMutAct_9fa48("1614") ? false : (stryCov_9fa48("1614", "1615"), node.type === (stryMutAct_9fa48("1616") ? "" : (stryCov_9fa48("1616"), 'ClassExpression')))))) declarePattern(fieldOf(node, stryMutAct_9fa48("1618") ? "" : (stryCov_9fa48("1618"), 'id')), names);
    for (const key of stryMutAct_9fa48("1619") ? [] : (stryCov_9fa48("1619"), [stryMutAct_9fa48("1620") ? "" : (stryCov_9fa48("1620"), 'body'), stryMutAct_9fa48("1621") ? "" : (stryCov_9fa48("1621"), 'init'), stryMutAct_9fa48("1622") ? "" : (stryCov_9fa48("1622"), 'left'), stryMutAct_9fa48("1623") ? "" : (stryCov_9fa48("1623"), 'cases')])) {
      if (stryMutAct_9fa48("1624")) {
        {}
      } else {
        stryCov_9fa48("1624");
        const field = fieldOf(node, key);
        declareStatements(Array.isArray(field) ? nodesAt(node, key) : nodesAt(field, stryMutAct_9fa48("1626") ? "" : (stryCov_9fa48("1626"), 'body')), names);
        if (stryMutAct_9fa48("1629") ? isNode(field) || field.type === 'VariableDeclaration' : stryMutAct_9fa48("1628") ? false : stryMutAct_9fa48("1627") ? true : (stryCov_9fa48("1627", "1628", "1629"), isNode(field) && (stryMutAct_9fa48("1631") ? field.type !== 'VariableDeclaration' : stryMutAct_9fa48("1630") ? true : (stryCov_9fa48("1630", "1631"), field.type === (stryMutAct_9fa48("1632") ? "" : (stryCov_9fa48("1632"), 'VariableDeclaration')))))) declareStatements(stryMutAct_9fa48("1634") ? [] : (stryCov_9fa48("1634"), [field]), names);
        if (stryMutAct_9fa48("1636") ? false : stryMutAct_9fa48("1635") ? true : (stryCov_9fa48("1635", "1636"), Array.isArray(field))) {
          if (stryMutAct_9fa48("1637")) {
            {}
          } else {
            stryCov_9fa48("1637");
            for (const item of field) if (stryMutAct_9fa48("1640") ? isNode(item) || item.type === 'SwitchCase' : stryMutAct_9fa48("1639") ? false : stryMutAct_9fa48("1638") ? true : (stryCov_9fa48("1638", "1639", "1640"), isNode(item) && (stryMutAct_9fa48("1642") ? item.type !== 'SwitchCase' : stryMutAct_9fa48("1641") ? true : (stryCov_9fa48("1641", "1642"), item.type === (stryMutAct_9fa48("1643") ? "" : (stryCov_9fa48("1643"), 'SwitchCase')))))) if (stryMutAct_9fa48("1644")) {
              ;
            } else {
              stryCov_9fa48("1644");
              declareStatements(itemBody(item), names);
            }
          }
        }
      }
    }
    return scope;
  }
}

/**
 * The statements one switch case holds.
 * @param node - the case.
 * @returns its consequent statements.
 */
function itemBody(node: Node): readonly Node[] {
  if (stryMutAct_9fa48("1645")) {
    {}
  } else {
    stryCov_9fa48("1645");
    return nodesAt(node, stryMutAct_9fa48("1646") ? "" : (stryCov_9fa48("1646"), 'consequent'));
  }
}

/**
 * Whether any scope in the chain binds a name.
 * @param scope - the innermost scope.
 * @param name - the name to look for.
 * @returns true when something binds it.
 */
function bound(scope: Scope | undefined, name: string): boolean {
  if (stryMutAct_9fa48("1647")) {
    {}
  } else {
    stryCov_9fa48("1647");
    for (let current = scope; stryMutAct_9fa48("1649") ? current === undefined : stryMutAct_9fa48("1648") ? false : (stryCov_9fa48("1648", "1649"), current !== undefined); current = current.parent) {
      if (stryMutAct_9fa48("1650")) {
        {}
      } else {
        stryCov_9fa48("1650");
        if (stryMutAct_9fa48("1652") ? false : stryMutAct_9fa48("1651") ? true : (stryCov_9fa48("1651", "1652"), current.names.has(name))) return stryMutAct_9fa48("1653") ? false : (stryCov_9fa48("1653"), true);
      }
    }
    return stryMutAct_9fa48("1654") ? true : (stryCov_9fa48("1654"), false);
  }
}

/**
 * Every name a source reads without binding it.
 * @param label - a path, which selects the dialect the source is parsed as.
 * @param text - the source.
 * @returns the free names, sorted, each reported once.
 */
export function freeNames(label: string, text: string): string[] {
  if (stryMutAct_9fa48("1655")) {
    {}
  } else {
    stryCov_9fa48("1655");
    const parsed = parseScript(label, text);
    if (stryMutAct_9fa48("1659") ? parsed.errors.length <= 0 : stryMutAct_9fa48("1658") ? parsed.errors.length >= 0 : stryMutAct_9fa48("1657") ? false : stryMutAct_9fa48("1656") ? true : (stryCov_9fa48("1656", "1657", "1658", "1659"), parsed.errors.length > 0)) return stryMutAct_9fa48("1660") ? [] : (stryCov_9fa48("1660"), [stryMutAct_9fa48("1661") ? `` : (stryCov_9fa48("1661"), `this source does not parse: ${stryMutAct_9fa48("1662") ? parsed.errors[0]?.message && '' : (stryCov_9fa48("1662"), (stryMutAct_9fa48("1663") ? parsed.errors[0].message : (stryCov_9fa48("1663"), parsed.errors[0]?.message)) ?? (stryMutAct_9fa48("1664") ? "Stryker was here!" : (stryCov_9fa48("1664"), '')))}`)]);
    const top: Scope = stryMutAct_9fa48("1665") ? {} : (stryCov_9fa48("1665"), {
      holdsVars: stryMutAct_9fa48("1666") ? false : (stryCov_9fa48("1666"), true),
      names: new Set<string>()
    });
    if (stryMutAct_9fa48("1667")) {
      ;
    } else {
      stryCov_9fa48("1667");
      declareStatements(parsed.body, top.names);
    }
    if (stryMutAct_9fa48("1668")) {
      ;
    } else {
      stryCov_9fa48("1668");
      hoistVars(parsed.body, top.names);
    }
    const free = new Set<string>();
    const visit = (node: Node, parent: Node | undefined, key: string, scope: Scope): void => {
      if (stryMutAct_9fa48("1669")) {
        {}
      } else {
        stryCov_9fa48("1669");
        if (stryMutAct_9fa48("1672") ? node.type === 'Identifier' || typeof node['name'] === 'string' : stryMutAct_9fa48("1671") ? false : stryMutAct_9fa48("1670") ? true : (stryCov_9fa48("1670", "1671", "1672"), (stryMutAct_9fa48("1674") ? node.type !== 'Identifier' : stryMutAct_9fa48("1673") ? true : (stryCov_9fa48("1673", "1674"), node.type === (stryMutAct_9fa48("1675") ? "" : (stryCov_9fa48("1675"), 'Identifier')))) && (stryMutAct_9fa48("1677") ? typeof node['name'] !== 'string' : stryMutAct_9fa48("1676") ? true : (stryCov_9fa48("1676", "1677"), typeof node[stryMutAct_9fa48("1678") ? "" : (stryCov_9fa48("1678"), 'name')] === (stryMutAct_9fa48("1679") ? "" : (stryCov_9fa48("1679"), 'string')))))) {
          if (stryMutAct_9fa48("1680")) {
            {}
          } else {
            stryCov_9fa48("1680");
            if (stryMutAct_9fa48("1683") ? isReference(parent, key) || !bound(scope, node['name']) : stryMutAct_9fa48("1682") ? false : stryMutAct_9fa48("1681") ? true : (stryCov_9fa48("1681", "1682", "1683"), isReference(parent, key) && (stryMutAct_9fa48("1684") ? bound(scope, node['name']) : (stryCov_9fa48("1684"), !bound(scope, node[stryMutAct_9fa48("1685") ? "" : (stryCov_9fa48("1685"), 'name')]))))) free.add(node[stryMutAct_9fa48("1687") ? "" : (stryCov_9fa48("1687"), 'name')]);
            return;
          }
        }
        const inner = scopeFor(node, scope);
        for (const [childKey, child] of Object.entries(node)) {
          if (stryMutAct_9fa48("1688")) {
            {}
          } else {
            stryCov_9fa48("1688");
            if (stryMutAct_9fa48("1691") ? childKey !== 'type' : stryMutAct_9fa48("1690") ? false : stryMutAct_9fa48("1689") ? true : (stryCov_9fa48("1689", "1690", "1691"), childKey === (stryMutAct_9fa48("1692") ? "" : (stryCov_9fa48("1692"), 'type')))) continue;
            const items = Array.isArray(child) ? child : stryMutAct_9fa48("1693") ? [] : (stryCov_9fa48("1693"), [child]);
            for (const item of items) if (stryMutAct_9fa48("1695") ? false : stryMutAct_9fa48("1694") ? true : (stryCov_9fa48("1694", "1695"), isNode(item))) if (stryMutAct_9fa48("1696")) {
              ;
            } else {
              stryCov_9fa48("1696");
              visit(item, node, childKey, inner);
            }
          }
        }
      }
    };
    for (const statement of parsed.body) visit(statement, undefined, stryMutAct_9fa48("1698") ? "" : (stryCov_9fa48("1698"), 'body'), top);
    return (stryMutAct_9fa48("1699") ? [] : (stryCov_9fa48("1699"), [...free])).toSorted();
  }
}