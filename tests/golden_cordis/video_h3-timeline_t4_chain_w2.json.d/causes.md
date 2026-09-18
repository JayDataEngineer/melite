# video_h3-timeline_t4_chain_w2.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, h3-timeline card)

Status: landed

Captured from the PRODUCTION python renderer (`render("h3_window", doc,
H3Timeline)`), doc = the SAME-PROMPT seam shape: variant t4_chain,
k=2, ctx_save_clip_index 2, ctx_load_latent_path "" (empty — window 2
draws its context from the PRIOR window in the same run), length 56,
context_length "39" / audio 24.

Pins the seam rewrite: MiniMaxH3MotionContextLoadLatent.0.latent_path
becomes the pre-namespaced cross-window link
["window1_MiniMaxH3MotionContextSaveLatent.0", 0] — the renderer's
post-serialization rewrite, carried as a raw JSON link in the TS port
(a foreign node id no builder can wire). SaveVideo prefix "h3_t4_w2"
(k rides the prefix law).

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


## 2026-09-18 — the ghost-default regold (the parity wall's cause)

Same cause as t4_open: the SeedVR2 loader input's ghost fp8 default
→ the estate-declared fp16 variant file. No other byte moved.
