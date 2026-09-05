# form-spec_model_mask-studio.json — regold causes

## 2026-09-05 — export_* knob defaults string→bool (10 lines)
Same fix as tools.json: the five Boolean export knobs served
"default": "true"/"false" (strings) while the schema row carries
real bools. Card defaults corrected to True/False; this regold flips
exactly the 5 fields[] + 5 schema_groups[] default lines. The
top-level `defaults` map KEEPS its "true"/"false" strings — the
serve layer stringifies that map (live-proven: served map unchanged
by the fix). All other served-vs-recorded divergences (width/zone/
contract/guide/variants keys) are other strokes' form-spec
evolution, deliberately NOT swept in.
