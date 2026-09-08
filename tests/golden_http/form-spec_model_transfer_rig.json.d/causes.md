# form-spec_model_transfer_rig.json — causes

## 2026-09-06 — official-template alignment (cfg 7.5 default, NEW causes file)

This golden never had a .d/ entry; the first regold opens it. The
transfer_rig fragment shares the card's generation knobs, so it
rides the same flip: fields[cfg].default 3.0 -> 7.5 with the
cfg/resolution tooltip rewrites (+ the schema_groups mirror). Mesh
rigging itself is untouched — knob surface only. File format
preserved (indent=1, literal UTF-8, trailing newline); values merged
in place from field_spec over the card class.

## 2026-09-06 — steps tooltip reword (knob-surfacing stroke)

The 11 new Stage/Mesh/Bake knobs are families-scoped to the lift
arms — transfer_rig's fragment takes ONLY the shared steps-tooltip
reword (shape/texture stages now ride their own knobs). Two
surgical leaves (fields + schema_groups mirror). Rigging untouched.

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

## 2026-09-07 — OUTPUT-CONTRACT + defaults-blanket stroke (operator order "fill ALL the gaps")

Regenerated from the live served body. Two change classes, both
deliberate: (a) DENSITY — the served rows are now dense
FormFieldRow.model_dump() rows (the 2026-09-05 post-regen shape the
older sparse 3D goldens predated); verified field-by-field that no
shared-key value changed. (b) one field REMOVED per file (see below) —
a dead-promise deletion, not drift. Semantic diff old-vs-new names
exactly the removal, zero additions, zero value changes.
Removed here: filename_prefix (09-06 sweep fossil — the run owns output names; served through the shared img-to-mesh card surface).
