/**
 * What markup is refused, read out by the parser a browser would use.
 *
 * parse5 implements the HTML parsing algorithm, so an attribute is found
 * wherever a browser would find one: in any case, quoted or not, inside a
 * template, and however the surrounding tags are malformed.
 *
 * Beyond the style attribute, what is refused is anything a page would have to
 * ship inline: an event handler, a script body, or a style block. Each of
 * those is a per-page one-off that no module ships and no gate reads once it
 * is inside a tag, so none may exist in the first place. The per-attribute
 * refusals — wiring, raw utility values, layout attributes, framework
 * directives and remote loads — live in `markup-attributes.ts`.
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
import { type DefaultTreeAdapterTypes, parse } from 'parse5';
import { type Attributes, type MarkupOffence, REMOTE_URL, recordAttributeOffences } from './markup-attributes.ts';
import type { Offence } from './offence.ts';

/** The attribute this gate exists to keep out of the product. */
const STYLE_ATTRIBUTE = stryMutAct_9fa48("1472") ? "" : (stryCov_9fa48("1472"), 'style');

/** An inline event handler attribute: a per-page script no module ships. */
const HANDLER = stryMutAct_9fa48("1476") ? /^on[^a-z]+$/iu : stryMutAct_9fa48("1475") ? /^on[a-z]$/iu : stryMutAct_9fa48("1474") ? /^on[a-z]+/iu : stryMutAct_9fa48("1473") ? /on[a-z]+$/iu : (stryCov_9fa48("1473", "1474", "1475", "1476"), /^on[a-z]+$/iu);

/**
 * A URL scheme that executes text as code.
 *
 * A `javascript:` URL is an inline script with nowhere to hang a handler ban,
 * so it slips past both the handler rule and the script-body rule while doing
 * exactly what they refuse. `vbscript:` is the same construct, and a
 * `data:text/html` document runs its payload in the page's origin.
 */
const SCRIPTED_URL = stryMutAct_9fa48("1477") ? /(?:javascript|vbscript):|data:text\/html/iu : (stryCov_9fa48("1477"), /^(?:javascript|vbscript):|data:text\/html/iu);

/** Attributes a browser navigates on, so a scripted URL in them runs. */
const URL_ATTRIBUTES = new Set(stryMutAct_9fa48("1478") ? [] : (stryCov_9fa48("1478"), [stryMutAct_9fa48("1479") ? "" : (stryCov_9fa48("1479"), 'href'), stryMutAct_9fa48("1480") ? "" : (stryCov_9fa48("1480"), 'src'), stryMutAct_9fa48("1481") ? "" : (stryCov_9fa48("1481"), 'action'), stryMutAct_9fa48("1482") ? "" : (stryCov_9fa48("1482"), 'formaction'), stryMutAct_9fa48("1483") ? "" : (stryCov_9fa48("1483"), 'xlink:href'), stryMutAct_9fa48("1484") ? "" : (stryCov_9fa48("1484"), 'poster'), stryMutAct_9fa48("1485") ? "" : (stryCov_9fa48("1485"), 'data'), stryMutAct_9fa48("1486") ? "" : (stryCov_9fa48("1486"), 'cite')]));

/**
 * Elements the platform retired because they decide alignment or type in the
 * tag itself.
 *
 * The centering element, the type element and the marquee are alignment,
 * type and motion a page ships inline; the sheet is where those decisions
 * live, and a tag that carries one arrives with no class for a gate to read.
 */
const PRESENTATIONAL_ELEMENTS = new Set(stryMutAct_9fa48("1487") ? [] : (stryCov_9fa48("1487"), [stryMutAct_9fa48("1488") ? "" : (stryCov_9fa48("1488"), 'center'), stryMutAct_9fa48("1489") ? "" : (stryCov_9fa48("1489"), 'font'), stryMutAct_9fa48("1490") ? "" : (stryCov_9fa48("1490"), 'marquee')]));

/** The one element a document may carry, whose duplication splits the shell a reader lands in. */
const LANDMARK = stryMutAct_9fa48("1491") ? "" : (stryCov_9fa48("1491"), 'main');

/**
 * Whether an attribute value navigates to a scripted URL.
 *
 * A browser strips ASCII control characters and leading whitespace before it
 * reads the scheme, so the gate reads the value the same way: a tab inside
 * `java\tscript:` is how the prefix is spelled to get past a plain test.
 * @param value - the attribute's value, entities already decoded by the parser.
 * @returns true when the scheme executes text as code.
 */
