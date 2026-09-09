// families/3d/anny.ts — the anny family declaration
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
  "id": "anny",
  "label": "Anny (character assembly)",
  "description": "Assemble a character — composite body/hair/outfit GLBs, render the 8-view turnaround, segment a source photo into part sprites.",
  "engine": "comfyui",
  "defaults": {
    "resolution": 768,
    "framing": 1.2,
    "focal_length": 50,
    "samples": 64,
    "transparent": true
  },
  "source": {
    "type": "",
    "repo_id": "melite-poser-nodes",
    "filename": null,
    "note": "our own pack (vendor/comfyui_extensions/melite-poser-nodes) — the ray-era poser chain, stopgap arc 2026-09-04"
  },
  "studio": {
    "tenant": "3d/anny",
    "owns_params": false,
    "writes": [
      "body_glb",
      "source_image",
      "sculpt",
      "resolution",
      "framing",
      "focal_length",
      "samples",
      "transparent"
    ],
    "kind": "assembly",
    "size": "normal",
    "layout": "studio"
  },
  "base_body": "anny-base-body.glb",
  "genre": "3d",
  "mods": [
    "hmr-estimate",
    "preset-save",
    "preset-load",
    "dress",
    "prop"
  ],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "anny",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "anny",
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
  "provisions": [
    {
      "name": "anny-base-body.glb",
      "url": "https://huggingface.co/ProtoPomp/anny/resolve/main/anny/anny-base-body.glb",
      "folder": "anny",
      "sha256": "989eed67a59a4397ac61693e968bcea34504735d2e298eaa1885df6048a95b96",
      "size_bytes": 494404
    }
  ],
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "",
    "family": "anny",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "sam_vit_b_01ec64.pth",
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
  name: "family-anny",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
