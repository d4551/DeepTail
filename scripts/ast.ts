/**
 * The shared parse the executed gates read.
 *
 * The gates read a real parse — oxc, the parser the project's linter already
 * uses — so a construct is judged by what it is rather than by how it is spelt.
 * Babel's traverse stands beside it as the independent walker: where a gate's
 * read rests on a node shape, the second parser pins that shape to the tree
 * the language defines rather than to one parser's dialect.
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
import { parse as babelParse, type ParserPlugin } from '@babel/parser';
import traverse from '@babel/traverse';
import * as babelTypes from '@babel/types';
import { parseSync } from 'oxc-parser';
import { lineReader } from './lines.ts';

/**
 * A value found anywhere on a parsed node.
 *
 * The tree is walked structurally, so every property a node carries is one of
 * these; nothing the gates read is left untyped. A parser also emits plain
 * records that are not nodes — a template element's text is one — so a record
 * shape is here alongside the node it is read from.
 */
export type Field = null | boolean | number | string | Node | readonly Field[] | Record;

/** A parser record that is not a node, such as a template element's text. */
export type Record = {
  readonly [key: string]: Field;
};

/** A parsed node, walked structurally rather than by declared shape. */
export type Node = {
  readonly [key: string]: Field;
} & {
  readonly type: string;
};

/** One comment, which is the only form a checker directive ever takes. */
export interface Comment {
  /** The comment's text, without its delimiters. */
  readonly value: string;
  /** Byte offset the comment starts at. */
  readonly start: number;
  /** Byte offset just past the comment's closing delimiter. */
  readonly end: number;
}

/** A parsed file: its syntax tree, its comments, and its line lookup. */
export interface Parsed {
  /** The program body. */
  readonly body: readonly Node[];
  /** Every comment in the file. */
  readonly comments: readonly Comment[];
  /** Errors that stopped the parse; the list is empty when the parse is whole. */
  readonly errors: readonly {
    readonly message: string;
  }[];
  /** The line a byte offset falls on, one-based. */
  readonly lineAt: (offset: Field | undefined) => number;
}

/**
 * Whether a value is a node the walk should descend into.
 *
 * Takes anything, because the parser's own statements arrive typed by the
 * parser and every other value arrives off a node: one predicate answers for
 * both, and neither is claimed to be a node without being read as one.
 * @param value - any value found on a parent node, or off the parser.
 * @returns true when it carries a node type.
 */
export function isNode(value: unknown): value is Node {
  if (stryMutAct_9fa48("107")) {
    {}
  } else {
    stryCov_9fa48("107");
    return stryMutAct_9fa48("110") ? typeof value === 'object' && value !== null && 'type' in value && !Array.isArray(value) || typeof value.type === 'string' : stryMutAct_9fa48("109") ? false : stryMutAct_9fa48("108") ? true : (stryCov_9fa48("108", "109", "110"), (stryMutAct_9fa48("112") ? typeof value === 'object' && value !== null && 'type' in value || !Array.isArray(value) : stryMutAct_9fa48("111") ? true : (stryCov_9fa48("111", "112"), (stryMutAct_9fa48("114") ? typeof value === 'object' && value !== null || 'type' in value : stryMutAct_9fa48("113") ? true : (stryCov_9fa48("113", "114"), (stryMutAct_9fa48("116") ? typeof value === 'object' || value !== null : stryMutAct_9fa48("115") ? true : (stryCov_9fa48("115", "116"), (stryMutAct_9fa48("118") ? typeof value !== 'object' : stryMutAct_9fa48("117") ? true : (stryCov_9fa48("117", "118"), typeof value === (stryMutAct_9fa48("119") ? "" : (stryCov_9fa48("119"), 'object')))) && (stryMutAct_9fa48("121") ? value === null : stryMutAct_9fa48("120") ? true : (stryCov_9fa48("120", "121"), value !== null)))) && (stryMutAct_9fa48("122") ? "" : (stryCov_9fa48("122"), 'type')) in value)) && (stryMutAct_9fa48("123") ? Array.isArray(value) : (stryCov_9fa48("123"), !Array.isArray(value))))) && (stryMutAct_9fa48("125") ? typeof value.type !== 'string' : stryMutAct_9fa48("124") ? true : (stryCov_9fa48("124", "125"), typeof value.type === (stryMutAct_9fa48("126") ? "" : (stryCov_9fa48("126"), 'string')))));
  }
}

