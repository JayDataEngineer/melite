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

## 2026-09-15 — V9 parity regold (the operator's cause)

Status: landed

The operator dropped PlagueKind h3V9 and sanctioned the translation
("yes do it there, I don't care, just copy them"). Three deltas land
in these bytes:

1. **SLA min_seq_len 8192 → 12288** — upstream's V9 instance value
   (loader subgraph #5603). Carrier default + body literal moved
   together.
2. **Tail order: sharpen LAST** — V7 sharpened first (sharpen →
   interp → VSR); V9 runs interp → VSR → sharpen (rcas after the
   upscaler, "0.3 strength looks natural" per his notes). The three
   switches stay estate knobs; the ORDER is upstream's.
3. **fps compensation** (same day, landed byte-stable first): fps =
   24 × interp multiplier when interp is on — upstream's
   ComfyMathExpression "a * 2". Byte-neutral at these cases' defaults
   (interp off → literal 24).

Also: the latent upscaler model (minimax_h3_latent_upscaler_3d_bf16,
LBH-123-AI, sha 4f57821f…) is now an IaC provision row; the MMH3
ultimate-upscale compose arm is the follow-up stroke.
