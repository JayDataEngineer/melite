// families/video/wan-vace.ts — the wan-vace family declaration
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
  "id": "wan-vace",
  "label": "Wan2.2 VACE",
  "description": "Wan2.2 VACE video generation with reference-frame and mask control.",
  "engine": "comfyui",
  "form": "form_video_director",
  "card": "video-gen",
  "unoffered": false,
  "defaults": {
    "width": 832,
    "height": 480,
    "length": 49,
    "fps": 24,
    "steps": 4,
    "cfg": 1,
    "sampler": "euler",
    "scheduler": "simple",
    "seed": 42
  },
  "base_body": "",
  "genre": "video",
  "mods": [],
  "variants": [
    {
      "id": "base",
      "label": "Base",
      "hint": "DEFAULT — 25-step HIGH fp8 checkpoint, director-quality",
      "group": "Variant",
      "route": "wan-vace",
      "engine": "",
      "order": 0,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "custom_fast",
      "label": "Custom Fast",
      "hint": "6-step + lightx2v distill LoRA on the base HIGH model",
      "group": "Variant",
      "route": "wan-vace",
      "engine": "",
      "order": 2,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "custom_quality",
      "label": "Custom Quality",
      "hint": "30-step HIGH expert — maximum detail",
      "group": "Variant",
      "route": "wan-vace",
      "engine": "",
      "order": 1,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "lightning",
      "label": "Lightning",
      "hint": "4-step + Wan Lightning LoRA on the base HIGH model (~6× faster)",
      "group": "Variant",
      "route": "wan-vace",
      "engine": "",
      "order": 3,
      "resolver_defaults": {},
      "cells": []
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
    "clip_type": "wan",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "umt5_xxl_fp8_e4m3fn_converted.safetensors",
    "texture_vae": "",
    "unet": "Wan2_2_VACE_A14B_HIGH_fp8_e4m3fn_scaled_KJ_merged.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "Wan2_1_VAE_bf16.safetensors",
    "weightless": false
  }
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-wan-vace",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
