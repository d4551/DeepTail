/**
 * What a string-producing expression always evaluates to.
 *
 * Constant folding is what closes the assembled-name routes. A name split with
 * `+`, built in a template, spelt from character codes, case-shifted, joined
 * out of an array or simply held in a well-named constant is the same name, and
 * a gate that cannot fold them is a gate that can be spelt around.
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
import { type Field, fieldOf, isNode, memberName, type Node, unwrap, walk } from './ast.ts';

/**
 * The constants a file declares, so a name held in one is still a name.
 *
 * A binding whose value differs between declarations is recorded as undecided
 * rather than as either value, which reports rather than excuses it.
 */
export type Constants = ReadonlyMap<string, string | null>;

/**
 * Every `const` in a file that is bound to a string this gate can fold.
 * @param program - the parsed body.
 * @returns the bindings, with contested names marked undecided.
 */
export function constants(program: readonly Node[]): Constants {
  if (stryMutAct_9fa48("1131")) {
    {}
  } else {
    stryCov_9fa48("1131");
    const found = new Map<string, string | null>();
    const empty: Constants = new Map();
    walk(program, node => {
      if (stryMutAct_9fa48("1133")) {
        {}
      } else {
        stryCov_9fa48("1133");
        if (stryMutAct_9fa48("1136") ? node.type !== 'VariableDeclaration' && node['kind'] !== 'const' : stryMutAct_9fa48("1135") ? false : stryMutAct_9fa48("1134") ? true : (stryCov_9fa48("1134", "1135", "1136"), (stryMutAct_9fa48("1138") ? node.type === 'VariableDeclaration' : stryMutAct_9fa48("1137") ? false : (stryCov_9fa48("1137", "1138"), node.type !== (stryMutAct_9fa48("1139") ? "" : (stryCov_9fa48("1139"), 'VariableDeclaration')))) || (stryMutAct_9fa48("1141") ? node['kind'] === 'const' : stryMutAct_9fa48("1140") ? false : (stryCov_9fa48("1140", "1141"), node[stryMutAct_9fa48("1142") ? "" : (stryCov_9fa48("1142"), 'kind')] !== (stryMutAct_9fa48("1143") ? "" : (stryCov_9fa48("1143"), 'const')))))) return;
        const declarations = node[stryMutAct_9fa48("1144") ? "" : (stryCov_9fa48("1144"), 'declarations')];
        if (stryMutAct_9fa48("1147") ? false : stryMutAct_9fa48("1146") ? true : stryMutAct_9fa48("1145") ? Array.isArray(declarations) : (stryCov_9fa48("1145", "1146", "1147"), !Array.isArray(declarations))) return;
        for (const declaration of declarations) {
          if (stryMutAct_9fa48("1148")) {
            {}
          } else {
            stryCov_9fa48("1148");
            if (stryMutAct_9fa48("1151") ? false : stryMutAct_9fa48("1150") ? true : stryMutAct_9fa48("1149") ? isNode(declaration) : (stryCov_9fa48("1149", "1150", "1151"), !isNode(declaration))) continue;
            const id = unwrap(declaration[stryMutAct_9fa48("1152") ? "" : (stryCov_9fa48("1152"), 'id')]);
            if (stryMutAct_9fa48("1155") ? (!isNode(id) || id.type !== 'Identifier') && typeof id['name'] !== 'string' : stryMutAct_9fa48("1154") ? false : stryMutAct_9fa48("1153") ? true : (stryCov_9fa48("1153", "1154", "1155"), (stryMutAct_9fa48("1157") ? !isNode(id) && id.type !== 'Identifier' : stryMutAct_9fa48("1156") ? false : (stryCov_9fa48("1156", "1157"), (stryMutAct_9fa48("1158") ? isNode(id) : (stryCov_9fa48("1158"), !isNode(id))) || (stryMutAct_9fa48("1160") ? id.type === 'Identifier' : stryMutAct_9fa48("1159") ? false : (stryCov_9fa48("1159", "1160"), id.type !== (stryMutAct_9fa48("1161") ? "" : (stryCov_9fa48("1161"), 'Identifier')))))) || (stryMutAct_9fa48("1163") ? typeof id['name'] === 'string' : stryMutAct_9fa48("1162") ? false : (stryCov_9fa48("1162", "1163"), typeof id[stryMutAct_9fa48("1164") ? "" : (stryCov_9fa48("1164"), 'name')] !== (stryMutAct_9fa48("1165") ? "" : (stryCov_9fa48("1165"), 'string')))))) continue;
            const value = staticString(empty, declaration[stryMutAct_9fa48("1166") ? "" : (stryCov_9fa48("1166"), 'init')]);
            if (stryMutAct_9fa48("1169") ? value !== undefined : stryMutAct_9fa48("1168") ? false : stryMutAct_9fa48("1167") ? true : (stryCov_9fa48("1167", "1168", "1169"), value === undefined)) continue;
            const seen = found.get(id[stryMutAct_9fa48("1170") ? "" : (stryCov_9fa48("1170"), 'name')]);
            found.set(id[stryMutAct_9fa48("1172") ? "" : (stryCov_9fa48("1172"), 'name')], (stryMutAct_9fa48("1175") ? seen === undefined && seen === value : stryMutAct_9fa48("1174") ? false : stryMutAct_9fa48("1173") ? true : (stryCov_9fa48("1173", "1174", "1175"), (stryMutAct_9fa48("1177") ? seen !== undefined : stryMutAct_9fa48("1176") ? false : (stryCov_9fa48("1176", "1177"), seen === undefined)) || (stryMutAct_9fa48("1179") ? seen !== value : stryMutAct_9fa48("1178") ? false : (stryCov_9fa48("1178", "1179"), seen === value)))) ? value : null);
          }
        }
      }
    });
    return found;
  }
}

