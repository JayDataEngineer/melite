# families-golden regolds

## 2026-09-08 — the mod mutation system correction (operator order)

Two willed changes, one stroke (commit "the mod mutation system:
packs as a distinct category, flavors family-owned"):

1. **The `loras` key stripped from every DECL** — rows are mod
   MUTATIONS, owned by the family's own `mods/<pack>.ts` flavor
   files (krea-2's 12 rows live at
   `families/image/krea-2/mods/loras.ts`), never inline data in
   the family declaration. The py truth: "the mod's catalog data
   lives in the family's own mods/ package — not crammed into
   model.py".
2. **anny's DECL.mods re-keyed from py export class names
   (EstimateBodyVerb…) to the runtime verb ids
   (hmr-estimate, preset-save, preset-load, dress, prop)** — the
   boarding declaration keys the RUNTIME plane (verb ids + pack
   ids, one namespace), boot-gated against the registered packs
   and verbs (validateBootContracts, the satisfaction law).

Also this stroke: families restructured to directories
(`families/<genre>/<id>/index.ts`, the py model.py layout).
