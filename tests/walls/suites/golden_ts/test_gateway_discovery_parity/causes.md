# causes.md — golden_ts/test_gateway_discovery_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery").
test_gateway_discovery_parity.py was a dual-serve comparison: every
leg asserted py-bytes == ts-bytes over the 10 discovery READ doors.
The py serving oracle is deleted, so there is no second side to agree
with. Per the lane rule (dual-boot walls become TS-ONLY, expected
bytes = the TS side's current bytes), the 268 TS vectors served by
packages/gateway/shell/src/doors/discovery.ts were frozen as these files on
2026-09-08.

Each `<name>.json` is an envelope pinning the full served contract
for one (method, path) vector:

- `status` — the served HTTP status (200, 400, or 404 across the set;
  the ?model= matrix refuses 400 missing-model-param, unknown ids
  refuse 404, method mismatches refuse 404 no_such_route).
- `content_type` — always `application/json` here (every discovery
  JSON arm; the wall also asserts content-length honesty live).
- `body` — the EXACT served text (ASCII throughout, so the envelope
  round-trips byte-exact: `body.encode("utf-8") == wire bytes`).

Vectors frozen (268):

- `catalog` — GET /v1/model-catalog (55 models).
- `catalog-row-<mid>` ×55 — every model row (ids from the frozen
  catalog's `catalog.models` keys, sorted — the matrix grows with the
  estate, never a hardcoded list).
- `catalog-unknown-<slug>` ×5 — refusal shapes (nope-xyz, `..`,
  ANNY, over-encoded traversal, embedded slash).
- `catalog-POST/PUT/DELETE` — method-mismatch 404s.
- `forms`, `kinds`, `schema` + their POST/DELETE 404s.
- `families` + POST/PUT/DELETE/PATCH (the `*` arm serves every
  method — each frozen separately).
- `formspec-*` — the 13 fixed ?model= variants (bare/empty/
  no-value/upper/unknown/blank-first/repeated×2/blank-blank/
  dotdot/over-encoded/slash/query) + `formspec-model-<mid>` ×55.
- `loras-*` — the 7 fixed ?model= variants + `loras-model-<mid>`
  ×55 + `loras-POST`.
- `paramschema-<fid>` ×47 — every family + `paramschema-unknown-*`
  ×5 + `paramschema-POST`.
- `provisions-unknown-family`, `provisions-unknown-provision`,
  `provisions-declared-none` (family `anima`, which declares no
  provisions — keeper scan agrees), `provisions-POST`.

## Known stale diffs where TS wins

The retired dual wall carried 46 legs failing on py-vs-ts
byte-compare from sibling card-work drift (the py scan moved under
the frozen export). TS wins by rule: these goldens pin the TS bytes
as served on 2026-09-08, and the py expectation is dropped, never
the TS behavior weakened. A wall failure against these bytes means
the TS door moved.

## Stability proof

Each vector captured TWICE from fresh TS boots + fresh state roots
on 2026-09-08 (throwaway probe script, not committed):
268/268 byte-identical across both captures (status + body). The TS
discovery arms serve the frozen export
(packages/gateway/shell/data/discovery-catalog.json) deterministically, so
no clock or id lives in these bytes.

## Deliberately NOT frozen here

- On-disk provision ARTIFACT bytes (0.5MB–27GB machine model files):
  freezing weights into the repo would pin machine data, not door
  behavior, and would chase card-work drift (a re-downloaded model
  changes bytes without the door moving). The wall pins those legs
  live TS-only instead: status 200 + content-type + content-length
  honesty + double-GET byte equality (small files) and 64KB-prefix +
  content-length pins (mid files). Giant files skip (per-side
  materialize would swap-OOM the wall); declared-but-missing slots
  skip (rail fetch is network in a wall, never a pin).
- Auth 401 shapes and bearer 200s: pinned as TS-only literals in the
  suite (401 `unauthorized` + `DSH_GATEWAY_TOKEN` text; bearer bodies
  equal these goldens).
- TS-only deployment envelopes (503 missing/unparseable catalog):
  node `-e` unit legs in the suite, no goldens (literal shape pins).

## Regolden rule

Regolden only for a deliberate TS-door behavior change, with a dated
note here. Never regolden to chase a red wall — the wall failing
against these bytes means the door moved. A new model/family id
(missing golden file) fails LOUD: freeze its vectors in the same
stroke as the estate change that added it.
