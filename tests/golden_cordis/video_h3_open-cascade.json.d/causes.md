# video_h3_open-cascade.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, h3-timeline card)

Status: landed

Captured from the PRODUCTION python renderer (`render("h3_window", doc,
H3)` — the 'h3' family class), doc = the t4_open shape with the 'h3'
model's merged defaults baked (length 124, steps 30, shift_video 12.0,
shift_audio 3.0, seed 42).

The case params OMIT those knobs: they arrive through the compose
door's params cascade (schema defaults ← model defaults ← explicit).
This golden pins that the cascade reaches the graph — the TS door's
model-defaults merge feeds the same inject vocabulary the renderer
reads, byte-equal against a python doc that carried the values
explicitly. Model 'h3' boards the same card (facts row card:
h3-timeline).
