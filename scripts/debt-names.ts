/**
 * Names that say the code stands in for something real.
 *
 * A name is a claim about what the thing is, and `stubDeps` or `FakeSocket`
 * claims the thing is standing in for something else — which is either false,
 * in which case the name misleads every later reader, or true, in which case
 * the debt is the defect and the name is the record of it.
 *
 * Split from `ban-rules.ts`, which holds the idiom bans: this one is about
 * vocabulary rather than about syntax, and it carries the tables of where a
 * file writes a name of its own.
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
import { type Field, isNode, type Node, unwrap } from './ast.ts';

/**
 * Words that name a thing as counterfeit, unfinished, or kept for its own sake.
 *
 * A name is a claim about what the thing is. `stubDeps` and `FakeSocket` each
 * say the code is standing in for something real, which is either false — the
 * double really does answer, so say what it answers — or true, in which case
 * the debt is the defect and the name is the record of it.
 *
 * The words are matched against the parts of a name rather than against the
 * whole, so `broadcast` and `company` carry no claim and `readStubRow` does;
 * matching them as substrings would be a rule nobody could satisfy. `any`,
 * `cast`, `ignore` and `suppress` are absent because each is refused exactly
 * where it can occur — as a type keyword, an as-expression, and a directive in
 * a comment — and a second reading by spelling would be the weaker of the two.
 * `placeholder` is absent for the opposite reason: it is the name of the DOM
 * property this product sets on an input, so in this tree the word names a
 * platform member rather than a claim about the code.
 */
const DEBT_WORDS: ReadonlySet<string> = new Set(stryMutAct_9fa48("951") ? [] : (stryCov_9fa48("951"), [stryMutAct_9fa48("952") ? "" : (stryCov_9fa48("952"), 'todo'), stryMutAct_9fa48("953") ? "" : (stryCov_9fa48("953"), 'fixme'), stryMutAct_9fa48("954") ? "" : (stryCov_9fa48("954"), 'hack'), stryMutAct_9fa48("955") ? "" : (stryCov_9fa48("955"), 'xxx'), stryMutAct_9fa48("956") ? "" : (stryCov_9fa48("956"), 'stub'), stryMutAct_9fa48("957") ? "" : (stryCov_9fa48("957"), 'stubs'), stryMutAct_9fa48("958") ? "" : (stryCov_9fa48("958"), 'stubbed'), stryMutAct_9fa48("959") ? "" : (stryCov_9fa48("959"), 'mock'), stryMutAct_9fa48("960") ? "" : (stryCov_9fa48("960"), 'mocks'), stryMutAct_9fa48("961") ? "" : (stryCov_9fa48("961"), 'mocked'), stryMutAct_9fa48("962") ? "" : (stryCov_9fa48("962"), 'fake'), stryMutAct_9fa48("963") ? "" : (stryCov_9fa48("963"), 'fakes'), stryMutAct_9fa48("964") ? "" : (stryCov_9fa48("964"), 'faked'), stryMutAct_9fa48("965") ? "" : (stryCov_9fa48("965"), 'dummy'), stryMutAct_9fa48("966") ? "" : (stryCov_9fa48("966"), 'noop'), stryMutAct_9fa48("967") ? "" : (stryCov_9fa48("967"), 'temporary'), stryMutAct_9fa48("968") ? "" : (stryCov_9fa48("968"), 'temp'), stryMutAct_9fa48("969") ? "" : (stryCov_9fa48("969"), 'hardcoded'), stryMutAct_9fa48("970") ? "" : (stryCov_9fa48("970"), 'shim'), stryMutAct_9fa48("971") ? "" : (stryCov_9fa48("971"), 'polyfill'), stryMutAct_9fa48("972") ? "" : (stryCov_9fa48("972"), 'workaround'), stryMutAct_9fa48("973") ? "" : (stryCov_9fa48("973"), 'legacy'), stryMutAct_9fa48("974") ? "" : (stryCov_9fa48("974"), 'barrel'), stryMutAct_9fa48("975") ? "" : (stryCov_9fa48("975"), 'compat')]));

