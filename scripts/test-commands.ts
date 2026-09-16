/**
 * What each `bun test` command in this repository actually runs.
 *
 * `bun test` reads a positional argument as a path *filter*, not as a path: the
 * shell expands the glob first, and each expanded entry then matches every file
 * whose path contains it. Two silences follow from that, and both have bitten
 * this repository. A filter that selects nothing runs nothing and exits zero
 * beside the live ones, so a renamed suite turns every command that named it by
 * hand into a command that runs less than it says. And a filter that selects
 * more than it names swept a browser suite into the unit run, which needs a
 * built bundle nothing before it in the chain builds.
 *
 * The commands live in two places — the manifest's scripts and the mutation
 * scopes' command runners — and both name their suites by hand, so both are
 * read here rather than in one of the suites that reads them.
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
import { manifestScripts } from './manifest.ts';
import { scopeConfigs } from './stryker-config.ts';

/** One `bun test` command, and where it is written. */
export interface TestCommand {
  /** The file and key that holds it. */
  readonly where: string;
  /** The command as it is written. */
  readonly command: string;
}

/** The word that takes the next word as its value rather than as a filter. */
const VALUED_FLAG = stryMutAct_9fa48("2997") ? "" : (stryCov_9fa48("2997"), '--timeout');

/** The words that end one shell statement and begin the next. */
const SEPARATORS = new Set(stryMutAct_9fa48("2998") ? [] : (stryCov_9fa48("2998"), [stryMutAct_9fa48("2999") ? "" : (stryCov_9fa48("2999"), '&&'), stryMutAct_9fa48("3000") ? "" : (stryCov_9fa48("3000"), ';'), stryMutAct_9fa48("3001") ? "" : (stryCov_9fa48("3001"), '||'), stryMutAct_9fa48("3002") ? "" : (stryCov_9fa48("3002"), '|')]));

/**
 * The paths one shell glob expands to, against the files the repository ships.
 *
 * Only `*` is honoured, which is the whole of what the commands use; a pattern
 * carrying anything else expands to nothing here and is refused by name rather
 * than reading as an empty answer.
 * @param pattern - one positional argument from a command.
 * @param files - every spec the repository ships.
 * @returns the paths the shell would hand bun.
 * @throws Error when the pattern uses a shape this reader does not expand.
 */
export function expand(pattern: string, files: readonly string[]): string[] {
  if (stryMutAct_9fa48("3003")) {
    {}
  } else {
    stryCov_9fa48("3003");
    if (stryMutAct_9fa48("3005") ? false : stryMutAct_9fa48("3004") ? true : (stryCov_9fa48("3004", "3005"), (stryMutAct_9fa48("3006") ? /[^?[\]{}]/u : (stryCov_9fa48("3006"), /[?[\]{}]/u)).test(pattern))) throw new Error(stryMutAct_9fa48("3008") ? `` : (stryCov_9fa48("3008"), `this reader cannot expand ${pattern}`));
    if (stryMutAct_9fa48("3011") ? false : stryMutAct_9fa48("3010") ? true : stryMutAct_9fa48("3009") ? pattern.includes('*') : (stryCov_9fa48("3009", "3010", "3011"), !pattern.includes(stryMutAct_9fa48("3012") ? "" : (stryCov_9fa48("3012"), '*')))) return stryMutAct_9fa48("3013") ? [] : (stryCov_9fa48("3013"), [pattern]);
    const source = stryMutAct_9fa48("3014") ? `` : (stryCov_9fa48("3014"), `^${pattern.split(stryMutAct_9fa48("3015") ? "" : (stryCov_9fa48("3015"), '*')).map(stryMutAct_9fa48("3016") ? () => undefined : (stryCov_9fa48("3016"), part => part.replaceAll(stryMutAct_9fa48("3017") ? /[^.+^$()|\\]/gu : (stryCov_9fa48("3017"), /[.+^$()|\\]/gu), stryMutAct_9fa48("3018") ? String.raw`` : (stryCov_9fa48("3018"), String.raw`\$&`)))).join(stryMutAct_9fa48("3019") ? "" : (stryCov_9fa48("3019"), '[^/]*'))}$`);
    const matcher = new RegExp(source, stryMutAct_9fa48("3020") ? "" : (stryCov_9fa48("3020"), 'u'));
    return stryMutAct_9fa48("3021") ? files : (stryCov_9fa48("3021"), files.filter(stryMutAct_9fa48("3022") ? () => undefined : (stryCov_9fa48("3022"), label => matcher.test(label))));
  }
}

