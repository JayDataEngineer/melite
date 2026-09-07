# form-spec_model_mask-studio.json — regold causes

## 2026-09-05 — export_* knob defaults string→bool (10 lines)
Same fix as tools.json: the five Boolean export knobs served
"default": "true"/"false" (strings) while the schema row carries
real bools. Card defaults corrected to True/False; this regold flips
exactly the 5 fields[] + 5 schema_groups[] default lines. The
top-level `defaults` map KEEPS its "true"/"false" strings — the
serve layer stringifies that map (live-proven: served map unchanged
by the fix). All other served-vs-recorded divergences (width/zone/
contract/guide/variants keys) are other strokes' form-spec
evolution, deliberately NOT swept in.

## 2026-09-06 — universal default recipe (recipe-audit stroke)

Operator order, verbatim: every card family ships the 'default'
recipe — always — and the Recipe rail renders ABOVE the Model row.

- `py/melite_models/grammar.py`: canonical `DEFAULT_RECIPE`
  (Variant id=default, group=Recipe, patch-only, defaults={}) +
  `RECIPE_GROUP` (landing default='default'). The metaclass appends
  both to EVERY family (variants LAST — resolve() owns variants[0];
  families declaring their own id='default' or Recipe group refuse
  at import) and seeds the standard Variant/Quant pair for families
  that declared no groups (else their axis rows strand).
- krea-2's family-owned Recipe group (landing realism) refused under
  the new law and was removed — realism stays as an OPT-IN extra;
  a fresh card lands on Default (no LoRA stamp).
- `py/editor_forms.py`: each group's default row serves first within
  its group run (display order only; tuple order untouched).
Mode for THIS file: SURGICAL patch (NOT parity-pinned) — only
the default recipe row (inserted head of the Recipe run, exact live
bytes) + the Recipe variant_groups entry (exact live bytes) changed;
every other byte is untouched, including this lane's unrelated drift,
which stays its lane's business.

## 2026-09-07 — envelope + variant-rows catch-up (Cordis cards 6+7)

Parity-pinned this stroke. Deltas, all classified:

- `$.contract` / `$.enhance_prompt` nulls + explicit-null field
  attrs: the serialization blanket (same as the seedvr2_ema entry
  above — no lane content).
- `variants[]`: the golden carried ONLY the universal default
  recipe; live serves the committed class shape (standard +
  f32 quant + default recipe). The model.py shape is committed
  HEAD, not in-flight work — the golden simply predates it.

Served-verbatim rewrite. (input-prep's golden needed no touch —
it matched live as-is.)
