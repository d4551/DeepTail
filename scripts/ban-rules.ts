/**
 * The core ban rules: how a node is recognised as an idiom the project has
 * moved past, read through whatever the file renamed.
 *
 * The framework-specific bans — the React 19 removals and the Tauri v1 paths —
 * live in `react-tauri-rules.ts`; both sets read names through the same
 * helpers in `rule-helpers.ts`.
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
import { type Field, fieldOf, isNode, type Node, unwrap } from './ast.ts';
import { namesDebt } from './debt-names.ts';
import { staticString } from './fold.ts';
import { SUPERSEDED_RULES } from './react-tauri-rules.ts';
import { callsGlobal, callsMethod, identifier, literalKey, type Names, property, type Rule } from './rule-helpers.ts';

/** Properties whose assignment replaces an element's markup. */
const MARKUP_PROPERTIES = stryMutAct_9fa48("420") ? [] : (stryCov_9fa48("420"), [stryMutAct_9fa48("421") ? "" : (stryCov_9fa48("421"), 'innerHTML'), stryMutAct_9fa48("422") ? "" : (stryCov_9fa48("422"), 'outerHTML')]);

/** Test runners whose modifiers take a case out of the run. */
const RUNNERS = new Set(stryMutAct_9fa48("423") ? [] : (stryCov_9fa48("423"), [stryMutAct_9fa48("424") ? "" : (stryCov_9fa48("424"), 'it'), stryMutAct_9fa48("425") ? "" : (stryCov_9fa48("425"), 'test'), stryMutAct_9fa48("426") ? "" : (stryCov_9fa48("426"), 'describe')]));

/** Modifiers that stop a case reporting, or stop its siblings reporting. */
const MODIFIERS = new Set(stryMutAct_9fa48("427") ? [] : (stryCov_9fa48("427"), [stryMutAct_9fa48("428") ? "" : (stryCov_9fa48("428"), 'skip'), stryMutAct_9fa48("429") ? "" : (stryCov_9fa48("429"), 'only'), stryMutAct_9fa48("430") ? "" : (stryCov_9fa48("430"), 'todo'), stryMutAct_9fa48("431") ? "" : (stryCov_9fa48("431"), 'failing'), stryMutAct_9fa48("432") ? "" : (stryCov_9fa48("432"), 'skipIf'), stryMutAct_9fa48("433") ? "" : (stryCov_9fa48("433"), 'todoIf')]));

