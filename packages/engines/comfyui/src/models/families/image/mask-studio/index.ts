// families/image/mask-studio.ts — the mask-studio family declaration
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
  "id": "mask-studio",
  "label": "Mask",
  "description": "Selection-only mask card: RT-DETR proposes, SAM3 refines → named class masks for inpaint flows.",
  "engine": "comfyui",
  "defaults": {
    "output_mode": "segm",
    "detect_mode": "body",
    "detection_threshold": 0.35,
    "sam_threshold": 0.93,
    "sam_dilation": 0,
    "export_face": false,
    "export_hands": false,
    "export_body": false,
    "export_paint": false,
    "sam3_prompt": null,
    "export_boxes": true,
    "instance_filter": "all",
    "max_instances": 0,
    "outputs": "[]"
  },
  "source": {
    "type": "",
    "repo_id": "facebook/sam-vit-base",
    "filename": null,
    "note": ""
  },
  "studio": {
    "tenant": "image/mask_studio",
    "owns_params": true,
    "writes": [
      "input_image",
      "detect_mode",
      "detection_threshold",
      "sam_threshold",
      "sam_dilation",
      "output_mode",
      "sam3_prompt",
      "export_boxes",
      "export_face",
      "export_hands",
      "export_body",
      "export_paint",
      "paint_mask",
      "instance_filter",
      "max_instances",
      "outputs",
      "roi"
    ],
    "kind": "custom",
    "size": "normal",
    "layout": "studio"
  },
  "base_body": "",
  "genre": "image",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "mask-studio",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "route": "mask-studio",
          "engine": "",
          "vram_peak_gb": 12,
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps; a fresh card lands here.",
      "group": "Recipe",
      "route": "",
      "engine": "",
      "resolver_defaults": {},
      "cells": [],
      "wire_defaults": {}
    }
  ],
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "tooltip": "",
      "default": ""
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "",
      "default": ""
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
      "name": "rt_detr_v4-x-hgnet_fp32.safetensors",
      "url": "https://huggingface.co/Comfy-Org/SDPose/resolve/main/diffusion_models/rt_detr_v4-x-hgnet_fp32.safetensors",
      "folder": "diffusion_models",
      "sha256": "1ba4a7794c2f8b176327c887ba38fbe0f977049cbef149960288aa923d0239f3"
    }
  ],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "sam3.1_multiplex_fp16.safetensors",
    "clip_type": null,
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "",
    "texture_vae": "",
    "unet": "rt_detr_v4-x-hgnet_fp32.safetensors",
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "",
    "weightless": false
  }
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-mask-studio",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
