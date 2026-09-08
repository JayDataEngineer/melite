# form-spec_model_z-image.json — regeneration causes

## 2026-09-05 — the options vocab actually loads (object_info pin)

Same stroke as `form-spec_model_krea-2.json.d/causes.md` (shared
image-gen card surface): `_option_list` now execs the engine
`plugin.py` with its file location, so the `samplers`/`schedulers`
vocab loads from the declared object_info pin instead of serving
`[]`. DELIBERATE contract change, options ONLY (verified: full-file
leaf diff shows 42 divergences, every one under a
sampler/scheduler `options` list — sampler 12 → 45 pin entries,
scheduler same 9 values in pin order, nothing else).
Re-asserted from served `/v1/form-spec?model=z-image` on a scratch
gateway (no live restart).

## 2026-09-05 — the dormant `preset` field removed (mod-audit follow-up)

The image-gen card's `preset` Select (families=["z-image"] only)
served `options: []` permanently: no serve path reads the model's
presets/ dir, no frontend sender exists, and ImageGenParams refuses
the key — a knob that could ONLY 400. Removed from the card in the
same stroke; the golden drops its two rows (field + group member,
surgical edit — the options-vocab state above is untouched).
If the quick-reference UI is ever wanted it belongs in
spec.variants[] (the live PresetGroup mechanism), never a wire
param.

## 2026-09-05 (same day, later) — surgical edit superseded by wholesale regold

The surgical preset-drop fought cascade renumbering (group `order`
renumbers, and the golden still carried the 12-entry sampler list the
options-pin stroke recorded but never executed for these two models).
Both goldens re-asserted WHOLESALE from served `/v1/form-spec` on a
scratch gateway. The full divergence set vs HEAD, all stroke-explained:

- `preset` field + `preset` schema group gone (card removal above).
- remaining group `order` values renumbered (mechanical consequence).
- sampler options 12 -> 45, scheduler options re-pinned — the SAME
  object_info-pin contract change krea-2 recorded; z-image/anima were
  recorded in the options stroke's causes but the regold itself never
  executed for them. Executed here.

Live parity: PASS (tools/anny excepted — other lanes).

## 2026-09-06 — lane defaults declared on the card (frontend-impossible stroke)

Same incident class as krea-2 (image-gen card now declares
1024 / 1024 / 8 / 4.5, each == `ImageGenParams`, wall-pinned); the
golden's deltas are those `fields[].default` + `schema_groups`
entries only. Verified: patched file is leaf-identical to the live
`/v1/form-spec?model=z-image` serve.

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
Mode for THIS file: WHOLESALE regold (parity-pinned route —
the golden must equal the live wire byte-for-byte; verified zero
leaf divergences old→new outside the causes below).
Also absorbed here: the image-gen card's
`negative_prompt.visible_when` removal (a parallel session's card
cleanup, live in the tree — `fields[1]`/`schema_groups[0].fields[1]`
drop the key). Separate cause, same bytes; recorded so the next
reader does not attribute it to the recipe stroke.
