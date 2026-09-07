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
import { type Field, fieldOf, isNode, type Node, nodeOr, nodesOf, parseScript } from './ast.ts';

/** One lexical scope, and the names it binds. */
interface Scope {
  /** Whether this scope holds `var` and hoisted function declarations. */
  readonly holdsVars: boolean;
  readonly names: Set<string>;
  readonly parent?: Scope;
}

/** Node types that open a scope holding `var` declarations. */
const FUNCTION_LIKE = new Set(stryMutAct_9fa48("948") ? [] : (stryCov_9fa48("948"), [stryMutAct_9fa48("949") ? "" : (stryCov_9fa48("949"), 'FunctionDeclaration'), stryMutAct_9fa48("950") ? "" : (stryCov_9fa48("950"), 'FunctionExpression'), stryMutAct_9fa48("951") ? "" : (stryCov_9fa48("951"), 'ArrowFunctionExpression')]));

/** Node types that open a block scope. */
const BLOCK_LIKE = new Set(stryMutAct_9fa48("952") ? [] : (stryCov_9fa48("952"), [stryMutAct_9fa48("953") ? "" : (stryCov_9fa48("953"), 'BlockStatement'), stryMutAct_9fa48("954") ? "" : (stryCov_9fa48("954"), 'StaticBlock'), stryMutAct_9fa48("955") ? "" : (stryCov_9fa48("955"), 'ForStatement'), stryMutAct_9fa48("956") ? "" : (stryCov_9fa48("956"), 'ForInStatement'), stryMutAct_9fa48("957") ? "" : (stryCov_9fa48("957"), 'ForOfStatement'), stryMutAct_9fa48("958") ? "" : (stryCov_9fa48("958"), 'CatchClause'), stryMutAct_9fa48("959") ? "" : (stryCov_9fa48("959"), 'SwitchStatement'), stryMutAct_9fa48("960") ? "" : (stryCov_9fa48("960"), 'ClassDeclaration'), stryMutAct_9fa48("961") ? "" : (stryCov_9fa48("961"), 'ClassExpression')]));

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
  if (stryMutAct_9fa48("962")) {
    {}
  } else {
    stryCov_9fa48("962");
    if (stryMutAct_9fa48("965") ? parent !== undefined : stryMutAct_9fa48("964") ? false : stryMutAct_9fa48("963") ? true : (stryCov_9fa48("963", "964", "965"), parent === undefined)) return stryMutAct_9fa48("966") ? false : (stryCov_9fa48("966"), true);
    const computed = stryMutAct_9fa48("969") ? fieldOf(parent, 'computed') !== true : stryMutAct_9fa48("968") ? false : stryMutAct_9fa48("967") ? true : (stryCov_9fa48("967", "968", "969"), fieldOf(parent, stryMutAct_9fa48("970") ? "" : (stryCov_9fa48("970"), 'computed')) === (stryMutAct_9fa48("971") ? false : (stryCov_9fa48("971"), true)));
    switch (parent.type) {
      case stryMutAct_9fa48("973") ? "" : (stryCov_9fa48("973"), 'MemberExpression'):
        if (stryMutAct_9fa48("972")) {} else {
          stryCov_9fa48("972");
          return stryMutAct_9fa48("976") ? key !== 'property' && computed : stryMutAct_9fa48("975") ? false : stryMutAct_9fa48("974") ? true : (stryCov_9fa48("974", "975", "976"), (stryMutAct_9fa48("978") ? key === 'property' : stryMutAct_9fa48("977") ? false : (stryCov_9fa48("977", "978"), key !== (stryMutAct_9fa48("979") ? "" : (stryCov_9fa48("979"), 'property')))) || computed);
        }
      case stryMutAct_9fa48("980") ? "" : (stryCov_9fa48("980"), 'Property'):
      case stryMutAct_9fa48("981") ? "" : (stryCov_9fa48("981"), 'PropertyDefinition'):
      case stryMutAct_9fa48("982") ? "" : (stryCov_9fa48("982"), 'MethodDefinition'):
      case stryMutAct_9fa48("984") ? "" : (stryCov_9fa48("984"), 'AccessorProperty'):
        if (stryMutAct_9fa48("983")) {} else {
          stryCov_9fa48("983");
          return stryMutAct_9fa48("987") ? key !== 'key' && computed : stryMutAct_9fa48("986") ? false : stryMutAct_9fa48("985") ? true : (stryCov_9fa48("985", "986", "987"), (stryMutAct_9fa48("989") ? key === 'key' : stryMutAct_9fa48("988") ? false : (stryCov_9fa48("988", "989"), key !== (stryMutAct_9fa48("990") ? "" : (stryCov_9fa48("990"), 'key')))) || computed);
        }
      case stryMutAct_9fa48("991") ? "" : (stryCov_9fa48("991"), 'LabeledStatement'):
      case stryMutAct_9fa48("992") ? "" : (stryCov_9fa48("992"), 'BreakStatement'):
      case stryMutAct_9fa48("994") ? "" : (stryCov_9fa48("994"), 'ContinueStatement'):
        if (stryMutAct_9fa48("993")) {} else {
          stryCov_9fa48("993");
          return stryMutAct_9fa48("997") ? key === 'label' : stryMutAct_9fa48("996") ? false : stryMutAct_9fa48("995") ? true : (stryCov_9fa48("995", "996", "997"), key !== (stryMutAct_9fa48("998") ? "" : (stryCov_9fa48("998"), 'label')));
        }
      case stryMutAct_9fa48("1000") ? "" : (stryCov_9fa48("1000"), 'ImportSpecifier'):
        if (stryMutAct_9fa48("999")) {} else {
          stryCov_9fa48("999");
          return stryMutAct_9fa48("1003") ? key === 'imported' : stryMutAct_9fa48("1002") ? false : stryMutAct_9fa48("1001") ? true : (stryCov_9fa48("1001", "1002", "1003"), key !== (stryMutAct_9fa48("1004") ? "" : (stryCov_9fa48("1004"), 'imported')));
        }
      case stryMutAct_9fa48("1006") ? "" : (stryCov_9fa48("1006"), 'ExportSpecifier'):
        if (stryMutAct_9fa48("1005")) {} else {
          stryCov_9fa48("1005");
          return stryMutAct_9fa48("1009") ? key !== 'exported' || key !== 'local' : stryMutAct_9fa48("1008") ? false : stryMutAct_9fa48("1007") ? true : (stryCov_9fa48("1007", "1008", "1009"), (stryMutAct_9fa48("1011") ? key === 'exported' : stryMutAct_9fa48("1010") ? true : (stryCov_9fa48("1010", "1011"), key !== (stryMutAct_9fa48("1012") ? "" : (stryCov_9fa48("1012"), 'exported')))) && (stryMutAct_9fa48("1014") ? key === 'local' : stryMutAct_9fa48("1013") ? true : (stryCov_9fa48("1013", "1014"), key !== (stryMutAct_9fa48("1015") ? "" : (stryCov_9fa48("1015"), 'local')))));
        }
      case stryMutAct_9fa48("1017") ? "" : (stryCov_9fa48("1017"), 'MetaProperty'):
        if (stryMutAct_9fa48("1016")) {} else {
          stryCov_9fa48("1016");
          return stryMutAct_9fa48("1018") ? true : (stryCov_9fa48("1018"), false);
        }
      default:
        if (stryMutAct_9fa48("1019")) {} else {
          stryCov_9fa48("1019");
          return stryMutAct_9fa48("1020") ? false : (stryCov_9fa48("1020"), true);
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
  if (stryMutAct_9fa48("1021")) {
    {}
  } else {
    stryCov_9fa48("1021");
    if (stryMutAct_9fa48("1023") ? false : stryMutAct_9fa48("1022") ? true : (stryCov_9fa48("1022", "1023"), Array.isArray(pattern))) {
      if (stryMutAct_9fa48("1024")) {
        {}
      } else {
        stryCov_9fa48("1024");
        for (const item of pattern) if (stryMutAct_9fa48("1025")) {
          ;
        } else {
          stryCov_9fa48("1025");
          declarePattern(item, into);
        }
        return;
      }
    }
    if (stryMutAct_9fa48("1028") ? false : stryMutAct_9fa48("1027") ? true : stryMutAct_9fa48("1026") ? isNode(pattern) : (stryCov_9fa48("1026", "1027", "1028"), !isNode(pattern))) return;
    const node = pattern;
    if (stryMutAct_9fa48("1031") ? node.type === 'Identifier' || typeof node.name === 'string' : stryMutAct_9fa48("1030") ? false : stryMutAct_9fa48("1029") ? true : (stryCov_9fa48("1029", "1030", "1031"), (stryMutAct_9fa48("1033") ? node.type !== 'Identifier' : stryMutAct_9fa48("1032") ? true : (stryCov_9fa48("1032", "1033"), node.type === (stryMutAct_9fa48("1034") ? "" : (stryCov_9fa48("1034"), 'Identifier')))) && (stryMutAct_9fa48("1036") ? typeof node.name !== 'string' : stryMutAct_9fa48("1035") ? true : (stryCov_9fa48("1035", "1036"), typeof node.name === (stryMutAct_9fa48("1037") ? "" : (stryCov_9fa48("1037"), 'string')))))) {
      if (stryMutAct_9fa48("1038")) {
        {}
      } else {
        stryCov_9fa48("1038");
        if (stryMutAct_9fa48("1039")) {
          ;
        } else {
          stryCov_9fa48("1039");
          into.add(node.name);
        }
        return;
      }
    }
    for (const key of stryMutAct_9fa48("1040") ? [] : (stryCov_9fa48("1040"), [stryMutAct_9fa48("1041") ? "" : (stryCov_9fa48("1041"), 'properties'), stryMutAct_9fa48("1042") ? "" : (stryCov_9fa48("1042"), 'elements'), stryMutAct_9fa48("1043") ? "" : (stryCov_9fa48("1043"), 'value'), stryMutAct_9fa48("1044") ? "" : (stryCov_9fa48("1044"), 'left'), stryMutAct_9fa48("1045") ? "" : (stryCov_9fa48("1045"), 'argument')])) if (stryMutAct_9fa48("1046")) {
      ;
    } else {
      stryCov_9fa48("1046");
      declarePattern(fieldOf(node, key), into);
    }
  }
}

/**
 * Bind every name one variable declaration introduces.
 *
 * The same walk answers a `var` swept up by the hoist and a `let` or `const`
 * declared in a block: a declaration binds its declarators' patterns whichever
 * scope it lands in, and it was written out twice.
 * @param node - the VariableDeclaration.
 * @param into - the scope to bind them in.
 */
function declareVariableNames(node: Node, into: Set<string>): void {
  if (stryMutAct_9fa48("1047")) {
    {}
  } else {
    stryCov_9fa48("1047");
    for (const declarator of nodesOf(fieldOf(node, stryMutAct_9fa48("1048") ? "" : (stryCov_9fa48("1048"), 'declarations')))) declarePattern(fieldOf(declarator, stryMutAct_9fa48("1050") ? "" : (stryCov_9fa48("1050"), 'id')), into);
  }
}

/**
 * Bind the `var` and function declarations anywhere below a node, without
 * descending into a nested function, which holds its own.
 * @param value - the node or list to sweep.
 * @param into - the function scope to bind them in.
 */
function hoistVars(value: Field | undefined, into: Set<string>): void {
  if (stryMutAct_9fa48("1051")) {
    {}
  } else {
    stryCov_9fa48("1051");
    if (stryMutAct_9fa48("1053") ? false : stryMutAct_9fa48("1052") ? true : (stryCov_9fa48("1052", "1053"), Array.isArray(value))) {
      if (stryMutAct_9fa48("1054")) {
        {}
      } else {
        stryCov_9fa48("1054");
        for (const item of value) if (stryMutAct_9fa48("1055")) {
          ;
        } else {
          stryCov_9fa48("1055");
          hoistVars(item, into);
        }
        return;
      }
    }
    if (stryMutAct_9fa48("1058") ? false : stryMutAct_9fa48("1057") ? true : stryMutAct_9fa48("1056") ? isNode(value) : (stryCov_9fa48("1056", "1057", "1058"), !isNode(value))) return;
    const node = value;
    // A function declaration is function-like, so the branch above is the only
    // one that ever sees one. A second binding of the same id stood after it and
    // could not be reached: `FUNCTION_LIKE` holds `FunctionDeclaration`, so the
    // return had already been taken.
    if (stryMutAct_9fa48("1060") ? false : stryMutAct_9fa48("1059") ? true : (stryCov_9fa48("1059", "1060"), FUNCTION_LIKE.has(node.type))) {
      if (stryMutAct_9fa48("1061")) {
        {}
      } else {
        stryCov_9fa48("1061");
        if (stryMutAct_9fa48("1064") ? node.type !== 'FunctionDeclaration' : stryMutAct_9fa48("1063") ? false : stryMutAct_9fa48("1062") ? true : (stryCov_9fa48("1062", "1063", "1064"), node.type === (stryMutAct_9fa48("1065") ? "" : (stryCov_9fa48("1065"), 'FunctionDeclaration')))) if (stryMutAct_9fa48("1066")) {
          ;
        } else {
          stryCov_9fa48("1066");
          declarePattern(node.id, into);
        }
        return;
      }
    }
    if (stryMutAct_9fa48("1069") ? node.type === 'VariableDeclaration' || node.kind === 'var' : stryMutAct_9fa48("1068") ? false : stryMutAct_9fa48("1067") ? true : (stryCov_9fa48("1067", "1068", "1069"), (stryMutAct_9fa48("1071") ? node.type !== 'VariableDeclaration' : stryMutAct_9fa48("1070") ? true : (stryCov_9fa48("1070", "1071"), node.type === (stryMutAct_9fa48("1072") ? "" : (stryCov_9fa48("1072"), 'VariableDeclaration')))) && (stryMutAct_9fa48("1074") ? node.kind !== 'var' : stryMutAct_9fa48("1073") ? true : (stryCov_9fa48("1073", "1074"), node.kind === (stryMutAct_9fa48("1075") ? "" : (stryCov_9fa48("1075"), 'var')))))) if (stryMutAct_9fa48("1076")) {
      ;
    } else {
      stryCov_9fa48("1076");
      declareVariableNames(node, into);
    }
    for (const [key, child] of Object.entries(node)) {
      if (stryMutAct_9fa48("1077")) {
        {}
      } else {
        stryCov_9fa48("1077");
        if (stryMutAct_9fa48("1080") ? key === 'type' : stryMutAct_9fa48("1079") ? false : stryMutAct_9fa48("1078") ? true : (stryCov_9fa48("1078", "1079", "1080"), key !== (stryMutAct_9fa48("1081") ? "" : (stryCov_9fa48("1081"), 'type')))) if (stryMutAct_9fa48("1082")) {
          ;
        } else {
          stryCov_9fa48("1082");
          hoistVars(child, into);
        }
      }
    }
  }
}

/**
 * The declaration an export statement wraps, or the statement itself.
 * @param statement - the statement.
 * @returns what actually declares a name.
 */
function declaring(statement: Node): Node {
  if (stryMutAct_9fa48("1083")) {
    {}
  } else {
    stryCov_9fa48("1083");
    return (stryMutAct_9fa48("1086") ? statement.type === 'ExportNamedDeclaration' && statement.type === 'ExportDefaultDeclaration' : stryMutAct_9fa48("1085") ? false : stryMutAct_9fa48("1084") ? true : (stryCov_9fa48("1084", "1085", "1086"), (stryMutAct_9fa48("1088") ? statement.type !== 'ExportNamedDeclaration' : stryMutAct_9fa48("1087") ? false : (stryCov_9fa48("1087", "1088"), statement.type === (stryMutAct_9fa48("1089") ? "" : (stryCov_9fa48("1089"), 'ExportNamedDeclaration')))) || (stryMutAct_9fa48("1091") ? statement.type !== 'ExportDefaultDeclaration' : stryMutAct_9fa48("1090") ? false : (stryCov_9fa48("1090", "1091"), statement.type === (stryMutAct_9fa48("1092") ? "" : (stryCov_9fa48("1092"), 'ExportDefaultDeclaration')))))) ? nodeOr(fieldOf(statement, stryMutAct_9fa48("1093") ? "" : (stryCov_9fa48("1093"), 'declaration')), statement) : statement;
  }
}

/**
 * Bind everything one statement declares directly in its own scope.
 * @param node - the statement, already unwrapped from any export around it.
 * @param into - the scope to bind them in.
 */
function declareStatement(node: Node, into: Set<string>): void {
  if (stryMutAct_9fa48("1094")) {
    {}
  } else {
    stryCov_9fa48("1094");
    if (stryMutAct_9fa48("1097") ? node.type === 'FunctionDeclaration' && node.type === 'ClassDeclaration' : stryMutAct_9fa48("1096") ? false : stryMutAct_9fa48("1095") ? true : (stryCov_9fa48("1095", "1096", "1097"), (stryMutAct_9fa48("1099") ? node.type !== 'FunctionDeclaration' : stryMutAct_9fa48("1098") ? false : (stryCov_9fa48("1098", "1099"), node.type === (stryMutAct_9fa48("1100") ? "" : (stryCov_9fa48("1100"), 'FunctionDeclaration')))) || (stryMutAct_9fa48("1102") ? node.type !== 'ClassDeclaration' : stryMutAct_9fa48("1101") ? false : (stryCov_9fa48("1101", "1102"), node.type === (stryMutAct_9fa48("1103") ? "" : (stryCov_9fa48("1103"), 'ClassDeclaration')))))) if (stryMutAct_9fa48("1104")) {
      ;
    } else {
      stryCov_9fa48("1104");
      declarePattern(node.id, into);
    }
    if (stryMutAct_9fa48("1107") ? node.type !== 'VariableDeclaration' : stryMutAct_9fa48("1106") ? false : stryMutAct_9fa48("1105") ? true : (stryCov_9fa48("1105", "1106", "1107"), node.type === (stryMutAct_9fa48("1108") ? "" : (stryCov_9fa48("1108"), 'VariableDeclaration')))) if (stryMutAct_9fa48("1109")) {
      ;
    } else {
      stryCov_9fa48("1109");
      declareVariableNames(node, into);
    }
    if (stryMutAct_9fa48("1112") ? node.type !== 'ImportDeclaration' : stryMutAct_9fa48("1111") ? false : stryMutAct_9fa48("1110") ? true : (stryCov_9fa48("1110", "1111", "1112"), node.type === (stryMutAct_9fa48("1113") ? "" : (stryCov_9fa48("1113"), 'ImportDeclaration')))) {
      if (stryMutAct_9fa48("1114")) {
        {}
      } else {
        stryCov_9fa48("1114");
        for (const specifier of nodesOf(fieldOf(node, stryMutAct_9fa48("1115") ? "" : (stryCov_9fa48("1115"), 'specifiers')))) declarePattern(fieldOf(specifier, stryMutAct_9fa48("1117") ? "" : (stryCov_9fa48("1117"), 'local')), into);
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
  if (stryMutAct_9fa48("1118")) {
    {}
  } else {
    stryCov_9fa48("1118");
    for (const statement of statements) if (stryMutAct_9fa48("1119")) {
      ;
    } else {
      stryCov_9fa48("1119");
      declareStatement(declaring(statement), into);
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
  if (stryMutAct_9fa48("1120")) {
    {}
  } else {
    stryCov_9fa48("1120");
    const isFunction = FUNCTION_LIKE.has(node.type);
    if (stryMutAct_9fa48("1123") ? !isFunction || !BLOCK_LIKE.has(node.type) : stryMutAct_9fa48("1122") ? false : stryMutAct_9fa48("1121") ? true : (stryCov_9fa48("1121", "1122", "1123"), (stryMutAct_9fa48("1124") ? isFunction : (stryCov_9fa48("1124"), !isFunction)) && (stryMutAct_9fa48("1125") ? BLOCK_LIKE.has(node.type) : (stryCov_9fa48("1125"), !BLOCK_LIKE.has(node.type))))) return parent;
    const names = new Set<string>();
    const scope: Scope = stryMutAct_9fa48("1126") ? {} : (stryCov_9fa48("1126"), {
      holdsVars: isFunction,
      names,
      parent
    });
    if (stryMutAct_9fa48("1128") ? false : stryMutAct_9fa48("1127") ? true : (stryCov_9fa48("1127", "1128"), isFunction)) if (stryMutAct_9fa48("1129")) {
      ;
    } else {
      stryCov_9fa48("1129");
      declareFunctionNames(node, names);
    }
    if (stryMutAct_9fa48("1132") ? node.type !== 'CatchClause' : stryMutAct_9fa48("1131") ? false : stryMutAct_9fa48("1130") ? true : (stryCov_9fa48("1130", "1131", "1132"), node.type === (stryMutAct_9fa48("1133") ? "" : (stryCov_9fa48("1133"), 'CatchClause')))) declarePattern(fieldOf(node, stryMutAct_9fa48("1135") ? "" : (stryCov_9fa48("1135"), 'param')), names);
    if (stryMutAct_9fa48("1138") ? node.type === 'ClassDeclaration' && node.type === 'ClassExpression' : stryMutAct_9fa48("1137") ? false : stryMutAct_9fa48("1136") ? true : (stryCov_9fa48("1136", "1137", "1138"), (stryMutAct_9fa48("1140") ? node.type !== 'ClassDeclaration' : stryMutAct_9fa48("1139") ? false : (stryCov_9fa48("1139", "1140"), node.type === (stryMutAct_9fa48("1141") ? "" : (stryCov_9fa48("1141"), 'ClassDeclaration')))) || (stryMutAct_9fa48("1143") ? node.type !== 'ClassExpression' : stryMutAct_9fa48("1142") ? false : (stryCov_9fa48("1142", "1143"), node.type === (stryMutAct_9fa48("1144") ? "" : (stryCov_9fa48("1144"), 'ClassExpression')))))) declarePattern(fieldOf(node, stryMutAct_9fa48("1146") ? "" : (stryCov_9fa48("1146"), 'id')), names);
    for (const key of stryMutAct_9fa48("1147") ? [] : (stryCov_9fa48("1147"), [stryMutAct_9fa48("1148") ? "" : (stryCov_9fa48("1148"), 'body'), stryMutAct_9fa48("1149") ? "" : (stryCov_9fa48("1149"), 'init'), stryMutAct_9fa48("1150") ? "" : (stryCov_9fa48("1150"), 'left'), stryMutAct_9fa48("1151") ? "" : (stryCov_9fa48("1151"), 'cases')])) if (stryMutAct_9fa48("1152")) {
      ;
    } else {
      stryCov_9fa48("1152");
      declareFieldNames(fieldOf(node, key), names);
    }
    return scope;
  }
}

/**
 * Bind what a function brings with it: its own name, its parameters, and every
 * `var` and function declaration hoisted out of its body.
 * @param node - the function node.
 * @param names - the scope being opened.
 */
function declareFunctionNames(node: Node, names: Set<string>): void {
  if (stryMutAct_9fa48("1153")) {
    {}
  } else {
    stryCov_9fa48("1153");
    declarePattern(fieldOf(node, stryMutAct_9fa48("1155") ? "" : (stryCov_9fa48("1155"), 'id')), names);
    for (const param of nodesOf(fieldOf(node, stryMutAct_9fa48("1156") ? "" : (stryCov_9fa48("1156"), 'params')))) if (stryMutAct_9fa48("1157")) {
      ;
    } else {
      stryCov_9fa48("1157");
      declarePattern(param, names);
    }
    hoistVars(fieldOf(node, stryMutAct_9fa48("1159") ? "" : (stryCov_9fa48("1159"), 'body')), names);
  }
}

/**
 * Bind what one field of a scope-opening node declares.
 *
 * A field is a statement list, a block holding one, a bare declaration — a
 * `for` head's `init` — or a list of switch cases, and each of those declares
 * into the scope the node opened.
 * @param field - the field's value.
 * @param names - the scope being opened.
 */
function declareFieldNames(field: Field | undefined, names: Set<string>): void {
  if (stryMutAct_9fa48("1160")) {
    {}
  } else {
    stryCov_9fa48("1160");
    declareStatements(Array.isArray(field) ? nodesOf(field) : nodesOf(fieldOf(field, stryMutAct_9fa48("1162") ? "" : (stryCov_9fa48("1162"), 'body'))), names);
    if (stryMutAct_9fa48("1165") ? isNode(field) || field.type === 'VariableDeclaration' : stryMutAct_9fa48("1164") ? false : stryMutAct_9fa48("1163") ? true : (stryCov_9fa48("1163", "1164", "1165"), isNode(field) && (stryMutAct_9fa48("1167") ? field.type !== 'VariableDeclaration' : stryMutAct_9fa48("1166") ? true : (stryCov_9fa48("1166", "1167"), field.type === (stryMutAct_9fa48("1168") ? "" : (stryCov_9fa48("1168"), 'VariableDeclaration')))))) declareStatements(stryMutAct_9fa48("1170") ? [] : (stryCov_9fa48("1170"), [field]), names);
    if (stryMutAct_9fa48("1173") ? false : stryMutAct_9fa48("1172") ? true : stryMutAct_9fa48("1171") ? Array.isArray(field) : (stryCov_9fa48("1171", "1172", "1173"), !Array.isArray(field))) return;
    for (const item of field) if (stryMutAct_9fa48("1176") ? isNode(item) || item.type === 'SwitchCase' : stryMutAct_9fa48("1175") ? false : stryMutAct_9fa48("1174") ? true : (stryCov_9fa48("1174", "1175", "1176"), isNode(item) && (stryMutAct_9fa48("1178") ? item.type !== 'SwitchCase' : stryMutAct_9fa48("1177") ? true : (stryCov_9fa48("1177", "1178"), item.type === (stryMutAct_9fa48("1179") ? "" : (stryCov_9fa48("1179"), 'SwitchCase')))))) if (stryMutAct_9fa48("1180")) {
      ;
    } else {
      stryCov_9fa48("1180");
      declareStatements(itemBody(item), names);
    }
  }
}

/**
 * The statements one switch case holds.
 * @param node - the case.
 * @returns its consequent statements.
 */
function itemBody(node: Node): readonly Node[] {
  if (stryMutAct_9fa48("1181")) {
    {}
  } else {
    stryCov_9fa48("1181");
    return nodesOf(fieldOf(node, stryMutAct_9fa48("1182") ? "" : (stryCov_9fa48("1182"), 'consequent')));
  }
}

/**
 * Every child node a node holds, each with the field it was read from.
 *
 * The field name is carried alongside, because whether an identifier is a
 * reference at all is a question about which slot of its parent it sits in.
 * @param node - the parent.
 * @returns the field name and the child, in the order the fields are written.
 */
function childEntries(node: Node): (readonly [string, Node])[] {
  if (stryMutAct_9fa48("1183")) {
    {}
  } else {
    stryCov_9fa48("1183");
    const found: (readonly [string, Node])[] = stryMutAct_9fa48("1184") ? ["Stryker was here"] : (stryCov_9fa48("1184"), []);
    for (const [key, child] of Object.entries(node)) {
      if (stryMutAct_9fa48("1185")) {
        {}
      } else {
        stryCov_9fa48("1185");
        if (stryMutAct_9fa48("1188") ? key !== 'type' : stryMutAct_9fa48("1187") ? false : stryMutAct_9fa48("1186") ? true : (stryCov_9fa48("1186", "1187", "1188"), key === (stryMutAct_9fa48("1189") ? "" : (stryCov_9fa48("1189"), 'type')))) continue;
        for (const item of Array.isArray(child) ? child : stryMutAct_9fa48("1190") ? [] : (stryCov_9fa48("1190"), [child])) if (stryMutAct_9fa48("1192") ? false : stryMutAct_9fa48("1191") ? true : (stryCov_9fa48("1191", "1192"), isNode(item))) found.push(stryMutAct_9fa48("1194") ? [] : (stryCov_9fa48("1194"), [key, item]));
      }
    }
    return found;
  }
}

/**
 * Whether any scope in the chain binds a name.
 * @param scope - the innermost scope.
 * @param name - the name to look for.
 * @returns true when something binds it.
 */
function bound(scope: Scope | undefined, name: string): boolean {
  if (stryMutAct_9fa48("1195")) {
    {}
  } else {
    stryCov_9fa48("1195");
    for (let current = scope; stryMutAct_9fa48("1197") ? current === undefined : stryMutAct_9fa48("1196") ? false : (stryCov_9fa48("1196", "1197"), current !== undefined); current = current.parent) {
      if (stryMutAct_9fa48("1198")) {
        {}
      } else {
        stryCov_9fa48("1198");
        if (stryMutAct_9fa48("1200") ? false : stryMutAct_9fa48("1199") ? true : (stryCov_9fa48("1199", "1200"), current.names.has(name))) return stryMutAct_9fa48("1201") ? false : (stryCov_9fa48("1201"), true);
      }
    }
    return stryMutAct_9fa48("1202") ? true : (stryCov_9fa48("1202"), false);
  }
}

/**
 * Every name a source reads without binding it.
 * @param label - a path, which selects the dialect the source is parsed as.
 * @param text - the source.
 * @returns the free names, sorted, each reported once.
 */
export function freeNames(label: string, text: string): string[] {
  if (stryMutAct_9fa48("1203")) {
    {}
  } else {
    stryCov_9fa48("1203");
    const parsed = parseScript(label, text);
    if (stryMutAct_9fa48("1207") ? parsed.errors.length <= 0 : stryMutAct_9fa48("1206") ? parsed.errors.length >= 0 : stryMutAct_9fa48("1205") ? false : stryMutAct_9fa48("1204") ? true : (stryCov_9fa48("1204", "1205", "1206", "1207"), parsed.errors.length > 0)) return stryMutAct_9fa48("1208") ? [] : (stryCov_9fa48("1208"), [stryMutAct_9fa48("1209") ? `` : (stryCov_9fa48("1209"), `this source does not parse: ${stryMutAct_9fa48("1210") ? parsed.errors[0]?.message && '' : (stryCov_9fa48("1210"), (stryMutAct_9fa48("1211") ? parsed.errors[0].message : (stryCov_9fa48("1211"), parsed.errors[0]?.message)) ?? (stryMutAct_9fa48("1212") ? "Stryker was here!" : (stryCov_9fa48("1212"), '')))}`)]);
    const top: Scope = stryMutAct_9fa48("1213") ? {} : (stryCov_9fa48("1213"), {
      holdsVars: stryMutAct_9fa48("1214") ? false : (stryCov_9fa48("1214"), true),
      names: new Set<string>()
    });
    if (stryMutAct_9fa48("1215")) {
      ;
    } else {
      stryCov_9fa48("1215");
      declareStatements(parsed.body, top.names);
    }
    if (stryMutAct_9fa48("1216")) {
      ;
    } else {
      stryCov_9fa48("1216");
      hoistVars(parsed.body, top.names);
    }
    const free = new Set<string>();
    const visit = (node: Node, parent: Node | undefined, key: string, scope: Scope): void => {
      if (stryMutAct_9fa48("1217")) {
        {}
      } else {
        stryCov_9fa48("1217");
        if (stryMutAct_9fa48("1220") ? node.type === 'Identifier' || typeof node.name === 'string' : stryMutAct_9fa48("1219") ? false : stryMutAct_9fa48("1218") ? true : (stryCov_9fa48("1218", "1219", "1220"), (stryMutAct_9fa48("1222") ? node.type !== 'Identifier' : stryMutAct_9fa48("1221") ? true : (stryCov_9fa48("1221", "1222"), node.type === (stryMutAct_9fa48("1223") ? "" : (stryCov_9fa48("1223"), 'Identifier')))) && (stryMutAct_9fa48("1225") ? typeof node.name !== 'string' : stryMutAct_9fa48("1224") ? true : (stryCov_9fa48("1224", "1225"), typeof node.name === (stryMutAct_9fa48("1226") ? "" : (stryCov_9fa48("1226"), 'string')))))) {
          if (stryMutAct_9fa48("1227")) {
            {}
          } else {
            stryCov_9fa48("1227");
            if (stryMutAct_9fa48("1230") ? isReference(parent, key) || !bound(scope, node.name) : stryMutAct_9fa48("1229") ? false : stryMutAct_9fa48("1228") ? true : (stryCov_9fa48("1228", "1229", "1230"), isReference(parent, key) && (stryMutAct_9fa48("1231") ? bound(scope, node.name) : (stryCov_9fa48("1231"), !bound(scope, node.name))))) if (stryMutAct_9fa48("1232")) {
              ;
            } else {
              stryCov_9fa48("1232");
              free.add(node.name);
            }
            return;
          }
        }
        const inner = scopeFor(node, scope);
        for (const [childKey, child] of childEntries(node)) if (stryMutAct_9fa48("1233")) {
          ;
        } else {
          stryCov_9fa48("1233");
          visit(child, node, childKey, inner);
        }
      }
    };
    for (const statement of parsed.body) visit(statement, undefined, stryMutAct_9fa48("1235") ? "" : (stryCov_9fa48("1235"), 'body'), top);
    return (stryMutAct_9fa48("1236") ? [] : (stryCov_9fa48("1236"), [...free])).toSorted();
  }
}