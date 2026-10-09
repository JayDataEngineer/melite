---
description: The one lane-call contract and card-tool builder — transport, flow-envelope output schema, and the executor test battery shared by every card tool.
kind: package-library
---

# @melite/estate-call

`@melite/estate-call` is the SSOT for card-tool mechanics: the lane-call
contract (JSON in/out, cancellation, named refusals), the flow-envelope
output schema, and the executor test battery. It calls no engine — the
tools plane hands each card a transport built from the ctx seats,
in-process, no HTTP and no gateway. Card packages and
`@melite/harness-tools` compose it; its six-per-card predecessor copies are
the degeneration this package absorbed.

## Contract

- `.` — `EstateCall` (the structural transport), `GatewayError` (status +
  body + named `error` field), `jsonLane` (adapts the raw call to the
  JSON-record contract; a pre-aborted call never dials).
- `./cardTool` — `defineCardTool(call, spec)`: owns the `CARD_TOOL_OUTPUT`
  envelope (flow, model, run_id, draft_id, status, error), declared
  JSON-array param normalization, the two-door execute (drafts, then start
  with the `{model:}` lift), refusal mapping, and the presentation
  projections. The card still owns its tool-plane name, flow id, identity
  prose, emitted params spec, and default model.
- `./executorHarness` — `executorHarness` + `registerExecutorBattery`: the
  recording seam, envelope arms, tile truth table, and presenter cores the
  per-card specs restate.
- `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

The card tool's face — identity prose and emitted params spec — rides the
host toolset schemas, and the returned flow envelope is the tool result;
both are model-visible and logged by the session.

#### Token effect

Conditional — scales with the params spec and the envelope the run returns.

#### KV Cache effect

Append-only — each card-tool call and its result append to the session
transcript.

## Known Limitations and Deferred Work

- **One flow per call** — the builder starts exactly one run and returns
  its envelope; polling the run is the caller's job (run_status).
- **Refusals are field-named, not typed** — `GatewayError` carries the
  door's refusal word in a named field; there is no closed refusal union at
  this seam.
