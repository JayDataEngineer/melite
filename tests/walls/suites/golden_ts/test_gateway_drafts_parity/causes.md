# causes.md — golden_ts/test_gateway_drafts_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). test_gateway_drafts_parity.py
was a dual-serve comparison: every leg asserted py-bytes == ts-bytes
(py via boot_scratch_gateway, TS booted manually). The py serving
oracle (python/gateway.py) is deleted, so there is no second side to
agree with. Per the lane rule (dual-boot walls become TS-ONLY,
expected bytes = the TS side's current bytes), the TS vectors were
frozen as these files on 2026-09-08:

- get-seed-alpha.json — §1: GET /v1/flows/drafts/seed-alpha
  (unicode/float/bigint pins live here).
- get-seed-beta.json — §1: GET seed-beta (intent/service fallbacks).
- get-seed-float.json — §1: GET seed-float (1.00/1e2/2.50/-0.0
  normalization pins live here).
- get-nonobject.json — §3: GET arr (array doc 500 "not an object").
  num and str serve byte-identical bodies, so all three legs pin
  this one file.
- list.json — §4: GET /v1/flows/drafts (count 11 + newest-first
  rows; order fixed by sync_mtimes sorted-name stamps).
- drift-*.json (13 files) — §7: the composer-drift 500s, pydantic text
  intact (incl. the 2.13 URL). The wall additionally pins the URL
  and the no-code shape per leg.
- patch-full.json — §8: PATCH seed-alpha/s_0 full-merge response
  (delivered:true + sorted patched keys).
- patched-seed-alpha.json — §8: the seed-alpha.json FILE bytes after
  the full merge (merge + atomic rewrite pin).
- result-found.json — §8: GET result after the merge (found:true).
- result-missing.json — §10: GET result with no persisted result
  (found:false). All found:false legs (missing stage/draft,
  corrupt disk, array doc, non-dict result) serve byte-identical
  bodies, so they all pin this one file.

Deliberately NOT golden (shape or literal pins instead):

- corrupt-on-disk GET and bad-JSON refusals embed the host JSON
  parser's message (V8 SyntaxError text) — status + code + error
  prefix only (same reason the old wall used dual_shape).
- Minted draft_ids / createdAt differ per boot by construction —
  shape (regex, int, %1000, recency) + field-equality pins.
- DELETE / method-mismatch 404 envelopes echo the request path —
  status + code no_such_route + "no such route" prefix pins.
- PATCH reconcile legs (missing draft/stage, overlong, dotdot) and
  the small refusal legs (bad id, non-object patch, wrong-typed
  fields, empty body) — parsed-body == literal pins.
- Auth 401 — want_401 literal (shared across every authed leg).

## Stability proof

Each vector captured twice from fresh boots + fresh fixture roots
on 2026-09-08 (throwaway probe script, not committed):
byte-identical across both captures (22 keys, 0 mismatches).
normalize() is unnecessary — no vector carries a minted id,
timestamp, or state-root path (the list order is fixed by
sync_mtimes; the patched file is compact JSON with no clock).

## Regolden rule

Regolden only for a deliberate TS-door behavior change
(packages/gateway/shell/src/doors/drafts.ts), with a dated note here.
Never regolden to chase a red wall — the wall failing against
these bytes means the door moved.
