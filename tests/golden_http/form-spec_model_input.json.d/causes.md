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