/**
 * The string an expression always evaluates to, when there is one.
 *
 * Constant folding is what closes the assembled-name routes: a name split with
 * `+`, built in a template, spelt from character codes, case-shifted or simply
 * held in a well-named constant is the same name, and a gate that cannot fold
 * them is a gate that can be spelt around.
 * @param env - the file's constants.
 * @param node - the expression to fold, parentheses and assertions included.
 * @returns the string, or undefined when it is not decidable here.
 */
export function staticString(env: Constants, node: Field | undefined): string | undefined {
  if (stryMutAct_9fa48("1180")) {
    {}
  } else {
    stryCov_9fa48("1180");
    const folded = unwrap(node);
    if (stryMutAct_9fa48("1183") ? false : stryMutAct_9fa48("1182") ? true : stryMutAct_9fa48("1181") ? isNode(folded) : (stryCov_9fa48("1181", "1182", "1183"), !isNode(folded))) return undefined;
    switch (folded.type) {
      case stryMutAct_9fa48("1185") ? "" : (stryCov_9fa48("1185"), 'Literal'):
        if (stryMutAct_9fa48("1184")) {} else {
          stryCov_9fa48("1184");
          return (stryMutAct_9fa48("1188") ? typeof folded['value'] !== 'string' : stryMutAct_9fa48("1187") ? false : stryMutAct_9fa48("1186") ? true : (stryCov_9fa48("1186", "1187", "1188"), typeof folded[stryMutAct_9fa48("1189") ? "" : (stryCov_9fa48("1189"), 'value')] === (stryMutAct_9fa48("1190") ? "" : (stryCov_9fa48("1190"), 'string')))) ? folded[stryMutAct_9fa48("1191") ? "" : (stryCov_9fa48("1191"), 'value')] : undefined;
        }
      case stryMutAct_9fa48("1193") ? "" : (stryCov_9fa48("1193"), 'Identifier'):
        if (stryMutAct_9fa48("1192")) {} else {
          stryCov_9fa48("1192");
          return (stryMutAct_9fa48("1196") ? typeof folded['name'] !== 'string' : stryMutAct_9fa48("1195") ? false : stryMutAct_9fa48("1194") ? true : (stryCov_9fa48("1194", "1195", "1196"), typeof folded[stryMutAct_9fa48("1197") ? "" : (stryCov_9fa48("1197"), 'name')] === (stryMutAct_9fa48("1198") ? "" : (stryCov_9fa48("1198"), 'string')))) ? stryMutAct_9fa48("1199") ? env.get(folded['name']) && undefined : (stryCov_9fa48("1199"), env.get(folded[stryMutAct_9fa48("1200") ? "" : (stryCov_9fa48("1200"), 'name')]) ?? undefined) : undefined;
        }
      case stryMutAct_9fa48("1202") ? "" : (stryCov_9fa48("1202"), 'TemplateLiteral'):
        if (stryMutAct_9fa48("1201")) {} else {
          stryCov_9fa48("1201");
          return foldTemplate(env, folded);
        }
      case stryMutAct_9fa48("1204") ? "" : (stryCov_9fa48("1204"), 'BinaryExpression'):
        if (stryMutAct_9fa48("1203")) {} else {
          stryCov_9fa48("1203");
          return foldConcatenation(env, folded);
        }
      case stryMutAct_9fa48("1206") ? "" : (stryCov_9fa48("1206"), 'CallExpression'):
        if (stryMutAct_9fa48("1205")) {} else {
          stryCov_9fa48("1205");
          return foldCall(env, folded);
        }
      default:
        if (stryMutAct_9fa48("1207")) {} else {
          stryCov_9fa48("1207");
          return undefined;
        }
    }
  }
}

