// families/image/joycaption.ts — the joycaption family declaration
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
  "id": "joycaption",
  "form": "form_tagger",
  "label": "JoyCaption",
  "description": "Stylized natural-language image captioning (JoyCaption beta-one, 8B VLM) — descriptive / SD-prompt / MJ / booru-list templates for recreating images in FLUX / Ideogram / image-edit.",
  "engine": "comfyui",
  "defaults": {
    "checkpoint": "fancyfeast/llama-joycaption-beta-one-hf-llava",
    "caption_type": "Descriptive",
    "caption_length": "long",
    "extra_option": ""
  },
  "genre": "image",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "joycaption",
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "route": "joycaption",
          "vram_peak_gb": 20,
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
  name: "family-joycaption",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
