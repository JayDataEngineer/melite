# causes.md — golden_ts/test_gateway_studios_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). The studios wall was
a dual-serve comparison: every leg asserted in-process-py-dispatcher
bytes == TS HTTP bytes on a shared fixture (plus a py/ts
record-replay of the mutation sequence). The py serving oracle is
deleted, so there is no second side to agree with. Per the lane rule
(dual-boot walls become TS-ONLY, expected bytes = the TS side's
current bytes), the TS vectors were frozen as these files on
2026-09-08 (86 files):

- list-*.json (17) — presets lists per tenant (3d/img_to_mesh +
  image/mask_studio 500: the tenant regex fires after the estate
  hit), unknown/uppercase/dotdot/quote tenants (404), method
  mismatch (PUT/DELETE-no-id 404). Trailing-slash, query-strip,
  and encoded-slash wires serve list-anny.json's bytes (the suite
  asserts them against that golden — normalization, not new
  files).
- base-body-*.json (9) — no-base tenants + unknown/encoded-dot
  tenants (404) + POST mismatch (404). The anny body itself pins
  against the keeper-resolved disk bytes (provision mount off the
  real repo), never a golden — the mount resolution is the pin.
- save-*.json (41) — the full validation-refusal taxonomy (union/
  coherence/lax-coercion, truncation, tuple locs, branch tags,
  first-error footer).
- ledger-*.json (9) — seeded/invalid/non-dict/no-list/non-doc/
  shadow/bake/stored rows (500s) + the seeded row (200).
- save-vs-shadowed-400.json, delete-corrupt-estate-400.json.
- badtenant-*.json (6) — the status-split trap per bad tenant
  (list 500, save/delete 400).
- promote-*-400.json (6) — dims/dialect/missing-dialect/null/
  int/short-scale promotion refusals.
- delete-encoded-slash-404.json.
- ledger-final.json — the mutation sequence's end-state ledger
  (user-1 + user-3..user-10 rows), <ROOT>-normalized (below).

Shape legs (no golden): bad-JSON (V8 text), corrupt/list-doc
promotion params (host-JSON texts), corrupt ledger (OSError text),
and the anny base-body bytes (keeper disk ground truth).

## Stability proof

Each vector captured twice from fresh boots + fresh fixtures +
fresh state roots on 2026-09-08 (boot_scratch_gateway, the suite's
own request order per round); byte-identical across both captures
after <ROOT> normalization (probe script, not committed).

Normalization: legs whose bytes embed the wall's own fixture root
(ledger unreadable/validation texts naming the ledger file, ledger
rows storing absolute body refs) substitute the live root for
<ROOT> — the suite's normalize() does the same before comparing,
so the goldens freeze the <ROOT> form (the e2e-tsboot precedent).

## Regolden rule

Regolden only for a deliberate TS studios-door behavior change,
with a dated note here. Never regolden to chase a red wall — the
wall failing against these bytes means the door moved.
