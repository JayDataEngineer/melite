---
description: The craft loop engine — one stage loops act, capture, critique, decide against a named image-capable critic route until a done verdict or the circuit breaker.
kind: package-library
---

# @melite/engine-craft

`@melite/engine-craft` mounts engine id `craft` on the engines seat: one
stage is one refinement loop. Each iteration runs a nested engine stage (the
act) in the same run dir, then asks the critic — an image-capable LLM route —
to judge the captured artifacts and either finish or refine with the next
command. It calls the `llm` and `attachments` seats and resolves nested
engines through the engines seat; the estate composition seats it after
engine-contract.

## Contract

- Stage params (one schemastery object is both wire gate and served form):
  `agent_prompt` (the brief), `command` (`{engine, params}` as JSON),
  `model` (empty = lane default), `max_iterations` (default unlimited; hard
  cap `CRAFT_MAX_ITERATIONS_HARD_CAP` = 1000).
- Critic route: config `{ provider, model }` names it;
  `craftEngineAutoRoute` at the composition site picks the first
  image-capable route, with the `MELITE_CRITIC_ROUTE` (`provider/model`)
  preference beating the enumeration. A lane with no image-capable route
  seats no critic, loud.
- A refine verdict walks the same command gate as the stage's own command.
- Declared exports: `.` (barrel), `./craft-engine` (executor, critic
  builder, auto-route), `./package.json`.

## Model Experience

### Request context and condition

#### What the model sees

Each critique call: the brief, the iteration number, the current command,
and the accumulated artifacts' images attached through the attachments
seat.

#### Token effect

Conditional — every iteration re-sends the brief and the artifact images,
so cost grows with iteration count and artifact size.

#### KV Cache effect

Independent — each critique is a fresh one-shot call; no history is carried
across iterations.

## Known Limitations and Deferred Work

- **Critic verdicts are JSON-by-parsing** — the parser walks closing braces
  to survive trailing commentary; a critic that never emits an object fails
  the stage loud.
- **The critic call ignores the stop signal** — the loop passes a fresh
  controller's signal, so a stop press lands between iterations, not
  mid-critique.
