// families/audio/qwen3-tts — the 0.6B MODEL declaration (the
// operator's table: SIZES are models — this is the .6B; FLAVORS are
// variants — CustomVoice + Base ride here as variant lanes).
// Qwen3-TTS 12Hz 0.6B: CustomVoice synthesis (9 preset personas +
// .qvoice embedding load through the qvoice mod) and the Base
// 3-second voice clone from reference audio + transcript. The old
// qwen3-tts-base FAMILY is dead — Base
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
import { speak, exportAction } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "qwen3-tts",
  "form": "form_tts",
  "label": "Qwen3-TTS 0.6B",
  "description": "Qwen3-TTS 12Hz 0.6B — the .6 checkpoint: CustomVoice synthesis with personas, and the Base 3-second voice clone",
  "engine": "comfyui",
  "defaults": {
    "mode": "tts",
    "voice": "vivian",
    // THE VARIANT STAMP (the 1.7B mirror's own law): the family's
    // resting variant rides the defaults so every derived row's
    // model_defaults names its lane. The guard-era consequence (the
    // form's visible_when rows hiding) is GONE — visibility is the
    // declared surface now — but the stamp itself is load-bearing
    // twice over: it is the selection's default coordinate, and the
    // lane judge reads the resolved variant to pick the surface.
    "variant": "customvoice"
  },
  "genre": "audio",
  // THE LANE DECLARATION (2026-10-10, the YOU_ARE_A_LIAR fix
  // shapes 1+2: the model is the author of what it accepts — no
  // per-model field table in the card, no visible_when guard list).
  // `params` is the parameter SURFACE every lane of this family
  // accepts; each variant's `params` add to it (add-never-subtract);
  // `relations` are the four words, judged at bench-write and in the
  // form, in the field's own voice.
  "params": [
    "text",
    "temperature",
    "top_p",
    "top_k",
    "speed",
    "repetition_penalty",
    "seed",
    "design_prompt",
    "voice_name",
  ],
  "relations": {
    // THE REQUIRED WORD, USED (2026-10-10, the design audit's Q2 — the
    // vocabulary could not say "this lane needs words", so the card
    // carried the law in imperative code the bench never saw). A tts
    // lane with no text composes nothing: the node's text input IS the
    // generation. Stated as a law it refuses at bench-write in the
    // field's voice, on every seat — and the blank law's tolerance
    // (a state still being typed is not a refusal) is exactly the case
    // this row overrides, deliberately and by name.
    "required": [
      {
        "fields": ["text"],
        "cure": "every tts lane speaks words — state the text to synthesize",
      },
    ],
    // THE EXPORT PAIR (incident A, operator 2026-10-10): the studio
    // exporter fires only when the persona description and the save
    // mod's name BOTH ride — a design_prompt without voice_name is
    // not an authoring state, it is the exact state the run refused
    // after the form happily built it.
    "together": [
      {
        "fields": ["voice_name", "design_prompt"],
        "cure": "the persona export needs both halves — name the voice and describe it, or drop both",
      },
    ],
    // an export performs nothing beside a clone: the exporter runs
    // the DESIGN lane; a reference clone runs the Base table.
    "conflicts": [
      {
        "a": "voice_name",
        "b": "ref_audio",
        "cure": "a reference clone performs the text — the exporter clones no reference (drop the export or drop the reference)",
      },
      {
        "a": "voice_name",
        "b": "style_instruction",
        "cure": "an export creates the voice — it is styled on its performances, not while it is designed (drop the style, then style the voice when you perform it)",
      },
      {
        "a": "voice_name",
        "b": "qvoice",
        "cure": "a saved persona performs the text — the exporter performs nothing beside it (drop the export or drop the .qvoice)",
      },
    ],
  },
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
      "description": "preset personas over the target timbre",
      "group": "Variant",
      "route": "qwen3-tts",
      // the persona picker is THIS lane's own input (the 0.6B has no
      // instruction control — the 1.7B CustomVoice adds style_instruction)
      "params": ["voice"],
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
      // THE CLONE LANE'S OWN INPUTS (the 0.6B: reference in, the
      // speaker's voice out — no persona, no instruction control)
      "params": ["ref_audio", "ref_text"],
      "relations": {
        // ONE COMPLETE SOURCE: the reference PAIR (audio + its
        // transcript) or a saved .qvoice persona. Armed only when a
        // member is stated — a blank authoring lane is in progress,
        // never a write refusal.
        "either_or": [
          {
            "groups": [["ref_audio", "ref_text"], ["qvoice"]],
            "cure": "state one complete source: the reference PAIR (audio + transcript) or a .qvoice persona",
          },
        ],
      },
      // THE CLONE INTERCEPT (the fold: the dead family's lane truth
      // rides the variant — merged base ← variant at the derived
      // read, byte-identical graphs): the clone checkpoint address
      // + the clone lane key. The address points INTO the hf tree
      // (transcript-014: the bare container dir 'qwen3-tts' holds
      // only hf/ — the C++ load gate refuses it; the 0.6B Base
      // weights sit one level down with top-level safetensors).
      "lane_inputs": {
        "model_path": "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base",
      },
      // THE RE-POINT (krea-2-raw precedent): a variant pick
      // resolves server-side to the route address; the NULL stamp
      // unsets the inherited persona (the voicedesign meld).
      // THE VARIANT STAMP (operator 2026-09-23, "base doesn't even
      // have the audio input"): resolver_defaults MUST carry
      // variant:'base'. The guards that once keyed on the RESOLVED
      // value are gone; the stamp is now the SELECTION's coordinate
      // (an unstamped route picks the family head) and the lane
      // surface's key — and `voice: null` is what keeps the persona
      // default off a lane whose surface does not declare it.
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
    "family": "qwen3_tts",
    "model_path": "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
  },
  // THE DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the speak + export actions the tts card binds (the 0.6B lane tree).
  // The admission gate runs the facts parse at registration.
  "actions": [speak, exportAction],

};

export const family: Plugin = {
  name: "family-qwen3-tts",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

/**
 * A VARIANT'S OWN ROUTE ADDRESS (2026-10-10, the card audit's M5):
 * a card that boards a route used to retype the address string, so
 * a rename here left the card boarding an address that resolves to
 * nothing — and the failure is at RUN, not at compile. The DECL owns
 * its routes; this reads them. Returns '' when the variant declares
 * no route (a recipe row, say), so a caller can filter honestly
 * rather than board an empty address.
 */
export function variantRoute(decl: { variants?: ReadonlyArray<{ id: string; route?: string }> }, variantId: string): string {
  const row = (decl.variants ?? []).find((v) => v.id === variantId)
  return typeof row?.route === 'string' ? row.route : ''
}


export { speak, exportAction, parseTtsFacts, laneTopologyOf, LANE_TOPOLOGY, PRESET_SPEAKERS, type TtsFacts, type TtsParams, type TtsLaneTopology } from "./actions.ts";
