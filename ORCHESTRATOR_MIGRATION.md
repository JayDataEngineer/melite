# ORCHESTRATOR MIGRATION — compose layer C → Python

Operator order 2026-09-02: "move the orchestrator layer to python, it won't
hurt too much, and it will make everything a hell of a lot easier."

## PRINCIPLE (the law that prevents a rewrite-regression)

The verified behavior is the CONTRACT. The Python port ships only when its
composed yaml is BYTE-IDENTICAL to the C card's on a golden set of real
submissions, and the full test wall is green. Until then the C card is the
lane of record. No mid-deadline swaps; no partial cutover.

## WHAT STAYS (untouched)

- `src/server.cpp` core: queue, stop door, sidecar ledger, GPU tickets,
  registration, tailpath passes. Generic, no lane knowledge (already law).
- The C-ABI `card_compose` hook contract (phases 1/2, extra_json, rc codes).
- Templates, card_knobs.yaml, the ComfyUI node pack — data, not code.
- The chaos suite (tests/test_queue_chaos.py, 52 checks) + queue tests.

## WHAT MOVES

`plugins/comfyui/engines/comfyui/h3_card.c` (~5.3k lines) →
`plugins/comfyui/engines/comfyui/compose/` (Python package):

| C construct | Python shape |
|---|---|
| params_s[]/card_level[]/allow[] tables | dataclasses / dict schemas |
| cc_* parse+validate helpers | pure functions over parsed body |
| PRE_START/PRE_CHAIN prompt emits | constants + f-strings |
| window yaml snprintf blocks | yaml/JSON emit via `json.dumps` |
| needle loops / inject splices | dict merges (no string memmove) |
| cc_mirror_check + gates | pure dict-in/dict-out, unit-testable |
| seed law, snap laws, seam math | one `laws.py`, doctested |

## BRIDGE (how Python serves a C-ABI hook)

Option A (preferred): a thin C shim `h3_card_py.c` that shells to
`compose/main.py` (stdin: body+phase+yaml; stdout: extra_json/new yaml; rc
contract identical). Zero server changes; the ABI stays byte-stable.
Option B (later, if perf demands): embed CPython. NOT required for v1 —
compose runs once per submission, not per frame; a 50ms subprocess is free.

## PORT RULES

1. Port 1:1 first: same refusals, same rc codes (-26..-31), same inject
   fragments, same key order (byte-identical yaml is the acceptance bar).
2. Golden tests: `tests/golden_compose/` — N real card bodies (film,
   continuation, refs-card, music card, refusal cards) → assert C output ==
   Py output. CI-gate both.
3. Only AFTER golden parity: refactor inside Python (splitting, renaming)
   in separate commits with the golden wall re-run each time.
4. The refs/voice bus completes IN PYTHON (against HIS example_workflows
   wiring) — the C half-emit is frozen as-is, fenced in GUIDE.md.

## ROLLOUT

1. `compose/` lands with golden parity + chaos suite green (C still active).
2. One dark week: every real submission composes BOTH, logs diff count
   (must be zero), serves C's output.
3. Swap the shim to serve Python. C file kept one release for archaeology.
4. Delete C card only after a clean week of served-Python runs.

## ESTIMATE

Port + golden wall: 2–3 focused days (the logic is already proven; it is
transcription). Refs bus completion in Python: +1 day against
example_workflows. Rollout week: calendar, not effort.
