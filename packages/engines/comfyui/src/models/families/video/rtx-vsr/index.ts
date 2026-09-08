// families/video/rtx-vsr.ts — the rtx-vsr family declaration
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
  "id": "rtx-vsr",
  "label": "Video Upscale",
  "description": ">-",
  "engine": "",
  "unoffered": true,
  "defaults": {
    "batch_size": 5,
    "cfg": 4,
    "color_match_enabled": true,
    "denoise": 0.3,
    "dit_model": "seedvr2_ema_3b_fp16.safetensors",
    "filename_prefix": "upscaled_video",
    "fps": 24,
    "seed": 0,
    "steps": 20,
    "upscaler_model": "4xNomos2_hq_dat2.pth",
    "vae_model": "ema_vae_fp16.safetensors",
    "mode": "rtx_vsr",
    "rtx_two_pass": true,
    "rtx_mode": "vsr",
    "target_resolution": 1080,
    "rtx_strength": 0.6
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
      "route": "rtx-vsr",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "rtx-vsr",
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
  "has_rubric": false
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-rtx-vsr",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
