// families/audio/yue2.ts — the yue2 family declaration (YuE2-3B,
// the Comfy-Org release; boarded 2026-09-20 on the music card).
// Hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves.
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
//
// ENGINE TRUTH (the shipped template, audio_yue2_text2music):
// ONE checkpoint carries model+clip+vae (CheckpointLoaderSimple —
// lane_inputs.checkpoint, the only non-empty file row); the music
// LLM plans ABC (YuE2GenerateABC, mode full/melody) then conditions
// (YuE2GenerateMusic — its seconds output sizes the latent);
// KSampler dpm_2/sgm_uniform at cfg 1; VAEDecodeAudio.
import type { Plugin } from "@deepseek-ai/cordis";
import { ModelsServiceFace } from '@melite/comfyui-card-kit/service-faces'
import type { ModelDecl } from '@melite/comfyui-card-kit/model-contract'
import { compose } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "yue2",
  "form": "form_music",
  "label": "YuE2",
  "description": "YuE2-3B music generation — style + lyrics with ABC planning",
  "engine": "comfyui",
  "source": {
    "type": "huggingface",
    "repo_id": "Comfy-Org/YuE2",
    "note": "The official Comfy-Org release (template audio_yue2_text2music); int8 convrot is the template's own quant pick. The bf16 cell and the SheetSage2 cover encoder stay unboarded until a cover lane exists."
  },
  "genre": "audio",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "yue2",
      "cells": [
        {
          // The stale source died (2026-10-13): the lane loads the
          // Comfy-Org checkpoint the provisions row carries.
          "quant": "int8",
          "label": "INT8 ConvRot",
          "route": "yue2",
          "vram_peak_gb": 8,
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
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "has_inference": true,
  "lane_inputs": {
    "checkpoint": "yue2_3b_int8_convrot.safetensors"
  },
  "provisions": [
    {
      "name": "yue2_3b_int8_convrot.safetensors",
      "url": "https://huggingface.co/Comfy-Org/YuE2/resolve/main/checkpoints/yue2_3b_int8_convrot.safetensors",
      "folder": "checkpoints",
      "sha256": "96fe199377309001ed8cd26a944baeee8cc31a20ba7c36d1d3c0a7e1f4149db6",
      "size_bytes": 3960938800
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

  // THE LANE SURFACE (the z-image precedent): exactly the knobs the
  // music card serves.
  "params": [
    "prompt", "lyrics", "duration", "mode",
    "guidance_scale", "n_diffusion_steps", "lm_cfg_scale", "seed",
  ],

  // THE DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the compose action the music card binds (the YuE2-3B lane).
  // The admission gate runs the facts parse at registration.
  "actions": [compose],

};

export const family: Plugin = {
  name: "family-yue2",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { compose, parseYue2Facts, type Yue2Facts, type Yue2Params } from "./actions.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
