// families/audio/qwen3-tts-voicedesign — the 1.7B MODEL declaration
// (the operator's table: SIZES are models — this is "the bigger
// TTS"; FLAVORS are variants). THE 1:1 LAW (operator 2026-09-23:
// match QwenLM/Qwen3-TTS released-models table exactly): upstream
// ships THREE 1.7B checkpoints — VoiceDesign, CustomVoice, Base —
// so this family carries all three as variants, each naming its
// OWN upstream artifact in lane_inputs.model_path. Autoprovision
// owns download: naming the artifact is the whole contract (the
// 1.7B-VoiceDesign receipt, 2026-09-23 — no disk copy existed when
// the design runs landed; resolve downloaded it). Sibling family:
// models-qwen3-tts (the 0.6B sizes: CustomVoice + Base variants).
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
      // THE SNAPSHOT ADDRESS (transcript-014's sibling hole): the
      // 1.7B CustomVoice weights ship only as the HF cache snapshot
      // (top-level safetensors one level down) — the lane points at
      // the real weights, never at a name nothing provisioned.
      "lane_inputs": {
        "model_path": "qwen3-tts/hf/models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice/snapshots/0c0e3051f131929182e2c023b9537f8b1c68adfe",
        "synth_lane": "speak",
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
      "route": "qwen3-tts-voicedesign",
      "lane_inputs": {
        "model_path": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "synth_lane": "design",
      },
      "resolver_defaults": {
        "model": "qwen3-tts-voicedesign",
        "variant": "voicedesign",
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
      // snapshot law as the customvoice lane above: real weights,
      // real address.
      "lane_inputs": {
        "model_path": "qwen3-tts/hf/models--Qwen--Qwen3-TTS-12Hz-1.7B-Base/snapshots/fd4b254389122332181a7c3db7f27e918eec64e3",
        "synth_lane": "clone",
      },
      // THE RE-POINT + NULL STAMP: a variant pick resolves to this
      // family at the same route address; voice:null unsets any
      // inherited persona (the cloner has none).
      "resolver_defaults": {
        "model": "qwen3-tts-voicedesign",
        "variant": "base",
        "voice": null,
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
  "lane_inputs": {
    "background_removal": "",
    "checkpoint": "",
    "clip_type": null,
    "clip_vision": "",
    "family": "qwen3_tts",
    "latent_node": "EmptySD3LatentImage",
    "model_path": "qwen3-tts/hf/models--Qwen--Qwen3-TTS-12Hz-1.7B-CustomVoice/snapshots/0c0e3051f131929182e2c023b9537f8b1c68adfe",
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
  name: "family-qwen3-tts-voicedesign",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
