import { bind } from "./actions.js";
export const DECL = {
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
    // THE DECLARED AXES (plane canon L2, 2026-11-02): every category a
    // row carries is declared here — the 2026-10-31 census flagged the
    // used-but-undeclared 'Variant'/'Recipe' literals (anomaly 3/9).
    // The Quant axis rides the serving door (minted from cells); the
    // Recipe axis yields the family default.
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
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map