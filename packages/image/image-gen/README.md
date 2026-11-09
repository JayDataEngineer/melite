---
description: Text-to-image generation card and agent tool across six boarded image families.
kind: package-library
---

# @melite/image-image-gen

The image-generation card package: one `image-gen` card plus the `image_gen` agent tool. Prompt and params in, image out. Compose rides the shared image recipe from `@melite/comfyui-card-kit`; model facts come from the model packages — this package keeps no second model list and no Python recipe registry.

## Contract

- `./card` — the card definition (`id: 'image-gen'`, stage row `generate`, sidebar key `image`). Boards six families from their DECLs: krea-2, z-image, anima, qwen-img-2.1, flux-klein, and moss-image (`SEMANTIC_MODELS`). Flow seats: `prompt` as text in, `image` out; a model is required. The schema carries the sampler/scheduler vocabulary (`media.comfyui.sampler_vocab`); presets are the families' Recipe rows, with no card-level preset knob. Modifier riders bind per family: loras ride every boarded family (each family's own flavor rows; families with no first-party rows serve empty and take user files). The region/inpaint vocabulary (`mask` bag or flat riders, `mask_mode: 'crop_stitch'`) composes the gen detailer arm on EVERY boarded family (ANY model can inpaint); the pair law (a base `input_image` needs `input_mask` or a detector) refuses loud for every family. `finalizeImageGen` strips family leaks post-compose.
- `./tool` — `buildImageGenTool`, the agent tool face; default model `SEMANTIC_MODELS[0]`, preview field `prompt`.
- `./wire` — browser-safe wire facts: `TOOL_NAME = 'image_gen'` (the tool plane; the registry row plane is `image_gen_card`).
- `.` — the composition marker; `packages/engines/comfyui-cordis/src/cardDefs.ts` composes the card from `./card`.
- `./package.json` — the manifest.

Admission refuses unknown parameters, unboarded families, and missing required packs before graph emission; the tool projection preserves the same admitted parameter and result contract.

## Gates

```sh
pnpm --filter @melite/image-image-gen exec vitest run
```

When the user-visible schema or tool output changes, update the recorded-session fixture in the same change.

## Model Experience

### Request context and condition

The `image_gen` tool fires an agent request when called; the card conditions a ComfyUI run when composed.

#### What the model sees

The image model receives the gated prompt and params — sampler/scheduler, seeds, and the family's rider payloads (loras) — as the composed graph's inputs.

#### Token effect

conditional — the schema occupies context only in sessions that register the tool; values ride only tool-call turns.

#### KV Cache effect

append-only — tool-call turns append messages; earlier turns stay byte-identical.

## Known Limitations and Deferred Work

- **Riders bind per family** — loras serve only the families named above; an unbound family refuses loudly rather than guessing.
- **Presets are family Recipe rows** — composing presets at the card level is deferred.
