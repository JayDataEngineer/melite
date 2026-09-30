// @melite/models-anima/src — the anima family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
// the ctx.models augmentation rides the models service module
// (same seam as ctx.comfyui through ./service):
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import { t2i } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "anima",
  "form": "form_generate",
  "label": "Anima",
  "description": "Anime/illustration text-to-image. Cosmos-Predict2 base with Danbooru-style prompting.",
  "engine": "comfyui",
  "defaults": {
    "width": 1024,
    "height": 1024,
    "steps": 30,
    "sampler": "er_sde",
    "scheduler": "simple",
    "cfg": 4
  },
  "genre": "image",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "anima",
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "route": "anima",
          "vram_peak_gb": 20,
        }
      ]
    },
    {
      "id": "draft",
      "label": "Draft",
      "hint": "Steps 8 — the card schema's own default (fast draft iterations).",
      "group": "Recipe",
      "wire_defaults": { "steps": 8 },
      "cells": [],
    },
    {
      "id": "detailed",
      "label": "Detailed",
      "hint": "Steps 30 — the family DECL's own default (full-quality render; inside the card's 1–100 range).",
      "group": "Recipe",
      "wire_defaults": { "steps": 30 },
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
  "lane_inputs": {
    "clip_type": "stable_diffusion",
    "latent_node": "EmptyLatentImage",
    "sampling_shift": 0,
    "text_encoder": "qwen_3_06b_base.safetensors",
    "unet": "anima-base-v1.0.safetensors",
    "vae": "qwen_image_vae.safetensors"
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
        "cure": "every image lane states WHAT the picture is — write the prompt",
      },
    ],
  },
  // THE FAMILY DOOR (the atom vocabulary, stroke 0): the t2i
  // action's facts parse runs over this row and every variant
  // merge AT REGISTRATION — a drifted lane_input (a renamed latent
  // class, a bad variant override) refuses at boot in the door's
  // own voice, never at first compose.
  "actions": [t2i],

};

export const family: Plugin = {
  name: "family-anima",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The family's offered actions (the atom vocabulary): the t2i
// segment the image-gen card binds. The card imports this beside
// the DECL — the family's whole offer, one face.
export { t2i, parseT2IFacts, type T2IFacts, type T2IParams } from "./actions.ts";
