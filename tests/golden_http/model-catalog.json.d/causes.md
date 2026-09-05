# model-catalog golden — regeneration causes

## 2026-09-05 (f) — full regold from served (rework fallout lands)

The C-retirement wire-fossil purge deleted the frozen `loras: []`
from the row emitter (model_row no longer emits the key — a model
with no declared pack carries no loras member at all; the DECLARED
pack, when present, is served by the /v1/loras door from the
family's LorasMod rows, never as a models-row fossil), but the
golden kept 56 stale `loras: []` keys. Served rows carry NO loras
member (verified live across all models); the keys are stripped
here so the golden pins the purged wire. Surfaced by the models
wall's golden-row parity (which compares model_row output against
this golden exactly).

FULL REGOLD, same stroke: a concurrent worker rewrote this file
mid-session (near-revert to HEAD + a correct families.anny.studio
addition), which resurrected 23 served divergences — the retired
`img-edit` family/model rows, the image-edit capability/card nodes
still naming the two-family era, the stale qwen row (description,
has_agent, has_inference), the unoffered stubs back in
models/families (basic_resize, ltx-2-3, ltx-director-distilled,
pixel_upscale — they serve no row under the offering law), and the
missing input_vocabulary form_slots/model_slots (the no-drop law).
Re-asserted from served /v1/model-catalog (recipe: indent=2,
sort_keys=True, ensure_ascii=True + trailing newline — verified
zero-reorder against the file, so the diff is content-only; the
anny.studio hunk survives verbatim, byte-identical to served).

NOTE for the next auditor: the HTTP parity suite passed at least
once while this golden carried stale keys — the models wall and
the parity deep-compare covered different states of this file
across concurrent edits; do not assume either covers the other.
Coordinate regolds, don't stack them.

(Bundled, other worker, same file: `families.anny.studio` — the
studio-tenant claim the scan emits for models declaring studio:;
verified byte-identical to served. Separate cause, same stroke.)

## 2026-09-05 (e) — NEW GOLDEN loras_krea-2.json (the /v1/loras door)

The door LoraPicker always fetched (`GET /v1/loras?model=…`) never
existed in the py gateway — the mods flip migrated the lora DATA
(LoraRow rows on the family's LorasMod) but forgot the DOOR, so the
picker showed "No LoRAs installed" over 12 declared adapters. The
door now serves the DECLARED pack verbatim (filenames in declaration
order, meta keyed by file stem, note naming the pack) — class rows,
never a disk scrape. This golden pins krea-2's pack (12 rows, the
Raw-variant training set). Route table: 39 → 40.

## 2026-09-05 (c) — OFFERING LAW + wire fossil purge (the ltx-2-3 incident)

The webui catalog contract caught at runtime what every backend gate
let through: `Model ltx-2-3 is missing required key(s) form`. Root
cause: the 2026-09-05 "offered means runnable" cohort (basic_resize,
ltx-2-3, ltx-director-distilled, pixel_upscale) used `form = ''` as
its unoffered marker, and the row emitter's truthiness guard silently
dropped the key — a stringly hack three layers deep (bare class attr,
permissive schema, conditional emission). DELIBERATE contract change,
four causes:

1. OFFERING ⊕ UNOFFERED is now a CONSTRUCTION refusal
   (melite_models grammar): offered (`form = "…"`, required non-empty
   on the wire row) or unoffered (`unoffered = True`) — exactly one
   door, never `form = ''`. The four unoffered classes flipped.
2. The catalog serves ONLY offered models: the scan skips unoffered
   classes — the four families leave `models` and `families` (56 → 52
   rows). They return when their lanes board.
3. `models[].loras` is deleted from the wire row: a frozen `[]` no
   consumer read (the picker fetches /v1/loras). ModelRow drops the
   field.
4. `wire_route`/`wire_vram` are purged (Cell schema + 5 declarers +
   emission): quant rows now carry their TRUE cell route and vram —
   the faithful-bug port (quant rows lying with the model route /
   vram 0) was a routing fossil, not a format rule.

