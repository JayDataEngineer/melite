# causes.md — golden_ts/test_gateway_runs_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). test_gateway_runs_parity.py
was a dual-serve comparison: every leg asserted py-bytes == ts-bytes
(plus the tie-aware list compare and the 500 shape pins). The py
serving oracle is deleted, so there is no second side to agree with.
Per the lane rule (dual-boot walls become TS-ONLY, expected bytes =
the TS side's current bytes), the TS vectors were frozen as these
files on 2026-09-08:

- queue.json — GET /v1/queue empty snapshot.
- runs.json + limit-*.json — GET /v1/flows/runs incl. the ?limit
  matrix, canonical tie-sorted form ({"count", "runs"} sorted by
  (media-segment, -created, run_id); see the D7 note below).
  runs-with-nonobj.json is the closing full list after run-arr/run-num
  land (count 14, rows 11).
- limit-abc.json / limit-12x.json — the 400 invalid_request bodies;
  limit-blank.json — `?limit=` falls back to the default (byte-equal
  to the full list on this tree).
- detail-*.json — detail rows (run-done1/fail2/staleR/underx/tricky/
  nest/badjson/arr/num 200s; run-legacy/run-nope 404s — legacy has
  media but no sidecar, so detail 404s while the list still serves it).
- status-*.json — status rows incl. log_tail variants (log-1/true/YES
  carry log_tail; log-0 does not), boot-swept staleR/staleQ reports
  (with the boot-sweep "sweep" note), legacy/nope 404s, badjson failed
  envelope.
- readtime-run-rtR.json / readtime-run-rtQ.json — read-time sweep
  reports for sidecars written post-boot. TS-ONLY semantics: the read
  door composes the report WITHOUT the write (packages/gateway/shell/src/
  doors/runs.ts D1), so every read is pristine — the suite reads each
  twice and pins both against the same golden (idempotence follows
  transitively; no TS-vs-TS leg is committed).
- cycle-*.json — scripted queued->running->completed->failed detail
  states over run-cycle.
- events-fallback.json / events-fallback-id.json /
  events-fallback-q.json — non-upgrade 404s (invalid_request, never
  no_such_route); events-post.json + runs-post.json — method mismatch
  (no_such_route).
- ws-hello.json — the bare-door hello frame; ws-unknown.json — the
  unknown-run hydrate frame (path, query, and stale-id forms serve
  byte-identical frames, so one golden covers all three; the suite
  pins each form plus reconnect against it, and hold-silence after
  every first frame).

Deliberately NOT goldens (shape pins in the suite, never bytes):

- STATUS 500s for valid-JSON-non-object sidecars (run-arr/run-num):
  the 500 texts embed the host stack (file paths, line numbers) and
  differ honestly across runtimes — the suite pins status 500 +
  envelope keys {error, type, traceback, route} + route literally.
- HTTP auth: 401 bodies carry no code by contract (the ctx.ts auth
  gate answers before dispatcher normalization) — the suite pins
  status 401 + the "unauthorized:" error prefix + the
  WWW-Authenticate: Bearer header literally; /v1/health stays exempt
  (status ok); bearer requests ride 200 (proven by every golden leg,
  which sends the bearer header); ?token= on HTTP stays refused.

## TS-only semantics worth knowing

- Boot sweep owns stale files before traffic (packages/gateway/shell/src/
  queue/queue.ts bootSweep: stale running/queued sidecars are rewritten
  with the "sweep" note + ledger row). Read-time stale sidecars
  (written post-boot) get the composed report instead ("zombie swept
  at read time" / "run was still queued when the gateway vanished
  (never executed) — resubmit") with no write — pristine on repeat.
- D7 tie order: created-ties order nondeterministically per readdir,
  so the suite stable-sorts tie groups by run_id before comparing;
  non-tie order bugs still surface. The frozen lists are stored
  pre-sorted; the suite sorts both sides anyway.
- The closing list count is 14 (11 fixture dirs + run-cycle + run-arr
  + run-num), rows 11 (run-underx skipped by the underscore-surface
  law, run-emptys refused by the row gate, run-modelm refused by the
  model-artifact gate — count keeps refused rows per the C contract).
- `?limit=1_0` serves 7 rows on this tree (limit 10 slices the 11-dir
  scan before the row gate skips) — pinned as served, not as ideal.

## Stability proof

Each vector captured twice from fresh boots + fresh state roots on
2026-09-08 (throwaway probe script, not committed): status + body
byte-identical across both captures for every vector above (HTTP Date
headers excluded — transport, never asserted). The readtime pair read
identical on 1st and 2nd read within each boot (pristine pin).

## Regolden rule

Regolden only for a deliberate TS-door behavior change, with a dated
note here. Never regolden to chase a red wall — the wall failing
against these bytes means the door moved.
