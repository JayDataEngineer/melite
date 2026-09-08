# form-spec_model_anny.json — regeneration causes

## 2026-09-05 — pilot stroke 2: body_glb goes optional (base-body autoload)

The anny card's `body_glb` File flips `required: True → False` and its
tooltip names the autoload (pilot stroke 2, design
docs/design/anny-base-body.md): an empty body slot resolves at the
phase-1 door to the Model-declared neutral body
(`anny-base-body.glb`, provisioned under models/anny) instead of
refusing. DELIBERATE contract change, two hunks:

- `fields[0].required` / `schema_groups[0].fields[0].required`:
  `true` → dropped-or-null (the dense served emission; the FLIPPED
  parity wall compares through `_dense`, which treats the null as
  the absence of the notch).
- `body_glb` tooltip: old "a rigged or static character GLB the
  turnaround renders" → "empty autoloads the Model-declared neutral
  body (anny-base-body.glb, provisioned); or attach a rigged/static
  character GLB".

Source: `packages/engines/comfyui/action_cards/3d/anny/py/card.py`
(the card class is the SSOT; this golden pins its served emission).
Re-asserted from served `/v1/form-spec?model=anny` on a scratch
gateway (no live restart — the parity suite's own boot path);
verified content-only against the previous golden (required +
tooltip, nothing else).

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
