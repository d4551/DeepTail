/**
 * The colour and cascade rules a stylesheet is read against.
 *
 * A colour is a palette decision exactly as a spacing length is a scale
 * decision: a hex or a function-written colour in a sheet is a second source
 * for what tokens.css already names, and two sources drift. The cascade
 * override is refused here too — writing one is refusing to fix the selector
 * that lost, and two overrides race the same way two stacking numbers do.
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
import type { Offence } from './offence.ts';

/**
 * The CSS named colours, which no sheet may write — the palette is stated in
 * its own function form on the definitions alone.
 *
 * `currentcolor` and `transparent` are deliberately absent rather than listed
 * and filtered back out: neither states a colour — one reads whatever colour is
 * inherited and the other states the absence of one — so neither is a palette
 * decision to route through the tokens. A filter that removed them from this
 * list removed nothing, because they were never in it.
 */
const NAMED = stryMutAct_9fa48("0") ? [] : (stryCov_9fa48("0"), [stryMutAct_9fa48("1") ? "" : (stryCov_9fa48("1"), 'aliceblue'), stryMutAct_9fa48("2") ? "" : (stryCov_9fa48("2"), 'antiquewhite'), stryMutAct_9fa48("3") ? "" : (stryCov_9fa48("3"), 'aqua'), stryMutAct_9fa48("4") ? "" : (stryCov_9fa48("4"), 'aquamarine'), stryMutAct_9fa48("5") ? "" : (stryCov_9fa48("5"), 'azure'), stryMutAct_9fa48("6") ? "" : (stryCov_9fa48("6"), 'beige'), stryMutAct_9fa48("7") ? "" : (stryCov_9fa48("7"), 'bisque'), stryMutAct_9fa48("8") ? "" : (stryCov_9fa48("8"), 'black'), stryMutAct_9fa48("9") ? "" : (stryCov_9fa48("9"), 'blanchedalmond'), stryMutAct_9fa48("10") ? "" : (stryCov_9fa48("10"), 'blue'), stryMutAct_9fa48("11") ? "" : (stryCov_9fa48("11"), 'blueviolet'), stryMutAct_9fa48("12") ? "" : (stryCov_9fa48("12"), 'brown'), stryMutAct_9fa48("13") ? "" : (stryCov_9fa48("13"), 'burlywood'), stryMutAct_9fa48("14") ? "" : (stryCov_9fa48("14"), 'cadetblue'), stryMutAct_9fa48("15") ? "" : (stryCov_9fa48("15"), 'chartreuse'), stryMutAct_9fa48("16") ? "" : (stryCov_9fa48("16"), 'chocolate'), stryMutAct_9fa48("17") ? "" : (stryCov_9fa48("17"), 'coral'), stryMutAct_9fa48("18") ? "" : (stryCov_9fa48("18"), 'cornflowerblue'), stryMutAct_9fa48("19") ? "" : (stryCov_9fa48("19"), 'cornsilk'), stryMutAct_9fa48("20") ? "" : (stryCov_9fa48("20"), 'crimson'), stryMutAct_9fa48("21") ? "" : (stryCov_9fa48("21"), 'cyan'), stryMutAct_9fa48("22") ? "" : (stryCov_9fa48("22"), 'darkblue'), stryMutAct_9fa48("23") ? "" : (stryCov_9fa48("23"), 'darkcyan'), stryMutAct_9fa48("24") ? "" : (stryCov_9fa48("24"), 'darkgoldenrod'), stryMutAct_9fa48("25") ? "" : (stryCov_9fa48("25"), 'darkgray'), stryMutAct_9fa48("26") ? "" : (stryCov_9fa48("26"), 'darkgreen'), stryMutAct_9fa48("27") ? "" : (stryCov_9fa48("27"), 'darkgrey'), stryMutAct_9fa48("28") ? "" : (stryCov_9fa48("28"), 'darkkhaki'), stryMutAct_9fa48("29") ? "" : (stryCov_9fa48("29"), 'darkmagenta'), stryMutAct_9fa48("30") ? "" : (stryCov_9fa48("30"), 'darkolivegreen'), stryMutAct_9fa48("31") ? "" : (stryCov_9fa48("31"), 'darkorange'), stryMutAct_9fa48("32") ? "" : (stryCov_9fa48("32"), 'darkorchid'), stryMutAct_9fa48("33") ? "" : (stryCov_9fa48("33"), 'darkred'), stryMutAct_9fa48("34") ? "" : (stryCov_9fa48("34"), 'darksalmon'), stryMutAct_9fa48("35") ? "" : (stryCov_9fa48("35"), 'darkseagreen'), stryMutAct_9fa48("36") ? "" : (stryCov_9fa48("36"), 'darkslateblue'), stryMutAct_9fa48("37") ? "" : (stryCov_9fa48("37"), 'darkslategray'), stryMutAct_9fa48("38") ? "" : (stryCov_9fa48("38"), 'darkslategrey'), stryMutAct_9fa48("39") ? "" : (stryCov_9fa48("39"), 'darkturquoise'), stryMutAct_9fa48("40") ? "" : (stryCov_9fa48("40"), 'darkviolet'), stryMutAct_9fa48("41") ? "" : (stryCov_9fa48("41"), 'deeppink'), stryMutAct_9fa48("42") ? "" : (stryCov_9fa48("42"), 'deepskyblue'), stryMutAct_9fa48("43") ? "" : (stryCov_9fa48("43"), 'dimgray'), stryMutAct_9fa48("44") ? "" : (stryCov_9fa48("44"), 'dimgrey'), stryMutAct_9fa48("45") ? "" : (stryCov_9fa48("45"), 'dodgerblue'), stryMutAct_9fa48("46") ? "" : (stryCov_9fa48("46"), 'firebrick'), stryMutAct_9fa48("47") ? "" : (stryCov_9fa48("47"), 'floralwhite'), stryMutAct_9fa48("48") ? "" : (stryCov_9fa48("48"), 'forestgreen'), stryMutAct_9fa48("49") ? "" : (stryCov_9fa48("49"), 'fuchsia'), stryMutAct_9fa48("50") ? "" : (stryCov_9fa48("50"), 'gainsboro'), stryMutAct_9fa48("51") ? "" : (stryCov_9fa48("51"), 'ghostwhite'), stryMutAct_9fa48("52") ? "" : (stryCov_9fa48("52"), 'gold'), stryMutAct_9fa48("53") ? "" : (stryCov_9fa48("53"), 'goldenrod'), stryMutAct_9fa48("54") ? "" : (stryCov_9fa48("54"), 'gray'), stryMutAct_9fa48("55") ? "" : (stryCov_9fa48("55"), 'green'), stryMutAct_9fa48("56") ? "" : (stryCov_9fa48("56"), 'greenyellow'), stryMutAct_9fa48("57") ? "" : (stryCov_9fa48("57"), 'grey'), stryMutAct_9fa48("58") ? "" : (stryCov_9fa48("58"), 'honeydew'), stryMutAct_9fa48("59") ? "" : (stryCov_9fa48("59"), 'hotpink'), stryMutAct_9fa48("60") ? "" : (stryCov_9fa48("60"), 'indianred'), stryMutAct_9fa48("61") ? "" : (stryCov_9fa48("61"), 'indigo'), stryMutAct_9fa48("62") ? "" : (stryCov_9fa48("62"), 'ivory'), stryMutAct_9fa48("63") ? "" : (stryCov_9fa48("63"), 'khaki'), stryMutAct_9fa48("64") ? "" : (stryCov_9fa48("64"), 'lavender'), stryMutAct_9fa48("65") ? "" : (stryCov_9fa48("65"), 'lavenderblush'), stryMutAct_9fa48("66") ? "" : (stryCov_9fa48("66"), 'lawngreen'), stryMutAct_9fa48("67") ? "" : (stryCov_9fa48("67"), 'lemonchiffon'), stryMutAct_9fa48("68") ? "" : (stryCov_9fa48("68"), 'lightblue'), stryMutAct_9fa48("69") ? "" : (stryCov_9fa48("69"), 'lightcoral'), stryMutAct_9fa48("70") ? "" : (stryCov_9fa48("70"), 'lightcyan'), stryMutAct_9fa48("71") ? "" : (stryCov_9fa48("71"), 'lightgoldenrodyellow'), stryMutAct_9fa48("72") ? "" : (stryCov_9fa48("72"), 'lightgray'), stryMutAct_9fa48("73") ? "" : (stryCov_9fa48("73"), 'lightgreen'), stryMutAct_9fa48("74") ? "" : (stryCov_9fa48("74"), 'lightgrey'), stryMutAct_9fa48("75") ? "" : (stryCov_9fa48("75"), 'lightpink'), stryMutAct_9fa48("76") ? "" : (stryCov_9fa48("76"), 'lightsalmon'), stryMutAct_9fa48("77") ? "" : (stryCov_9fa48("77"), 'lightseagreen'), stryMutAct_9fa48("78") ? "" : (stryCov_9fa48("78"), 'lightskyblue'), stryMutAct_9fa48("79") ? "" : (stryCov_9fa48("79"), 'lightslategray'), stryMutAct_9fa48("80") ? "" : (stryCov_9fa48("80"), 'lightslategrey'), stryMutAct_9fa48("81") ? "" : (stryCov_9fa48("81"), 'lightsteelblue'), stryMutAct_9fa48("82") ? "" : (stryCov_9fa48("82"), 'lightyellow'), stryMutAct_9fa48("83") ? "" : (stryCov_9fa48("83"), 'lime'), stryMutAct_9fa48("84") ? "" : (stryCov_9fa48("84"), 'limegreen'), stryMutAct_9fa48("85") ? "" : (stryCov_9fa48("85"), 'linen'), stryMutAct_9fa48("86") ? "" : (stryCov_9fa48("86"), 'magenta'), stryMutAct_9fa48("87") ? "" : (stryCov_9fa48("87"), 'maroon'), stryMutAct_9fa48("88") ? "" : (stryCov_9fa48("88"), 'mediumaquamarine'), stryMutAct_9fa48("89") ? "" : (stryCov_9fa48("89"), 'mediumblue'), stryMutAct_9fa48("90") ? "" : (stryCov_9fa48("90"), 'mediumorchid'), stryMutAct_9fa48("91") ? "" : (stryCov_9fa48("91"), 'mediumpurple'), stryMutAct_9fa48("92") ? "" : (stryCov_9fa48("92"), 'mediumseagreen'), stryMutAct_9fa48("93") ? "" : (stryCov_9fa48("93"), 'mediumslateblue'), stryMutAct_9fa48("94") ? "" : (stryCov_9fa48("94"), 'mediumspringgreen'), stryMutAct_9fa48("95") ? "" : (stryCov_9fa48("95"), 'mediumturquoise'), stryMutAct_9fa48("96") ? "" : (stryCov_9fa48("96"), 'mediumvioletred'), stryMutAct_9fa48("97") ? "" : (stryCov_9fa48("97"), 'midnightblue'), stryMutAct_9fa48("98") ? "" : (stryCov_9fa48("98"), 'mintcream'), stryMutAct_9fa48("99") ? "" : (stryCov_9fa48("99"), 'mistyrose'), stryMutAct_9fa48("100") ? "" : (stryCov_9fa48("100"), 'moccasin'), stryMutAct_9fa48("101") ? "" : (stryCov_9fa48("101"), 'navajowhite'), stryMutAct_9fa48("102") ? "" : (stryCov_9fa48("102"), 'navy'), stryMutAct_9fa48("103") ? "" : (stryCov_9fa48("103"), 'oldlace'), stryMutAct_9fa48("104") ? "" : (stryCov_9fa48("104"), 'olive'), stryMutAct_9fa48("105") ? "" : (stryCov_9fa48("105"), 'olivedrab'), stryMutAct_9fa48("106") ? "" : (stryCov_9fa48("106"), 'orange'), stryMutAct_9fa48("107") ? "" : (stryCov_9fa48("107"), 'orangered'), stryMutAct_9fa48("108") ? "" : (stryCov_9fa48("108"), 'orchid'), stryMutAct_9fa48("109") ? "" : (stryCov_9fa48("109"), 'palegoldenrod'), stryMutAct_9fa48("110") ? "" : (stryCov_9fa48("110"), 'palegreen'), stryMutAct_9fa48("111") ? "" : (stryCov_9fa48("111"), 'paleturquoise'), stryMutAct_9fa48("112") ? "" : (stryCov_9fa48("112"), 'palevioletred'), stryMutAct_9fa48("113") ? "" : (stryCov_9fa48("113"), 'papayawhip'), stryMutAct_9fa48("114") ? "" : (stryCov_9fa48("114"), 'peachpuff'), stryMutAct_9fa48("115") ? "" : (stryCov_9fa48("115"), 'peru'), stryMutAct_9fa48("116") ? "" : (stryCov_9fa48("116"), 'pink'), stryMutAct_9fa48("117") ? "" : (stryCov_9fa48("117"), 'plum'), stryMutAct_9fa48("118") ? "" : (stryCov_9fa48("118"), 'powderblue'), stryMutAct_9fa48("119") ? "" : (stryCov_9fa48("119"), 'purple'), stryMutAct_9fa48("120") ? "" : (stryCov_9fa48("120"), 'rebeccapurple'), stryMutAct_9fa48("121") ? "" : (stryCov_9fa48("121"), 'red'), stryMutAct_9fa48("122") ? "" : (stryCov_9fa48("122"), 'rosybrown'), stryMutAct_9fa48("123") ? "" : (stryCov_9fa48("123"), 'royalblue'), stryMutAct_9fa48("124") ? "" : (stryCov_9fa48("124"), 'saddlebrown'), stryMutAct_9fa48("125") ? "" : (stryCov_9fa48("125"), 'salmon'), stryMutAct_9fa48("126") ? "" : (stryCov_9fa48("126"), 'sandybrown'), stryMutAct_9fa48("127") ? "" : (stryCov_9fa48("127"), 'seagreen'), stryMutAct_9fa48("128") ? "" : (stryCov_9fa48("128"), 'seashell'), stryMutAct_9fa48("129") ? "" : (stryCov_9fa48("129"), 'sienna'), stryMutAct_9fa48("130") ? "" : (stryCov_9fa48("130"), 'silver'), stryMutAct_9fa48("131") ? "" : (stryCov_9fa48("131"), 'skyblue'), stryMutAct_9fa48("132") ? "" : (stryCov_9fa48("132"), 'slateblue'), stryMutAct_9fa48("133") ? "" : (stryCov_9fa48("133"), 'slategray'), stryMutAct_9fa48("134") ? "" : (stryCov_9fa48("134"), 'slategrey'), stryMutAct_9fa48("135") ? "" : (stryCov_9fa48("135"), 'snow'), stryMutAct_9fa48("136") ? "" : (stryCov_9fa48("136"), 'springgreen'), stryMutAct_9fa48("137") ? "" : (stryCov_9fa48("137"), 'steelblue'), stryMutAct_9fa48("138") ? "" : (stryCov_9fa48("138"), 'tan'), stryMutAct_9fa48("139") ? "" : (stryCov_9fa48("139"), 'teal'), stryMutAct_9fa48("140") ? "" : (stryCov_9fa48("140"), 'thistle'), stryMutAct_9fa48("141") ? "" : (stryCov_9fa48("141"), 'tomato'), stryMutAct_9fa48("142") ? "" : (stryCov_9fa48("142"), 'turquoise'), stryMutAct_9fa48("143") ? "" : (stryCov_9fa48("143"), 'violet'), stryMutAct_9fa48("144") ? "" : (stryCov_9fa48("144"), 'wheat'), stryMutAct_9fa48("145") ? "" : (stryCov_9fa48("145"), 'white'), stryMutAct_9fa48("146") ? "" : (stryCov_9fa48("146"), 'whitesmoke'), stryMutAct_9fa48("147") ? "" : (stryCov_9fa48("147"), 'yellow'), stryMutAct_9fa48("148") ? "" : (stryCov_9fa48("148"), 'yellowgreen')]);

