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
  if (stryMutAct_9fa48("704")) {
    {}
  } else {
    stryCov_9fa48("704");
    const found = new Map<string, string | null>();
    const empty: Constants = new Map();
    walk(program, node => {
      if (stryMutAct_9fa48("706")) {
        {}
      } else {
        stryCov_9fa48("706");
        if (stryMutAct_9fa48("709") ? node.type !== 'VariableDeclaration' && node.kind !== 'const' : stryMutAct_9fa48("708") ? false : stryMutAct_9fa48("707") ? true : (stryCov_9fa48("707", "708", "709"), (stryMutAct_9fa48("711") ? node.type === 'VariableDeclaration' : stryMutAct_9fa48("710") ? false : (stryCov_9fa48("710", "711"), node.type !== (stryMutAct_9fa48("712") ? "" : (stryCov_9fa48("712"), 'VariableDeclaration')))) || (stryMutAct_9fa48("714") ? node.kind === 'const' : stryMutAct_9fa48("713") ? false : (stryCov_9fa48("713", "714"), node.kind !== (stryMutAct_9fa48("715") ? "" : (stryCov_9fa48("715"), 'const')))))) return;
        const declarations = node.declarations;
        if (stryMutAct_9fa48("718") ? false : stryMutAct_9fa48("717") ? true : stryMutAct_9fa48("716") ? Array.isArray(declarations) : (stryCov_9fa48("716", "717", "718"), !Array.isArray(declarations))) return;
        for (const declaration of declarations) if (stryMutAct_9fa48("719")) {
          ;
        } else {
          stryCov_9fa48("719");
          recordConstant(found, empty, declaration);
        }
      }
    });
    return found;
  }
}

/**
 * Record what one declarator binds, when it binds a string this gate can fold.
 *
 * A name already bound to a different string is marked undecided: two
 * declarations that disagree are not one constant, and answering with either
 * of them would be answering a question the file does not settle.
 * @param found - the bindings collected so far.
 * @param env - the constants a nested fold may read, which is none: a
 * declaration is folded before the file's own bindings are known.
 * @param declaration - one declarator of a `const` statement.
 */
