// families/audio/qwen3-tts-voicedesign — the 1.7B MODEL declaration
// (the operator's table: SIZES are models — this is "the bigger
// TTS"; FLAVORS are variants). THE 1:1 LAW (operator 2026-09-23:
// match QwenLM/Qwen3-TTS released-models table exactly): upstream
// ships THREE 1.7B checkpoints — VoiceDesign, CustomVoice, Base —
// so this family carries all three as variants, each naming its
// OWN weights tree in lane_inputs.model_path.
// Only VoiceDesign names an upstream artifact (its
// snapshot_provisions row pins the repo the provisioner fetches).
// The CustomVoice and Base lanes load operator merges (placed by
// hand, stated below in hand_placed_weights).
// Sibling family: models-qwen3-tts (the 0.6B sizes: CustomVoice +
// Base variants).
//
// Upstream capability matrix this family serves:
//   1.7B-CustomVoice: generate_custom_voice(text, language,
//     speaker, instruct?) — personas + OPTIONAL instruct
//   1.7B-VoiceDesign: generate_voice_design(text, instruct) —
//     instruct required; .qvoice export through qvoice_save
//   1.7B-Base: generate_voice_clone(text, ref_audio, ref_text) —
//     3-second clone, no persona, no instruct; FT base
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import { speak, exportAction } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "qwen3-tts-voicedesign",
  "form": "form_tts",
  "label": "Qwen3-TTS 1.7B",
  "description": "Qwen3-TTS 12Hz 1.7B — the larger checkpoints 1:1 with upstream: CustomVoice personas with instruct, VoiceDesign with .qvoice export, Base 3-second clone",
  "engine": "comfyui",
  // THE C++ TASK STEER (2026-09-20, the 1.7B receipt stroke):
  // the VoiceDesign checkpoint refuses task tts LOUD (the C++
  // gate: a VoiceDesign-variant checkpoint only runs the
  // VoiceDesign task, task code "vdes"); extras.variant carries
  // the steer (ENGINE_TRUTH exempts it from card domains) and
  // Layer C maps variant → task. The family default is the
  // everyday lane (customvoice — personas + instruct, the
  // operator's large-model default); voicedesign stays a pick.
  "defaults": {
    "mode": "tts",
    "variant": "customvoice"
  },
  "genre": "audio",
  // HAND-PLACED WEIGHTS (the TTS chain audit T3, option 3 — the
  // 1.7B mirror of qwen3-tts's row): all three trees this family's
  // lanes load are stated here so no lane silently claims the estate
  // fetches them.
  // The VoiceDesign tree is FETCHABLE (its snapshot_provisions row
  // below pins the upstream repo + revision, and the provisioner
  // lands it).
  // The two merged trees (base + speaker tensors, the operator's
  // placed bytes) carry no upstream repo, so no snapshot row can
  // honestly name them and they stay hand-only.
  // The ghost wall (models-against-cards) judges every model_path
  // leaf against this row plus the snapshot rows.
  "hand_placed_weights": [
    "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged",
    "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
    "Qwen3-TTS-12Hz-1.7B-Base-merged",
  ],
  // THE DIRECTORY PROVISION (the model-families audit fix 8): the
  // VoiceDesign tree ships as a whole HF dir (config + weights +
  // speech_tokenizer), so no single-file provisions row can name it.
  // This row pins the upstream snapshot the provisioner fetches.
  // The merged trees carry no such row (no upstream repo exists for
  // an operator merge — stating one would be a lie).
  "snapshot_provisions": [
    {
      "name": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
      "folder": "audio/qwen3-tts/hf",
      "repo_id": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
      "revision": "5ecdb67327fd37bb2e042aab12ff7391903235d3",
      "allow_patterns": [
        "config.json",
        "model.safetensors",
        "speech_tokenizer/*",
        "tokenizer_config.json",
        "vocab.json",
        "merges.txt",
        "preprocessor_config.json",
        "generation_config.json",
      ],
    },
  ],
  "mods": [
    "qvoice",
    "qvoice_save"
  ],
  "variants": [
    {
      "id": "customvoice",
      "label": "CustomVoice",
      "description": "preset personas with optional instruct-text style control (the 1.7B instruct lane — upstream reserves instruction control for the large checkpoint)",
      "group": "Variant",
      "route": "qwen3-tts-voicedesign",
      // THE MERGED ADDRESS: the 1.7B CustomVoice lane loads the
      // operator's merged tree (base + speaker tensors, placed by
      // hand — no upstream repo ships this exact build).
      // The lane points at the real weights, never at a name nothing
      // provisioned.
      "lane_inputs": {
        "model_path": "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged",
      },
      // THE LANE SURFACE: the persona picker + the instruct-text
      // style control ride this lane (the 1.7B CustomVoice
      // checkpoint's own inputs, per upstream's capability matrix).
      // THE RELATION WORDS: an export performs nothing — a stated
      // delivery style on a save fires nothing at compose.
      "params": ["voice", "style_instruction"],
      "relations": {
      },
      "resolver_defaults": {
        "model": "qwen3-tts-voicedesign",
        "variant": "customvoice",
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-voicedesign",
        }
      ]
    },
    {
      "id": "voicedesign",
      "label": "VoiceDesign",
      "description": "design a voice from a description, export the .qvoice embedding",
      "group": "Variant",
      // THE DESIGN LANE'S OWN FLAT ROUTE (transcript-015: with the
      // head serving the family default — CustomVoice, the
      // operator's large-model default — a stated design variant
      // could never re-key the lane; the design lane had NO
      // address. Route law mirrors the base lane: <family>-<lane>).
      "route": "qwen3-tts-voicedesign-design",
      "lane_inputs": {
        "model_path": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
      },
      // THE LANE SURFACE: the design lane OWNS the export pair —
      // generate_voice_design(text, instruct, language) takes the
      // persona description as ITS instruct input (upstream's only
      // signature with one), and the .qvoice save needs the mod's
      // name. No persona, no reference, no delivery style rides it.
      // THE EXPORT PAIR IS REQUIRED HERE (2026-10-10, the DECL
      // audit's gap 3: the compose seat refused a design-lane row
      // with NEITHER half, but the family's together word fires only
      // when a member is STATED — so that state was admitted at the
      // bench and refused at the run, the GAP-7 shape one lane over).
      // The design lane exists to export: its required word says so.
      "params": ["design_prompt", "voice_name"],
      "relations": {
        "required": [
          {
            "fields": ["voice_name", "design_prompt"],
            "cure": "the design lane exports a voice — state the persona description and the Design mod's name (the save fires from this lane by definition)",
          },
        ],
      },
      "resolver_defaults": {
        "model": "qwen3-tts-voicedesign",
        "variant": "voicedesign",
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-voicedesign-design",
        }
      ]
    },
    {
      "id": "base",
      "label": "Base",
      "description": "voice clone from a 3-second reference — no persona, no instruction control; the fine-tune base checkpoint",
      "group": "Variant",
      // THE FLAT-ROUTE LAW (the flattener's wall: one owner per
      // route id): the 0.6B family owns 'qwen3-tts-base' — this
      // family's clone lane claims its OWN address.
      "route": "qwen3-tts-voicedesign-base",
      // THE CLONE INTERCEPT (the 0.6B family's fold, mirrored):
      // the clone checkpoint address + the clone lane key ride the
      // variant — merged base ← variant at the derived read. Same
      // hand-placed law as the customvoice lane above: real weights,
      // real address, placed by the operator.
      "lane_inputs": {
        "model_path": "Qwen3-TTS-12Hz-1.7B-Base-merged",
      },
      // THE RE-POINT + NULL STAMP: a variant pick resolves to this
      // family at the same route address; voice:null unsets any
      // inherited persona (the cloner has none).
      "resolver_defaults": {
        "model": "qwen3-tts-voicedesign",
        "variant": "base",
        "voice": null,
      },
      // THE LANE SURFACE: the clone reference pair rides this lane
      // only. THE RELATION WORDS: the clone needs one COMPLETE
      // source (the 0.6B mirror's law, verbatim).
      "params": ["ref_audio", "ref_text"],
      "relations": {
        "either_or": [
          {
            "groups": [["ref_audio", "ref_text"], ["qvoice"]],
            "cure": "the clone lane takes the 3-second reference + its transcript, or a Voice Embedding (the qvoice mod) — complete one of them",
          },
        ],
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "qwen3-tts-voicedesign-base",
        }
      ]
    }
  ],
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "default": "customvoice",
    },
    {
      "id": "Quant",
      "label": "Quant",
    }
  ],
  "has_inference": true,
  // THE PARAMETER SURFACE (2026-10-10, the fix shape 1; recut by the
  // SIGNATURE CANON, operator 2026-10-12): the family base names
  // what EVERY 1.7B lane accepts per upstream — the prompt plus the
  // generate() sampling kwargs (temperature/top_p/top_k/
  // repetition_penalty via _merge_generate_kwargs; speed/seed are
  // the engine's own rows). The persona-export pair does NOT ride
  // the base: upstream's generate_custom_voice(text, speaker,
  // language, instruct) and generate_voice_clone(text, language,
  // ref_audio, ref_text) take NO design prompt — the pair is the
  // VoiceDesign lane's own input (generate_voice_design(text,
  // instruct, language) + the save mod's name), declared on that
  // variant below. style_instruction is NOT in the base: only the
  // CustomVoice lane's checkpoint honors the instruct input.
  "params": [
    "text",
    "temperature",
    "top_p",
    "top_k",
    "speed",
    "repetition_penalty",
    "seed"
  ],
  // THE RELATION WORDS (family-wide — same save law as the 0.6B
  // mirror: the export pair rides together, and an export
  // conflicts with every performing input).
  "relations": {
    // `required: text` — the word the sibling family already
    // declares and this one owed (the audit's GAP 7: without it the
    // two families DISAGREED, the draft intersection went empty,
    // and a model-less tts row without text was bench-admitted
    // while the form refused it — a tts lane that speaks no words
    // is not a tts lane, whichever family composes it).
    "required": [
      {
        "fields": ["text"],
        "cure": "every tts lane speaks words — state the text to synthesize",
      },
    ],
    "together": [
      {
        "fields": ["voice_name", "design_prompt"],
        "cure": "the persona export needs both halves — name the voice (the save mod's Voice name) and describe it (Design description), or drop both",
      },
    ],
    "conflicts": [
      {
        "a": "voice_name",
        "b": "ref_audio",
        "cure": "an export designs a new voice — it clones no reference; drop the reference pair or drop the export",
      },
      {
        "a": "voice_name",
        "b": "qvoice",
        "cure": "an export creates a new voice — it performs no saved persona; drop the Voice Embedding or drop the export",
      },
      // THE SIBLING AGREEMENT (2026-10-10, the DECL audit's row 5):
      // the 0.6B family states voice_name×style_instruction at
      // FAMILY level; this family carried it only on the
      // customvoice variant, so the member-keyed intersection EMPTIED
      // and a model-less draft held the combination while every
      // boarded lane refused it (the surface or the variant word).
      // The row is true at this layer too — an export (voice_name)
      // is never styled while it is designed — stated here so the
      // siblings AGREE where the draft can read them.
      {
        "a": "voice_name",
        "b": "style_instruction",
        "cure": "an export creates the voice — it is styled on its performances, not while it is designed (drop the style, then style the voice when you perform it)",
      },
    ],
  },
  "lane_inputs": {
    "family": "qwen3_tts",
    "model_path": "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged",
  },
  // THE DECLARED HOME (the lane-presence cure): the store folder this
  // pack-specific lane file lives in — the run gate probes it at press
  // instead of dying untyped at the engine.
  "lane_homes": { "model_path": "qwen3_tts" },
  // THE DECLARED ACTIONS (the atom vocabulary, stroke 3):
  // the speak + export actions the tts card binds (the 1.7B lane tree).
  // The admission gate runs the facts parse at registration.
  "actions": [speak, exportAction],

};

export const family: Plugin = {
  name: "family-qwen3-tts-voicedesign",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { speak, exportAction, parseTtsFacts, laneTopologyOf, LANE_TOPOLOGY, type TtsFacts, type TtsParams, type TtsLaneTopology } from "./actions.ts";
// variantRoute re-exported from the base family (DRY sweep C1, 2026-10-18):
// byte-identical twins served two spellings; the base owns it.
export { variantRoute } from "@melite/models-qwen3-tts";
