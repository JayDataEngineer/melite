// families/image/anima.ts — the anima family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../contract.ts";

export const DECL: ModelDecl = {
  "id": "anima",
  "label": "Anima",
  "description": "Anime/illustration text-to-image. Cosmos-Predict2 base with Danbooru-style prompting.",
  "engine": "comfyui",
  "form": "form_generate",
  "card": "image-gen",
  "unoffered": false,
  "defaults": {
    "width": 1024,
    "height": 1024,
    "steps": 30,
    "sampler": "er_sde",
    "scheduler": "simple",
    "cfg": 4
  },
  "base_body": "",
  "genre": "image",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "anima",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "route": "anima",
          "engine": "",
          "vram_peak_gb": 20,
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": "stable_diffusion",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptyLatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "qwen_3_06b_base.safetensors",
    "texture_vae": "",
    "unet": "anima-base-v1.0.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "qwen_image_vae.safetensors",
    "weightless": false
  }
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-anima",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
