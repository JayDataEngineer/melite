// families/image/joycaption.ts — the joycaption family declaration
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
  "id": "joycaption",
  "label": "JoyCaption",
  "description": "Stylized natural-language image captioning (JoyCaption beta-one, 8B VLM) — descriptive / SD-prompt / MJ / booru-list templates for recreating images in FLUX / Ideogram / image-edit.",
  "engine": "comfyui",
  "form": "form_tagger",
  "card": "tagger",
  "unoffered": false,
  "defaults": {
    "checkpoint": "fancyfeast/llama-joycaption-beta-one-hf-llava",
    "caption_type": "Descriptive",
    "caption_length": "long",
    "extra_option": ""
  },
  "base_body": "",
  "genre": "image",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "joycaption",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "route": "joycaption",
          "engine": "",
          "vram_peak_gb": 20,
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
  "has_rubric": false,
  "lane_inputs": {}
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-joycaption",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
