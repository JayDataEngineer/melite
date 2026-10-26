// families/audio/music3.ts — the music3 family declaration
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
import { compose } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "music3",
  "form": "form_music",
  "label": "MiniMax Music 3",
  "description": "MiniMax Music 3 text-to-music with lyrics",
  "engine": "comfyui",
  "source": {
    "type": "huggingface",
    "repo_id": "Comfy-Org/MiniMax-Music-3",
    "note": ""
  },
  "genre": "audio",
  // THE REQUIRED DEFAULTS (operator contract 2026-11-07): The
  // user-provided seats (prompt, lyrics) — the compose caller
  // provides them. No variant-class rows: this family's served
  // face exposes no steps+cfg pair (the census's surface-derived
  // carve).
  "required_defaults": [
    { "name": "prompt", "class": "user" },
    { "name": "lyrics", "class": "user" }
  ],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "music3",
      "cells": [
        {
          // The stale source died (2026-10-13): the lane loads the
          // Comfy-Org safetensors the provisions rows carry, never a
          // GGUF tree.
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "music3",
          "vram_peak_gb": 20,
        }
      ]
    },
    {
      "id": "short-sting",
      "label": "Short Sting",
      "hint": "Duration 5s — the card schema's own floor (a sting or loop).",
      "group": "Recipe",
      "wire_defaults": { "duration": 5 },
      "cells": [],
    },
    {
      "id": "full-length",
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
  // GHOST DEBT CLEARED (2026-10-12 model audit, fix 4): the lane's
  // three weights, provisioned from Comfy-Org's official Music-3 repo.
  "provisions": [
    {
      "name": "minimax_music3_dit_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/diffusion_models/minimax_music3_dit_int8_convrot.safetensors",
      "folder": "diffusion_models",
      "sha256": "d6b959633e69899f99f3a92d6741c0fe79f26958a30811e50e372ef978b24d5f",
      "size_bytes": 2502161682
    },
    {
      "name": "minimax_music3_text_encoder_pruned_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/text_encoders/minimax_music3_text_encoder_pruned_int8_convrot.safetensors",
      "folder": "text_encoders",
      "sha256": "010b7416d2336a08c711bc22ee65849c9623069ddb7d89bec011a75699e52014",
      "size_bytes": 9196611886
    },
    {
      "name": "minimax_music3_dav.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/vae/minimax_music3_dav.safetensors",
      "folder": "vae",
      "sha256": "2a32155b769be01445fcc2a8663b910fc9e1751e18dc1c3ec528064512d9ef0c",
      "size_bytes": 216696128
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
        "fields": ["prompt"],
        "cure": "every music lane states WHAT the song is — write the caption",
      },
    ],
  },

  // THE LANE SURFACE (the z-image precedent): exactly the knobs this
  // lane fires. Mode left the surface (2026-11-08, the value-arm
  // cure): mode is the YuE2 ABC-planning vocabulary — this lane's
  // engine node declares no mode input — so the DECL stops serving
  // it and the write doors refuse a stated mode in the field's
  // voice; the compose action refuses what a legacy draft still
  // carries (actions.ts build).
  "params": [
    "prompt", "lyrics", "duration",
    "guidance_scale", "n_diffusion_steps", "lm_cfg_scale", "seed",
  ],

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

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
