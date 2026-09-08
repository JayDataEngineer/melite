// families/audio/moss_voicegenerator.ts — the moss_voicegenerator family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelDecl } from "../../contract.ts";

export const DECL: ModelDecl = {
  "id": "moss_voicegenerator",
  "label": "MOSS VoiceGenerator",
  "description": "MOSS VoiceGenerator voice design",
  "engine": "audio_cpp",
  "form": "form_tts",
  "card": "",
  "unoffered": false,
  "defaults": {
    "backend": "cuda"
  },
  "source": {
    "type": "huggingface",
    "repo_id": "audio-cpp/audio.cpp-gguf",
    "filename": "MOSS-VoiceGenerator-GGUF",
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
      "route": "moss_voicegenerator",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
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
  "loras": [],
  "provisions": [],
  "accepts": [],
  "canvas_default": false,
  "has_agent": false,
  "has_inference": false,
  "has_rubric": false
} as unknown as ModelDecl;

export const family: Plugin = {
  name: "family-moss_voicegenerator",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
