# @deeptail/host-fleet

Host-plane fleet orchestrator for DeepSeek Harness: it gives one agent the
ability to see and direct the other sessions on the same host.

## Summary

Five model-facing tools, all thin Consumers over `ctx.sessionController`:

| Tool | What it does | Activates an agent? |
|---|---|---|
| `sessions_list` | Report sessions, newest activity first | No — stored state only |
| `sessions_spawn` | Create a session from an agent preset and send it an opening task | Yes, the new one |
| `sessions_send` | Deliver a message to another session (`queue` or `steer`) | Resumes the target |
| `sessions_follow` | Read a session's opening snapshot cut and recent messages | No |
| `sessions_cancel` | Cancel a target's active turn, preserving its queue | Live state only |

This package owns no session state. Identity, persistence, delegation, and the
live registry stay in `ctx.sessionController`, `ctx.sessionPersistence`, and
`ctx.subagents`, so nothing here becomes a second source of truth.

## Use this package

Mount it on the host plane. It injects `tools`, `sessionController`, and
`subagents`; `subagents` is required so the plugin refuses to load on a host
with no delegation registry, where a spawned session would have no owner to
report back to.

```yaml
- insert:
    - id: host-fleet
      name: '@deeptail/host-fleet'
      config:
        maxSpawned: 8
        defaultPreset: standard
        maxPromptChars: 8192
        listLimit: 50
```

Every field is deployment-varying and settable from `cordis.yml`; none is
compiled in.

## Durable state

One session event, merged into `SessionEventMap`:

- `fleet/route` — the orchestrator directed work at another session, carrying
  the target, the reason, and the admitted prompt.

It is logged because the routing decision is model-visible on replay: without
it, a resumed transcript cannot explain why a child session exists. Adding an
ordinary event type does not bump `SESSION_FORMAT_VERSION`.

## Model Experience

The model sees five tool schemas in its prompt. Each `output.schema` is a real
programmatic API so PTC mode can call it directly, and human prose lives in
`output.render` rather than in the returned value.

#### KV Cache effect

The tool schemas join prompt assembly once per agent and do not vary per turn,
so mounting this package moves the prompt prefix once and is stable thereafter.

## Boundaries

- Single host. `sessions_*` reach the sessions on the host this plugin is
  mounted on; there is no cross-host routing.
- `maxSpawned` counts creations for the life of the process, not live sessions,
  and resets on restart. It is a guard against a looping agent, not a quota.
- `sessions_follow` returns a one-shot snapshot cut rather than a live tail; the
  tool pipeline carries no long-lived subscription channel.
