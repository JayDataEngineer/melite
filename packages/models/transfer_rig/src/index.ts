// families/3d/transfer_rig.ts — the transfer_rig family declaration
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
import { transfer } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "transfer_rig",
  "form": "form_img_to_mesh",
  "label": "Transfer Rig",
  "description": "Copy rig from source GLB onto target GLB via GPU KNN.",
  "engine": "comfyui",
  "genre": "3d",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "transfer_rig",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "transfer_rig",
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
    "model_path": "somaskel77/skin_standard.npz"
  },
  // the transfer action the img-to-mesh card binds (the rig-copy
  // lane tree).
  "actions": [transfer],
};

export const family: Plugin = {
  name: "family-transfer_rig",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { transfer } from "./actions.ts";
