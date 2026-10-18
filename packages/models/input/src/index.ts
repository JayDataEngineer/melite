// families/image/input.ts — the input family declaration
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
import { prep } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "input",
  "form": "form_input",
  "label": "Input Prep",
  "description": "Source intake: attach an image or audio file (upload, asset drop, prior run) — staged, optionally transformed, emitted as a media artifact for downstream cards to wire.",
  "engine": "comfyui",
  "genre": "image",
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
  // user-provided seat(s) — the compose caller provides them. No
  // variant-class rows: this family's served face exposes no
  // steps+cfg pair (the census's surface-derived carve).
  "required_defaults": [
    { "name": "source", "class": "user" }
  ],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "input",
      "cells": [
        {
          "quant": "native",
          "label": "Native (weightless)",
          "route": "input",
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
  "accepts": [
    "image",
    "audio"
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
        "fields": ["source"],
        "cure": "the staged source rides: an upload, an asset drop, a prior-run artifact, or an input-dir filename",
      },
    ],
  },

  // THE LANE SURFACE (the z-image precedent): exactly the knobs the
  // input-prep card serves — the staged source plus the crop/scale
  // tail (scale_model: the studio-card directive's model choice,
  // 2026-11-08).
  "params": [
    "source", "media_type",
    "crop_x", "crop_y", "crop_width", "crop_height",
    "scale_width", "scale_height", "scale_method", "scale_model",
  ],

  // THE FAMILY'S DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the input-prep card binds this segment through ACTION_BINDINGS —
  // the admission gate runs the facts parse at registration.
  "actions": [prep],

};



export const family: Plugin = {
  name: "family-input",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { prep, parsePrepFacts, SCALE_METHODS, UPSCALE_MODELS, SCALE_MODEL_OPTIONS, MIN_DIM, type PrepFacts, type PrepParams } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
