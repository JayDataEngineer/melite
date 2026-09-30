// families/image/pixel_upscale.ts — the pixel_upscale family declaration
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
  "id": "pixel_upscale",
  "label": "Pixel Upscaler",
  "description": ">-",
  "unoffered": true,
  // No defaults: the declared-plane door's catch (2026-10-12) — the
  // family declares no actions, so it declares no write plane, and
  // the node-doc transcription block had no reader on this actionless family (mode is a reserved coordinate; the card owns the real knobs).
  "genre": "image",
  "variants": [
    {
      "id": "grl",
      "label": "",
      "group": "Variant",
      "route": "pixel_apisr_grl",
      "cells": []
    },
    {
      "id": "rrdb",
      "label": "",
      "group": "Variant",
      "route": "pixel_apisr_rrdb",
      "cells": []
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
  name: "family-pixel_upscale",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
