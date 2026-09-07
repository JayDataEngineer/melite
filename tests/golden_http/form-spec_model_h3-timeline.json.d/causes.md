# form-spec_model_h3-timeline.json — regeneration causes

## 2026-09-05 — h3 knob rows go canonical (card-primitive sweep)

The h3-timeline card's last hand-rolled `Field(type='int'/'bool'/
'float')` rows migrate to the kit primitives (Seed/Number/Boolean —
docs/design/card-primitive-extraction.md). Served editor surface:
10 rows serve their canonical vocabulary (`seed`, `number`,
`boolean` — was `int`/`bool`/`float`, type strings the dsl
vocabulary never named), each mirrored in `fields[]` +
`schema_groups[]` (20 surgical lines, verified full-file leaf diff:
zero other divergences). Defaults, labels, tooltips, min/max/step
byte-identical — the editor renders the same controls with honest
type strings.

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
Mode for THIS file: WHOLESALE regold (parity-pinned route —
the golden must equal the live wire byte-for-byte; verified zero
leaf divergences old→new outside the causes below).

## 2026-09-07 — OUTPUT-CONTRACT + defaults-blanket stroke (operator order "fill ALL the gaps")

Regenerated from the live served body. Two change classes, both
deliberate: (a) DENSITY — the served rows are now dense
FormFieldRow.model_dump() rows (the 2026-09-05 post-regen shape the
older sparse 3D goldens predated); verified field-by-field that no
shared-key value changed. (b) one field REMOVED per file (see below) —
a dead-promise deletion, not drift. Semantic diff old-vs-new names
exactly the removal, zero additions, zero value changes.
Removed here: ref_image (dead promise — schema extra=forbid admits no such row, compose never read it).