/** The values that carry properties under string keys. */
type Holder = Node | Record;

/**
 * Whether a value carries properties under string keys.
 *
 * An array has keys of its own kind, not of a holder's, and a type predicate
 * is what rules it out of the narrowed type: `Array.isArray` alone does not,
 * because its guard speaks of arrays, not of the readonly arrays this tree
 * carries.
 * @param value - the value to judge.
 * @returns true when the value is a node or a parser record.
 */
function isHolder(value: Field | undefined): value is Holder {
  if (stryMutAct_9fa48("127")) {
    {}
  } else {
    stryCov_9fa48("127");
    return stryMutAct_9fa48("130") ? typeof value === 'object' && value !== null || !Array.isArray(value) : stryMutAct_9fa48("129") ? false : stryMutAct_9fa48("128") ? true : (stryCov_9fa48("128", "129", "130"), (stryMutAct_9fa48("132") ? typeof value === 'object' || value !== null : stryMutAct_9fa48("131") ? true : (stryCov_9fa48("131", "132"), (stryMutAct_9fa48("134") ? typeof value !== 'object' : stryMutAct_9fa48("133") ? true : (stryCov_9fa48("133", "134"), typeof value === (stryMutAct_9fa48("135") ? "" : (stryCov_9fa48("135"), 'object')))) && (stryMutAct_9fa48("137") ? value === null : stryMutAct_9fa48("136") ? true : (stryCov_9fa48("136", "137"), value !== null)))) && (stryMutAct_9fa48("138") ? Array.isArray(value) : (stryCov_9fa48("138"), !Array.isArray(value))));
  }
}

/**
 * The nodes one field holds, when it holds a list of them.
 *
 * A field is a list of anything the model admits, so a walk that wants the
 * child nodes under a key reads them here rather than claiming the list is
 * one: a member that is not a node is not a child to descend into.
 * @param value - the node or record to read.
 * @param key - the field.
 * @returns the nodes, in the order the field holds them.
 */
export function nodesAt(value: Field | undefined, key: string): readonly Node[] {
  if (stryMutAct_9fa48("139")) {
    {}
  } else {
    stryCov_9fa48("139");
    const field = fieldOf(value, key);
    return Array.isArray(field) ? field.flatMap(stryMutAct_9fa48("140") ? () => undefined : (stryCov_9fa48("140"), item => isNode(item) ? stryMutAct_9fa48("141") ? [] : (stryCov_9fa48("141"), [item]) : stryMutAct_9fa48("142") ? ["Stryker was here"] : (stryCov_9fa48("142"), []))) : stryMutAct_9fa48("143") ? ["Stryker was here"] : (stryCov_9fa48("143"), []);
  }
}

/**
 * The node one field holds, when it holds one.
 * @param value - the node or record to read.
 * @param key - the field.
 * @returns the node, or undefined.
 */
export function nodeAt(value: Field | undefined, key: string): Node | undefined {
  if (stryMutAct_9fa48("144")) {
    {}
  } else {
    stryCov_9fa48("144");
    const field = fieldOf(value, key);
    return isNode(field) ? field : undefined;
  }
}

/**
 * The value a node or parser record carries under a key, when there is one.
 *
 * The parser emits some values as plain records rather than nodes — a template
 * element's text has no `type` of its own — so the holder is only required to
 * be an object that has the key.
 * @param value - the node or record to read, or any value found on one.
 * @param key - the property to read.
 * @returns the value, or null when it is absent or the holder has no keys.
 */