Also this stroke: catalog.py's dead C-port machinery (the yaml parsers,
the server.cpp splice twins, the parity _model_row) is deleted — the
module is THE catalog, the goldens are the estate's own contract pin.

## 2026-09-05 (d) — form-spec goldens refreshed

The FormSpecRow gate + earlier 2026-09-05 boarding strokes regenerated
only the parity-pinned goldens (krea-2, z-image, anima, h3-timeline,
music3). The unpinned form-spec goldens (anny, kimodo, mask-studio,
moss-sfx, qwen3-tts trio, scail2-animate, seedvr2_ema, transfer_rig,
wan-vace) were stale orphans; all refreshed to the current gated
emission. The wire-purge models (z-image, qwen-img-edit-2511,
trellis2-native) additionally gain true quant-row routes/vram.

## 2026-09-05 — h3-timeline writes contract: lora surface admitted

The studio.writes allowlist (E4 contract: observed ⊆ declared) gains
`lora_name` + `lora_strength` — the wire surface the LoraStack
pattern primitive reads (chain.LoraStack.from_wire; lane data in
models/video/h3-timeline/lora_stack.yaml). DELIBERATE contract
extension, not drift: the keys were previously unadmitted dead wire.

## 2026-09-05 (b) — writes gains `seam_carry`

Body-level seam_carry is a wire surface the window compiler reads
(resolve_carry; 0 = hard cut, otherwise int in [1, 64] — a door law
now). Same E4 justification as the lora keys.

## 2026-09-02 — models-as-python full flip (naming law normalization)

All 53 units serve from model.py classes; model.yaml + variant.yaml are
extinct tree-wide. This regen is DELIBERATE, three documented causes:

1. ID NORMALIZATION (naming law: dir name IS the id). The yaml era
   keyed rows by the yaml family.id, which aliased: 6 ace-step* dirs
   collapsed into one `ace_step` key (last-scan-row-wins), 7 qwen3-tts*
   into `qwen3_tts`, music3+txt2music into `minimax_music3`. Post-flip
   every unit serves its dir id — the catalog id now MATCHES the run
   door for the first time (catalog said minimax_music3 while the run
   door said music3).
2. BRIDGE ROWS. The 4 comfyui-side stanza-less bridge copies
   (ace-step, moss-sfx, moss-tts, qwen3-tts) previously won the
   models{} map by last-scan-wins, serving engine:"" rows. Declarers
   (audio-cpp) now own the units; their rows carry engine audio_cpp.
3. STRAGGLERS. The 4 id-less never-served units (sam3,
   seedvr2-video, spatial-ksampler, wan-vace-director) kept model.yaml
   but no family id — still absent from the catalog, unchanged.

46 collapsed keys before → 53 unit rows after.

## 2026-09-02 (same day, second regen) — studio meta restored

The first regen of the flip accidentally captured the h3-timeline
studio claim as missing (the catalog meta adapter lagged the class
attr by minutes). Fixed: families.h3-timeline.studio serves again,
matching the pre-flip golden. No other delta.

## 2026-09-05 (f) — input_vocabulary gains form_slots / model_slots (no-drop fix)

The anny card (and any card declaring File/Image/Audio/Video inputs)
rendered with NO slot squares: the served `input_vocabulary` carried
ONLY the global slot_kinds, never the per-form/per-model slot list
the card class declared. The frontend's SlotGrid reads
`form_slots[form]` / `model_slots[model_route]` and fell back to an
empty render — the silent default-card class (the viewer-audit
"[REDACTED 2026-11-05] default card" report).

`py/slot_kinds.py` now carries a typed `FormSlotBinding` /
`FormSlotVocabulary` (pydantic, frozen, extra=forbid, cross-row
uniqueness); `py/catalog.py` derives the bindings from each card
class's `File`/`Image`/`Audio`/`Video` field declarations during
`scan_catalog` and `to_json` injects them. The no-drop invariant
(declared File fields ⊆ served form_slots/model_slots) is pinned
by `test_python_cards.py` WALL 7. Kinds: known global-vocab names
keep their kind (source_image → image); unknown names default to
"any" (honest, permissive in canWireSlot — never a lie).

