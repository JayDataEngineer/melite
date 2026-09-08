# causes.md — golden_ts/test_gateway_queue_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). The py serving oracle
(python/gateway.py) is deleted, so the py-vs-ts byte legs of
test_gateway_queue_parity.py have no second side to agree with. Per
the lane rule (dual-boot walls become TS-ONLY, expected bytes = the
TS side's current bytes), the TS vectors were frozen as these files
on 2026-09-08:

- r01-bad-test.json / r01-bad-draft.json / r01-knob.json — Phase R:
  POST /v1/flows/start refusal bodies (bad-test beats
  missing-draft; bad-draft beats knob; knob beats ambiguity).
  Statuses (400/400/400) stay literals in the suite; the files pin
  the exact body bytes.
- r02-status.json / r02-stop.json / r02-resume.json /
  r02-reproduce.json — Phase R lifecycle-unknown bodies
  (status 404, stop/resume/reproduce 400 on run-nope; the ids are
  fixture-fixed, no minted ids in the bytes).
- j03-run-stale1.flow.json / j03-run-stale2.flow.json /
  j03-run-done.flow.json — Phase J: the swept _flow.json file bytes
  after node bootSweep on the stale fixture (running + queued +
  completed-with-running-stage; the completed top level stands
  while its nested running stage settles failed — the documented
  recursion).
- j03-ledger-swept.json — Phase J: the sorted run.swept ledger
  lines with the clock masked (`"ts":#`; bootSweep stamps nowS,
  so raw lines can never byte-pin).

Not frozen (literals in the suite instead): J01 (exact ledger line
with a pinned nowS — one literal string), J02 (sidecarDoc key
order + full doc vs literals), J04/J05 (plan order + orphans and
rebuild values vs literals), Phase Q core/worker/retry scripts
(vs hardcoded `want` literals), Phase I (tail present/absent
booleans).

## Stability proof

Each vector captured twice from fresh boots + fresh state roots on
2026-09-08; byte-identical across both captures (throwaway probe
script in /tmp, not committed). Refusal bodies carry no minted
ids, roots, or clock; sweep fixtures carry fixed created_at.

## Regolden rule

Regolden only for a deliberate TS-door behavior change, with a dated
note here. Never regolden to chase a red wall — the wall failing
against these bytes means the door moved.