export function fieldOf(value: Field | undefined, key: string): Field {
  if (stryMutAct_9fa48("145")) {
    {}
  } else {
    stryCov_9fa48("145");
    if (stryMutAct_9fa48("148") ? false : stryMutAct_9fa48("147") ? true : stryMutAct_9fa48("146") ? isHolder(value) : (stryCov_9fa48("146", "147", "148"), !isHolder(value))) return null;
    return stryMutAct_9fa48("149") ? value[key] && null : (stryCov_9fa48("149"), value[key] ?? null);
  }
}

/**
 * Visit every node below a root, parents before children.
 * @param root - the node, or array of nodes, to start from.
 * @param visit - called once per node.
 */
export function walk(root: Field | undefined, visit: (node: Node) => void): void {
  if (stryMutAct_9fa48("150")) {
    {}
  } else {
    stryCov_9fa48("150");
    if (stryMutAct_9fa48("152") ? false : stryMutAct_9fa48("151") ? true : (stryCov_9fa48("151", "152"), Array.isArray(root))) {
      if (stryMutAct_9fa48("153")) {
        {}
      } else {
        stryCov_9fa48("153");
        for (const item of root) if (stryMutAct_9fa48("154")) {
          ;
        } else {
          stryCov_9fa48("154");
          walk(item, visit);
        }
        return;
      }
    }
    if (stryMutAct_9fa48("157") ? false : stryMutAct_9fa48("156") ? true : stryMutAct_9fa48("155") ? isNode(root) : (stryCov_9fa48("155", "156", "157"), !isNode(root))) return;
    if (stryMutAct_9fa48("158")) {
      ;
    } else {
      stryCov_9fa48("158");
      visit(root);
    }
    for (const [key, value] of Object.entries(root)) {
      if (stryMutAct_9fa48("159")) {
        {}
      } else {
        stryCov_9fa48("159");
        if (stryMutAct_9fa48("162") ? key === 'type' : stryMutAct_9fa48("161") ? false : stryMutAct_9fa48("160") ? true : (stryCov_9fa48("160", "161", "162"), key !== (stryMutAct_9fa48("163") ? "" : (stryCov_9fa48("163"), 'type')))) if (stryMutAct_9fa48("164")) {
          ;
        } else {
          stryCov_9fa48("164");
          walk(value, visit);
        }
      }
    }
  }
}

/** Node types that change nothing about the value they hold. */
const TRANSPARENT = new Set(stryMutAct_9fa48("165") ? [] : (stryCov_9fa48("165"), [stryMutAct_9fa48("166") ? "" : (stryCov_9fa48("166"), 'ParenthesizedExpression'), stryMutAct_9fa48("167") ? "" : (stryCov_9fa48("167"), 'TSAsExpression'), stryMutAct_9fa48("168") ? "" : (stryCov_9fa48("168"), 'TSSatisfiesExpression'), stryMutAct_9fa48("169") ? "" : (stryCov_9fa48("169"), 'TSNonNullExpression'), stryMutAct_9fa48("170") ? "" : (stryCov_9fa48("170"), 'TSInstantiationExpression')]));

/**
 * The expression inside any number of nodes that do not change it.
 * @param value - the node to read.
 * @returns the innermost expression, or the value unchanged.
 */
