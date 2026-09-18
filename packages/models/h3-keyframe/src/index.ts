// families/video/h3-keyframe.ts — the h3-keyframe family declaration
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
  "id": "h3-keyframe",
  "form": "form_video_director",
  "label": "MiniMax H3 keyframe-to-video",
  "engine": "comfyui",
  "defaults": {
    "width": 768,
    "height": 448,
    "length": 56,
    "steps": 12
  },
  "genre": "video",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "h3-keyframe",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "h3-keyframe",
        }
      ]
    },
    {
      "id": "draft_02mp",
      "label": "Draft 02MP",
      "hint": "Draft geometry — 768×448: this family's own defaults and inside the card schema's own bounds (width 448–1344, height 448–768); the card's draft identity (Draft at 768x448x56f). The keyframe lane drafts here, anchored on its first-frame image.",
      "group": "Recipe",
      "wire_defaults": { "width": 768, "height": 448 },
      "cells": [],
    },
    {
      "id": "final_hd",
      "label": "Final HD",
      "hint": "Final geometry — 1344×768: the card schema's own defaults. The keyframe lane finishes here.",
      "group": "Recipe",
      "wire_defaults": { "width": 1344, "height": 768 },
      "cells": [],
    },
    {
      "id": "short_56f",
      "label": "Short 56f",
      "hint": "56 frames — this family's own length default and the card schema's own default, on the card's 17k+5 grid (22+17×2), inside its length bounds (22–362). A ~2.3s keyframe beat.",
      "group": "Recipe",
      "wire_defaults": { "length": 56 },
      "cells": [],
    },
    {
      "id": "long_124f",
      "label": "Long 124f",
      "hint": "124 frames — the card's produce identity (produce at 1344x768x124f), on the card's 17k+5 grid (22+17×6), inside its length bounds (22–362). A ~5.2s keyframe hold.",
      "group": "Recipe",
      "wire_defaults": { "length": 124 },
      "cells": [],
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
  "has_agent": true,
};

export const family: Plugin = {
  name: "family-h3-keyframe",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
