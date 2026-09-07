# voicelock_qwen3-tts-voicedesign_default.json — capture causes

## 2026-09-07 — initial capture (Cordis compose plane, audio cards)

Captured from the PRODUCTION python renderer
(`render("voicelock_t1", doc, Qwen3TtsVoiceDesign)`), doc = _step_doc
shape (voice_name "koi_keeper" + style_instruction pinned,
temperature 0.7 / top_p 0.9 / speed 1.0 / repetition_penalty 1.05 /
seed 42 lane defaults, prefix "testrun/voicelock").

This golden pins the voice-lock card's TS port (family
qwen3-tts-voicedesign, the .qvoice EXPORT view). Two pinned quirks:
the model's defaults.variant voicedesign bakes extras with PYTHON
json.dumps spacing (`{"variant": "voicedesign"}` — space after the
colon), and the AudiocoreVoiceStudio autofill survives unstripped —
text "Hello! This is a voice preview." and top_k 50 ride the
object_info pin defaults verbatim.
