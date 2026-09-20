// families/audio/qwen3-tts-base — the 0.6B Base MODEL declaration
// (2026-09-21 — the operator's README stroke). Qwen3-TTS 12Hz 0.6B
// Base: 3-second voice CLONE from reference audio + transcript —
// not "plain TTS, no persona". Boards no mod: no voice knobs, no
// embeddings, no design. One family = one package (the make-model
// law); siblings: models-qwen3-tts (CustomVoice), models-qwen3-tts-
// voicedesign (the 1.7B designer).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "qwen3-tts-base",
  "form": "form_tts",
  "label": "Qwen3-TTS 0.6B Base",
  "description": "Qwen3-TTS 12Hz 0.6B Base — 3-second voice clone from reference audio + transcript",
  "engine": "comfyui",
  "defaults": {
    "mode": "tts"
  },
  "genre": "audio",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Base",
      "description": "voice clone from a 3-second reference",
      "group": "Variant",
      "route": "qwen3-tts-base",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-base",
        }
      ]
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
    }
  ],
  "has_inference": true,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "",
    "family": "qwen3_tts",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "qwen3-tts",
    "synth_lane": "clone",
    "sampling_shift": 0,
    "text_encoder": "",
    "texture_vae": "",
    "unet": null,
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-qwen3-tts-base",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