function isScriptedUrl(value: string): boolean {
  if (stryMutAct_9fa48("1492")) {
    {}
  } else {
    stryCov_9fa48("1492");
    // Every character a browser skips is at or below the space, and a filter
    // over code points reads the same set without spelling control characters
    // out — the way a regex would — to a reader or a rule about them.
    const stripped = stryMutAct_9fa48("1493") ? [...value].join('') : (stryCov_9fa48("1493"), (stryMutAct_9fa48("1494") ? [] : (stryCov_9fa48("1494"), [...value])).filter(stryMutAct_9fa48("1495") ? () => undefined : (stryCov_9fa48("1495"), char => stryMutAct_9fa48("1499") ? (char.codePointAt(0) ?? 0) <= 32 : stryMutAct_9fa48("1498") ? (char.codePointAt(0) ?? 0) >= 32 : stryMutAct_9fa48("1497") ? false : stryMutAct_9fa48("1496") ? true : (stryCov_9fa48("1496", "1497", "1498", "1499"), (stryMutAct_9fa48("1500") ? char.codePointAt(0) && 0 : (stryCov_9fa48("1500"), char.codePointAt(0) ?? 0)) > 32))).join(stryMutAct_9fa48("1501") ? "Stryker was here!" : (stryCov_9fa48("1501"), '')));
    return SCRIPTED_URL.test(stripped);
  }
}

/**
 * Whether a meta refresh redirects the page to a remote address.
 *
 * A refresh is navigation the page performs on its own, and a remote target is
 * a load outside the bundle that no manifest declares; a local one is an
 * internal redirect, which is what remains.
 * @param content - the meta content value.
 * @returns true when it redirects to a remote URL.
 */
function isRemoteRefresh(content: string): boolean {
  if (stryMutAct_9fa48("1502")) {
    {}
  } else {
    stryCov_9fa48("1502");
    const target = (stryMutAct_9fa48("1510") ? /url\s*=\s*["']?(["';]+)/iu : stryMutAct_9fa48("1509") ? /url\s*=\s*["']?([^"';])/iu : stryMutAct_9fa48("1508") ? /url\s*=\s*[^"']?([^"';]+)/iu : stryMutAct_9fa48("1507") ? /url\s*=\s*["']([^"';]+)/iu : stryMutAct_9fa48("1506") ? /url\s*=\S*["']?([^"';]+)/iu : stryMutAct_9fa48("1505") ? /url\s*=\s["']?([^"';]+)/iu : stryMutAct_9fa48("1504") ? /url\S*=\s*["']?([^"';]+)/iu : stryMutAct_9fa48("1503") ? /url\s=\s*["']?([^"';]+)/iu : (stryCov_9fa48("1503", "1504", "1505", "1506", "1507", "1508", "1509", "1510"), /url\s*=\s*["']?([^"';]+)/iu)).exec(content);
    return stryMutAct_9fa48("1513") ? target !== null || REMOTE_URL.test((target[1] ?? '').trim()) : stryMutAct_9fa48("1512") ? false : stryMutAct_9fa48("1511") ? true : (stryCov_9fa48("1511", "1512", "1513"), (stryMutAct_9fa48("1515") ? target === null : stryMutAct_9fa48("1514") ? true : (stryCov_9fa48("1514", "1515"), target !== null)) && REMOTE_URL.test(stryMutAct_9fa48("1516") ? target[1] ?? '' : (stryCov_9fa48("1516"), (stryMutAct_9fa48("1517") ? target[1] && '' : (stryCov_9fa48("1517"), target[1] ?? (stryMutAct_9fa48("1518") ? "Stryker was here!" : (stryCov_9fa48("1518"), '')))).trim())));
  }
}

/**
 * The offence a meta element carries, when it redirects the page to a remote
 * address.
 * @param attrs - the element's attributes.
 * @param line - the line the element starts on.
 * @returns the offence, or undefined when the meta is not a remote redirect.
 */
