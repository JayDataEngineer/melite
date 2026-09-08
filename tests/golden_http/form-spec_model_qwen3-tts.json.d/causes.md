# form-spec_model_qwen3-tts.json — regeneration causes

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

## 2026-09-07 — committed-evolution catch-up (Cordis cards 10-13)

Parity-pinned this stroke. The golden lagged committed classes
(variant rows now standard+quant+default recipe; tts defaults
mode/variant -> voice; tts-base field surface grown) — working
tree clean for the lane, no in-flight work absorbed.
Served-verbatim rewrite; envelope/null deltas are the
serialization blanket. Same stroke declares melite-audio-nodes on
tts/sfx/voice-lock (music3 verified stock-only) and trims the
three core node names from the pack's map set.
