# form-spec_model_seedvr2_ema.json — regeneration causes

## 2026-09-06 — standard-fields sweep: dead filename_prefix removed

Operator order, verbatim: "We need standard fields in general as
well... LIke upscale tools has: Filename prefix field... wtf?".
The knob was a dead promise (compose stamps `<run>/gen`; the
surface value never reached the graph) and its family default
violated cross-validation (a default must name a card field).
Card field + `seedvr2_ema` family default deleted; served-verbatim
regold (fields/defaults/schema_groups hunks only). Design record:
docs/design/image-edit-surface-standard.md.

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

- 2026-09-06: fields regolded from the card CLASS (the SSOT) — the 2026-09-06 image-edit/video-gen/upscale-tools card rework (input_image->image1, visible_when relaxation, field count changes) landed with the classes but the goldens lagged; served==fragment verified before write.
