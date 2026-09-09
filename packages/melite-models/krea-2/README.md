# @melite/melite-models-krea-2 — the krea-2 model plugin

The first MODEL PLUGIN PACKAGE (the model-package stroke, 2026-09-09).
Models and cards are DISTINCT plugin kinds in DISTINCT domains:
`packages/melite-models/<family-id>` is a model plugin;
`packages/melite-image/*` / `packages/melite-3d/*` are card plugins.

## What a model plugin carries — the WHOLE model

- `src/index.ts` — `DECL` (the family truth) + `family` (the plugin:
  `inject: ['models']`, `ctx.models.registerFamily(DECL)` inside
  `ctx.effect`, fiber-owned, revertible). The DECL carries:
  - **variants** — turbo / raw / realism / default (the Recipe group
    is grammar the model owns), each with `route` +
    `resolver_defaults` (which file loads, the stamped steps/cfg)
  - **quant cells** — `int8 ConvRot` per variant, every cell's HF
    `source_url`, `sha256`, `size_bytes`, `dest_root`, `dest_sub`
  - **mods** — `['loras']`: the model declares its mutation packs
  - **lane_inputs** — the weight files the engine loads (unet, vae,
    text_encoder, latent_node…)
  - `defaults`, `prompt_guide`, `timeout_floor`, `variant_groups`
- `mods/loras.ts` — THE MODEL CARRIES ITS MODS: the flavor plugin
  (`inject: ['comfyui']`, `registerFlavor`) with the 12 lora rows,
  every row carrying its upstream HF `source_url` — no link, no row.
  Family-owned data, never in the pack contract, never in the DECL.

## Composition seams

- The engine's `models/families/index.ts` (the ONLY load order)
  imports this package — the registry boots it with all families.
- `cardDefs.ts` composes the packaged flavor in the flavors phase
  (packs first, flavors after; the boot-loud flavor↔DECL.mods
  interlock unchanged).
- The image-gen card package boards `DECL.id` — THE CARD GETS ITS
  MODELS FROM THE MODEL PLUGINS (never a restated string).

## Gates

`tsc --noEmit -p .`; `tests/decl.test.ts` pins the carrier
(5 tests). Engine walls prove registration: 48-family census
(engine tree + model packages), flavor interlock, absorption
parity vs the py referee.
