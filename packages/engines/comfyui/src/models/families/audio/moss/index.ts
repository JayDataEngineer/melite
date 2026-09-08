// families/audio/moss.ts — the MOSS family declaration: ONE model,
// three variants (the meld 2026-09-08 — operator order: combine
// moss-sfx + moss-tts + moss_voicegenerator; they are one model).
//
// THE MUTATION SHAPE (operator orders 2026-09-08): the atom declares
// its identity ONCE (label 'MOSS', the GGUF repo home shared by the
// tts/voice pair); variants are delta tokens; cells are QUANT
// tokens and ONLY THE QUANT CARRIES THE DOWNLOAD. The family spans
// runtimes — the ENGINE rides the variant (comfyui sfx + audio_cpp
// GGUF), never the atom.
//
//   variant tts         (Nano 100M)
//     cell native       → route 'moss-tts'        (TTS Nano GGUF)
//   variant voicegen    (VoiceGenerator)
//     cell native       → route 'moss_voicegenerator' (VoiceGenerator GGUF)
//   variant sfx         (sound effects, the comfyui lane)
//     cell native       → route 'moss-sfx'
//
// The three flat ids survive as cell routes (the
// addressing-survival law — every runtime address unchanged).
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../../contract.ts";

export const DECL: ModelDecl = {
  "id": "moss",
  "label": "MOSS",
  "description": "MOSS audio — text-to-speech, voice design, and sound effects",
  "engine": "",
  "source": {
    "type": "huggingface",
    "repo_id": "audio-cpp/audio.cpp-gguf",
    "note": ""
  },
  "base_body": "",
  "genre": "audio",
  "mods": [],
  "variants": [
    {
      "id": "tts",
      "label": "TTS Nano",
      "description": "the Nano 100M checkpoint — plain text-to-speech",
      "hint": "",
      "group": "Variant",
      "route": "moss-tts",
      "engine": "audio_cpp",
      "resolver_defaults": {
        "backend": "cuda"
      },
      "cells": [
        {
          "source": {
            "filename": "MOSS-TTS-Nano-100M-GGUF"
          },
          "quant": "native",
          "label": "Native",
          "route": "moss-tts",
          "engine": "",
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "voicegen",
      "label": "VoiceGenerator",
      "description": "voice design",
      "hint": "",
      "group": "Variant",
      "route": "moss_voicegenerator",
      "engine": "audio_cpp",
      "resolver_defaults": {
        "backend": "cuda"
      },
      "cells": [
        {
          "source": {
            "filename": "MOSS-VoiceGenerator-GGUF"
          },
          "quant": "native",
          "label": "Native",
          "route": "moss_voicegenerator",
          "engine": "",
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "sfx",
      "label": "SFX",
      "description": "sound-effect generation — describe the SOUND not the scene",
      "hint": "",
      "group": "Variant",
      "route": "moss-sfx",
      "engine": "comfyui",
      "resolver_defaults": {},
      "lane_inputs": {
        "background_removal": "",
        "checkpoint": "",
        "clip_type": null,
        "clip_vision": "",
        "family": "moss_sfx_v2",
        "latent_node": "EmptySD3LatentImage",
        "model_path": "MOSS-SoundEffect-v2.0-src",
        "sampling_shift": 0,
        "text_encoder": "",
        "texture_vae": "",
        "unet": null,
        "unet_quant": "",
        "unet_unconditional": "",
        "unet_variant": "",
        "vae": "",
        "weightless": false
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "moss-sfx",
          "engine": "",
          "resolver_defaults": {},
          "hide_from_dropdown": false
        }
      ]
    },
    {
      "id": "default",
      "label": "Default",
      "hint": "The family default — no extra stamps; a fresh card lands here.",
      "group": "Recipe",
      "route": "",
      "engine": "",
      "resolver_defaults": {},
      "cells": [],
      "wire_defaults": {}
    }
  ],
  "variant_groups": [
    {
      "id": "Variant",
      "label": "Variant",
      "tooltip": "",
      "default": ""
    },
    {
      "id": "Quant",
      "label": "Quant",
      "tooltip": "",
      "default": ""
    },
    {
      "id": "Recipe",
      "label": "Recipe",
      "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft; Default stamps nothing.",
      "default": "default"
    }
  ],
  "provisions": [],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-moss",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
