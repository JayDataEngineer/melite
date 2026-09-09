// families/other/gem_soma.ts — the gem_soma family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui/models-service";
import type { ModelDecl } from "@melite/comfyui/model-contract";

export const DECL: ModelDecl = {
  "id": "gem_soma",
  "label": "SOMA",
  "description": "GEM-X SOMA pose estimation and retargeting.",
  "engine": "comfyui",
  "unoffered": true,
  "defaults": {
    "scheduler": "simple",
    "width": 1024,
    "height": 1024,
    "steps": 25,
    "sampler": "euler",
    "cfg": 7
  },
  "source": {
    "type": "",
    "repo_id": "nvidia/soma-x",
    "filename": null,
    "note": ""
  },
  "genre": "other",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "gem_soma",
      "cells": [
        {
          "quant": "native",
          "label": "Native (weightless)",
          "route": "gem_soma",
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
  name: "family-gem_soma",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
