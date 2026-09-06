# forms golden — regeneration causes

## 2026-09-05 — image-edit rework: `img-edit` family retired

The pre-flip `img-edit` family head is deleted (same physical lane as
`qwen-img-edit-2511`, but no variant/quant cascade — the "rides on
defaults" fossil: the card surface in default mode rendered an empty
model/variant/quant selector). DELIBERATE contract change, one form:

- `forms.image-edit.covers`: `["img-edit", "qwen-img-edit-2511"]` →
  `["qwen-img-edit-2511"]` (the survivor boards alone).
- `forms.image-edit.default_service`: `"img-edit"` →
  `"qwen-img-edit-2511"` (the editor's default model for the Image
  Edit form follows the boarded family — issue (a) of the rework).

Source: `py/editor_forms.py` `_FORMS_TABLE["image-edit"]` (the fixed
operator surface — the class/table is the SSOT, this golden pins it).
No other form changed (verified: full-route live-vs-golden diff shows
only `image-edit`).

## 2026-09-05 — the input lane boards (`input-prep` form row)

Same stroke as `model-catalog.json.d/causes.md` (j): the hidden
`input-prep` row (`default_service: "input"`, `covers: ["input"]`)
joins the fixed operator surface so the offered `input` family has a
form home (design docs/design/input-prep-boarding.md). DELIBERATE
contract change, one hunk: the `input-prep` entry in sorted position,
nothing else (verified: full-file diff shows only the insertion).

## 2026-09-05 — pixal3d covered by img-to-mesh (one leaf)

The img-to-mesh form covers ("trellis2-native",) ->
("trellis2-native", "pixal3d") so the editor offers the Pixal3D model
switch on the Image-to-3D card (design
docs/design/img-to-mesh-pixal3d-boarding.md). transfer_rig stays
uncovered: GLB-pair inputs, it does not ride the image form. In-place
covers update only — key order and file format preserved.

Note (same stroke): a clobbered working-tree input-prep entry was
restored from the live scan after an over-broad git checkout during
this regold — verified restored via the forms self-test (PARITY OK)
and the entry matches the input-prep session recorded cause above.

## 2026-09-06 — cpp ggml kimodo lane retired (regold)

Operator order: wrap the NVIDIA python package — it was already
wrapped (melite-kimodo-nodes: KimodoLoader/KimodoTextToPose over
`kimodo` pkg, live-probed 2026-09-04); the cpp ggml port was the
SECOND implementation and died by the ONE-implementation rule.
The soma/smplx/g1 rows + the text-to-motion form + the
text_to_motion_card tool leave the served surfaces (the comfyui
kimodo row + motion_card remain). form-spec_model_soma.json
deleted with the lane.
