// families/audio/qwen3-tts-voicedesign.ts — the qwen3-tts-voicedesign family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../../contract.ts";

export const DECL: ModelDecl = {
  "id": "qwen3-tts-voicedesign",
  "label": "Qwen3-TTS VoiceDesign 1.7B",
  "description": "Qwen3-TTS 12Hz VoiceDesign 1.7B — instruction-following voice design; the voice-lock lane",
  "engine": "comfyui",
  "form": "form_tts",
  "card": "voice-lock",
  "unoffered": false,
  "defaults": {
    "mode": "design",
    "variant": "voicedesign"
  },
  "base_body": "",
  "genre": "audio",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "qwen3-tts-voicedesign",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-voicedesign",
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
  "has_inference": false,
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
  name: "family-qwen3-tts-voicedesign",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
