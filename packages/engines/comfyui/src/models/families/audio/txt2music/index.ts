// families/audio/txt2music.ts — the txt2music family declaration
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
  "id": "txt2music",
  "label": "MiniMax Music 3 (txt2music)",
  "description": "MiniMax Music 3 text-to-music with lyrics (audio.cpp t2m)",
  "engine": "audio_cpp",
  "defaults": {
    "backend": "cuda",
    "duration": 120,
    "sample_rate": 44100
  },
  "source": {
    "type": "huggingface",
    "repo_id": "audio-cpp/MiniMax-Music3-GGUF",
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
      "route": "txt2music",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "source": {
            "filename": "MiniMax-Music3-GGUF"
          },
          "quant": "native",
          "label": "Native",
          "route": "txt2music",
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
  name: "family-txt2music",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