export function unwrap(value: Field | undefined): Field | undefined {
  if (stryMutAct_9fa48("171")) {
    {}
  } else {
    stryCov_9fa48("171");
    let inner = value;
    // Bounded so a tree that somehow refers to itself cannot spin here.
    for (let depth = 0; stryMutAct_9fa48("174") ? depth >= 32 : stryMutAct_9fa48("173") ? depth <= 32 : stryMutAct_9fa48("172") ? false : (stryCov_9fa48("172", "173", "174"), depth < 32); stryMutAct_9fa48("175") ? depth -= 1 : (stryCov_9fa48("175"), depth += 1)) {
      if (stryMutAct_9fa48("176")) {
        {}
      } else {
        stryCov_9fa48("176");
        if (stryMutAct_9fa48("179") ? !isNode(inner) && !TRANSPARENT.has(inner.type) : stryMutAct_9fa48("178") ? false : stryMutAct_9fa48("177") ? true : (stryCov_9fa48("177", "178", "179"), (stryMutAct_9fa48("180") ? isNode(inner) : (stryCov_9fa48("180"), !isNode(inner))) || (stryMutAct_9fa48("181") ? TRANSPARENT.has(inner.type) : (stryCov_9fa48("181"), !TRANSPARENT.has(inner.type))))) return inner;
        inner = inner[stryMutAct_9fa48("182") ? "" : (stryCov_9fa48("182"), 'expression')];
      }
    }
    return inner;
  }
}

/**
 * The property name a member expression reads, when it is written plainly.
 * @param node - the member expression, or any value found where one may be.
 * @returns the name, or undefined when it is computed or not an identifier.
 */
export function memberName(node: Field | undefined): string | undefined {
  if (stryMutAct_9fa48("183")) {
    {}
  } else {
    stryCov_9fa48("183");
    if (stryMutAct_9fa48("186") ? fieldOf(node, 'computed') !== true : stryMutAct_9fa48("185") ? false : stryMutAct_9fa48("184") ? true : (stryCov_9fa48("184", "185", "186"), fieldOf(node, stryMutAct_9fa48("187") ? "" : (stryCov_9fa48("187"), 'computed')) === (stryMutAct_9fa48("188") ? false : (stryCov_9fa48("188"), true)))) return undefined;
    const property = unwrap(fieldOf(node, stryMutAct_9fa48("189") ? "" : (stryCov_9fa48("189"), 'property')));
    return (stryMutAct_9fa48("192") ? isNode(property) && property.type === 'Identifier' || typeof property['name'] === 'string' : stryMutAct_9fa48("191") ? false : stryMutAct_9fa48("190") ? true : (stryCov_9fa48("190", "191", "192"), (stryMutAct_9fa48("194") ? isNode(property) || property.type === 'Identifier' : stryMutAct_9fa48("193") ? true : (stryCov_9fa48("193", "194"), isNode(property) && (stryMutAct_9fa48("196") ? property.type !== 'Identifier' : stryMutAct_9fa48("195") ? true : (stryCov_9fa48("195", "196"), property.type === (stryMutAct_9fa48("197") ? "" : (stryCov_9fa48("197"), 'Identifier')))))) && (stryMutAct_9fa48("199") ? typeof property['name'] !== 'string' : stryMutAct_9fa48("198") ? true : (stryCov_9fa48("198", "199"), typeof property[stryMutAct_9fa48("200") ? "" : (stryCov_9fa48("200"), 'name')] === (stryMutAct_9fa48("201") ? "" : (stryCov_9fa48("201"), 'string')))))) ? property[stryMutAct_9fa48("202") ? "" : (stryCov_9fa48("202"), 'name')] : undefined;
  }
}

/**
 * Parse one script, keeping everything the gates read off it.
 * @param label - the path, which selects the dialect.
 * @param text - the file's contents.
 * @returns the tree, the comments, the errors and the line lookup.
 */