/**
 * The filters a command hands bun, with its flags and their values dropped.
 *
 * A command can hold more than one statement — the browser and axe scripts
 * build first and test after — so every `bun test` in it is read, not the
 * first: reading only the first would leave a later run's filters unread,
 * which is the same silence this module exists to refuse.
 * @param command - the command as it is written.
 * @returns the positional words of every `bun test` statement, in order.
 */
export function filtersOf(command: string): string[] {
  if (stryMutAct_9fa48("3023")) {
    {}
  } else {
    stryCov_9fa48("3023");
    const words = stryMutAct_9fa48("3024") ? command.split(/\s+/u) : (stryCov_9fa48("3024"), command.trim().split(stryMutAct_9fa48("3026") ? /\S+/u : stryMutAct_9fa48("3025") ? /\s/u : (stryCov_9fa48("3025", "3026"), /\s+/u)));
    const positional: string[] = stryMutAct_9fa48("3027") ? ["Stryker was here"] : (stryCov_9fa48("3027"), []);
    for (const [index, word] of words.entries()) {
      if (stryMutAct_9fa48("3028")) {
        {}
      } else {
        stryCov_9fa48("3028");
        if (stryMutAct_9fa48("3031") ? word !== 'test' && words[index - 1] !== 'bun' : stryMutAct_9fa48("3030") ? false : stryMutAct_9fa48("3029") ? true : (stryCov_9fa48("3029", "3030", "3031"), (stryMutAct_9fa48("3033") ? word === 'test' : stryMutAct_9fa48("3032") ? false : (stryCov_9fa48("3032", "3033"), word !== (stryMutAct_9fa48("3034") ? "" : (stryCov_9fa48("3034"), 'test')))) || (stryMutAct_9fa48("3036") ? words[index - 1] === 'bun' : stryMutAct_9fa48("3035") ? false : (stryCov_9fa48("3035", "3036"), words[stryMutAct_9fa48("3037") ? index + 1 : (stryCov_9fa48("3037"), index - 1)] !== (stryMutAct_9fa48("3038") ? "" : (stryCov_9fa48("3038"), 'bun')))))) continue;
        for (let at = stryMutAct_9fa48("3039") ? index - 1 : (stryCov_9fa48("3039"), index + 1); stryMutAct_9fa48("3042") ? at >= words.length : stryMutAct_9fa48("3041") ? at <= words.length : stryMutAct_9fa48("3040") ? false : (stryCov_9fa48("3040", "3041", "3042"), at < words.length); stryMutAct_9fa48("3043") ? at -= 1 : (stryCov_9fa48("3043"), at += 1)) {
          if (stryMutAct_9fa48("3044")) {
            {}
          } else {
            stryCov_9fa48("3044");
            const next = stryMutAct_9fa48("3045") ? words[at] && '' : (stryCov_9fa48("3045"), words[at] ?? (stryMutAct_9fa48("3046") ? "Stryker was here!" : (stryCov_9fa48("3046"), '')));
            if (stryMutAct_9fa48("3048") ? false : stryMutAct_9fa48("3047") ? true : (stryCov_9fa48("3047", "3048"), SEPARATORS.has(next))) break;
            if (stryMutAct_9fa48("3051") ? next !== VALUED_FLAG : stryMutAct_9fa48("3050") ? false : stryMutAct_9fa48("3049") ? true : (stryCov_9fa48("3049", "3050", "3051"), next === VALUED_FLAG)) {
              if (stryMutAct_9fa48("3052")) {
                {}
              } else {
                stryCov_9fa48("3052");
                stryMutAct_9fa48("3053") ? at -= 1 : (stryCov_9fa48("3053"), at += 1);
                continue;
              }
            }
            if (stryMutAct_9fa48("3056") ? next.endsWith('-') : stryMutAct_9fa48("3055") ? false : stryMutAct_9fa48("3054") ? true : (stryCov_9fa48("3054", "3055", "3056"), next.startsWith(stryMutAct_9fa48("3057") ? "" : (stryCov_9fa48("3057"), '-')))) continue;
            if (stryMutAct_9fa48("3058")) {
              ;
            } else {
              stryCov_9fa48("3058");
              positional.push(next);
            }
          }
        }
      }
    }
    return positional;
  }
}

