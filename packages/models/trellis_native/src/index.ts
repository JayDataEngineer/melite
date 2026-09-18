// families/3d/trellis_native.ts — the trellis_native family declaration
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
  "id": "trellis_native",
  "form": "form_3d_trellis_native",
  "label": "Trellis (Native)",
  "description": "Native trellis.cpp GGML engine — image to UV-textured GLB with the C++ postprocess (weld, fill, DC remesh, CuMesh QEM, xatlas, trilinear PBR bake). 50s per asset on the 4090; no confetti.",
  "unoffered": true,
  "defaults": {
    "resolution": "1024",
    "quant": "q8",
    "bg_removal": "auto",
    "band": 0,
    "texture_size": 2048,
    "webp_quality": 90,
    "filename_prefix": "trelliscpp",
    "seed": 42
  },
  "source": {
    "type": "",
    "repo_id": "ilintar/trellis2-gguf",
    "filename": null,
    "note": ""
  },
  "genre": "3d",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "trellis_native",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "trellis_native",
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
  name: "family-trellis_native",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
