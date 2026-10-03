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
import { compose, estimate, estimate_commercial, bake } from "./actions.ts";

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
    },
    {
      "name": "sam_vit_b_01ec64.pth",
      "url": "https://dl.fbaipublicfiles.com/segment_anything/sam_vit_b_01ec64.pth",
      "folder": "sams",
      "sha256": "ec2df62732614e57411cdcf32a23ffdf28910380d03139ee0f4fcbe91eb8c912",
      "size_bytes": 375042383
    }
  ],
  "lane_inputs": {
    "model_path": "sam_vit_b_01ec64.pth"
  },
  // the family's declared actions: the compose action the anny card
  // binds (the turnaround lane tree), plus the estimator/bake
  // backends the hmr-estimate and preset-load verbs drive through
  // the queue (family-owned nodes — the flow rows route, never
  // re-author, the graphs; SubActionMod law, stroke 89).
  "actions": [compose, estimate, estimate_commercial, bake],
};

export const family: Plugin = {
  name: "family-anny",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { compose, estimate, estimate_commercial, bake } from "./actions.ts";
