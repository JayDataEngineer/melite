# image_input_crop_scale.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, input-prep card)

Captured from the PRODUCTION python renderer (the input-prep card's
`render("input_prep", doc, Input)`), doc = the arm's `_step_doc` shape
with run_id "testrun" → prefix "testrun/input_prep": staged image
"koi_pond.png", crop {0,128,768,768}, scale {1024x1024, lanczos}. The
image branch's FULL transform lane (LoadImage → ImageCrop → ImageScale
→ SaveImage) — the audio restage and the bare-image branch were probe-
verified against the TS port but are not separately pinned here.

FACTS GAP (at capture, resolved same day): the `input` family is
weightless — no `lane_inputs` row — and the exporter's lane-inputs-only
filter dropped it, so the then-current model-facts.json carried no
`input` row and the compose door refused `--model input` with
`no-model-facts`. Captured against a local facts fixture with the row
injected (`{"id":"input","card":"input-prep","defaults":{},
"lane_inputs":{}}` — the card reads no lane fields). The exporter has
since learned weightless rows; this case now passes against the real
model-facts.json on the parity wall.