/** Where a file writes a name of its own choosing, and under which field. */
const NAMED: ReadonlyMap<string, string> = new Map(stryMutAct_9fa48("976") ? [] : (stryCov_9fa48("976"), [stryMutAct_9fa48("977") ? [] : (stryCov_9fa48("977"), [stryMutAct_9fa48("978") ? "" : (stryCov_9fa48("978"), 'VariableDeclarator'), stryMutAct_9fa48("979") ? "" : (stryCov_9fa48("979"), 'id')]), stryMutAct_9fa48("980") ? [] : (stryCov_9fa48("980"), [stryMutAct_9fa48("981") ? "" : (stryCov_9fa48("981"), 'FunctionDeclaration'), stryMutAct_9fa48("982") ? "" : (stryCov_9fa48("982"), 'id')]), stryMutAct_9fa48("983") ? [] : (stryCov_9fa48("983"), [stryMutAct_9fa48("984") ? "" : (stryCov_9fa48("984"), 'ClassDeclaration'), stryMutAct_9fa48("985") ? "" : (stryCov_9fa48("985"), 'id')]), stryMutAct_9fa48("986") ? [] : (stryCov_9fa48("986"), [stryMutAct_9fa48("987") ? "" : (stryCov_9fa48("987"), 'TSInterfaceDeclaration'), stryMutAct_9fa48("988") ? "" : (stryCov_9fa48("988"), 'id')]), stryMutAct_9fa48("989") ? [] : (stryCov_9fa48("989"), [stryMutAct_9fa48("990") ? "" : (stryCov_9fa48("990"), 'TSTypeAliasDeclaration'), stryMutAct_9fa48("991") ? "" : (stryCov_9fa48("991"), 'id')]), stryMutAct_9fa48("992") ? [] : (stryCov_9fa48("992"), [stryMutAct_9fa48("993") ? "" : (stryCov_9fa48("993"), 'TSEnumDeclaration'), stryMutAct_9fa48("994") ? "" : (stryCov_9fa48("994"), 'id')]), stryMutAct_9fa48("995") ? [] : (stryCov_9fa48("995"), [stryMutAct_9fa48("996") ? "" : (stryCov_9fa48("996"), 'TSEnumMember'), stryMutAct_9fa48("997") ? "" : (stryCov_9fa48("997"), 'id')]), stryMutAct_9fa48("998") ? [] : (stryCov_9fa48("998"), [stryMutAct_9fa48("999") ? "" : (stryCov_9fa48("999"), 'PropertyDefinition'), stryMutAct_9fa48("1000") ? "" : (stryCov_9fa48("1000"), 'key')]), stryMutAct_9fa48("1001") ? [] : (stryCov_9fa48("1001"), [stryMutAct_9fa48("1002") ? "" : (stryCov_9fa48("1002"), 'MethodDefinition'), stryMutAct_9fa48("1003") ? "" : (stryCov_9fa48("1003"), 'key')]), stryMutAct_9fa48("1004") ? [] : (stryCov_9fa48("1004"), [stryMutAct_9fa48("1005") ? "" : (stryCov_9fa48("1005"), 'TSPropertySignature'), stryMutAct_9fa48("1006") ? "" : (stryCov_9fa48("1006"), 'key')]), stryMutAct_9fa48("1007") ? [] : (stryCov_9fa48("1007"), [stryMutAct_9fa48("1008") ? "" : (stryCov_9fa48("1008"), 'TSMethodSignature'), stryMutAct_9fa48("1009") ? "" : (stryCov_9fa48("1009"), 'key')])]));

/** The node types whose parameters are names the file chose. */
const PARAMETERISED = new Set(stryMutAct_9fa48("1010") ? [] : (stryCov_9fa48("1010"), [stryMutAct_9fa48("1011") ? "" : (stryCov_9fa48("1011"), 'FunctionDeclaration'), stryMutAct_9fa48("1012") ? "" : (stryCov_9fa48("1012"), 'FunctionExpression'), stryMutAct_9fa48("1013") ? "" : (stryCov_9fa48("1013"), 'ArrowFunctionExpression'), stryMutAct_9fa48("1014") ? "" : (stryCov_9fa48("1014"), 'TSDeclareFunction'), stryMutAct_9fa48("1015") ? "" : (stryCov_9fa48("1015"), 'TSMethodSignature'), stryMutAct_9fa48("1016") ? "" : (stryCov_9fa48("1016"), 'TSFunctionType')]));

/**
 * Whether a word written as part of a name is one of the debt words.
 *
 * The name is split on the boundaries a name is written with — the hump
 * between a lower-case run and an upper-case one, underscores and dashes — so
 * `LEGACY_RULES`, `stubDeps` and `read-mock-row` each yield whole words while
 * `broadcast` and `stubborn` yield themselves.
 * @param name - the name as written.
 * @returns true when one of its parts is a debt word.
 */
