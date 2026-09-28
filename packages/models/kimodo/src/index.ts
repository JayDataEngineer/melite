// families/motion/kimodo.ts — the kimodo family declaration
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
  "id": "kimodo",
  "form": "form_motion_kimodo",
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
    "note": ""
  },
  "studio": {
    "tenant": "motion/motion",
    "owns_params": false,
    "writes": [],
    "kind": "custom",
    "size": "normal",
    "layout": "studio"
  },
  "genre": "motion",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "kimodo",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "kimodo",
        }
      ]
    },
    {
      "id": "draft",
      "label": "Draft",
      "hint": "Diffusion steps 10 — the card schema's own floor (fastest draft; more steps = smoother arcs).",
      "group": "Recipe",
      "wire_defaults": { "diffusion_steps": 10 },
      "cells": [],
    },
    {
      "id": "polished",
      "label": "Polished",
      "hint": "Diffusion steps 200 — the card schema's own ceiling (smoothest arcs).",
      "group": "Recipe",
      "wire_defaults": { "diffusion_steps": 200 },
      "cells": [],
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
      "name": "skin_standard.npz",
      "url": "https://raw.githubusercontent.com/nv-tlabs/kimodo/main/kimodo/assets/skeletons/somaskel77/skin_standard.npz",
      "folder": "somaskel77",
      "sha256": "90ee2cdf50f168382a7dd7e9c88b118298aba0aca4b72022080c89c4bab0ceb2",
      "size_bytes": 531434
    }
  ],
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
  },
  // THE REQUIRED WORD, STATED (2026-10-10, the DECL audit's gap 4 —
  // the GAP-7 shape on the legacy lanes): the card's compose seat has
  // refused this field since the merge, imperatively, while the bench
  // admitted the same draft — a state the form could build and the run
  // refused. Stated as the law, the bench-write door refuses it first,
  // in the field's voice (the tts precedent: this is the one relation
  // word that deliberately overrides the blank tolerance, and this
  // field is exactly the one where "still being typed" composes
  // nothing).
  "relations": {
    "required": [
      {
        "fields": ["prompt"],
        "cure": "every motion lane generates FROM a text prompt — write it",
      },
    ],
  },

};

export const family: Plugin = {
  name: "family-kimodo",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
