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
  "form": "form_3d_anny",
  "label": "Anny (character assembly)",
  "description": "Author a character body — 11 identity sliders (or attach a GLB, or load a preset), then render the 8-view turnaround sheet. Photo→body estimation rides the hmr-estimate verb (the MHR chain).",
  "engine": "comfyui",
  "defaults": {
    "resolution": 768,
    "framing": 1.2,
    "focal_length": 50,
    "samples": 64,
    "transparent": "true",
    "gender": 0.5,
    "age": 0.5,
    "muscle": 0.5,
    "weight": 0.5,
    "height": 0.5,
    "proportions": 0.5,
    "cupsize": 0.5,
    "firmness": 0.5,
    "african": 0.5,
    "asian": 0.5,
    "caucasian": 0.5
  },
  "source": {
    "type": "",
    "repo_id": "melite-poser-nodes",
    "note": "our own pack (vendor/comfyui_extensions/melite-poser-nodes) — the ray-era poser chain, stopgap arc 2026-09-04"
  },
  "studio": null,
  // (D-C7, 2026-09-28: "base_body" KILLED — the member had one
  // declarer (here) and zero readers since the parametric bake
  // landed (the neutral body IS the all-defaults bake; the GLB
  // staging path is the superseded 2026-09-04 phase-1 shape). A
  // claim nothing reads is a lie the walls audit caught green.)
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
      "id": "anny",
      "label": "Anny",
      "group": "",
      "route": "anny",
      "order": 0,
      "cells": []
    }
  ],
  "variant_groups": [],
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