/**
 * A template's cooked quasis and the expressions sitting between them.
 * @param node - the template literal.
 * @returns the parts, or undefined when the tree does not carry them.
 */
function templateParts(node: Node): {
  readonly cooked: readonly string[];
  readonly expressions: readonly Field[];
} | undefined {
  if (stryMutAct_9fa48("1208")) {
    {}
  } else {
    stryCov_9fa48("1208");
    const quasis = node[stryMutAct_9fa48("1209") ? "" : (stryCov_9fa48("1209"), 'quasis')];
    const expressions = node[stryMutAct_9fa48("1210") ? "" : (stryCov_9fa48("1210"), 'expressions')];
    if (stryMutAct_9fa48("1213") ? !Array.isArray(quasis) && !Array.isArray(expressions) : stryMutAct_9fa48("1212") ? false : stryMutAct_9fa48("1211") ? true : (stryCov_9fa48("1211", "1212", "1213"), (stryMutAct_9fa48("1214") ? Array.isArray(quasis) : (stryCov_9fa48("1214"), !Array.isArray(quasis))) || (stryMutAct_9fa48("1215") ? Array.isArray(expressions) : (stryCov_9fa48("1215"), !Array.isArray(expressions))))) return undefined;
    const cooked: string[] = stryMutAct_9fa48("1216") ? ["Stryker was here"] : (stryCov_9fa48("1216"), []);
    for (const quasi of quasis) {
      if (stryMutAct_9fa48("1217")) {
        {}
      } else {
        stryCov_9fa48("1217");
        const text = fieldOf(fieldOf(quasi, stryMutAct_9fa48("1218") ? "" : (stryCov_9fa48("1218"), 'value')), stryMutAct_9fa48("1219") ? "" : (stryCov_9fa48("1219"), 'cooked'));
        if (stryMutAct_9fa48("1222") ? typeof text === 'string' : stryMutAct_9fa48("1221") ? false : stryMutAct_9fa48("1220") ? true : (stryCov_9fa48("1220", "1221", "1222"), typeof text !== (stryMutAct_9fa48("1223") ? "" : (stryCov_9fa48("1223"), 'string')))) return undefined;
        if (stryMutAct_9fa48("1224")) {
          ;
        } else {
          stryCov_9fa48("1224");
          cooked.push(text);
        }
      }
    }
    return stryMutAct_9fa48("1225") ? {} : (stryCov_9fa48("1225"), {
      cooked,
      expressions
    });
  }
}

/**
 * Fold a template whose every interpolation folds.
 * @param env - the file's constants.
 * @param node - the template literal.
 * @returns the string, or undefined.
 */
