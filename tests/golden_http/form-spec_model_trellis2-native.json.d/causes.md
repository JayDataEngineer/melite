# form-spec_model_trellis2-native.json — causes

## 2026-09-06 — official-template alignment (cfg 7.5 default, NEW causes file)

This golden never had a .d/ entry; the first regold opens it. Same
stroke as the pixal3d / transfer_rig form-specs: the card cfg default
flips 3.0 -> 7.5 (the official Comfy-Org 3d_pixal3d_trellis2 template
calibration) with the cfg/resolution tooltip rewrites. Surgical
leaves: fields[cfg].default, fields[cfg].tooltip,
fields[resolution].tooltip (+ the schema_groups mirror). File format
preserved (indent=1, literal UTF-8, trailing newline); values merged
in place from field_spec over the card class, never hand-typed.

## 2026-09-06 — surface the hidden parameters (11 knobs, 3 sidebar sections)

Operator: show more parameters on the action card, Anny-sidebar style
(groups, not one long rail). The official template calibrations the
renderer hardcoded become card knobs: Stage (shape_steps/shape_cfg/
tex1_steps/tex1_cfg/tex2_steps/tex2_cfg), Mesh (remesh_resolution/
decimate_faces/smooth_angle), Bake (atlas_size/ao_size/normal_size)
— families-scoped to the lift arms, so transfer_rig takes only the
shared steps-tooltip reword. The groups render as their own sidebar
sections (input/generation/stage/mesh/bake/output — the schema_groups
order); no frontend change (sections derive from group= attrs).
Also fixes a missed leaf from the alignment stroke: defaults.cfg
stays 3.0-string in this fragment while the class moved to 7.5.
Renderer + compose + docs + both models' defaults rows move with
the knobs (end-to-end wall: official_parity 9 tests). Values merged
from served field_spec over the card class, order-preserving, file
format preserved.

## 2026-09-06 — sampler lab (13 knobs, Lab sidebar section)

Operator: expose the remaining sampler table too, on its own
sub-menu. Per-stage sampler/scheduler pickers (structure/shape/
tex1/tex2 — officials euler + normal/normal/simple/normal) with
options resolving from the engine vocabulary (VocabRef, the
image-gen sampling precedent — no hand-copied lists; schema
validators refuse unknown names, empty rides the per-stage
official in compose) plus SD3 shift (5.0), the two RescaleCFG
multipliers (0.7/0.5 — shape arm feeds texture pass 1, one node),
and the two CFGOverride start percents (0.667/0.769). Lab group
sits between Bake and Output. Renderer + compose + docs + model
defaults move with the knobs (end-to-end wall: official_parity
10 tests). Values merged from served field_spec, order-preserving.


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

## 2026-09-07 — OUTPUT-CONTRACT + defaults-blanket stroke (operator order "fill ALL the gaps")

Regenerated from the live served body. Two change classes, both
deliberate: (a) DENSITY — the served rows are now dense
FormFieldRow.model_dump() rows (the 2026-09-05 post-regen shape the
older sparse 3D goldens predated); verified field-by-field that no
shared-key value changed. (b) one field REMOVED per file (see below) —
a dead-promise deletion, not drift. Semantic diff old-vs-new names
exactly the removal, zero additions, zero value changes.
Removed here: filename_prefix (09-06 sweep fossil — the run owns output names; card field + trellis2-native model default died).