function metaRedirectOffence(attrs: Attributes, line: number): MarkupOffence | undefined {
  if (stryMutAct_9fa48("1519")) {
    {}
  } else {
    stryCov_9fa48("1519");
    const equiv = attrs.find(stryMutAct_9fa48("1520") ? () => undefined : (stryCov_9fa48("1520"), attribute => stryMutAct_9fa48("1523") ? attribute.name.toLowerCase() !== 'http-equiv' : stryMutAct_9fa48("1522") ? false : stryMutAct_9fa48("1521") ? true : (stryCov_9fa48("1521", "1522", "1523"), (stryMutAct_9fa48("1524") ? attribute.name.toUpperCase() : (stryCov_9fa48("1524"), attribute.name.toLowerCase())) === (stryMutAct_9fa48("1525") ? "" : (stryCov_9fa48("1525"), 'http-equiv')))));
    const content = attrs.find(stryMutAct_9fa48("1526") ? () => undefined : (stryCov_9fa48("1526"), attribute => stryMutAct_9fa48("1529") ? attribute.name.toLowerCase() !== 'content' : stryMutAct_9fa48("1528") ? false : stryMutAct_9fa48("1527") ? true : (stryCov_9fa48("1527", "1528", "1529"), (stryMutAct_9fa48("1530") ? attribute.name.toUpperCase() : (stryCov_9fa48("1530"), attribute.name.toLowerCase())) === (stryMutAct_9fa48("1531") ? "" : (stryCov_9fa48("1531"), 'content')))));
    if (stryMutAct_9fa48("1534") ? (equiv?.value ?? '').toLowerCase() !== 'refresh' && !isRemoteRefresh(content?.value ?? '') : stryMutAct_9fa48("1533") ? false : stryMutAct_9fa48("1532") ? true : (stryCov_9fa48("1532", "1533", "1534"), (stryMutAct_9fa48("1536") ? (equiv?.value ?? '').toLowerCase() === 'refresh' : stryMutAct_9fa48("1535") ? false : (stryCov_9fa48("1535", "1536"), (stryMutAct_9fa48("1537") ? (equiv?.value ?? '').toUpperCase() : (stryCov_9fa48("1537"), (stryMutAct_9fa48("1538") ? equiv?.value && '' : (stryCov_9fa48("1538"), (stryMutAct_9fa48("1539") ? equiv.value : (stryCov_9fa48("1539"), equiv?.value)) ?? (stryMutAct_9fa48("1540") ? "Stryker was here!" : (stryCov_9fa48("1540"), '')))).toLowerCase())) !== (stryMutAct_9fa48("1541") ? "" : (stryCov_9fa48("1541"), 'refresh')))) || (stryMutAct_9fa48("1542") ? isRemoteRefresh(content?.value ?? '') : (stryCov_9fa48("1542"), !isRemoteRefresh(stryMutAct_9fa48("1543") ? content?.value && '' : (stryCov_9fa48("1543"), (stryMutAct_9fa48("1544") ? content.value : (stryCov_9fa48("1544"), content?.value)) ?? (stryMutAct_9fa48("1545") ? "Stryker was here!" : (stryCov_9fa48("1545"), '')))))))) return undefined;
    return stryMutAct_9fa48("1546") ? {} : (stryCov_9fa48("1546"), {
      line,
      why: stryMutAct_9fa48("1547") ? "" : (stryCov_9fa48("1547"), 'a meta refresh to a remote address loads outside the bundle; redirect in a module instead')
    });
  }
}

/** A parse5 element, and the children every node may carry. */
type Parsed = DefaultTreeAdapterTypes.Node & {
  childNodes?: readonly DefaultTreeAdapterTypes.Node[];
  content?: DefaultTreeAdapterTypes.DocumentFragment;
  attrs?: Attributes;
  tagName?: string;
  sourceCodeLocation?: {
    readonly startLine?: number;
  } | null;
};

/**
 * An htmx custom element. htmx 4 introduced tags of its own alongside its
 * attributes, and they carry the same behaviour-in-the-markup this refuses.
 */
const HTMX_ELEMENT = stryMutAct_9fa48("1548") ? /hx-/u : (stryCov_9fa48("1548"), /^hx-/u);

/**
 * What one element carries in its own tag: an inline style, an inline handler,
 * or a tag name a retired framework defines.
 * @param attrs - the element's attributes.
 * @param tag - the lowercased tag name, when the node has one.
 * @param line - the line the element opens on.
 * @param found - collects the offences.
 */