/** Idioms the project has moved past, stated about the tree. */
export const BANNED: readonly Rule[] = stryMutAct_9fa48("434") ? [] : (stryCov_9fa48("434"), [stryMutAct_9fa48("435") ? {} : (stryCov_9fa48("435"), {
  holds: stryMutAct_9fa48("436") ? () => undefined : (stryCov_9fa48("436"), node => stryMutAct_9fa48("439") ? node.type === 'VariableDeclaration' || node['kind'] === 'var' : stryMutAct_9fa48("438") ? false : stryMutAct_9fa48("437") ? true : (stryCov_9fa48("437", "438", "439"), (stryMutAct_9fa48("441") ? node.type !== 'VariableDeclaration' : stryMutAct_9fa48("440") ? true : (stryCov_9fa48("440", "441"), node.type === (stryMutAct_9fa48("442") ? "" : (stryCov_9fa48("442"), 'VariableDeclaration')))) && (stryMutAct_9fa48("444") ? node['kind'] !== 'var' : stryMutAct_9fa48("443") ? true : (stryCov_9fa48("443", "444"), node[stryMutAct_9fa48("445") ? "" : (stryCov_9fa48("445"), 'kind')] === (stryMutAct_9fa48("446") ? "" : (stryCov_9fa48("446"), 'var')))))),
  why: stryMutAct_9fa48("447") ? "" : (stryCov_9fa48("447"), 'use const or let')
}), stryMutAct_9fa48("448") ? {} : (stryCov_9fa48("448"), {
  holds: stryMutAct_9fa48("449") ? () => undefined : (stryCov_9fa48("449"), (node, names) => callsGlobal(node, stryMutAct_9fa48("450") ? "" : (stryCov_9fa48("450"), 'require'), names)),
  why: stryMutAct_9fa48("451") ? "" : (stryCov_9fa48("451"), 'use ES module imports')
}), stryMutAct_9fa48("452") ? {} : (stryCov_9fa48("452"), {
  holds: stryMutAct_9fa48("453") ? () => undefined : (stryCov_9fa48("453"), (node, names) => callsGlobal(node, stryMutAct_9fa48("454") ? "" : (stryCov_9fa48("454"), 'eval'), names)),
  why: stryMutAct_9fa48("455") ? "" : (stryCov_9fa48("455"), 'eval executes text as code; call the function directly')
}), stryMutAct_9fa48("456") ? {} : (stryCov_9fa48("456"), {
  holds: stryMutAct_9fa48("457") ? () => undefined : (stryCov_9fa48("457"), node => stryMutAct_9fa48("460") ? node.type !== 'WithStatement' : stryMutAct_9fa48("459") ? false : stryMutAct_9fa48("458") ? true : (stryCov_9fa48("458", "459", "460"), node.type === (stryMutAct_9fa48("461") ? "" : (stryCov_9fa48("461"), 'WithStatement')))),
  why: stryMutAct_9fa48("462") ? "" : (stryCov_9fa48("462"), 'with is forbidden in strict mode; name the object')
}), stryMutAct_9fa48("463") ? {} : (stryCov_9fa48("463"), {
  holds: stryMutAct_9fa48("464") ? () => undefined : (stryCov_9fa48("464"), (node, names) => stryMutAct_9fa48("467") ? node.type === 'AssignmentExpression' && writesMarkup(node['left'], names) && writesProperty(node, MARKUP_PROPERTIES, names) : stryMutAct_9fa48("466") ? false : stryMutAct_9fa48("465") ? true : (stryCov_9fa48("465", "466", "467"), (stryMutAct_9fa48("469") ? node.type === 'AssignmentExpression' || writesMarkup(node['left'], names) : stryMutAct_9fa48("468") ? false : (stryCov_9fa48("468", "469"), (stryMutAct_9fa48("471") ? node.type !== 'AssignmentExpression' : stryMutAct_9fa48("470") ? true : (stryCov_9fa48("470", "471"), node.type === (stryMutAct_9fa48("472") ? "" : (stryCov_9fa48("472"), 'AssignmentExpression')))) && writesMarkup(node[stryMutAct_9fa48("473") ? "" : (stryCov_9fa48("473"), 'left')], names))) || writesProperty(node, MARKUP_PROPERTIES, names))),
  why: stryMutAct_9fa48("474") ? "" : (stryCov_9fa48("474"), 'use textContent, or insertAdjacentHTML with markup this repository does not author')
}), stryMutAct_9fa48("475") ? {} : (stryCov_9fa48("475"), {
  holds: stryMutAct_9fa48("476") ? () => undefined : (stryCov_9fa48("476"), (node, names) => callsMethod(node, stryMutAct_9fa48("477") ? "" : (stryCov_9fa48("477"), 'document'), stryMutAct_9fa48("478") ? [] : (stryCov_9fa48("478"), [stryMutAct_9fa48("479") ? "" : (stryCov_9fa48("479"), 'write'), stryMutAct_9fa48("480") ? "" : (stryCov_9fa48("480"), 'writeln')]), names)),
  why: stryMutAct_9fa48("481") ? "" : (stryCov_9fa48("481"), 'document.write is removed from modern engines')
}), stryMutAct_9fa48("482") ? {} : (stryCov_9fa48("482"), {
  holds: stryMutAct_9fa48("483") ? () => undefined : (stryCov_9fa48("483"), (node, names) => stryMutAct_9fa48("486") ? node.type === 'MemberExpression' || property(node, names) === 'substr' : stryMutAct_9fa48("485") ? false : stryMutAct_9fa48("484") ? true : (stryCov_9fa48("484", "485", "486"), (stryMutAct_9fa48("488") ? node.type !== 'MemberExpression' : stryMutAct_9fa48("487") ? true : (stryCov_9fa48("487", "488"), node.type === (stryMutAct_9fa48("489") ? "" : (stryCov_9fa48("489"), 'MemberExpression')))) && (stryMutAct_9fa48("491") ? property(node, names) !== 'substr' : stryMutAct_9fa48("490") ? true : (stryCov_9fa48("490", "491"), property(node, names) === (stryMutAct_9fa48("492") ? "" : (stryCov_9fa48("492"), 'substr')))))),
  why: stryMutAct_9fa48("493") ? "" : (stryCov_9fa48("493"), 'String.prototype.substr is deprecated; use slice')
}), stryMutAct_9fa48("494") ? {} : (stryCov_9fa48("494"), {
  holds: stryMutAct_9fa48("495") ? () => undefined : (stryCov_9fa48("495"), (node, names) => stryMutAct_9fa48("498") ? node.type === 'NewExpression' && identifier(node['callee'], names) === 'Array' && reflectsConstruct(node, 'Array', names) : stryMutAct_9fa48("497") ? false : stryMutAct_9fa48("496") ? true : (stryCov_9fa48("496", "497", "498"), (stryMutAct_9fa48("500") ? node.type === 'NewExpression' || identifier(node['callee'], names) === 'Array' : stryMutAct_9fa48("499") ? false : (stryCov_9fa48("499", "500"), (stryMutAct_9fa48("502") ? node.type !== 'NewExpression' : stryMutAct_9fa48("501") ? true : (stryCov_9fa48("501", "502"), node.type === (stryMutAct_9fa48("503") ? "" : (stryCov_9fa48("503"), 'NewExpression')))) && (stryMutAct_9fa48("505") ? identifier(node['callee'], names) !== 'Array' : stryMutAct_9fa48("504") ? true : (stryCov_9fa48("504", "505"), identifier(node[stryMutAct_9fa48("506") ? "" : (stryCov_9fa48("506"), 'callee')], names) === (stryMutAct_9fa48("507") ? "" : (stryCov_9fa48("507"), 'Array')))))) || reflectsConstruct(node, stryMutAct_9fa48("508") ? "" : (stryCov_9fa48("508"), 'Array'), names))),
  why: stryMutAct_9fa48("509") ? "" : (stryCov_9fa48("509"), 'use an array literal or Array.from')
}), stryMutAct_9fa48("510") ? {} : (stryCov_9fa48("510"), {
  holds: stryMutAct_9fa48("511") ? () => undefined : (stryCov_9fa48("511"), (node, names) => stryMutAct_9fa48("514") ? callsGlobal(node, 'escape', names) && callsGlobal(node, 'unescape', names) : stryMutAct_9fa48("513") ? false : stryMutAct_9fa48("512") ? true : (stryCov_9fa48("512", "513", "514"), callsGlobal(node, stryMutAct_9fa48("515") ? "" : (stryCov_9fa48("515"), 'escape'), names) || callsGlobal(node, stryMutAct_9fa48("516") ? "" : (stryCov_9fa48("516"), 'unescape'), names))),
  why: stryMutAct_9fa48("517") ? "" : (stryCov_9fa48("517"), 'the global escape and unescape are deprecated; use encodeURIComponent, or CSS.escape for a selector')
}), stryMutAct_9fa48("518") ? {} : (stryCov_9fa48("518"), {
  holds: stryMutAct_9fa48("519") ? () => undefined : (stryCov_9fa48("519"), (node, names) => runsTextAsCode(node, names)),
  why: stryMutAct_9fa48("520") ? "" : (stryCov_9fa48("520"), 'a timer called with text runs the text as code; pass a function')
}), stryMutAct_9fa48("521") ? {} : (stryCov_9fa48("521"), {
  holds: stryMutAct_9fa48("522") ? () => undefined : (stryCov_9fa48("522"), (node, names) => namesPrototype(node, names)),
  why: stryMutAct_9fa48("523") ? "" : (stryCov_9fa48("523"), 'use Object.getPrototypeOf or Object.create')
}), stryMutAct_9fa48("524") ? {} : (stryCov_9fa48("524"), {
  holds: stryMutAct_9fa48("525") ? () => undefined : (stryCov_9fa48("525"), node => stryMutAct_9fa48("528") ? node.type !== 'TSAnyKeyword' : stryMutAct_9fa48("527") ? false : stryMutAct_9fa48("526") ? true : (stryCov_9fa48("526", "527", "528"), node.type === (stryMutAct_9fa48("529") ? "" : (stryCov_9fa48("529"), 'TSAnyKeyword')))),
  why: stryMutAct_9fa48("530") ? "" : (stryCov_9fa48("530"), 'any defeats the type system; name the shape')
}), stryMutAct_9fa48("531") ? {} : (stryCov_9fa48("531"), {
  holds: stryMutAct_9fa48("532") ? () => undefined : (stryCov_9fa48("532"), (node, names) => skipsTest(node, names)),
  why: stryMutAct_9fa48("533") ? "" : (stryCov_9fa48("533"), 'a test that is skipped, focused or expected to fail is a test that does not report')
}), stryMutAct_9fa48("534") ? {} : (stryCov_9fa48("534"), {
  holds: stryMutAct_9fa48("535") ? () => undefined : (stryCov_9fa48("535"), node => stryMutAct_9fa48("538") ? node.type !== 'TSNonNullExpression' : stryMutAct_9fa48("537") ? false : stryMutAct_9fa48("536") ? true : (stryCov_9fa48("536", "537", "538"), node.type === (stryMutAct_9fa48("539") ? "" : (stryCov_9fa48("539"), 'TSNonNullExpression')))),
  why: stryMutAct_9fa48("540") ? "" : (stryCov_9fa48("540"), 'a non-null assertion overrides the checker; narrow the value or handle the absent case')
}), stryMutAct_9fa48("541") ? {} : (stryCov_9fa48("541"), {
  holds: stryMutAct_9fa48("542") ? () => undefined : (stryCov_9fa48("542"), node => stryMutAct_9fa48("545") ? node.type === 'TSAsExpression' || !isConstAssertion(node) : stryMutAct_9fa48("544") ? false : stryMutAct_9fa48("543") ? true : (stryCov_9fa48("543", "544", "545"), (stryMutAct_9fa48("547") ? node.type !== 'TSAsExpression' : stryMutAct_9fa48("546") ? true : (stryCov_9fa48("546", "547"), node.type === (stryMutAct_9fa48("548") ? "" : (stryCov_9fa48("548"), 'TSAsExpression')))) && (stryMutAct_9fa48("549") ? isConstAssertion(node) : (stryCov_9fa48("549"), !isConstAssertion(node))))),
  why: stryMutAct_9fa48("550") ? "" : (stryCov_9fa48("550"), 'an as-expression claims a shape nothing proved; narrow the value with a predicate')
}), stryMutAct_9fa48("551") ? {} : (stryCov_9fa48("551"), {
  holds: stryMutAct_9fa48("552") ? () => undefined : (stryCov_9fa48("552"), node => stryMutAct_9fa48("555") ? node.type !== 'CatchClause' : stryMutAct_9fa48("554") ? false : stryMutAct_9fa48("553") ? true : (stryCov_9fa48("553", "554", "555"), node.type === (stryMutAct_9fa48("556") ? "" : (stryCov_9fa48("556"), 'CatchClause')))),
  why: stryMutAct_9fa48("557") ? "" : (stryCov_9fa48("557"), 'a catch reads any failure as one shape; settle the promise, or let the failure travel')
}), stryMutAct_9fa48("558") ? {} : (stryCov_9fa48("558"), {
  holds: stryMutAct_9fa48("559") ? () => undefined : (stryCov_9fa48("559"), node => namesDebt(node)),
  why: stryMutAct_9fa48("560") ? "" : (stryCov_9fa48("560"), 'this name says the code stands in for something real; name what it does, or remove the debt')
}), stryMutAct_9fa48("561") ? {} : (stryCov_9fa48("561"), {
  holds: stryMutAct_9fa48("562") ? () => undefined : (stryCov_9fa48("562"), node => stryMutAct_9fa48("565") ? node.type !== 'TSEnumDeclaration' : stryMutAct_9fa48("564") ? false : stryMutAct_9fa48("563") ? true : (stryCov_9fa48("563", "564", "565"), node.type === (stryMutAct_9fa48("566") ? "" : (stryCov_9fa48("566"), 'TSEnumDeclaration')))),
  why: stryMutAct_9fa48("567") ? "" : (stryCov_9fa48("567"), 'an enum is TypeScript 6 syntax; use a union of string literals or as const')
}), stryMutAct_9fa48("568") ? {} : (stryCov_9fa48("568"), {
  holds: stryMutAct_9fa48("569") ? () => undefined : (stryCov_9fa48("569"), node => stryMutAct_9fa48("572") ? node.type !== 'TSImportEqualsDeclaration' : stryMutAct_9fa48("571") ? false : stryMutAct_9fa48("570") ? true : (stryCov_9fa48("570", "571", "572"), node.type === (stryMutAct_9fa48("573") ? "" : (stryCov_9fa48("573"), 'TSImportEqualsDeclaration')))),
  why: stryMutAct_9fa48("574") ? "" : (stryCov_9fa48("574"), 'import-equals is TypeScript 6 syntax; use a default import or `import type`')
}), stryMutAct_9fa48("575") ? {} : (stryCov_9fa48("575"), {
  holds: stryMutAct_9fa48("576") ? () => undefined : (stryCov_9fa48("576"), node => stryMutAct_9fa48("579") ? node.type === 'TSModuleDeclaration' && isNode(node['id']) && node['id'].type === 'Identifier' || node['id']['name'] !== 'global' : stryMutAct_9fa48("578") ? false : stryMutAct_9fa48("577") ? true : (stryCov_9fa48("577", "578", "579"), (stryMutAct_9fa48("581") ? node.type === 'TSModuleDeclaration' && isNode(node['id']) || node['id'].type === 'Identifier' : stryMutAct_9fa48("580") ? true : (stryCov_9fa48("580", "581"), (stryMutAct_9fa48("583") ? node.type === 'TSModuleDeclaration' || isNode(node['id']) : stryMutAct_9fa48("582") ? true : (stryCov_9fa48("582", "583"), (stryMutAct_9fa48("585") ? node.type !== 'TSModuleDeclaration' : stryMutAct_9fa48("584") ? true : (stryCov_9fa48("584", "585"), node.type === (stryMutAct_9fa48("586") ? "" : (stryCov_9fa48("586"), 'TSModuleDeclaration')))) && isNode(node[stryMutAct_9fa48("587") ? "" : (stryCov_9fa48("587"), 'id')]))) && (stryMutAct_9fa48("589") ? node['id'].type !== 'Identifier' : stryMutAct_9fa48("588") ? true : (stryCov_9fa48("588", "589"), node[stryMutAct_9fa48("590") ? "" : (stryCov_9fa48("590"), 'id')].type === (stryMutAct_9fa48("591") ? "" : (stryCov_9fa48("591"), 'Identifier')))))) && (stryMutAct_9fa48("593") ? node['id']['name'] === 'global' : stryMutAct_9fa48("592") ? true : (stryCov_9fa48("592", "593"), node[stryMutAct_9fa48("594") ? "" : (stryCov_9fa48("594"), 'id')][stryMutAct_9fa48("595") ? "" : (stryCov_9fa48("595"), 'name')] !== (stryMutAct_9fa48("596") ? "" : (stryCov_9fa48("596"), 'global')))))),
  why: stryMutAct_9fa48("597") ? "" : (stryCov_9fa48("597"), 'a namespace is a TypeScript 6 module system; use ES module exports')
}), stryMutAct_9fa48("598") ? {} : (stryCov_9fa48("598"), {
  holds: stryMutAct_9fa48("599") ? () => undefined : (stryCov_9fa48("599"), (node, names) => expandoPrototype(node, names)),
  why: stryMutAct_9fa48("600") ? "" : (stryCov_9fa48("600"), 'the constructor-function expando pattern was removed in TypeScript 7; use a class')
}), ...SUPERSEDED_RULES]);

