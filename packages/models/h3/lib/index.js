import { FAMILY_LAW } from "./timelineContract.js";
import { film } from "./actions.js";
export const DECL = {
    "id": "h3",
    "form": "form_video_director",
    "label": "MiniMax H3",
    "description": "MiniMax H3 joint video + audio — one model, two lanes: multi-window timeline films and keyframe-anchored beats on the timeline bar",
    "engine": "comfyui",
    // THE ONE-OWNER FLOOR (dual-floor cure, 2026-11-02): seed's floor
    // lives on the family's own carrier schema (src/schema.ts,
    // .default(42) — the walk fill). A DECL defaults row spelling 42
    // again was dead surface on the same family's second seat.
    "studio": {
        "tenant": "video/h3-timeline",
        "owns_params": true,
        "writes": [
            "calls",
            "keyframes",
            "fps",
            "seed",
            "width",
            "height",
            "length",
            "steps",
            "denoise",
            "sampler_name",
            "sched_name",
            "shift_video",
            "shift_audio",
            "sla_sparsity",
            "sla_block_size",
            "sla_dense_last_steps",
            "sla_dense_steps",
            "sla_dense_backend",
            "sla_reference_protection",
            "sla_protect_audio",
            "sla_stabilize_motion",
            "sla_disable_fp16_accum",
            "sharpen_enabled",
            "sharpen_method",
            "sharpen_strength",
            "sharpen_radius",
            "sharpen_threshold",
            "sharpen_iterations",
            "interpolate_enabled",
            "interp_model",
            "interp_multiplier",
            "sr_switch",
            "sr_model",
            "sr_resolution",
            "second_pass_enabled",
            "refine_lora",
            "refine_strength",
            "refine_steps",
            "refine_denoise",
            "upscale_route",
            "upscale_model",
            "audio_clips",
            "audio_stem",
            // THE BAKE'S STATED DIALS + the attention backend (audit A7,
            // 2026-11-07): serialized by the studio's Layer-A emitter and
            // authored on the panel — declared here so the writes row
            // accounts for every serialized studio seat (the
            // studio-contract-wall's A7 arm derives the drift).
            "attention_backend",
            "refmod_mode",
            "refmod_pool",
            "refmod_identity",
            "refmod_save",
            "loras",
            // THE RE-SHOOT GROUP RETIRED from the writes row (the
            // fourth-mod-bag unification, §8 2026-11-12): the flat knobs
            // died at the schema and Layer A no longer seats them — the
            // RESHOOT_MOD bag is authored through the card's mods surface
            // like replace/repair/extend (none of which ride this row);
            // the studio projects it (the commission rail) but never
            // authors it through the Layer-A serializer.
            "document"
        ],
        "kind": "custom",
        "size": "huge",
        "layout": "studio"
    },
    // THE MARRIAGE DECLARATION (#36, the recipes rework): the loras
    // pack's distill adapters carry married step counts — while a
    // counting bag row rides, STEPS is theirs (compose card.ts:
    // call knobs > lora steps > the steps row, Math.max across the
    // bag). Served on the form-spec kind so every client face
    // mirrors compose — one truth per value: the catalog row owns
    // strength + steps; recipes reference ids ONLY. THE MARRIED
    // SHIFT (SOTA limb 2, 2026-10-20): shift_video joins the same
    // declaration — the distill's sigma-shift grid is part of its
    // training contract (8-step 12, 4-step 6; rows without a column
    // keep the schema default 8), max across the bag, the doc's own
    // stated shift never loses.
    "mods": [{ "pack": "loras", "marries": { "steps": "max", "shift_video": "max" } }],
    "genre": "video",
    "variants": [
        {
            "id": "timeline",
            "label": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8",
            "hint": "The multi-window timeline — hybrid FL2VA/Ref2VA windows, SLA sparse attention, the film path.",
            "group": "Variant",
            "route": "h3-timeline",
            // THE THREE-MEMBER OFFER (operator 2026-10-26: "INT8 != INT8
            // CONVROT != INT8 CONVROT PRUNED — the system needs ALL
            // THREE"): the timeline lane serves the smhfacct hybrid (its
            // name carries no convrot mark — the coordinate states
            // filename truth), the ALREADY-PROVISIONED Comfy-Org pruned
            // ConvRot dit, and the 34 GB non-pruned ConvRot tier (digest
            // and size verbatim from the HF tree API, 2026-10-26). No
            // vram_peak is claimed on the new tiers until measured (the
            // singularity precedent).
            "cells": [
                {
                    "quant": "int8",
                    "label": "INT8 Hybrid",
                    "route": "h3-timeline",
                    "vram_peak_gb": 30,
                    "lane_inputs": {
                        "unet": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
                    },
                },
                {
                    "quant": "int8_convrot_pruned",
                    "label": "INT8 ConvRot Pruned",
                    "route": "h3-timeline-pruned",
                    "lane_inputs": {
                        "unet": "minimax_h3_fl2va_pruned_int8_convrot.safetensors",
                    },
                },
                {
                    "quant": "int8_convrot",
                    "label": "INT8 ConvRot",
                    "route": "h3-timeline-convrot",
                    "lane_inputs": {
                        "unet": "minimax_h3_fl2va_int8_convrot.safetensors",
                    },
                    "artifact": {
                        "source_url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_int8_convrot.safetensors",
                        "size_bytes": 34038892334,
                        "sha256": "7ad4c73e6e378b822ffd1629f27f632d3787d95f5e468e3af958f98c58df96a5",
                        "dest_root": "COMFYUI_ROOT",
                        "dest_sub": "diffusion_models",
                        "size_hint_gb": 34,
                    },
                },
            ]
        },
        // THE SINGULARITY CHECKPOINT ROW (operator, 2026-10-17: "ship
        // this as a 'variant' … place this new one beside it" — the
        // 2026-11-02 one-variant ruling is superseded): the community
        // fine-tune rides the SAME timeline card as a checkpoint-axis
        // row on its OWN variant lane address (the krea-2 raw-lane
        // precedent — two offered variants never share a route address:
        // the address claim takes pool order, so a shared spelling
        // leaves the second lane unreachable and offered-cells red; the
        // first-declared variant's lane_inputs stay the family default
        // view, this row overrides the unet per-variant, and its
        // resolver_defaults.model re-points the lane's own served
        // default). NOT a lane revival: the folded single-shot routes
        // stay retired. First+last-frame adherence is UNPROVEN on this
        // checkpoint (ref2va-lineage fine-tune) — the bench audition
        // decides before any default moves, and no vram_peak is claimed
        // until it is measured.
        {
            "id": "singularity",
            "label": "Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8",
            "hint": "The community Singularity fine-tune (ref2va lineage) — HDR/action tuning; the first+last-frame pass is unproven here, audition before any default.",
            "group": "Variant",
            "route": "h3-singularity",
            "resolver_defaults": { "model": "h3-singularity" },
            "lane_inputs": {
                "unet": "Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors",
            },
            "cells": [
                {
                    "quant": "int8_pruned",
                    "label": "INT8 Pruned",
                    "route": "h3-singularity",
                }
            ]
        },
        // THE MERGE DEFAULT (operator, 2026-11-12: the default lora → the
        // Larry + LightX2V dareties merge — preferred for detail at 8
        // steps; the standalone LightX2V turbos stay in the catalog for
        // the audio/dialogue routes). The artifact is silveroxides'
        // `minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors`
        // (catalog row h3_lightx2v_turbo, provisioned below with its sha).
        // History: the bytedance DMAD 4-step order (2026-10-11), the
        // LightX2V Turbo 8-Step v1.0 order (2026-11-07), and the
        // recipe-trio rework (2026-11-02, "1 model, 1 variant, 1 quant,
        // and 3 recipes… Default is the standard") both carried forward —
        // the trio Draft / Standard / Final Cut still rides ONE lora,
        // selection only, and `standard` stays FIRST in the Recipe group
        // ON PURPOSE: the birth stamp takes the first composing Recipe
        // row (card-base seedRecipeStamp — the first-declared law; the
        // Recipe axis itself YIELDS, never seeds a key), so every fresh
        // h3-timeline card is born with the lora on. Geometry is NOT
        // stamped here (the DRY law, one value one owner): the carrier
        // schema's own 1344×768 floor IS the standard geometry. The
        // payload mirrors a hand pick exactly (declared keys only):
        // SELECTION ONLY (#36). STEPS IS UNSTATED BY DESIGN — the row
        // owns its married 8 (the marriage law: the bag resolves unstated
        // steps, so the default run takes the turbo's full count, not a
        // departed lora's 4); stamping steps would hard-pin what the bag
        // resolves. The file's door is the lane gate (lane_inputs loras +
        // the provision row below): absent on disk, the run refuses with
        // the fetch hint — the web popup's install button and the agent
        // seat both ride that one refusal.
        {
            "id": "standard",
            "label": "Standard",
            "hint": "The default — the Larry + LightX2V merge (dareties, 768p) at the calibrated 1344×768. Steps derive from the lora marriage (8).",
            "group": "Recipe",
            "wire_defaults": {
                "loras": [{ "id": "h3_lightx2v_turbo" }],
            },
            "cells": [],
        },
        // DRAFT (operator, this session: "for low resolution, that is
        // good for the draft recipe"): the fast iteration tier — the
        // same turbo bag at draft geometry 768×448. Steps stay
        // unstated (the marriage law).
        {
            "id": "draft",
            "label": "Draft",
            "hint": "Fast iteration — the same merge bag at draft geometry (768×448). Steps derive from the lora marriage (8).",
            "group": "Recipe",
            "wire_defaults": {
                "loras": [{ "id": "h3_lightx2v_turbo" }],
                "width": 768,
                "height": 448,
            },
            "cells": [],
        },
        // FINAL CUT (spec-matched 2026-10-27, timeline audit cure 2): the
        // finishing tier — same bag, full geometry (the carrier floor
        // 1344×768, never duplicated here), plus the spec's OWN Stage 2+3
        // rail: the 3D latent-upscale handoff (upscale_route latent_2x —
        // 2.0× in-band on the joint AV latent, z_a locked, the 0.35
        // partial-denoise window; pass 2 rides the un-distilled base by
        // the Stage-3 model law) behind the master switch. The pixel
        // limbs (SeedVR2 sr_switch, sharpen, FILM interp) stay EXPLICIT
        // picks — the spec ranks pixel-space super-res below the latent
        // route; a recipe must not arm the inferior one by default.
        {
            "id": "final",
            "label": "Final Cut",
            "hint": "The finishing pass — the merge bag plus the spec's latent handoff: 2.0× 3D latent upscale with a 0.35 refine window on the un-distilled base. Pixel super-res and interpolation stay explicit picks.",
            "group": "Recipe",
            "wire_defaults": {
                "loras": [{ "id": "h3_lightx2v_turbo" }],
                "second_pass_enabled": true,
                "upscale_route": "latent_2x",
            },
            "cells": [],
        },
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
            "tooltip": "One-click recipes — patch-only rows that stamp picks onto the draft: Draft (768×448), Standard (the calibrated default), Final Cut (the second-pass finish).",
            "default": "standard"
        }
    ],
    // THE LANE'S OWN FILES (2026-10-10, the card-plane audit's H3):
    // h3 was the ONE lane whose loader filenames lived in the card as
    // constants while its DECL declared no lane_inputs — so a new
    // quant or a renamed artifact left the card on stale weights with
    // every wall green. The unet rides the row (the one file quants
    // and hybrids vary); the encoder + the two VAEs ride the package
    // const beside the parser (stroke 1 — invariants are not row
    // members), and the card still reads none of them directly.
    "lane_inputs": {
        "unet": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
        // THE DEFAULT BAG'S FILE (operator, 2026-10-11 the bytedance
        // order → 2026-11-07 the LightX2V turbo 8-step default →
        // 2026-11-12 the Larry + LightX2V merge default: a run
        // without the file refuses through the lane gate — the web
        // popup's install button and the agent seat both key on that one
        // refusal; "that is how it works").
        // BARE NAME: the gate probes the provision row's own folder
        // (loras/h3) as its last leg; the row below is the fetch truth.
        "loras": "minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
    },
    // THE LANE SURFACE (the z-image precedent): exactly the knobs the
    // h3-timeline card serves — the window inputs, the shared render
    // tail, and each lane switch's refinement group. NO 'prompt'
    // (operator 2026-11-05, storm wave 6: the film-level prompt field
    // is gone — calls own their text; the schema dropped it in
    // schema.ts and this surface drops it with it, else the claim law
    // names a dead declaration the card cannot carry).
    // THE FAMILY LAW (the ERROR g/h cure, 2026-11-08): the
    // window-family key law in the served spelling, verbatim off the
    // contract module (one owner — FAMILY_LAW IS the law the walk
    // enforces; the served copy cannot drift, the contract wall pins
    // the agreement). The generic seats (composeValidate's family
    // clause, the studio rail's group omit) judge the t4r refusals
    // from this data at the gesture and at the render, one hop before
    // the door.
    "familyLaw": FAMILY_LAW,
    // THE KNOB→SEAT MAP (2026-11-09, the 55-knob block's close-out over
    // the round-48 sampler five): every row below either rides a graph
    // consumer VERBATIM or is named as unstatable here — silent unmapped
    // is the one shape this surface forbids. Wall:
    // tests/value-roundtrip.spec.ts (registry row
    // models-h3-sampler-value-law). Sampler → RandomNoise/KSamplerSelect/
    // BasicScheduler (ARMs 1-3). Latent shape → ReferenceToVideo
    // width/height/length/ref_image_size (13). Shifts → SigmaShift (14).
    // sla_* → H3SLAAttention, sla_enabled owns the attention switch (15);
    // sla_switch is NOT retired — the t4r arm reads it at the pick (31).
    // attention_backend → ModelAttentionBackend (16). interp/sr → the
    // FILM + SeedVR2 pairs behind the second-pass master (17);
    // sharpen_* → the ImageSharpenKJ grouped dict (18). refine_* → the
    // rider loader/scheduler (4/4b/7). Media/refmod/duck/image_name →
    // 19/20/22. k → the window save name (21); noise_seed → RandomNoise
    // per stanza (2/34). STAND-DOWNS, named: fps_seconds is INTERNAL —
    // derived from the window length at the render seat (the no-stale
    // law; a stated pin never reaches a node, ARM 33); interp_switch and
    // sharpen_switch are retired aliases — the primaries own their
    // switches (23/32).
    "params": [
        "image",
        "ref_images", "ref_videos", "ref_video_trims", "ref_audios", "ref_mods",
        "duck_depth_db",
        "seed", "width", "height", "length", "steps", "denoise",
        "second_pass_enabled",
        "sharpen_enabled", "sharpen_method", "sharpen_radius", "sharpen_strength",
        "sharpen_threshold", "sharpen_iterations", "sharpen_switch",
        "interpolate_enabled", "interp_model", "interp_multiplier", "interp_switch",
        "sampler_name", "sched_name", "k", "noise_seed", "fps", "fps_seconds",
        "refine_lora", "refine_strength", "refine_steps", "refine_denoise",
        // THE LATENT-UPSCALE ROUTE (SOTA plan Phase P2 — the P2 verdict's
        // own knobs on the lane surface): the sub-gate + its closed file
        // surface ride beside the refine seats, witnessed at ARM 37.
        "upscale_route", "upscale_model",
        "attention_backend",
        "sr_switch", "sr_resolution", "sr_model",
        "ref_image_size",
        "shift_video", "shift_audio",
        "sla_enabled", "sla_sparsity", "sla_block_size", "sla_min_seq_len",
        "sla_dense_last_steps", "sla_dense_steps", "sla_dense_backend",
        "sla_reference_protection", "sla_protect_audio", "sla_stabilize_motion",
        "sla_disable_fp16_accum", "sla_switch",
        // THE BAKE'S STATED DIALS (study §5/§7.2; value-arms ARMs 13/14)
        // — the family's own declared surface for the RefMod extract's
        // fidelity dials (the schema's refmod group, the film action's
        // rows, the compose's stated inputs).
        "refmod_mode", "refmod_pool", "refmod_identity", "refmod_save",
        "image_name",
        // THE RE-SHOOT COMMISSION left this map (the fourth-mod-bag
        // unification, §8 2026-11-12): it is a CARD mod bag now — the
        // knob→seat map mirrors DECL params, and the bag's law is
        // witnessed by tests/reshoot.spec.ts, not by this census.
    ],
    "provisions": [
        {
            "name": "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
            "url": "https://huggingface.co/smhfacct/Minimax-H3-fl2va-ref2va-hybrid-models/resolve/main/minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors",
            "folder": "diffusion_models",
            "sha256": "64f57f77ed85df04f7c0989ab84a5c3c110fb43a40dbc9badfe8ab2d5baafbca",
            "size_bytes": 20970379632
        },
        // THE SINGULARITY CHECKPOINT (the variant row above): digest and
        // byte size read verbatim from the HF tree API (xet lfs oid),
        // 2026-10-17. The pruned int8 over the full 34 GB int8 and the
        // w4a8: like-for-like with the hybrid's footprint, and the w4a8
        // quant scheme is unverified against the stock UNETLoader.
        {
            "name": "Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors",
            "url": "https://huggingface.co/WarmBloodAban/Minimax-h3_Singularity/resolve/main/Minimax-h3_Singularity_ref2va_Pruned_v1.3_int8.safetensors",
            "folder": "diffusion_models",
            "sha256": "412a7b126595a958964193f3b42513d7cf2df4196ef04223a0f05e3622949cce",
            "size_bytes": 20967647456
        },
        // THE PRUNED CONVROT TIER's FILE (the timeline's
        // int8_convrot_pruned cell serves it — the 2026-10-26 quant
        // cure; the ref2va sibling and the retired single-shot lanes'
        // orphan rows died with it)
        {
            "name": "minimax_h3_fl2va_pruned_int8_convrot.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/diffusion_models/minimax_h3_fl2va_pruned_int8_convrot.safetensors",
            "folder": "diffusion_models",
            "sha256": "e889202c41dafb67b10d67b97f0d8541508036a6090af23425a5c2615d03c47a",
            "size_bytes": 20970379616
        },
        {
            "name": "qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors",
            "folder": "text_encoders",
            "sha256": "35a88d51044231fe332301d7a62aa81e3f2cba62febeb446e2c1e3e0ef76f2c6",
            "size_bytes": 15687142551
        },
        {
            "name": "minimax_h3_video_vae_fp16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_fp16.safetensors",
            "folder": "vae",
            "sha256": "7c1f131492e7eddacaac9069a61b81bdd39de5cc96561e677c5eab1cdce5e522",
            "size_bytes": 5207808496
        },
        {
            "name": "minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
            "url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/minimax_h3_fl2v_lightx2v_v0.1_dareties_v4_step600_comfy_fro.safetensors",
            "folder": "loras/h3",
            "sha256": "ffc5386a1b97aa1bc112b56378f37ef3c1cc69d55d5282281e8c6c728811e710",
            "size_bytes": 867067150
        },
        {
            "name": "minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
            "url": "https://huggingface.co/silveroxides/MiniMax-H3_tests/resolve/main/experimental/minimax_h3_fl2v_lightx2v_turbo_4to8step_v0.1-v1.0_768p_v4_step600_dareties.safetensors",
            "folder": "loras/h3",
            "sha256": "e14c9e78834f5fac9195cb022baf2bc83372140da5142a8c999a1f568cb4915d",
            "size_bytes": 2116726792
        },
        {
            "name": "minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_4step_v1.0_768p_comfyui_bf16.safetensors",
            "folder": "loras/h3",
            "sha256": "c396a9a06f58399e9df9754b18299818d84a2ddd371724ba48fe4a41221437dc",
            "size_bytes": 1956192992
        },
        {
            "name": "minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors",
            "folder": "loras/h3",
            "sha256": "2339acdf19bfe123f46b971ea35d367a84adb85de43627e1eceafa5a5b2b111e",
            "size_bytes": 1956193000
        },
        {
            "name": "minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/loras/minimax_h3_ref2v_turbo_4step_v0.1_comfyui_bf16.safetensors",
            "folder": "loras/h3",
            "sha256": "5b9ab5ade15d0775676d01a907268a69a1468dc6033b3b0d3ded5502f3ebb84c",
            "size_bytes": 1956193000
        },
        {
            "name": "MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors",
            "url": "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-FL2VA-Acc-8Step_pruned_comfy.safetensors",
            "folder": "loras/h3",
            "sha256": "e97b813a6f857b9dab310f31ec30a8334f63a3e7dcb5d07c0c91933d3447a897",
            "size_bytes": 1725921392
        },
        {
            "name": "MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors",
            "url": "https://huggingface.co/Kijai/MiniMax-H3-experimental/resolve/main/loras/MiniMax-H3-Ref2VA-Acc-8Step_pruned_comfy.safetensors",
            "folder": "loras/h3",
            "sha256": "6f18e1c2eccb14b37322607730f26b16bf1169b56cd098ea006cffaec43d1e39",
            "size_bytes": 1725921392
        },
        {
            "name": "minimax_h3_turbo_v4_step600_ema.safetensors",
            "url": "https://huggingface.co/larryvrh/MiniMax-H3-Turbo-Lora/resolve/main/minimax_h3_turbo_v4_step600_ema.safetensors",
            "folder": "loras/h3",
            "sha256": "5f3a626cd72c93a8b9318d6760c510bc5092d2ab13aaba1f932c5bab07a416d3",
            "size_bytes": 779849816
        },
        {
            "name": "H3-PK-Parasyte-Turbo.safetensors",
            "url": "https://huggingface.co/Plaguekind/H3-Lora/resolve/main/H3-PK-Parasyte-Turbo.safetensors",
            "folder": "loras/h3",
            "sha256": "dbf74bfb490b9322bd455edff95ce222b3553bb3472e4743134755db1edfe044",
            "size_bytes": 2115774558
        },
        {
            "name": "dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
            "url": "https://huggingface.co/ZhengmingYu/DMAD/resolve/main/minimax_h3/dmad_minimax_h3_4step_lora_critic_comfyui.safetensors",
            "folder": "loras/h3",
            "sha256": "a4f54d9eb4eed9102be1adea8376e8e933cc2805f4017b95c14586290395b3a7",
            "size_bytes": 1956195960
        },
        {
            "name": "minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors",
            "url": "https://huggingface.co/Kijai/MiniMax-H3_comfy/resolve/main/loras/minimax_h3_taomate_3step_lora_avg_rank_19_bf16.safetensors",
            "folder": "loras/h3",
            "sha256": "de9663d974a884b477556748239c6f28239f7ca1825be270f98f023ff5dab6a7",
            "size_bytes": 181697688
        },
        // THE CROSSVIEW LORA (the 2026-11-13 official reshoot rework):
        // Cseti's CrossView-Warp v1 at step 3500 — the exact file
        // Comfy-Org's comfy-reshoot reference app pins
        // (build/model-files.md). Digest + size read verbatim from the
        // HF tree API (xet lfs oid), verified against the landed file.
        // Arm-functional, NOT a mods/loras.ts catalog row: it rides the
        // reshoot arm's own model seat (LoraLoaderModelOnly, trigger
        // `crossview`, band 0.5–1, default 0.8) and is meaningless stacked freely.
        {
            "name": "MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors",
            "url": "https://huggingface.co/Cseti/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1/resolve/main/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors",
            "folder": "loras/h3",
            "sha256": "aab492964261f6611ced672c70866ce9d64bab66fbd28fd39d26bcd09c852f91",
            "size_bytes": 596452584
        },
        {
            "name": "h3_silu_temb_grid.safetensors",
            "url": "https://huggingface.co/deAPI-ai/minimax-h3-33b-int8/resolve/main/loras/h3_silu_temb_grid.safetensors",
            "folder": "h3_adaln",
            "sha256": "30eb3c2cc7fb6b470d9717ff840d359313ac27cd64b705e32da1baa10f72d6a8",
            "size_bytes": 5510600
        },
        {
            "name": "minimax_h3_latent_upscaler_3d_bf16.safetensors",
            "url": "https://huggingface.co/LBH-123-AI/Minimax_h3_latent_Upscaler/resolve/main/minimax_h3_latent_upscaler_3d_conv_v1/minimax_h3_latent_upscaler_3d_conv_v1_bf16.safetensors",
            "folder": "latent_upscale_models",
            "size_bytes": 690592992,
            "sha256": "4f57821f5837f32f7142b67d815606dbd7550f194e5c769f7d6c3f83b146a5e6"
        },
        {
            "name": "film_net_fp16.safetensors",
            "url": "https://huggingface.co/Comfy-Org/frame_interpolation/resolve/main/frame_interpolation/film_net_fp16.safetensors",
            "folder": "frame_interpolation",
            "sha256": "f226e51375dc839d4b40e5c3d63da560dd1ea1c962364ec78f5adf2d05db05c0",
            "size_bytes": 68882302
        },
        {
            "name": "qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/text_encoders/qwen3vl_32b_minimax_h3_int8_convrot.safetensors",
            "folder": "text_encoders",
            "sha256": "bc2ced0fbea64757fa9acddccfc0b3f4819d1dcf1da6c124d690d368be283923",
            "size_bytes": 27141342152
        },
        {
            "name": "minimax_h3_video_vae_int8_convrot.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_video_vae_int8_convrot.safetensors",
            "folder": "vae",
            "sha256": "52a2c8c73583c86e4f41cdcce3a6ad0ea562987bc0bf3d60a0cef5f5c8e60c0e",
            "size_bytes": 2811065184
        },
        {
            "name": "minimax_h3_audio_vae_fp32.safetensors",
            "url": "https://huggingface.co/Comfy-Org/MiniMax-H3/resolve/main/vae/minimax_h3_audio_vae_fp32.safetensors",
            "folder": "vae",
            "sha256": "8e505d95dd1561d47abd43d4238fd40d9bb1ae9e147ed0a4cba778d76ae4db48",
            "size_bytes": 605254808
        }
    ],
    "has_agent": true,
    "has_inference": true,
    // the film action the h3-timeline card binds (the whole video
    // lane: multi-window films, single windows, clips mixing).
    "actions": [film],
};
export const family = {
    name: "family-h3",
    inject: ["models"],
    apply(ctx) {
        ctx.effect(() => ctx.models.registerFamily(DECL));
    },
};
export { finalizeH3, H3_T4_STRIP } from "./finalize.js";
export { renderH3Swap } from "./swap.js";
export { renderH3Repair } from "./repair.js";
export { renderH3Extend } from "./extend.js";
export { refineArmed, renderH3Refine, renderH3RefineWindow, renderH3RefineWindows, refineWindowCount, refineWindowStarts, REFINE_UPSCALE_MODEL, REFINE_2X_OOM_FRAMES, REFINE_DEFAULT_CLIP_SECONDS } from "./refine.js";
export { H3_DEFAULT_LORA_ID, h3DefaultLoraEntry } from "./actions.js";
// F19 — the whole-film deferred ChainUpscale loop over a prior run.
export { upscaleArmed, renderH3ChainUpscale } from "./chainUpscale.js";
export { reshootArmed } from "./reshoot.js";
// F18 — the cross-regime join admission (the two resolution regimes
// in one family: film width/height vs the mod bags' plan tiers).
export { RESOLUTION_SHORT_EDGE, planTierShape, admitCrossRegimeJoin, } from "./chainEdit.js";
export { assertOverlayGated } from "./actions.js";
export { serveWindowSpec } from "./windowSpec.js";
// The Loader-row face: DSH loads plugin rows by bare specifier and
// unwraps `exports.default ?? exports` (vendor/cordis_plugins/loader
// unwrapExports) — the default export IS the row-loadable plugin. The
// named `family` stays the library face (engine loadFamilies).
export { family as default };
//# sourceMappingURL=index.js.map