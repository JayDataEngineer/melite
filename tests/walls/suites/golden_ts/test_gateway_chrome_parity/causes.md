# causes.md — golden_ts/test_gateway_chrome_parity/

Date: 2026-09-08. Status: landed (oracle-death re-derivation).

## Why these goldens exist

ORACLE DEATH (operator order verbatim: "we do not need parity, we
need to migrate, not keep the old machinery"). The chrome wall was
a dual-serve comparison: every leg asserted live-py-dispatcher
bytes == TS HTTP bytes. The py serving oracle is deleted, so there
is no second side to agree with. Per the lane rule (dual-boot walls
become TS-ONLY, expected bytes = the TS side's current bytes), the
TS vectors were frozen as these files on 2026-09-08:

- health.json / themes.json / tags.json / services.json /
  right-panes.json / ui-slots.json / tools.json / shell.json /
  plugins.json / models.json — GET on each of the 10 chrome doors
  (status 200 + application/json assumed by the wall; the files pin
  the bodies byte-exact).
- unknown-404.json — GET on an unserved path (the no-such-route
  404 shape).
- health-post-404.json — POST on the GET-only /v1/health door
  (the method-mismatch 404 shape).

The trailing-slash and query-strip legs pin against health.json /
themes.json (normalization serves the base door's bytes).

Note on /v1/tools: at freeze time the TS door serves 70846B where
the retired py oracle served 65965B (first divergence early in the
body). TS WINS per the lane's stale-diff ruling — the golden pins
the TS bytes, the py expectation is dropped, never ported.

## Stability proof

Each vector captured twice from fresh boots + fresh scratch state
roots on 2026-09-08 (boot_scratch_gateway, one boot per round);
byte-identical across both captures (probe script, not committed).
No minted ids, clocks, or roots in these bodies — no normalization.

## Regolden rule

Regolden only for a deliberate TS chrome-door behavior change,
with a dated note here. Never regolden to chase a red wall — the
wall failing against these bytes means the door moved.

## 2026-09-08 — mono-engine retirement (red-closure lane)

tools.json regolded 22->19 tools: auto_rig_card / forge_card /
music_native_card retired from the served surface with their
engines (quarantine 47e1c583; card-decls golden 22->19 same day).
chrome.ts regenerated via its capture script (TOOLS line only —
other 9 doors byte-identical, 19 survivors byte-identical).
Deliberate TS chrome-door behavior change per the regolden rule.
