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


## 2026-09-08 — THE DOOR FLIP (Phase-2 completion): params_schema now derives LIVE from the registered Schemastery schemas

The chrome door's /v1/tools arm serves the frozen base doc with every
card-compose tool's params_schema overlaid at serve time by
doors/toolsEmit.ts (engine package's params-emit.ts walks schema meta;
cardDefs.ts boots the card set once and caches). The py exporter's
card-arm is retired from serving. Regolded from the live scratch
serve, 19 card tools.

Accepted deltas vs the retired py-exporter bytes (each a documented
decision, not drift):
- Canonical TS serialization: JSON.stringify(doc, null, 2) — raw
  UTF-8 (py escaped \uXXXX), JS numbers (py 8.0). Key order
  canonicalized (type, format, enum, default, minimum, maximum,
  description, x-*).
- seed knobs gain "minimum": -1 — the seed sentinel law's floor,
  visible to consumers for the first time (py never served it).
- skin seed minimum 0 -> -1: the seed law outranks the py floor.
- h3 image gains format "path"; h3 interpolate_enabled default is a
  BOOLEAN (py served the string "false" — a wart).
- Coerced Selects (skin map_size, img-to-mesh resolution/atlas/ao/
  normal, fit/anny/skin transparent): served string enums with
  stringified defaults, derived from extra.options / union shapes.
- Descriptions are the TS-authored single-declaration texts (py's
  longer texts superseded); tagger enums ride kit order (sorted) and
  extra_option serves the FULL 28-option list (py served 15).
- multi-family model knobs synthesized from boarded (enum, default
  boarded[0]); single-family cards serve no model knob (py parity).

Verified: test_gateway_chrome_parity (15 legs), test_http_parity,
test_formwire_parity re-pinned to these bytes.

## 2026-09-08: 19 -> 20 tools (clothing-placement, the Blender MCP card)

Pure LAW-0 card: no card.py, no card-decls.json row — the frozen
TOOLS_JSON base in chrome.ts gains one hand-added generator-shaped
row (card clothing-placement, model null, stage_title Clothing
Placement; params_schema placeholder inert — the toolsEmit overlay
projects the live Schemastery schema at serve: 15 knobs, required
[body, garment, out_path], no model knob on the empty board).