function recordConstant(found: Map<string, string | null>, env: Constants, declaration: Field): void {
  if (stryMutAct_9fa48("720")) {
    {}
  } else {
    stryCov_9fa48("720");
    if (stryMutAct_9fa48("723") ? false : stryMutAct_9fa48("722") ? true : stryMutAct_9fa48("721") ? isNode(declaration) : (stryCov_9fa48("721", "722", "723"), !isNode(declaration))) return;
    const id = unwrap(declaration.id);
    if (stryMutAct_9fa48("726") ? (!isNode(id) || id.type !== 'Identifier') && typeof id.name !== 'string' : stryMutAct_9fa48("725") ? false : stryMutAct_9fa48("724") ? true : (stryCov_9fa48("724", "725", "726"), (stryMutAct_9fa48("728") ? !isNode(id) && id.type !== 'Identifier' : stryMutAct_9fa48("727") ? false : (stryCov_9fa48("727", "728"), (stryMutAct_9fa48("729") ? isNode(id) : (stryCov_9fa48("729"), !isNode(id))) || (stryMutAct_9fa48("731") ? id.type === 'Identifier' : stryMutAct_9fa48("730") ? false : (stryCov_9fa48("730", "731"), id.type !== (stryMutAct_9fa48("732") ? "" : (stryCov_9fa48("732"), 'Identifier')))))) || (stryMutAct_9fa48("734") ? typeof id.name === 'string' : stryMutAct_9fa48("733") ? false : (stryCov_9fa48("733", "734"), typeof id.name !== (stryMutAct_9fa48("735") ? "" : (stryCov_9fa48("735"), 'string')))))) return;
    const value = staticString(env, declaration.init);
    if (stryMutAct_9fa48("738") ? value !== undefined : stryMutAct_9fa48("737") ? false : stryMutAct_9fa48("736") ? true : (stryCov_9fa48("736", "737", "738"), value === undefined)) return;
    const seen = found.get(id.name);
    found.set(id.name, (stryMutAct_9fa48("742") ? seen === undefined && seen === value : stryMutAct_9fa48("741") ? false : stryMutAct_9fa48("740") ? true : (stryCov_9fa48("740", "741", "742"), (stryMutAct_9fa48("744") ? seen !== undefined : stryMutAct_9fa48("743") ? false : (stryCov_9fa48("743", "744"), seen === undefined)) || (stryMutAct_9fa48("746") ? seen !== value : stryMutAct_9fa48("745") ? false : (stryCov_9fa48("745", "746"), seen === value)))) ? value : null);
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
  if (stryMutAct_9fa48("747")) {
    {}
  } else {
    stryCov_9fa48("747");
    const folded = unwrap(node);
    if (stryMutAct_9fa48("750") ? false : stryMutAct_9fa48("749") ? true : stryMutAct_9fa48("748") ? isNode(folded) : (stryCov_9fa48("748", "749", "750"), !isNode(folded))) return undefined;
    switch (folded.type) {
      case stryMutAct_9fa48("752") ? "" : (stryCov_9fa48("752"), 'Literal'):
        if (stryMutAct_9fa48("751")) {} else {
          stryCov_9fa48("751");
          return (stryMutAct_9fa48("755") ? typeof folded.value !== 'string' : stryMutAct_9fa48("754") ? false : stryMutAct_9fa48("753") ? true : (stryCov_9fa48("753", "754", "755"), typeof folded.value === (stryMutAct_9fa48("756") ? "" : (stryCov_9fa48("756"), 'string')))) ? folded.value : undefined;
        }
      case stryMutAct_9fa48("758") ? "" : (stryCov_9fa48("758"), 'Identifier'):
        if (stryMutAct_9fa48("757")) {} else {
          stryCov_9fa48("757");
          return (stryMutAct_9fa48("761") ? typeof folded.name !== 'string' : stryMutAct_9fa48("760") ? false : stryMutAct_9fa48("759") ? true : (stryCov_9fa48("759", "760", "761"), typeof folded.name === (stryMutAct_9fa48("762") ? "" : (stryCov_9fa48("762"), 'string')))) ? stryMutAct_9fa48("763") ? env.get(folded.name) && undefined : (stryCov_9fa48("763"), env.get(folded.name) ?? undefined) : undefined;
        }
      case stryMutAct_9fa48("765") ? "" : (stryCov_9fa48("765"), 'TemplateLiteral'):
        if (stryMutAct_9fa48("764")) {} else {
          stryCov_9fa48("764");
          return foldTemplate(env, folded);
        }
      case stryMutAct_9fa48("767") ? "" : (stryCov_9fa48("767"), 'BinaryExpression'):
        if (stryMutAct_9fa48("766")) {} else {
          stryCov_9fa48("766");
          return foldConcatenation(env, folded);
        }
      case stryMutAct_9fa48("769") ? "" : (stryCov_9fa48("769"), 'CallExpression'):
        if (stryMutAct_9fa48("768")) {} else {
          stryCov_9fa48("768");
          return foldCall(env, folded);
        }
      default:
        if (stryMutAct_9fa48("770")) {} else {
          stryCov_9fa48("770");
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
  if (stryMutAct_9fa48("771")) {
    {}
  } else {
    stryCov_9fa48("771");
    const quasis = node.quasis;
    const expressions = node.expressions;
    if (stryMutAct_9fa48("774") ? !Array.isArray(quasis) && !Array.isArray(expressions) : stryMutAct_9fa48("773") ? false : stryMutAct_9fa48("772") ? true : (stryCov_9fa48("772", "773", "774"), (stryMutAct_9fa48("775") ? Array.isArray(quasis) : (stryCov_9fa48("775"), !Array.isArray(quasis))) || (stryMutAct_9fa48("776") ? Array.isArray(expressions) : (stryCov_9fa48("776"), !Array.isArray(expressions))))) return undefined;
    const cooked: string[] = stryMutAct_9fa48("777") ? ["Stryker was here"] : (stryCov_9fa48("777"), []);
    for (const quasi of quasis) {
      if (stryMutAct_9fa48("778")) {
        {}
      } else {
        stryCov_9fa48("778");
        const text = fieldOf(fieldOf(quasi, stryMutAct_9fa48("779") ? "" : (stryCov_9fa48("779"), 'value')), stryMutAct_9fa48("780") ? "" : (stryCov_9fa48("780"), 'cooked'));
        if (stryMutAct_9fa48("783") ? typeof text === 'string' : stryMutAct_9fa48("782") ? false : stryMutAct_9fa48("781") ? true : (stryCov_9fa48("781", "782", "783"), typeof text !== (stryMutAct_9fa48("784") ? "" : (stryCov_9fa48("784"), 'string')))) return undefined;
        if (stryMutAct_9fa48("785")) {
          ;
        } else {
          stryCov_9fa48("785");
          cooked.push(text);
        }
      }
    }
    return stryMutAct_9fa48("786") ? {} : (stryCov_9fa48("786"), {
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
  if (stryMutAct_9fa48("787")) {
    {}
  } else {
    stryCov_9fa48("787");
    const parts = templateParts(node);
    if (stryMutAct_9fa48("790") ? parts !== undefined : stryMutAct_9fa48("789") ? false : stryMutAct_9fa48("788") ? true : (stryCov_9fa48("788", "789", "790"), parts === undefined)) return undefined;
    let text = stryMutAct_9fa48("791") ? "Stryker was here!" : (stryCov_9fa48("791"), '');
    for (const [index, cooked] of parts.cooked.entries()) {
      if (stryMutAct_9fa48("792")) {
        {}
      } else {
        stryCov_9fa48("792");
        stryMutAct_9fa48("793") ? text -= cooked : (stryCov_9fa48("793"), text += cooked);
        if (stryMutAct_9fa48("797") ? index < parts.expressions.length : stryMutAct_9fa48("796") ? index > parts.expressions.length : stryMutAct_9fa48("795") ? false : stryMutAct_9fa48("794") ? true : (stryCov_9fa48("794", "795", "796", "797"), index >= parts.expressions.length)) continue;
        const part = staticString(env, parts.expressions[index]);
        if (stryMutAct_9fa48("800") ? part !== undefined : stryMutAct_9fa48("799") ? false : stryMutAct_9fa48("798") ? true : (stryCov_9fa48("798", "799", "800"), part === undefined)) return undefined;
        stryMutAct_9fa48("801") ? text -= part : (stryCov_9fa48("801"), text += part);
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
  if (stryMutAct_9fa48("802")) {
    {}
  } else {
    stryCov_9fa48("802");
    if (stryMutAct_9fa48("805") ? node.operator === '+' : stryMutAct_9fa48("804") ? false : stryMutAct_9fa48("803") ? true : (stryCov_9fa48("803", "804", "805"), node.operator !== (stryMutAct_9fa48("806") ? "" : (stryCov_9fa48("806"), '+')))) return undefined;
    const left = staticString(env, node.left);
    const right = staticString(env, node.right);
    return (stryMutAct_9fa48("809") ? left === undefined && right === undefined : stryMutAct_9fa48("808") ? false : stryMutAct_9fa48("807") ? true : (stryCov_9fa48("807", "808", "809"), (stryMutAct_9fa48("811") ? left !== undefined : stryMutAct_9fa48("810") ? false : (stryCov_9fa48("810", "811"), left === undefined)) || (stryMutAct_9fa48("813") ? right !== undefined : stryMutAct_9fa48("812") ? false : (stryCov_9fa48("812", "813"), right === undefined)))) ? undefined : stryMutAct_9fa48("814") ? left - right : (stryCov_9fa48("814"), left + right);
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
  if (stryMutAct_9fa48("815")) {
    {}
  } else {
    stryCov_9fa48("815");
    const callee = node.callee;
    const args = node.arguments;
    if (stryMutAct_9fa48("818") ? (!isNode(callee) || callee.type !== 'MemberExpression') && !Array.isArray(args) : stryMutAct_9fa48("817") ? false : stryMutAct_9fa48("816") ? true : (stryCov_9fa48("816", "817", "818"), (stryMutAct_9fa48("820") ? !isNode(callee) && callee.type !== 'MemberExpression' : stryMutAct_9fa48("819") ? false : (stryCov_9fa48("819", "820"), (stryMutAct_9fa48("821") ? isNode(callee) : (stryCov_9fa48("821"), !isNode(callee))) || (stryMutAct_9fa48("823") ? callee.type === 'MemberExpression' : stryMutAct_9fa48("822") ? false : (stryCov_9fa48("822", "823"), callee.type !== (stryMutAct_9fa48("824") ? "" : (stryCov_9fa48("824"), 'MemberExpression')))))) || (stryMutAct_9fa48("825") ? Array.isArray(args) : (stryCov_9fa48("825"), !Array.isArray(args))))) return undefined;
    const method = memberName(callee);
    const receiver = callee.object;
    if (stryMutAct_9fa48("828") ? method === 'fromCharCode' && method === 'fromCodePoint' : stryMutAct_9fa48("827") ? false : stryMutAct_9fa48("826") ? true : (stryCov_9fa48("826", "827", "828"), (stryMutAct_9fa48("830") ? method !== 'fromCharCode' : stryMutAct_9fa48("829") ? false : (stryCov_9fa48("829", "830"), method === (stryMutAct_9fa48("831") ? "" : (stryCov_9fa48("831"), 'fromCharCode')))) || (stryMutAct_9fa48("833") ? method !== 'fromCodePoint' : stryMutAct_9fa48("832") ? false : (stryCov_9fa48("832", "833"), method === (stryMutAct_9fa48("834") ? "" : (stryCov_9fa48("834"), 'fromCodePoint')))))) return foldCharacters(method, args);
    if (stryMutAct_9fa48("837") ? method === 'toLowerCase' && method === 'toUpperCase' : stryMutAct_9fa48("836") ? false : stryMutAct_9fa48("835") ? true : (stryCov_9fa48("835", "836", "837"), (stryMutAct_9fa48("839") ? method !== 'toLowerCase' : stryMutAct_9fa48("838") ? false : (stryCov_9fa48("838", "839"), method === (stryMutAct_9fa48("840") ? "" : (stryCov_9fa48("840"), 'toLowerCase')))) || (stryMutAct_9fa48("842") ? method !== 'toUpperCase' : stryMutAct_9fa48("841") ? false : (stryCov_9fa48("841", "842"), method === (stryMutAct_9fa48("843") ? "" : (stryCov_9fa48("843"), 'toUpperCase')))))) return foldCaseShift(env, method, receiver);
    if (stryMutAct_9fa48("846") ? method !== 'concat' : stryMutAct_9fa48("845") ? false : stryMutAct_9fa48("844") ? true : (stryCov_9fa48("844", "845", "846"), method === (stryMutAct_9fa48("847") ? "" : (stryCov_9fa48("847"), 'concat')))) return foldParts(env, stryMutAct_9fa48("848") ? [] : (stryCov_9fa48("848"), [receiver, ...args]));
    if (stryMutAct_9fa48("851") ? method !== 'join' : stryMutAct_9fa48("850") ? false : stryMutAct_9fa48("849") ? true : (stryCov_9fa48("849", "850", "851"), method === (stryMutAct_9fa48("852") ? "" : (stryCov_9fa48("852"), 'join')))) return foldJoin(env, receiver, args);
    return undefined;
  }
}

/**
 * Fold a case shift applied to a receiver that folds.
 * @param env - the file's constants.
 * @param method - which shift was called.
 * @param receiver - the expression the method was called on.
 * @returns the shifted string, or undefined when the receiver does not fold.
 */
function foldCaseShift(env: Constants, method: string, receiver: Field | undefined): string | undefined {
  if (stryMutAct_9fa48("853")) {
    {}
  } else {
    stryCov_9fa48("853");
    const text = staticString(env, receiver);
    if (stryMutAct_9fa48("856") ? text !== undefined : stryMutAct_9fa48("855") ? false : stryMutAct_9fa48("854") ? true : (stryCov_9fa48("854", "855", "856"), text === undefined)) return undefined;
    return (stryMutAct_9fa48("859") ? method !== 'toLowerCase' : stryMutAct_9fa48("858") ? false : stryMutAct_9fa48("857") ? true : (stryCov_9fa48("857", "858", "859"), method === (stryMutAct_9fa48("860") ? "" : (stryCov_9fa48("860"), 'toLowerCase')))) ? stryMutAct_9fa48("861") ? text.toUpperCase() : (stryCov_9fa48("861"), text.toLowerCase()) : stryMutAct_9fa48("862") ? text.toLowerCase() : (stryCov_9fa48("862"), text.toUpperCase());
  }
}

/**
 * Fold `String.fromCharCode(…)` and its code-point sibling.
 * @param method - which of the two was called.
 * @param args - the character codes.
 * @returns the string, or undefined.
 */
function foldCharacters(method: string, args: readonly Field[]): string | undefined {
  if (stryMutAct_9fa48("863")) {
    {}
  } else {
    stryCov_9fa48("863");
    const codes: number[] = stryMutAct_9fa48("864") ? ["Stryker was here"] : (stryCov_9fa48("864"), []);
    for (const argument of args) {
      if (stryMutAct_9fa48("865")) {
        {}
      } else {
        stryCov_9fa48("865");
        if (stryMutAct_9fa48("868") ? (!isNode(argument) || argument.type !== 'Literal') && typeof argument.value !== 'number' : stryMutAct_9fa48("867") ? false : stryMutAct_9fa48("866") ? true : (stryCov_9fa48("866", "867", "868"), (stryMutAct_9fa48("870") ? !isNode(argument) && argument.type !== 'Literal' : stryMutAct_9fa48("869") ? false : (stryCov_9fa48("869", "870"), (stryMutAct_9fa48("871") ? isNode(argument) : (stryCov_9fa48("871"), !isNode(argument))) || (stryMutAct_9fa48("873") ? argument.type === 'Literal' : stryMutAct_9fa48("872") ? false : (stryCov_9fa48("872", "873"), argument.type !== (stryMutAct_9fa48("874") ? "" : (stryCov_9fa48("874"), 'Literal')))))) || (stryMutAct_9fa48("876") ? typeof argument.value === 'number' : stryMutAct_9fa48("875") ? false : (stryCov_9fa48("875", "876"), typeof argument.value !== (stryMutAct_9fa48("877") ? "" : (stryCov_9fa48("877"), 'number')))))) return undefined;
        if (stryMutAct_9fa48("878")) {
          ;
        } else {
          stryCov_9fa48("878");
          codes.push(argument.value);
        }
      }
    }
    // `fromCharCode` truncates each argument to sixteen bits; the mask reproduces
    // that without calling the deprecated form.
    const units = (stryMutAct_9fa48("881") ? method !== 'fromCharCode' : stryMutAct_9fa48("880") ? false : stryMutAct_9fa48("879") ? true : (stryCov_9fa48("879", "880", "881"), method === (stryMutAct_9fa48("882") ? "" : (stryCov_9fa48("882"), 'fromCharCode')))) ? codes.map(stryMutAct_9fa48("883") ? () => undefined : (stryCov_9fa48("883"), code => code & 0xff_ff)) : codes;
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
  if (stryMutAct_9fa48("884")) {
    {}
  } else {
    stryCov_9fa48("884");
    let text = stryMutAct_9fa48("885") ? "Stryker was here!" : (stryCov_9fa48("885"), '');
    for (const part of parts) {
      if (stryMutAct_9fa48("886")) {
        {}
      } else {
        stryCov_9fa48("886");
        const folded = staticString(env, part);
        if (stryMutAct_9fa48("889") ? folded !== undefined : stryMutAct_9fa48("888") ? false : stryMutAct_9fa48("887") ? true : (stryCov_9fa48("887", "888", "889"), folded === undefined)) return undefined;
        stryMutAct_9fa48("890") ? text -= folded : (stryCov_9fa48("890"), text += folded);
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
  if (stryMutAct_9fa48("891")) {
    {}
  } else {
    stryCov_9fa48("891");
    if (stryMutAct_9fa48("894") ? !isNode(receiver) && receiver.type !== 'ArrayExpression' : stryMutAct_9fa48("893") ? false : stryMutAct_9fa48("892") ? true : (stryCov_9fa48("892", "893", "894"), (stryMutAct_9fa48("895") ? isNode(receiver) : (stryCov_9fa48("895"), !isNode(receiver))) || (stryMutAct_9fa48("897") ? receiver.type === 'ArrayExpression' : stryMutAct_9fa48("896") ? false : (stryCov_9fa48("896", "897"), receiver.type !== (stryMutAct_9fa48("898") ? "" : (stryCov_9fa48("898"), 'ArrayExpression')))))) return undefined;
    const elements = receiver.elements;
    if (stryMutAct_9fa48("901") ? false : stryMutAct_9fa48("900") ? true : stryMutAct_9fa48("899") ? Array.isArray(elements) : (stryCov_9fa48("899", "900", "901"), !Array.isArray(elements))) return undefined;
    const separator = (stryMutAct_9fa48("904") ? args.length !== 0 : stryMutAct_9fa48("903") ? false : stryMutAct_9fa48("902") ? true : (stryCov_9fa48("902", "903", "904"), args.length === 0)) ? stryMutAct_9fa48("905") ? "Stryker was here!" : (stryCov_9fa48("905"), '') : staticString(env, args[0]);
    if (stryMutAct_9fa48("908") ? separator !== undefined : stryMutAct_9fa48("907") ? false : stryMutAct_9fa48("906") ? true : (stryCov_9fa48("906", "907", "908"), separator === undefined)) return undefined;
    const parts: string[] = stryMutAct_9fa48("909") ? ["Stryker was here"] : (stryCov_9fa48("909"), []);
    for (const element of elements) {
      if (stryMutAct_9fa48("910")) {
        {}
      } else {
        stryCov_9fa48("910");
        const folded = staticString(env, element);
        if (stryMutAct_9fa48("913") ? folded !== undefined : stryMutAct_9fa48("912") ? false : stryMutAct_9fa48("911") ? true : (stryCov_9fa48("911", "912", "913"), folded === undefined)) return undefined;
        if (stryMutAct_9fa48("914")) {
          ;
        } else {
          stryCov_9fa48("914");
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
export const UNREADABLE = stryMutAct_9fa48("915") ? "" : (stryCov_9fa48("915"), '\u{F8FF}');

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
  if (stryMutAct_9fa48("916")) {
    {}
  } else {
    stryCov_9fa48("916");
    const exact = staticString(env, node);
    if (stryMutAct_9fa48("919") ? exact === undefined : stryMutAct_9fa48("918") ? false : stryMutAct_9fa48("917") ? true : (stryCov_9fa48("917", "918", "919"), exact !== undefined)) return exact;
    const read = unwrap(node);
    if (stryMutAct_9fa48("922") ? false : stryMutAct_9fa48("921") ? true : stryMutAct_9fa48("920") ? isNode(read) : (stryCov_9fa48("920", "921", "922"), !isNode(read))) return undefined;
    switch (read.type) {
      case stryMutAct_9fa48("924") ? "" : (stryCov_9fa48("924"), 'TemplateLiteral'):
        if (stryMutAct_9fa48("923")) {} else {
          stryCov_9fa48("923");
          return approximateTemplate(env, read);
        }
      case stryMutAct_9fa48("926") ? "" : (stryCov_9fa48("926"), 'BinaryExpression'):
        if (stryMutAct_9fa48("925")) {} else {
          stryCov_9fa48("925");
          return (stryMutAct_9fa48("929") ? read.operator !== '+' : stryMutAct_9fa48("928") ? false : stryMutAct_9fa48("927") ? true : (stryCov_9fa48("927", "928", "929"), read.operator === (stryMutAct_9fa48("930") ? "" : (stryCov_9fa48("930"), '+')))) ? stryMutAct_9fa48("931") ? `` : (stryCov_9fa48("931"), `${stryMutAct_9fa48("932") ? approximateString(env, read.left) && UNREADABLE : (stryCov_9fa48("932"), approximateString(env, read.left) ?? UNREADABLE)}${stryMutAct_9fa48("933") ? approximateString(env, read.right) && UNREADABLE : (stryCov_9fa48("933"), approximateString(env, read.right) ?? UNREADABLE)}`) : undefined;
        }
      default:
        if (stryMutAct_9fa48("934")) {} else {
          stryCov_9fa48("934");
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
  if (stryMutAct_9fa48("935")) {
    {}
  } else {
    stryCov_9fa48("935");
    const parts = templateParts(node);
    if (stryMutAct_9fa48("938") ? parts !== undefined : stryMutAct_9fa48("937") ? false : stryMutAct_9fa48("936") ? true : (stryCov_9fa48("936", "937", "938"), parts === undefined)) return undefined;
    let text = stryMutAct_9fa48("939") ? "Stryker was here!" : (stryCov_9fa48("939"), '');
    for (const [index, cooked] of parts.cooked.entries()) {
      if (stryMutAct_9fa48("940")) {
        {}
      } else {
        stryCov_9fa48("940");
        stryMutAct_9fa48("941") ? text -= cooked : (stryCov_9fa48("941"), text += cooked);
        if (stryMutAct_9fa48("945") ? index >= parts.expressions.length : stryMutAct_9fa48("944") ? index <= parts.expressions.length : stryMutAct_9fa48("943") ? false : stryMutAct_9fa48("942") ? true : (stryCov_9fa48("942", "943", "944", "945"), index < parts.expressions.length)) stryMutAct_9fa48("946") ? text -= approximateString(env, parts.expressions[index]) ?? UNREADABLE : (stryCov_9fa48("946"), text += stryMutAct_9fa48("947") ? approximateString(env, parts.expressions[index]) && UNREADABLE : (stryCov_9fa48("947"), approximateString(env, parts.expressions[index]) ?? UNREADABLE));
      }
    }
    return text;
  }
}