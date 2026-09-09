# @melite/melite-image-image-gen — the image-gen card package

The second card package (M2′): the first MODEL card. One package,
two optional faces, one spelling of everything.

## The card

- `src/card.ts` — schema + identity + `registerCard(ctx, comfy)`.
  The schema is the 1:1 port (frozen field order) PLUS the recipe
  knob, declared last. Compose calls the card-kit recipe
  (`imageT2I`); `finalizeImageGen` strips. LoRAs ride the MOD
  absorption (`mods/loras.ts`) — deliberately not in the schema.
- `src/recipes.ts` — THE RECIPE CATALOG (operator law: recipes are
  CONFIGS ON THE CARD — named override sets that can carry mod
  payloads; serializable JSON the card consumes). DATA ONLY. The
  engine's compose resolves them at its one merge point
  (service.ts `applyRecipe`): schema defaults < recipe overlay <
  explicit args (the settings cascade order); scalars layer, the
  lora stack concats (recipe first, caller after). The schema's
  recipe enum derives from the catalog keys — one spelling.
- `src/tool.ts` — `buildImageGenTool(gatewayUrl)`: the DSH tool
  `image_gen` (registry row `image_gen_card`). The params walk
  synthesizes the `model` knob from the boarded array
  (krea-2|z-image|anima); execute resolves the unstated default
  itself (boarded[0]) and rides the two-door stage-doc shape
  (`service: <model>` at drafts, `{model, draft_id}` at start).
- `src/index.ts` — `inject = []`, documented Config idiom
  (env-in-default), both faces probed, BARE registration.

## What "rides the defaults for the UI" means

No toolview claim, no studio, no custom presentCall. The schema's
`.default()`s are the prefill, the Schemastery meta is the layout
(the recipe knob included — group sampling, select), GenericToolCard
is the fallback. The frozen referee
(`gateway/shell/data/discovery-catalog.json`) carries the recipe
field for the three boarded families — a hand-owned, wall-pinned
edit (recipe-only diff), the mechanical consequence of the
operator-ordered surface addition.

## Transitional composition

The engine card (`src/cards/image/image-gen/card.ts`) is deleted;
`cardDefs.ts` composes this package explicitly. The agents dir
(`AGENT.md` + image-craft skill) stays engine-side — prose, not
registration. The fetch-registrar's dead `image_card` allowlist
row (matched no manifest — this card never rode the registrar) is
deleted; 6 model-card tools still ride it until their packages
land.

## Gates

Package tests 27/27 (composition 5, recipes 7, tool 15),
package/engine/doors/melite-tools tsc clean, walls 19/19.