The `_BINARY_FIELD_TYPES` filters in `py/melite_cards/serialize.py`
and `py/editor_forms.py` (the flat-fields drops) are deleted in the
same stroke — the card spec now carries every declared field in the
flat list too (schema_groups keeps the grouping on top). Wire shape
change; this golden is the only consumer; goldens for the other
form-spec models (krea-2, z-image, anima, h3-timeline, music3) are
unaffected (none declare File fields).

Bundled in this regold (same stroke, not separate causes): the golden
had drifted from the live tree — the img-edit → qwen-img-edit-2511
family rename, removed/added model rows, and updated card/capability
descriptions all landed here together. The golden pins the live wire;
the wire is the tree's truth.

## 2026-09-05 (g) — anny claims its studio (the silent-default-card fix)

The anny card served the DEFAULT schema form with zero errors: the
Anny model declared no Studio row ("the FORM surface"), so
`studioOf('anny')` returned undefined — a LEGAL fall-through — and
`getCardStudio` handed the shell the schema form. No refusal fired
because a missing studio is a legal state; the wall that should have
pinned "anny renders custom" didn't exist. Worse, the shared Stage
viewport (the Trellis/Anny/Kimodo "render the same" order) had zero
production mounters — tested by stage-loop-probe, mounted by nobody.

This stroke, all three halves of the claim (the notch wall
`test_python_cards.py` enforces both directions — a tenant without
`layout="studio"` on the card fails LOUD, as it did mid-stroke):
1. `models/3d/anny/model.py` gains `studio = Studio(tenant='3d/anny',
   owns_params=False, writes=(body_glb, hair_glb, outfit_glb,
   source_image))` — the kimodo shape (the body authors PARTS, the
   card composes; turnaround knobs ride the Node inputs fold).
2. `action_cards/3d/anny/ui/studio/component.tsx` (new) — the tenant:
   four part-slot subcards in the rail (SlotGrid contract) + the
   shared Stage in the viewport. Mount paths get explicit per-part
   notes, never doomed loader URLs.
3. `action_cards/3d/anny/py/card.py` declares `layout = 'studio'`.
4. `Stage.tsx` gains optional `onAssetError(id, message|null)` —
   the red-wireframe-box silence is over; failures ride to the
   caller as DOM text. Stability law intact (stage-loop-probe green).

Surgical regold: ONLY `families.anny.studio` added to this golden
(verified single-key delta served-vs-golden; a wholesale redump was
reverted — it dragged parallel-session drift). The companion
`form-spec_model_anny.json` regold carries `"layout": "studio"`.
NOT bundled: the live `capabilities.image-edit` rename drift is a
parallel session's in-flight work — left failing LOUD for its owner.

## 2026-09-06 — img-to-mesh knob surfacing (12 new defaults per lift model)

trellis2-native.defaults + pixal3d.defaults gain the 11 knob rows
(shape/tex1/tex2 steps+cfg, remesh/decimate/smooth, atlas/ao/normal)
slotted in model-dict order after cfg. One-line diff (compact
golden); served-verified, no other model moves.


## 2026-09-06 — img-to-mesh official-template alignment

models.trellis2-native.defaults.cfg + models.pixal3d.defaults.cfg:
3.0 -> 7.5 (the official template calibration — the card default
out of the box; nothing else in the catalog moves). One-line diff
(compact golden, round-trip-verified dump settings).


