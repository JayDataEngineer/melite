// families/audio/ace-step-sft.ts — the ace-step-sft family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../../contract.ts";

export const DECL: ModelDecl = {
  "id": "ace-step-sft",
  "label": "ACE-Step 1.5 SFT (Q8)",
  "description": "ACE-Step 1.5 sft q8 music generation (the finetune)",
  "engine": "audio_cpp",
  "form": "form_music",
  "card": "music-native",
  "unoffered": false,
  "defaults": {
    "backend": "cuda",
    "duration": 120,
    "sample_rate": 44100
  },
  "source": {
    "type": "huggingface",
    "repo_id": "audio-cpp/audio.cpp-gguf",
    "filename": "ACE-Step1.5-SFT-GGUF",
    "note": ""
  },
  "base_body": "",
  "genre": "audio",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "ace-step-sft",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "ace-step-sft",
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
  "variant_groups": [],
  "provisions": [],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-ace-step-sft",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
