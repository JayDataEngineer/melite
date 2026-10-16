import { speak, exportAction } from "./actions.js";
export const DECL = {
    "id": "qwen3-tts",
    "form": "form_tts",
    "label": "Qwen3-TTS",
    "description": "Qwen3-TTS 12Hz — one Qwen atom, three flavors (CustomVoice personas, VoiceDesign exports, Base 3-second clone), two sizes at the quant picker (1.7B and 0.6B)",
    "engine": "comfyui",
    "defaults": {
        "mode": "tts",
        "voice": "vivian",
        // THE VARIANT STAMP: the family's resting lane rides the
        // defaults so every derived row's model_defaults names its
        // lane. It is the selection's default coordinate, and the lane
        // judge reads the resolved variant to pick the surface.
        "variant": "customvoice"
    },
    "genre": "audio",
    // HAND-PLACED WEIGHTS (the union of the two dead atoms' rows —
    // the FOLD LAW): every tree this family's lanes load is stated
    // here so no lane silently claims the estate fetches it. The two
    // HF-dir trees are FETCHABLE (their snapshot_provisions rows
    // below pin the upstream repo + revision, and the provisioner
    // lands them); the three merged trees (base + speaker tensors)
    // exist only as the operator's placed bytes plus their
    // estate-authored model_specs rows, so no snapshot row can
    // honestly name them and they stay hand-only. The ghost wall
    // (models-against-cards) judges every model_path leaf against
    // this row plus the snapshot rows.
    "hand_placed_weights": [
        "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged",
        "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
        "Qwen3-TTS-12Hz-1.7B-Base-merged",
        "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
        "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base",
    ],
    // THE DIRECTORY PROVISION (the model-families audit fix 8, the
    // union): the two HF-dir trees ship as whole dirs (config +
    // weights + speech_tokenizer), so no single-file provisions row
    // can name them. These rows pin the upstream snapshots the
    // provisioner fetches. The merged trees carry no such row (no
    // upstream repo exists for an operator merge — stating one would
    // be a lie).
    "snapshot_provisions": [
        {
            "name": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
            "folder": "audio/qwen3-tts/hf",
            "repo_id": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
            "revision": "5ecdb67327fd37bb2e042aab12ff7391903235d3",
            "allow_patterns": [
                "config.json",
                "model.safetensors",
                "speech_tokenizer/*",
                "tokenizer_config.json",
                "vocab.json",
                "merges.txt",
                "preprocessor_config.json",
                "generation_config.json",
            ],
        },
        {
            "name": "Qwen3-TTS-12Hz-0.6B-Base",
            "folder": "audio/qwen3-tts/hf",
            "repo_id": "Qwen/Qwen3-TTS-12Hz-0.6B-Base",
            "revision": "5d83992436eae1d760afd27aff78a71d676296fc",
            "allow_patterns": [
                "config.json",
                "model.safetensors",
                "speech_tokenizer/*",
                "tokenizer_config.json",
                "vocab.json",
                "merges.txt",
                "preprocessor_config.json",
                "generation_config.json",
            ],
        },
    ],
    // THE LANE DECLARATION (the SIGNATURE CANON, operator 2026-10-12,
    // recut for the fold): the model is the author of what it accepts
    // — no per-model field table in the card, no visible_when guard
    // list. `params` is the parameter SURFACE every lane of this
    // family accepts; each variant's `params` add to it
    // (add-never-subtract); each SIZE CELL's `params` add again — the
    // instruct split lives THERE (style_instruction rides the 1.7B
    // customvoice cell only, upstream's own capability matrix).
    // `relations` are the four words, judged at bench-write and in
    // the form, in the field's own voice.
    "params": [
        "text",
        "temperature",
        "top_p",
        "top_k",
        "speed",
        "repetition_penalty",
        "seed"
    ],
    "relations": {
        // THE REQUIRED WORD, USED: a tts lane with no text composes
        // nothing — the node's text input IS the generation. Stated as
        // a law it refuses at bench-write in the field's voice, on
        // every seat; the blank law's tolerance (a state still being
        // typed is not a refusal) is exactly the case this row
        // overrides, deliberately and by name.
        "required": [
            {
                "fields": ["text"],
                "cure": "every tts lane speaks words — state the text to synthesize",
            },
        ],
        // THE EXPORT PAIR (incident A, operator 2026-10-10): the studio
        // exporter fires only when the persona description and the save
        // mod's name BOTH ride — a design_prompt without voice_name is
        // not an authoring state, it is the exact state the run refused
        // after the form happily built it.
        "together": [
            {
                "fields": ["voice_name", "design_prompt"],
                "cure": "the persona export needs both halves — name the voice and describe it, or drop both",
            },
        ],
        // an export performs nothing beside a clone or a persona: the
        // exporter runs the DESIGN lane; a reference clone runs the Base
        // table; a styled performance runs the CustomVoice table.
        "conflicts": [
            {
                "a": "voice_name",
                "b": "ref_audio",
                "cure": "a reference clone performs the text — the exporter clones no reference (drop the export or drop the reference)",
            },
            {
                "a": "voice_name",
                "b": "style_instruction",
                "cure": "an export creates the voice — it is styled on its performances, not while it is designed (drop the style, then style the voice when you perform it)",
            },
            {
                "a": "voice_name",
                "b": "qvoice",
                "cure": "a saved persona performs the text — the exporter performs nothing beside it (drop the export or drop the .qvoice)",
            },
        ],
    },
    // QVOICE SAVES AND LOADS ACROSS ALL qwen3-tts (operator
    // 2026-09-23): the load pack performs a saved persona on every
    // lane; the save pack fires the studio exporter from any lane.
    "mods": [
        "qvoice",
        "qvoice_save"
    ],
    "variants": [
        {
            "id": "customvoice",
            "label": "CustomVoice",
            "description": "preset personas over the target timbre — instruct-styled on the 1.7B cell",
            "group": "Variant",
            "route": "qwen3-tts-voicedesign",
            // the persona picker is THIS lane's own input at BOTH sizes;
            // style_instruction is the 1.7B CELL's own input (the cell's
            // params add to the variant's — the instruct split).
            "params": ["voice"],
            "cells": [
                {
                    "quant": "1_7b",
                    "label": "1.7B",
                    "route": "qwen3-tts-voicedesign",
                    // THE LARGE CELL (the family default — "ALWAYS the big
                    // model"): the merged 1.7B tree + the instruct input.
                    "lane_inputs": {
                        "model_path": "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged",
                    },
                    "params": ["style_instruction"],
                },
                {
                    "quant": "0_6b",
                    "label": "0.6B",
                    "route": "qwen3-tts",
                    // THE SMALL CELL: the merged 0.6B tree; upstream's small
                    // generate_custom_voice takes NO instruct — the cell
                    // declares no params, so the surface law refuses a stated
                    // style_instruction on this size.
                    "lane_inputs": {
                        "model_path": "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
                    },
                },
            ]
        },
        {
            "id": "voicedesign",
            "label": "VoiceDesign",
            "description": "design a voice from a description, export the .qvoice embedding — 1.7B only (upstream ships no small design checkpoint)",
            "group": "Variant",
            // THE DESIGN LANE'S OWN FLAT ROUTE (route law: <family>-<lane>;
            // the dead atom's '-design' address survives verbatim).
            "route": "qwen3-tts-voicedesign-design",
            // THE LANE SURFACE: the design lane OWNS the export pair —
            // generate_voice_design(text, instruct, language) takes the
            // persona description as ITS instruct input (upstream's only
            // signature with one), and the .qvoice save needs the mod's
            // name. No persona, no reference, no delivery style rides it.
            // THE EXPORT PAIR IS REQUIRED HERE (the DECL audit's gap 3):
            // the design lane exists to export — its required word says so.
            "params": ["design_prompt", "voice_name"],
            "relations": {
                "required": [
                    {
                        "fields": ["voice_name", "design_prompt"],
                        "cure": "the design lane exports a voice — state the persona description and the Design mod's name (the save fires from this lane by definition)",
                    },
                ],
            },
            "resolver_defaults": {
                "variant": "voicedesign",
                // THE NULL STAMP (the size-at-quant fold, operator 2026-10-26:
                // the merged family defaults the persona `voice: "vivian"`
                // for the customvoice head — the design lane's surface takes
                // no persona, so the stamp unsets it here, the base lane's
                // own null stamp verbatim. Without it the verdict's prepare
                // re-injects the family default AFTER laneMigrate drops the
                // stated carry, and the switch refuses the resurrect —
                // "field 'voice' fires nothing on this lane" on a state no
                // author wrote (the stuck-switch wall's two red arms).
                "voice": null,
            },
            "cells": [
                {
                    "quant": "1_7b",
                    "label": "1.7B",
                    "route": "qwen3-tts-voicedesign-design",
                    "lane_inputs": {
                        "model_path": "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
                    },
                },
            ]
        },
        {
            "id": "base",
            "label": "Base",
            "description": "voice clone from a 3-second reference — no persona, no instruction control; the fine-tune base checkpoint at both sizes",
            "group": "Variant",
            "route": "qwen3-tts-voicedesign-base",
            // THE CLONE LANE'S OWN INPUTS: the reference PAIR (audio + its
            // transcript) or a saved .qvoice persona.
            "params": ["ref_audio", "ref_text"],
            "relations": {
                // ONE COMPLETE SOURCE: armed only when a member is stated —
                // a blank authoring lane is in progress, never a write
                // refusal.
                "either_or": [
                    {
                        "groups": [["ref_audio", "ref_text"], ["qvoice"]],
                        "cure": "state one complete source: the reference PAIR (audio + transcript) or a .qvoice persona",
                    },
                ],
            },
            // THE NULL STAMP (operator 2026-09-23, "base doesn't even have
            // the audio input"): voice:null unsets the family's persona
            // default on a lane whose surface does not declare it. The
            // ADDRESS needs no re-point under the fold — the selected
            // cell owns it (a variant:'base' pick resolves its cell's
            // route at compose).
            "resolver_defaults": {
                "variant": "base",
                "voice": null,
            },
            "cells": [
                {
                    "quant": "1_7b",
                    "label": "1.7B",
                    "route": "qwen3-tts-voicedesign-base",
                    "lane_inputs": {
                        "model_path": "Qwen3-TTS-12Hz-1.7B-Base-merged",
                    },
                },
                {
                    "quant": "0_6b",
                    "label": "0.6B",
                    "route": "qwen3-tts-base",
                    // the 0.6B clone tree points INTO the hf dir
                    // (transcript-014: the bare container dir 'qwen3-tts'
                    // holds only hf/ — the C++ load gate refuses it; the
                    // 0.6B Base weights sit one level down with top-level
                    // safetensors).
                    "lane_inputs": {
                        "model_path": "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base",
                    },
                },
            ]
        },
        {
            "id": "steady-read",
            "label": "Steady Read",
            "hint": "Temperature 0.05 — the card schema's floor (the engine's positive-sampling minimum: the native node refuses 0).",
            "group": "Recipe",
            "wire_defaults": { "temperature": 0.05 },
            "cells": [],
        },
        {
            "id": "expressive-read",
            "label": "Expressive Read",
            "hint": "Temperature 2 — the card schema's own ceiling (maximum variation).",
            "group": "Recipe",
            "wire_defaults": { "temperature": 2 },
            "cells": [],
        },
        {
            "id": "default",
            "label": "Default",
            "hint": "The family default — no extra stamps; a fresh card lands here.",
            "group": "Recipe",
            "cells": []
        }
    ],
    "variant_groups": [
        {
            "id": "Variant",
            "label": "Variant",
            "default": "customvoice",
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
    "has_inference": true,
    // THE FAMILY LANE INPUTS are the LARGE DEFAULT (the operator's
    // standing law: "ALWAYS the big model: the 1.7B is the default on
    // every door; the 0.6B is a fallback, never an unprompted pick")
    // — an unstated quant on any variant selects the first cell, and
    // every cell ladder leads with its 1.7B rung where one exists.
    "lane_inputs": {
        "family": "qwen3_tts",
        "model_path": "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged",
    },
    // THE DECLARED HOME (the lane-presence cure): the store folder this
    // pack-specific lane file lives in — the run gate probes it at press
    // instead of dying untyped at the engine.
    "lane_homes": { "model_path": "qwen3_tts" },
    // THE DECLARED ACTIONS (the atom vocabulary, stroke 3):
    // the speak + export actions the tts card binds — all three lanes'
    // trees under one family (the size-at-quant fold). The admission
    // gate runs the facts parse at registration.
    "actions": [speak, exportAction],
};
export const family = {
    name: "family-qwen3-tts",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
/**
 * A VARIANT'S OWN ROUTE ADDRESS (2026-10-10, the card audit's M5):
 * a card that boards a route used to retype the address string, so
 * a rename here left the card boarding an address that resolves to
 * nothing — and the failure is at RUN, not at compile. The DECL owns
 * its routes; this reads them. Returns '' when the variant declares
 * no route (a recipe row, say), so a caller can filter honestly
 * rather than board an empty address.
 */
export function variantRoute(decl, variantId) {
    const row = (decl.variants ?? []).find((v) => v.id === variantId);
    return typeof row?.route === 'string' ? row.route : '';
}
/**
 * A SIZE CELL'S OWN ROUTE ADDRESS (the size-at-quant reshape): a card
 * that boards a route must read it from the DECL, never retype it.
 * Returns '' when the variant/cell declares no route.
 */
export function cellRoute(decl, variantId, quant) {
    const row = (decl.variants ?? []).find((v) => v.id === variantId);
    const cell = (row?.cells ?? []).find((c) => c.quant === quant);
    return typeof cell?.route === 'string' ? cell.route : '';
}
export { speak, exportAction, parseTtsFacts, laneTopologyOf, LANE_TOPOLOGY, PRESET_SPEAKERS } from "./actions.js";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map
