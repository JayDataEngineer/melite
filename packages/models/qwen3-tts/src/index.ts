// families/audio/qwen3-tts — the 0.6B MODEL declaration (the
// operator's table: SIZES are models — this is the .6B; FLAVORS are
// variants — CustomVoice + Base ride here as variant lanes).
// Qwen3-TTS 12Hz 0.6B: CustomVoice synthesis (9 preset personas +
// instruct-text style control + .qvoice embedding load through the
// qvoice mod) and the Base 3-second voice clone from reference
// audio + transcript. The old qwen3-tts-base FAMILY is dead — Base
// is the 'qwen3-tts-base' variant ROUTE (old drafts keep resolving
// to the clone lane; the lane branch reads the merged lane_inputs,
// never the family id). Sibling family: models-qwen3-tts-
// voicedesign (the 1.7B model).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "qwen3-tts",
  "form": "form_tts",
  "label": "Qwen3-TTS 0.6B",
  "description": "Qwen3-TTS 12Hz 0.6B — the .6 checkpoint: CustomVoice synthesis with personas and style control, and the Base 3-second voice clone",
  "engine": "comfyui",
  "defaults": {
    "mode": "tts",
    "voice": "vivian",
    // THE VARIANT STAMP (the 1.7B mirror's own law): the family's
    // resting variant rides the defaults so the customvoice route's
    // model_defaults carries variant:'customvoice' — without it the
    // 0.6B form's variant-scoped rows (the voice picker, sampling)
    // hid on EVERY lane of this family.
    "variant": "customvoice"
  },
  "genre": "audio",
  // QVOICE SAVES AND LOADS ACROSS ALL qwen3-tts (operator
  // 2026-09-23): the load pack performs a saved persona on every
  // lane; the save pack fires the studio exporter from any lane
  // (the studio loads its own variants — no VoiceDesign variant is
  // claimed for the 0.6B, the 1:1 upstream table holds).
  "mods": [
    "qvoice",
    "qvoice_save"
  ],
  "variants": [
    {
      "id": "customvoice",
      "label": "CustomVoice",
      "description": "preset personas and instruct-text style control over the target timbre",
      "group": "Variant",
      "route": "qwen3-tts",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts",
        }
      ]
    },
    {
      "id": "base",
      "label": "Base",
      "description": "voice clone from a 3-second reference — no persona, no instruction control",
      "group": "Variant",
      "route": "qwen3-tts-base",
      // THE CLONE INTERCEPT (the fold: the dead family's lane truth
      // rides the variant — merged base ← variant at the derived
      // read, byte-identical graphs): the clone checkpoint address
      // + the clone lane key.
      "lane_inputs": {
        "model_path": "qwen3-tts",
        "synth_lane": "clone",
      },
      // THE RE-POINT (krea-2-raw precedent): a variant pick
      // resolves server-side to the route address; the NULL stamp
      // unsets the inherited persona (the voicedesign meld).
      // THE VARIANT STAMP (operator 2026-09-23, "base doesn't even
      // have the audio input"): resolver_defaults MUST carry
      // variant:'base' — the form's visible_when guards key on the
      // RESOLVED variant value (model_defaults ← this overlay), and
      // an unstamped route serves variant:'' — every variant-scoped
      // row (ref_audio/ref_text/sampling) hid on this lane forever.
      "resolver_defaults": {
        "model": "qwen3-tts-base",
        "variant": "base",
        "voice": null,
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-base",
        }
      ]
    },
    {
      "id": "steady_read",
      "label": "Steady Read",
      "hint": "Temperature 0.05 — the card schema's floor (the engine's positive-sampling minimum: the native node refuses 0).",
      "group": "Recipe",
      "wire_defaults": { "temperature": 0.05 },
      "cells": [],
    },
    {
      "id": "expressive_read",
      "label": "Expressive Read",
      "hint": "Temperature 2 — the card schema's own ceiling (maximum variation).",
      "group": "Recipe",
      "wire_defaults": { "temperature": 2 },
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
    "background_removal": "",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "",
    "family": "qwen3_tts",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
    "sampling_shift": 0,
    "synth_lane": "speak",
    "text_encoder": "",
    "texture_vae": "",
    "unet": null,
    "unet_quant": "",
    "unet_unconditional": "",
    "unet_variant": "",
    "vae": "",
    "weightless": false
  }
};

export const family: Plugin = {
  name: "family-qwen3-tts",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