/** A colour written as a literal rather than read from the palette. */
const RAW = new RegExp(stryMutAct_9fa48("149") ? `` : (stryCov_9fa48("149"), `#[0-9a-f]{3,8}\\b|\\b(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)\\(|\\b(?:${NAMED.join(stryMutAct_9fa48("150") ? "" : (stryCov_9fa48("150"), '|'))})\\b`), stryMutAct_9fa48("151") ? "" : (stryCov_9fa48("151"), 'iu'));

/** The override flag, assembled so the gate's own source does not carry it. */
const OVERRIDE = (stryMutAct_9fa48("152") ? [] : (stryCov_9fa48("152"), [stryMutAct_9fa48("153") ? "" : (stryCov_9fa48("153"), '!'), stryMutAct_9fa48("154") ? "" : (stryCov_9fa48("154"), 'important')])).join(stryMutAct_9fa48("155") ? "Stryker was here!" : (stryCov_9fa48("155"), ''));

/**
 * The override flag as CSS accepts it.
 *
 * The grammar puts an optional run of whitespace and comments between the
 * bang and the keyword, and matches the keyword without regard to case, so
 * `! important` and `!IMPORTANT` win the cascade exactly as the plain spelling
 * does. A gate that looked for the plain spelling was two keystrokes from
 * being no gate at all.
 */
