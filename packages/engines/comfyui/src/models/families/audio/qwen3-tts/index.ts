// families/audio/qwen3-tts — the qwen3-tts MODEL declaration (ONE
// model — the correction stroke 2026-09-08). The py truth:
// qwen3-tts and qwen3-tts-base declared the SAME class Qwen3Tts —
// one model, the base checkpoint is a VARIANT (an intercept over
// the model's base lane: resolver stamp variant:'base' + the
// model_path stamp), not a sibling row. The flat id survives as
// the variant's route; the qvoice pack boards the MODEL (inherited
// by every variant and quant — the mutation law).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../../contract.ts";

export const DECL: ModelDecl = {
  "id": "qwen3-tts",
  "label": "Qwen3-TTS 0.6B",
  "description": "Qwen3-TTS 12Hz 0.6B — text-to-speech",
  "engine": "comfyui",
  "defaults": {
    "mode": "tts",
    "voice": "vivian"
  },
  "base_body": "",
  "genre": "audio",
  "mods": [
    "qvoice"
  ],
  "variants": [
    {
      "id": "standard",
      "label": "CustomVoice",
      "description": "preset personas and instruct-text emotion control",
      "hint": "",
      "group": "Variant",
      "route": "qwen3-tts",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts",
          "engine": "",
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "base",
      "label": "Base",
      "description": "plain text-to-speech, no persona",
      "hint": "",
      "group": "Variant",
      "route": "qwen3-tts-base",
      "engine": "",
      "resolver_defaults": {
        "variant": "base"
      },
      "lane_inputs": {
        "model_path": "qwen3-tts"
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-base",
          "engine": "",
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps; a fresh card lands here.",
      "group": "Recipe",
      "route": "",
      "engine": "",
      "resolver_defaults": {},
      "cells": [],
      "wire_defaults": {}
    }
  ],
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "tooltip": "",
      "default": ""
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "",
      "default": ""
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "provisions": [],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": true,
  "has_rubric": false,
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
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-qwen3-tts",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
