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
import { type Field, isNode, type Node, unwrap } from './ast.ts';
import { staticString } from './fold.ts';
import { LEGACY_RULES } from './react-tauri-rules.ts';
import { callsGlobal, callsMethod, identifier, literalKey, type Names, property, type Rule } from './rule-helpers.ts';

/** Properties whose assignment replaces an element's markup. */
const MARKUP_PROPERTIES = stryMutAct_9fa48("305") ? [] : (stryCov_9fa48("305"), [stryMutAct_9fa48("306") ? "" : (stryCov_9fa48("306"), 'innerHTML'), stryMutAct_9fa48("307") ? "" : (stryCov_9fa48("307"), 'outerHTML')]);

/** The browser stores, which persist in the clear for anything that can read them. */
const WEB_STORES: ReadonlySet<string> = new Set(stryMutAct_9fa48("308") ? [] : (stryCov_9fa48("308"), [stryMutAct_9fa48("309") ? "" : (stryCov_9fa48("309"), 'localStorage'), stryMutAct_9fa48("310") ? "" : (stryCov_9fa48("310"), 'sessionStorage')]));

/** The objects a process reads its environment straight off. */
const ENVIRONMENTS: ReadonlySet<string> = new Set(stryMutAct_9fa48("311") ? [] : (stryCov_9fa48("311"), [stryMutAct_9fa48("312") ? "" : (stryCov_9fa48("312"), 'process'), stryMutAct_9fa48("313") ? "" : (stryCov_9fa48("313"), 'Bun')]));

/** The names the global object answers to. */
const GLOBALS: ReadonlySet<string> = new Set(stryMutAct_9fa48("314") ? [] : (stryCov_9fa48("314"), [stryMutAct_9fa48("315") ? "" : (stryCov_9fa48("315"), 'globalThis'), stryMutAct_9fa48("316") ? "" : (stryCov_9fa48("316"), 'window'), stryMutAct_9fa48("317") ? "" : (stryCov_9fa48("317"), 'self')]));

/** Test runners whose modifiers take a case out of the run. */
const RUNNERS = new Set(stryMutAct_9fa48("318") ? [] : (stryCov_9fa48("318"), [stryMutAct_9fa48("319") ? "" : (stryCov_9fa48("319"), 'it'), stryMutAct_9fa48("320") ? "" : (stryCov_9fa48("320"), 'test'), stryMutAct_9fa48("321") ? "" : (stryCov_9fa48("321"), 'describe')]));

/** Modifiers that stop a case reporting, or stop its siblings reporting. */
const MODIFIERS = new Set(stryMutAct_9fa48("322") ? [] : (stryCov_9fa48("322"), [stryMutAct_9fa48("323") ? "" : (stryCov_9fa48("323"), 'skip'), stryMutAct_9fa48("324") ? "" : (stryCov_9fa48("324"), 'only'), stryMutAct_9fa48("325") ? "" : (stryCov_9fa48("325"), 'todo'), stryMutAct_9fa48("326") ? "" : (stryCov_9fa48("326"), 'failing'), stryMutAct_9fa48("327") ? "" : (stryCov_9fa48("327"), 'skipIf'), stryMutAct_9fa48("328") ? "" : (stryCov_9fa48("328"), 'todoIf')]));