function foldTemplate(env: Constants, node: Node): string | undefined {
  if (stryMutAct_9fa48("1226")) {
    {}
  } else {
    stryCov_9fa48("1226");
    const parts = templateParts(node);
    if (stryMutAct_9fa48("1229") ? parts !== undefined : stryMutAct_9fa48("1228") ? false : stryMutAct_9fa48("1227") ? true : (stryCov_9fa48("1227", "1228", "1229"), parts === undefined)) return undefined;
    let text = stryMutAct_9fa48("1230") ? "Stryker was here!" : (stryCov_9fa48("1230"), '');
    for (const [index, cooked] of parts.cooked.entries()) {
      if (stryMutAct_9fa48("1231")) {
        {}
      } else {
        stryCov_9fa48("1231");
        stryMutAct_9fa48("1232") ? text -= cooked : (stryCov_9fa48("1232"), text += cooked);
        if (stryMutAct_9fa48("1236") ? index < parts.expressions.length : stryMutAct_9fa48("1235") ? index > parts.expressions.length : stryMutAct_9fa48("1234") ? false : stryMutAct_9fa48("1233") ? true : (stryCov_9fa48("1233", "1234", "1235", "1236"), index >= parts.expressions.length)) continue;
        const part = staticString(env, parts.expressions[index]);
        if (stryMutAct_9fa48("1239") ? part !== undefined : stryMutAct_9fa48("1238") ? false : stryMutAct_9fa48("1237") ? true : (stryCov_9fa48("1237", "1238", "1239"), part === undefined)) return undefined;
        stryMutAct_9fa48("1240") ? text -= part : (stryCov_9fa48("1240"), text += part);
      }
    }
    return text;
  }
}

/**
 * Fold `'a' + 'b'`, however deeply it nests.
 * @param env - the file's constants.
 * @param node - the binary expression.
 * @returns the string, or undefined.
 */
function foldConcatenation(env: Constants, node: Node): string | undefined {
  if (stryMutAct_9fa48("1241")) {
    {}
  } else {
    stryCov_9fa48("1241");
    if (stryMutAct_9fa48("1244") ? node['operator'] === '+' : stryMutAct_9fa48("1243") ? false : stryMutAct_9fa48("1242") ? true : (stryCov_9fa48("1242", "1243", "1244"), node[stryMutAct_9fa48("1245") ? "" : (stryCov_9fa48("1245"), 'operator')] !== (stryMutAct_9fa48("1246") ? "" : (stryCov_9fa48("1246"), '+')))) return undefined;
    const left = staticString(env, node[stryMutAct_9fa48("1247") ? "" : (stryCov_9fa48("1247"), 'left')]);
    const right = staticString(env, node[stryMutAct_9fa48("1248") ? "" : (stryCov_9fa48("1248"), 'right')]);
    return (stryMutAct_9fa48("1251") ? left === undefined && right === undefined : stryMutAct_9fa48("1250") ? false : stryMutAct_9fa48("1249") ? true : (stryCov_9fa48("1249", "1250", "1251"), (stryMutAct_9fa48("1253") ? left !== undefined : stryMutAct_9fa48("1252") ? false : (stryCov_9fa48("1252", "1253"), left === undefined)) || (stryMutAct_9fa48("1255") ? right !== undefined : stryMutAct_9fa48("1254") ? false : (stryCov_9fa48("1254", "1255"), right === undefined)))) ? undefined : stryMutAct_9fa48("1256") ? left - right : (stryCov_9fa48("1256"), left + right);
  }
}

/**
 * Fold the calls that assemble a name: character codes, case shifts, joins and
 * concatenation.
 * @param env - the file's constants.
 * @param node - the call expression.
 * @returns the string, or undefined.
 */
