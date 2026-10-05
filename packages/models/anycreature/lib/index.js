import { bind } from "./actions.js";
export const DECL = {
    "id": "anycreature",
    "form": "form_forge",
    "label": "anyCreature",
    "description": "Text → game-ready 3D creature (JSON spec → skinned GLB)",
    "engine": "anycreature",
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
export const family = {
    name: "family-anycreature",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { bind } from "./actions.js";
//# sourceMappingURL=index.js.map
