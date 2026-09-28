// families/image/joytag.ts — the joytag family declaration
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
  "id": "joytag",
  "form": "form_tagger",
  "label": "JoyTag",
  "description": "Booru keyword tagger (JoyTag lineage) — thresholded Danbooru tags with add/remove lists for recreation workflows. Torch lane, node-local checkpoint.",
  "engine": "comfyui",
  "defaults": {
    "threshold": 0.2,
    "add_tag": "",
    "remove_tag": ""
  },
  "genre": "image",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "joytag",
      "cells": [
        {
          "quant": "f32",
          "label": "F32",
          "route": "joytag",
          "vram_peak_gb": 4,
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
        "fields": ["input_image"],
        "cure": "a tagger inverts an image — nothing to tag is a refusal; state the image",
      },
    ],
  },

};

export const family: Plugin = {
  name: "family-joytag",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
