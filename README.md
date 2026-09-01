# DeepTail

A Tauri 2 client — desktop, iOS, and Android — that connects to a
[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) host,
monitors its agent sessions live, answers approvals out of band, and gives one
agent the tools to orchestrate the others.

> Status: scaffold. The shape below is real and the Rust carrier is
> implemented, but three of the four harness-side seams it depends on are not
> upstream yet. See [Harness seams](#harness-seams).

## How it fits together

```
┌── DeepTail (Tauri) ─────────────────┐        ┌── dsh host ──────────────┐
│  webview: the harness web client    │        │                          │
│    __DSH_TRANSPORT__ ──┐            │        │  /api          (unary)   │
│                        │ IPC        │        │  /api/boot     (table)   │
│  Rust: registry, token,│            │ HTTPS  │  /api/remote.mux (streams)│
│        reqwest, mux ───┴────────────┼───────▶│  /plugins/<id>/client.js │
└─────────────────────────────────────┘        └──────────────────────────┘
```

**The webview never opens a network connection.** That is load-bearing, not
stylistic: Tauri serves the page from a secure-context origin, so it cannot
open a `ws://` socket at all, and it cannot attach an `Authorization` header to
a WebSocket handshake even when it can reach one. Holding the wire in Rust
removes both limits, keeps the device token out of JavaScript, and lets the
app ship a CSP that names no host:

```
default-src 'self'; script-src 'self' blob:; connect-src ipc: http://ipc.localhost
```

**DeepTail ships no harness UI.** The client plugins are fetched from whichever
host you paired with, so client and host can never drift — which matters
because `SESSION_FORMAT_VERSION` is pinned at `0` with no migration path.

## Layout

```
apps/deeptail/          the Tauri app
  src/                  boot sequence, carrier, lifecycle, host picker
  src-tauri/            the entire network and credential surface
packages/host-fleet/    the Cordis plugin: sessions_* orchestration tools
profile/                the dsh profile DeepTail installs on a host
```

## Credentials

One device token per host, in the platform's own credential store. The
all-in-one `keyring` crate is desktop-only in its default feature, so this uses
`keyring-core` with exactly one native store linked per target — which is what
makes iOS and Android work:

| Target | Store |
|---|---|
| macOS, iOS | `apple-native-keyring-store` |
| Android | `android-native-keyring-store` (Keystore + SharedPreferences) |
| Windows | `windows-native-keyring-store` |
| Linux | `dbus-secret-service-keyring-store` |

Pairing spends the launch token `dsh web` already prints — pasted on desktop,
scanned as a QR code on mobile — for a long-lived device grant. Plaintext
pairing is refused off loopback.

## Harness seams

DeepTail needs four changes in `deepseek-harness`. Each is a gap in the
harness's own carrier-override story rather than a DeepTail special case; the
only existing override is the in-process WebWorker preview, which sidesteps all
four by running the host locally.

| # | Seam | Why |
|---|---|---|
| a | A socket factory on `ClientTransportHooks` | `remoteStreamUrl()` derives the mux authority from `location.origin`, and a secure-context page cannot open `ws://` |
| b | A device-credential tier beside `BrowserAuth` | The carrier accepts no `Authorization` header today |
| c | `collectIndexInjections()` over an authenticated `/api` route | The boot table is only reachable as injected HTML |
| d | Promote `applyIndexInjections` out of `packages/experimental/` | A non-served shell needs it, and experimental packages are unpublished |

Until (a)–(d) land, the app builds and the Rust carrier works, but the shell
cannot complete a boot against a host.

## Development

```sh
bun install
bun run validate          # lint, typecheck, test, knip
bun run tauri dev         # desktop
bun run tauri android dev # requires Android Studio, JAVA_HOME, ANDROID_HOME, NDK_HOME
bun run tauri ios dev     # macOS + Xcode + CocoaPods only
```

`cargo test` in `apps/deeptail/src-tauri` covers origin canonicalization and
pairing-link parsing, including the cases that must be refused.

## Toolchain

TypeScript 7.0.2 · Bun 1.4.0 · Node 24 LTS (26 for development) · Tauri 2.11 ·
Rust edition 2024 · Vite 8.

## License

MIT