/**
 * Whether an as-expression is the const assertion.
 *
 * `as const` claims nothing about a value: it narrows a literal to itself,
 * which is the opposite of the escape the ban is about.
 * @param node - the as-expression.
 * @returns true when it is `as const`.
 */
function isConstAssertion(node: Node): boolean {
  if (stryMutAct_9fa48("601")) {
    {}
  } else {
    stryCov_9fa48("601");
    return stryMutAct_9fa48("604") ? fieldOf(fieldOf(node['typeAnnotation'], 'typeName'), 'name') !== 'const' : stryMutAct_9fa48("603") ? false : stryMutAct_9fa48("602") ? true : (stryCov_9fa48("602", "603", "604"), fieldOf(fieldOf(node[stryMutAct_9fa48("605") ? "" : (stryCov_9fa48("605"), 'typeAnnotation')], stryMutAct_9fa48("606") ? "" : (stryCov_9fa48("606"), 'typeName')), stryMutAct_9fa48("607") ? "" : (stryCov_9fa48("607"), 'name')) === (stryMutAct_9fa48("608") ? "" : (stryCov_9fa48("608"), 'const')));
  }
}

/**
 * Whether a timer call receives text to run rather than a function.
 *
 * `setTimeout("code()")` and `setInterval("code()")` evaluate their first
 * argument as script, which is `eval` with a delay and slips a rule written
 * only about the global itself. The first argument is read through the same
 * folding as every other string, so a concatenated or interpolated body is
 * caught with the literal one.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when a timer is handed text to execute.
 */
