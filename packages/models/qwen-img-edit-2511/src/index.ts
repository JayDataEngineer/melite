// families/image/qwen-img-edit-2511.ts — the qwen-img-edit-2511 family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "qwen-img-edit-2511",
  "form": "form_edit",
  "label": "Qwen Image Edit 2511",
  "description": "Instruction-driven image editing and manipulation — the Qwen-Image-Edit 2511 lane (the image-edit card arms this family; the pre-flip img-edit head is retired, same physical lane, its assets merged here 2026-09-05).",
  "engine": "comfyui",
  // THE RECIPE↔WEIGHTS LAW (2026-09-22, operator catch e): the
  // family defaults must sample THE UNET THE LANE PINS. lane_inputs
  // below pins the INT8 ConvRot STANDARD checkpoint (the only 2511
  // edit weights provisioned on this box) — the old defaults (steps
  // 4, cfg 1) were the LIGHTNING recipe for a different, distilled
  // checkpoint, so a default run sampled standard weights at 4
  // steps and produced washed-out, broken edits (live-evidenced:
  // run-bcb995c95f2c graph = int8_convrot unet × steps 4). Defaults
  // are now the standard recipe; the lightning variant swaps BOTH
  // the recipe AND the unet through its own lane_inputs, so a
  // variant pick can never mix one checkpoint with the other's
  // step count.
  "defaults": {
    "use_stock_nodes": false,
    "steps": 20,
    "sampler": "euler",
    "scheduler": "simple",
    "cfg": 2.5,
    "double_reference": false
  },
  "prompt_guide": {
    "title": "Qwen Image Edit Prompting Guide",
    "sections": [
      "GuideSection(label='Format",
      "body='One edit per instruction: target region",
      "single change",
      "what stays identical",
      "list=("
    ],
    "label": "CFG",
    "body": "Standard recipe: Guidance 2.5, 20 steps (the DEFAULT — matches the INT8 ConvRot weights the lane loads). Lightning stamps cfg 1.0 / 4 steps and swaps to the lightx2v distilled checkpoint.",
    "list": []
  },
  "genre": "image",
  "mods": [
    "lanpaint",
    "loras",
    "mask"
  ],
  // THE PROVISION TRUTH (2026-09-13, the silent-failure cure): the
  // family declared lane_inputs files but NO downloadable rows — the
  // manage rail could not name where the text encoder lives, and the
  // card died at ComfyUI validation with no surfaced reason. Every
  // lane_inputs weight now carries its provision (shas from the HF
  // tree APIs; the encoder and vae share the Qwen-Image_ComfyUI
  // split_files repo, the unet rides the edit repo's convrot row).
  "provisions": [
    {
      "name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "folder": "text_encoders",
      "sha256": "cb5636d852a0ea6a9075ab1bef496c0db7aef13c02350571e388aea959c5c0b4",
      "size_bytes": 9384670680
    },
    {
      "name": "qwen_image_vae.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Qwen-Image_ComfyUI/resolve/main/split_files/vae/qwen_image_vae.safetensors",
      "folder": "vae",
      "sha256": "a70580f0213e67967ee9c95f05bb400e8fb08307e017a924bf3441223e023d1f",
      "size_bytes": 253806246
    }
  ],
  "variants": [
    {
      "id": "lightning",
      "label": "Lightning",
      "hint": "4-step distilled lightx2v checkpoint — fast. Swaps BOTH the recipe (steps 4, cfg 1) AND the unet (the recipe↔weights law — never one without the other). Requires provisioning: the FP8 Lightning file is NOT on this box by default; without it the engine validation refuses LOUD (the honest face) — the standard weights are what ship.",
      "group": "Variant",
      "route": "qwen-img-edit-2511-lightning4",
      "order": 0,
      // THE WEIGHTS SWAP (recipe↔weights law): this variant's
      // stamps ride its OWN unet, merged over the family's
      // lane_inputs by the variant rail.
      "lane_inputs": {
        "unet": "qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors"
      },
      "resolver_defaults": {
        "steps": 4,
        "cfg": 1
      },
      "cells": [
        {
          "quant": "lightning4",
          "label": "FP8 Lightning",
          "route": "qwen-img-edit-2511-lightning4",
          "vram_peak_gb": 20,
          "artifact": {
            "source_url": "https://huggingface.co/lightx2v/Qwen-Image-Edit-2511-Lightning/resolve/main/qwen_image_edit_2511_fp8_e4m3fn_scaled_lightning_comfyui_4steps_v1.0.safetensors",
            "size_bytes": 20447469486,
            "sha256": "16d03fd9bab36b0a588e77db23825629df62ab99fc3e62f3a36887b201dcc36f",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 20.4
          }
        }
      ]
    },
    {
      "id": "standard",
      "label": "Standard",
      "hint": "20 steps, cfg 2.5 — the INT8 ConvRot merge (DEFAULT: the weights this box ships, the recipe the family defaults stamp).",
      "group": "Variant",
      "route": "qwen-img-edit-2511",
      "order": 1,
      "resolver_defaults": {
        "steps": 20,
        "cfg": 2.5
      },
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "qwen-img-edit-2511-int8",
          "vram_peak_gb": 20,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-Edit_ComfyUI/resolve/main/split_files/diffusion_models/qwen_image_edit_2511_int8_convrot.safetensors",
            "size_bytes": 20499083824,
            "sha256": "11b5af5ac601821d73930c84846c9a158e67177356daf927ce1c8d10f3963829",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 20.5
          }
        }
      ]
    },
    {
      "id": "strong_identity",
      "label": "Strong Identity",
      "hint": "Double-reference ON — the card schema's own identity knob (encode the input twice for stronger identity preservation); this family's own default is false. Steps/CFG stay on the Variant routes (Lightning 4-step / Standard 20-step cfg 2.5) — never duplicated here. PLANE TRUTH (agent-debt F-4, 2026-09-22): the TS compose plane refuses double_reference=true LOUD — it builds the stock plain-edit graph only. Selecting this variant GUARANTEES a refusal; do not plan runs around it until the double-encode lane exists.",
      "group": "Recipe",
      "wire_defaults": { "double_reference": true },
      "cells": [],
    },
    {
      "id": "upstream_solvers",
      "label": "Upstream Solvers",
      "hint": "Sampler euler + scheduler simple — this family's own DECL defaults, both members of the card's sampler/scheduler vocabularies.",
      "group": "Recipe",
      "wire_defaults": { "sampler": "euler", "scheduler": "simple" },
      "cells": [],
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps; a fresh card lands here.",
      "group": "Recipe",
      "cells": [],
    }
  ],
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "tooltip": "Base checkpoint — Lightning (4-step distilled, fast default) or Standard (20-step reference, highest quality).",
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "Quantization tier — FP8 Lightning (the distilled checkpoint) or INT8 ConvRot (the reference merge).",
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "has_agent": true,
  "has_inference": true,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": "qwen_image",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    // THE IMAGE CAPACITY (the node's own truth — the card and the
    // lane RIDE this, never a hardcoded count): the stock
    // TextEncodeQwenImageEditPlus takes image1/2/3 — 3 total, anchor
    // + 2 references. Past that the kit refuses LOUD (switch lanes).
    "max_images": 3,
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
    "texture_vae": "",
    "unet": "qwen_image_edit_2511_int8_convrot.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "qwen_image_vae.safetensors",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-qwen-img-edit-2511",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
