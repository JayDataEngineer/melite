# form-spec_model_krea-2.json — regeneration causes

## 2026-09-05 — the options vocab actually loads (object_info pin)

`python/editor_forms.py::_option_list` exec'd the engine's `plugin.py`
with a BARE namespace — no `__file__` — so the comfyui `Plugin`
class body (which derives `samplers`/`schedulers` from the
`object_info.json` pin at class-definition time, the declared SSOT
since the validated-row sweep) ALWAYS raised `NameError`, swallowed
by the `except: pass`, and every `$samplers`/`$schedulers` field
served `options: []`. The golden still pinned the C-era 12-sampler
hand list, so parity failed both ways (stale golden AND empty wire).

The fix (same stroke): the exec namespace carries the plugin file's
absolute path, so path-derived pins resolve. DELIBERATE contract
change, options ONLY (verified: full-file leaf diff old→new shows
42 divergences, every one under a sampler/scheduler `options` list —
nothing else):

- `sampler` options: the 12-entry hand list → the 45-entry pin
  (sorted KSampler `sampler_name` vocab — `res_multistep` and kin
  are legal values again, the exact lag the pin flip was built for);
- `scheduler` options: same 9 values, pin (sorted) order.

Source: `packages/engines/comfyui/plugin.py::_pin_vocab` via
`python/editor_forms.py::_option_list` (the class/table is the SSOT;
this golden pins its served emission).
Re-asserted from served `/v1/form-spec?model=krea-2` on a scratch
gateway (no live restart).

## 2026-09-05 (later still) — recipe rows + lora catalog options served

"Write it up cleanly, with pydantic classes" — the one-click LoRA
recipe lands as a patch-only Variant row:

- `variants` 3 -> 4: the `realism` row (group Recipe, route "" =
  patch-only, defaults = the loras pick; strength deliberately absent
  — the compose door derives 0.7 from the LoraRow, rung 6).
- `variant_groups`: the family's DECLARED VariantGroup rows now serve
  (was hardcoded Variant/Quant — declared tooltips starved); adds
  `Recipe` + the tooltips.
- `modifiers[0]` (loras): `options` 0 -> 12 — the family's LoraRow
  catalog IS the picker's options (value=id, label, tooltip =
  category + filename, defaults.strength from the row); a family
  WITH rows serves `declaration_only: false`.

The same-turn sampler/scheduler options rows above (12->45 pin) are
the earlier options stroke, recorded separately above.

Walls: test_compose_gates.py — test_recipe_picks_resolve_in_their_
catalogs, test_recipe_realism_auto_loads_the_lora, test_recipe_
unknown_pick_refuses_at_the_door, test_recipe_serves_patch_only_on_
the_wire.

## 2026-09-06 — lane defaults declared on the card (frontend-impossible stroke)

`width`/`height`/`steps`/`cfg` carried no card default (same
incident class as music3: untouched knobs 400'd at the click while
the backend row defaults them). The card now declares
1024 / 1024 / 8 / 4.5 (each == `ImageGenParams`, wall-pinned); the
golden's deltas are those `fields[].default` + `schema_groups`
entries only. Verified: patched file is leaf-identical to the live
`/v1/form-spec?model=krea-2` serve.

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
