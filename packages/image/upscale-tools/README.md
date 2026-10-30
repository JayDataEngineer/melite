---
description: Hidden upscale card running SeedVR2 over an input image, with consumed fragment arms for resize, pixel-upscale, RTX VSR, and concat.
kind: package-library
---

# @melite/image-upscale-tools

`@melite/image-upscale-tools` is the upscale card (`id: 'upscale-tools'`, stage row `generate`): SeedVR2-3B fp16 diffusion upscaling on a required `input_image`. It boards the `seedvr2-ema` family's declared `upscale` action and requires the `ComfyUI-SeedVR2_VideoUpscaler`, `ComfyUI-KJNodes`, and `Nvidia_RTX_Nodes_ComfyUI` packs. The package's single source module is the root face the cardPackages SSOT composes (`@melite/image-upscale-tools`), which the manifest spells again as the explicit `./card` door; there is no tool or client face. The card is hidden from the sidebar (image order 16) and additionally serves the consumed tool fragments — `resize`, `pixel-upscale`, `rtx-vsr`, `concat`, and `input` — each with its own arm.

## Contract

- `.` — the card definition and registration (the root module carries `inject = ['comfyui']`). Schema: `input_image` (required, path); ride keys with hint-only ranges and NO defaults — `resolution` (256..2160), `max_resolution` (512..4096), `batch_size` (1..16), where the model row owns the values (1080/4096/1); and `seed` (default −1). There are NO `dit_model`/`vae_model` knobs — weights ride the lane's `unet`/`vae` inputs. The `rtx-vsr` arm is compose-truth only: it emits the graph, while execution requires the NVIDIA SDK stack. `admits: ['filename_prefix']`; `spells: ['input_image']` — a `$spell` value (the `$image` form) names a wired stage input that rides verbatim. Estate-file contract: a file param must exist at compose (absolute mount path); a linked upstream output arrives as an asset URL (`/v1/assets/runs/...`) and the submit-time uploader stages it, refusing loudly on a dead URL.
- `./card` — the same card module as the root face, re-exported as the explicit named door (one file, two specifiers).
- `./package.json` — the manifest.

## Model Experience

### Request context and condition

A run conditions the upscale graph only when the card composes; no agent tool face ships.

#### What the model sees

SeedVR2 receives the staged image plus the gated resolution, batch, and seed values as graph inputs.

#### Token effect

zero-direct — the package contributes no prompt or schema to any language-model context.

#### KV Cache effect

independent — nothing here appends to or reshapes a session cache.

## Known Limitations and Deferred Work

- **rtx-vsr needs the NVIDIA SDK** — the arm composes anywhere but executes only where the RTX stack exists.
- **No dit/vae knobs** — weight selection rides the model row; a card-level override is not declared.