export function parseScript(label: string, text: string): Parsed {
  if (stryMutAct_9fa48("203")) {
    {}
  } else {
    stryCov_9fa48("203");
    const parsed = parseSync(label, text);
    const at = lineReader(text);
    return stryMutAct_9fa48("204") ? {} : (stryCov_9fa48("204"), {
      // Read as nodes rather than claimed to be them: the parser types its
      // statements its own way, and what the gates walk is the structure.
      body: parsed.program.body.flatMap(stryMutAct_9fa48("205") ? () => undefined : (stryCov_9fa48("205"), statement => isNode(statement) ? stryMutAct_9fa48("206") ? [] : (stryCov_9fa48("206"), [statement]) : stryMutAct_9fa48("207") ? ["Stryker was here"] : (stryCov_9fa48("207"), []))),
      comments: parsed.comments,
      errors: parsed.errors,
      lineAt: stryMutAct_9fa48("208") ? () => undefined : (stryCov_9fa48("208"), (offset: Field | undefined) => (stryMutAct_9fa48("211") ? typeof offset !== 'number' : stryMutAct_9fa48("210") ? false : stryMutAct_9fa48("209") ? true : (stryCov_9fa48("209", "210", "211"), typeof offset === (stryMutAct_9fa48("212") ? "" : (stryCov_9fa48("212"), 'number')))) ? at(offset) : 1)
    });
  }
}

/** The names a walk of the oxc tree sees defined, by function declaration. */
export function oxcDefinedNames(parsed: Parsed): Set<string> {
  if (stryMutAct_9fa48("213")) {
    {}
  } else {
    stryCov_9fa48("213");
    const names = new Set<string>();
    walk(parsed.body, node => {
      if (stryMutAct_9fa48("215")) {
        {}
      } else {
        stryCov_9fa48("215");
        if (stryMutAct_9fa48("218") ? node.type === 'FunctionDeclaration' : stryMutAct_9fa48("217") ? false : stryMutAct_9fa48("216") ? true : (stryCov_9fa48("216", "217", "218"), node.type !== (stryMutAct_9fa48("219") ? "" : (stryCov_9fa48("219"), 'FunctionDeclaration')))) return;
        const name = fieldOf(nodeAt(node, stryMutAct_9fa48("220") ? "" : (stryCov_9fa48("220"), 'id')), stryMutAct_9fa48("221") ? "" : (stryCov_9fa48("221"), 'name'));
        if (stryMutAct_9fa48("224") ? typeof name !== 'string' : stryMutAct_9fa48("223") ? false : stryMutAct_9fa48("222") ? true : (stryCov_9fa48("222", "223", "224"), typeof name === (stryMutAct_9fa48("225") ? "" : (stryCov_9fa48("225"), 'string')))) if (stryMutAct_9fa48("226")) {
          ;
        } else {
          stryCov_9fa48("226");
          names.add(name);
        }
      }
    });
    return names;
  }
}

/** The names a walk of the oxc tree sees called, by plain callee. */
export function oxcCallNames(parsed: Parsed): Set<string> {
  if (stryMutAct_9fa48("227")) {
    {}
  } else {
    stryCov_9fa48("227");
    const names = new Set<string>();
    walk(parsed.body, node => {
      if (stryMutAct_9fa48("229")) {
        {}
      } else {
        stryCov_9fa48("229");
        if (stryMutAct_9fa48("232") ? node.type === 'CallExpression' : stryMutAct_9fa48("231") ? false : stryMutAct_9fa48("230") ? true : (stryCov_9fa48("230", "231", "232"), node.type !== (stryMutAct_9fa48("233") ? "" : (stryCov_9fa48("233"), 'CallExpression')))) return;
        const callee = nodeAt(node, stryMutAct_9fa48("234") ? "" : (stryCov_9fa48("234"), 'callee'));
        if (stryMutAct_9fa48("237") ? callee === undefined && callee.type !== 'Identifier' : stryMutAct_9fa48("236") ? false : stryMutAct_9fa48("235") ? true : (stryCov_9fa48("235", "236", "237"), (stryMutAct_9fa48("239") ? callee !== undefined : stryMutAct_9fa48("238") ? false : (stryCov_9fa48("238", "239"), callee === undefined)) || (stryMutAct_9fa48("241") ? callee.type === 'Identifier' : stryMutAct_9fa48("240") ? false : (stryCov_9fa48("240", "241"), callee.type !== (stryMutAct_9fa48("242") ? "" : (stryCov_9fa48("242"), 'Identifier')))))) return;
        const name = fieldOf(callee, stryMutAct_9fa48("243") ? "" : (stryCov_9fa48("243"), 'name'));
        if (stryMutAct_9fa48("246") ? typeof name !== 'string' : stryMutAct_9fa48("245") ? false : stryMutAct_9fa48("244") ? true : (stryCov_9fa48("244", "245", "246"), typeof name === (stryMutAct_9fa48("247") ? "" : (stryCov_9fa48("247"), 'string')))) if (stryMutAct_9fa48("248")) {
          ;
        } else {
          stryCov_9fa48("248");
          names.add(name);
        }
      }
    });
    return names;
  }
}

