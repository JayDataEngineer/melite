# music_music3_default.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, audio cards)

Captured from the PRODUCTION python renderer (`render("music_t1",
doc, MinimaxMusic3)`), doc = _step_doc shape (caption pinned,
lyrics "" = instrumental baked as the empty string — MiniMax's own
convention, never a dangling ref; seed 42 / duration 30.0 /
guidance 1.7 / steps 30 / lm_cfg 1.7 lane defaults, prefix
"testrun/music").

This golden pins the music card's TS port (family music3,
stock-only — no requires). The python renderer strips the
comfy-script autofills (CLIPLoader.device, KSampler.
control_after_generate), so this graph carries ONLY renderer-passed
inputs — the TS port never adds the autofill here.