## 2026-09-05 (h) — the generic abstraction: trellis2-native claims its studio (Anny rebased onto the shared body)
The user's order: shared components and layouts, not per-card
hand-rolls — Trellis rode the default form, Anny carried a bespoke
~380-line body. Now ONE body (`3d/ui/studios/assembly.tsx` — the
generic AssemblyStudio: part-slot rail + shared Stage + loud errors,
exported as `@melite-plugin/3d/ui/studios/assembly`); Anny and
Trellis are slot-table DECLARATIONS over it (ANNY_SLOTS /
TRELLIS_SLOTS consts). Kimodo stays bespoke (its file is under
parallel churn) but the generic exports rail/assets/error pieces
separately (PartSlot / useStudioAssets / StudioErrorLine) for a
one-import adoption — viewer-agnostic by construction.
PURE PYTHON teeth (compile-time errors, per the order):
`StudioKind` enum (custom|assembly — rung 3) + model_validator on
`Studio` (assembly without writes, or with owns_params=True,
refuses AT CONSTRUCTION — proven by direct construction probes).
The kind never rides the wire (the catalog emitter is
field-by-field; untouched); the walls read it from source.
Walls (all in the previously-clean `test_studio_slots.py`):
kind⟺body parity (assembly ⟺ generic import — negative-proven both
directions) + slot-table parity (every slot key ⊆ the card's
File/Image fields ∩ the family's studio.writes — a bogus key
refuses). The pre-existing phantom/orphan pins cover the trellis
claim automatically (tenant `3d/img_to_mesh` = the CARD DIR —
the glob id rule, underscores and all).
This stroke: `StudioKind` in grammar.py; kind=assembly on anny +
trellis2-native; `layout='studio'` on img-to-mesh; two thin tenants;
`trellis-studio.test.tsx` (the second adopter pin).
Surgical regolds: ONLY `families.trellis2-native.studio` here and
`"layout": "studio"` in `form-spec_model_trellis2-native.json`.

## 2026-09-05 (i) — DRY follow-up: one import edge, one test harness, one kind spelling
The operator's cruft sense was right — the abstraction stroke left
three second ways, all removed here, no new behavior:
1. Tenants imported the generic through the package edge
   (@melite-plugin/3d/ui/studios/assembly + a new exports-map line)
   while EVERY sibling tenant (audio/motion/video/mesh) imports
   relatively — and the edge had zero other consumers. Both tenants
   now import ../../../ui/studios/assembly like Anny originally did;
   the exports-map line is reverted (the file nets to its pre-stroke
   bytes). One surface: the file on disk.
2. anny-studio + trellis-studio tests were 140-line mirrors. Now
   assembly-tenant-shared.tsx owns the mock rig, the glob pin, the
   empty state and the FAIL alert; tenant files are descriptors +
   their own extras (servable-part/mount-note for Anny, run-mesh
   for Trellis). Third adopter adds ~15 lines.
3. The kind wall accepted kind='assembly' alongside
   StudioKind.ASSEMBLY (pydantic coerces either — two spellings, one
   claim). The wall now recognizes the enum form ONLY; the shared
   tenant loop is factored into _claimed_tenants.
Left as-is, deliberately: card layout='studio' stays stringly (the
dsl.py notch predates this work, h3 sets the precedent, and the
third adopter file is under parallel churn — unifying the notch
vocabulary is a coordinated order, not a drive-by); ray-card-deck
vs @melite-plugin/dsh-card-deck is the ssh package/id pattern, and
ray- is the live product name, not C ancestry; bespoke bodies stay
bespoke (StudioKind.custom is taxonomy — a video timeline can never
be a part-slot assembly).
- 2026-09-05 (anny DESCOPE, operator order verbatim: "on ANNY we don't
  need the hair or outfit right now... later we will make a NEW action
  card where we can put trellis clothing on"): hair_glb/outfit_glb left
  the anny card — families.anny.studio.writes is now
  [body_glb, source_image]. Same regold sweeps the input_vocabulary
  catch-up to the committed slot_kinds evolution (slots + slot_kinds
  rows replacing the form_slots/model_maps shape) the stale golden had
  missed — tree truth at regold time.

## 2026-09-05 (j) — the input lane boards (`input` → `input-prep`)

The `input` model resolves (engine `comfyui`, card `input-prep`;
design docs/design/input-prep-boarding.md): operator report verbatim
"Input cards don't accept image files". DELIBERATE contract change,
purely additive (keyed diff old→new: nothing removed, nothing altered
except `models.input.engine` `""` → `"comfyui"`):

- `capabilities` gains `input-prep` (families `["input"]`);
- `cards` gains the `input-prep` row (18 → 19);
- `input_vocabulary.form_slots` gains `form_input: ["source"]` and
  `model_slots` gains `input: ["source"]` (the card's declared `source`
  File — image OR audio, hence File, not Image).

Re-asserted from served `/v1/model-catalog` on a scratch gateway (no
live restart); verified additive-only against the previous golden.

## 2026-09-06 — img-to-mesh sampler lab (13 new defaults per lift model)

trellis2-native.defaults + pixal3d.defaults gain the lab rows
(8 sampler/scheduler names + sd3_shift + 2 rescale multipliers +
2 override percents), slotted in model-dict order. One-line diff
(compact golden); served-verified, no other model moves.

(j2, same day — fossil purge inside the new row): the boarded class
first shipped with `description='>-'` (a yaml-folding fossil from
the generator) and `defaults` naming no card field (`media_type`,
`filename_prefix`, `output_artifact` — consumed by NOTHING; the arm
derives everything off the validated doc). The cross-validation law
(`validate_against_cards`: every default names a field on the owning
card) refused the row LOUD — the operator's compile-time order
working as designed. Class now carries a real description and
`defaults = dict()` (the lane takes NO model-level knobs); the
golden's `models.input` row patched surgically to match (verified:
old→new diff on that row is exactly description + defaults).

