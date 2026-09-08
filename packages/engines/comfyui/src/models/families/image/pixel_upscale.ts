// families/image/pixel_upscale.ts — the pixel_upscale family declaration
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
  "id": "pixel_upscale",
  "label": "Pixel Upscaler",
  "description": ">-",
  "engine": "",
  "card": "",
  "unoffered": true,
  "defaults": {
    "batch_size": 5,
    "cfg": 7.5,
    "denoise": 0.4,
    "detection_threshold": 0.35,
    "downscale_first": 1,
    "filename_prefix": "upscaled",
    "guide_size": 512,
    "inpaint_region": "free",
    "max_size": 1024,
    "resolution": 2048,
    "seed": 0,
    "steps": 50,
    "target_scale": 4,
    "mode": "upscale"
  },
  "base_body": "",
  "genre": "image",
  "mods": [],
  "variants": [
    {
      "id": "grl",
      "label": "",
      "hint": "",
      "group": "Variant",
      "route": "pixel_apisr_grl",
      "engine": "",
      "resolver_defaults": {},
      "cells": []
    },
    {
      "id": "rrdb",
      "label": "",
      "hint": "",
      "group": "Variant",
      "route": "pixel_apisr_rrdb",
      "engine": "",
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-pixel_upscale",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