function debtName(name: string): boolean {
  if (stryMutAct_9fa48("1017")) {
    {}
  } else {
    stryCov_9fa48("1017");
    return stryMutAct_9fa48("1018") ? name.split(/(?<=[a-z0-9])(?=[A-Z])|[_-]/u).map(part => part.toLowerCase()).every(part => DEBT_WORDS.has(part)) : (stryCov_9fa48("1018"), name.split(stryMutAct_9fa48("1023") ? /(?<=[a-z0-9])(?=[A-Z])|[^_-]/u : stryMutAct_9fa48("1022") ? /(?<=[a-z0-9])(?=[^A-Z])|[_-]/u : stryMutAct_9fa48("1021") ? /(?<=[a-z0-9])(?![A-Z])|[_-]/u : stryMutAct_9fa48("1020") ? /(?<=[^a-z0-9])(?=[A-Z])|[_-]/u : stryMutAct_9fa48("1019") ? /(?<![a-z0-9])(?=[A-Z])|[_-]/u : (stryCov_9fa48("1019", "1020", "1021", "1022", "1023"), /(?<=[a-z0-9])(?=[A-Z])|[_-]/u)).map(stryMutAct_9fa48("1024") ? () => undefined : (stryCov_9fa48("1024"), part => stryMutAct_9fa48("1025") ? part.toUpperCase() : (stryCov_9fa48("1025"), part.toLowerCase()))).some(stryMutAct_9fa48("1026") ? () => undefined : (stryCov_9fa48("1026"), part => DEBT_WORDS.has(part))));
  }
}

/**
 * Every name one binding target introduces, patterns included.
 *
 * A destructuring binds names as surely as a plain declarator does, so the
 * pattern is walked rather than read as a single identifier.
 * @param target - the binding target, or the key of a member.
 * @returns the names it introduces.
 */
