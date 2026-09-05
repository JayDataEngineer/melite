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