function runsTextAsCode(node: Node, names: Names): boolean {
  if (stryMutAct_9fa48("609")) {
    {}
  } else {
    stryCov_9fa48("609");
    const timer = stryMutAct_9fa48("612") ? callsGlobal(node, 'setTimeout', names) && callsGlobal(node, 'setInterval', names) : stryMutAct_9fa48("611") ? false : stryMutAct_9fa48("610") ? true : (stryCov_9fa48("610", "611", "612"), callsGlobal(node, stryMutAct_9fa48("613") ? "" : (stryCov_9fa48("613"), 'setTimeout'), names) || callsGlobal(node, stryMutAct_9fa48("614") ? "" : (stryCov_9fa48("614"), 'setInterval'), names));
    if (stryMutAct_9fa48("617") ? false : stryMutAct_9fa48("616") ? true : stryMutAct_9fa48("615") ? timer : (stryCov_9fa48("615", "616", "617"), !timer)) return stryMutAct_9fa48("618") ? true : (stryCov_9fa48("618"), false);
    const args = node[stryMutAct_9fa48("619") ? "" : (stryCov_9fa48("619"), 'arguments')];
    if (stryMutAct_9fa48("622") ? false : stryMutAct_9fa48("621") ? true : stryMutAct_9fa48("620") ? Array.isArray(args) : (stryCov_9fa48("620", "621", "622"), !Array.isArray(args))) return stryMutAct_9fa48("623") ? true : (stryCov_9fa48("623"), false);
    return stryMutAct_9fa48("626") ? staticString(names.constants, args[0]) === undefined : stryMutAct_9fa48("625") ? false : stryMutAct_9fa48("624") ? true : (stryCov_9fa48("624", "625", "626"), staticString(names.constants, args[0]) !== undefined);
  }
}

