/**
 * The per-attribute refusals a markup gate makes: wiring, raw values, layout,
 * framework directives and remote loads.
 *
 * Split from `markup-gate.ts` the day that module outgrew the size its own
 * rules allow a file to reach. The two halves share one vocabulary of offences,
 * and every rule here is stated about attributes, so nothing written here can
 * see past the parser the caller walks.
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
import { retiredClassTokens } from './markup-vocabulary.ts';

/**
 * The attributes an element fetches a resource from.
 *
 * A URL in one of these loads an asset — a script, a sheet, an image, a frame —
 * and a remote one is a dependency no manifest declares and no lock resolves:
 * it loads over the network on a page this product ships, unversioned and
 * unaudited. Every asset belongs to the bundle, so a remote load is refused
 * and a local one (a root-relative path) is what remains.
 */
const RESOURCE_URLS = new Map<string, readonly string[]>(stryMutAct_9fa48("1271") ? [] : (stryCov_9fa48("1271"), [stryMutAct_9fa48("1272") ? [] : (stryCov_9fa48("1272"), [stryMutAct_9fa48("1273") ? "" : (stryCov_9fa48("1273"), 'script'), stryMutAct_9fa48("1274") ? [] : (stryCov_9fa48("1274"), [stryMutAct_9fa48("1275") ? "" : (stryCov_9fa48("1275"), 'src')])]), stryMutAct_9fa48("1276") ? [] : (stryCov_9fa48("1276"), [stryMutAct_9fa48("1277") ? "" : (stryCov_9fa48("1277"), 'link'), stryMutAct_9fa48("1278") ? [] : (stryCov_9fa48("1278"), [stryMutAct_9fa48("1279") ? "" : (stryCov_9fa48("1279"), 'href')])]), stryMutAct_9fa48("1280") ? [] : (stryCov_9fa48("1280"), [stryMutAct_9fa48("1281") ? "" : (stryCov_9fa48("1281"), 'img'), stryMutAct_9fa48("1282") ? [] : (stryCov_9fa48("1282"), [stryMutAct_9fa48("1283") ? "" : (stryCov_9fa48("1283"), 'src'), stryMutAct_9fa48("1284") ? "" : (stryCov_9fa48("1284"), 'srcset')])]), stryMutAct_9fa48("1285") ? [] : (stryCov_9fa48("1285"), [stryMutAct_9fa48("1286") ? "" : (stryCov_9fa48("1286"), 'video'), stryMutAct_9fa48("1287") ? [] : (stryCov_9fa48("1287"), [stryMutAct_9fa48("1288") ? "" : (stryCov_9fa48("1288"), 'src'), stryMutAct_9fa48("1289") ? "" : (stryCov_9fa48("1289"), 'poster')])]), stryMutAct_9fa48("1290") ? [] : (stryCov_9fa48("1290"), [stryMutAct_9fa48("1291") ? "" : (stryCov_9fa48("1291"), 'audio'), stryMutAct_9fa48("1292") ? [] : (stryCov_9fa48("1292"), [stryMutAct_9fa48("1293") ? "" : (stryCov_9fa48("1293"), 'src')])]), stryMutAct_9fa48("1294") ? [] : (stryCov_9fa48("1294"), [stryMutAct_9fa48("1295") ? "" : (stryCov_9fa48("1295"), 'source'), stryMutAct_9fa48("1296") ? [] : (stryCov_9fa48("1296"), [stryMutAct_9fa48("1297") ? "" : (stryCov_9fa48("1297"), 'src'), stryMutAct_9fa48("1298") ? "" : (stryCov_9fa48("1298"), 'srcset')])]), stryMutAct_9fa48("1299") ? [] : (stryCov_9fa48("1299"), [stryMutAct_9fa48("1300") ? "" : (stryCov_9fa48("1300"), 'iframe'), stryMutAct_9fa48("1301") ? [] : (stryCov_9fa48("1301"), [stryMutAct_9fa48("1302") ? "" : (stryCov_9fa48("1302"), 'src')])]), stryMutAct_9fa48("1303") ? [] : (stryCov_9fa48("1303"), [stryMutAct_9fa48("1304") ? "" : (stryCov_9fa48("1304"), 'embed'), stryMutAct_9fa48("1305") ? [] : (stryCov_9fa48("1305"), [stryMutAct_9fa48("1306") ? "" : (stryCov_9fa48("1306"), 'src')])]), stryMutAct_9fa48("1307") ? [] : (stryCov_9fa48("1307"), [stryMutAct_9fa48("1308") ? "" : (stryCov_9fa48("1308"), 'object'), stryMutAct_9fa48("1309") ? [] : (stryCov_9fa48("1309"), [stryMutAct_9fa48("1310") ? "" : (stryCov_9fa48("1310"), 'data')])]), stryMutAct_9fa48("1311") ? [] : (stryCov_9fa48("1311"), [stryMutAct_9fa48("1312") ? "" : (stryCov_9fa48("1312"), 'track'), stryMutAct_9fa48("1313") ? [] : (stryCov_9fa48("1313"), [stryMutAct_9fa48("1314") ? "" : (stryCov_9fa48("1314"), 'src')])]), stryMutAct_9fa48("1315") ? [] : (stryCov_9fa48("1315"), [stryMutAct_9fa48("1316") ? "" : (stryCov_9fa48("1316"), 'input'), stryMutAct_9fa48("1317") ? [] : (stryCov_9fa48("1317"), [stryMutAct_9fa48("1318") ? "" : (stryCov_9fa48("1318"), 'src')])]), // A remote base re-roots every relative load in the document to that host,
// which is every resource URL above with the scheme borrowed.
stryMutAct_9fa48("1319") ? [] : (stryCov_9fa48("1319"), [stryMutAct_9fa48("1320") ? "" : (stryCov_9fa48("1320"), 'base'), stryMutAct_9fa48("1321") ? [] : (stryCov_9fa48("1321"), [stryMutAct_9fa48("1322") ? "" : (stryCov_9fa48("1322"), 'href')])])]));

