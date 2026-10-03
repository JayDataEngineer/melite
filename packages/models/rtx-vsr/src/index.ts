// families/video/rtx-vsr.ts — the rtx-vsr family declaration
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
  "id": "rtx-vsr",
  "form": "form_video_upscale",
  "label": "Video Upscale",
  "description": ">-",
  "unoffered": true,
  // No defaults: the declared-plane door's catch (2026-10-12) — the
  // family declares no actions, so it declares no write plane, and
  // the node-doc transcription block had no reader on this actionless family (the card owns the real knobs; mode is reserved).
  "genre": "video",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "rtx-vsr",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "rtx-vsr",
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
  // GHOST DEBT CLEARED (2026-10-12 model audit, fix 4): the
  // balanced preset's upscaler (h3_to_1080_balanced.yaml:15); the
  // seedvr2 pair it shares with h3/quality rides the seedvr2_ema
  // family's rows (one owner per weight).
  "provisions": [
    {
      "name": "4xNomos2_hq_dat2.pth",
      "url": "https://github.com/Phhofm/models/releases/download/4xNomos2_hq_dat2/4xNomos2_hq_dat2_150000.pth",
      "folder": "upscale_models",
      "sha256": "1f2be2b4786b5031776aed90e1818564f5576ab1e44da9355c7f3788ea25bdea",
      "size_bytes": 140196334
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
  name: "family-rtx-vsr",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