/**
 * Whether a call reaches a constructor through `Reflect`, which is the same
 * construction spelt as a call.
 * @param node - the node to test.
 * @param target - the constructor's name.
 * @param names - what this file renamed.
 * @returns true when it does.
 */
function reflectsConstruct(node: Node, target: string, names: Names): boolean {
  if (stryMutAct_9fa48("627")) {
    {}
  } else {
    stryCov_9fa48("627");
    if (stryMutAct_9fa48("630") ? false : stryMutAct_9fa48("629") ? true : stryMutAct_9fa48("628") ? callsMethod(node, 'Reflect', ['construct'], names) : (stryCov_9fa48("628", "629", "630"), !callsMethod(node, stryMutAct_9fa48("631") ? "" : (stryCov_9fa48("631"), 'Reflect'), stryMutAct_9fa48("632") ? [] : (stryCov_9fa48("632"), [stryMutAct_9fa48("633") ? "" : (stryCov_9fa48("633"), 'construct')]), names))) return stryMutAct_9fa48("634") ? true : (stryCov_9fa48("634"), false);
    const args = node[stryMutAct_9fa48("635") ? "" : (stryCov_9fa48("635"), 'arguments')];
    return stryMutAct_9fa48("638") ? Array.isArray(args) || identifier(args[0], names) === target : stryMutAct_9fa48("637") ? false : stryMutAct_9fa48("636") ? true : (stryCov_9fa48("636", "637", "638"), Array.isArray(args) && (stryMutAct_9fa48("640") ? identifier(args[0], names) !== target : stryMutAct_9fa48("639") ? true : (stryCov_9fa48("639", "640"), identifier(args[0], names) === target)));
  }
}

/**
 * Whether a call writes a named property onto something, through `Reflect.set`,
 * `Object.defineProperty`, or an object merged with `Object.assign`.
 * @param node - the node to test.
 * @param wanted - the property names to reject.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it does.
 */
