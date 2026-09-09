// families/audio/moss-sfx.ts — the moss-sfx family declaration
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
  "id": "moss-sfx",
  "label": "MOSS-SFX v2",
  "description": "MOSS-SFX v2 sound-effect generation — describe the SOUND not the scene",
  "engine": "comfyui",
  "genre": "audio",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "moss-sfx",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "moss-sfx",
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
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "",
    "family": "moss_sfx_v2",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "MOSS-SoundEffect-v2.0-src",
    "sampling_shift": 0,
    "text_encoder": "",
    "texture_vae": "",
    "unet": null,
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-moss-sfx",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
