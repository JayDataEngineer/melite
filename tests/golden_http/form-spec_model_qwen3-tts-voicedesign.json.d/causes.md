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

## 2026-09-06 — universal default recipe (recipe-audit stroke)

Operator order, verbatim: every card family ships the 'default'
recipe — always — and the Recipe rail renders ABOVE the Model row.

- `python/melite_models/grammar.py`: canonical `DEFAULT_RECIPE`
  (Variant id=default, group=Recipe, patch-only, defaults={}) +
  `RECIPE_GROUP` (landing default='default'). The metaclass appends
  both to EVERY family (variants LAST — resolve() owns variants[0];
  families declaring their own id='default' or Recipe group refuse
  at import) and seeds the standard Variant/Quant pair for families
  that declared no groups (else their axis rows strand).
- krea-2's family-owned Recipe group (landing realism) refused under
  the new law and was removed — realism stays as an OPT-IN extra;
  a fresh card lands on Default (no LoRA stamp).
- `python/editor_forms.py`: each group's default row serves first within
  its group run (display order only; tuple order untouched).
Mode for THIS file: SURGICAL patch (NOT parity-pinned) — only
the default recipe row (inserted head of the Recipe run, exact live
bytes) + the Recipe variant_groups entry (exact live bytes) changed;
every other byte is untouched, including this lane's unrelated drift,
which stays its lane's business.
