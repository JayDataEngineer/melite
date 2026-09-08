// families/other/see-through.ts — the see-through family declaration
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
  "id": "see-through",
  "label": "See-Through",
  "description": "See-Through anime layer decomposition — splits an image into character, clothing, and background layers.",
  "unoffered": true,
  "defaults": {
    "resolution": 1280,
    "resolution_depth": 768,
    "inference_steps": 30,
    "tblr_split": false,
    "seed": 42
  },
  "source": {
    "type": "",
    "repo_id": "layerdifforg/seethroughv0.0.2_layerdiff3d",
    "filename": null,
    "note": ""
  },
  "genre": "other",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "see-through",
      "cells": [
        {
          "quant": "native",
          "label": "Native (weightless)",
          "route": "see-through",
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
  name: "family-see-through",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
