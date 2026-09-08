# @infer/daisy-studio

A pure-Python (FastHTML + daisyUI) studio for the **inference.cpp** flow system.
One process, one `uv sync`, one `uv run`. No Node, no Vite, no MonsterUI.

Three tabs, one drawer:

- **Operate** - lanes, drafts, runs. The lane form renders the lane bundle
  `params_schema` (the same JSON the TypeScript card deck in DSH renders),
  then Validate (compile refusal inline, no GPU) and Start (queue the run).
  Run pages poll status, offer the stop door, and list artifacts.
- **Chat** - daisy chat bubbles over an LLM agent. The agent wraps the
  `deepseek_harness` Python package in-process (see `chat.py`), the same
  harness DSH chats through. No agent reimplementation.
- **Gallery** - runs grid with status badges and thumbnails.

What this is - and what it is not:

- **Is**: the inference-studio slice of DSH, re-skinned in daisyUI, with the
  LLM loop kept by wrapping the harness SDK.
- **Is not**: a full DSH clone (no sessions registry, profiles, or plugin
  manager) and not a replacement for the TypeScript card deck/editors - those
  stay in DSH. The studio renders their params_schema JSON and hits the same
  validate/start doors, so both surfaces converge on one queue.

## Install

```bash
./install.sh            # uv tool install + DSH sidebar button
./install.sh --studio-only   # skip the DSH button
```

```bash
export MELITE_GATEWAY=http://localhost:33081
infer-daisy-studio            # serves http://127.0.0.1:33092
```

| Env | Default | Meaning |
|---|---|---|
| `MELITE_GATEWAY` | - | Gateway base URL (required, or opt in below) |
| `STUDIO_ALLOW_LOCAL` | off | `1` permits the `localhost:33081` fallback |
| `STUDIO_HOST` / `STUDIO_PORT` | `127.0.0.1` / `33092` | Bind (never 33081/33091) |
| `STUDIO_CHAT` | on | `off` forces the echo stand-in (no LLM spend) |
| `DSH_PROVIDER` / `DSH_MODEL` | `deepseek-official` / `deepseek-v4-flash` | Chat route |
| `DSH_PROFILE` | `estate` | Harness profile for chat turns |
| `MELITE_DSH_HOME` | - | Harness home (else the SDK default) |

## Wire

The client (`gateway_client.py`, copied proven from the flow tavern) is the
only place endpoint paths live: health, lanes, cards bundle, drafts, runs,
status, validate, start, stop, events. Chat (`chat.py`) is the only place
`deepseek_harness` is imported (lazy, so the surface boots without the SDK).

## Laws honored

- QUEUE LANE LAW: explicit gateway URL, `{flow: lane}` naming, no fallbacks.
- RESILIENCE LAW: 4xx and chat failures surface verbatim, never bare failed.
- PLUGIN ARCH LAW: harness plugin, no `python/` or engine imports.
- PROVISIONING LAW: own env, opt-in install, SDK kept lazy.
- PYTHON SHAPE LAW: frozen rows on the wire, structural agent surface.

## Tests

```bash
cd packages/harness/dsh/infer-daisy-studio
uv sync
uv run pytest
```
