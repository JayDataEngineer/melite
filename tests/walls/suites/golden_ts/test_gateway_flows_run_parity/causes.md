# causes.md — golden_ts/test_gateway_flows_run_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). Phase B/D of
test_gateway_flows_run_parity.py were dual-serve comparisons: every
leg asserted py-bytes == ts-bytes. The py serving oracle is deleted,
so there is no second side to agree with. Per the lane rule
(dual-boot walls become TS-ONLY, expected bytes = the TS side's
current bytes), the TS vectors were frozen as these files on
2026-09-08 (normalized: run ids to <RID>, state root to <ROOT> via
the suite's own normalize()):

- receipt-202.json — Phase B: POST /v1/flows/start 202 receipt
  {run_id, status: queued} (normalized).
- terminal-completed.json — Phase B: the completed terminal body of
  the stub-ComfyUI run (normalized, sort_keys: stages incl.
  merged/url/gallery/result_outputs, artifacts, error "",
  queue_position 0, skipped_stages []).
- include-log.json — Phase B: GET /v1/flows/status/<id>
  ?include_log=TRUE tail body (normalized; log_tail "run:
  completed / gen: completed / artifacts: out.png").
- stop-receipt.json — Phase D: POST /v1/flows/stop/<id> 200 receipt
  {run_id, status: stopping} (normalized).
- stopped.json — Phase D: the terminal "stopped" body
  (normalized, sort_keys: stage error "ComfyError: stopped
  (interrupt delivered)", run error "", leftover "merged submit (1
  stages, 1 nodes)" activity key).

## Stability proof

Each vector captured twice from fresh boots + fresh state roots on
2026-09-08 (throwaway script /tmp/cap_parity.py, not committed:
stub ComfyUI + real TS boot per capture, B-phase then D-phase per
boot); byte-identical across both captures after normalize()
(`cmp` clean on all five files). The stub script is deterministic
(history completes on 2nd poll; never-mode never completes) and the
TS status bodies carry no timestamps — only run ids and the state
root vary, both normalized.

## Regolden rule

Regolden only for a deliberate TS-door/engine behavior change, with
a dated note here. Never regolden to chase a red wall — the wall
failing against these bytes means the door moved.
