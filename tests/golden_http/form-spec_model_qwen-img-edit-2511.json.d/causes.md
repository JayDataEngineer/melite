# form-spec_model_qwen-img-edit-2511.json — regeneration causes

## 2026-09-05 — surgical options-vocab catch-up (object_info pin)

Same `_option_list` fix as `form-spec_model_krea-2.json.d/causes.md`
(the exec namespace now carries the plugin file location, so the
comfyui pin vocab loads instead of serving `[]`). This golden is NOT
parity-pinned and carries its owning lane's unrelated drift (the
image-edit rework is mid-flight) — so the stroke does NOT
wholesale-regold it (that would absorb another lane's work).
SURGICAL patch: the 4 sampler/scheduler `options` lists (flat +
schema_groups mirror) set to the pin vocab, file bytes otherwise
untouched (verified: full-file leaf diff shows 42 divergences, every
one under an `options` list — nothing else). The lane's other drift
stays its lane's business.

## 2026-09-05 — optional slots + the mask is a MOD

Operator orders, verbatim: "image 2 and 3 are optional... user doesn't
have to put it in" and "INPUT MASK again... is A MOD it's not
cluttering the main inputs". Three deliberate changes:

- `fields[].default` — `reference_images` now serves `default: []`
  (was absent). The Field DSL's `default` accepts lists
  (`python/melite_cards/dsl.py` — `_num_or_str` passes sequences
  verbatim, never str()-collapsed). image2/image3 serve `default: ""`
  on the FAMILY CONTRACT only (the form-spec's flat list drops
  empty-string defaults by its own convention — `!= ""` guard).
- `schema_groups[].zone` — the `mask` group serves `zone: "mods"`
  (MaskMod already declared it; the wire now carries it so the
  editor's Mods zone renders the section).
- The slot vocabulary (`/v1/model-catalog input_vocabulary`)
  `model_slots["qwen-img-edit-2511"]` = `["image2", "image3",
  "input_image"]` — `input_mask` is GONE from the main Inputs grid
  (catalog `_emit` skips mods-zone binary fields).

Design record: docs/design/image-edit-optional-slots-mask-mod.md.
Walls: tests/walls/suites/test_python_cards.py (image-edit slot
walls), tests/unit/packages/test_card_param_gates.py (null law).

## 2026-09-05 — button order: loras door + mask tile bag join the card surface

Operator order, verbatim: "THERE WAS A BUTTON WE HAD TO ADD [REDACTED 2026-11-05]
MODS... YOU ADDED A MENU, I DIDN'T WANT THAT" + "THE LORAS DON'T MAP,
I DON'T SEE MY KREA2 LORAS... RUNTIME VALIDATION". The menu sections
are deleted; the edit lane boards the loras channel and the mask as
an addable tile kind. Four deliberate hunks, all class-driven:

- `fields` 35 → 37: `loras` (type `loras`, group
  `loras_controlnet`) + `mask` (type `mask`, group `mask`,
  order -1 — the tile anchor) join the card surface (the card
  absorbs its mods' bag fields; the Mods button writes
  `params.loras` / `params.mask`).
- `schema_groups` += `loras_controlnet` (order 6, zone `mods` —
  the absorbed loras bag's group); the `mask` group moves
  order 6 → 7 and its field list gains the `mask` bag anchor at
  position 0 (sparse group-field shape: name/type/label/order/
  tooltip — no `group` key, matching its siblings).
- The menu-era `zone: "mods"` mask section is unchanged in shape
  (the group still exists for the flat lane wire); only its
  membership grows by the bag anchor.

Source: `python/melite_cards/dsl.py` (the `Mask` field type),
`packages/engines/comfyui/models/image/qwen-img-edit-2511/mods/
{loras,lanpaint}.py` + `model.py` (the boarded packs),
`packages/engines/comfyui/action_cards/image/image-edit/python/
{card,schema,compose,renderer}.py` (admission + the runtime-catalog
door + the LoraLoaderModelOnly stack). Regenerated from the class
fragment (`field_spec` projected through the `FormFieldRow` atom —
order-aligned, content-only), NOT hand-edited.
Walls: test_python_cards (fragment parity + the
`{lanpaint,loras,mask}` packs pin), test_compose_gates (the
36-key plain pin + the firing rows).

## 2026-09-06 — lane defaults declared on the card (frontend-impossible stroke)

`width`/`height`/`steps`/`cfg`/`use_stock_nodes`/`double_reference`
carried no card default (form seeded `""`, click gate refused
`""→null` as "null but has no default" while the backend row
defaults it). The card now declares the lane values
(1024 / 1024 / 4 / 1.0 / false / false, each == `ImageEditParams`,
wall-pinned); the golden's deltas are those `fields[].default` +
`schema_groups` entries ONLY (`features.modifiers` is NOT touched —
the model's in-flight mod row is its owner's regold). Verified: file
is leaf-identical to the live serve except that pre-existing
modifiers hunk.

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

- 2026-09-06: fields regolded from the card CLASS (the SSOT) — the 2026-09-06 image-edit/video-gen/upscale-tools card rework (input_image->image1, visible_when relaxation, field count changes) landed with the classes but the goldens lagged; served==fragment verified before write.

## 2026-09-07 — Cordis card 3 HOLD (do NOT regold yet)

The migration tried to parity-pin this golden and found live-vs-golden
drift that is the owning lane's in-flight rework, not contract lag:

- `defaults`: golden carries `width`/`height` = 1024 + `steps` = 8;
  live serves neither resolution default and `steps` = 4.
- `variants[]`: labels/hints reworded (Lightning is now the 4-step
  distilled default path).
- `features.modifiers`: live carries the runtime-catalog LoRA packs;
  the golden has none.

Per this file's own convention (surgical-only while the rework is
mid-flight) the pin was REVERTED, not regolded — absorbing 350+
leaves of another lane's unfinished work into contract would be
exactly the drift class the goldens exist to catch. Regold belongs
to the lane owner when the rework lands. (Cordis lane-flag: image-edit
is HANDS-OFF until then.)