/** A URL that loads from outside the shipped bundle, absolute or protocol-relative. */
export const REMOTE_URL = stryMutAct_9fa48("1325") ? /^(?:https:)?\/\//iu : stryMutAct_9fa48("1324") ? /^(?:https?:)\/\//iu : stryMutAct_9fa48("1323") ? /(?:https?:)?\/\//iu : (stryCov_9fa48("1323", "1324", "1325"), /^(?:https?:)?\/\//iu);

/**
 * An htmx wiring attribute, including HTMX 4's `:inherited` / `hx-status`
 * spellings and the `data-hx-` equivalent the docs still accept.
 *
 * An `hx-` attribute moves an element's behaviour into the tag: a listener, a
 * fetch and a swap all decided where the markup is written. This product wires
 * interactivity in modules, so no wiring attribute may ship.
 */
const HTMX_ATTRIBUTE = stryMutAct_9fa48("1327") ? /^(?:data-)hx-/iu : stryMutAct_9fa48("1326") ? /(?:data-)?hx-/iu : (stryCov_9fa48("1326", "1327"), /^(?:data-)?hx-/iu);

/**
 * A Tailwind arbitrary-value utility in a class list.
 *
 * A token whose bracketed payload follows a hyphen — a width, a colour, a font
 * size spelled inline — is syntax only a utility pipeline reads. No stylesheet
 * this repository ships selects such a token, so it names a spacing or colour
 * decision the design system never sees: the scale and the palette live in
 * tokens.css.
 */
