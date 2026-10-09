---
description: The agent engine — one stage runs one general tool-calling loop with the task as its brief, over the host llm and tools seats.
kind: package-library
---

# @melite/engine-agent

`@melite/engine-agent` mounts engine id `agent` on the engines seat: one stage
is one agent run, a tool-calling loop that drives the host ToolRuntime's
allow-listed MCP tools and answers with text when the task is done. It calls
the `llm` seat (stream dispatch) and the `tools` seat (programmatic
execution); the estate composition mounts it after engine-contract, and the
runs lane consumes it like any engine.

## Contract

- Config: `{ provider, model, skills? }` — the brain route is named (explicit
  over implicit); the optional `skills` reader is the spawn-injection seam,
  built by the composition from the skill plane.
- Stage params: `task` (required), `mcps[]` (tool allow-list), `skills[]`
  (read at stage start and inlined into the brief), `inputs[]` (rendered into
  the brief), `max_turns` (default unlimited; hard cap
  `AGENT_MAX_TURNS_HARD_CAP` = 1000).
- Artifacts are the run-dir tree's new files; `outputs.default` is the final
  text. A stop press ends the stage loudly.
- Declared exports: `.` (barrel — executor, served form doc, params
  contract), `./agent-engine` (the engine module and seam types),
  `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

The brief — task, inlined skill leaves, rendered `inputs` values — plus the
allow-listed tool schemas from the host runtime, then each turn's tool
results and its own interim answers.

#### Token effect

Conditional — scales with the brief, the inlined skill text, the number of
granted tools, and the history the loop accumulates.

#### KV Cache effect

Append-only — every turn appends to the same run's message history.

## Known Limitations and Deferred Work

- **Skills are read once, at stage start** — an in-flight run never sees a
  skill edited mid-run; restart the stage to pick the change up.
- **max_turns defaults to unlimited** — an aimless loop runs to the hard cap
  or the stop door; pass `max_turns` for cost-bound stages.