const OVERRIDE_FLAG = new RegExp(stryMutAct_9fa48("156") ? `` : (stryCov_9fa48("156"), `!\\s*${stryMutAct_9fa48("157") ? OVERRIDE : (stryCov_9fa48("157"), OVERRIDE.slice(1))}\\b`), stryMutAct_9fa48("158") ? "" : (stryCov_9fa48("158"), 'iu'));

/**
 * The palette and cascade rules one declaration breaks.
 * @param label - the path to report offences under.
 * @param value - the declaration's value, trimmed.
 * @param line - the line the declaration is written on.
 * @param paletteDefinition - whether the declaration is one of the palette's
 * own definitions in tokens.css. It changes one thing: the function form is
 * where that sheet states the palette, so there — and only there — a colour
 * function is the palette being named rather than second-guessed. A hex or a
 * named colour is refused everywhere, definitions included, so the palette
 * keeps exactly one written form.
 * @returns one offence per rule the value breaks, none when it reads the palette.
 */
export function scanColour(label: string, value: string, line: number, paletteDefinition: boolean): Offence[] {
  if (stryMutAct_9fa48("159")) {
    {}
  } else {
    stryCov_9fa48("159");
    const offences: Offence[] = stryMutAct_9fa48("160") ? ["Stryker was here"] : (stryCov_9fa48("160"), []);
    if (stryMutAct_9fa48("163") ? false : stryMutAct_9fa48("162") ? true : stryMutAct_9fa48("161") ? paletteDefinition : (stryCov_9fa48("161", "162", "163"), !paletteDefinition)) {
      if (stryMutAct_9fa48("164")) {
        {}
      } else {
        stryCov_9fa48("164");
        const colour = RAW.exec(value);
        if (stryMutAct_9fa48("167") ? colour === null : stryMutAct_9fa48("166") ? false : stryMutAct_9fa48("165") ? true : (stryCov_9fa48("165", "166", "167"), colour !== null)) {
          if (stryMutAct_9fa48("168")) {
            {}
          } else {
            stryCov_9fa48("168");
            offences.push(stryMutAct_9fa48("170") ? {} : (stryCov_9fa48("170"), {
              label,
              line,
              why: stryMutAct_9fa48("171") ? `` : (stryCov_9fa48("171"), `${colour[0]} is written out rather than read from the palette in tokens.css`)
            }));
          }
        }
      }
    }
    if (stryMutAct_9fa48("173") ? false : stryMutAct_9fa48("172") ? true : (stryCov_9fa48("172", "173"), OVERRIDE_FLAG.test(value))) {
      if (stryMutAct_9fa48("174")) {
        {}
      } else {
        stryCov_9fa48("174");
        offences.push(stryMutAct_9fa48("176") ? {} : (stryCov_9fa48("176"), {
          label,
          line,
          why: stryMutAct_9fa48("177") ? `` : (stryCov_9fa48("177"), `an ${OVERRIDE} override wins every cascade; restate the selector instead`)
        }));
      }
    }
    return offences;
  }
}