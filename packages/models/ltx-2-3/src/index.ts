// families/video/ltx-2-3.ts — the ltx-2-3 family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "ltx-2-3",
  "label": "LTX 2.3",
  "description": ">-",
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
  "genre": "video",
  "variants": [
    {
      "id": "dev",
      "label": "Dev",
      "hint": "30-step base — highest quality, supports LoRA",
      "group": "Variant",
      "route": "ltx-2-3-dev",
      "order": 0,
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "ltx-2-3",
          "vram_peak_gb": 22,
        },
        {
          "quant": "fp8",
          "label": "FP8 Scaled",
          "route": "ltx-2-3-dev-fp8",
          "vram_peak_gb": 25,
        }
      ]
    },
    {
      "id": "distilled",
      "label": "Distilled",
      "hint": "8-step distilled — fast, CFG=1",
      "group": "Variant",
      "route": "ltx-2-3-distilled",
      "order": 1,
      "cells": [
        {
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "ltx-2-3-distilled",
          "vram_peak_gb": 22,
        },
        {
          "quant": "fp8",
          "label": "FP8 Scaled",
          "route": "ltx-2-3-distilled-fp8",
          "vram_peak_gb": 25,
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
};

export const family: Plugin = {
  name: "family-ltx-2-3",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
