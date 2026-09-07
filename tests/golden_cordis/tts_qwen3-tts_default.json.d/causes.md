# tts_qwen3-tts_default.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, audio cards)

Captured from the PRODUCTION python renderer (`render("tts_t1", doc,
Qwen3Tts)`), doc = _step_doc shape (text pinned, voice "" so the
MODEL's default persona vivian fills it — python row 4, temperature
0.7 / top_p 0.9 / speed 1.0 / seed 42 lane defaults, prefix
"testrun/tts").

This golden pins the tts card's TS port (families qwen3-tts +
qwen3-tts-base board it). Note it PINS the comfy-script autofill
inputs on AudiocoreTTS (the python tts renderer runs no strip pass):
temperature 0.8, top_k 0, language/reference_*/speaker_name "" etc.
ride the object_info pin defaults verbatim — the TS port states them
in blocks/audio-kit.ts as lane-local pin calibration.
