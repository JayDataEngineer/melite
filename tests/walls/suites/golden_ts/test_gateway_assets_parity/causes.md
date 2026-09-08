# causes.md — golden_ts/test_gateway_assets_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). The assets wall was
a dual-serve comparison: every leg asserted py-bytes == ts-bytes
over the 4 asset READ doors. The py serving oracle is deleted, so
there is no second side to agree with. Per the lane rule
(dual-boot walls become TS-ONLY, expected bytes = the TS side's
current bytes), the TS vectors were frozen as these files on
2026-09-08:

- assets*.json (18) — GET /v1/assets + the query matrix
  (limit/run/kind/include_test variants, garbage limits, trailing
  slash). Status + byte-exact body per file (the suite asserts the
  frozen status literal alongside the bytes).
- ledger*.json (11) — GET /v1/ledger + the query matrix
  (limit/event variants, garbage limits, 70-char event). Status +
  byte-exact body per file.
- include_test_*.json (5) — GET /v1/assets?include_test=<true/1/
  True/false/empty>. Captured from the same boot AFTER the ledger
  matrix (the journal side effect lands on the ledger, never on the
  index bodies — the test-output root is empty either way).
- post_assets.json / post_bytes.json / unknown_404.json — POST
  /v1/assets, POST the byte door, GET an unserved path (the
  method-mismatch + no-such-route 404 shapes).
- auth_401.json / auth_health.json — the auth-on 401 body (one
  body serves all four 401 legs: no token, byte door, query token,
  wrong token — verified identical at freeze time) + the exempt
  /v1/health body.
- bytes.json — manifest for the 27 full-GET byte doors: per key
  {status, sha256, len, parity headers}. Raw binaries (cover.png
  1024B, clip.mp4 3000B, …) are pinned by hash, never checked in
  as blobs; small JSON refusal bodies (404 not-found, 400 bad
  path, inputs-door refusals) are pinned the same way so the one
  manifest covers the whole byte-door table. The two inputs-hero
  slots ride logical keys (inputs_hero_png/_webp) — the fixture
  names carry the wall pid, the bytes do not.
- ranges.json — manifest for the 17 Range specs on cover.png +
  inputs_ignored (Range on the inputs door serves the full 200
  with no accept-ranges): per spec {status, sha256, len, parity
  headers}. The 206/unsatisfiable/accept-ranges shape legs stay
  literals in the suite; this manifest pins every spec's bytes.

Shape legs (ensure_ascii escapes, float 1.0 verbatim,
content-length honesty, 206 shape, unsatisfiable full-200,
accept-ranges announce, inputs-door no accept-ranges,
include_test journal receipt, bearer 200s/206) pin literals in
the suite, not bytes.

## Stability proof

Each vector captured twice from fresh boots + fresh fixture roots
on 2026-09-08 (boot_scratch_gateway, MELITE_STATE_ROOT at a fresh
tmp per round, ledger rewritten to the deterministic fixture after
each boot so the boot's server.boot row never leaks into the
vectors); 91 vectors byte-identical across both captures (status +
body bytes + parity headers; the stock HTTP Date header excluded
— transport, not contract). Probe script, not committed. No minted
ids, clocks, or roots in these bodies — no normalization. The
inputs fixture lived in the real REPO/data/input under
pid-suffixed names during capture (removed after, as the suite
does); only the deterministic bytes are frozen.

## Regolden rule

Regolden only for a deliberate TS asset-door behavior change,
with a dated note here. Never regolden to chase a red wall — the
wall failing against these bytes means the door moved.
