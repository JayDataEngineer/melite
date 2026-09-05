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
