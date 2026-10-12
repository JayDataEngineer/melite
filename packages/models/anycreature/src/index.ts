// families/3d/anycreature.ts — the anycreature family declaration
// (generated 2026-09-08 from the frozen registry + facts, then
// hand-owned: this file IS the family's truth — a change here is a
// family change, nothing else moves).
//
// PLUGIN SHAPE (the discharge stroke): every family is a plugin
// declaring itself through ctx.models.registerFamily inside
// ctx.effect — fiber-owned, revertible, transactional at boot.
import type { Plugin } from "@deepseek-ai/cordis";
import type { ModelsService } from "@melite/comfyui-cordis/models-service";
import type { ModelDecl } from "@melite/comfyui-cordis/model-contract";
import { bind } from "./actions.ts";

export const DECL: ModelDecl = {
  "id": "anycreature",
  "form": "form_forge",
  "label": "anyCreature",
  "description": "anyCreature skeleton bind — bind a static mesh onto an anyCreature template GLB (weightless: the caller brings both GLBs)",
  "engine": "anycreature",
  // UNOFFERED + WEIGHTLESS (the family-coverage cure, 2026-10-12):
  // the family's own actions.ts holds the truth — "the family is
  // weightless (the skeletons ride in the caller's own GLB; nothing
  // is downloaded)". The former description ("text → game-ready 3D
  // creature") over-claimed a forge action the family does not
  // offer — its only action is `bind`, composed by the rig card's
  // species lane. Without the unoffered flag the wall classed it
  // generative (a catalog row served for weights that do not
  // exist) while no card boarded it — a dead door; with it, the
  // rig card's board is the named landing channel (channel 1: a
  // tool atom whose bytes are nothing). The text→creature forge
  // stays a ROADMAP idea, not a declared offer.
  "unoffered": true,
  // No defaults: the declared-plane door's first catch (2026-10-12) —
  // smooth_angle is the img-to-mesh card's row (families: pixal3d +
  // trellis2-native, never this one) and build/ao/role had no reader
  // anywhere. Four dead keys, killed.
  "genre": "3d",
  "variants": [
    {
      "id": "standard",
      "label": "Standard",
      "group": "Variant",
      "route": "anycreature",
      "cells": [
        {
          "quant": "native",
          "label": "Native",
          "route": "anycreature",
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
  // the bind action the rig card binds for its `species` mode (the
  // anyCreature skeleton bind — the caller brings both GLBs).
  "actions": [bind],
};

export const family: Plugin = {
  name: "family-anycreature",
  inject: ["models"],
  apply(ctx): void {
    ctx.effect(() => ctx.models.registerFamily(DECL));
  },
};

export { bind } from "./actions.ts";
