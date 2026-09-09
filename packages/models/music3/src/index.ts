// families/audio/music3.ts — the music3 family declaration
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
  "id": "music3",
  "label": "MiniMax Music 3",
  "description": "MiniMax Music 3 text-to-music with lyrics",
  "engine": "comfyui",
  "source": {
    "type": "huggingface",
    "repo_id": "audio-cpp/MiniMax-Music3-GGUF",
    "note": ""
  },
  "genre": "audio",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "music3",
      "cells": [
        {
          "source": {
            "filename": "MiniMax-Music3-GGUF"
          },
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "music3",
          "vram_peak_gb": 20,
        }
      ]
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
    },
    {
      "id": "Quant",
      "label": "Quant",
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "has_inference": true,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": "minimax",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "minimax_music3_text_encoder_pruned_int8_convrot.safetensors",
    "texture_vae": "",
    "unet": "minimax_music3_dit_int8_convrot.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "minimax_music3_dav.safetensors",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-music3",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
