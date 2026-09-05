# tools.json — regeneration causes

## 2026-09-05 — pilot stroke 2: anny body_glb goes optional (base-body autoload)

Same stroke as `form-spec_model_anny.json.d/causes.md`: the anny
card's `body_glb` File flips `required: True → False` with the
autoload-naming tooltip (design docs/design/anny-base-body.md).
DELIBERATE contract change, two hunks, both inside the `anny_card`
manifest: `params_schema.properties.body_glb.description` and
`params_schema.required` (`["body_glb"]` → `[]`).

Source: `plugins/engines/comfyui/action_cards/3d/anny/py/card.py`
via `tools/gen_tool_json.py` (the card class is the SSOT; the
`tool.json` snapshot regenerated in the same stroke).
Re-asserted from served `/v1/tools` on a scratch gateway (no live
restart); verified content-only against the previous golden (the
two anny hunks, nothing else).
