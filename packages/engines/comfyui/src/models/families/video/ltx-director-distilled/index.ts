// families/video/ltx-director-distilled.ts — the ltx-director-distilled family declaration
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
  "id": "ltx-director-distilled",
  "label": "LTX 2.3",
  "description": "LTX 2.3 text- and image-to-video generation via the Director workflow.",
  "engine": "",
  "unoffered": true,
  "defaults": {
    "anchor_strength": 0.7,
    "audio_mode": "none",
    "auto_snap_ic_grid": true,
    "base_denoise": 1,
    "crop": "center",
    "director_guide_enabled": false,
    "divisible_by": 32,
    "force_retake_mode": false,
    "guide_strength": 3,
    "ic_lora_name": "None",
    "ic_lora_strength": 1,
    "image_attention_strength": 1,
    "img_compression": 18,
    "inpaint_audio": false,
    "lipsync_strength": 3,
    "ltx_chunk_feedforward": false,
    "ltx_context_length": 145,
    "ltx_context_overlap": 40,
    "ltx_context_windows": false,
    "ltx_ff_chunks": 2,
    "ltx_sage_attention": false,
    "ltx_sage_triton": true,
    "output_format": "mp4",
    "override_audio": false,
    "relay_epsilon": 0.001,
    "resize_method": "maintain aspect ratio",
    "retake_apply_global": false,
    "retake_enabled": false,
    "retake_start_frame": 0,
    "retake_strength": 1,
    "scale_by": 1,
    "start_frame": 0,
    "tile_overlap": 64,
    "tile_size": 256,
    "torch_compile": false,
    "upscale_cfg": 1,
    "upscale_denoise": 0.3,
    "upscale_enabled": false,
    "upscale_method": "bicubic",
    "upscale_steps": 10,
    "use_custom_motion": true,
    "use_tiled_encode": false,
    "width": 1280,
    "height": 720,
    "sampling_steps": 8,
    "sampler": "euler",
    "guide_scale": 3,
    "frames": 97,
    "fps": 24,
    "scheduler": "beta",
    "negative_prompt": null
  },
  "base_body": "",
  "genre": "video",
  "mods": [],
  "variants": [
    {
      "id": "dev",
      "label": "Dev FP8",
      "hint": "30+ step, max quality — different checkpoint",
      "group": "Variant",
      "route": "ltx-director-dev",
      "engine": "",
      "order": 1,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "distilled",
      "label": "Distilled",
      "hint": "8-step, ~3s/segment on a 4090 — fast preview tier",
      "group": "Variant",
      "route": "ltx-director-distilled",
      "engine": "",
      "order": 0,
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "legacy",
      "label": "LTX-2 (legacy)",
      "hint": "Legacy standard route — same distilled-1.1 checkpoint as the head; folded in from video/ltx2 (2026-08-16 combine), hidden",
      "group": "Variant",
      "route": "ltx2",
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
  "has_rubric": false
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-ltx-director-distilled",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
