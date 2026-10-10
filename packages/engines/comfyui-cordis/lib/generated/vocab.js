/**
 * HAND-OWNED frozen vocabularies (purge S-vocab 2026-09-08 — the
 * SSOT (card_kinds/slot_kinds/flow.Kind/grammar/dsl) + tools/
 * export_vocab.py are deleted). Edits by hand; never regenerated.
 * The sibling-owned seam unions live in uiMap.generated.ts only
 * no second spelling here.
 */
/** Model family genre (grammar.Genre — the 7 lanes + unordered). */
export const GenreValues = ["", "3d", "audio", "image", "motion", "other", "text", "video"];
/** Flow edge-type vocabulary — what flows on the wire. */
export const KindValues = ["audio", "image", "lora", "mesh", "num", "seg", "text", "video"];
/** Input-slot file-kind vocabulary (slot_kinds.FileKind). */
export const FileKindValues = ["any", "audio", "glb", "image", "mask", "motion", "text", "video", "voice"];
/** Card-kind badge tone (card_kinds.BadgeTone). */
export const BadgeToneValues = ["brand", "default"];
/** Card-kind runner family ("" = the default rule, "input" = the input family runner). */
export const KindRunnerValues = ["", "input"];
/** Universal sidebar sections (ActionCard.SIDEBAR_SECTIONS). */
export const SidebarSectionValues = ["3d", "audio", "image", "image-edit", "motion", "video"];
/** Weight-tier vocabulary (grammar.Quant — native = no weights matrix). */
export const QuantValues = ["bf16", "f32", "fp8", "int8", "lightning4", "native"];
/** CLIPLoader type vocabulary (grammar.ClipType). */
export const ClipTypeValues = ["krea2", "lumina2", "minimax", "qwen_image", "stable_diffusion", "wan"];
/** Empty-latent constructor vocabulary (grammar.LatentNode). */
export const LatentNodeValues = ["EmptyFlux2LatentImage", "EmptyLatentImage", "EmptySD3LatentImage"];
/** Card-knob value vocabulary (grammar.KnobKind). */
export const KnobKindValues = ["b", "n", "s"];
/** Studio body-frame size notch (grammar.StudioSize). */
export const StudioSizeValues = ["huge", "normal", "wide"];
/** Studio body mount shape (grammar.StudioLayout). */
export const StudioLayoutValues = ["panel", "studio"];
/** Studio body renderer claim (grammar.StudioKind). */
export const StudioKindValues = ["assembly", "custom"];
/** Canonical wire slots (slot_kinds.VOCAB — the closed set). */
export const SlotValues = ["end_image", "first_frame", "image1", "image2", "image3", "input_glb", "input_image", "input_mask", "lanpaint_mask", "last_frame", "prev_motion_artifact", "preview_glb", "reference_audio", "reference_image", "source_glb", "source_image", "voice_file"];
/** Card-kind behavior rows (card_kinds.TABLE — the wire kind strings). */
export const CardKindValues = ["body", "card-compose", "chain", "compound", "generation", "input", "preview", "studio-link"];
/** Universal sidebar sections (sorted — mirrors SidebarSection). */
export const SIDEBAR_SECTIONS = ["3d", "audio", "image", "image-edit", "motion", "video"];
/** The card-kind table (card_kinds.TABLE — runner "" = the default rule). */
export const CARD_KINDS = [
    { kind: "body", runnable: false, executable: false, formSpec: false, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: "Box" },
    { kind: "card-compose", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: null },
    { kind: "chain", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: null },
    { kind: "compound", runnable: true, executable: true, formSpec: false, compound: true, opensStudio: false, badgeTone: "default", runner: "", icon: null },
    { kind: "generation", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: null },
    { kind: "input", runnable: true, executable: true, formSpec: false, compound: false, opensStudio: false, badgeTone: "default", runner: "input", icon: null },
    { kind: "preview", runnable: true, executable: true, formSpec: false, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: null },
    { kind: "studio-link", runnable: true, executable: false, formSpec: false, compound: false, opensStudio: true, badgeTone: "brand", runner: "", icon: null },
];
//# sourceMappingURL=vocab.js.map