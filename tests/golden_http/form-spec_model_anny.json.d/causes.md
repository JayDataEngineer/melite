# form-spec_model_anny.json — regeneration causes

## 2026-09-05 — pilot stroke 2: body_glb goes optional (base-body autoload)

The anny card's `body_glb` File flips `required: True → False` and its
tooltip names the autoload (pilot stroke 2, design
docs/design/anny-base-body.md): an empty body slot resolves at the
phase-1 door to the Model-declared neutral body
(`anny-base-body.glb`, provisioned under models/anny) instead of
refusing. DELIBERATE contract change, two hunks:

- `fields[0].required` / `schema_groups[0].fields[0].required`:
  `true` → dropped-or-null (the dense served emission; the FLIPPED
  parity wall compares through `_dense`, which treats the null as
  the absence of the notch).
- `body_glb` tooltip: old "a rigged or static character GLB the
  turnaround renders" → "empty autoloads the Model-declared neutral
  body (anny-base-body.glb, provisioned); or attach a rigged/static
  character GLB".

Source: `plugins/engines/comfyui/action_cards/3d/anny/py/card.py`
(the card class is the SSOT; this golden pins its served emission).
Re-asserted from served `/v1/form-spec?model=anny` on a scratch
gateway (no live restart — the parity suite's own boot path);
verified content-only against the previous golden (required +
tooltip, nothing else).
