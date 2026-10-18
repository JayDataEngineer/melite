// families/image/joytag.ts — the joytag family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { tag } from "./actions.ts";

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
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
  // user-provided seat(s) — the compose caller provides them. No
  // variant-class rows: this family's served face exposes no
  // steps+cfg pair (the census's surface-derived carve).
  "required_defaults": [
    { "name": "input_image", "class": "user" }
  ],
  // THE §4c RECEIPT (2026-10-12): the weights the pack loads — the
  // audit's ghost "model.safetensors (fancyfeast/joytag)" closed as
  // a provisions row: the estate store copy minted the sha (366 MB),
  // the HF resolve URL answers a ranged GET. lane_inputs names the
  // file so the ghost wall (weights ⊆ provisions) owns the relation
  // from now on.
  "provisions": [
    {
      "name": "model.safetensors",
      "url": "https://huggingface.co/fancyfeast/joytag/resolve/main/model.safetensors",
      "folder": "taggers/joytag",
      "sha256": "5304065c0e4fb26b265194fa2209b8dddfa2b9a7239397c1ae0f47649f91e293",
      "size_bytes": 366011736,
    },
  ],
  "lane_inputs": {
    "model_path": "model.safetensors",
  },
  // THE DECLARED HOME (the lane-presence cure): the store folder this
  // pack-specific lane file lives in — the run gate probes it at press
  // instead of dying untyped at the engine.
  "lane_homes": { "model_path": "taggers/joytag" },
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

  // THE LANE SURFACE (the z-image precedent): exactly the knobs the
  // tagger card serves — the face the four tagger families share.
  "params": [
    "input_image",
    "threshold", "character_threshold",
    "exclude_tags", "replace_underscore", "trailing_comma",
    "add_tag", "remove_tag",
    "caption_task", "caption_type", "caption_length", "extra_option",
  ],

  // THE FAMILY'S DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the tagger card binds this segment through ACTION_BINDINGS —
  // the admission gate runs the facts parse at registration.
  "actions": [tag],

};



export const family: Plugin = {
  name: "family-joytag",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The weightless door rides the kit spellings (DRY sweep C2, 2026-10-18);
// the old Tag* aliases are re-served for the family's consumers.
export { tag } from "./actions.ts";
export { parseWeightlessFacts as parseTagFacts, type WeightlessFacts as TagFacts, type WeightlessParams as TagParams } from "@melite/comfyui-card-kit";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
