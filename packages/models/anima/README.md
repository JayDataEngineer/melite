---
description: Anima text-to-image family, a Cosmos-Predict2 anime and illustration diffusion lane with Danbooru-style prompting.
kind: package-library
---

# @melite/models-anima

The Anima family — anime and illustration text-to-image on the comfyui engine, built on the Cosmos-Predict2 base with Danbooru-style prompting. The package owns the declaration, the lane's weight facts, and the t2i action; the image-gen card binds the action and owns the compose surface around it.

The lane pins its weights in lane_inputs: unet `anima-base-v1.0.safetensors`, text encoder `qwen_3_06b_base.safetensors`, VAE `qwen_image_vae.safetensors`, clip type `stable_diffusion`, stock `EmptyLatentImage` latent. Three provisions rows download them (circlestone-labs/Anima, Qwen/Qwen3-0.6B-Base, Comfy-Org/Qwen-Image_ComfyUI). Defaults are 1024×1024, 30 steps, er_sde over simple, cfg 4; the recipes are draft (8 steps) and detailed (30 steps); the single F32 cell peaks at 20 GB. The prompt field is required — a draft without one refuses, because every image lane states what the picture is.

The family's action is t2i: the stock diffuse topology — CLIPTextEncode pair, EmptyLatentImage at card resolution, KSampler, decode and save under `<run>/gen`. The facts door reads the resolved lane_inputs into the closed T2IFacts shape; a drifted latent class refuses rather than silently rerouting. Anima boards no mods: loras, controlnets, and ip-adapter bags refuse loud, never silently drop.

## Declaration

`src/index.ts` declares the DECL and the `family-anima` plugin; `src/actions.ts` owns the t2i segment and its typed facts and params.

## Model Experience

#### What the model sees

None — the package contributes no model-visible input. The DECL serves the estate's model catalog (label, description, variants, defaults) and the image-gen card that boards the family; it registers no session events and writes no prompt segments.

#### Token effect

Zero-direct token effect — the package registers a model family and composes engine graphs; it writes no prompt text into any model request.

#### KV Cache effect

Independent — the package contributes no persistent prompt prefix, so registering or removing the family invalidates nothing cached.

## Known Limitations and Deferred Work

- **Required prompt** — the relations row makes prompt mandatory; a textless draft refuses at the family door instead of composing an undefined image.
- **F32 only** — one cell, 20 GB peak; no quantized variants ride the DECL.
- **No adapter flavor** — no loras or controlnets packs board the family; a stated adapter bag refuses loud, so adapter-driven styling is out of scope here.