function writesProperty(node: Node, wanted: readonly string[], names: Names): boolean {
  if (stryMutAct_9fa48("641")) {
    {}
  } else {
    stryCov_9fa48("641");
    const args = node[stryMutAct_9fa48("642") ? "" : (stryCov_9fa48("642"), 'arguments')];
    if (stryMutAct_9fa48("645") ? false : stryMutAct_9fa48("644") ? true : stryMutAct_9fa48("643") ? Array.isArray(args) : (stryCov_9fa48("643", "644", "645"), !Array.isArray(args))) return stryMutAct_9fa48("646") ? true : (stryCov_9fa48("646"), false);
    if (stryMutAct_9fa48("649") ? callsMethod(node, 'Reflect', ['set', 'defineProperty'], names) && callsMethod(node, 'Object', ['defineProperty'], names) : stryMutAct_9fa48("648") ? false : stryMutAct_9fa48("647") ? true : (stryCov_9fa48("647", "648", "649"), callsMethod(node, stryMutAct_9fa48("650") ? "" : (stryCov_9fa48("650"), 'Reflect'), stryMutAct_9fa48("651") ? [] : (stryCov_9fa48("651"), [stryMutAct_9fa48("652") ? "" : (stryCov_9fa48("652"), 'set'), stryMutAct_9fa48("653") ? "" : (stryCov_9fa48("653"), 'defineProperty')]), names) || callsMethod(node, stryMutAct_9fa48("654") ? "" : (stryCov_9fa48("654"), 'Object'), stryMutAct_9fa48("655") ? [] : (stryCov_9fa48("655"), [stryMutAct_9fa48("656") ? "" : (stryCov_9fa48("656"), 'defineProperty')]), names))) {
      if (stryMutAct_9fa48("657")) {
        {}
      } else {
        stryCov_9fa48("657");
        const key = staticString(names.constants, args[1]);
        return stryMutAct_9fa48("660") ? key !== undefined || wanted.includes(key) : stryMutAct_9fa48("659") ? false : stryMutAct_9fa48("658") ? true : (stryCov_9fa48("658", "659", "660"), (stryMutAct_9fa48("662") ? key === undefined : stryMutAct_9fa48("661") ? true : (stryCov_9fa48("661", "662"), key !== undefined)) && wanted.includes(key));
      }
    }
    if (stryMutAct_9fa48("665") ? false : stryMutAct_9fa48("664") ? true : stryMutAct_9fa48("663") ? callsMethod(node, 'Object', ['assign', 'defineProperties'], names) : (stryCov_9fa48("663", "664", "665"), !callsMethod(node, stryMutAct_9fa48("666") ? "" : (stryCov_9fa48("666"), 'Object'), stryMutAct_9fa48("667") ? [] : (stryCov_9fa48("667"), [stryMutAct_9fa48("668") ? "" : (stryCov_9fa48("668"), 'assign'), stryMutAct_9fa48("669") ? "" : (stryCov_9fa48("669"), 'defineProperties')]), names))) return stryMutAct_9fa48("670") ? true : (stryCov_9fa48("670"), false);
    return stryMutAct_9fa48("672") ? args.some(argument => mergesKey(argument, wanted, names)) : stryMutAct_9fa48("671") ? args.slice(1).every(argument => mergesKey(argument, wanted, names)) : (stryCov_9fa48("671", "672"), args.slice(1).some(stryMutAct_9fa48("673") ? () => undefined : (stryCov_9fa48("673"), argument => mergesKey(argument, wanted, names))));
  }
}

/**
 * Whether an object literal being merged carries one of the named keys.
 * @param merged - the object being merged, parentheses and all.
 * @param wanted - the property names to reject.
 * @param names - what this file holds in constants.
 * @returns true when it does.
 */
function mergesKey(merged: Field | undefined, wanted: readonly string[], names: Names): boolean {
  if (stryMutAct_9fa48("674")) {
    {}
  } else {
    stryCov_9fa48("674");
    const argument = unwrap(merged);
    if (stryMutAct_9fa48("677") ? !isNode(argument) && argument.type !== 'ObjectExpression' : stryMutAct_9fa48("676") ? false : stryMutAct_9fa48("675") ? true : (stryCov_9fa48("675", "676", "677"), (stryMutAct_9fa48("678") ? isNode(argument) : (stryCov_9fa48("678"), !isNode(argument))) || (stryMutAct_9fa48("680") ? argument.type === 'ObjectExpression' : stryMutAct_9fa48("679") ? false : (stryCov_9fa48("679", "680"), argument.type !== (stryMutAct_9fa48("681") ? "" : (stryCov_9fa48("681"), 'ObjectExpression')))))) return stryMutAct_9fa48("682") ? true : (stryCov_9fa48("682"), false);
    const properties = argument[stryMutAct_9fa48("683") ? "" : (stryCov_9fa48("683"), 'properties')];
    if (stryMutAct_9fa48("686") ? false : stryMutAct_9fa48("685") ? true : stryMutAct_9fa48("684") ? Array.isArray(properties) : (stryCov_9fa48("684", "685", "686"), !Array.isArray(properties))) return stryMutAct_9fa48("687") ? true : (stryCov_9fa48("687"), false);
    return stryMutAct_9fa48("688") ? properties.every(property_ => {
      if (!isNode(property_) || property_.type !== 'Property') return false;
      const key = property_['computed'] === true ? staticString(names.constants, property_['key']) : identifier(property_['key'], names) ?? literalKey(property_['key']);
      return key !== undefined && wanted.includes(key);
    }) : (stryCov_9fa48("688"), properties.some(property_ => {
      if (stryMutAct_9fa48("689")) {
        {}
      } else {
        stryCov_9fa48("689");
        if (stryMutAct_9fa48("692") ? !isNode(property_) && property_.type !== 'Property' : stryMutAct_9fa48("691") ? false : stryMutAct_9fa48("690") ? true : (stryCov_9fa48("690", "691", "692"), (stryMutAct_9fa48("693") ? isNode(property_) : (stryCov_9fa48("693"), !isNode(property_))) || (stryMutAct_9fa48("695") ? property_.type === 'Property' : stryMutAct_9fa48("694") ? false : (stryCov_9fa48("694", "695"), property_.type !== (stryMutAct_9fa48("696") ? "" : (stryCov_9fa48("696"), 'Property')))))) return stryMutAct_9fa48("697") ? true : (stryCov_9fa48("697"), false);
        const key = (stryMutAct_9fa48("700") ? property_['computed'] !== true : stryMutAct_9fa48("699") ? false : stryMutAct_9fa48("698") ? true : (stryCov_9fa48("698", "699", "700"), property_[stryMutAct_9fa48("701") ? "" : (stryCov_9fa48("701"), 'computed')] === (stryMutAct_9fa48("702") ? false : (stryCov_9fa48("702"), true)))) ? staticString(names.constants, property_[stryMutAct_9fa48("703") ? "" : (stryCov_9fa48("703"), 'key')]) : stryMutAct_9fa48("704") ? identifier(property_['key'], names) && literalKey(property_['key']) : (stryCov_9fa48("704"), identifier(property_[stryMutAct_9fa48("705") ? "" : (stryCov_9fa48("705"), 'key')], names) ?? literalKey(property_[stryMutAct_9fa48("706") ? "" : (stryCov_9fa48("706"), 'key')]));
        return stryMutAct_9fa48("709") ? key !== undefined || wanted.includes(key) : stryMutAct_9fa48("708") ? false : stryMutAct_9fa48("707") ? true : (stryCov_9fa48("707", "708", "709"), (stryMutAct_9fa48("711") ? key === undefined : stryMutAct_9fa48("710") ? true : (stryCov_9fa48("710", "711"), key !== undefined)) && wanted.includes(key));
      }
    }));
  }
}

