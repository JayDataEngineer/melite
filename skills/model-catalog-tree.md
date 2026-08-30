---
name: model-catalog-tree
description: "The model_catalog tree contract — plugins/melite-core/models/<group>/<model-id>/ with model.yaml, variants/<variant-id>/variant.yaml, mods/<param_key>/mod.yaml, presets/, agents/. The filesystem IS the model matrix. Read before adding or editing any model, variant, quant, or GPU-peak declaration."
---

# The model-catalog tree

`plugins/melite-core/models/` is the ONE source of truth for what models
exist and how the card's pickers behave. The filesystem IS the matrix:
picking a model then a variant is LITERALLY SELECTING FILES — a cell that
has no directory/key cannot be declared, served, or run. One cell existing
never implies another. No cross-products.

## Layout (every level is a picker row)

```
model_catalog/
  comfyui.yaml                      engine_order / quant_order SSOT
  <group>/                          a tree group hosts ONLY trees
    <model-id>/                     the model row — id IS the dirname
      model.yaml                    the head + its family: block
      variants/<variant-id>/        the variant row — ALWAYS a folder
        variant.yaml                order/group/label/hint/route/engine/
                                    vram_peak_gb/patch/cell/quants
        presets/<preset-id>.yaml    route-scoped presets (stem IS the id)
      mods/<param_key>/mod.yaml     one modifier bag per wire param_key
      presets/<preset-id>.yaml      family presets (stem IS the id)
      agents/                       AGENT.md + tools.py + skills/<id>/SKILL.md
```

Model folder children are ONLY: `model.yaml`, `variants/`, `mods/`,
`presets/`, `agents/`. Variant folder children are ONLY `variant.yaml`
and `presets/`. Anything else fails the load.

## The gates (fail-fast — a broken edit parks the gateway)

The loader enforces ~40 structural gates at import. The ones that bite:

- **id IS the dirname** — a declared `id:` that disagrees with its folder
  is a lie about location (model, variant, and mod levels).
- **`route:` XOR `base:`** on every quant cell — neither is a dead cell,
  both is a contradiction. `base:` must name a route THIS model declares.
- **`cell:` never on the head's own route** — the head body IS that route.
- **quant ids unique within one variant file** (the same id in a SIBLING
  file is a different matrix place, disambiguated by `only_routes`).
- **in-file `modifiers:` / `presets:` on a tree family are refused** — the
  mods/ and presets/ layouts are the contract.
- **`vram_peak_gb`** — a number (float ok); the declared peak VRAM for the
  cell. The card renders it on the variant button next to the label.

## Before you touch the tree

Call `inspect_model_catalog` (offline, no server boot):

- no args → the group map (groups → model/variant counts)
- `model=<id|route|variant-id>` → a model's full matrix: variants, routes,
  hints, `vram_peak_gb` peaks, presets, variant_groups
- `check_tree=true` → runs EVERY loader gate + schema in-process and
  reports ok/violations — run this after ANY edit, BEFORE the dev
  reloader picks the file up (5 worker deaths parks the gateway; a
  30-second check beats a parked box).

The tools `list_models` / `get_model_form_spec` read the SERVED catalog
(running gateway); `inspect_model_catalog` reads the tree offline. If
they disagree, the gateway is serving a stale load — `check_tree` tells
you which side is broken.

## Authoring rules that keep the gates quiet

1. New variant → new folder under `variants/`, `variant.yaml` inside; the
   folder name is the id (never re-declare it in the file).
2. New quant cell → a key inside the variant's `quants:` with `route:` or
   `base:`, never both.
3. GPU variations → set `vram_peak_gb` on the variant (or per-quant cell)
   that changes the memory footprint. The badge renders from it; the
   executor's actual free VRAM is on `/health` (`comfyui_detail.vram`)
   and in the GPU badge tooltip — declared peak vs actual free is the
   "will it fit" ledger.
4. Prompt-enhance recipes live in `agents/skills/prompt-enhance*/SKILL.md`
   (frontmatter name required; entry keys must be the model's OWNED route
   keys — anything else fails the enhance loader).
5. Presets are FILES: `presets/<preset-id>.yaml`, the stem IS the id.
