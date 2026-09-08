# causes.md — golden_ts/test_gateway_verbs_outputs/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why this golden exists

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). Phases O02–O05 of
test_gateway_verbs_outputs.py asserted TS refusal bytes == the py
serving oracle's `python/gateway.py _output_violation` text, computed
live via a lazy `import gateway`. The oracle is deleted, so there is
no second side to agree with. Per the lane rule (py-bytes-vs-ts-bytes
with no literals → freeze the TS side's current bytes), the TS
`outputViolation` texts (packages/gateway/shell/src/schema/verbs.ts) were
frozen as refusals.json on 2026-09-08:

- O03 — the 7 deficient-output refusals (empty, None, views-only,
  second-row-missing, …), in DEFICIENT_SETS order.
- O04 — the 6 surplus-output refusals (junk present but the promise
  missing — sorted, deduped, first-8, lowercased, falsy-filtered),
  in SURPLUS_SETS order.
- O05-bad — the anny + ["run/x.mp4"] surplus text reused as the
  run-level settle expectation.
- O03-cases / O04-cases — the (card, artifacts) inputs each text
  answers, so a mismatch names its case without re-reading the suite.

The O02 golden artifact sets need no frozen bytes: they assert the
TS side returns None (pass), which is TS-vs-literal already. (The
pre-conversion O02 also failed on the py side — KeyError
'music-native': the oracle's card registry never learned the
music-native card while the TS CARD_OUTPUTS table + card-decls.json
did. TS WINS; the py leg died with the oracle.)

## Stability proof

Pure functions of (card, artifacts) — no ids, no roots, no clock in
the bytes, nothing to normalize. Captured twice from fresh node
processes on 2026-09-08 (the suite's own DRIVER violate op over the
in-file case lists); byte-identical across both captures.

## Regolden rule

Regolden only for a deliberate TS output-contract text change, with
a dated note here. Never regolden to chase a red wall — the wall
failing against these bytes means the door moved.
