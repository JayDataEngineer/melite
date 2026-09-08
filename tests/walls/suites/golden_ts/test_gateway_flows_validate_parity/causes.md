# causes.md — golden_ts/test_gateway_flows_validate_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). The validate wall was
a dual-serve comparison: every leg asserted live-py-dispatcher
bytes == TS HTTP bytes. The py serving oracle is deleted, so there
is no second side to agree with. Per the lane rule (dual-boot walls
become TS-ONLY, expected bytes = the TS side's current bytes), the
TS vectors were frozen as these files on 2026-09-08:

- <leg>.json — one per row of the BYTE_BODIES table in the suite
  (routing arms, strict-body refusals, flow_from_body construction
  refusals, comfyui pin sweep, artifact-ref sweep, cordis compose
  arm, 200 compile views, retired-engine refusals).
- golden_<mid>.json — one per tests/golden_http/form-spec_model_*.json
  mid (31 mids, defaults applied per the suite loop).

Shape legs (the two interpreter-class 500s, bad-JSON, 401) pin
literals in the suite, not bytes: the 500 tracebacks embed the host
checkout path and the bad-JSON text embeds the host parser's
message.

## Stability proof

Each vector captured twice from fresh boots + fresh scratch state
roots on 2026-09-08 (boot_scratch_gateway, MELITE_REPO_ROOT
scrubbed, one boot per round); byte-identical across both captures
(probe script, not committed). Validate is a pure compile — no
minted ids, clocks, or roots in these bodies; no normalization.
Both rounds served statuses {200, 400} only, same set per leg.

## Regolden rule

Regolden only for a deliberate TS validate-door behavior change,
with a dated note here. Never regolden to chase a red wall — the
wall failing against these bytes means the door moved.

## 2026-09-08: dangle-escape + golden_qwen-img-edit-2511 voice re-truth (purge S-decls)

The admission-refusal tail changed from "see card-decls.json" to
"see the card's TS definition" — the file is dying (registry
projection owns admission now: knobs from the schema carrier,
extras from def.admits, studio writes from the facts file).
Refusal MEANING unchanged (same params refused on the same
cards); only the pointer moves to the living source.
