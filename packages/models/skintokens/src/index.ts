// families/3d/skintokens.ts — the skintokens family declaration
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
  "id": "skintokens",
  "label": "SkinTokens",
  "description": "Static mesh GLB → generated skeleton + learned skin weights → rigged GLB (TokenRig on GGML, CPU)",
  "engine": "skintokens",
  "defaults": {
    "device": "cpu",
    "postprocess": false
  },
  "genre": "3d",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "skintokens",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "skintokens",
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
};

export const family: Plugin = {
  name: "family-skintokens",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
