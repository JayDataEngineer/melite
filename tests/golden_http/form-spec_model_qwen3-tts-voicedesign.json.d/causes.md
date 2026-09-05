# form-spec_model_qwen3-tts-voicedesign.json — regeneration causes

## 2026-09-05 — QvoiceMod descoped from the export family (mod-audit follow-up)

The stroke: `qwen3-tts-voicedesign.mods = (QvoiceMod,)` removed. The
mod's founding order was a qvoice INPUT surface "that triggers in
qwenTTS" — a CONSUMPTION knob. Voice-lock is the EXPORT view: it
PRODUCES .qvoice personas; nothing in its compose/renderer reads a
qvoice file or PCA steering (verified — both absorbed fields were
dead knobs the schema rightly refused, the LAST `_NARROW`
dispensation). The mod still rides qwen3-tts and qwen3-tts-base
(the TTS card, where a locked persona feeds back in).

Divergence owned by the stroke:
- `$.fields`: 9 → 7 (`qvoice`, `voice_pca_strengths` dropped)
- `$.schema_groups`: 4 → 3 (the `qvoice` group had no other member)

Catch-up rows (the golden had not been regenerated since these
landed; the editor_forms self-test loop covers only krea-2 /
h3-timeline / music3, so drift was invisible here — each row
verified against the live served spec):
- `$.contract`, `$.enhance_prompt`, `$.guide`, `$.layout`,
  `$.loader_info`, `$.size` only-new (the layout/guide/loader_info
  strokes' served members)
- `$.defaults.mode` / `$.defaults.variant` only-old (default rows
  now derive through the family cascade, not restated)
- `$.variants`: 0 → 2 (variant rows served since the route-lens
  stroke)

Re-asserted from `editor_forms.form_spec` in-process (no live
restart).
