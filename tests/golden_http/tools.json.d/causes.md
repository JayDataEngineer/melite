# regold — tools.json

Date: 2026-09-07
Status: landed

The h3 derivation stroke (17fa0dab + the card.py admits work)
briefly served the t4_open template defaults (768x448, one family)
while the py emission settled; the capture rode that state. The
serve is the derivation law's truth again (1344x768 form defaults,
3 families: h3-timeline/h3/h3-keyframe — fresh-scan verified both
on production :33081 and a scratch boot). Regolded from the live
scratch serve; verified by test_http_parity 48/0.

## 2026-09-08 — mono-engine retirement (red-closure lane)

auto_rig_card / forge_card / music_native_card retired from the
served /v1/tools surface with their engines (quarantine 47e1c583 —
anycreature / skintokens / audio-cpp dead; card-decls golden went
22->19 the same day, causes beside it). The living derivation
(python/editor_runs.tools, scan-driven) serves 19 tools;
packages/gateway/src/doors/chrome.ts regenerated via its capture
script (other 9 doors byte-identical). Regolded from the live
scratch serve (removals-only diff, 19 survivors byte-identical);
verified by test_http_parity + test_gateway_chrome_parity.


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
