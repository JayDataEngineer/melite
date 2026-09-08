# causes.md — golden_ts/test_gateway_planes_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). The planes wall was
a dual-serve comparison: every leg asserted in-process-py-dispatcher
bytes == TS HTTP bytes on a shared synthetic fixture. The py serving
oracle is deleted, so there is no second side to agree with. Per the
lane rule (dual-boot walls become TS-ONLY, expected bytes = the TS
side's current bytes), the TS vectors were frozen as these files on
2026-09-08 (62 files):

- lanes*.json (12) — the lanes door incl. kind/genre filters,
  first-kind-wins, blank-dropped, trailing-slash.
- lanes-post-404.json — POST on the GET door.
- card-tools*.json (12) — unfiltered + per-lane filters (flow:
  lanes 404: only card lanes resolve here).
- bundle-*.json (16) — per-lane bundles; flow lanes 404 (a flow
  lane is no card bundle — the retired py oracle agreed byte for
  byte, so the golden pins the refusal); encoded wire forms serve
  the same golden bytes as the decoded route.
- skills-index.json + skill-*.json (15) — the index + one per
  skill id (the two flow: reads 404 and never journal).
- skill-missing-agent-404.json / skill-unknown-404.json /
  skills-delete-404.json.
- metrics.json — the metrics body modulo the process clock
  (boot_at/uptime_s shape-checked + stripped, remainder frozen).
- metrics-post-404.json / agent-boot-post-404.json.
- agent-boot.json — the boot body modulo the nested gateway clock
  (shape-checked + stripped, remainder frozen).

Shape legs (no golden): the studios base-body probe on the planes
fixture 500s with the fixture root in the text (status + stable
prefix only); the skill.read ledger count pins the TS-WINS literal
11 (the two flow: 404s never journal — the stale 13 is dropped).

## Stability proof

Each vector captured twice from fresh boots + fresh fixtures +
fresh state roots on 2026-09-08 (boot_scratch_gateway, one boot per
round); byte-identical across both captures, and the lanes door
re-polled at round end still matches its golden (no journal drift
— probes, not committed). No minted ids, clocks, or roots survive
in these bodies (clocks stripped, see above) — no normalization.

## Regolden rule

Regolden only for a deliberate TS planes-door behavior change,
with a dated note here. Never regolden to chase a red wall — the
wall failing against these bytes means the door moved.


## 2026-09-08 — dead-engine planes re-truthed (music/forge/auto_rig)

The golden pinned the PY death rattle verbatim: the music, forge and
auto_rig plane rows carried params = {"error": "ModuleNotFoundError:
No module named 'music'|'forge'|'auto_rig'"} — the py oracle's
import failure captured as a schema. The TS door serves the honest
shape for a quarantined engine's plane: params = null (schema
unloadable, plane listed). Regolded from the live scratch serve with
pin_modulo_clock's exact strip. FOLLOW-UP (catalog re-freeze): the
frozen discovery-catalog still carries the three dead plane rows;
their retirement (catalog re-scan dropping quarantined engines) is
the exporter stroke — this golden re-cuts to whatever the catalog
serves next.