// Tailwind 3 wrote an arbitrary value in square brackets and Tailwind 4 writes
// a custom property in parentheses — `bg-[--brand]` became `bg-(--brand)`. A
// pattern that knew only the bracket form read the current spelling as an
// ordinary class name.
const ARBITRARY_UTILITY = stryMutAct_9fa48("1334") ? /-[^\s"']*(?:\[[^\]]+\]|\((?:--)[)]+\))/u : stryMutAct_9fa48("1333") ? /-[^\s"']*(?:\[[^\]]+\]|\((?:--)[^)]\))/u : stryMutAct_9fa48("1332") ? /-[^\s"']*(?:\[[\]]+\]|\((?:--)[^)]+\))/u : stryMutAct_9fa48("1331") ? /-[^\s"']*(?:\[[^\]]\]|\((?:--)[^)]+\))/u : stryMutAct_9fa48("1330") ? /-[^\S"']*(?:\[[^\]]+\]|\((?:--)[^)]+\))/u : stryMutAct_9fa48("1329") ? /-[\s"']*(?:\[[^\]]+\]|\((?:--)[^)]+\))/u : stryMutAct_9fa48("1328") ? /-[^\s"'](?:\[[^\]]+\]|\((?:--)[^)]+\))/u : (stryCov_9fa48("1328", "1329", "1330", "1331", "1332", "1333", "1334"), /-[^\s"']*(?:\[[^\]]+\]|\((?:--)[^)]+\))/u);

/**
 * Attributes that move a box or its content from the tag.
 *
 * `align`, `valign` and their spacing kin are layout written where markup
 * goes, so the alignment never reaches the sheet the grid rules read.
 */
const ALIGNMENT_ATTRIBUTES = new Set(stryMutAct_9fa48("1335") ? [] : (stryCov_9fa48("1335"), [stryMutAct_9fa48("1336") ? "" : (stryCov_9fa48("1336"), 'align'), stryMutAct_9fa48("1337") ? "" : (stryCov_9fa48("1337"), 'valign'), stryMutAct_9fa48("1338") ? "" : (stryCov_9fa48("1338"), 'hspace'), stryMutAct_9fa48("1339") ? "" : (stryCov_9fa48("1339"), 'vspace'), stryMutAct_9fa48("1340") ? "" : (stryCov_9fa48("1340"), 'cellpadding'), stryMutAct_9fa48("1341") ? "" : (stryCov_9fa48("1341"), 'cellspacing')]));

/**
 * Attributes that decide size or type in the tag.
 *
 * `width` and `height` stay allowed on `img`, where they are the aspect-ratio
 * hint that stops a layout shift before the sheet applies — on every other
 * element they are sizing decided in markup. The colour and border attributes
 * are palette decisions in the tag; `size`, `face`, `clear`, `nowrap` and the
 * table chrome are type and layout that belong to a class.
 */
const PRESENTATIONAL_ATTRIBUTES = new Set(stryMutAct_9fa48("1342") ? [] : (stryCov_9fa48("1342"), [stryMutAct_9fa48("1343") ? "" : (stryCov_9fa48("1343"), 'width'), stryMutAct_9fa48("1344") ? "" : (stryCov_9fa48("1344"), 'height'), stryMutAct_9fa48("1345") ? "" : (stryCov_9fa48("1345"), 'border'), stryMutAct_9fa48("1346") ? "" : (stryCov_9fa48("1346"), 'bgcolor'), stryMutAct_9fa48("1347") ? "" : (stryCov_9fa48("1347"), 'background'), stryMutAct_9fa48("1348") ? "" : (stryCov_9fa48("1348"), 'color'), stryMutAct_9fa48("1349") ? "" : (stryCov_9fa48("1349"), 'face'), stryMutAct_9fa48("1350") ? "" : (stryCov_9fa48("1350"), 'size'), stryMutAct_9fa48("1351") ? "" : (stryCov_9fa48("1351"), 'clear'), stryMutAct_9fa48("1352") ? "" : (stryCov_9fa48("1352"), 'nowrap'), stryMutAct_9fa48("1353") ? "" : (stryCov_9fa48("1353"), 'bordercolor'), stryMutAct_9fa48("1354") ? "" : (stryCov_9fa48("1354"), 'rules'), stryMutAct_9fa48("1355") ? "" : (stryCov_9fa48("1355"), 'frame')]));

/**
 * An attribute that is a framework's directive, the utilities this product
 * retired by name.
 *
 * `data-theme` is the daisyUI theme hook: the palette this product ships is
 * tokens.css, and a second theme switch on the tag is a second palette. The
 * `x-`, `@` and `:` prefixes are the Alpine and Vue directive shorthands, one
 * more way a listener or a binding can move into the tag where no module
 * ships it and no gate reads it.
 */
const DIRECTIVE_ATTRIBUTES: readonly {
  readonly pattern: RegExp;
  readonly why: string;
}[] = stryMutAct_9fa48("1356") ? [] : (stryCov_9fa48("1356"), [stryMutAct_9fa48("1357") ? {} : (stryCov_9fa48("1357"), {
  pattern: stryMutAct_9fa48("1359") ? /^data-theme/iu : stryMutAct_9fa48("1358") ? /data-theme$/iu : (stryCov_9fa48("1358", "1359"), /^data-theme$/iu),
  why: stryMutAct_9fa48("1360") ? "" : (stryCov_9fa48("1360"), 'data-theme is the daisyUI theme hook; the palette lives in tokens.css')
}), stryMutAct_9fa48("1361") ? {} : (stryCov_9fa48("1361"), {
  pattern: stryMutAct_9fa48("1362") ? /(?:x-|@|:)/u : (stryCov_9fa48("1362"), /^(?:x-|@|:)/u),
  why: stryMutAct_9fa48("1363") ? "" : (stryCov_9fa48("1363"), 'a directive attribute wires behaviour into the tag; attach the listener in a module')
}), stryMutAct_9fa48("1364") ? {} : (stryCov_9fa48("1364"), {
  pattern: stryMutAct_9fa48("1365") ? /v-/u : (stryCov_9fa48("1365"), /^v-/u),
  why: stryMutAct_9fa48("1366") ? "" : (stryCov_9fa48("1366"), 'a Vue directive wires behaviour into the tag; attach the listener in a module')
}), stryMutAct_9fa48("1367") ? {} : (stryCov_9fa48("1367"), {
  pattern: stryMutAct_9fa48("1368") ? /data-bs-/iu : (stryCov_9fa48("1368"), /^data-bs-/iu),
  why: stryMutAct_9fa48("1369") ? "" : (stryCov_9fa48("1369"), 'a Bootstrap data-bs attribute is a retired framework hook; attach the listener in a module')
})]);

/** One refusal, with its line. */
export interface MarkupOffence {
  readonly line: number;
  readonly why: string;
}

/**
 * An element's attributes, as the parser hands them over.
 *
 * Named once, and named here because every rule about one is stated in this
 * module: the shape was spelled out at each signature that took it, so a
 * reader had to compare four literal types character by character to see that
 * they were the same type.
 */
export type Attributes = readonly {
  readonly name: string;
  readonly value?: string;
}[];

/** One of them. */
type Attribute = Attributes[number];

/**
 * Whether a URL attribute value loads from outside the shipped bundle.
 * @param value - the attribute's value.
 * @param candidates - true for a list attribute, where each entry is one URL.
 * @returns true when any URL is remote.
 */
function isRemoteLoad(value: string, candidates: boolean): boolean {
  if (stryMutAct_9fa48("1370")) {
    {}
  } else {
    stryCov_9fa48("1370");
    if (stryMutAct_9fa48("1373") ? false : stryMutAct_9fa48("1372") ? true : stryMutAct_9fa48("1371") ? candidates : (stryCov_9fa48("1371", "1372", "1373"), !candidates)) return REMOTE_URL.test(stryMutAct_9fa48("1374") ? value : (stryCov_9fa48("1374"), value.trim()));
    return stryMutAct_9fa48("1375") ? value.split(',').every(candidate => REMOTE_URL.test((candidate.trim().split(/\s+/u)[0] ?? '').trim())) : (stryCov_9fa48("1375"), value.split(stryMutAct_9fa48("1376") ? "" : (stryCov_9fa48("1376"), ',')).some(stryMutAct_9fa48("1377") ? () => undefined : (stryCov_9fa48("1377"), candidate => REMOTE_URL.test(stryMutAct_9fa48("1378") ? candidate.trim().split(/\s+/u)[0] ?? '' : (stryCov_9fa48("1378"), (stryMutAct_9fa48("1379") ? candidate.trim().split(/\s+/u)[0] && '' : (stryCov_9fa48("1379"), (stryMutAct_9fa48("1380") ? candidate.split(/\s+/u)[0] : (stryCov_9fa48("1380"), candidate.trim().split(stryMutAct_9fa48("1382") ? /\S+/u : stryMutAct_9fa48("1381") ? /\s/u : (stryCov_9fa48("1381", "1382"), /\s+/u))[0])) ?? (stryMutAct_9fa48("1383") ? "Stryker was here!" : (stryCov_9fa48("1383"), '')))).trim())))));
  }
}

/**
 * The wiring one attribute name carries: an htmx hook, or a framework's own
 * directive spelling.
 * @param attribute - the attribute, as the parser read it.
 * @param line - the line the element starts on.
 * @returns the offences, or an empty list.
 */
function wiringOffences(attribute: Attribute, line: number): MarkupOffence[] {
  if (stryMutAct_9fa48("1384")) {
    {}
  } else {
    stryCov_9fa48("1384");
    const found: MarkupOffence[] = stryMutAct_9fa48("1385") ? ["Stryker was here"] : (stryCov_9fa48("1385"), []);
    if (stryMutAct_9fa48("1387") ? false : stryMutAct_9fa48("1386") ? true : (stryCov_9fa48("1386", "1387"), HTMX_ATTRIBUTE.test(attribute.name))) {
      if (stryMutAct_9fa48("1388")) {
        {}
      } else {
        stryCov_9fa48("1388");
        found.push(stryMutAct_9fa48("1390") ? {} : (stryCov_9fa48("1390"), {
          line,
          why: stryMutAct_9fa48("1391") ? "" : (stryCov_9fa48("1391"), 'an hx attribute wires behaviour into the tag; attach the listener in a module')
        }));
      }
    }
    for (const {
      pattern,
      why
    } of DIRECTIVE_ATTRIBUTES) {
      if (stryMutAct_9fa48("1392")) {
        {}
      } else {
        stryCov_9fa48("1392");
        if (stryMutAct_9fa48("1394") ? false : stryMutAct_9fa48("1393") ? true : (stryCov_9fa48("1393", "1394"), pattern.test(attribute.name))) found.push(stryMutAct_9fa48("1396") ? {} : (stryCov_9fa48("1396"), {
          line,
          why
        }));
      }
    }
    return found;
  }
}

/**
 * What a class list says that no stylesheet here selects.
 * @param value - the class attribute's value.
 * @param line - the line the element starts on.
 * @returns the offences, or an empty list.
 */
function classOffences(value: string, line: number): MarkupOffence[] {
  if (stryMutAct_9fa48("1397")) {
    {}
  } else {
    stryCov_9fa48("1397");
    const found: MarkupOffence[] = stryMutAct_9fa48("1398") ? ["Stryker was here"] : (stryCov_9fa48("1398"), []);
    if (stryMutAct_9fa48("1400") ? false : stryMutAct_9fa48("1399") ? true : (stryCov_9fa48("1399", "1400"), ARBITRARY_UTILITY.test(value))) {
      if (stryMutAct_9fa48("1401")) {
        {}
      } else {
        stryCov_9fa48("1401");
        found.push(stryMutAct_9fa48("1403") ? {} : (stryCov_9fa48("1403"), {
          line,
          why: stryMutAct_9fa48("1404") ? "" : (stryCov_9fa48("1404"), 'a bracketed utility class carries a raw value; read the size or colour from tokens.css')
        }));
      }
    }
    for (const token of retiredClassTokens(value)) {
      if (stryMutAct_9fa48("1405")) {
        {}
      } else {
        stryCov_9fa48("1405");
        found.push(stryMutAct_9fa48("1407") ? {} : (stryCov_9fa48("1407"), {
          line,
          why: stryMutAct_9fa48("1408") ? `` : (stryCov_9fa48("1408"), `retired-class: "${token}" belongs to a UI framework this product retired`)
        }));
      }
    }
    return found;
  }
}

/**
 * The layout and type one attribute decides in the tag rather than the sheet.
 * @param name - the attribute's name, lowercased.
 * @param tag - the element's name, lowercased when it has one.
 * @param line - the line the element starts on.
 * @returns the offences, or an empty list.
 */
function presentationOffences(name: string, tag: string | undefined, line: number): MarkupOffence[] {
  if (stryMutAct_9fa48("1409")) {
    {}
  } else {
    stryCov_9fa48("1409");
    const found: MarkupOffence[] = stryMutAct_9fa48("1410") ? ["Stryker was here"] : (stryCov_9fa48("1410"), []);
    if (stryMutAct_9fa48("1412") ? false : stryMutAct_9fa48("1411") ? true : (stryCov_9fa48("1411", "1412"), ALIGNMENT_ATTRIBUTES.has(name))) {
      if (stryMutAct_9fa48("1413")) {
        {}
      } else {
        stryCov_9fa48("1413");
        found.push(stryMutAct_9fa48("1415") ? {} : (stryCov_9fa48("1415"), {
          line,
          why: stryMutAct_9fa48("1416") ? "" : (stryCov_9fa48("1416"), 'an alignment attribute is layout in the tag; put the alignment in a stylesheet and add a class')
        }));
      }
    }
    // The one allowed pair: on an image these are the aspect-ratio hint that
    // stops a layout shift before the sheet applies.
    const ratioHint = stryMutAct_9fa48("1419") ? tag === 'img' || name === 'width' || name === 'height' : stryMutAct_9fa48("1418") ? false : stryMutAct_9fa48("1417") ? true : (stryCov_9fa48("1417", "1418", "1419"), (stryMutAct_9fa48("1421") ? tag !== 'img' : stryMutAct_9fa48("1420") ? true : (stryCov_9fa48("1420", "1421"), tag === (stryMutAct_9fa48("1422") ? "" : (stryCov_9fa48("1422"), 'img')))) && (stryMutAct_9fa48("1424") ? name === 'width' && name === 'height' : stryMutAct_9fa48("1423") ? true : (stryCov_9fa48("1423", "1424"), (stryMutAct_9fa48("1426") ? name !== 'width' : stryMutAct_9fa48("1425") ? false : (stryCov_9fa48("1425", "1426"), name === (stryMutAct_9fa48("1427") ? "" : (stryCov_9fa48("1427"), 'width')))) || (stryMutAct_9fa48("1429") ? name !== 'height' : stryMutAct_9fa48("1428") ? false : (stryCov_9fa48("1428", "1429"), name === (stryMutAct_9fa48("1430") ? "" : (stryCov_9fa48("1430"), 'height')))))));
    if (stryMutAct_9fa48("1433") ? PRESENTATIONAL_ATTRIBUTES.has(name) || !ratioHint : stryMutAct_9fa48("1432") ? false : stryMutAct_9fa48("1431") ? true : (stryCov_9fa48("1431", "1432", "1433"), PRESENTATIONAL_ATTRIBUTES.has(name) && (stryMutAct_9fa48("1434") ? ratioHint : (stryCov_9fa48("1434"), !ratioHint)))) {
      if (stryMutAct_9fa48("1435")) {
        {}
      } else {
        stryCov_9fa48("1435");
        found.push(stryMutAct_9fa48("1437") ? {} : (stryCov_9fa48("1437"), {
          line,
          why: stryMutAct_9fa48("1438") ? "" : (stryCov_9fa48("1438"), 'a presentational attribute decides size or type in the tag; put it in a stylesheet and add a class')
        }));
      }
    }
    return found;
  }
}

/**
 * Whether one attribute loads an asset from outside the shipped bundle.
 * @param attribute - the attribute, as the parser read it.
 * @param name - its name, lowercased.
 * @param tag - the element's name, lowercased when it has one.
 * @param line - the line the element starts on.
 * @returns the offence, or an empty list.
 */
function remoteResourceOffences(attribute: Attribute, name: string, tag: string | undefined, line: number): MarkupOffence[] {
  if (stryMutAct_9fa48("1439")) {
    {}
  } else {
    stryCov_9fa48("1439");
    const resource = RESOURCE_URLS.get(stryMutAct_9fa48("1440") ? tag && '' : (stryCov_9fa48("1440"), tag ?? (stryMutAct_9fa48("1441") ? "Stryker was here!" : (stryCov_9fa48("1441"), ''))));
    if (stryMutAct_9fa48("1444") ? resource?.includes(name) === true : stryMutAct_9fa48("1443") ? false : stryMutAct_9fa48("1442") ? true : (stryCov_9fa48("1442", "1443", "1444"), (stryMutAct_9fa48("1445") ? resource.includes(name) : (stryCov_9fa48("1445"), resource?.includes(name))) !== (stryMutAct_9fa48("1446") ? false : (stryCov_9fa48("1446"), true)))) return stryMutAct_9fa48("1447") ? ["Stryker was here"] : (stryCov_9fa48("1447"), []);
    if (stryMutAct_9fa48("1450") ? false : stryMutAct_9fa48("1449") ? true : stryMutAct_9fa48("1448") ? isRemoteLoad(attribute.value ?? '', name === 'srcset') : (stryCov_9fa48("1448", "1449", "1450"), !isRemoteLoad(stryMutAct_9fa48("1451") ? attribute.value && '' : (stryCov_9fa48("1451"), attribute.value ?? (stryMutAct_9fa48("1452") ? "Stryker was here!" : (stryCov_9fa48("1452"), ''))), stryMutAct_9fa48("1455") ? name !== 'srcset' : stryMutAct_9fa48("1454") ? false : stryMutAct_9fa48("1453") ? true : (stryCov_9fa48("1453", "1454", "1455"), name === (stryMutAct_9fa48("1456") ? "" : (stryCov_9fa48("1456"), 'srcset')))))) return stryMutAct_9fa48("1457") ? ["Stryker was here"] : (stryCov_9fa48("1457"), []);
    return stryMutAct_9fa48("1458") ? [] : (stryCov_9fa48("1458"), [stryMutAct_9fa48("1459") ? {} : (stryCov_9fa48("1459"), {
      line,
      why: stryMutAct_9fa48("1460") ? "" : (stryCov_9fa48("1460"), 'a remote resource URL loads an asset no local install ships; ship the asset in the bundle')
    })]);
  }
}

/**
 * The per-attribute refusals a tag carries: wiring, raw values and layout.
 *
 * @param attrs - the element's attributes, as the parser read them.
 * @param tag - the element's name, lowercased when it has one.
 * @param line - the line the element starts on.
 * @param found - the refusal list to append to.
 */
export function recordAttributeOffences(attrs: Attributes, tag: string | undefined, line: number, found: MarkupOffence[]): void {
  if (stryMutAct_9fa48("1461")) {
    {}
  } else {
    stryCov_9fa48("1461");
    for (const attribute of attrs) {
      if (stryMutAct_9fa48("1462")) {
        {}
      } else {
        stryCov_9fa48("1462");
        const name = stryMutAct_9fa48("1463") ? attribute.name.toUpperCase() : (stryCov_9fa48("1463"), attribute.name.toLowerCase());
        found.push(...wiringOffences(attribute, line), ...((stryMutAct_9fa48("1467") ? name !== 'class' : stryMutAct_9fa48("1466") ? false : stryMutAct_9fa48("1465") ? true : (stryCov_9fa48("1465", "1466", "1467"), name === (stryMutAct_9fa48("1468") ? "" : (stryCov_9fa48("1468"), 'class')))) ? classOffences(stryMutAct_9fa48("1469") ? attribute.value && '' : (stryCov_9fa48("1469"), attribute.value ?? (stryMutAct_9fa48("1470") ? "Stryker was here!" : (stryCov_9fa48("1470"), ''))), line) : stryMutAct_9fa48("1471") ? ["Stryker was here"] : (stryCov_9fa48("1471"), [])), ...presentationOffences(name, tag, line), ...remoteResourceOffences(attribute, name, tag, line));
      }
    }
  }
}