function boundNames(target: Field | undefined): string[] {
  if (stryMutAct_9fa48("1027")) {
    {}
  } else {
    stryCov_9fa48("1027");
    const node = unwrap(target);
    if (stryMutAct_9fa48("1030") ? false : stryMutAct_9fa48("1029") ? true : stryMutAct_9fa48("1028") ? isNode(node) : (stryCov_9fa48("1028", "1029", "1030"), !isNode(node))) return stryMutAct_9fa48("1031") ? ["Stryker was here"] : (stryCov_9fa48("1031"), []);
    if (stryMutAct_9fa48("1034") ? node.type !== 'Identifier' : stryMutAct_9fa48("1033") ? false : stryMutAct_9fa48("1032") ? true : (stryCov_9fa48("1032", "1033", "1034"), node.type === (stryMutAct_9fa48("1035") ? "" : (stryCov_9fa48("1035"), 'Identifier')))) {
      if (stryMutAct_9fa48("1036")) {
        {}
      } else {
        stryCov_9fa48("1036");
        const name = node[stryMutAct_9fa48("1037") ? "" : (stryCov_9fa48("1037"), 'name')];
        return (stryMutAct_9fa48("1040") ? typeof name !== 'string' : stryMutAct_9fa48("1039") ? false : stryMutAct_9fa48("1038") ? true : (stryCov_9fa48("1038", "1039", "1040"), typeof name === (stryMutAct_9fa48("1041") ? "" : (stryCov_9fa48("1041"), 'string')))) ? stryMutAct_9fa48("1042") ? [] : (stryCov_9fa48("1042"), [name]) : stryMutAct_9fa48("1043") ? ["Stryker was here"] : (stryCov_9fa48("1043"), []);
      }
    }
    if (stryMutAct_9fa48("1046") ? node.type !== 'AssignmentPattern' : stryMutAct_9fa48("1045") ? false : stryMutAct_9fa48("1044") ? true : (stryCov_9fa48("1044", "1045", "1046"), node.type === (stryMutAct_9fa48("1047") ? "" : (stryCov_9fa48("1047"), 'AssignmentPattern')))) return boundNames(node[stryMutAct_9fa48("1048") ? "" : (stryCov_9fa48("1048"), 'left')]);
    if (stryMutAct_9fa48("1051") ? node.type !== 'RestElement' : stryMutAct_9fa48("1050") ? false : stryMutAct_9fa48("1049") ? true : (stryCov_9fa48("1049", "1050", "1051"), node.type === (stryMutAct_9fa48("1052") ? "" : (stryCov_9fa48("1052"), 'RestElement')))) return boundNames(node[stryMutAct_9fa48("1053") ? "" : (stryCov_9fa48("1053"), 'argument')]);
    if (stryMutAct_9fa48("1056") ? node.type !== 'ArrayPattern' : stryMutAct_9fa48("1055") ? false : stryMutAct_9fa48("1054") ? true : (stryCov_9fa48("1054", "1055", "1056"), node.type === (stryMutAct_9fa48("1057") ? "" : (stryCov_9fa48("1057"), 'ArrayPattern')))) {
      if (stryMutAct_9fa48("1058")) {
        {}
      } else {
        stryCov_9fa48("1058");
        const elements = node[stryMutAct_9fa48("1059") ? "" : (stryCov_9fa48("1059"), 'elements')];
        return Array.isArray(elements) ? elements.flatMap(stryMutAct_9fa48("1060") ? () => undefined : (stryCov_9fa48("1060"), element => boundNames(element))) : stryMutAct_9fa48("1061") ? ["Stryker was here"] : (stryCov_9fa48("1061"), []);
      }
    }
    if (stryMutAct_9fa48("1064") ? node.type === 'ObjectPattern' : stryMutAct_9fa48("1063") ? false : stryMutAct_9fa48("1062") ? true : (stryCov_9fa48("1062", "1063", "1064"), node.type !== (stryMutAct_9fa48("1065") ? "" : (stryCov_9fa48("1065"), 'ObjectPattern')))) return stryMutAct_9fa48("1066") ? ["Stryker was here"] : (stryCov_9fa48("1066"), []);
    const properties = node[stryMutAct_9fa48("1067") ? "" : (stryCov_9fa48("1067"), 'properties')];
    if (stryMutAct_9fa48("1070") ? false : stryMutAct_9fa48("1069") ? true : stryMutAct_9fa48("1068") ? Array.isArray(properties) : (stryCov_9fa48("1068", "1069", "1070"), !Array.isArray(properties))) return stryMutAct_9fa48("1071") ? ["Stryker was here"] : (stryCov_9fa48("1071"), []);
    return properties.flatMap(property_ => {
      if (stryMutAct_9fa48("1072")) {
        {}
      } else {
        stryCov_9fa48("1072");
        if (stryMutAct_9fa48("1075") ? false : stryMutAct_9fa48("1074") ? true : stryMutAct_9fa48("1073") ? isNode(property_) : (stryCov_9fa48("1073", "1074", "1075"), !isNode(property_))) return stryMutAct_9fa48("1076") ? ["Stryker was here"] : (stryCov_9fa48("1076"), []);
        return boundNames((stryMutAct_9fa48("1079") ? property_.type !== 'Property' : stryMutAct_9fa48("1078") ? false : stryMutAct_9fa48("1077") ? true : (stryCov_9fa48("1077", "1078", "1079"), property_.type === (stryMutAct_9fa48("1080") ? "" : (stryCov_9fa48("1080"), 'Property')))) ? property_[stryMutAct_9fa48("1081") ? "" : (stryCov_9fa48("1081"), 'value')] : property_);
      }
    });
  }
}

/**
 * Whether a declaration names itself as debt.
 *
 * Only the names this file chooses are read: a member reached on someone
 * else's object — `input.placeholder`, `it.todo` — is that API's name, not a
 * claim this repository is making, and a computed key is an expression rather
 * than a name at all.
 * @param node - the node to test.
 * @returns true when a name it introduces carries a debt word.
 */
