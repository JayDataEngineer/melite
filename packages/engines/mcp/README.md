---
description: The MCP engine provider — registers mcp:<server> engines whose stages execute as tool calls on the host ToolRuntime, with run-dir-contained artifact collection.
kind: package-library
---

# @melite/engine-mcp

`@melite/engine-mcp` turns MCP servers into runs-plane engines. For each
server named in config it registers engine id `mcp:<server>`; a stage row
executes as one tool call through the host ToolRuntime — the same
programmatic channel the agent loop rides, so every allow/deny/ask policy
applies. It calls the `tools` seat; the estate bundle mounts it after
engine-contract.

## Contract

- Config: `{ engines?: string[] }` — the servers that also serve the runs
  plane. Default registers none; explicit over implicit.
- Stage params are the wire call: `tool` (server-local name, grammar
  `[A-Za-z0-9_-]{1,64}`) and `args` (a JSON object; the card's text field is
  folded in). The executor mints `mcp__<server>__<tool>` on the wire.
- Collect arm: artifacts are the run-dir tree's new files. A stage wanting
  pixels back declares an absolute `args.out`; the executor enforces
  containment inside the run dir and refuses loud otherwise.
- Pre-flight validates every row before the first wire call — nothing
  half-runs.
- Declared exports: `.` (barrel), `./mcp-engine` (executor + provider),
  `./formDoc` (the per-server served form doc), `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None — the executor calls tools programmatically; stage outputs and
artifacts land on the runs plane, not in a model request.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — no conversation state.

## Known Limitations and Deferred Work

- **One tool call per stage** — a multi-tool sequence needs multiple stage
  rows or the agent engine; there is no in-stage chaining.
- **The form's tool census is served, not enforced** — tool options fold
  from the host's live schemas, but the wire gate checks only the name
  grammar, so a grammatical absent tool fails at execution.
