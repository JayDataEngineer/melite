// families/video/scail2-animate.ts — the scail2-animate family declaration
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
  "id": "scail2-animate",
  "label": "SCAIL-2",
  "description": "SCAIL-2 character animation — drives a reference character from a video and colored mask.",
  "engine": "comfyui",
  "form": "form_video_director",
  "card": "video-gen",
  "unoffered": false,
  "defaults": {
    "width": 480,
    "height": 480,
    "length": 25,
    "fps": 24,
    "steps": 12,
    "cfg": 5,
    "pose_strength": 1,
    "sampler": "euler",
    "scheduler": "simple",
    "seed": 42
  },
  "base_body": "",
  "genre": "video",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "scail2-animate",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "fp8",
          "label": "FP8",
          "route": "scail2-animate",
          "engine": "",
          "vram_peak_gb": 24,
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
    "clip_type": "wan",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "umt5_xxl_fp8_e4m3fn_converted.safetensors",
    "texture_vae": "",
    "unet": "scail2_14B_fp8_scaled.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "Wan2_1_VAE_bf16.safetensors",
    "weightless": false
  }
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-scail2-animate",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