function foldCall(env: Constants, node: Node): string | undefined {
  if (stryMutAct_9fa48("1257")) {
    {}
  } else {
    stryCov_9fa48("1257");
    const callee = node[stryMutAct_9fa48("1258") ? "" : (stryCov_9fa48("1258"), 'callee')];
    const args = node[stryMutAct_9fa48("1259") ? "" : (stryCov_9fa48("1259"), 'arguments')];
    if (stryMutAct_9fa48("1262") ? (!isNode(callee) || callee.type !== 'MemberExpression') && !Array.isArray(args) : stryMutAct_9fa48("1261") ? false : stryMutAct_9fa48("1260") ? true : (stryCov_9fa48("1260", "1261", "1262"), (stryMutAct_9fa48("1264") ? !isNode(callee) && callee.type !== 'MemberExpression' : stryMutAct_9fa48("1263") ? false : (stryCov_9fa48("1263", "1264"), (stryMutAct_9fa48("1265") ? isNode(callee) : (stryCov_9fa48("1265"), !isNode(callee))) || (stryMutAct_9fa48("1267") ? callee.type === 'MemberExpression' : stryMutAct_9fa48("1266") ? false : (stryCov_9fa48("1266", "1267"), callee.type !== (stryMutAct_9fa48("1268") ? "" : (stryCov_9fa48("1268"), 'MemberExpression')))))) || (stryMutAct_9fa48("1269") ? Array.isArray(args) : (stryCov_9fa48("1269"), !Array.isArray(args))))) return undefined;
    const method = memberName(callee);
    if (stryMutAct_9fa48("1272") ? method === 'fromCharCode' && method === 'fromCodePoint' : stryMutAct_9fa48("1271") ? false : stryMutAct_9fa48("1270") ? true : (stryCov_9fa48("1270", "1271", "1272"), (stryMutAct_9fa48("1274") ? method !== 'fromCharCode' : stryMutAct_9fa48("1273") ? false : (stryCov_9fa48("1273", "1274"), method === (stryMutAct_9fa48("1275") ? "" : (stryCov_9fa48("1275"), 'fromCharCode')))) || (stryMutAct_9fa48("1277") ? method !== 'fromCodePoint' : stryMutAct_9fa48("1276") ? false : (stryCov_9fa48("1276", "1277"), method === (stryMutAct_9fa48("1278") ? "" : (stryCov_9fa48("1278"), 'fromCodePoint')))))) return foldCharacters(method, args);
    const receiver = callee[stryMutAct_9fa48("1279") ? "" : (stryCov_9fa48("1279"), 'object')];
    if (stryMutAct_9fa48("1282") ? method === 'toLowerCase' && method === 'toUpperCase' : stryMutAct_9fa48("1281") ? false : stryMutAct_9fa48("1280") ? true : (stryCov_9fa48("1280", "1281", "1282"), (stryMutAct_9fa48("1284") ? method !== 'toLowerCase' : stryMutAct_9fa48("1283") ? false : (stryCov_9fa48("1283", "1284"), method === (stryMutAct_9fa48("1285") ? "" : (stryCov_9fa48("1285"), 'toLowerCase')))) || (stryMutAct_9fa48("1287") ? method !== 'toUpperCase' : stryMutAct_9fa48("1286") ? false : (stryCov_9fa48("1286", "1287"), method === (stryMutAct_9fa48("1288") ? "" : (stryCov_9fa48("1288"), 'toUpperCase')))))) {
      if (stryMutAct_9fa48("1289")) {
        {}
      } else {
        stryCov_9fa48("1289");
        const text = staticString(env, receiver);
        return (stryMutAct_9fa48("1292") ? text !== undefined : stryMutAct_9fa48("1291") ? false : stryMutAct_9fa48("1290") ? true : (stryCov_9fa48("1290", "1291", "1292"), text === undefined)) ? undefined : (stryMutAct_9fa48("1295") ? method !== 'toLowerCase' : stryMutAct_9fa48("1294") ? false : stryMutAct_9fa48("1293") ? true : (stryCov_9fa48("1293", "1294", "1295"), method === (stryMutAct_9fa48("1296") ? "" : (stryCov_9fa48("1296"), 'toLowerCase')))) ? stryMutAct_9fa48("1297") ? text.toUpperCase() : (stryCov_9fa48("1297"), text.toLowerCase()) : stryMutAct_9fa48("1298") ? text.toLowerCase() : (stryCov_9fa48("1298"), text.toUpperCase());
      }
    }
    if (stryMutAct_9fa48("1301") ? method !== 'concat' : stryMutAct_9fa48("1300") ? false : stryMutAct_9fa48("1299") ? true : (stryCov_9fa48("1299", "1300", "1301"), method === (stryMutAct_9fa48("1302") ? "" : (stryCov_9fa48("1302"), 'concat')))) return foldParts(env, stryMutAct_9fa48("1303") ? [] : (stryCov_9fa48("1303"), [receiver, ...args]));
    if (stryMutAct_9fa48("1306") ? method !== 'join' : stryMutAct_9fa48("1305") ? false : stryMutAct_9fa48("1304") ? true : (stryCov_9fa48("1304", "1305", "1306"), method === (stryMutAct_9fa48("1307") ? "" : (stryCov_9fa48("1307"), 'join')))) return foldJoin(env, receiver, args);
    return undefined;
  }
}