/** The Babel parse of one script: the tree the independent walker descends. */
export interface BabelParsed {
  /** The parsed file, typed by the validator package the walker reads. */
  readonly file: babelTypes.File;
  /** What the parser recovered rather than refused, by message. */
  readonly errors: readonly string[];
}

/** The plugins each dialect is parsed with, longest suffix first. */
const BABEL_DIALECTS: readonly (readonly [suffix: string, plugins: readonly ParserPlugin[]])[] = stryMutAct_9fa48("249") ? [] : (stryCov_9fa48("249"), [stryMutAct_9fa48("250") ? [] : (stryCov_9fa48("250"), [stryMutAct_9fa48("251") ? "" : (stryCov_9fa48("251"), '.tsx'), stryMutAct_9fa48("252") ? [] : (stryCov_9fa48("252"), [stryMutAct_9fa48("253") ? "" : (stryCov_9fa48("253"), 'typescript'), stryMutAct_9fa48("254") ? "" : (stryCov_9fa48("254"), 'jsx')])]), stryMutAct_9fa48("255") ? [] : (stryCov_9fa48("255"), [stryMutAct_9fa48("256") ? "" : (stryCov_9fa48("256"), '.mts'), stryMutAct_9fa48("257") ? [] : (stryCov_9fa48("257"), [stryMutAct_9fa48("258") ? "" : (stryCov_9fa48("258"), 'typescript')])]), stryMutAct_9fa48("259") ? [] : (stryCov_9fa48("259"), [stryMutAct_9fa48("260") ? "" : (stryCov_9fa48("260"), '.cts'), stryMutAct_9fa48("261") ? [] : (stryCov_9fa48("261"), [stryMutAct_9fa48("262") ? "" : (stryCov_9fa48("262"), 'typescript')])]), stryMutAct_9fa48("263") ? [] : (stryCov_9fa48("263"), [stryMutAct_9fa48("264") ? "" : (stryCov_9fa48("264"), '.ts'), stryMutAct_9fa48("265") ? [] : (stryCov_9fa48("265"), [stryMutAct_9fa48("266") ? "" : (stryCov_9fa48("266"), 'typescript')])]), stryMutAct_9fa48("267") ? [] : (stryCov_9fa48("267"), [stryMutAct_9fa48("268") ? "" : (stryCov_9fa48("268"), '.jsx'), stryMutAct_9fa48("269") ? [] : (stryCov_9fa48("269"), [stryMutAct_9fa48("270") ? "" : (stryCov_9fa48("270"), 'jsx')])]), stryMutAct_9fa48("271") ? [] : (stryCov_9fa48("271"), [stryMutAct_9fa48("272") ? "" : (stryCov_9fa48("272"), '.mjs'), stryMutAct_9fa48("273") ? ["Stryker was here"] : (stryCov_9fa48("273"), [])]), stryMutAct_9fa48("274") ? [] : (stryCov_9fa48("274"), [stryMutAct_9fa48("275") ? "" : (stryCov_9fa48("275"), '.js'), stryMutAct_9fa48("276") ? ["Stryker was here"] : (stryCov_9fa48("276"), [])])]);

/**
 * Parse one script the way Babel reads it, for the walker to descend.
 * @param label - the path, whose suffix selects the dialect plugins.
 * @param text - the file's contents.
 * @returns the file node and whatever the parser recovered.
 */
