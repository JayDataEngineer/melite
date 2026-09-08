// families/video/ltx-2-3.ts — the ltx-2-3 family declaration
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
  "id": "ltx-2-3",
  "label": "LTX 2.3",
  "description": ">-",
  "engine": "",
  "unoffered": true,
  "defaults": {
    "width": 1280,
    "height": 720,
    "frames": 97,
    "fps": 24,
    "steps": 30,
    "sampler": "euler",
    "scheduler": "simple",
    "cfg": 3,
    "seed": 42
  },
  "base_body": "",
  "genre": "video",
  "mods": [],
  "variants": [
    {
      "id": "dev",
      "label": "Dev",
      "hint": "30-step base — highest quality, supports LoRA",
      "group": "Variant",
      "route": "ltx-2-3-dev",
      "engine": "",
      "order": 0,
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "ltx-2-3",
          "engine": "",
          "vram_peak_gb": 22,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        },
        {
          "quant": "fp8",
          "label": "FP8 Scaled",
          "route": "ltx-2-3-dev-fp8",
          "engine": "",
          "vram_peak_gb": 25,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "distilled",
      "label": "Distilled",
      "hint": "8-step distilled — fast, CFG=1",
      "group": "Variant",
      "route": "ltx-2-3-distilled",
      "engine": "",
      "order": 1,
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "ltx-2-3-distilled",
          "engine": "",
          "vram_peak_gb": 22,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        },
        {
          "quant": "fp8",
          "label": "FP8 Scaled",
          "route": "ltx-2-3-distilled-fp8",
          "engine": "",
          "vram_peak_gb": 25,
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
  name: "family-ltx-2-3",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
