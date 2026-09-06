# form-spec_model_wan-vace.json — regeneration causes

## 2026-09-05 — surgical options-vocab catch-up (object_info pin)

Same `_option_list` fix as `form-spec_model_krea-2.json.d/causes.md`
(the exec namespace now carries the plugin file location, so the
comfyui pin vocab loads instead of serving `[]`). This golden is NOT
parity-pinned and carries its owning lane's unrelated drift — so the
stroke does NOT wholesale-regold it (that would absorb another
lane's work). SURGICAL patch: the 4 sampler/scheduler `options`
lists (flat + schema_groups mirror) set to the pin vocab, file bytes
otherwise untouched (verified: full-file leaf diff shows 42
divergences, every one under an `options` list — nothing else).
The lane's other drift stays its lane's business.

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
