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
