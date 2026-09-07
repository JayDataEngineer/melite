# video_h3-timeline_t4_chain.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, h3-timeline card)

Status: landed

Captured from the PRODUCTION python renderer (`render("h3_window", doc,
H3Timeline)`), doc = the chain shape: variant t4_chain, k=1, length 56,
ctx_load_latent_path "runs/prior/h3_context" (a LITERAL prior path —
the seam rewrite does not fire at k=1), ctx_load_clip_index 0,
context_length "39" / audio 24, steps 12, sharpen strength 0.3.

Pins the h3-motion-context chaining rail: LoadLatent → MotionContext
(never-denoised conditioning rows wired into conditioning AND latent)
→ the delivered clip trimmed (picture AND audio slots, fps 24.0,
match_tail) so the sharpen switch and CreateVideo ride the TRIMMED
outputs. SaveVideo prefix "h3_t4_w1".
