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
