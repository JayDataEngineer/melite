# @infer/flow-tavern

A pure-Python (FastHTML + MonsterUI) sidebar UI for the
**inference.cpp** flow system. One process, one `uv sync`, one
`uv run`. No Node, no Vite, no dual toolchain.

```
┌──────────────┬──────────────────────────────────────────────┐
│  🏛 Tavern    │  New Run                                     │
│  ─────────   │  ──────────────────────────────────────────  │
│  Filter…     │  h3-timeline     [video]  [lane]              │
│  Lanes       │                                              │
│   h3-timeline│  Description: "The 9:16 h3 video timeline…"  │
│   audio-tts  │                                              │
│   creature   │  ┌─ Params ───────────┐ ┌─ Actions ──────┐   │
│   kimodo     │  │ prompt   [______]  │ │ [Validate]     │   │
│   sprite…    │  │ seed     [  42  ]  │ │ [▶ Start run]  │   │
│  Drafts      │  │ fps      [  24  ]  │ └────────────────┘   │
│   📝 my-shot │  └────────────────────┘                       │
│  Runs        │  ▸ compile result (inline)                    │
│   ✓ run_abc  │                                              │
│   ▷ run_def  │                                              │
│   ✗ run_ghi  │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

## What this is — and what it isn't

**Is**: a flow *operator* surface. The lane list, the param form,
the run status, the stop button. Everything an operator does by
hand against `curl` + a JSON viewer, but in two clicks.

**Isn't**: a chat surface, an agent harness, or a card deck.
DSH (`packages/harness/dsh/`) already owns the harness and the
chat-style card surface; this plugin is the flow operator pane
that sits next to it.

The two talk to the same gateway over HTTP — neither knows the
other exists. That's the whole point.

## Install

```bash
# from the plugin dir
./install.sh
# or one-shot
uv tool install ./packages/harness/dsh/infer-flow-tavern
```

`uv tool install` puts the `infer-flow-tavern` console script on
`$PATH`. Zero Node, zero Vite, zero npm. The `pyproject.toml` is
the whole dependency declaration.

## Run

```bash
MELITE_GATEWAY=http://localhost:33081 infer-flow-tavern
# open http://127.0.0.1:33091
```

Or, no-install:

```bash
uvx --from ./packages/harness/dsh/infer-flow-tavern infer-flow-tavern \
  --gateway http://localhost:33081
```

Flags:

| flag | env | default | meaning |
|---|---|---|---|
| `--gateway` | `MELITE_GATEWAY` | — | Gateway base URL. Required (or set `FLOATER_ALLOW_LOCAL=1` to enable the `localhost:33081` fallback). |
| `--host` | `FLOATER_HOST` | `127.0.0.1` | Bind host. |
| `--port` | `FLOATER_PORT` | `33091` | Bind port. **Not** 33081 (the gateway). |
| `--reload` | `FLOATER_RELOAD=1` | off | FastHTML live reload. |
| `--log-level` | `FLOATER_LOG_LEVEL` | `info` | uvicorn log level. |

## The wire — what the Tavern talks to

Every byte the Tavern renders comes from the gateway's documented
REST surface. The client (`gateway_client.py`) is the only place
endpoint paths live; every other module imports helpers.

| Surface | Endpoint | Used for |
|---|---|---|
| Lane table | `GET /v1/lanes` | sidebar Lanes section |
| Lane bundle | `GET /v1/cards/{lane}/bundle` | param_schema for the form |
| Drafts | `GET /v1/flows/drafts[/{id}]` | sidebar Drafts section |
| Runs | `GET /v1/flows/runs[/{id}]` | sidebar Runs section |
| Live status | `GET /v1/flows/status/{id}` | run-detail polling |
| Compile | `POST /v1/flows/validate` | "Validate" button (no GPU) |
| Run | `POST /v1/flows/start` | "▶ Start run" button |
| Stop | `POST /v1/flows/stop/{id}` | "■ Stop" button |
| Events (SSE) | `GET /v1/flows/events/{id}` | (planned) live stage flips |

The validate door is the AI's feedback loop: `POST /v1/flows/validate`
returns verbatim compile refusals with **no queue slot, no GPU
claim, no sidecar** (the QUEUE LANE LAW). The Tavern surfaces those
errors inline (the "Compile refusal" alert), so the operator can
fix a typo and retry without burning a GPU minute.

## Architecture

```
inference.cpp/packages/harness/dsh/infer-flow-tavern/
├── pyproject.toml             # standalone uv env (NOT base-env)
├── cordis.patch.yml           # DSH sidebar button drop-in
├── install.sh                 # uv tool install + profile patches
├── README.md                  # this file
├── src/infer_flow_tavern/
│   ├── __init__.py
│   ├── __main__.py            # CLI + uvicorn launcher
│   ├── app.py                 # FastHTML routes + MonsterUI layout
│   └── gateway_client.py      # frozen pydantic rows + httpx
└── tests/
    ├── test_client.py         # gateway_client unit tests
    └── test_routes.py         # route tests against a fake client
