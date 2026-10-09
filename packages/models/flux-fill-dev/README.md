---
description: Inpaint family, dual-engine masked-region inpainting over FLUX.1-Fill or LanPaint.
kind: package-library
---

# @melite/models-flux-fill-dev

The Inpaint family — dual-engine masked-region inpainting: FLUX.1-Fill (the dedicated fill architecture) or LanPaint on any base model. The DECL is unoffered, so no served catalog row exists, and it declares no actions: the family owns facts and variants, and lane composition lives with the cards and flows that resolve the route.

One variant rides the DECL: onereward — OneReward, the SOTA true-CFG RLHF fine-tune on route `flux-fill-onereward` — plus the Recipe default row, the fresh-card landing. The OneReward hint carries its own licence wall: non-commercial.

## Declaration

`src/index.ts` declares the DECL and the `family-flux-fill-dev` plugin. There is no actions module and no mods tree.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL registers in the models registry only; the catalog emission serves it no row (only offered comfyui-engine families serve), and it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **Unoffered** — the family serves no catalog row; it resolves as a registry route only.
- **No actions** — compose-time behavior lives with the binding cards and flows; the package contributes the variant matrix.
- **OneReward is non-commercial** — the licence rides the variant hint, so commercial pipelines must stay on other engines regardless of technical fit.
