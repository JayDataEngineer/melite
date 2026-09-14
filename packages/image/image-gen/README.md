# @melite/melite-image-image-gen — the image-gen card package

The second card package (M2′): the first MODEL card. One package,
two optional faces, one spelling of everything.

## The card

- `src/card.ts` — schema + identity + `registerCard(ctx, comfy)`.
  `BOARDED` derives from the model plugin DECLs
  (`@melite/melite-models-{krea-2,z-image,anima}`) — the card gets
  its models from the MODEL plugins (distinct domain from card
  plugins); the id is spelled once, in the model.
  The schema is the 1:1 port (frozen field order; NO recipe knob
  — deleted with the catalog, stroke 34). Compose calls the
  card-kit recipe (`imageT2I`); `finalizeImageGen` strips. LoRAs
  ride the MOD absorption (`mods/loras.ts`) — deliberately not in
  the schema.
- THE RECIPE CATALOG IS DELETED (stroke 34 — the operator's law:
  card recipes were model-blind modes; family Recipe rows are
  ONE-CLICK MACROS now: the door serves each payload row's
  `defaults` and the drill's pill stamps its KNOB keys — what it
  stamps is what you see. Stroke 38: a row whose stamp is entirely
  mod-owned — krea-2's realism lora — renders NO pill at all;
  lora is never standalone, the Modifiers menu is its one surface.
  The stamp-less `default` row renders nothing). The compose
  cascade is one law with no overlay leg: schema defaults <
  model-folder defaults < explicit args.
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
(no recipe knob — the field rides nowhere, stroke 34),
GenericToolCard is the fallback.

## Transitional composition

The engine card (`src/cards/image/image-gen/card.ts`) is deleted;
`cardDefs.ts` composes this package explicitly. The agents dir
(`AGENT.md` + image-craft skill) stays engine-side — prose, not
registration. The fetch-registrar's dead `image_card` allowlist
row (matched no manifest — this card never rode the registrar) is
deleted; 6 model-card tools still ride it until their packages
land.

## Gates

Package tests 54 (composition + recipes death-certificate + executor + tool),
package/engine/doors/melite-tools tsc clean, walls 19/19.