/**
 * Fold `String.fromCharCode(…)` and its code-point sibling.
 * @param method - which of the two was called.
 * @param args - the character codes.
 * @returns the string, or undefined.
 */
function foldCharacters(method: string, args: readonly Field[]): string | undefined {
  if (stryMutAct_9fa48("1308")) {
    {}
  } else {
    stryCov_9fa48("1308");
    const codes: number[] = stryMutAct_9fa48("1309") ? ["Stryker was here"] : (stryCov_9fa48("1309"), []);
    for (const argument of args) {
      if (stryMutAct_9fa48("1310")) {
        {}
      } else {
        stryCov_9fa48("1310");
        if (stryMutAct_9fa48("1313") ? (!isNode(argument) || argument.type !== 'Literal') && typeof argument['value'] !== 'number' : stryMutAct_9fa48("1312") ? false : stryMutAct_9fa48("1311") ? true : (stryCov_9fa48("1311", "1312", "1313"), (stryMutAct_9fa48("1315") ? !isNode(argument) && argument.type !== 'Literal' : stryMutAct_9fa48("1314") ? false : (stryCov_9fa48("1314", "1315"), (stryMutAct_9fa48("1316") ? isNode(argument) : (stryCov_9fa48("1316"), !isNode(argument))) || (stryMutAct_9fa48("1318") ? argument.type === 'Literal' : stryMutAct_9fa48("1317") ? false : (stryCov_9fa48("1317", "1318"), argument.type !== (stryMutAct_9fa48("1319") ? "" : (stryCov_9fa48("1319"), 'Literal')))))) || (stryMutAct_9fa48("1321") ? typeof argument['value'] === 'number' : stryMutAct_9fa48("1320") ? false : (stryCov_9fa48("1320", "1321"), typeof argument[stryMutAct_9fa48("1322") ? "" : (stryCov_9fa48("1322"), 'value')] !== (stryMutAct_9fa48("1323") ? "" : (stryCov_9fa48("1323"), 'number')))))) return undefined;
        codes.push(argument[stryMutAct_9fa48("1325") ? "" : (stryCov_9fa48("1325"), 'value')]);
      }
    }
    // `fromCharCode` truncates each argument to sixteen bits; the mask reproduces
    // that without calling the deprecated form.
    const units = (stryMutAct_9fa48("1328") ? method !== 'fromCharCode' : stryMutAct_9fa48("1327") ? false : stryMutAct_9fa48("1326") ? true : (stryCov_9fa48("1326", "1327", "1328"), method === (stryMutAct_9fa48("1329") ? "" : (stryCov_9fa48("1329"), 'fromCharCode')))) ? codes.map(stryMutAct_9fa48("1330") ? () => undefined : (stryCov_9fa48("1330"), code => code & 0xff_ff)) : codes;
    return String.fromCodePoint(...units);
  }
}

/**
 * Fold a run of expressions into one string, when every one of them folds.
 * @param env - the file's constants.
 * @param parts - the expressions.
 * @returns the string, or undefined.
 */
function foldParts(env: Constants, parts: readonly Field[]): string | undefined {
  if (stryMutAct_9fa48("1331")) {
    {}
  } else {
    stryCov_9fa48("1331");
    let text = stryMutAct_9fa48("1332") ? "Stryker was here!" : (stryCov_9fa48("1332"), '');
    for (const part of parts) {
      if (stryMutAct_9fa48("1333")) {
        {}
      } else {
        stryCov_9fa48("1333");
        const folded = staticString(env, part);
        if (stryMutAct_9fa48("1336") ? folded !== undefined : stryMutAct_9fa48("1335") ? false : stryMutAct_9fa48("1334") ? true : (stryCov_9fa48("1334", "1335", "1336"), folded === undefined)) return undefined;
        stryMutAct_9fa48("1337") ? text -= folded : (stryCov_9fa48("1337"), text += folded);
      }
    }
    return text;
  }
}