export function parseScriptWithBabel(label: string, text: string): BabelParsed {
  if (stryMutAct_9fa48("277")) {
    {}
  } else {
    stryCov_9fa48("277");
    const plugins = stryMutAct_9fa48("278") ? BABEL_DIALECTS.find(([suffix]) => label.endsWith(suffix))?.[1] && [] : (stryCov_9fa48("278"), (stryMutAct_9fa48("279") ? BABEL_DIALECTS.find(([suffix]) => label.endsWith(suffix))[1] : (stryCov_9fa48("279"), BABEL_DIALECTS.find(stryMutAct_9fa48("280") ? () => undefined : (stryCov_9fa48("280"), ([suffix]) => stryMutAct_9fa48("281") ? label.startsWith(suffix) : (stryCov_9fa48("281"), label.endsWith(suffix))))?.[1])) ?? (stryMutAct_9fa48("282") ? ["Stryker was here"] : (stryCov_9fa48("282"), [])));
    const file = babelParse(text, stryMutAct_9fa48("283") ? {} : (stryCov_9fa48("283"), {
      sourceType: stryMutAct_9fa48("284") ? "" : (stryCov_9fa48("284"), 'module'),
      plugins: stryMutAct_9fa48("285") ? [] : (stryCov_9fa48("285"), [...plugins]),
      errorRecovery: stryMutAct_9fa48("286") ? false : (stryCov_9fa48("286"), true)
    }));
    return stryMutAct_9fa48("287") ? {} : (stryCov_9fa48("287"), {
      file,
      errors: file.errors.map(stryMutAct_9fa48("288") ? () => undefined : (stryCov_9fa48("288"), error => error.message))
    });
  }
}

/** The names the Babel walker sees defined, by function declaration. */
export function babelDefinedNames(parsed: BabelParsed): Set<string> {
  if (stryMutAct_9fa48("289")) {
    {}
  } else {
    stryCov_9fa48("289");
    const names = new Set<string>();
    traverse(parsed.file, stryMutAct_9fa48("291") ? {} : (stryCov_9fa48("291"), {
      FunctionDeclaration(path) {
        if (stryMutAct_9fa48("292")) {
          {}
        } else {
          stryCov_9fa48("292");
          const id = path.node.id;
          if (stryMutAct_9fa48("295") ? id !== null || id !== undefined : stryMutAct_9fa48("294") ? false : stryMutAct_9fa48("293") ? true : (stryCov_9fa48("293", "294", "295"), (stryMutAct_9fa48("297") ? id === null : stryMutAct_9fa48("296") ? true : (stryCov_9fa48("296", "297"), id !== null)) && (stryMutAct_9fa48("299") ? id === undefined : stryMutAct_9fa48("298") ? true : (stryCov_9fa48("298", "299"), id !== undefined)))) if (stryMutAct_9fa48("300")) {
            ;
          } else {
            stryCov_9fa48("300");
            names.add(id.name);
          }
        }
      }
    }));
    return names;
  }
}

/** The names the Babel walker sees called, by plain callee. */
export function babelCallNames(parsed: BabelParsed): Set<string> {
  if (stryMutAct_9fa48("301")) {
    {}
  } else {
    stryCov_9fa48("301");
    const names = new Set<string>();
    traverse(parsed.file, stryMutAct_9fa48("303") ? {} : (stryCov_9fa48("303"), {
      CallExpression(path) {
        if (stryMutAct_9fa48("304")) {
          {}
        } else {
          stryCov_9fa48("304");
          const callee = path.node.callee;
          if (stryMutAct_9fa48("306") ? false : stryMutAct_9fa48("305") ? true : (stryCov_9fa48("305", "306"), babelTypes.isIdentifier(callee))) if (stryMutAct_9fa48("307")) {
            ;
          } else {
            stryCov_9fa48("307");
            names.add(callee.name);
          }
        }
      }
    }));
    return names;
  }
}