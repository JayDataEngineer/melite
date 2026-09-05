# form-spec_model_krea-2-raw.json — regeneration causes

## 2026-09-05 — the options vocab actually loads (object_info pin)

Same stroke as `form-spec_model_krea-2.json.d/causes.md` (the krea-2
route serves through this variant address): `_option_list` now execs
the engine `plugin.py` with its file location, so the
`samplers`/`schedulers` vocab loads from the declared object_info
pin instead of serving `[]`. DELIBERATE contract change, options
ONLY (verified: full-file leaf diff shows 42 divergences, every one
under a sampler/scheduler `options` list — sampler 12 → 45 pin
entries, scheduler same 9 values in pin order, nothing else).
Re-asserted from served `/v1/form-spec?model=krea-2-raw` on a
scratch gateway (no live restart).

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

Same incident class as krea-2 (image-gen card now declares
1024 / 1024 / 8 / 4.5). This is a ROUTE golden, so two layers move:
`schema_groups` entries take the card declarations, while
`fields[].default` entries take the route lens's stamped values
verbatim as served (route stamps, not card claims — never
hand-filled). Verified: patched file is leaf-identical to the live
`/v1/form-spec?model=krea-2-raw` serve.

## 2026-09-06 (later) — route field stamps go native (C fossil kill)

The route lens stamped `_wire_str`-stringified base defaults (the C
wire's raw string form) under native resolver values: `fields[]`
served width `'1024'` (string) next to steps `52` (int) — one form,
two types for one kind. C RETIREMENT: a new fossil in the wire is a
bug, not heritage. `py/editor_forms.py` `_form_spec_routed` now
stamps FIELDS from the native merge (`cls.defaults` + variant
`resolver_defaults`); the stringified top-level `defaults` contract
is untouched. SURGICAL: `fields[].width/height` `'1024'` → `1024`
(the only stringified stamps on any route); verified leaf-identical
to the live serve. Wall:
`test_route_stamped_field_defaults_are_native_typed`
(negative-controlled: fails `width serves stringified '1024'` on the
old line, green on the fix).
