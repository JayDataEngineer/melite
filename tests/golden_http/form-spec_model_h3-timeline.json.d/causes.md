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
