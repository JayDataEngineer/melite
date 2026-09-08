# causes.md — golden_ts/test_gateway_e2e_tsboot/

Date: 2026-09-08. Status: landed (oracle-death Stage A).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). Phase D of
test_gateway_e2e_tsboot.py was a dual-serve comparison: every leg
asserted py-bytes == ts-bytes. The py serving oracle
(python/gateway.py) is deleted, so there is no second side to agree
with. Per the lane rule (dual-boot walls become TS-ONLY, expected
bytes = the TS side's current bytes), the D-phase TS vectors were
frozen as these files on 2026-09-08:

- validate.json — D02: POST /v1/flows/validate on the wall-run
  flow_inline body (normalized: <RID>/<DID>/<ROOT>).
- terminal.json — D04: the completed terminal body of the stub-ComfyUI
  run (normalized).
- fixture-list.json / fixture-detail.json — D06: the two seeded
  fixture rows (run-e2e-a/b) list + detail (normalized; the seeds
  carry fixed created_at 1700000101, no clock in the bytes).
- events-404.json — D08: GET /v1/flows/events fallback 404 body.
- sim-validate.json — D09: POST /v1/flows/validate on the sim-chain
  body. Post mono-engine quarantine (2026-09-08: sim tier retired to
  vendor/retired-engines/sim), the TS door refuses 400 flow_compile
  naming the sim engine — the lawful mono-engine contract (loud
  refusal, never silent accept). The golden pins the refusal text.

## Stability proof

Each vector captured twice from fresh boots + fresh state roots on
2026-09-08; byte-identical across both captures (probe script, not
committed). normalize() is the suite's own normalizer
(run/draft ids + state root substituted).

## Regolden rule

Regolden only for a deliberate TS-door behavior change, with a dated
note here. Never regolden to chase a red wall — the wall failing
against these bytes means the door moved.
