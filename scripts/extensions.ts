/**
 * The file kinds the gates read, named once.
 *
 * Two gates declared the script extensions byte for byte, under two names, and
 * imported each other's under aliases that read as two different facts. They
 * are one fact: which files carry code this repository is responsible for. A
 * second copy is a list that can be extended in one place and not the other,
 * and the gate that missed the extension simply stops reading those files —
 * silently, because a gate that reads nothing reports nothing.
 *
 * @module
 */

/** Extensions whose contents are read off a syntax tree. */
export const SCRIPT_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs'] as const

/** Extensions read line by line, having no parser here. */
export const PLAIN_EXTENSIONS = ['.rs', '.toml', '.yml', '.yaml', '.json'] as const

/** Extensions whose contents are markup. */
export const MARKUP_EXTENSIONS = ['.html', '.htm'] as const

/** Extensions whose contents are stylesheets. */
export const STYLE_EXTENSIONS = ['.css'] as const
