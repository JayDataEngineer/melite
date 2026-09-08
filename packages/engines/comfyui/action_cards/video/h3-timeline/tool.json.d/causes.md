# h3-timeline tool.json — regeneration causes

## 2026-09-08 — in-flight card.py delta re-derived (generators STEP 0)

The h3-timeline card class evolved without a snapshot regen, so
`tools/gen_tool_json.py` (dry run) reported drift on this card only
(18/19 served snapshots already matched; the 19-file drift first
seen this stroke was a phantom — the tool's `py/` basename shim
missed the `py/ → python/` rename and pointed at
`<card>/python/tool.json`, fixed in the same stroke: `python/`).
DELIBERATE derivation, params ONLY (verified: full-file leaf diff
shows additions/changes under `params_schema.properties` only —
new `model` family enum [h3-timeline, h3, h3-keyframe],
width default 768 → 1344, height default 448 → 768,
sharpen_enabled default "true" → false (bool fix),
shift default 12.0 → 8.0; nothing else).
Regen: `python3 tools/gen_tool_json.py --write`.
