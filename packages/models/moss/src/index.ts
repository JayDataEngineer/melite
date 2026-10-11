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
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";

export const DECL: ModelDecl = {
  "id": "moss",
  "label": "MOSS",
  "description": "MOSS text-to-speech — Nano, VoiceGenerator, and Local Transformer",
  "engine": "audio_cpp",
  // No defaults: the declared-plane door's catch (2026-10-12) — the
  // family declares no actions, so it declares no write plane, and
  // the engine lane owns its own backend choice.
  "source": {
    "type": "huggingface",
    "repo_id": "audio-cpp/audio.cpp-gguf",
    "note": ""
  },
  "genre": "audio",
  "variants": [
    {
      "id": "tts",
      "label": "TTS Nano",
      "description": "the Nano 100M checkpoint — plain text-to-speech",
      "group": "Variant",
      "route": "moss-tts",
      // THE WEIGHTS TRUTH (operator order 2026-10-13, "we can't just
      // have models exist on disk"): the lane's file, pinned to its
      // upstream artifact — CLI-verified sha256 + size.
      "lane_inputs": {
        "model_path": "MOSS-TTS-Nano-100M-GGUF/moss-tts-nano-100m-bf16.gguf"
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "moss-tts",
          "artifact": {
            "source_url": "https://huggingface.co/audio-cpp/audio.cpp-gguf/resolve/main/MOSS-TTS-Nano-100M-GGUF/moss-tts-nano-100m-bf16.gguf",
            "size_bytes": 332423040,
            "sha256": "249a7eb9a8ae2e919946971e8270960f6657c0fbc06c5c7c4929b94af83ade0b",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "audio/MOSS-TTS-Nano-100M-GGUF",
            "size_hint_gb": 0.4
          }
        }
      ]
    },
    {
      "id": "voicegen",
      "label": "VoiceGenerator",
      "description": "voice design",
      "group": "Variant",
      "route": "moss_voicegenerator",
      // THE WEIGHTS TRUTH (operator order 2026-10-13, "we can't just
      // have models exist on disk"): the lane's file, pinned to its
      // upstream artifact — CLI-verified sha256 + size.
      "lane_inputs": {
        "model_path": "MOSS-VoiceGenerator-GGUF/moss_voicegen_bf16_codec_f16_decode.gguf"
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "moss_voicegenerator",
          "artifact": {
            "source_url": "https://huggingface.co/audio-cpp/audio.cpp-gguf/resolve/main/MOSS-VoiceGenerator-GGUF/moss_voicegen_bf16_codec_f16_decode.gguf",
            "size_bytes": 6022979936,
            "sha256": "5ae9477178606dfc283bb7dcbed1cea0f6a1005d9d35c654f88194100ef7f0fd",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "audio/MOSS-VoiceGenerator-GGUF",
            "size_hint_gb": 6.1
          }
        }
      ]
    },
    {
      "id": "tts-local",
      "label": "TTS Local",
      "description": "the Local Transformer v1.5 checkpoint",
      "group": "Variant",
      "route": "moss-tts-local",
      // THE WEIGHTS TRUTH (operator order 2026-10-13, "we can't just
      // have models exist on disk"): the lane's file, pinned to its
      // upstream artifact — CLI-verified sha256 + size.
      "lane_inputs": {
        "model_path": "MOSS-TTS-Local-v1.5-GGUF/moss-tts-local-v1.5-bf16.gguf"
      },
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "moss-tts-local",
          "artifact": {
            "source_url": "https://huggingface.co/audio-cpp/audio.cpp-gguf/resolve/main/MOSS-TTS-Local-v1.5-GGUF/moss-tts-local-v1.5-bf16.gguf",
            "size_bytes": 13367797280,
            "sha256": "9ff6c86f3d4cfbd227cc1b7618e3e016aaa129686f9939fe422a49e0e7369415",
            "dest_root": "COMFYUI_ROOT",
            "dest_sub": "audio/MOSS-TTS-Local-v1.5-GGUF",
            "size_hint_gb": 13.5
          }
        }
      ]
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
};

export const family: Plugin = {
  name: "family-moss",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
