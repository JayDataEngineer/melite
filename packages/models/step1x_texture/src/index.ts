// families/3d/step1x_texture.ts — the step1x_texture family declaration
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
  "id": "step1x_texture",
  "label": "Step1X-3D Texture",
  "description": "Diffusion-based 3D texture synthesis — 1 reference image → 6 multi-view images via SDXL ig2mv flow → baked onto UV atlas. Fills ALL surfaces (no coverage gaps unlike camera projection). 3.5B model, ~15s on 4090.",
  "unoffered": true,
  "defaults": {
    "preset": "standard",
    "texture_size": 2048,
    "render_size": 2048,
    "remove_bg": false,
    "seed": 2025,
    "filename_prefix": "step1x_texture"
  },
  "genre": "3d",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "step1x_texture",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "step1x_texture",
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
  name: "family-step1x_texture",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