function recordElementOffences(attrs: Attributes, tag: string | undefined, line: number, found: {
  line: number;
  why: string;
}[]): void {
  if (stryMutAct_9fa48("1549")) {
    {}
  } else {
    stryCov_9fa48("1549");
    if (stryMutAct_9fa48("1552") ? attrs.every(attribute => attribute.name.toLowerCase() === STYLE_ATTRIBUTE) : stryMutAct_9fa48("1551") ? false : stryMutAct_9fa48("1550") ? true : (stryCov_9fa48("1550", "1551", "1552"), attrs.some(stryMutAct_9fa48("1553") ? () => undefined : (stryCov_9fa48("1553"), attribute => stryMutAct_9fa48("1556") ? attribute.name.toLowerCase() !== STYLE_ATTRIBUTE : stryMutAct_9fa48("1555") ? false : stryMutAct_9fa48("1554") ? true : (stryCov_9fa48("1554", "1555", "1556"), (stryMutAct_9fa48("1557") ? attribute.name.toUpperCase() : (stryCov_9fa48("1557"), attribute.name.toLowerCase())) === STYLE_ATTRIBUTE))))) {
      if (stryMutAct_9fa48("1558")) {
        {}
      } else {
        stryCov_9fa48("1558");
        found.push(stryMutAct_9fa48("1560") ? {} : (stryCov_9fa48("1560"), {
          line,
          why: stryMutAct_9fa48("1561") ? "" : (stryCov_9fa48("1561"), 'a style attribute is an inline style; put the rule in a stylesheet and add a class')
        }));
      }
    }
    if (stryMutAct_9fa48("1564") ? attrs.every(attribute => HANDLER.test(attribute.name)) : stryMutAct_9fa48("1563") ? false : stryMutAct_9fa48("1562") ? true : (stryCov_9fa48("1562", "1563", "1564"), attrs.some(stryMutAct_9fa48("1565") ? () => undefined : (stryCov_9fa48("1565"), attribute => HANDLER.test(attribute.name))))) {
      if (stryMutAct_9fa48("1566")) {
        {}
      } else {
        stryCov_9fa48("1566");
        found.push(stryMutAct_9fa48("1568") ? {} : (stryCov_9fa48("1568"), {
          line,
          why: stryMutAct_9fa48("1569") ? "" : (stryCov_9fa48("1569"), 'an inline event handler is a per-page script; attach the listener in a module')
        }));
      }
    }
    // htmx 4 ships custom elements, not only attributes: its partial tag is the
    // documented replacement for the out-of-band swap attribute. A gate that
    // reads attributes alone sees an ordinary unknown element and says nothing.
    if (stryMutAct_9fa48("1572") ? tag !== undefined || HTMX_ELEMENT.test(tag) : stryMutAct_9fa48("1571") ? false : stryMutAct_9fa48("1570") ? true : (stryCov_9fa48("1570", "1571", "1572"), (stryMutAct_9fa48("1574") ? tag === undefined : stryMutAct_9fa48("1573") ? true : (stryCov_9fa48("1573", "1574"), tag !== undefined)) && HTMX_ELEMENT.test(tag))) {
      if (stryMutAct_9fa48("1575")) {
        {}
      } else {
        stryCov_9fa48("1575");
        found.push(stryMutAct_9fa48("1577") ? {} : (stryCov_9fa48("1577"), {
          line,
          why: stryMutAct_9fa48("1578") ? `` : (stryCov_9fa48("1578"), `<${tag}> is an htmx element; render the markup and attach the listener in a module`)
        }));
      }
    }
  }
}

/**
 * Every navigable attribute of one element that runs its value as code.
 * @param attrs - the element's attributes.
 * @param line - the line the element opens on.
 * @returns one offence per scripted URL.
 */