```

Two modules, deliberately:

- **`gateway_client.py`** — frozen pydantic rows, the wire contract.
  No `Any` leaks; no stringly handshakes outside the field names
  the gateway actually returns. The PYTHON SHAPE LAW makes wrong
  shapes unbuildable.
- **`app.py`** — FastHTML routes, MonsterUI components, HTMX
  fragments. The only place HTML lives. Imports the client; never
  imports `httpx` directly.

## Laws honored

| Law | How this plugin honors it |
|---|---|
| **QUEUE LANE LAW** | The launcher refuses an empty / schemeless `GATEWAY_URL` at construction. `FLOATER_ALLOW_LOCAL=1` is the explicit opt-in to the canonical fallback (never a silent default). The start door sends `{flow: lane_id}` — never hardcoded model names. |
| **RESILIENCE LAW** | Gateway errors are surfaced VERBATIM in the UI (the sidecar's `error` field, the validate door's compile refusal). No generic "failed" toast. |
| **PYTHON SHAPE LAW** | The client is frozen pydantic rows. Closed vocabs (run status colors) are explicit. `Lane`, `Draft`, `Run`, `StageRow` are classes; statuses, lane kinds, etc. are *not* stringly-typed — they pass through mapping tables that the operator can grep. |
| **PLUGIN ARCHITECTURE LAW** | This is a *harness* plugin, not an engine plugin. It does not import `py/` or `packages/engines/*` — gateway ownership of the lane/card surface is untouched. |
| **EXTENSION LAW** | The Tavern ships zero vendored ComfyUI nodes. It reads the gateway's wire only. |
| **PROVISIONING LAW** | This is its own `pyproject.toml`, not a base-env dep. The management plane stays base; a UI is opt-in. |

## DSH sidebar

The `cordis.patch.yml` adds an "🏛 Flow Tavern" row to the DSH web
sidebar. The button opens the Tavern in a new tab; DSH never
proxies the Tavern (they're independent HTTP servers by design).

If your profile is rendered by `infer-provision` (the family
provisioner), it picks up the patch automatically — drop
`tavern.patch.yml` into the profile dir and add it to the
profile's `cordis.include`. The provisioner family follows the
same row pattern as `infer-card-deck`, `infer-media`, etc.

For the manual `dsh plugin add` route:

```bash
dsh plugin --profile inference add \
  /path/to/inference.cpp/packages/harness/dsh/infer-flow-tavern
```

Profiles that want the Tavern button but not the launch row (e.g.
a CI that runs the Tavern off-host) override the row with
`disabled: true` in their own patch.

## Why FastHTML + MonsterUI, not React

Two reasons, both operator-driven:

1. **One toolchain, one boot.** The gateway is Python. The agent
   harness is Python. Adding a Node + Vite + React + Tailwind
   triple to a flow operator surface is the dual-runtime nightmare
   the rest of the estate is structured to avoid. The Tavern is
   `uv sync && uv run infer-flow-tavern` and nothing else.

2. **The form is the whole surface.** Sliders at 60fps, canvas
   manipulation, drag-and-drop orchestration — none of that is in
   scope for a flow operator pane. It's form fields, a validate
   button, a start button, and a status table. FastHTML nails
   exactly that.

If you ever need 60fps sliders, reach for Alpine.js (10 KB, pairs
with HTMX); the comment in `_sidebar` already leaves the door
open. We don't ship sliders because we don't need them.

## Tests

The plugin ships with `tests/` — a small unit suite for
`gateway_client` and a routes suite against a fake client. The
shared DSH family testkit (`packages/harness/dsh/testkit/`) covers
the JS-side sibling plugins; the Python side runs pytest:

```bash
cd packages/harness/dsh/infer-flow-tavern
uv sync
uv run pytest
```

The vitest testkit stays as-is — it's the contract for the
`harness/dsh` JS family (melite-tools, melite-preset, etc.), not
for this Python plugin.

## Layout reference

The sidebar layout is the same `drawer` shape DaisyUI gives you
for free (the DSH web sidebar and the web/editor's left drawer
follow the same primitive). The widths (`w-72`) and section
dividers are the same numbers across the estate; copying the
look-and-feel from the web editor's `LibrarySidebar.tsx` was a
deliberate operator-experience choice (a Tavern operator moving
between the editor and the Tavern sees the same layout in both
places).

## Versioning

`0.1.0` — initial release. Tracks the gateway v1 surface; the
SSE event stream is wired in `gateway_client.iter_events` but not
yet consumed by the UI (polling at 2s covers the operator's
expectation; SSE is a follow-up when the operator asks for
sub-second updates).
