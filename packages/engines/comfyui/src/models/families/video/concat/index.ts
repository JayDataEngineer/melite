// families/video/concat.ts — the concat family declaration
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
  "id": "concat",
  "label": "Media Merge",
  "description": ">-",
  "unoffered": true,
  "defaults": {
    "operation": "concat",
    "output_artifact": "video"
  },
  "genre": "video",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "concat",
      "cells": [
        {
          "quant": "native",
          "label": "Native (weightless)",
          "route": "concat",
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
  name: "family-concat",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