function scriptedUrlOffences(attrs: Attributes, line: number): MarkupOffence[] {
  if (stryMutAct_9fa48("1579")) {
    {}
  } else {
    stryCov_9fa48("1579");
    return stryMutAct_9fa48("1580") ? attrs.map(() => ({
      line,
      why: 'a URL that executes text as code is an inline script; navigate by address or call a module'
    })) : (stryCov_9fa48("1580"), attrs.filter(stryMutAct_9fa48("1581") ? () => undefined : (stryCov_9fa48("1581"), attribute => stryMutAct_9fa48("1584") ? URL_ATTRIBUTES.has(attribute.name.toLowerCase()) || isScriptedUrl(attribute.value ?? '') : stryMutAct_9fa48("1583") ? false : stryMutAct_9fa48("1582") ? true : (stryCov_9fa48("1582", "1583", "1584"), URL_ATTRIBUTES.has(stryMutAct_9fa48("1585") ? attribute.name.toUpperCase() : (stryCov_9fa48("1585"), attribute.name.toLowerCase())) && isScriptedUrl(stryMutAct_9fa48("1586") ? attribute.value && '' : (stryCov_9fa48("1586"), attribute.value ?? (stryMutAct_9fa48("1587") ? "Stryker was here!" : (stryCov_9fa48("1587"), ''))))))).map(stryMutAct_9fa48("1588") ? () => undefined : (stryCov_9fa48("1588"), () => stryMutAct_9fa48("1589") ? {} : (stryCov_9fa48("1589"), {
      line,
      why: stryMutAct_9fa48("1590") ? "" : (stryCov_9fa48("1590"), 'a URL that executes text as code is an inline script; navigate by address or call a module')
    }))));
  }
}

/**
 * What one element's tag name refuses, given what the tag carries.
 *
 * Each of these is a decision about a single tag, so they are answered here
 * rather than inside the walk: the walk's own job is which nodes are visited
 * and how many landmarks have been seen, and while these sat beside it a
 * reader had to hold both at once.
 * @param tag - the lowercased tag name, when the node has one.
 * @param attrs - the element's attributes.
 * @param line - the line the element opens on.
 * @returns the offences, or an empty list.
 */
function tagOffences(tag: string | undefined, attrs: Attributes, line: number): MarkupOffence[] {
  if (stryMutAct_9fa48("1591")) {
    {}
  } else {
    stryCov_9fa48("1591");
    if (stryMutAct_9fa48("1594") ? tag !== 'script' : stryMutAct_9fa48("1593") ? false : stryMutAct_9fa48("1592") ? true : (stryCov_9fa48("1592", "1593", "1594"), tag === (stryMutAct_9fa48("1595") ? "" : (stryCov_9fa48("1595"), 'script')))) {
      if (stryMutAct_9fa48("1596")) {
        {}
      } else {
        stryCov_9fa48("1596");
        return (stryMutAct_9fa48("1597") ? attrs.every(attribute => attribute.name.toLowerCase() === 'src') : (stryCov_9fa48("1597"), attrs.some(stryMutAct_9fa48("1598") ? () => undefined : (stryCov_9fa48("1598"), attribute => stryMutAct_9fa48("1601") ? attribute.name.toLowerCase() !== 'src' : stryMutAct_9fa48("1600") ? false : stryMutAct_9fa48("1599") ? true : (stryCov_9fa48("1599", "1600", "1601"), (stryMutAct_9fa48("1602") ? attribute.name.toUpperCase() : (stryCov_9fa48("1602"), attribute.name.toLowerCase())) === (stryMutAct_9fa48("1603") ? "" : (stryCov_9fa48("1603"), 'src'))))))) ? stryMutAct_9fa48("1604") ? ["Stryker was here"] : (stryCov_9fa48("1604"), []) : stryMutAct_9fa48("1605") ? [] : (stryCov_9fa48("1605"), [stryMutAct_9fa48("1606") ? {} : (stryCov_9fa48("1606"), {
          line,
          why: stryMutAct_9fa48("1607") ? "" : (stryCov_9fa48("1607"), 'an inline script is a per-page script; ship a module and load it by src')
        })]);
      }
    }
    if (stryMutAct_9fa48("1610") ? tag !== 'style' : stryMutAct_9fa48("1609") ? false : stryMutAct_9fa48("1608") ? true : (stryCov_9fa48("1608", "1609", "1610"), tag === (stryMutAct_9fa48("1611") ? "" : (stryCov_9fa48("1611"), 'style')))) return stryMutAct_9fa48("1612") ? [] : (stryCov_9fa48("1612"), [stryMutAct_9fa48("1613") ? {} : (stryCov_9fa48("1613"), {
      line,
      why: stryMutAct_9fa48("1614") ? "" : (stryCov_9fa48("1614"), 'an inline stylesheet is a per-page sheet; ship a file and link it')
    })]);
    if (stryMutAct_9fa48("1617") ? tag !== 'meta' : stryMutAct_9fa48("1616") ? false : stryMutAct_9fa48("1615") ? true : (stryCov_9fa48("1615", "1616", "1617"), tag === (stryMutAct_9fa48("1618") ? "" : (stryCov_9fa48("1618"), 'meta')))) {
      if (stryMutAct_9fa48("1619")) {
        {}
      } else {
        stryCov_9fa48("1619");
        const redirect = metaRedirectOffence(attrs, line);
        return (stryMutAct_9fa48("1622") ? redirect !== undefined : stryMutAct_9fa48("1621") ? false : stryMutAct_9fa48("1620") ? true : (stryCov_9fa48("1620", "1621", "1622"), redirect === undefined)) ? stryMutAct_9fa48("1623") ? ["Stryker was here"] : (stryCov_9fa48("1623"), []) : stryMutAct_9fa48("1624") ? [] : (stryCov_9fa48("1624"), [redirect]);
      }
    }
    if (stryMutAct_9fa48("1627") ? tag !== undefined || PRESENTATIONAL_ELEMENTS.has(tag) : stryMutAct_9fa48("1626") ? false : stryMutAct_9fa48("1625") ? true : (stryCov_9fa48("1625", "1626", "1627"), (stryMutAct_9fa48("1629") ? tag === undefined : stryMutAct_9fa48("1628") ? true : (stryCov_9fa48("1628", "1629"), tag !== undefined)) && PRESENTATIONAL_ELEMENTS.has(tag))) {
      if (stryMutAct_9fa48("1630")) {
        {}
      } else {
        stryCov_9fa48("1630");
        return stryMutAct_9fa48("1631") ? [] : (stryCov_9fa48("1631"), [stryMutAct_9fa48("1632") ? {} : (stryCov_9fa48("1632"), {
          line,
          why: stryMutAct_9fa48("1633") ? "" : (stryCov_9fa48("1633"), 'a retired presentational tag is alignment or type in markup; use the stylesheet')
        })]);
      }
    }
    return stryMutAct_9fa48("1634") ? ["Stryker was here"] : (stryCov_9fa48("1634"), []);
  }
}

