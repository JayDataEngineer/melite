// families/3d/somax.ts — the somax family declaration
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
  "id": "somax",
  "label": "SOMAX",
  "description": "TRELLIS → SOMA weight transfer — image to SOMAX rigged GLB with anatomically correct SOMA-77 skeleton weights.",
  "engine": "",
  "form": "form_3d_somax",
  "card": "",
  "unoffered": false,
  "defaults": {
    "filename_prefix": "KimodoAnimated",
    "file_format": "glb",
    "decimate_ratio": 0.2,
    "preserve_texture": true,
    "in_place": true
  },
  "source": {
    "type": "",
    "repo_id": "nvidia/soma-x",
    "filename": null,
    "note": ""
  },
  "studio": {
    "tenant": "3d/body",
    "owns_params": false,
    "writes": [],
    "kind": "custom",
    "size": "normal",
    "layout": "studio"
  },
  "base_body": "",
  "genre": "3d",
  "mods": [],
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "hint": "",
      "group": "Variant",
      "route": "somax",
      "engine": "",
      "resolver_defaults": {},
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "somax",
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
  name: "family-somax",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};
