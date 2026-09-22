// families/image/qwen-img-edit-21.ts — the qwen-img-edit-21 family
// declaration (authored 2026-09-21 from the Comfy-Org release + the
// official image_qwen_image_2_1_image_edit template, hand-owned:
// this file IS the family's truth — a change here is a family
// change, nothing else moves).
//
// THE NAMING LAW (operator order 2026-09-21): family ids name the
// MODEL, its VERSION, and — where the registry's one-family-one-card
// law demands it — the LANE. Qwen-Image-2.1 is one base checkpoint
// with two lanes; the registry boards each family on exactly one
// card, so the pair is qwen-img-21 (t2i, image-gen) and
// qwen-img-edit-21 (this family — cached-reference edit, image-edit):
// same physical weights (the Comfy-Org/Qwen-Image-2.1 repo, both
// quants), version-consistent ids, no 2511-style ambiguity in the
// dropdowns or card labels.
//
// THE LANE (the official edit template graph): UNETLoader →
// QwenImage21Cache (the reference-prefix KV cache around the SAME
// base unet — NO separate edit weights exist for 2.1) and
// TextEncodeQwenImage21 conditioned on the anchor images through its
// own image_N autogrow slots (pos+neg from ONE node) →
// EmptyLatentImage at target resolution → KSampler → VAEDecode.
// NOT the 2511 VAEEncode-of-source lane — the kit branches on
// lane_inputs.text_encode_node (the latent_node precedent).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "qwen-img-edit-21",
  "form": "form_edit",
  "label": "Qwen Image Edit 2.1",
  "description": "Instruction-driven image editing on the Qwen-Image-2.1 base — the reference-cached lane: the SAME 2.1 checkpoint as text-to-image (no separate edit weights), wrapped in QwenImage21Cache with the anchor images spliced through TextEncodeQwenImage21's own vision path, sampled at target resolution. The sibling family qwen-img-21 serves the t2i lane on the image-gen card.",
  "engine": "comfyui",
  "defaults": {
    "steps": 25,
    "sampler": "euler",
    "scheduler": "simple",
    "cfg": 1
  },
  "prompt_guide": {
    "title": "Qwen Image 2.1 Edit Prompting Guide",
    "sections": [
      "GuideSection(label='Edit', body='State the change and the anchor: what stays identical. One edit per instruction.', list=[])",
      "GuideSection(label='CFG', body='Flow-matching lane: Guidance stays low (default 1.0).', list=[])",
    ],
    "label": "CFG",
    "body": "Flow-matching lane: keep Guidance low (default 1.0)",
    "list": []
  },
  "genre": "image",
  // THE PROVISION TRUTH (the silent-failure cure, 2511's law): the
  // text encoder and vae carry provisions from the same
  // Comfy-Org/Qwen-Image-2.1 repo; the unet rides the cell artifacts
  // (the quant owns the download — same files as the t2i sibling;
  // the engine's downloader dedups by content).
  "provisions": [
    {
      "name": "qwen3vl_8b_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/text_encoders/qwen3vl_8b_int8_convrot.safetensors",
      "folder": "text_encoders",
      "sha256": "8bfd0f6e12abf2d2d697ecc888e5e90b0d6741d6708f05799f53afa560452e8f",
      "size_bytes": 9350798360
    },
    {
      "name": "qwen_image_2.1_vae_bf16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/vae/qwen_image_2.1_vae_bf16.safetensors",
      "folder": "vae",
      "sha256": "bb21f7473051e1ac368515dd3f2e15cd44d7a11748ee8823e1ddca3e4876b7c9",
      "size_bytes": 675509688
    }
  ],
  "variants": [
    {
      "id": "int8",
      "label": "INT8 ConvRot",
      "hint": "The official template pick — 7.3GB unet, int8 convrot (DEFAULT)",
      "group": "Variant",
      "route": "qwen-img-edit-21",
      "order": 0,
      "cells": [
        {
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "qwen-img-edit-21-int8",
          "vram_peak_gb": 24,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_int8_convrot.safetensors",
            "size_bytes": 7256783064,
            "sha256": "cb74113cb03faecd79611b01fd7fd642f0aa60d6f0b95086abee214d75eaa57d",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 7.3
          }
        }
      ]
    },
    {
      "id": "bf16",
      "label": "BF16",
      "hint": "Full precision unet + bf16 encoder — 14.2GB unet, highest fidelity, most VRAM",
      "group": "Variant",
      "route": "qwen-img-edit-21-bf16",
      "order": 1,
      "lane_inputs": {
        "unet": "qwen_image_2.1_bf16.safetensors",
        "text_encoder": "qwen3vl_8b_bf16.safetensors"
      },
      "cells": [
        {
          "quant": "bf16",
          "label": "BF16",
          "route": "qwen-img-edit-21-bf16",
          "vram_peak_gb": 48,
          "artifact": {
            "source_url": "https://huggingface.co/Comfy-Org/Qwen-Image-2.1/resolve/main/diffusion_models/qwen_image_2.1_bf16.safetensors",
            "size_bytes": 14230280616,
            "sha256": "89f4158d066cc33906a199fca85634f766892dd78f49b6698dabf187ac86c4bc",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "diffusion_models",
            "size_hint_gb": 14.3
          }
        }
      ]
    },
    {
      "id": "remove_background",
      "label": "Remove Background",
      "hint": "The official one-click — the Comfy-Org background-removal template's canned prompt verbatim (the 2.1 base renders the subject on transparency; solver/cfg/steps ride the family defaults, which are the template's own values).",
      "group": "Recipe",
      "wire_defaults": { "prompt": "Remove the background, and output a PNG image" },
      "cells": [],
    },
    {
      "id": "upstream_solvers",
      "label": "Upstream Solvers",
      "hint": "Sampler euler + scheduler simple — the official 2.1 templates' own solver truth (this family's DECL defaults, both members of the card's sampler/scheduler vocabularies).",
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
      "tooltip": "Quantization tier of the ONE 2.1 base — INT8 ConvRot (the official template pick) or BF16 (full precision, most VRAM).",
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "The download tier — INT8 ConvRot (7.3GB) or BF16 (14.2GB).",
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
    "clip_type": "qwen_image",
    "latent_node": "EmptyLatentImage",
    "sampling_shift": 0,
    // THE LANE BRANCH KEY (the latent_node precedent — data, never
    // a family-id switch): names the 2.1 encoder class; the kit's
    // imageEdit builder routes onto the cached-reference lane.
    "text_encode_node": "TextEncodeQwenImage21",
    // THE IMAGE CAPACITY (the node's own truth — the card and the
    // lane RIDE this, never a hardcoded count): TextEncodeQwenImage21
    // opens image inputs as filled, up to 16 total (anchor +
    // references). The kit caps the unified reference order at
    // max_images - 1; the card caps its stack face at the roomiest
    // boarded lane's max_images - 1.
    "max_images": 16,
    "text_encoder": "qwen3vl_8b_int8_convrot.safetensors",
    "unet": "qwen_image_2.1_int8_convrot.safetensors",
    "vae": "qwen_image_2.1_vae_bf16.safetensors"
  }
};

export const family: Plugin = {
  name: "family-qwen-img-edit-21",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