/**
 * Whether a node takes a test case out of the run, or takes every other case
 * out of it.
 * @param node - the node to test.
 * @param names - what this file renamed.
 * @returns true when it does.
 */
function skipsTest(node: Node, names: Names): boolean {
  if (stryMutAct_9fa48("712")) {
    {}
  } else {
    stryCov_9fa48("712");
    if (stryMutAct_9fa48("715") ? node.type === 'MemberExpression' : stryMutAct_9fa48("714") ? false : stryMutAct_9fa48("713") ? true : (stryCov_9fa48("713", "714", "715"), node.type !== (stryMutAct_9fa48("716") ? "" : (stryCov_9fa48("716"), 'MemberExpression')))) return stryMutAct_9fa48("717") ? true : (stryCov_9fa48("717"), false);
    const modifier = property(node, names);
    if (stryMutAct_9fa48("720") ? modifier === undefined && !MODIFIERS.has(modifier) : stryMutAct_9fa48("719") ? false : stryMutAct_9fa48("718") ? true : (stryCov_9fa48("718", "719", "720"), (stryMutAct_9fa48("722") ? modifier !== undefined : stryMutAct_9fa48("721") ? false : (stryCov_9fa48("721", "722"), modifier === undefined)) || (stryMutAct_9fa48("723") ? MODIFIERS.has(modifier) : (stryCov_9fa48("723"), !MODIFIERS.has(modifier))))) return stryMutAct_9fa48("724") ? true : (stryCov_9fa48("724"), false);
    const host = node[stryMutAct_9fa48("725") ? "" : (stryCov_9fa48("725"), 'object')];
    const name = stryMutAct_9fa48("726") ? identifier(host, names) && (isNode(host) ? identifier(host['object'], names) : undefined) : (stryCov_9fa48("726"), identifier(host, names) ?? (isNode(host) ? identifier(host[stryMutAct_9fa48("727") ? "" : (stryCov_9fa48("727"), 'object')], names) : undefined));
    return stryMutAct_9fa48("730") ? name !== undefined || RUNNERS.has(name) : stryMutAct_9fa48("729") ? false : stryMutAct_9fa48("728") ? true : (stryCov_9fa48("728", "729", "730"), (stryMutAct_9fa48("732") ? name === undefined : stryMutAct_9fa48("731") ? true : (stryCov_9fa48("731", "732"), name !== undefined)) && RUNNERS.has(name));
  }
}

/**
 * Whether an assignment target writes an element's markup.
 * @param target - the left-hand side, parentheses and all.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it is innerHTML or outerHTML.
 */
function writesMarkup(target: Field | undefined, names: Names): boolean {
  if (stryMutAct_9fa48("733")) {
    {}
  } else {
    stryCov_9fa48("733");
    const assigned = unwrap(target);
    if (stryMutAct_9fa48("736") ? !isNode(assigned) && assigned.type !== 'MemberExpression' : stryMutAct_9fa48("735") ? false : stryMutAct_9fa48("734") ? true : (stryCov_9fa48("734", "735", "736"), (stryMutAct_9fa48("737") ? isNode(assigned) : (stryCov_9fa48("737"), !isNode(assigned))) || (stryMutAct_9fa48("739") ? assigned.type === 'MemberExpression' : stryMutAct_9fa48("738") ? false : (stryCov_9fa48("738", "739"), assigned.type !== (stryMutAct_9fa48("740") ? "" : (stryCov_9fa48("740"), 'MemberExpression')))))) return stryMutAct_9fa48("741") ? true : (stryCov_9fa48("741"), false);
    const name = property(assigned, names);
    return stryMutAct_9fa48("744") ? name !== undefined || MARKUP_PROPERTIES.includes(name) : stryMutAct_9fa48("743") ? false : stryMutAct_9fa48("742") ? true : (stryCov_9fa48("742", "743", "744"), (stryMutAct_9fa48("746") ? name === undefined : stryMutAct_9fa48("745") ? true : (stryCov_9fa48("745", "746"), name !== undefined)) && MARKUP_PROPERTIES.includes(name));
  }
}

/**
 * Whether an assignment writes a member onto something's prototype, the
 * constructor-function expando pattern TypeScript 7 stopped checking.
 *
 * `Chart.prototype.draw = function () {}` is how a class was spelled before
 * classes: the checker no longer follows it, so every assignment through
 * `.prototype` is refused and the shape moves into a `class` declaration.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it is such an assignment.
 */
