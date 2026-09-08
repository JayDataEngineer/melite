# causes.md — golden_ts/test_gateway_uploads_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). The uploads wall was
a dual-serve comparison: every refusal leg asserted live-py-dispatcher
bytes == TS HTTP bytes. The py serving oracle is deleted, so there
is no second side to agree with. Per the lane rule (dual-boot walls
become TS-ONLY, expected bytes = the TS side's current bytes), the
TS refusal vectors were frozen as these files on 2026-09-08:

- oversize.json — the 20 MiB + 1 decoded refusal (400).
- <slug>.json — one per row of the REFUSALS table in the suite
  (empty-object, missing-data, non-data-url, data-without-comma,
  non-object-body, non-string-filename, blank-filename, gif-mime,
  empty-mime, bad-base64, whitespace-base64 — all 400).
- get-404.json — GET on the POST-only door (404).

Shape legs (round-trips, mime mapping, content-type-ignored,
multipart-as-bad-JSON, bad-JSON text, empty-base64, traversal
neutralization, auth) pin literals in the suite, not bytes: 200
paths carry a random uuid suffix per upload and the bad-JSON text
embeds the host parser's message.

## Stability proof

Each vector captured twice from fresh boots + fresh fixture roots
on 2026-09-08 (boot_scratch_gateway with MELITE_REPO_ROOT at a
fresh tmp per round); byte-identical across both captures (probe
script, not committed). No minted ids, clocks, or roots in these
bodies — no normalization.

## Regolden rule

Regolden only for a deliberate TS uploads-door behavior change,
with a dated note here. Never regolden to chase a red wall — the
wall failing against these bytes means the door moved.
