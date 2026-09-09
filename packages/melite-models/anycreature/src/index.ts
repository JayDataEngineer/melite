// families/3d/anycreature.ts — the anycreature family declaration
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
  "id": "anycreature",
  "label": "anyCreature",
  "description": "Text → game-ready 3D creature (JSON spec → skinned GLB)",
  "engine": "anycreature",
  "defaults": {
    "smooth_angle": 50,
    "build": "default",
    "ao": true,
    "role": "npc"
  },
  "genre": "3d",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "anycreature",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "anycreature",
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
  name: "family-anycreature",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