## 2026-09-05 (k) — pixal3d boards img-to-mesh (surgical leaves)

Pixal3D joins the img-to-mesh card (design
docs/design/img-to-mesh-pixal3d-boarding.md). Six leaves overlaid from
the live scan — every other divergence left for its owner (anny
writes, image-edit/tts vocab are other sessions in-flight work):

- capabilities.img-to-mesh: description (new card text) + families
  2 -> 3 (+pixal3d);
- cards img-to-mesh row: same two leaves;
- families.pixal3d: full row incl. the new studio tenant
  (3d/img_to_mesh, owns_params false);
- input_vocabulary: form_3d_pixal3d + model pixal3d slots;
- models.pixal3d: engine "" -> "comfyui", real description (the >-
  yaml-folding fossil is gone), defaults gains camera_fov=auto and
  drops the consumed-by-nothing texture_size fossil (cross-validation
  law: every default names a card field).

Verified: post-patch live-vs-golden diff shows ONLY the seven foreign
leaves (anny x1, image-edit x2, tts x4).

## 2026-09-06 — the 3D card boards ONE form (Model dropdown fix)

Operator order: the visual image-to-3D card showed no model picker.
Root cause: the card Model dropdown groups by catalog form tag
(flowParamEditor -> dropdownModels(form)), and trellis2-native /
Pixal3D / transfer_rig each boarded their OWN tag — a one-head list
renders NO Model zone (AxisRows skips empty: modelOpts.length > 1).
All three models now board form_img_to_mesh (model.py form fields;
comments mark the shared tag); the backend FormSlotVocabulary already
blesses multi-model forms (qwen3-tts precedent) — the three identical
form_slots rows merged into one, model_slots rows untouched (the
model-level vocabulary wins per cardSlotsFor). Surgical leaves:
models.{trellis2-native,Pixal3d,transfer_rig}.form + the form_slots
merge. Behavioral pin: model-catalog.test.ts THREE_D_CARD
(dropdownModels -> 3 heads, familiesForForm -> 3 families).

## 2026-09-06 — cpp native boarding (music tile ownership)

Operator order: ComfyUI keeps 'music'. The native audio-cpp card
is renamed music -> music-native (card id + compose dispatch key +
3 model rows; graph-internal node_id untouched), so served
capabilities.music falls back to the ComfyUI tile (music3) and a
new music-native tile (ace-step-xl) appears beside it. DELIBERATE
contract change: HEAD pinned native-owns-music (the catalog scan
saw cpp cards long before the tools walk did — last-wins). Pinned
by tests/walls/suites/test_cpp_native_cards.py (fork checks).
Follow-up: golden cards[16] was the stale audio-cpp row under the
old 'music' id — replaced positionally with the served
music-native row (id-only diff; neighbors' rows untouched).
