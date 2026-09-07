# video_h3-timeline_t4r.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, h3-timeline card)

Status: landed

Captured from the PRODUCTION python renderer (`render("h3_window", doc,
H3Timeline)`), doc = the card emitter's opener shape: variant t4r, k=1,
noise_seed 42, run-scoped ctx_save_prefix "runs/testrun/h3_context/clip"
(the emission/graph.py ctxdir convention), staged guide image
"guide.png", ref_image_size "704x1280", steps 12, shift_audio 5.0,
fps_seconds 10.0, width/height 1344/768.

Pins the t4r branch of the FIRST heavy-card port (h3-timeline / TS card
`h3-timeline.ts`): the SLA/chunked switch with a PrimitiveBoolean wire,
the LTX lora stack (gold string, lora_ui ""), ModelPreviewOverrideKJ
riding the in-graph 17k+5 step count, the dual resizers (reference
"Shorter Side" = UnifiedResizeImageMask.0, geometry "Total Pixels (MP)"
= .1 — the comfy-script DFS-post-order id walk, NOT python call
order), the PlagueKind bundle's 18 ref slots, the r2v/i2v dead-branch
switch pair, fps 24.0 as PrimitiveFloat.0 (walked first via
CreateVideo.fps), and the re-encode mp4 tail (crf 10.0). t4r strips
nothing — every pin autofill the python carried rides here.
