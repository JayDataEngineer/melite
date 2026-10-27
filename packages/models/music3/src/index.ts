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
// THE STEP↔CHECKPOINT TIER (audit 014 C4): the row's sampler stamps
// derive from the SAME module the compose action judges — one tier
// derivation, never two homes.
import { MUSIC3_FULL_STEPS, music3StepsEnvelope } from "./tier.ts";

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
      // THE STEP↔CHECKPOINT TIER (audit 014 C4): the row's stamps ARE
      // the tier derivation — the standard row's cells are full-
      // schedule bodies, so the envelope and the resolver default
      // spread from MUSIC3_FULL_STEPS. A distilled row lands its OWN
      // tier stamps (MUSIC3_DISTILLED_STEPS) or the step-tier wall
      // reds the divergent pairing.
      "sampler_envelope": music3StepsEnvelope(MUSIC3_FULL_STEPS, [0.1, 10]),
      // THE ACTION'S OWN SPELLING (the declared-plane door): this
      // family's action param is n_diffusion_steps (the card schema's
      // field) — the stamp seeds the compose body by this name.
      "resolver_defaults": { "n_diffusion_steps": MUSIC3_FULL_STEPS.default },
      "cells": [
        {
          // THE QUANT-AXIS LAW (E2-4): the first declared cell is the
          // variant default — the fp16 body the official template
          // composes (audit 014 C5: int8 was the only row, and the
          // template labels it "# For low VRAM"). The fp16 cell rides
          // the family lane_inputs below — the atom IS this tier's
          // load, so the cell carries no lane stamps of its own.
          "quant": "fp16",
          "label": "FP16",
          "route": "music3",
        },
        {
          // The low-VRAM body (the template's own note): an explicit
          // cell whose OWN route re-keys the address view so the
          // cell-lane cascade folds this unet at read (comfyui-cordis
          // service.ts getModel) — a stated int8 pick loads the int8
          // file, never the atom's. Its vram_peak_gb is the DECL's own
          // auditioned number and feeds the decode-tier derivation
          // (actions.ts deriveDecodeTier).
          "quant": "int8_convrot",
          "label": "INT8 ConvRot",
          "route": "music3-int8",
          "lane_inputs": {
            "unet": "minimax_music3_dit_int8_convrot.safetensors",
          },
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
  // THE LANE TRUTH (audit 014 C5): the atom's unet is the fp16 body
  // the official template composes — the family's default address
  // serves the template's own weights. The int8_convrot file moved to
  // its cell above (the low-VRAM pick owns its load); both bodies'
  // downloads ride the provisions rows (the audio families' shape —
  // no cell sources).
  "lane_inputs": {
    "clip_type": "minimax",
    "text_encoder": "minimax_music3_text_encoder_pruned_int8_convrot.safetensors",
    "unet": "minimax_music3_dit_fp16.safetensors",
    "vae": "minimax_music3_dav.safetensors"
  },
  // GHOST DEBT CLEARED (2026-10-12 model audit, fix 4): the lane's
  // three weights, provisioned from Comfy-Org's official Music-3 repo.
  "provisions": [
    {
      // THE TEMPLATE'S BODY (audit 014 C5): the fp16 DiT the official
      // template composes by default; digests are upstream's own HF
      // LFS metadata (api tree, 2026-11-12), never a local download.
      "name": "minimax_music3_dit_fp16.safetensors",
      "url": "https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/diffusion_models/minimax_music3_dit_fp16.safetensors",
      "folder": "diffusion_models",
      "sha256": "45494a2b6b69af115902ff28eaf54118d19067aa54da01000f3e3efce7ba0e34",
      "size_bytes": 4914197682
    },
    {
      // The template's low-VRAM body ("# For low VRAM", the note
      // verbatim) — the int8 cell's load.
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
    // THE DECODE TIER KNOB (audit 014 C3): stated, it overrides the
    // VRAM/size derivation; absent, the derivation decides (the
    // compose action owns the default — no second literal home).
    "tiled_decode",
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
export {
  MUSIC3_DISTILLED_STEPS,
  MUSIC3_FULL_STEPS,
  assertMusic3StepsInTier,
  music3StepTier,
  music3StepsEnvelope,
  type Music3StepTier,
  type Music3TierSteps,
} from "./tier.ts";
export { TILED_DURATION_CEIL_S, TILED_VRAM_FLOOR_GB, deriveDecodeTier, type DecodeTier } from "./decode.ts";

// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