/**
 * Fold `['s','t'].join('')` and its separator.
 * @param env - the file's constants.
 * @param receiver - the array being joined.
 * @param args - the separator, when given.
 * @returns the string, or undefined.
 */
function foldJoin(env: Constants, receiver: Field | undefined, args: readonly Field[]): string | undefined {
  if (stryMutAct_9fa48("1338")) {
    {}
  } else {
    stryCov_9fa48("1338");
    if (stryMutAct_9fa48("1341") ? !isNode(receiver) && receiver.type !== 'ArrayExpression' : stryMutAct_9fa48("1340") ? false : stryMutAct_9fa48("1339") ? true : (stryCov_9fa48("1339", "1340", "1341"), (stryMutAct_9fa48("1342") ? isNode(receiver) : (stryCov_9fa48("1342"), !isNode(receiver))) || (stryMutAct_9fa48("1344") ? receiver.type === 'ArrayExpression' : stryMutAct_9fa48("1343") ? false : (stryCov_9fa48("1343", "1344"), receiver.type !== (stryMutAct_9fa48("1345") ? "" : (stryCov_9fa48("1345"), 'ArrayExpression')))))) return undefined;
    const elements = receiver[stryMutAct_9fa48("1346") ? "" : (stryCov_9fa48("1346"), 'elements')];
    if (stryMutAct_9fa48("1349") ? false : stryMutAct_9fa48("1348") ? true : stryMutAct_9fa48("1347") ? Array.isArray(elements) : (stryCov_9fa48("1347", "1348", "1349"), !Array.isArray(elements))) return undefined;
    const separator = (stryMutAct_9fa48("1352") ? args.length !== 0 : stryMutAct_9fa48("1351") ? false : stryMutAct_9fa48("1350") ? true : (stryCov_9fa48("1350", "1351", "1352"), args.length === 0)) ? stryMutAct_9fa48("1353") ? "Stryker was here!" : (stryCov_9fa48("1353"), '') : staticString(env, args[0]);
    if (stryMutAct_9fa48("1356") ? separator !== undefined : stryMutAct_9fa48("1355") ? false : stryMutAct_9fa48("1354") ? true : (stryCov_9fa48("1354", "1355", "1356"), separator === undefined)) return undefined;
    const parts: string[] = stryMutAct_9fa48("1357") ? ["Stryker was here"] : (stryCov_9fa48("1357"), []);
    for (const element of elements) {
      if (stryMutAct_9fa48("1358")) {
        {}
      } else {
        stryCov_9fa48("1358");
        const folded = staticString(env, element);
        if (stryMutAct_9fa48("1361") ? folded !== undefined : stryMutAct_9fa48("1360") ? false : stryMutAct_9fa48("1359") ? true : (stryCov_9fa48("1359", "1360", "1361"), folded === undefined)) return undefined;
        if (stryMutAct_9fa48("1362")) {
          ;
        } else {
          stryCov_9fa48("1362");
          parts.push(folded);
        }
      }
    }
    return parts.join(separator);
  }
}

/**
 * The placeholder an unreadable part of a string leaves behind.
 *
 * A private-use code point, so it can never collide with anything the source
 * actually contains, and one character wide so the shape of what surrounds it
 * survives — which is the whole point: markup half-written in the source and
 * half-supplied at runtime is still markup, and its attributes are still
 * readable even when their values are not.
 */
export const UNREADABLE = stryMutAct_9fa48("1363") ? "" : (stryCov_9fa48("1363"), '\u{F8FF}');

/**
 * The nearest string an expression can be read as, with everything undecidable
 * standing in as {@link UNREADABLE}.
 *
 * This is what `staticString` cannot do: it answers all-or-nothing, so a single
 * interpolation hides the whole string from every rule. Markup does not work
 * that way — a tag half-written in the source names its styling attribute
 * regardless of what the colour interpolation turns out to be.
 * @param env - the file's constants.
 * @param node - the expression to read, parentheses and assertions included.
 * @returns the approximation, or undefined when the node produces no string.
 */
