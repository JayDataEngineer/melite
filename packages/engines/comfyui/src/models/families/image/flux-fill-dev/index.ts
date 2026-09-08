// families/image/flux-fill-dev.ts — the flux-fill-dev family declaration
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
  "id": "flux-fill-dev",
  "label": "Inpaint",
  "description": "Dual-engine masked region inpainting — FLUX.1-Fill (dedicated fill arch) or LanPaint on any base model.",
  "engine": "",
  "form": "form_inpaint",
  "card": "",
  "unoffered": false,
  "defaults": {
    "inpaint_context_pad": 64,
    "inpaint_detail": "crop+stitch",
    "inpaint_edge_extend": 0,
    "inpaint_target_size": 1024,
    "outpaint_bottom": 0,
    "outpaint_left": 0,
    "outpaint_overlap": 16,
    "outpaint_right": 0,
    "outpaint_top": 0,
    "refine_denoise": 0.4,
    "mode": "replace",
    "steps": 20,
    "cfg": 1,
    "guidance": 30,
    "sampler": "euler",
    "scheduler": "normal",
    "seed": 42,
    "mask_grow": 8,
    "mask_feather": 8,
    "mask_threshold": 0,
    "mask_invert": false
  },
  "base_body": "",
  "genre": "image",
  "mods": [],
  "variants": [
    {
      "id": "onereward",
      "label": "OneReward",
      "hint": "SOTA true-CFG RLHF fine-tune (non-commercial license)",
      "group": "Variant",
      "route": "flux-fill-onereward",
      "engine": "",
      "order": 0,
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
  name: "family-flux-fill-dev",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
