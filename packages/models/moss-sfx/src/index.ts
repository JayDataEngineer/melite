// families/audio/moss-sfx.ts — the moss-sfx family declaration
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
import { sfx } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "moss-sfx",
  "form": "form_sound",
  "label": "MOSS-SFX v2",
  "description": "MOSS-SFX v2 sound-effect generation — describe the SOUND not the scene",
  "engine": "comfyui",
  "genre": "audio",
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): the
  // user-provided seat(s) — the compose caller provides them. No
  // variant-class rows: this family's served face exposes no
  // steps+cfg pair (the census's surface-derived carve).
  "required_defaults": [
    { "name": "prompt", "class": "user" }
  ],
  // HAND-PLACED WEIGHTS: the MOSS-SoundEffect v2 source tree (the
  // checkpoint + its code layout, upstream's src distribution) has
  // no per-file download URL a provisions row could name — the
  // operator places the tree; this row declares it so the lane's
  // model_path never silently claims the estate fetches it. The
  // ghost wall (models-against-cards) judges the leaf against this
  // entry.
  "hand_placed_weights": [
    "MOSS-SoundEffect-v2.0-src",
  ],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "moss-sfx",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "moss-sfx",
        }
      ]
    },
    {
      "id": "one-shot",
      "label": "One Shot",
      "hint": "Duration 0.5s — the card schema's own floor (a single hit).",
      "group": "Recipe",
      "wire_defaults": { "duration": 0.5 },
      "cells": [],
    },
    {
      "id": "ambience-bed",
      "label": "Ambience Bed",
      // THE RE-SPEC (audit S2, 2026-11-10): the recipe sold 300s, a
      // duration the pipeline refuses (max_inference_seconds=30) — a
      // dead button. The intent (a long bed) survives AT the engine's
      // own ceiling: 30s is the longest bed a single run serves.
      "hint": "Duration 30s — the pipeline's max_inference_seconds ceiling (the longest bed a single run serves).",
      "group": "Recipe",
      "wire_defaults": { "duration": 30 },
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
    "family": "moss_sfx_v2",
    "model_path": "MOSS-SoundEffect-v2.0-src"
  },
  // THE DECLARED HOME (the lane-presence cure): the store folder this
  // pack-specific lane file lives in — the run gate probes it at press
  // instead of dying untyped at the engine.
  "lane_homes": { "model_path": "audiocpp" },
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
        "cure": "every sfx lane states WHAT the sound is — describe the sound, not the scene",
      },
    ],
  },

  // THE LANE SURFACE (the z-image precedent): exactly the knobs the
  // sfx card serves.
  "params": [
    "prompt", "guidance_scale", "n_diffusion_steps", "duration", "seed",
  ],

  // THE DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the sfx action the sfx card binds (the MOSS-SoundEffect lane).
  // The admission gate runs the facts parse at registration.
  "actions": [sfx],

};

export const family: Plugin = {
  name: "family-moss-sfx",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { sfx, parseSfxFacts, type SfxFacts, type SfxParams } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
