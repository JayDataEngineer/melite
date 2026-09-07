# sfx_moss-sfx_default.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, audio cards)

Captured from the PRODUCTION python renderer (`render("sfx_t1", doc,
MossSfx)`), doc = _step_doc shape (prompt pinned, guidance 5.0 /
steps 50 / duration 10.0 / seed 42 lane defaults, prefix
"testrun/sfx").

This golden pins the sfx card's TS port (family moss-sfx). Like tts
it PINS the comfy-script autofill inputs on AudiocoreTTS (no strip
pass): the SFX renderer passes only the diffusion knobs, so
temperature rides the object_info pin default 0.8 (NOT the tts lane
default 0.7) — the autofill is per-input pin data, never per-card.
