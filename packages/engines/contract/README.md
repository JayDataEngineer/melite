---
description: The engine Service Definition — the engines seat, engine-agnostic stage types, and the pinned engine-id vocabulary every engine adapter and the runs lane share.
kind: package-library
---

# @melite/engine-contract

`@melite/engine-contract` declares the one contract every run-path engine
implements: the `engines` seat registry, the stage-row and executor types,
and the engine-id grammar. It calls nothing — it is the typed seam the
ComfyUI, craft, agent, and MCP adapters register into and the runs lane
resolves through. The estate bundle mounts `enginesContract` before every
engine adapter row.

## Contract

- Engine ids: `comfyui`, `craft`, `agent`, or `mcp:<server>` with the server
  name matching dsh-mcp-client's `[A-Za-z0-9_-]{1,32}`. `register` refuses
  ungrammatical ids and duplicates loud; `resolve` refuses unknown ids loud,
  naming every registered id.
- One registered engine is `{ executor, probe? }` — the control arm
  `executeStages(rows, runDir, inputNames, options, initials?)` plus an
  optional reachability probe. Connection lifecycle stays with each engine's
  own owner; the probe only reports.
- Registrations are effects: `register` returns the disposer; providers wrap
  it in `ctx.effect`.
- Declared exports: `.` (barrel), `./engines` (EnginesService + provider +
  id grammar), `./types` (EngineStageRow, EngineStageOutcome,
  EngineExecutor), `./vocabulary` (the engine-agnostic ParamSpec grammar),
  `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

None — the package contributes no model-visible input.

#### Token effect

Zero-direct token effect.

#### KV Cache effect

Independent — the seat holds no conversation state.

## Known Limitations and Deferred Work

- **No capability-listing face** — the seat resolves ids; it does not
  enumerate per-engine params. Served forms come from each engine's own doc
  module.
- **initials is optional and dialect-bound** — engines whose param dialect
  has no `$spells` ignore run initials; nothing enforces a uniform
  treatment.
