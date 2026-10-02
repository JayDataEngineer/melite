// @melite/models-mask/src — the mask family declaration (the F1
// mint, operator order 2026-10-12: the mask card's tool lane becomes
// a real family atom). This file IS the family's truth — a change
// here is a family change, nothing else moves.
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
// the ctx.models augmentation rides the models service module
// (same seam as ctx.comfyui through ./service):
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import { select } from "./actions.ts";

// THE TOOL FAMILY (the F1 shape): a selection tool, not a generative
// model — `unoffered: true` registers the atom (the actions admission
// gate runs at boot; the card's declaredAction binding resolves
// against it) while serving no catalog row, so no model dropdown
// gains a selection tool as a pickable base. The family id is
// mask-select, NOT the card's id — the h3 pattern (family h3, card
// h3-timeline): the card's id must keep resolving to the CARD (the
// form-spec door asks the models seat first, and a family key
// shadows the card arm — discovery.spec's mask envelope wall catches
// exactly that), and the bench plane keeps the self-naming strip for
// era rows. The three weights are the family's constants (actions.ts
// MASK_WEIGHTS — the LANE_FILES pattern), so the row carries no
// lane_inputs. ONE variant, ONE address, no cells: the family's id
// is its own route — an address with no download, because the
// weights ride the card's provisions, not a variant cell.
export const DECL: ModelDecl = {
  "id": "mask-select",
  "label": "Mask",
  "description": "The mask studio's selection lane — SAM3 CLIP/RT-DETR detection, the SAM2 impact-pack arm, and paint exports, as one declared action the mask card binds.",
  "genre": "image",
  "unoffered": true,
  "variants": [
    {
      "id": "select",
      "label": "Select",
      "group": "Variant",
      "route": "mask-select",
      "cells": [],
    },
  ],
  // THE FAMILY DOOR (the atom vocabulary, stroke 0): the select
  // action's facts parse runs over the family row and every variant
  // merge AT REGISTRATION — here it closes over the family's own
  // weight constants (an empty row is the family's whole truth).
  "actions": [select],
};

export const family: Plugin = {
  name: "family-mask",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

// The family's offered actions (the atom vocabulary): the select
// segment the mask card binds. The card imports this beside the DECL
// — the family's whole offer, one face.
export { select, parseMaskLaneFacts, MASK_WEIGHTS, type MaskLaneFacts, type MaskLaneParams } from "./actions.ts";
