# DeepTail

[![TypeScript 7.0.2](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun 1.4](https://img.shields.io/badge/Bun-1.4-000000?logo=bun&logoColor=white)](https://bun.sh/)
[![Tauri 2.11](https://img.shields.io/badge/Tauri-2.11-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![Rust edition 2024](https://img.shields.io/badge/Rust-edition%202024-000000?logo=rust&logoColor=white)](https://doc.rust-lang.org/edition-guide/rust-2024/)
[![Vite 8](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Playwright 1.62](https://img.shields.io/badge/Playwright-1.62-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Platforms: desktop, iOS, Android](https://img.shields.io/badge/platforms-desktop%20%C2%B7%20iOS%20%C2%B7%20Android-4B5563)](#layout)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

A Tauri 2 client — desktop, iOS, and Android — that connects to
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) hosts and
gives you one control plane over the agent sessions running on all of them.

![The fleet roster across two hosts](apps/deeptail/tests/screenshots/fleet-multi-host.png)

## Explain it like I'm five

You have robot helpers working on several computers at once. Each computer keeps
its own list of what its helpers are doing, and to check on them you would have
to walk over to every computer in turn.

DeepTail is one window that shows every list at the same time. You open it and
see every helper on every computer, which ones are busy right now, and when each
one last did something. You can start a new helper, tell one what to do next,
or tell one to stop — without going to that computer.

When you want to *read* everything a helper wrote, DeepTail opens that computer's
own reader, because that computer is the one holding the whole story.

Three rules it keeps:

- **One computer answers for itself.** If one is switched off, its row says so
  and offers a Retry. The others keep working — one broken computer never blanks
  the window.
- **The password never touches the page.** The part you see is just drawing.
  A separate Rust part holds the key for each computer and does the talking.
- **One scrollbar per direction.** Panes do not nest inside other panes, so the
  wheel always moves the thing you are pointing at.

## How it works

```mermaid
flowchart LR
  subgraph device["Your device — one DeepTail app"]
    direction TB
    ui["<b>Webview</b><br/>shell · roster · dialogs<br/>draws only, opens no socket"]
    rust["<b>Rust core</b><br/>host registry · reqwest · mux client"]
    store[("Keystore<br/>one device token per host")]
    ui -->|"Tauri IPC"| rust
    rust -->|"reads the token"| store
  end

  hosts["<b>Every paired dsh host</b><br/>Workstation · Lab box · …<br/>/api  ·  /api/remote.mux"]
  client["<b>That host's harness client</b><br/>transcripts · approvals · plans"]

  rust -->|"unary: list · spawn · message · stop"| hosts
  hosts -.->|"mux: live roster events"| rust
  ui ==>|"open a session — hands off"| client

  classDef inside fill:#eef2ff,stroke:#4338ca,color:#1e1b4b
  classDef host fill:#ecfdf5,stroke:#047857,color:#064e3b
  classDef hand fill:#fef3c7,stroke:#b45309,color:#451a03
  class ui,rust,store inside
  class hosts host
  class client hand
```

Two things the chart is drawn to show. Every arrow that crosses the device
boundary starts at Rust, never at the webview — the solid one is the unary call
DeepTail makes, the dashed one is the stream that keeps the roster current
without polling, and the device token stays on the Rust side of the IPC in both.
And the thick arrow is the product boundary: DeepTail owns the fleet, the
harness client owns one conversation, and choosing a session is where one hands
over to the other.

## What it does

**DeepTail is the control plane; the harness client is the reader.** Everything
DeepTail does is a unary call that works over its own carrier today. Reading a
conversation is a stream, and that belongs to the client already built for it.

| DeepTail | The harness client |
|---|---|
| Pair, switch and unpair hosts | Transcripts and tool cards |
| One roster across every paired host, live | Approvals, projects, plans |
| Spawn a session from an agent preset | Everything session-local |
| Message or steer a session | |
| Stop a running turn | |

Choosing a session hands off: DeepTail boots that host's own client. It opens at
the client's default view — nothing in its boot surface takes a session id — and
the copy says so rather than implying a deep link it cannot deliver.

## Why the wire lives in Rust

**The webview never opens a network connection.** Tauri serves the page from a
secure-context origin, so it cannot open a `ws://` socket at all and cannot
attach an `Authorization` header to a WebSocket handshake. Holding the wire in
Rust removes both limits, keeps the device token out of JavaScript, and lets the
app ship a CSP that names no host:

```
default-src 'self'; script-src 'self' blob:; connect-src ipc: http://ipc.localhost
```

## Design

The UI is plain DOM — it paints before any harness bundle loads — but not a
separate design language. `src/styles/tokens.css` holds the harness's own
resolved `--dsw-alias-*` and `--dsw-specific-*` values and its
`body[data-ds-dark-theme]` mechanism; geometry follows `ui-sidebar`,
`ui-primitives/Menu`, `ui-primitives/Modal` and `ui-workspace/rows`.

**No inline styles.** Every visual is a class, enforced by
`scripts/check-no-inline-styles.ts`. It reads a parse rather than lines — oxc
for scripts, the parser oxlint uses, and parse5 for markup — so the rules are
stated about nodes and there is no spelling to get around them: the dotted
property, an indexed write, a bulk assign, destructuring, the CSS Typed OM, a
`style` attribute in markup written anywhere in the source, and any call that
sets an attribute or a property under that name. Names are constant-folded, so
one held in a constant, split with `+`, built in a template, case-shifted,
joined or spelt from character codes is read as the name it produces; a name the
gate cannot read at all is refused rather than allowed. The two calls that set an
attribute without naming it — `setAttributeNode` and `setNamedItem` — are
refused outright.

The files it reads are the files git says the repository ships, so its reach
cannot drift from a hand-written list and its count does not move with whether a
build has run. `scripts/ban-gate.ts` reads the same parse for idioms the project
has moved past and for directives that switch a checker off; a directive is only
ever a comment, so the comments are what it searches, and Rust is searched too.
Both gates are driven by `tests/gates.spec.ts`, which runs every rule against a
source that breaks it and a source that merely resembles it.

A stylesheet is not an inline style and is not banned: `injections.ts` builds
one because the host's boot table says to. Neither is `color-scheme`, a CSS
property keyed off the same `body[data-ds-dark-theme]` attribute as the palette,
so native UA chrome cannot drift from the theme. Beyond those, the gate has no
allowances.

| | |
|---|---|
| ![Connection menu](apps/deeptail/tests/screenshots/connection-menu.png) | ![Dark](apps/deeptail/tests/screenshots/shell-dark.png) |
| Host switcher — selection is a trailing check, never a fill | The harness dark palette |
| ![Compose](apps/deeptail/tests/screenshots/compose-sheet.png) | ![Mobile](apps/deeptail/tests/screenshots/shell-mobile.png) |
| Message or steer a session | 390×844, sidebar as a drawer |
| ![Partial failure](apps/deeptail/tests/screenshots/fleet-partial-failure.png) | ![Pairing validation](apps/deeptail/tests/screenshots/picker-validation.png) |
| One host down, the rest still listed, Retry on the row that failed | The refusal names what to fix, below the field it is about |
| ![Pairing](apps/deeptail/tests/screenshots/picker-list.png) | ![Chinese](apps/deeptail/tests/screenshots/picker-zh.png) |
| Paired hosts, before a shell exists | The empty picker in Chinese — every string comes from the dictionary |

Every state is built and screenshotted: loading, empty-after-settled, error,
partial failure (one host down, the rest still listed), unauthorized, and
offline. `apps/deeptail/tests/screenshots/` holds all 20, and each is
written by the case that asserts the state, so none can drift from the code.

## Layout

```
apps/deeptail/
  src/            shell, connection menu, roster, dialogs, carrier, stream client
  src-tauri/      the entire network and credential surface
packages/host-fleet/   Cordis plugin: sessions_* orchestration tools
profile/               the dsh profile DeepTail installs on a host
```

## Credentials

One device token per host in the platform's own store. The all-in-one `keyring`
crate is desktop-only in its default feature, so this uses `keyring-core` with
one native store per target — which is what makes iOS and Android work:
`apple-native-keyring-store`, `android-native-keyring-store` (Keystore +
SharedPreferences), `windows-native-keyring-store`,
`dbus-secret-service-keyring-store`.

Pairing spends the launch token `dsh web` already prints. Plaintext pairing is
refused off loopback.

## Harness seams

Reading a conversation needs the harness client, and that client cannot boot
until three changes land upstream. The control plane does not depend on them.

| Seam | Why |
|---|---|
| A socket factory on `ClientTransportHooks` | `remoteStreamUrl()` derives the mux authority from `location.origin`, and a secure-context page cannot open `ws://` |
| `collectIndexInjections()` over an authenticated `/api` route | the boot table is reachable only as injected HTML |
| Promote `applyIndexInjections` out of `packages/experimental/` | a non-served shell needs it, and that package is not published |

## Development

```sh
bun install
bun run validate          # biome, oxlint, styles gate, typecheck, tests, knip, clippy, cargo test, browser
bun run tauri dev         # desktop
bun run tauri android dev # Android Studio, JAVA_HOME, ANDROID_HOME, NDK_HOME
bun run tauri ios dev     # macOS + Xcode + CocoaPods only
```

Browser tests drive the real built bundle in Chromium and substitute only the
Tauri IPC boundary, which no browser provides. They assert on rendered text and
roles and write every screenshot above. The scripted IPC covers the mux socket
as well as unary calls, so the live roster — a row arriving over `$events`, a
removal, a status flip, a dropped stream — is exercised rather than assumed.

Two suites read the rendered page rather than the source. `a11y.browser.spec.ts`
runs axe over `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`, `wcag22aa` and
`best-practice`, and treats `incomplete` as a violation, so a rule axe could not
settle is a failure rather than a pass. `structure.ts` covers what no rule engine
reports: a duplicate id, an interactive element inside another, a skipped heading
level, an ARIA reference pointing at nothing, an item outside its list, a
document that scrolls sideways, text clipped by its own box, a pane that scrolls
inside a pane that also scrolls, and a target under the platform minimum. The
geometry half lives in `structure-layout.ts`; both are shipped into the page as
their own source text, so nothing they measure against can be left behind.

The suites split the same way. `structure.browser.spec.ts` walks the surfaces
and asserts each is clean; `structure-geometry.browser.spec.ts` measures what a
finger reaches and, because a check that never reports is indistinguishable from
one that cannot, makes the shell scroll inside itself and asserts the pane rule
names it.

Playwright resolves the Chromium it installed. An image that pre-ships one at a
fixed path instead names it in `apps/deeptail/tests/chromium.json`:

```json
{ "executablePath": "/opt/pw-browsers/chromium-1194/chrome-linux/chrome" }
```

## Toolchain

TypeScript 7.0.2 · Bun 1.4 · Node 24 LTS · Tauri 2.11 · Rust edition 2024 ·
Vite 8 · Playwright 1.62.1.

## License

MIT
