/**
 * The shared parse the executed gates read.
 *
 * The gates read a real parse — oxc, the parser the project's linter already
 * uses — so a construct is judged by what it is rather than by how it is spelt.
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

/**
 * A parsed node, walked structurally rather than by declared shape.
 *
 * The properties the gates read are declared here as well, so a reader can
 * address them plainly; the index signature stays, because a gate must also
 * read whatever the parser emits beyond those it names.
 */
export type Node = {
  readonly [key: string]: Field;
} & {
  readonly type: string;
  readonly arguments?: Field;
  readonly body?: Field;
  readonly callee?: Field;
  readonly cases?: Field;
  readonly computed?: Field;
  readonly consequent?: Field;
  readonly declarations?: Field;
  readonly elements?: Field;
  readonly expression?: Field;
  readonly expressions?: Field;
  readonly id?: Field;
  readonly imported?: Field;
  readonly init?: Field;
  readonly key?: Field;
  readonly kind?: Field;
  readonly left?: Field;
  readonly local?: Field;
  readonly name?: Field;
  readonly object?: Field;
  readonly operator?: Field;
  readonly param?: Field;
  readonly params?: Field;
  readonly properties?: Field;
  readonly property?: Field;
  readonly quasis?: Field;
  readonly right?: Field;
  readonly source?: Field;
  readonly specifiers?: Field;
  readonly start?: Field;
  readonly test?: Field;
  readonly value?: Field;
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
 * The parameter admits a plain object as well as a field found on a parent,
 * because the parser hands its statements out as interface-typed values that
 * carry no index signature. Widening it here is what lets the entry point
 * below check a statement rather than assert it into the structural shape the
 * gates walk.
 * @param value - any value found on a parent node, or one the parser returned.
 * @returns true when it carries a node type.
 */
export function isNode(value: Field | object | undefined): value is Node {
  if (stryMutAct_9fa48("92")) {
    {}
  } else {
    stryCov_9fa48("92");
    return stryMutAct_9fa48("95") ? typeof value === 'object' && value !== null && 'type' in value && !Array.isArray(value) || typeof value.type === 'string' : stryMutAct_9fa48("94") ? false : stryMutAct_9fa48("93") ? true : (stryCov_9fa48("93", "94", "95"), (stryMutAct_9fa48("97") ? typeof value === 'object' && value !== null && 'type' in value || !Array.isArray(value) : stryMutAct_9fa48("96") ? true : (stryCov_9fa48("96", "97"), (stryMutAct_9fa48("99") ? typeof value === 'object' && value !== null || 'type' in value : stryMutAct_9fa48("98") ? true : (stryCov_9fa48("98", "99"), (stryMutAct_9fa48("101") ? typeof value === 'object' || value !== null : stryMutAct_9fa48("100") ? true : (stryCov_9fa48("100", "101"), (stryMutAct_9fa48("103") ? typeof value !== 'object' : stryMutAct_9fa48("102") ? true : (stryCov_9fa48("102", "103"), typeof value === (stryMutAct_9fa48("104") ? "" : (stryCov_9fa48("104"), 'object')))) && (stryMutAct_9fa48("106") ? value === null : stryMutAct_9fa48("105") ? true : (stryCov_9fa48("105", "106"), value !== null)))) && (stryMutAct_9fa48("107") ? "" : (stryCov_9fa48("107"), 'type')) in value)) && (stryMutAct_9fa48("108") ? Array.isArray(value) : (stryCov_9fa48("108"), !Array.isArray(value))))) && (stryMutAct_9fa48("110") ? typeof value.type !== 'string' : stryMutAct_9fa48("109") ? true : (stryCov_9fa48("109", "110"), typeof value.type === (stryMutAct_9fa48("111") ? "" : (stryCov_9fa48("111"), 'string')))));
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
  if (stryMutAct_9fa48("112")) {
    {}
  } else {
    stryCov_9fa48("112");
    return stryMutAct_9fa48("115") ? typeof value === 'object' && value !== null || !Array.isArray(value) : stryMutAct_9fa48("114") ? false : stryMutAct_9fa48("113") ? true : (stryCov_9fa48("113", "114", "115"), (stryMutAct_9fa48("117") ? typeof value === 'object' || value !== null : stryMutAct_9fa48("116") ? true : (stryCov_9fa48("116", "117"), (stryMutAct_9fa48("119") ? typeof value !== 'object' : stryMutAct_9fa48("118") ? true : (stryCov_9fa48("118", "119"), typeof value === (stryMutAct_9fa48("120") ? "" : (stryCov_9fa48("120"), 'object')))) && (stryMutAct_9fa48("122") ? value === null : stryMutAct_9fa48("121") ? true : (stryCov_9fa48("121", "122"), value !== null)))) && (stryMutAct_9fa48("123") ? Array.isArray(value) : (stryCov_9fa48("123"), !Array.isArray(value))));
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
  if (stryMutAct_9fa48("124")) {
    {}
  } else {
    stryCov_9fa48("124");
    if (stryMutAct_9fa48("127") ? false : stryMutAct_9fa48("126") ? true : stryMutAct_9fa48("125") ? isHolder(value) : (stryCov_9fa48("125", "126", "127"), !isHolder(value))) return null;
    return stryMutAct_9fa48("128") ? value[key] && null : (stryCov_9fa48("128"), value[key] ?? null);
  }
}

/**
 * Visit every node below a root, parents before children.
 * @param root - the node, or array of nodes, to start from.
 * @param visit - called once per node.
 */
export function walk(root: Field | undefined, visit: (node: Node) => void): void {
  if (stryMutAct_9fa48("129")) {
    {}
  } else {
    stryCov_9fa48("129");
    if (stryMutAct_9fa48("131") ? false : stryMutAct_9fa48("130") ? true : (stryCov_9fa48("130", "131"), Array.isArray(root))) {
      if (stryMutAct_9fa48("132")) {
        {}
      } else {
        stryCov_9fa48("132");
        for (const item of root) if (stryMutAct_9fa48("133")) {
          ;
        } else {
          stryCov_9fa48("133");
          walk(item, visit);
        }
        return;
      }
    }
    if (stryMutAct_9fa48("136") ? false : stryMutAct_9fa48("135") ? true : stryMutAct_9fa48("134") ? isNode(root) : (stryCov_9fa48("134", "135", "136"), !isNode(root))) return;
    if (stryMutAct_9fa48("137")) {
      ;
    } else {
      stryCov_9fa48("137");
      visit(root);
    }
    for (const [key, value] of Object.entries(root)) {
      if (stryMutAct_9fa48("138")) {
        {}
      } else {
        stryCov_9fa48("138");
        if (stryMutAct_9fa48("141") ? key === 'type' : stryMutAct_9fa48("140") ? false : stryMutAct_9fa48("139") ? true : (stryCov_9fa48("139", "140", "141"), key !== (stryMutAct_9fa48("142") ? "" : (stryCov_9fa48("142"), 'type')))) if (stryMutAct_9fa48("143")) {
          ;
        } else {
          stryCov_9fa48("143");
          walk(value, visit);
        }
      }
    }
  }
}

/** Node types that change nothing about the value they hold. */
const TRANSPARENT = new Set(stryMutAct_9fa48("144") ? [] : (stryCov_9fa48("144"), [stryMutAct_9fa48("145") ? "" : (stryCov_9fa48("145"), 'ParenthesizedExpression'), stryMutAct_9fa48("146") ? "" : (stryCov_9fa48("146"), 'TSAsExpression'), stryMutAct_9fa48("147") ? "" : (stryCov_9fa48("147"), 'TSSatisfiesExpression'), stryMutAct_9fa48("148") ? "" : (stryCov_9fa48("148"), 'TSNonNullExpression'), stryMutAct_9fa48("149") ? "" : (stryCov_9fa48("149"), 'TSInstantiationExpression')]));

/**
 * The expression inside any number of nodes that do not change it.
 * @param value - the node to read.
 * @returns the innermost expression, or the value unchanged.
 */
export function unwrap(value: Field | undefined): Field | undefined {
  if (stryMutAct_9fa48("150")) {
    {}
  } else {
    stryCov_9fa48("150");
    let inner = value;
    // Bounded so a tree that somehow refers to itself cannot spin here.
    for (let depth = 0; stryMutAct_9fa48("153") ? depth >= 32 : stryMutAct_9fa48("152") ? depth <= 32 : stryMutAct_9fa48("151") ? false : (stryCov_9fa48("151", "152", "153"), depth < 32); stryMutAct_9fa48("154") ? depth -= 1 : (stryCov_9fa48("154"), depth += 1)) {
      if (stryMutAct_9fa48("155")) {
        {}
      } else {
        stryCov_9fa48("155");
        if (stryMutAct_9fa48("158") ? !isNode(inner) && !TRANSPARENT.has(inner.type) : stryMutAct_9fa48("157") ? false : stryMutAct_9fa48("156") ? true : (stryCov_9fa48("156", "157", "158"), (stryMutAct_9fa48("159") ? isNode(inner) : (stryCov_9fa48("159"), !isNode(inner))) || (stryMutAct_9fa48("160") ? TRANSPARENT.has(inner.type) : (stryCov_9fa48("160"), !TRANSPARENT.has(inner.type))))) return inner;
        inner = inner.expression;
      }
    }
    return inner;
  }
}

/**
 * The nodes one field holds, when it holds a list of them.
 *
 * A field is whatever the parser put there, so the list is filtered rather
 * than asserted: a declarations array carrying anything but nodes yields the
 * nodes it does carry, and a field that is not a list at all yields none.
 * @param value - the field to read.
 * @returns the nodes, in the order the field holds them.
 */
export function nodesOf(value: Field | undefined): readonly Node[] {
  if (stryMutAct_9fa48("161")) {
    {}
  } else {
    stryCov_9fa48("161");
    return Array.isArray(value) ? stryMutAct_9fa48("162") ? value : (stryCov_9fa48("162"), value.filter(stryMutAct_9fa48("163") ? () => undefined : (stryCov_9fa48("163"), one => isNode(one)))) : stryMutAct_9fa48("164") ? ["Stryker was here"] : (stryCov_9fa48("164"), []);
  }
}

/**
 * One field read as a node, or the node given when it does not hold one.
 * @param value - the field to read.
 * @param instead - the node to answer with when the field holds none.
 * @returns the field's node, or the one given.
 */
export function nodeOr(value: Field | undefined, instead: Node): Node {
  if (stryMutAct_9fa48("165")) {
    {}
  } else {
    stryCov_9fa48("165");
    return isNode(value) ? value : instead;
  }
}

/**
 * The property name a member expression reads, when it is written plainly.
 * @param node - the member expression.
 * @returns the name, or undefined when it is computed or not an identifier.
 */
export function memberName(node: Node): string | undefined {
  if (stryMutAct_9fa48("166")) {
    {}
  } else {
    stryCov_9fa48("166");
    if (stryMutAct_9fa48("169") ? node.computed !== true : stryMutAct_9fa48("168") ? false : stryMutAct_9fa48("167") ? true : (stryCov_9fa48("167", "168", "169"), node.computed === (stryMutAct_9fa48("170") ? false : (stryCov_9fa48("170"), true)))) return undefined;
    const property = unwrap(node.property);
    return (stryMutAct_9fa48("173") ? isNode(property) && property.type === 'Identifier' || typeof property.name === 'string' : stryMutAct_9fa48("172") ? false : stryMutAct_9fa48("171") ? true : (stryCov_9fa48("171", "172", "173"), (stryMutAct_9fa48("175") ? isNode(property) || property.type === 'Identifier' : stryMutAct_9fa48("174") ? true : (stryCov_9fa48("174", "175"), isNode(property) && (stryMutAct_9fa48("177") ? property.type !== 'Identifier' : stryMutAct_9fa48("176") ? true : (stryCov_9fa48("176", "177"), property.type === (stryMutAct_9fa48("178") ? "" : (stryCov_9fa48("178"), 'Identifier')))))) && (stryMutAct_9fa48("180") ? typeof property.name !== 'string' : stryMutAct_9fa48("179") ? true : (stryCov_9fa48("179", "180"), typeof property.name === (stryMutAct_9fa48("181") ? "" : (stryCov_9fa48("181"), 'string')))))) ? property.name : undefined;
  }
}

/**
 * Read one of the parser's interface-typed statements as the structural node
 * the gates walk.
 *
 * Checked rather than asserted. A statement carrying no `type` is not one the
 * walk can read, and asserting it into the shape put a value the gates cannot
 * address at the head of the tree — where every rule would then read
 * `undefined` from it and find nothing to refuse.
 * @param value - the statement, as the parser types it.
 * @param label - the path, named when a statement cannot be read.
 * @returns the same object, as the walk reads it.
 * @throws Error when the parser handed out a statement carrying no type.
 */
function asNode(value: object, label: string): Node {
  if (stryMutAct_9fa48("182")) {
    {}
  } else {
    stryCov_9fa48("182");
    if (stryMutAct_9fa48("185") ? false : stryMutAct_9fa48("184") ? true : stryMutAct_9fa48("183") ? isNode(value) : (stryCov_9fa48("183", "184", "185"), !isNode(value))) throw new Error(stryMutAct_9fa48("187") ? `` : (stryCov_9fa48("187"), `${label}: the parser produced a statement with no type`));
    return value;
  }
}

/**
 * Parse one script, keeping everything the gates read off it.
 * @param label - the path, which selects the dialect.
 * @param text - the file's contents.
 * @returns the tree, the comments, the errors and the line lookup.
 */
export function parseScript(label: string, text: string): Parsed {
  if (stryMutAct_9fa48("188")) {
    {}
  } else {
    stryCov_9fa48("188");
    const parsed = parseSync(label, text);
    const at = lineReader(text);
    return stryMutAct_9fa48("189") ? {} : (stryCov_9fa48("189"), {
      body: parsed.program.body.map(stryMutAct_9fa48("190") ? () => undefined : (stryCov_9fa48("190"), statement => asNode(statement, label))),
      comments: parsed.comments,
      errors: parsed.errors,
      lineAt: stryMutAct_9fa48("191") ? () => undefined : (stryCov_9fa48("191"), (offset: Field | undefined) => (stryMutAct_9fa48("194") ? typeof offset !== 'number' : stryMutAct_9fa48("193") ? false : stryMutAct_9fa48("192") ? true : (stryCov_9fa48("192", "193", "194"), typeof offset === (stryMutAct_9fa48("195") ? "" : (stryCov_9fa48("195"), 'number')))) ? at(offset) : 1)
    });
  }
}