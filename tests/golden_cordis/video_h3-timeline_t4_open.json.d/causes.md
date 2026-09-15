# video_h3-timeline_t4_open.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, h3-timeline card)

Status: landed

Captured from the PRODUCTION python renderer (`render("h3_window", doc,
H3Timeline)`), doc = the t4_open shape: k=1 opener, length 90, steps
12, shift_audio 5.0, sharpen strength 0.3, run-scoped
ctx_save_prefix "runs/testrun/h3_context/clip".

Pins the t4 branch: chunked chain rides LTX lora (no lora_ui — the
_T4_AUTOFILL_STRIP pass), the literal-true SLA switch, the
ModelAttentionBackend false leg, shift_video as the INT 8, the
ER-SDE/sampler-select switch (literal false), and the full post ladder
— ImageSharpenKJ grouped-widget dict, FILM interpolation,
SeedVR2 superres (stripped autofills), three ladder switches —
ending in SaveVideo "h3_t4_w1" mp4 + the context SaveLatent.

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