export function approximateString(env: Constants, node: Field | undefined): string | undefined {
  if (stryMutAct_9fa48("1364")) {
    {}
  } else {
    stryCov_9fa48("1364");
    const exact = staticString(env, node);
    if (stryMutAct_9fa48("1367") ? exact === undefined : stryMutAct_9fa48("1366") ? false : stryMutAct_9fa48("1365") ? true : (stryCov_9fa48("1365", "1366", "1367"), exact !== undefined)) return exact;
    const read = unwrap(node);
    if (stryMutAct_9fa48("1370") ? false : stryMutAct_9fa48("1369") ? true : stryMutAct_9fa48("1368") ? isNode(read) : (stryCov_9fa48("1368", "1369", "1370"), !isNode(read))) return undefined;
    switch (read.type) {
      case stryMutAct_9fa48("1372") ? "" : (stryCov_9fa48("1372"), 'TemplateLiteral'):
        if (stryMutAct_9fa48("1371")) {} else {
          stryCov_9fa48("1371");
          return approximateTemplate(env, read);
        }
      case stryMutAct_9fa48("1374") ? "" : (stryCov_9fa48("1374"), 'BinaryExpression'):
        if (stryMutAct_9fa48("1373")) {} else {
          stryCov_9fa48("1373");
          return (stryMutAct_9fa48("1377") ? read['operator'] !== '+' : stryMutAct_9fa48("1376") ? false : stryMutAct_9fa48("1375") ? true : (stryCov_9fa48("1375", "1376", "1377"), read[stryMutAct_9fa48("1378") ? "" : (stryCov_9fa48("1378"), 'operator')] === (stryMutAct_9fa48("1379") ? "" : (stryCov_9fa48("1379"), '+')))) ? stryMutAct_9fa48("1380") ? `` : (stryCov_9fa48("1380"), `${stryMutAct_9fa48("1381") ? approximateString(env, read['left']) && UNREADABLE : (stryCov_9fa48("1381"), approximateString(env, read[stryMutAct_9fa48("1382") ? "" : (stryCov_9fa48("1382"), 'left')]) ?? UNREADABLE)}${stryMutAct_9fa48("1383") ? approximateString(env, read['right']) && UNREADABLE : (stryCov_9fa48("1383"), approximateString(env, read[stryMutAct_9fa48("1384") ? "" : (stryCov_9fa48("1384"), 'right')]) ?? UNREADABLE)}`) : undefined;
        }
      default:
        if (stryMutAct_9fa48("1385")) {} else {
          stryCov_9fa48("1385");
          return undefined;
        }
    }
  }
}

/**
 * Read a template, standing in for each interpolation that cannot be folded.
 * @param env - the file's constants.
 * @param node - the template literal.
 * @returns the approximation, or undefined when its parts are not readable.
 */
function approximateTemplate(env: Constants, node: Node): string | undefined {
  if (stryMutAct_9fa48("1386")) {
    {}
  } else {
    stryCov_9fa48("1386");
    const parts = templateParts(node);
    if (stryMutAct_9fa48("1389") ? parts !== undefined : stryMutAct_9fa48("1388") ? false : stryMutAct_9fa48("1387") ? true : (stryCov_9fa48("1387", "1388", "1389"), parts === undefined)) return undefined;
    let text = stryMutAct_9fa48("1390") ? "Stryker was here!" : (stryCov_9fa48("1390"), '');
    for (const [index, cooked] of parts.cooked.entries()) {
      if (stryMutAct_9fa48("1391")) {
        {}
      } else {
        stryCov_9fa48("1391");
        stryMutAct_9fa48("1392") ? text -= cooked : (stryCov_9fa48("1392"), text += cooked);
        if (stryMutAct_9fa48("1396") ? index >= parts.expressions.length : stryMutAct_9fa48("1395") ? index <= parts.expressions.length : stryMutAct_9fa48("1394") ? false : stryMutAct_9fa48("1393") ? true : (stryCov_9fa48("1393", "1394", "1395", "1396"), index < parts.expressions.length)) stryMutAct_9fa48("1397") ? text -= approximateString(env, parts.expressions[index]) ?? UNREADABLE : (stryCov_9fa48("1397"), text += stryMutAct_9fa48("1398") ? approximateString(env, parts.expressions[index]) && UNREADABLE : (stryCov_9fa48("1398"), approximateString(env, parts.expressions[index]) ?? UNREADABLE));
      }
    }
    return text;
  }
}