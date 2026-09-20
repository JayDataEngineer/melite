// families/audio/qwen3-tts — the 0.6B CustomVoice MODEL declaration
// (2026-09-21 — the operator's README stroke: "there is no model
// called Base; there is the .6B and the larger version; each model
// supports different inputs"). Qwen3-TTS 12Hz 0.6B CustomVoice:
// text-to-speech with 9 preset personas and instruct-text emotion
// control; loads exported .qvoice embeddings through the qvoice mod.
// Sibling families own their own packages (one family = one
// package): @melite/models-qwen3-tts-base (the 0.6B cloner),
// @melite/models-qwen3-tts-voicedesign (the 1.7B designer).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "qwen3-tts",
  "form": "form_tts",
  "label": "Qwen3-TTS 0.6B CustomVoice",
  "description": "Qwen3-TTS 12Hz 0.6B CustomVoice — text-to-speech with 9 preset personas and instruct-text emotion control; loads exported .qvoice embeddings",
  "engine": "comfyui",
  "defaults": {
    "mode": "tts",
    "voice": "vivian"
  },
  "genre": "audio",
  "mods": [
    "qvoice"
  ],
  "variants": [
    {
      "id": "standard",
      "label": "CustomVoice",
      "description": "preset personas and instruct-text emotion control",
      "group": "Variant",
      "route": "qwen3-tts",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts",
        }
      ]
    },
    {
      "id": "steady_read",
      "label": "Steady Read",
      "hint": "Temperature 0.05 — the card schema's floor (the engine's positive-sampling minimum: the native node refuses 0).",
      "group": "Recipe",
      "wire_defaults": { "temperature": 0.05 },
      "cells": [],
    },
    {
      "id": "expressive_read",
      "label": "Expressive Read",
      "hint": "Temperature 2 — the card schema's own ceiling (maximum variation).",
      "group": "Recipe",
      "wire_defaults": { "temperature": 2 },
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
    "clip_type": null,
    "clip_vision": "",
    "family": "qwen3_tts",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
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
  name: "family-qwen3-tts",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
