// families/audio/moss-sfx.ts — the moss-sfx family declaration
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
import { sfx } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "moss-sfx",
  "form": "form_sound",
  "label": "MOSS-SFX v2",
  "description": "MOSS-SFX v2 sound-effect generation — describe the SOUND not the scene",
  "engine": "comfyui",
  "genre": "audio",
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
      "id": "one_shot",
      "label": "One Shot",
      "hint": "Duration 0.5s — the card schema's own floor (a single hit).",
      "group": "Recipe",
      "wire_defaults": { "duration": 0.5 },
      "cells": [],
    },
    {
      "id": "ambience_bed",
      "label": "Ambience Bed",
      "hint": "Duration 300s — the card schema's own ceiling (a long bed).",
      "group": "Recipe",
      "wire_defaults": { "duration": 300 },
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
