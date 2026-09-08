# causes.md — golden_ts/test_gateway_resurrect_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). Phases A/B/D/E of
test_gateway_resurrect_parity.py were dual py-vs-TS comparisons:
every leg asserted py-bytes == ts-bytes against the py serving
oracle. The oracle is deleted, so there is no second side to agree
with. Per the lane rule (dual-boot walls become TS-ONLY, expected
bytes = the TS side's current bytes), the TS vectors were frozen as
these files on 2026-09-08:

- swept-qorph.json / swept-r1.json — the Phase-A seed's two swept
  sidecars after a direct-function TS boot (resurrectRuns +
  bootSweep from packages/gateway/src/queue/queue.ts). Phase B's
  real-server boot writes byte-identical files (verified at freeze
  time), so both phases pin this one pair.
- a-ledger.json — the Phase-A normalized ledger (ts-stripped,
  sorted (event, data) rows: 2x run.resurrected + 2x run.swept).
- e-ledger.json — the Phase-E gap-seed normalized ledger (29x
  run.resurrected + 21x run.swept); every G-phase boots the same
  seed, so G1 pins it once for all.
- e-g1-live.json / e-g2-live.json / e-g3-live.json /
  e-g5-live.json — the rebuilt live values (draft_id / stages /
  skipped_stages / artifacts per run) the TS boot reports for each
  gap prefix; the retired wall compared these TS-vs-py, now they
  are the frozen TS contract.
- e-swept-run-g1-dict.json / e-swept-run-g1-dup.json /
  e-swept-run-g2-stageint.json / e-swept-run-g4-dir.json /
  e-swept-run-g4-int.json / e-swept-run-g6-float.json — TS swept
  bytes for one representative orphan per swept class. The G6 file
  pins the TS-WINS spelling ("created_at": 100, never 100.0).
- b-status-*.json / b-detail-*.json / b-status-run-r1-log.json —
  settled status/detail bodies off a real TS boot (status 200 is a
  literal in the wall; the bodies are the golden).
- b-list-settled.json — the 7 settled rows of GET /v1/flows/runs
  (live q1/q2 dropped: worker-racy by design, pinned live in C1
  instead); count == 9 stays a literal.

## Stability proof

Each vector captured twice from fresh boots + fresh state roots on
2026-09-08 (throwaway script /tmp/cap_resurrect.py, not committed:
seed -> direct-function ts_boot / gap boot / real boot_ts serve ->
dump); byte-identical across both captures except the ledger `ts`
wall-clock, which the wall strips before comparing (the raw
_ledger.jsonl lines are the only observed drift, clock-only).
Phase-A vs Phase-B swept bytes verified identical, hence shared.

## Regolden rule

Regolden only for a deliberate TS boot-contract change
(resurrect/sweep/ledger shape in queue.ts or the read doors), with
a dated note here. Never regolden to chase a red wall — the wall
failing against these bytes means the TS side moved.
