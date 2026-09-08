// families/audio/moss.ts — the MOSS family declaration: ONE model,
// three variants (the meld 2026-09-08 — operator order: moss-tts +
// moss_voicegenerator + moss-tts-local are one model: same
// architecture, same GGUF home. MOSS-SFX v2 is a DIFFERENT
// architecture — its own model, never a variant here).
//
// THE MUTATION SHAPE (operator orders 2026-09-08): the atom declares
// its identity ONCE (label 'MOSS', the GGUF repo + runtime shared by
// all three); variants are delta tokens; cells are QUANT tokens and
// ONLY THE QUANT CARRIES THE DOWNLOAD.
//
//   variant tts         (Nano 100M)
//     cell native       → route 'moss-tts'        (TTS Nano GGUF)
//   variant voicegen    (VoiceGenerator)
//     cell native       → route 'moss_voicegenerator' (VoiceGenerator GGUF)
//   variant tts-local   (Local Transformer v1.5)
//     cell native       → route 'moss-tts-local'  (Local v1.5 GGUF)
//
// The three flat ids survive as cell routes (the
// addressing-survival law — every runtime address unchanged).
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../../contract.ts";

export const DECL: ModelDecl = {
  "id": "moss",
  "label": "MOSS",
  "description": "MOSS text-to-speech — Nano, VoiceGenerator, and Local Transformer",
  "engine": "audio_cpp",
  "defaults": {
    "backend": "cuda"
  },
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
      "engine": "",
      "resolver_defaults": {},
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
      "engine": "",
      "resolver_defaults": {},
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
      "id": "tts-local",
      "label": "TTS Local",
      "description": "the Local Transformer v1.5 checkpoint",
      "hint": "",
      "group": "Variant",
      "route": "moss-tts-local",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "source": {
            "filename": "MOSS-TTS-Local-v1.5-GGUF"
          },
          "quant": "native",
          "label": "Native",
          "route": "moss-tts-local",
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
