# form-spec_model_pixal3d.json — birth causes

## 2026-09-05 — pixal3d boards img-to-mesh (NEW golden)

Pixal3D joins the img-to-mesh card as the pixel-aligned hero tier
(design docs/design/img-to-mesh-pixal3d-boarding.md; operator order:
ComfyUI ships Pixal3D natively like TRELLIS, board it as the
trellis2-native alternative). This golden pins the pixal3d fragment:
the shared lift fields (input_image/seed/resolution/steps/cfg/bg_removal/
filename_prefix) PLUS the pixal3d-only camera_fov knob (auto =
MoGe-estimated FoV, or a literal degree skipping MoGe) — scoped via
families=["pixal3d"] so the trellis2-native and transfer_rig
fragments are byte-identical to before (verified: their parity checks
still pass against untouched goldens).

Generated from the served fragment (field_spec over the card class,
service="pixal3d" — the served value _card_spec returns for this
family), not hand-typed. Sibling format (indent=2, literal UTF-8,
trailing newline).

## 2026-09-06 — official-template alignment (cfg 7.5 default)

The lane rendered the official Comfy-Org 3d_pixal3d_trellis2 template
at cfg 3.0 out of the box — under half the calibrated structure
guidance, blobby trash (operator run + template study:
templates/3d_pixal3d_trellis2_image_to_model.json). The card cfg
default flips 3.0 -> 7.5 (the template calibration; the wire schema,
both models' defaults rows, and the served tools schema move with
it) and both tooltips are rewritten to state the official behavior.
Surgical leaves: fields[cfg].default, fields[cfg].tooltip,
fields[resolution].tooltip (+ the schema_groups mirror).
Renderer-side the same stroke boards the full template chain (dual
CFGOverride arms, unconditional upsample, two-pass texture, remesh
tail, 4096 bakes, MoGe 2, NAF DINO for both arms) — pinned by
tests/walls/suites/test_img_to_mesh_official_parity.py (7 tests).
Design record: docs/design/img-to-mesh-pixal3d-boarding.md.

## 2026-09-06 — surface the hidden parameters (11 knobs, 3 sidebar sections)

Same stroke as the trellis fragment: the 11 Stage/Mesh/Bake knobs
land in fields + three new schema_groups (stage/mesh/bake between
generation and output), plus the shared steps-tooltip reword.
Fragment stays fragment-only (birth shape); format preserved
(indent=2, literal UTF-8, trailing newline).

## 2026-09-06 — sampler lab (13 knobs, Lab sidebar section)

Same stroke as the trellis fragment. Per-stage sampler/scheduler pickers (structure/shape/
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



