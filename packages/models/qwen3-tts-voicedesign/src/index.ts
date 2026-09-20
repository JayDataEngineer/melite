// families/audio/qwen3-tts-voicedesign — the 1.7B VoiceDesign MODEL
// declaration (2026-09-21 — the operator's README stroke: "the
// larger version"). Qwen3-TTS 12Hz 1.7B VoiceDesign:
// instruction-following voice design with .qvoice export through
// the qvoice_save mod. One family = one package (the make-model
// law); siblings: models-qwen3-tts (0.6B CustomVoice),
// models-qwen3-tts-base (the 0.6B cloner).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "qwen3-tts-voicedesign",
  "form": "form_tts",
  "label": "Qwen3-TTS 1.7B VoiceDesign",
  "description": "Qwen3-TTS 12Hz 1.7B VoiceDesign — instruction-following voice design with .qvoice export (the larger checkpoint)",
  "engine": "comfyui",
  // THE C++ TASK STEER (2026-09-20, the 1.7B receipt stroke):
  // the VoiceDesign checkpoint refuses task tts LOUD (the C++
  // gate: a VoiceDesign-variant checkpoint only runs the
  // VoiceDesign task, task code "vdes"); extras.variant carries
  // the steer (ENGINE_TRUTH exempts it from card domains) and
  // Layer C maps variant → task.
  "defaults": {
    "mode": "design",
    "variant": "voicedesign"
  },
  "genre": "audio",
  "mods": [
    "qvoice_save"
  ],
  "variants": [
    {
      "id": "standard",
      "label": "VoiceDesign",
      "description": "design a voice from a description, export the embedding",
      "group": "Variant",
      "route": "qwen3-tts-voicedesign",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-voicedesign",
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
    "model_path": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
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
  name: "family-qwen3-tts-voicedesign",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
