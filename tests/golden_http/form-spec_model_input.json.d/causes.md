# form-spec_model_input.json — regeneration causes

## 2026-09-05 — NEW GOLDEN (the input lane boards)

Same stroke as `model-catalog.json.d/causes.md` (j): `input` boards
`input-prep`, and the wall `test_python_cards.py` pins every flipped
card's class fragment against a recorded form-spec golden (the
ideogram4 precedent). This golden records the input-prep surface:
one `source` File field (image OR audio — hence File, not Image),
`service: "input"`, label from the card class. The editor never
fetches it (the fixed `InputCardEditor` owns kind `"input"`); the
pin exists so the card's field surface cannot drift silently.
Recorded from the `form_spec` door in-process (recipe: indent=2,
sort_keys=True, ensure_ascii=True + trailing newline, matching the
other form-spec goldens); the `test_python_cards` served-fragment
check proves the served route emits this body byte-identical
(validated 2026-09-05: 76/76 checks green up to the unrelated
h3 live-compose door — see the pipe-carry note in
docs/design/input-prep-boarding.md).

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
