// families/motion/kimodo.ts — the kimodo family declaration
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
  "id": "kimodo",
  "label": "Kimodo (text → motion)",
  "description": "Kinematic motion diffusion (NVIDIA Kimodo-SOMA): text → SOMA-77 pose NPZ, chainable, skinnable onto rigged GLBs.",
  "engine": "comfyui",
  "defaults": {
    "cfg_type": "separated",
    "cfg_weight_a": 2.5,
    "cfg_weight_b": 5,
    "duration_sec": 5,
    "diffusion_steps": 25,
    "num_samples": 1,
    "num_transition_frames": 10,
    "seed": 42
  },
  "source": {
    "type": "",
    "repo_id": "nvidia/Kimodo-SOMA-RP-v1.1",
    "filename": null,
    "note": ""
  },
  "studio": {
    "tenant": "motion/motion-studio",
    "owns_params": false,
    "writes": [],
    "kind": "custom",
    "size": "normal",
    "layout": "studio"
  },
  "base_body": "",
  "genre": "motion",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "kimodo",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "kimodo",
          "engine": "",
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
      "name": "skin_standard.npz",
      "url": "https://raw.githubusercontent.com/nv-tlabs/kimodo/main/kimodo/assets/skeletons/somaskel77/skin_standard.npz",
      "folder": "somaskel77",
      "sha256": "90ee2cdf50f168382a7dd7e9c88b118298aba0aca4b72022080c89c4bab0ceb2",
      "size_bytes": 531434
    }
  ],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false,
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "",
    "family": "kimodo",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "Kimodo-SOMA-RP-v1.1",
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
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-kimodo",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