/** Idioms the project has moved past, stated about the tree. */
export const BANNED: readonly Rule[] = stryMutAct_9fa48("329") ? [] : (stryCov_9fa48("329"), [stryMutAct_9fa48("330") ? {} : (stryCov_9fa48("330"), {
  holds: stryMutAct_9fa48("331") ? () => undefined : (stryCov_9fa48("331"), node => stryMutAct_9fa48("334") ? node.type === 'VariableDeclaration' || node.kind === 'var' : stryMutAct_9fa48("333") ? false : stryMutAct_9fa48("332") ? true : (stryCov_9fa48("332", "333", "334"), (stryMutAct_9fa48("336") ? node.type !== 'VariableDeclaration' : stryMutAct_9fa48("335") ? true : (stryCov_9fa48("335", "336"), node.type === (stryMutAct_9fa48("337") ? "" : (stryCov_9fa48("337"), 'VariableDeclaration')))) && (stryMutAct_9fa48("339") ? node.kind !== 'var' : stryMutAct_9fa48("338") ? true : (stryCov_9fa48("338", "339"), node.kind === (stryMutAct_9fa48("340") ? "" : (stryCov_9fa48("340"), 'var')))))),
  why: stryMutAct_9fa48("341") ? "" : (stryCov_9fa48("341"), 'use const or let')
}), stryMutAct_9fa48("342") ? {} : (stryCov_9fa48("342"), {
  holds: stryMutAct_9fa48("343") ? () => undefined : (stryCov_9fa48("343"), (node, names) => callsGlobal(node, stryMutAct_9fa48("344") ? "" : (stryCov_9fa48("344"), 'require'), names)),
  why: stryMutAct_9fa48("345") ? "" : (stryCov_9fa48("345"), 'use ES module imports')
}), stryMutAct_9fa48("346") ? {} : (stryCov_9fa48("346"), {
  holds: stryMutAct_9fa48("347") ? () => undefined : (stryCov_9fa48("347"), (node, names) => callsGlobal(node, stryMutAct_9fa48("348") ? "" : (stryCov_9fa48("348"), 'eval'), names)),
  why: stryMutAct_9fa48("349") ? "" : (stryCov_9fa48("349"), 'eval executes text as code; call the function directly')
}), stryMutAct_9fa48("350") ? {} : (stryCov_9fa48("350"), {
  holds: stryMutAct_9fa48("351") ? () => undefined : (stryCov_9fa48("351"), node => stryMutAct_9fa48("354") ? node.type !== 'WithStatement' : stryMutAct_9fa48("353") ? false : stryMutAct_9fa48("352") ? true : (stryCov_9fa48("352", "353", "354"), node.type === (stryMutAct_9fa48("355") ? "" : (stryCov_9fa48("355"), 'WithStatement')))),
  why: stryMutAct_9fa48("356") ? "" : (stryCov_9fa48("356"), 'with is forbidden in strict mode; name the object')
}), stryMutAct_9fa48("357") ? {} : (stryCov_9fa48("357"), {
  holds: stryMutAct_9fa48("358") ? () => undefined : (stryCov_9fa48("358"), (node, names) => stryMutAct_9fa48("361") ? node.type === 'AssignmentExpression' && writesMarkup(node.left, names) && writesProperty(node, MARKUP_PROPERTIES, names) : stryMutAct_9fa48("360") ? false : stryMutAct_9fa48("359") ? true : (stryCov_9fa48("359", "360", "361"), (stryMutAct_9fa48("363") ? node.type === 'AssignmentExpression' || writesMarkup(node.left, names) : stryMutAct_9fa48("362") ? false : (stryCov_9fa48("362", "363"), (stryMutAct_9fa48("365") ? node.type !== 'AssignmentExpression' : stryMutAct_9fa48("364") ? true : (stryCov_9fa48("364", "365"), node.type === (stryMutAct_9fa48("366") ? "" : (stryCov_9fa48("366"), 'AssignmentExpression')))) && writesMarkup(node.left, names))) || writesProperty(node, MARKUP_PROPERTIES, names))),
  why: stryMutAct_9fa48("367") ? "" : (stryCov_9fa48("367"), 'use textContent, or insertAdjacentHTML with markup this repository does not author')
}), stryMutAct_9fa48("368") ? {} : (stryCov_9fa48("368"), {
  holds: stryMutAct_9fa48("369") ? () => undefined : (stryCov_9fa48("369"), (node, names) => callsMethod(node, stryMutAct_9fa48("370") ? "" : (stryCov_9fa48("370"), 'document'), stryMutAct_9fa48("371") ? [] : (stryCov_9fa48("371"), [stryMutAct_9fa48("372") ? "" : (stryCov_9fa48("372"), 'write'), stryMutAct_9fa48("373") ? "" : (stryCov_9fa48("373"), 'writeln')]), names)),
  why: stryMutAct_9fa48("374") ? "" : (stryCov_9fa48("374"), 'document.write is removed from modern engines')
}), stryMutAct_9fa48("375") ? {} : (stryCov_9fa48("375"), {
  holds: stryMutAct_9fa48("376") ? () => undefined : (stryCov_9fa48("376"), (node, names) => readsCarrier(node, WEB_STORES, names)),
  why: stryMutAct_9fa48("377") ? "" : (stryCov_9fa48("377"), 'the browser stores keep their contents in the clear for anything that can reach the page; a paired host, its grants and its tokens belong to the native side')
}), stryMutAct_9fa48("378") ? {} : (stryCov_9fa48("378"), {
  holds: stryMutAct_9fa48("379") ? () => undefined : (stryCov_9fa48("379"), (node, names) => readsEnvironment(node, names)),
  why: stryMutAct_9fa48("380") ? "" : (stryCov_9fa48("380"), 'reading the environment here scatters configuration across the tree; take it through the module that already resolves it')
}), stryMutAct_9fa48("381") ? {} : (stryCov_9fa48("381"), {
  holds: stryMutAct_9fa48("382") ? () => undefined : (stryCov_9fa48("382"), (node, names) => stryMutAct_9fa48("385") ? node.type === 'MemberExpression' || property(node, names) === 'substr' : stryMutAct_9fa48("384") ? false : stryMutAct_9fa48("383") ? true : (stryCov_9fa48("383", "384", "385"), (stryMutAct_9fa48("387") ? node.type !== 'MemberExpression' : stryMutAct_9fa48("386") ? true : (stryCov_9fa48("386", "387"), node.type === (stryMutAct_9fa48("388") ? "" : (stryCov_9fa48("388"), 'MemberExpression')))) && (stryMutAct_9fa48("390") ? property(node, names) !== 'substr' : stryMutAct_9fa48("389") ? true : (stryCov_9fa48("389", "390"), property(node, names) === (stryMutAct_9fa48("391") ? "" : (stryCov_9fa48("391"), 'substr')))))),
  why: stryMutAct_9fa48("392") ? "" : (stryCov_9fa48("392"), 'String.prototype.substr is deprecated; use slice')
}), stryMutAct_9fa48("393") ? {} : (stryCov_9fa48("393"), {
  holds: stryMutAct_9fa48("394") ? () => undefined : (stryCov_9fa48("394"), (node, names) => stryMutAct_9fa48("397") ? node.type === 'NewExpression' && identifier(node.callee, names) === 'Array' && reflectsConstruct(node, 'Array', names) : stryMutAct_9fa48("396") ? false : stryMutAct_9fa48("395") ? true : (stryCov_9fa48("395", "396", "397"), (stryMutAct_9fa48("399") ? node.type === 'NewExpression' || identifier(node.callee, names) === 'Array' : stryMutAct_9fa48("398") ? false : (stryCov_9fa48("398", "399"), (stryMutAct_9fa48("401") ? node.type !== 'NewExpression' : stryMutAct_9fa48("400") ? true : (stryCov_9fa48("400", "401"), node.type === (stryMutAct_9fa48("402") ? "" : (stryCov_9fa48("402"), 'NewExpression')))) && (stryMutAct_9fa48("404") ? identifier(node.callee, names) !== 'Array' : stryMutAct_9fa48("403") ? true : (stryCov_9fa48("403", "404"), identifier(node.callee, names) === (stryMutAct_9fa48("405") ? "" : (stryCov_9fa48("405"), 'Array')))))) || reflectsConstruct(node, stryMutAct_9fa48("406") ? "" : (stryCov_9fa48("406"), 'Array'), names))),
  why: stryMutAct_9fa48("407") ? "" : (stryCov_9fa48("407"), 'use an array literal or Array.from')
}), stryMutAct_9fa48("408") ? {} : (stryCov_9fa48("408"), {
  holds: stryMutAct_9fa48("409") ? () => undefined : (stryCov_9fa48("409"), (node, names) => stryMutAct_9fa48("412") ? callsGlobal(node, 'escape', names) && callsGlobal(node, 'unescape', names) : stryMutAct_9fa48("411") ? false : stryMutAct_9fa48("410") ? true : (stryCov_9fa48("410", "411", "412"), callsGlobal(node, stryMutAct_9fa48("413") ? "" : (stryCov_9fa48("413"), 'escape'), names) || callsGlobal(node, stryMutAct_9fa48("414") ? "" : (stryCov_9fa48("414"), 'unescape'), names))),
  why: stryMutAct_9fa48("415") ? "" : (stryCov_9fa48("415"), 'the global escape and unescape are deprecated; use encodeURIComponent, or CSS.escape for a selector')
}), stryMutAct_9fa48("416") ? {} : (stryCov_9fa48("416"), {
  holds: stryMutAct_9fa48("417") ? () => undefined : (stryCov_9fa48("417"), (node, names) => runsTextAsCode(node, names)),
  why: stryMutAct_9fa48("418") ? "" : (stryCov_9fa48("418"), 'a timer called with text runs the text as code; pass a function')
}), stryMutAct_9fa48("419") ? {} : (stryCov_9fa48("419"), {
  holds: stryMutAct_9fa48("420") ? () => undefined : (stryCov_9fa48("420"), (node, names) => namesPrototype(node, names)),
  why: stryMutAct_9fa48("421") ? "" : (stryCov_9fa48("421"), 'use Object.getPrototypeOf or Object.create')
}), stryMutAct_9fa48("422") ? {} : (stryCov_9fa48("422"), {
  holds: stryMutAct_9fa48("423") ? () => undefined : (stryCov_9fa48("423"), node => stryMutAct_9fa48("426") ? node.type !== 'TSAnyKeyword' : stryMutAct_9fa48("425") ? false : stryMutAct_9fa48("424") ? true : (stryCov_9fa48("424", "425", "426"), node.type === (stryMutAct_9fa48("427") ? "" : (stryCov_9fa48("427"), 'TSAnyKeyword')))),
  why: stryMutAct_9fa48("428") ? "" : (stryCov_9fa48("428"), 'any defeats the type system; name the shape')
}), stryMutAct_9fa48("429") ? {} : (stryCov_9fa48("429"), {
  holds: stryMutAct_9fa48("430") ? () => undefined : (stryCov_9fa48("430"), (node, names) => skipsTest(node, names)),
  why: stryMutAct_9fa48("431") ? "" : (stryCov_9fa48("431"), 'a test that is skipped, focused or expected to fail is a test that does not report')
}), stryMutAct_9fa48("432") ? {} : (stryCov_9fa48("432"), {
  holds: stryMutAct_9fa48("433") ? () => undefined : (stryCov_9fa48("433"), node => stryMutAct_9fa48("436") ? node.type !== 'TSNonNullExpression' : stryMutAct_9fa48("435") ? false : stryMutAct_9fa48("434") ? true : (stryCov_9fa48("434", "435", "436"), node.type === (stryMutAct_9fa48("437") ? "" : (stryCov_9fa48("437"), 'TSNonNullExpression')))),
  why: stryMutAct_9fa48("438") ? "" : (stryCov_9fa48("438"), 'a non-null assertion overrides the checker; narrow the value or handle the absent case')
}), stryMutAct_9fa48("439") ? {} : (stryCov_9fa48("439"), {
  holds: stryMutAct_9fa48("440") ? () => undefined : (stryCov_9fa48("440"), node => stryMutAct_9fa48("443") ? node.type !== 'TSImportEqualsDeclaration' : stryMutAct_9fa48("442") ? false : stryMutAct_9fa48("441") ? true : (stryCov_9fa48("441", "442", "443"), node.type === (stryMutAct_9fa48("444") ? "" : (stryCov_9fa48("444"), 'TSImportEqualsDeclaration')))),
  why: stryMutAct_9fa48("445") ? "" : (stryCov_9fa48("445"), 'import-equals is TypeScript 6 syntax; use a default import or `import type`')
}), stryMutAct_9fa48("446") ? {} : (stryCov_9fa48("446"), {
  holds: stryMutAct_9fa48("447") ? () => undefined : (stryCov_9fa48("447"), node => stryMutAct_9fa48("450") ? node.type === 'TSModuleDeclaration' && isNode(node.id) && node.id.type === 'Identifier' || node.id.name !== 'global' : stryMutAct_9fa48("449") ? false : stryMutAct_9fa48("448") ? true : (stryCov_9fa48("448", "449", "450"), (stryMutAct_9fa48("452") ? node.type === 'TSModuleDeclaration' && isNode(node.id) || node.id.type === 'Identifier' : stryMutAct_9fa48("451") ? true : (stryCov_9fa48("451", "452"), (stryMutAct_9fa48("454") ? node.type === 'TSModuleDeclaration' || isNode(node.id) : stryMutAct_9fa48("453") ? true : (stryCov_9fa48("453", "454"), (stryMutAct_9fa48("456") ? node.type !== 'TSModuleDeclaration' : stryMutAct_9fa48("455") ? true : (stryCov_9fa48("455", "456"), node.type === (stryMutAct_9fa48("457") ? "" : (stryCov_9fa48("457"), 'TSModuleDeclaration')))) && isNode(node.id))) && (stryMutAct_9fa48("459") ? node.id.type !== 'Identifier' : stryMutAct_9fa48("458") ? true : (stryCov_9fa48("458", "459"), node.id.type === (stryMutAct_9fa48("460") ? "" : (stryCov_9fa48("460"), 'Identifier')))))) && (stryMutAct_9fa48("462") ? node.id.name === 'global' : stryMutAct_9fa48("461") ? true : (stryCov_9fa48("461", "462"), node.id.name !== (stryMutAct_9fa48("463") ? "" : (stryCov_9fa48("463"), 'global')))))),
  why: stryMutAct_9fa48("464") ? "" : (stryCov_9fa48("464"), 'a namespace is a TypeScript 6 module system; use ES module exports')
}), stryMutAct_9fa48("465") ? {} : (stryCov_9fa48("465"), {
  holds: stryMutAct_9fa48("466") ? () => undefined : (stryCov_9fa48("466"), (node, names) => expandoPrototype(node, names)),
  why: stryMutAct_9fa48("467") ? "" : (stryCov_9fa48("467"), 'the constructor-function expando pattern was removed in TypeScript 7; use a class')
}), ...LEGACY_RULES]);

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
  if (stryMutAct_9fa48("468")) {
    {}
  } else {
    stryCov_9fa48("468");
    const timer = stryMutAct_9fa48("471") ? callsGlobal(node, 'setTimeout', names) && callsGlobal(node, 'setInterval', names) : stryMutAct_9fa48("470") ? false : stryMutAct_9fa48("469") ? true : (stryCov_9fa48("469", "470", "471"), callsGlobal(node, stryMutAct_9fa48("472") ? "" : (stryCov_9fa48("472"), 'setTimeout'), names) || callsGlobal(node, stryMutAct_9fa48("473") ? "" : (stryCov_9fa48("473"), 'setInterval'), names));
    if (stryMutAct_9fa48("476") ? false : stryMutAct_9fa48("475") ? true : stryMutAct_9fa48("474") ? timer : (stryCov_9fa48("474", "475", "476"), !timer)) return stryMutAct_9fa48("477") ? true : (stryCov_9fa48("477"), false);
    const args = node.arguments;
    if (stryMutAct_9fa48("480") ? false : stryMutAct_9fa48("479") ? true : stryMutAct_9fa48("478") ? Array.isArray(args) : (stryCov_9fa48("478", "479", "480"), !Array.isArray(args))) return stryMutAct_9fa48("481") ? true : (stryCov_9fa48("481"), false);
    return stryMutAct_9fa48("484") ? staticString(names.constants, args[0]) === undefined : stryMutAct_9fa48("483") ? false : stryMutAct_9fa48("482") ? true : (stryCov_9fa48("482", "483", "484"), staticString(names.constants, args[0]) !== undefined);
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
  if (stryMutAct_9fa48("485")) {
    {}
  } else {
    stryCov_9fa48("485");
    if (stryMutAct_9fa48("488") ? false : stryMutAct_9fa48("487") ? true : stryMutAct_9fa48("486") ? callsMethod(node, 'Reflect', ['construct'], names) : (stryCov_9fa48("486", "487", "488"), !callsMethod(node, stryMutAct_9fa48("489") ? "" : (stryCov_9fa48("489"), 'Reflect'), stryMutAct_9fa48("490") ? [] : (stryCov_9fa48("490"), [stryMutAct_9fa48("491") ? "" : (stryCov_9fa48("491"), 'construct')]), names))) return stryMutAct_9fa48("492") ? true : (stryCov_9fa48("492"), false);
    const args = node.arguments;
    return stryMutAct_9fa48("495") ? Array.isArray(args) || identifier(args[0], names) === target : stryMutAct_9fa48("494") ? false : stryMutAct_9fa48("493") ? true : (stryCov_9fa48("493", "494", "495"), Array.isArray(args) && (stryMutAct_9fa48("497") ? identifier(args[0], names) !== target : stryMutAct_9fa48("496") ? true : (stryCov_9fa48("496", "497"), identifier(args[0], names) === target)));
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
  if (stryMutAct_9fa48("498")) {
    {}
  } else {
    stryCov_9fa48("498");
    const args = node.arguments;
    if (stryMutAct_9fa48("501") ? false : stryMutAct_9fa48("500") ? true : stryMutAct_9fa48("499") ? Array.isArray(args) : (stryCov_9fa48("499", "500", "501"), !Array.isArray(args))) return stryMutAct_9fa48("502") ? true : (stryCov_9fa48("502"), false);
    if (stryMutAct_9fa48("505") ? callsMethod(node, 'Reflect', ['set', 'defineProperty'], names) && callsMethod(node, 'Object', ['defineProperty'], names) : stryMutAct_9fa48("504") ? false : stryMutAct_9fa48("503") ? true : (stryCov_9fa48("503", "504", "505"), callsMethod(node, stryMutAct_9fa48("506") ? "" : (stryCov_9fa48("506"), 'Reflect'), stryMutAct_9fa48("507") ? [] : (stryCov_9fa48("507"), [stryMutAct_9fa48("508") ? "" : (stryCov_9fa48("508"), 'set'), stryMutAct_9fa48("509") ? "" : (stryCov_9fa48("509"), 'defineProperty')]), names) || callsMethod(node, stryMutAct_9fa48("510") ? "" : (stryCov_9fa48("510"), 'Object'), stryMutAct_9fa48("511") ? [] : (stryCov_9fa48("511"), [stryMutAct_9fa48("512") ? "" : (stryCov_9fa48("512"), 'defineProperty')]), names))) {
      if (stryMutAct_9fa48("513")) {
        {}
      } else {
        stryCov_9fa48("513");
        const key = staticString(names.constants, args[1]);
        return stryMutAct_9fa48("516") ? key !== undefined || wanted.includes(key) : stryMutAct_9fa48("515") ? false : stryMutAct_9fa48("514") ? true : (stryCov_9fa48("514", "515", "516"), (stryMutAct_9fa48("518") ? key === undefined : stryMutAct_9fa48("517") ? true : (stryCov_9fa48("517", "518"), key !== undefined)) && wanted.includes(key));
      }
    }
    if (stryMutAct_9fa48("521") ? false : stryMutAct_9fa48("520") ? true : stryMutAct_9fa48("519") ? callsMethod(node, 'Object', ['assign', 'defineProperties'], names) : (stryCov_9fa48("519", "520", "521"), !callsMethod(node, stryMutAct_9fa48("522") ? "" : (stryCov_9fa48("522"), 'Object'), stryMutAct_9fa48("523") ? [] : (stryCov_9fa48("523"), [stryMutAct_9fa48("524") ? "" : (stryCov_9fa48("524"), 'assign'), stryMutAct_9fa48("525") ? "" : (stryCov_9fa48("525"), 'defineProperties')]), names))) return stryMutAct_9fa48("526") ? true : (stryCov_9fa48("526"), false);
    return stryMutAct_9fa48("528") ? args.some(argument => mergesKey(argument, wanted, names)) : stryMutAct_9fa48("527") ? args.slice(1).every(argument => mergesKey(argument, wanted, names)) : (stryCov_9fa48("527", "528"), args.slice(1).some(stryMutAct_9fa48("529") ? () => undefined : (stryCov_9fa48("529"), argument => mergesKey(argument, wanted, names))));
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
  if (stryMutAct_9fa48("530")) {
    {}
  } else {
    stryCov_9fa48("530");
    const argument = unwrap(merged);
    if (stryMutAct_9fa48("533") ? !isNode(argument) && argument.type !== 'ObjectExpression' : stryMutAct_9fa48("532") ? false : stryMutAct_9fa48("531") ? true : (stryCov_9fa48("531", "532", "533"), (stryMutAct_9fa48("534") ? isNode(argument) : (stryCov_9fa48("534"), !isNode(argument))) || (stryMutAct_9fa48("536") ? argument.type === 'ObjectExpression' : stryMutAct_9fa48("535") ? false : (stryCov_9fa48("535", "536"), argument.type !== (stryMutAct_9fa48("537") ? "" : (stryCov_9fa48("537"), 'ObjectExpression')))))) return stryMutAct_9fa48("538") ? true : (stryCov_9fa48("538"), false);
    const properties = argument.properties;
    if (stryMutAct_9fa48("541") ? false : stryMutAct_9fa48("540") ? true : stryMutAct_9fa48("539") ? Array.isArray(properties) : (stryCov_9fa48("539", "540", "541"), !Array.isArray(properties))) return stryMutAct_9fa48("542") ? true : (stryCov_9fa48("542"), false);
    return stryMutAct_9fa48("543") ? properties.every(property_ => {
      if (!isNode(property_) || property_.type !== 'Property') return false;
      const key = property_.computed === true ? staticString(names.constants, property_.key) : identifier(property_.key, names) ?? literalKey(property_.key);
      return key !== undefined && wanted.includes(key);
    }) : (stryCov_9fa48("543"), properties.some(property_ => {
      if (stryMutAct_9fa48("544")) {
        {}
      } else {
        stryCov_9fa48("544");
        if (stryMutAct_9fa48("547") ? !isNode(property_) && property_.type !== 'Property' : stryMutAct_9fa48("546") ? false : stryMutAct_9fa48("545") ? true : (stryCov_9fa48("545", "546", "547"), (stryMutAct_9fa48("548") ? isNode(property_) : (stryCov_9fa48("548"), !isNode(property_))) || (stryMutAct_9fa48("550") ? property_.type === 'Property' : stryMutAct_9fa48("549") ? false : (stryCov_9fa48("549", "550"), property_.type !== (stryMutAct_9fa48("551") ? "" : (stryCov_9fa48("551"), 'Property')))))) return stryMutAct_9fa48("552") ? true : (stryCov_9fa48("552"), false);
        const key = (stryMutAct_9fa48("555") ? property_.computed !== true : stryMutAct_9fa48("554") ? false : stryMutAct_9fa48("553") ? true : (stryCov_9fa48("553", "554", "555"), property_.computed === (stryMutAct_9fa48("556") ? false : (stryCov_9fa48("556"), true)))) ? staticString(names.constants, property_.key) : stryMutAct_9fa48("557") ? identifier(property_.key, names) && literalKey(property_.key) : (stryCov_9fa48("557"), identifier(property_.key, names) ?? literalKey(property_.key));
        return stryMutAct_9fa48("560") ? key !== undefined || wanted.includes(key) : stryMutAct_9fa48("559") ? false : stryMutAct_9fa48("558") ? true : (stryCov_9fa48("558", "559", "560"), (stryMutAct_9fa48("562") ? key === undefined : stryMutAct_9fa48("561") ? true : (stryCov_9fa48("561", "562"), key !== undefined)) && wanted.includes(key));
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
  if (stryMutAct_9fa48("563")) {
    {}
  } else {
    stryCov_9fa48("563");
    if (stryMutAct_9fa48("566") ? node.type === 'MemberExpression' : stryMutAct_9fa48("565") ? false : stryMutAct_9fa48("564") ? true : (stryCov_9fa48("564", "565", "566"), node.type !== (stryMutAct_9fa48("567") ? "" : (stryCov_9fa48("567"), 'MemberExpression')))) return stryMutAct_9fa48("568") ? true : (stryCov_9fa48("568"), false);
    const modifier = property(node, names);
    if (stryMutAct_9fa48("571") ? modifier === undefined && !MODIFIERS.has(modifier) : stryMutAct_9fa48("570") ? false : stryMutAct_9fa48("569") ? true : (stryCov_9fa48("569", "570", "571"), (stryMutAct_9fa48("573") ? modifier !== undefined : stryMutAct_9fa48("572") ? false : (stryCov_9fa48("572", "573"), modifier === undefined)) || (stryMutAct_9fa48("574") ? MODIFIERS.has(modifier) : (stryCov_9fa48("574"), !MODIFIERS.has(modifier))))) return stryMutAct_9fa48("575") ? true : (stryCov_9fa48("575"), false);
    const host = node.object;
    const name = stryMutAct_9fa48("576") ? identifier(host, names) && (isNode(host) ? identifier(host.object, names) : undefined) : (stryCov_9fa48("576"), identifier(host, names) ?? (isNode(host) ? identifier(host.object, names) : undefined));
    return stryMutAct_9fa48("579") ? name !== undefined || RUNNERS.has(name) : stryMutAct_9fa48("578") ? false : stryMutAct_9fa48("577") ? true : (stryCov_9fa48("577", "578", "579"), (stryMutAct_9fa48("581") ? name === undefined : stryMutAct_9fa48("580") ? true : (stryCov_9fa48("580", "581"), name !== undefined)) && RUNNERS.has(name));
  }
}

/**
 * Whether an assignment target writes an element's markup.
 * @param target - the left-hand side, parentheses and all.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it is innerHTML or outerHTML.
 */
function writesMarkup(target: Field | undefined, names: Names): boolean {
  if (stryMutAct_9fa48("582")) {
    {}
  } else {
    stryCov_9fa48("582");
    const assigned = unwrap(target);
    if (stryMutAct_9fa48("585") ? !isNode(assigned) && assigned.type !== 'MemberExpression' : stryMutAct_9fa48("584") ? false : stryMutAct_9fa48("583") ? true : (stryCov_9fa48("583", "584", "585"), (stryMutAct_9fa48("586") ? isNode(assigned) : (stryCov_9fa48("586"), !isNode(assigned))) || (stryMutAct_9fa48("588") ? assigned.type === 'MemberExpression' : stryMutAct_9fa48("587") ? false : (stryCov_9fa48("587", "588"), assigned.type !== (stryMutAct_9fa48("589") ? "" : (stryCov_9fa48("589"), 'MemberExpression')))))) return stryMutAct_9fa48("590") ? true : (stryCov_9fa48("590"), false);
    const name = property(assigned, names);
    return stryMutAct_9fa48("593") ? name !== undefined || MARKUP_PROPERTIES.includes(name) : stryMutAct_9fa48("592") ? false : stryMutAct_9fa48("591") ? true : (stryCov_9fa48("591", "592", "593"), (stryMutAct_9fa48("595") ? name === undefined : stryMutAct_9fa48("594") ? true : (stryCov_9fa48("594", "595"), name !== undefined)) && MARKUP_PROPERTIES.includes(name));
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
  if (stryMutAct_9fa48("596")) {
    {}
  } else {
    stryCov_9fa48("596");
    if (stryMutAct_9fa48("599") ? node.type === 'AssignmentExpression' : stryMutAct_9fa48("598") ? false : stryMutAct_9fa48("597") ? true : (stryCov_9fa48("597", "598", "599"), node.type !== (stryMutAct_9fa48("600") ? "" : (stryCov_9fa48("600"), 'AssignmentExpression')))) return stryMutAct_9fa48("601") ? true : (stryCov_9fa48("601"), false);
    const assigned = unwrap(node.left);
    if (stryMutAct_9fa48("604") ? !isNode(assigned) && assigned.type !== 'MemberExpression' : stryMutAct_9fa48("603") ? false : stryMutAct_9fa48("602") ? true : (stryCov_9fa48("602", "603", "604"), (stryMutAct_9fa48("605") ? isNode(assigned) : (stryCov_9fa48("605"), !isNode(assigned))) || (stryMutAct_9fa48("607") ? assigned.type === 'MemberExpression' : stryMutAct_9fa48("606") ? false : (stryCov_9fa48("606", "607"), assigned.type !== (stryMutAct_9fa48("608") ? "" : (stryCov_9fa48("608"), 'MemberExpression')))))) return stryMutAct_9fa48("609") ? true : (stryCov_9fa48("609"), false);
    if (stryMutAct_9fa48("612") ? property(assigned, names) !== undefined : stryMutAct_9fa48("611") ? false : stryMutAct_9fa48("610") ? true : (stryCov_9fa48("610", "611", "612"), property(assigned, names) === undefined)) return stryMutAct_9fa48("613") ? true : (stryCov_9fa48("613"), false);
    const carrier = unwrap(assigned.object);
    return stryMutAct_9fa48("616") ? isNode(carrier) && carrier.type === 'MemberExpression' || property(carrier, names) === 'prototype' : stryMutAct_9fa48("615") ? false : stryMutAct_9fa48("614") ? true : (stryCov_9fa48("614", "615", "616"), (stryMutAct_9fa48("618") ? isNode(carrier) || carrier.type === 'MemberExpression' : stryMutAct_9fa48("617") ? true : (stryCov_9fa48("617", "618"), isNode(carrier) && (stryMutAct_9fa48("620") ? carrier.type !== 'MemberExpression' : stryMutAct_9fa48("619") ? true : (stryCov_9fa48("619", "620"), carrier.type === (stryMutAct_9fa48("621") ? "" : (stryCov_9fa48("621"), 'MemberExpression')))))) && (stryMutAct_9fa48("623") ? property(carrier, names) !== 'prototype' : stryMutAct_9fa48("622") ? true : (stryCov_9fa48("622", "623"), property(carrier, names) === (stryMutAct_9fa48("624") ? "" : (stryCov_9fa48("624"), 'prototype')))));
  }
}

/**
 * Whether a member expression reads one of the named carriers, reached
 * directly or through the global object.
 *
 * Both spellings are one access: `localStorage.setItem` and
 * `window.localStorage.setItem` reach the same store, and a rule that read only
 * the bare name refused the first while letting the second through.
 * @param node - the node to test.
 * @param carriers - the carrier names to refuse.
 * @param names - what this file renamed and holds in constants.
 * @returns true when the node reads one of them.
 */
function readsCarrier(node: Node, carriers: ReadonlySet<string>, names: Names): boolean {
  if (stryMutAct_9fa48("625")) {
    {}
  } else {
    stryCov_9fa48("625");
    if (stryMutAct_9fa48("628") ? node.type === 'MemberExpression' : stryMutAct_9fa48("627") ? false : stryMutAct_9fa48("626") ? true : (stryCov_9fa48("626", "627", "628"), node.type !== (stryMutAct_9fa48("629") ? "" : (stryCov_9fa48("629"), 'MemberExpression')))) return stryMutAct_9fa48("630") ? true : (stryCov_9fa48("630"), false);
    const direct = identifier(node.object, names);
    if (stryMutAct_9fa48("633") ? direct !== undefined || carriers.has(direct) : stryMutAct_9fa48("632") ? false : stryMutAct_9fa48("631") ? true : (stryCov_9fa48("631", "632", "633"), (stryMutAct_9fa48("635") ? direct === undefined : stryMutAct_9fa48("634") ? true : (stryCov_9fa48("634", "635"), direct !== undefined)) && carriers.has(direct))) return stryMutAct_9fa48("636") ? false : (stryCov_9fa48("636"), true);
    const carrier = unwrap(node.object);
    if (stryMutAct_9fa48("639") ? !isNode(carrier) && carrier.type !== 'MemberExpression' : stryMutAct_9fa48("638") ? false : stryMutAct_9fa48("637") ? true : (stryCov_9fa48("637", "638", "639"), (stryMutAct_9fa48("640") ? isNode(carrier) : (stryCov_9fa48("640"), !isNode(carrier))) || (stryMutAct_9fa48("642") ? carrier.type === 'MemberExpression' : stryMutAct_9fa48("641") ? false : (stryCov_9fa48("641", "642"), carrier.type !== (stryMutAct_9fa48("643") ? "" : (stryCov_9fa48("643"), 'MemberExpression')))))) return stryMutAct_9fa48("644") ? true : (stryCov_9fa48("644"), false);
    const host = identifier(carrier.object, names);
    const reached = property(carrier, names);
    return stryMutAct_9fa48("647") ? host !== undefined && GLOBALS.has(host) && reached !== undefined || carriers.has(reached) : stryMutAct_9fa48("646") ? false : stryMutAct_9fa48("645") ? true : (stryCov_9fa48("645", "646", "647"), (stryMutAct_9fa48("649") ? host !== undefined && GLOBALS.has(host) || reached !== undefined : stryMutAct_9fa48("648") ? true : (stryCov_9fa48("648", "649"), (stryMutAct_9fa48("651") ? host !== undefined || GLOBALS.has(host) : stryMutAct_9fa48("650") ? true : (stryCov_9fa48("650", "651"), (stryMutAct_9fa48("653") ? host === undefined : stryMutAct_9fa48("652") ? true : (stryCov_9fa48("652", "653"), host !== undefined)) && GLOBALS.has(host))) && (stryMutAct_9fa48("655") ? reached === undefined : stryMutAct_9fa48("654") ? true : (stryCov_9fa48("654", "655"), reached !== undefined)))) && carriers.has(reached));
  }
}

/**
 * Whether a node reads a process environment directly.
 *
 * `process.env` and `Bun.env` are the runtime's, `import.meta.env` is the
 * bundler's; all three put a configuration decision wherever they are written
 * rather than in the one place that resolves it.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when the node reads an environment.
 */
function readsEnvironment(node: Node, names: Names): boolean {
  if (stryMutAct_9fa48("656")) {
    {}
  } else {
    stryCov_9fa48("656");
    if (stryMutAct_9fa48("659") ? node.type !== 'MemberExpression' && property(node, names) !== 'env' : stryMutAct_9fa48("658") ? false : stryMutAct_9fa48("657") ? true : (stryCov_9fa48("657", "658", "659"), (stryMutAct_9fa48("661") ? node.type === 'MemberExpression' : stryMutAct_9fa48("660") ? false : (stryCov_9fa48("660", "661"), node.type !== (stryMutAct_9fa48("662") ? "" : (stryCov_9fa48("662"), 'MemberExpression')))) || (stryMutAct_9fa48("664") ? property(node, names) === 'env' : stryMutAct_9fa48("663") ? false : (stryCov_9fa48("663", "664"), property(node, names) !== (stryMutAct_9fa48("665") ? "" : (stryCov_9fa48("665"), 'env')))))) return stryMutAct_9fa48("666") ? true : (stryCov_9fa48("666"), false);
    const host = identifier(node.object, names);
    if (stryMutAct_9fa48("669") ? host !== undefined || ENVIRONMENTS.has(host) : stryMutAct_9fa48("668") ? false : stryMutAct_9fa48("667") ? true : (stryCov_9fa48("667", "668", "669"), (stryMutAct_9fa48("671") ? host === undefined : stryMutAct_9fa48("670") ? true : (stryCov_9fa48("670", "671"), host !== undefined)) && ENVIRONMENTS.has(host))) return stryMutAct_9fa48("672") ? false : (stryCov_9fa48("672"), true);
    const meta = unwrap(node.object);
    return stryMutAct_9fa48("675") ? isNode(meta) || meta.type === 'MetaProperty' : stryMutAct_9fa48("674") ? false : stryMutAct_9fa48("673") ? true : (stryCov_9fa48("673", "674", "675"), isNode(meta) && (stryMutAct_9fa48("677") ? meta.type !== 'MetaProperty' : stryMutAct_9fa48("676") ? true : (stryCov_9fa48("676", "677"), meta.type === (stryMutAct_9fa48("678") ? "" : (stryCov_9fa48("678"), 'MetaProperty')))));
  }
}

/**
 * Whether a node names the legacy prototype accessor, as a property or a key.
 * @param node - the node to test.
 * @param names - what this file renamed and holds in constants.
 * @returns true when it does.
 */
function namesPrototype(node: Node, names: Names): boolean {
  if (stryMutAct_9fa48("679")) {
    {}
  } else {
    stryCov_9fa48("679");
    const name = stryMutAct_9fa48("680") ? "" : (stryCov_9fa48("680"), '__proto__');
    if (stryMutAct_9fa48("683") ? node.type !== 'MemberExpression' : stryMutAct_9fa48("682") ? false : stryMutAct_9fa48("681") ? true : (stryCov_9fa48("681", "682", "683"), node.type === (stryMutAct_9fa48("684") ? "" : (stryCov_9fa48("684"), 'MemberExpression')))) return stryMutAct_9fa48("687") ? property(node, names) === name && literalKey(node.property) === name : stryMutAct_9fa48("686") ? false : stryMutAct_9fa48("685") ? true : (stryCov_9fa48("685", "686", "687"), (stryMutAct_9fa48("689") ? property(node, names) !== name : stryMutAct_9fa48("688") ? false : (stryCov_9fa48("688", "689"), property(node, names) === name)) || (stryMutAct_9fa48("691") ? literalKey(node.property) !== name : stryMutAct_9fa48("690") ? false : (stryCov_9fa48("690", "691"), literalKey(node.property) === name)));
    if (stryMutAct_9fa48("694") ? node.type !== 'Property' : stryMutAct_9fa48("693") ? false : stryMutAct_9fa48("692") ? true : (stryCov_9fa48("692", "693", "694"), node.type === (stryMutAct_9fa48("695") ? "" : (stryCov_9fa48("695"), 'Property')))) return stryMutAct_9fa48("698") ? identifier(node.key, names) === name && literalKey(node.key) === name : stryMutAct_9fa48("697") ? false : stryMutAct_9fa48("696") ? true : (stryCov_9fa48("696", "697", "698"), (stryMutAct_9fa48("700") ? identifier(node.key, names) !== name : stryMutAct_9fa48("699") ? false : (stryCov_9fa48("699", "700"), identifier(node.key, names) === name)) || (stryMutAct_9fa48("702") ? literalKey(node.key) !== name : stryMutAct_9fa48("701") ? false : (stryCov_9fa48("701", "702"), literalKey(node.key) === name)));
    return stryMutAct_9fa48("703") ? true : (stryCov_9fa48("703"), false);
  }
}