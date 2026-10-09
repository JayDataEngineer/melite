---
description: Z-Image family — fast Z-Image and Z-Image Turbo text-to-image with LoRA, ControlNet, and IP-Adapter flavor packs, on the ComfyUI engine.
kind: package-library
---

# @melite/models-z-image

`@melite/models-z-image` is the model family package for Z-Image text-to-image (`form_generate`, genre image, engine comfyui). It declares the `t2i` action, the Turbo/Base variant rail, three provisions from Comfy-Org's split-files repo, and three flavor mods (`loras`, `controlnet`, `ip_adapter`). The estate boot mounts it as a Cordis plugin through `ctx.models.registerFamily` inside `ctx.effect`; the image-gen card binds the action. The lane is this package's own `actions.ts` — the stock diffuse topology with the AuraFlow wrap (sampling shift 3) — byte-identical to the legacy arm per `tests/action.spec.ts`.

## Declaration

Variants: `turbo` (the 8-step distilled default) and `base` (undistilled, more steps, top quality), each with an INT8 cell at a declared ~14 GB VRAM peak; recipe rows `realism` and `dejpeg` stamp the matching LoRA at its declared 0.7 / 1.0 strength. Family defaults: 1024x1024, 8 steps, `res_multistep` / `simple`, cfg 1. `lane_inputs` fixes `clip_type` lumina2, the `EmptySD3LatentImage` latent class (a drifted class refuses at the facts door), sampling shift 3, and the three weights — `qwen_3_4b` text encoder, `z_image_turbo_int8_convrot` unet, `ae` VAE — all provisioned with sha256 digests. `relations.required` names `prompt`: every image lane states what the picture is.

## Mods

The mods are family-owned picker rows, never auto-provisioned — a `source_url` is provenance documentation, not a download declaration. `./mods/loras` carries the seven Turbo style/utility adapters found on disk (Realism, DeJPEG, Pixel Art, 3D MMORPG, Classic Painting, Coloring Book, Sunbleached). `./mods/controlnet` carries the seven Fun-Controlnet-Union conditioning types over the ONE union weight file; `preprocessor` records the upstream map, which the lane consumes as given — no preprocessor executes here. `./mods/ip_adapter` carries the four reference modes with fate `refused`: the receipt documents that the retired ray lane never executed a reference image, the files are SD1.5 adapters that cannot patch Z-Image's S3-DiT, and no upstream Z-Image IP-Adapter exists — `refuseIPAdapterFiring` refuses every stated entry loudly.

```
.
./package.json
./mods/loras
./mods/controlnet
./mods/ip_adapter
```

## Model Experience

### Request context and condition

#### What the model sees

- **prompt** — required; the image description.
- **negative_prompt** — optional steer (absent rides empty).
- **width / height / steps / cfg / sampler / scheduler / seed** — the diffusion surface.
- **loras / controlnets picks** — the fired mod stacks, applied in array order around the LoRA'd model.

#### Token effect

Zero-direct token effect — the fields ride the composed ComfyUI graph; the prompt is engine-side, never harness context.

#### KV Cache effect

Independent — each generation is its own engine request; no shared prefix.

## Known Limitations and Deferred Work

- **IP-Adapter is refused by design** — stated reference entries never compose; the fate flips only when an upstream Z-Image IP-Adapter and a loader lane exist.
- **ControlNet maps ride as given** — no preprocessor runs in this plane; the caller owns producing the conditioning map.
- **Mods are never fetched** — a fresh estate has the picker rows but no LoRA or union files until the operator supplies them.
- **Turbo bias** — the provisioned unet is the Turbo INT8 file; the base variant has no provisioned weight of its own.
