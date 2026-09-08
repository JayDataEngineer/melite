// families/3d/step1x_texture.ts — the step1x_texture family declaration
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
  "id": "step1x_texture",
  "label": "Step1X-3D Texture",
  "description": "Diffusion-based 3D texture synthesis — 1 reference image → 6 multi-view images via SDXL ig2mv flow → baked onto UV atlas. Fills ALL surfaces (no coverage gaps unlike camera projection). 3.5B model, ~15s on 4090.",
  "engine": "",
  "form": "form_3d_step1x_texture",
  "card": "",
  "unoffered": false,
  "defaults": {
    "preset": "standard",
    "texture_size": 2048,
    "render_size": 2048,
    "remove_bg": false,
    "seed": 2025,
    "filename_prefix": "step1x_texture"
  },
  "base_body": "",
  "genre": "3d",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "step1x_texture",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "step1x_texture",
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
  name: "family-step1x_texture",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