function expandoPrototype(node: Node, names: Names): boolean {
  if (stryMutAct_9fa48("747")) {
    {}
  } else {
    stryCov_9fa48("747");
    if (stryMutAct_9fa48("750") ? node.type === 'AssignmentExpression' : stryMutAct_9fa48("749") ? false : stryMutAct_9fa48("748") ? true : (stryCov_9fa48("748", "749", "750"), node.type !== (stryMutAct_9fa48("751") ? "" : (stryCov_9fa48("751"), 'AssignmentExpression')))) return stryMutAct_9fa48("752") ? true : (stryCov_9fa48("752"), false);
    const assigned = unwrap(node[stryMutAct_9fa48("753") ? "" : (stryCov_9fa48("753"), 'left')]);
    if (stryMutAct_9fa48("756") ? !isNode(assigned) && assigned.type !== 'MemberExpression' : stryMutAct_9fa48("755") ? false : stryMutAct_9fa48("754") ? true : (stryCov_9fa48("754", "755", "756"), (stryMutAct_9fa48("757") ? isNode(assigned) : (stryCov_9fa48("757"), !isNode(assigned))) || (stryMutAct_9fa48("759") ? assigned.type === 'MemberExpression' : stryMutAct_9fa48("758") ? false : (stryCov_9fa48("758", "759"), assigned.type !== (stryMutAct_9fa48("760") ? "" : (stryCov_9fa48("760"), 'MemberExpression')))))) return stryMutAct_9fa48("761") ? true : (stryCov_9fa48("761"), false);
    if (stryMutAct_9fa48("764") ? property(assigned, names) !== undefined : stryMutAct_9fa48("763") ? false : stryMutAct_9fa48("762") ? true : (stryCov_9fa48("762", "763", "764"), property(assigned, names) === undefined)) return stryMutAct_9fa48("765") ? true : (stryCov_9fa48("765"), false);
    const carrier = unwrap(assigned[stryMutAct_9fa48("766") ? "" : (stryCov_9fa48("766"), 'object')]);
    return stryMutAct_9fa48("769") ? isNode(carrier) && carrier.type === 'MemberExpression' || property(carrier, names) === 'prototype' : stryMutAct_9fa48("768") ? false : stryMutAct_9fa48("767") ? true : (stryCov_9fa48("767", "768", "769"), (stryMutAct_9fa48("771") ? isNode(carrier) || carrier.type === 'MemberExpression' : stryMutAct_9fa48("770") ? true : (stryCov_9fa48("770", "771"), isNode(carrier) && (stryMutAct_9fa48("773") ? carrier.type !== 'MemberExpression' : stryMutAct_9fa48("772") ? true : (stryCov_9fa48("772", "773"), carrier.type === (stryMutAct_9fa48("774") ? "" : (stryCov_9fa48("774"), 'MemberExpression')))))) && (stryMutAct_9fa48("776") ? property(carrier, names) !== 'prototype' : stryMutAct_9fa48("775") ? true : (stryCov_9fa48("775", "776"), property(carrier, names) === (stryMutAct_9fa48("777") ? "" : (stryCov_9fa48("777"), 'prototype')))));
  }
}

/**
 * Whether a node names the legacy prototype accessor, as a property or a key.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it does.
 */
function namesPrototype(node: Node, names: Names): boolean {
  if (stryMutAct_9fa48("778")) {
    {}
  } else {
    stryCov_9fa48("778");
    const name = stryMutAct_9fa48("779") ? "" : (stryCov_9fa48("779"), '__proto__');
    if (stryMutAct_9fa48("782") ? node.type !== 'MemberExpression' : stryMutAct_9fa48("781") ? false : stryMutAct_9fa48("780") ? true : (stryCov_9fa48("780", "781", "782"), node.type === (stryMutAct_9fa48("783") ? "" : (stryCov_9fa48("783"), 'MemberExpression')))) return stryMutAct_9fa48("786") ? property(node, names) === name && literalKey(node['property']) === name : stryMutAct_9fa48("785") ? false : stryMutAct_9fa48("784") ? true : (stryCov_9fa48("784", "785", "786"), (stryMutAct_9fa48("788") ? property(node, names) !== name : stryMutAct_9fa48("787") ? false : (stryCov_9fa48("787", "788"), property(node, names) === name)) || (stryMutAct_9fa48("790") ? literalKey(node['property']) !== name : stryMutAct_9fa48("789") ? false : (stryCov_9fa48("789", "790"), literalKey(node[stryMutAct_9fa48("791") ? "" : (stryCov_9fa48("791"), 'property')]) === name)));
    if (stryMutAct_9fa48("794") ? node.type !== 'Property' : stryMutAct_9fa48("793") ? false : stryMutAct_9fa48("792") ? true : (stryCov_9fa48("792", "793", "794"), node.type === (stryMutAct_9fa48("795") ? "" : (stryCov_9fa48("795"), 'Property')))) return stryMutAct_9fa48("798") ? identifier(node['key'], names) === name && literalKey(node['key']) === name : stryMutAct_9fa48("797") ? false : stryMutAct_9fa48("796") ? true : (stryCov_9fa48("796", "797", "798"), (stryMutAct_9fa48("800") ? identifier(node['key'], names) !== name : stryMutAct_9fa48("799") ? false : (stryCov_9fa48("799", "800"), identifier(node[stryMutAct_9fa48("801") ? "" : (stryCov_9fa48("801"), 'key')], names) === name)) || (stryMutAct_9fa48("803") ? literalKey(node['key']) !== name : stryMutAct_9fa48("802") ? false : (stryCov_9fa48("802", "803"), literalKey(node[stryMutAct_9fa48("804") ? "" : (stryCov_9fa48("804"), 'key')]) === name)));
    return stryMutAct_9fa48("805") ? true : (stryCov_9fa48("805"), false);
  }
}