export function namesDebt(node: Node): boolean {
  if (stryMutAct_9fa48("1082")) {
    {}
  } else {
    stryCov_9fa48("1082");
    const named: string[] = stryMutAct_9fa48("1083") ? ["Stryker was here"] : (stryCov_9fa48("1083"), []);
    const field = NAMED.get(node.type);
    if (stryMutAct_9fa48("1086") ? field !== undefined || node['computed'] !== true : stryMutAct_9fa48("1085") ? false : stryMutAct_9fa48("1084") ? true : (stryCov_9fa48("1084", "1085", "1086"), (stryMutAct_9fa48("1088") ? field === undefined : stryMutAct_9fa48("1087") ? true : (stryCov_9fa48("1087", "1088"), field !== undefined)) && (stryMutAct_9fa48("1090") ? node['computed'] === true : stryMutAct_9fa48("1089") ? true : (stryCov_9fa48("1089", "1090"), node[stryMutAct_9fa48("1091") ? "" : (stryCov_9fa48("1091"), 'computed')] !== (stryMutAct_9fa48("1092") ? false : (stryCov_9fa48("1092"), true)))))) if (stryMutAct_9fa48("1093")) {
      ;
    } else {
      stryCov_9fa48("1093");
      named.push(...boundNames(node[field]));
    }
    if (stryMutAct_9fa48("1095") ? false : stryMutAct_9fa48("1094") ? true : (stryCov_9fa48("1094", "1095"), PARAMETERISED.has(node.type))) {
      if (stryMutAct_9fa48("1096")) {
        {}
      } else {
        stryCov_9fa48("1096");
        const params = node[stryMutAct_9fa48("1097") ? "" : (stryCov_9fa48("1097"), 'params')];
        if (stryMutAct_9fa48("1099") ? false : stryMutAct_9fa48("1098") ? true : (stryCov_9fa48("1098", "1099"), Array.isArray(params))) named.push(...params.flatMap(stryMutAct_9fa48("1101") ? () => undefined : (stryCov_9fa48("1101"), param => boundNames(param))));
      }
    }
    if (stryMutAct_9fa48("1104") ? node.type !== 'ObjectExpression' : stryMutAct_9fa48("1103") ? false : stryMutAct_9fa48("1102") ? true : (stryCov_9fa48("1102", "1103", "1104"), node.type === (stryMutAct_9fa48("1105") ? "" : (stryCov_9fa48("1105"), 'ObjectExpression')))) if (stryMutAct_9fa48("1106")) {
      ;
    } else {
      stryCov_9fa48("1106");
      named.push(...literalMembers(node));
    }
    return stryMutAct_9fa48("1107") ? named.every(name => debtName(name)) : (stryCov_9fa48("1107"), named.some(stryMutAct_9fa48("1108") ? () => undefined : (stryCov_9fa48("1108"), name => debtName(name))));
  }
}

/**
 * The members an object literal names.
 *
 * Read off the literal rather than off each property, because the same node
 * shape is what a destructuring is written with — and there the key is the
 * *source* object's member, a name this repository is reading rather than
 * choosing.
 * @param node - the object literal.
 * @returns the member names it writes.
 */
function literalMembers(node: Node): string[] {
  if (stryMutAct_9fa48("1109")) {
    {}
  } else {
    stryCov_9fa48("1109");
    const properties = node[stryMutAct_9fa48("1110") ? "" : (stryCov_9fa48("1110"), 'properties')];
    if (stryMutAct_9fa48("1113") ? false : stryMutAct_9fa48("1112") ? true : stryMutAct_9fa48("1111") ? Array.isArray(properties) : (stryCov_9fa48("1111", "1112", "1113"), !Array.isArray(properties))) return stryMutAct_9fa48("1114") ? ["Stryker was here"] : (stryCov_9fa48("1114"), []);
    return properties.flatMap(property_ => {
      if (stryMutAct_9fa48("1115")) {
        {}
      } else {
        stryCov_9fa48("1115");
        if (stryMutAct_9fa48("1118") ? (!isNode(property_) || property_.type !== 'Property') && property_['computed'] === true : stryMutAct_9fa48("1117") ? false : stryMutAct_9fa48("1116") ? true : (stryCov_9fa48("1116", "1117", "1118"), (stryMutAct_9fa48("1120") ? !isNode(property_) && property_.type !== 'Property' : stryMutAct_9fa48("1119") ? false : (stryCov_9fa48("1119", "1120"), (stryMutAct_9fa48("1121") ? isNode(property_) : (stryCov_9fa48("1121"), !isNode(property_))) || (stryMutAct_9fa48("1123") ? property_.type === 'Property' : stryMutAct_9fa48("1122") ? false : (stryCov_9fa48("1122", "1123"), property_.type !== (stryMutAct_9fa48("1124") ? "" : (stryCov_9fa48("1124"), 'Property')))))) || (stryMutAct_9fa48("1126") ? property_['computed'] !== true : stryMutAct_9fa48("1125") ? false : (stryCov_9fa48("1125", "1126"), property_[stryMutAct_9fa48("1127") ? "" : (stryCov_9fa48("1127"), 'computed')] === (stryMutAct_9fa48("1128") ? false : (stryCov_9fa48("1128"), true)))))) return stryMutAct_9fa48("1129") ? ["Stryker was here"] : (stryCov_9fa48("1129"), []);
        return boundNames(property_[stryMutAct_9fa48("1130") ? "" : (stryCov_9fa48("1130"), 'key')]);
      }
    });
  }
}