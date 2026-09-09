// families/audio/qwen3-tts — the qwen3-tts MODEL declaration (ONE
// model — the correction stroke 2026-09-08, extended same day).
// The py truth: qwen3-tts and qwen3-tts-base declared the SAME class
// Qwen3Tts — one model, the base checkpoint is a VARIANT (an
// intercept over the model's base lane), not a sibling row. The
// VoiceDesign 1.7B checkpoint rides the SAME qwen3_tts lane (same
// family stamp, same model_path, same engine) — a third variant,
// not a sibling model. The flat ids survive as variant routes; the
// qvoice pack boards the MODEL (inherited by every variant and
// quant — the mutation law).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../contract.ts";

export const DECL: ModelDecl = {
  "id": "qwen3-tts",
  "label": "Qwen3-TTS 0.6B",
  "description": "Qwen3-TTS 12Hz 0.6B — text-to-speech",
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
      "id": "base",
      "label": "Base",
      "description": "plain text-to-speech, no persona",
      "group": "Variant",
      "route": "qwen3-tts-base",
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
        }
      ]
    },
    {
      "id": "voicedesign",
      "label": "VoiceDesign",
      "description": "instruction-following voice design; the voice-lock lane",
      "group": "Variant",
      "route": "qwen3-tts-voicedesign",
      "resolver_defaults": {
        "mode": "design",
        "variant": "voicedesign",
        "voice": null
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-voicedesign",
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
