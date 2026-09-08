// families/3d/mesh_refine.ts — the mesh_refine family declaration
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
  "id": "mesh_refine",
  "label": "UltraShape Mesh Refine",
  "description": "Image-guided coarse-mesh refinement (UltraShape 1.0 DiT) — carves sharp limb separation + hard-surface edges into blobby TRELLIS output using the SAME guide image the mesh was generated from. The pre-rig cleanup step: run BEFORE SOMAX so proximity-based weight transfer can't glue arm vertices to torso bones.",
  "unoffered": true,
  "defaults": {
    "box_v": 1,
    "mc_level": 0,
    "normalize_scale": 0.99,
    "num_latents": 32768,
    "num_sharp_points": 204800,
    "num_uniform_points": 204800,
    "preset": "standard",
    "dtype": "bfloat16",
    "low_vram": false,
    "steps": 50,
    "guidance_scale": 5,
    "octree_resolution": 384,
    "num_chunks": 8000,
    "remove_bg": false,
    "seed": 42,
    "file_format": "glb",
    "filename_prefix": "ultrashape_refined"
  },
  "genre": "3d",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "mesh_refine",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "mesh_refine",
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
  name: "family-mesh_refine",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
