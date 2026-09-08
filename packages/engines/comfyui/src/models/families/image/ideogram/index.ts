// families/image/ideogram.ts — the ideogram family declaration
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
  "id": "ideogram",
  "label": "Ideogram",
  "description": "Typography-aware text-to-image with clean, legible text rendering.",
  "engine": "comfyui",
  "form": "form_generate",
  "card": "ideogram4",
  "unoffered": false,
  "defaults": {
    "mu": 0.5,
    "std": 1.75,
    "width": 1024,
    "height": 1024,
    "steps": 20,
    "sampler": "euler",
    "cfg": 7
  },
  "studio": {
    "tenant": "image/canvas-ideogram",
    "owns_params": false,
    "writes": [],
    "kind": "custom",
    "size": "normal",
    "layout": "studio"
  },
  "base_body": "",
  "genre": "image",
  "mods": [],
  "variants": [
    {
      "id": "nf4",
      "label": "NF4",
      "hint": "nvfp4 mixed-precision — DEFAULT",
      "group": "Variant",
      "route": "ideogram",
      "engine": "",
      "order": 0,
      "resolver_defaults": {},
      "cells": []
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
  "provisions": [],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": "ideogram4",
    "clip_vision": "",
    "family": "",
    "latent_node": "EmptyFlux2LatentImage",
    "model_path": "",
    "sampling_shift": 0,
    "text_encoder": "qwen3vl_8b_nvfp4.safetensors",
    "texture_vae": "",
    "unet": "ideogram4_nvfp4_mixed.safetensors",
    "unet_quant": "",
    "unet_unconditional": "ideogram4_unconditional_nvfp4_mixed.safetensors",
    "unet_variant": "",
    "vae": "flux2-vae.safetensors",
    "weightless": false
  }
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-ideogram",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