/**
 * Whether one filter selects at least one spec the repository ships.
 *
 * A glob is expanded the way the shell expands it, before bun ever sees it; a
 * plain word is matched the way bun matches it, as a substring of a path.
 * @param filter - the positional word.
 * @param all - every spec the repository ships.
 * @returns true when the filter selects something.
 */
export function selectsSomething(filter: string, all: readonly string[]): boolean {
  if (stryMutAct_9fa48("3059")) {
    {}
  } else {
    stryCov_9fa48("3059");
    if (stryMutAct_9fa48("3061") ? false : stryMutAct_9fa48("3060") ? true : (stryCov_9fa48("3060", "3061"), filter.includes(stryMutAct_9fa48("3062") ? "" : (stryCov_9fa48("3062"), '*')))) return stryMutAct_9fa48("3066") ? expand(filter, all).length <= 0 : stryMutAct_9fa48("3065") ? expand(filter, all).length >= 0 : stryMutAct_9fa48("3064") ? false : stryMutAct_9fa48("3063") ? true : (stryCov_9fa48("3063", "3064", "3065", "3066"), expand(filter, all).length > 0);
    return stryMutAct_9fa48("3067") ? all.every(label => label.includes(filter)) : (stryCov_9fa48("3067"), all.some(stryMutAct_9fa48("3068") ? () => undefined : (stryCov_9fa48("3068"), label => label.includes(filter))));
  }
}

/**
 * The specs one filter selects, the way bun and the shell between them do.
 * @param filter - the positional word.
 * @param all - every spec the repository ships.
 * @returns the specs the command would run for that filter.
 */
export function selected(filter: string, all: readonly string[]): string[] {
  if (stryMutAct_9fa48("3069")) {
    {}
  } else {
    stryCov_9fa48("3069");
    if (stryMutAct_9fa48("3071") ? false : stryMutAct_9fa48("3070") ? true : (stryCov_9fa48("3070", "3071"), filter.includes(stryMutAct_9fa48("3072") ? "" : (stryCov_9fa48("3072"), '*')))) return expand(filter, all);
    return stryMutAct_9fa48("3073") ? all : (stryCov_9fa48("3073"), all.filter(stryMutAct_9fa48("3074") ? () => undefined : (stryCov_9fa48("3074"), label => label.includes(filter))));
  }
}

/**
 * Every `bun test` command the repository ships, by where it is written.
 * @returns one entry per command, labelled by the file and key that holds it.
 */
export function testCommands(): TestCommand[] {
  if (stryMutAct_9fa48("3075")) {
    {}
  } else {
    stryCov_9fa48("3075");
    const fromScripts = stryMutAct_9fa48("3076") ? [...manifestScripts()].map(([name, command]) => ({
      where: `package.json script ${name}`,
      command
    })) : (stryCov_9fa48("3076"), (stryMutAct_9fa48("3077") ? [] : (stryCov_9fa48("3077"), [...manifestScripts()])).filter(stryMutAct_9fa48("3078") ? () => undefined : (stryCov_9fa48("3078"), ([, command]) => command.includes(stryMutAct_9fa48("3079") ? "" : (stryCov_9fa48("3079"), 'bun test ')))).map(stryMutAct_9fa48("3080") ? () => undefined : (stryCov_9fa48("3080"), ([name, command]) => stryMutAct_9fa48("3081") ? {} : (stryCov_9fa48("3081"), {
      where: stryMutAct_9fa48("3082") ? `` : (stryCov_9fa48("3082"), `package.json script ${name}`),
      command
    }))));
    const fromScopes = stryMutAct_9fa48("3083") ? scopeConfigs().map(scope => ({
      where: scope.label,
      command: scope.command
    })) : (stryCov_9fa48("3083"), scopeConfigs().map(stryMutAct_9fa48("3084") ? () => undefined : (stryCov_9fa48("3084"), scope => stryMutAct_9fa48("3085") ? {} : (stryCov_9fa48("3085"), {
      where: scope.label,
      command: scope.command
    }))).filter(stryMutAct_9fa48("3086") ? () => undefined : (stryCov_9fa48("3086"), entry => entry.command.includes(stryMutAct_9fa48("3087") ? "" : (stryCov_9fa48("3087"), 'bun test ')))));
    return stryMutAct_9fa48("3088") ? [] : (stryCov_9fa48("3088"), [...fromScripts, ...fromScopes]);
  }
}