// families/audio/music3.ts — the music3 family declaration
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
import { compose } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "music3",
  "form": "form_music",
  "label": "MiniMax Music 3",
  "description": "MiniMax Music 3 text-to-music with lyrics",
  "engine": "comfyui",
  "source": {
    "type": "huggingface",
    "repo_id": "audio-cpp/MiniMax-Music3-GGUF",
    "note": ""
  },
  "genre": "audio",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "music3",
      "cells": [
        {
          "source": {
            "filename": "MiniMax-Music3-GGUF"
          },
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "music3",
          "vram_peak_gb": 20,
        }
      ]
    },
    {
      "id": "short_sting",
      "label": "Short Sting",
      "hint": "Duration 5s — the card schema's own floor (a sting or loop).",
      "group": "Recipe",
      "wire_defaults": { "duration": 5 },
      "cells": [],
    },
    {
      "id": "full_length",
      "label": "Full Length",
      "hint": "Duration 360s — the card schema's own ceiling (full-song length).",
      "group": "Recipe",
      "wire_defaults": { "duration": 360 },
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
  "has_inference": true,
  "lane_inputs": {
    "clip_type": "minimax",
    "text_encoder": "minimax_music3_text_encoder_pruned_int8_convrot.safetensors",
    "unet": "minimax_music3_dit_int8_convrot.safetensors",
    "vae": "minimax_music3_dav.safetensors"
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
        "cure": "every music lane states WHAT the song is — write the caption",
      },
    ],
  },

  // THE DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the compose action the music card binds (the MiniMax Music 3 lane).
  // The admission gate runs the facts parse at registration.
  "actions": [compose],

};

export const family: Plugin = {
  name: "family-music3",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { compose, parseMusicFacts, type MusicFacts, type MusicParams } from "./actions.ts";
