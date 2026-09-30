// families/3d/autoremesher.ts — the autoremesher family declaration
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
import { remesh } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "autoremesher",
  "form": "form_quad_remesh",
  "label": "AutoRemesher",
  "description": "AI triangle soup → clean quad topology (explicit budget, no silent defaults).",
  "engine": "comfyui",
  "genre": "3d",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "autoremesher",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "autoremesher",
        }
      ]
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
    }
  ],
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "",
    "texture_vae": "",
    "unet": null,
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "",
    "weightless": true
  },
  // the remesh action the quad-remesh card binds (the single-node
  // lane tree).
  "actions": [remesh],
};

export const family: Plugin = {
  name: "family-autoremesher",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { remesh } from "./actions.ts";