/**
 * Every construct a fragment carries that no page may ship inline.
 *
 * Parsed in document mode, not fragment mode: the fragment algorithm ignores
 * `html`, `head` and `body` start tags, and those are exactly where a theme
 * hook such as daisyUI's `data-theme` is written. A document parse keeps those
 * elements and their attributes in the tree, so the refusal reaches the shape
 * a framework reintroduction would actually take.
 * @param text - the markup.
 * @returns one entry per refused construct, with the line it starts on.
 */
export function markupOffences(text: string): MarkupOffence[] {
  if (stryMutAct_9fa48("1635")) {
    {}
  } else {
    stryCov_9fa48("1635");
    const found: MarkupOffence[] = stryMutAct_9fa48("1636") ? ["Stryker was here"] : (stryCov_9fa48("1636"), []);
    let landmarks = 0;
    // The count is the whole of what this needs to remember, so it is kept
    // beside the walk rather than inside it: the walk then states which nodes
    // are visited and nothing else.
    const landmarkOffences = (tag: string | undefined, line: number): MarkupOffence[] => {
      if (stryMutAct_9fa48("1637")) {
        {}
      } else {
        stryCov_9fa48("1637");
        if (stryMutAct_9fa48("1640") ? tag === LANDMARK : stryMutAct_9fa48("1639") ? false : stryMutAct_9fa48("1638") ? true : (stryCov_9fa48("1638", "1639", "1640"), tag !== LANDMARK)) return stryMutAct_9fa48("1641") ? ["Stryker was here"] : (stryCov_9fa48("1641"), []);
        stryMutAct_9fa48("1642") ? landmarks -= 1 : (stryCov_9fa48("1642"), landmarks += 1);
        return (stryMutAct_9fa48("1646") ? landmarks <= 1 : stryMutAct_9fa48("1645") ? landmarks >= 1 : stryMutAct_9fa48("1644") ? false : stryMutAct_9fa48("1643") ? true : (stryCov_9fa48("1643", "1644", "1645", "1646"), landmarks > 1)) ? stryMutAct_9fa48("1647") ? [] : (stryCov_9fa48("1647"), [stryMutAct_9fa48("1648") ? {} : (stryCov_9fa48("1648"), {
          line,
          why: stryMutAct_9fa48("1649") ? "" : (stryCov_9fa48("1649"), 'a second main splits the shell; a document carries one')
        })]) : stryMutAct_9fa48("1650") ? ["Stryker was here"] : (stryCov_9fa48("1650"), []);
      }
    };
    const visit = (node: Parsed): void => {
      if (stryMutAct_9fa48("1651")) {
        {}
      } else {
        stryCov_9fa48("1651");
        const line = stryMutAct_9fa48("1652") ? node.sourceCodeLocation?.startLine && 1 : (stryCov_9fa48("1652"), (stryMutAct_9fa48("1653") ? node.sourceCodeLocation.startLine : (stryCov_9fa48("1653"), node.sourceCodeLocation?.startLine)) ?? 1);
        const attrs = stryMutAct_9fa48("1654") ? node.attrs && [] : (stryCov_9fa48("1654"), node.attrs ?? (stryMutAct_9fa48("1655") ? ["Stryker was here"] : (stryCov_9fa48("1655"), [])));
        const tag = (stryMutAct_9fa48("1658") ? typeof node.tagName !== 'string' : stryMutAct_9fa48("1657") ? false : stryMutAct_9fa48("1656") ? true : (stryCov_9fa48("1656", "1657", "1658"), typeof node.tagName === (stryMutAct_9fa48("1659") ? "" : (stryCov_9fa48("1659"), 'string')))) ? stryMutAct_9fa48("1660") ? node.tagName.toUpperCase() : (stryCov_9fa48("1660"), node.tagName.toLowerCase()) : undefined;
        if (stryMutAct_9fa48("1661")) {
          ;
        } else {
          stryCov_9fa48("1661");
          recordElementOffences(attrs, tag, line, found);
        }
        if (stryMutAct_9fa48("1662")) {
          ;
        } else {
          stryCov_9fa48("1662");
          recordAttributeOffences(attrs, tag, line, found);
        }
        if (stryMutAct_9fa48("1663")) {
          ;
        } else {
          stryCov_9fa48("1663");
          found.push(...scriptedUrlOffences(attrs, line), ...tagOffences(tag, attrs, line), ...landmarkOffences(tag, line));
        } // The child lists are read as the parser types them. `Parsed` only adds
        // optional members over that type, so a child already is one and needs no
        // assertion claiming it carries them.
        for (const child of stryMutAct_9fa48("1664") ? node.childNodes && [] : (stryCov_9fa48("1664"), node.childNodes ?? (stryMutAct_9fa48("1665") ? ["Stryker was here"] : (stryCov_9fa48("1665"), [])))) if (stryMutAct_9fa48("1666")) {
          ;
        } else {
          stryCov_9fa48("1666");
          visit(child);
        }
        for (const child of stryMutAct_9fa48("1667") ? node.content?.childNodes && [] : (stryCov_9fa48("1667"), (stryMutAct_9fa48("1668") ? node.content.childNodes : (stryCov_9fa48("1668"), node.content?.childNodes)) ?? (stryMutAct_9fa48("1669") ? ["Stryker was here"] : (stryCov_9fa48("1669"), [])))) if (stryMutAct_9fa48("1670")) {
          ;
        } else {
          stryCov_9fa48("1670");
          visit(child);
        }
      }
    };
    visit(parse(text, stryMutAct_9fa48("1672") ? {} : (stryCov_9fa48("1672"), {
      sourceCodeLocationInfo: stryMutAct_9fa48("1673") ? false : (stryCov_9fa48("1673"), true)
    })));
    return found;
  }
}

/**
 * Every refused construct a markup file carries.
 * @param label - the path to report offences under.
 * @param text - the file's contents.
 * @returns one offence per refused construct.
 */
export function scanMarkup(label: string, text: string): Offence[] {
  if (stryMutAct_9fa48("1674")) {
    {}
  } else {
    stryCov_9fa48("1674");
    return markupOffences(text).map(stryMutAct_9fa48("1675") ? () => undefined : (stryCov_9fa48("1675"), offence => stryMutAct_9fa48("1676") ? {} : (stryCov_9fa48("1676"), {
      label,
      line: offence.line,
      why: offence.why
    })));
  }
}