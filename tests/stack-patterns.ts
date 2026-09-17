/**
 * The retired idioms a current version number can still carry: a build pipeline
 * the installed bundler no longer runs, and a stylesheet written in a language
 * no browser in its baseline reads.
 *
 * This is the other half of the stack policy. A floor refuses a package that
 * slipped back a line; it never speaks about an idiom inside a version that is
 * current, and each rule here is one a build still accepts. `rollup.config.js`
 * is a file the installed Vite never reads. The star, underscore and escape
 * markers are conditional-parsing tricks whose condition is a rendering engine
 * no browser in the installed Vite's baseline is. `$name: value` and the
 * hash-brace interpolation are preprocessor directives a CSS engine never
 * reads.
 *
 * What each rule is grounded on is the release itself, quoted so the claim can
 * be re-checked against the artifact it came from:
 *
 * - `rollup.config.*` and `esbuild.config.*` belong to the two tools Vite 8
 *   replaced. Its migration guide states: "Vite 8 uses Rolldown and Oxc based
 *   tools instead of esbuild and Rollup." Vite still accepts the `esbuild`
 *   *config key* for one release — that key is held by `vite-face.ts`, which
 *   reads the deprecation out of the installed declarations — but a file
 *   configuring either tool directly configures a step this build never runs.
 * - the browser baseline the markers are refused against is Vite 8's own
 *   default target, stated in the same guide: "Chrome 111, Edge 111, Firefox
 *   114, Safari 16.4", aligned with Baseline Widely Available as of 2026-01-01.
 * - the two directives are the syntax of the preprocessors this repository
 *   already refuses by package name in `stack-policy.ts` and by dialect and
 *   at-rule in `stack-dialects.spec.ts`. What those suites never read is the
 *   variable and interpolation spelling, which is what is here.
 *
 * @module
 */

import type { Offence } from '../scripts/offence.ts'
import { declarationsOf, withoutComments } from '../scripts/sheet-reader.ts'

/**
 * The bundler and the transformer the installed Vite replaced, by the file each
 * one is configured through.
 *
 * Both tools configure themselves with one convention — the tool's name, a
 * `.config` segment and an extension — so the names are read as a family rather
 * than one entry per extension, and the finding names the tool so a reader knows
 * which pipeline arrived.
 */
const RETIRED_BUILD_PIPELINE = /(?:^|\/)(rollup|esbuild)\.config\.[a-z]+$/u

/** The escape a value carries to reach one engine family alone. */
const RETIRED_VALUE_MARKER = /\\[09]\s*$/u

/** A quoted stretch of a value, which is a string rather than syntax. */
const QUOTED = /"[^"]*"|'[^']*'/gu

/** A preprocessor interpolation, which opens with a hash and a brace. */
const INTERPOLATION = /#\{/u

/** A property name that opens with the marker one engine family read. */
const MARKED_PROPERTY = /^[*_]/u

/** A property name that is a preprocessor's variable rather than a CSS one. */
const PREPROCESSOR_VARIABLE = /^\$/u

/**
 * Whether a shipped file is the configuration of a build pipeline this stack
 * retired.
 * @param label - the path, as the tree lists it.
 * @returns true when the file configures the replaced bundler or transformer.
 */
export function isRetiredBuildPipeline(label: string): boolean {
  return RETIRED_BUILD_PIPELINE.test(label)
}

/**
 * Every retired idiom one stylesheet carries.
 *
 * Read off the shared sheet reader rather than off lines, so a sheet written or
 * minified onto one line is read exactly as a spread-out one is. A marker on a
 * property and a marker on a value are separate findings because they are
 * separate declarations to repair: the star and the underscore sit on the
 * property, and the escape is the last thing the value says.
 * @param label - the path to report offences under.
 * @param text - the sheet's contents.
 * @returns one offence per retired idiom, empty when it carries none.
 */
export function retiredSheetOffences(label: string, text: string): Offence[] {
  const offences: Offence[] = []
  for (const { property, value, line } of declarationsOf(text)) {
    if (MARKED_PROPERTY.test(property)) {
      offences.push({
        label,
        line,
        why: `${property} carries the star or underscore marker, which only a rendering engine no browser in the installed Vite's baseline is ever read`,
      })
      continue
    }
    if (PREPROCESSOR_VARIABLE.test(property)) {
      offences.push({
        label,
        line,
        why: `${property} is a preprocessor variable; a CSS engine reads none, and this repository ships its stylesheets as CSS`,
      })
      continue
    }
    const unquoted = value.replaceAll(QUOTED, '')
    const marker = RETIRED_VALUE_MARKER.exec(unquoted)
    if (marker !== null) {
      offences.push({
        label,
        line,
        why: `${unquoted.trim()} ends in ${marker[0].trim()}, a marker only a rendering engine no browser in the installed Vite's baseline is ever read`,
      })
    }
  }
  for (const [index, line] of withoutComments(text).split('\n').entries()) {
    if (INTERPOLATION.test(line)) {
      offences.push({
        label,
        line: index + 1,
        why: '#{ opens a preprocessor interpolation; a CSS engine reads none, and this repository ships its stylesheets as CSS',
      })
    }
  }
  return offences
}
