# image_mask-studio_recipe.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, mask-studio card)

Captured from the PRODUCTION python renderer (the mask-studio card's
`render("mask_t1", doc, MaskStudio)`), doc = the arm's `_step_doc`
shape with run_id "testrun" → prefix "testrun/mask". The FULL studio
recipe in one graph: primary face via the SAM3 text lane, a scoped
"hands" detect export (conditioning + bboxes dict), a paint export,
dilation 6 (GrowMask on every save), the paint union
(MaskComposite + its own second GrowMask on the primary), and the
RT-DETR box manifest — 25 nodes pinning every lane of the port.

Two python-plane truths this golden pins that a naive port would miss:
- SAM3_Detect's `bboxes` carries the PIN's declared default
  {x:0, y:0, width:512, height:512} whenever the caller passes none
  (comfy-script autofills it; the renderer does not strip it).
- The exports lane reads lane rows from facts (`checkpoint`,
  `unet`) — the Cordis door feeds the generated facts file, never
  hardcoded weight names.

The pure-paint shape (TWO LoadImageMask nodes — python's `painted` vs
`paint_masked` locals — with the three loaders evaporating from the
api graph) was probe-verified against the TS port; the lazy-loader
structure in the TS card exists precisely to mirror that reachability.
