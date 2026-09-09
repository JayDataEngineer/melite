// families/image/joytag.ts — the joytag family declaration
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
  "id": "joytag",
  "form": "form_tagger",
  "label": "JoyTag",
  "description": "Booru keyword tagger (JoyTag lineage) — thresholded Danbooru tags with add/remove lists for recreation workflows. Torch lane, node-local checkpoint.",
  "engine": "comfyui",
  "defaults": {
    "threshold": 0.2,
    "add_tag": "",
    "remove_tag": ""
  },
  "genre": "image",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "joytag",
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "route": "joytag",
          "vram_peak_gb": 4,
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
  name: "family-joytag",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
