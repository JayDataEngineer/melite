# tools.json — regeneration causes

## 2026-09-05 — pilot stroke 2: anny body_glb goes optional (base-body autoload)

Same stroke as `form-spec_model_anny.json.d/causes.md`: the anny
card's `body_glb` File flips `required: True → False` with the
autoload-naming tooltip (design docs/design/anny-base-body.md).
DELIBERATE contract change, two hunks, both inside the `anny_card`
manifest: `params_schema.properties.body_glb.description` and
`params_schema.required` (`["body_glb"]` → `[]`).

Source: `plugins/engines/comfyui/action_cards/3d/anny/py/card.py`
via `tools/gen_tool_json.py` (the card class is the SSOT; the
`tool.json` snapshot regenerated in the same stroke).
Re-asserted from served `/v1/tools` on a scratch gateway (no live
restart); verified content-only against the previous golden (the
two anny hunks, nothing else).

## 2026-09-05 — the input lane boards (`input_prep_card` manifest)

Same stroke as `model-catalog.json.d/causes.md` (j): the new
`input-prep` card's `tool.json` snapshot (class SSOT via
`tools/gen_tool_json.py` — `params_schema` carries the one declared
`source` File) joins the served manifests (14 → 15). DELIBERATE
contract change, one hunk: the `input_prep_card` manifest in served
position, nothing else (verified: full-file diff shows only the
insertion).

## 2026-09-05 — three dead params pruned from the tool manifests (mod-audit stroke)

The /v1/tools rows derive params_schema from the card manifests; three
carried params the cards had just removed or never wired (live already
served without them — the manifests were inert restatements):

- `image_gen_card`: `preset` — the image-gen card's dormant Select
  (options: [], no serve path) removed this stroke.
- `music_card`: `negative_prompt`, `language`, `temperature`, `top_p` —
  the music card's four unwirable knobs removed this stroke (nothing
  in the lane reads them).
- `voice_lock_card`: `qvoice`, `voice_pca_strengths` — QvoiceMod
  descoped from the export family this stroke (consumption mod; rides
  qwen3-tts-base/qwen3-tts).

Manifests pruned in the same stroke; golden re-asserted from served
/v1/tools on a scratch gateway. Divergence set vs the old golden is
EXACTLY those seven params (verified per-tool before writing).

## 2026-09-05 — optional slots: reference_images default []

Same stroke as `form-spec_model_qwen-img-edit-2511.json.d/causes.md`:
the image_edit_card manifest's `reference_images` now serves
`default: []` (Field DSL list-default support, `py/melite_cards/
dsl.py`). image2/image3 carry `default: ""` on the card class — the
tool manifest's `!= ""` guard drops empty-string defaults (its own
longstanding convention), so they add no key here.

Design record: docs/design/image-edit-optional-slots-mask-mod.md.

## 2026-09-05 — button order: image_edit boards the loras + mask tile bags

Same stroke as
`form-spec_model_qwen-img-edit-2511.json.d/causes.md` (operator
order, verbatim: "THERE WAS A BUTTON WE HAD TO ADD [REDACTED 2026-11-05] MODS"
+ "THE LORAS DON'T MAP... RUNTIME VALIDATION"). The edit lane's
tool manifest gains exactly two `params_schema.properties`:
`loras` (array — the Mods button's lora tiles, resolved at the
compose door against the runtime catalog) and `mask` (the tile
bag the button writes; the compose flattens bag[0] onto the flat
lane wire). Content-only: 15 tools, order unchanged, every other
tool byte-identical. Re-asserted from served `/v1/tools` on a
scratch gateway (no live restart).
Walls: test_compose_gates (the loras door pins), test_http_parity.

## 2026-09-06 — img-to-mesh official-template alignment

img_to_mesh_card params_schema: cfg.default 3.0 -> 7.5 + the cfg /
resolution description rewrites (the card class flip). Three
surgical leaves, every other tool byte-identical, captured from
served /v1/tools on a scratch gateway.

## 2026-09-06 — img-to-mesh knob surfacing (12 new schema props)

img_to_mesh_card params_schema gains the 11 knob props + the steps
description reword. Entry replaced wholesale from served /v1/tools
(scratch gateway); every other tool untouched by this stroke — the
live image_edit/image_gen/music/video_gen drift is parallel
sessions' in-flight card work, left for their owners' regolds.



## 2026-09-05 — h3 knob rows go canonical (card-primitive sweep)

The h3-timeline card's last hand-rolled `Field(type='int'/'bool'/
'float')` rows migrate to the kit primitives (Seed/Number/Boolean —
docs/design/card-primitive-extraction.md). Served agent surface:
`h3_timeline_card` width/height/length/steps `integer → number`
(the estate's honest mapping: only Seed serves integer; seed itself
is byte-identical). Four surgical lines, every other tool
byte-identical; the live image_edit/image_gen/music/video_gen
defaults drift on the scratch gateway is parallel sessions'
in-flight card work, NOT swept into this regold.

## 2026-09-06 — img-to-mesh sampler lab (13 new schema props)

img_to_mesh_card params_schema gains the lab props (8 name
pickers with vocab-resolved enums + 5 guidance numbers). Entry
replaced wholesale from served /v1/tools; every other tool
untouched by this stroke.

## 2026-09-06 — cpp native boarding (4 new tools serve)

forge_card + quad_remesh_card + music_native_card +
text_to_motion_card join the manifest (the shared card walk now
sees plugins/engines/cpp/*). Entries inserted in served sort
order from served /v1/tools; every pre-existing tool
byte-identical (the live image_edit/image_gen/music/video_gen/
voice_lock drift stays out — parallel sessions' work).
input_prep_card serves live but is NOT swept in — its owner's
new card, their regold.

## 2026-09-05 — mask_studio export_* defaults string→bool (knob-defaults wall)
mask_studio card.py declared its five Boolean knobs with STRING
defaults (default='true'/'false') while schema.py carries real bools
— the compose-gates knob-defaults wall (the 2026-09-06
frontend-impossible class: untouched knob displays one value, runs
another) refused export_boxes 'true' != True. Card fixed to
default=True/False; this regold flips exactly those 5 served
lines, proven by name-keyed live diff (mask_studio_card: 0
remaining divergences).

## 2026-09-06 — cpp ggml kimodo lane retired (regold)

Operator order: wrap the NVIDIA python package — it was already
wrapped (melite-kimodo-nodes: KimodoLoader/KimodoTextToPose over
`kimodo` pkg, live-probed 2026-09-04); the cpp ggml port was the
SECOND implementation and died by the ONE-implementation rule.
The soma/smplx/g1 rows + the text-to-motion form + the
text_to_motion_card tool leave the served surfaces (the comfyui
kimodo row + motion_card remain). form-spec_model_soma.json
deleted with the lane.
