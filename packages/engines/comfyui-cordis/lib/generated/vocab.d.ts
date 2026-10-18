/**
 * HAND-OWNED frozen vocabularies (purge S-vocab 2026-09-08 — the
 * SSOT (card_kinds/slot_kinds/flow.Kind/grammar/dsl) + tools/
 * export_vocab.py are deleted). Edits by hand; never regenerated.
 * The sibling-owned seam unions live in uiMap.generated.ts only
 * no second spelling here.
 */
/** Model family genre (grammar.Genre — the 7 lanes + unordered). */
export declare const GenreValues: readonly ["", "3d", "audio", "image", "motion", "other", "text", "video"];
export type Genre = (typeof GenreValues)[number];
/** Flow edge-type vocabulary — what flows on the wire. */
export declare const KindValues: readonly ["audio", "image", "lora", "mesh", "num", "seg", "text", "video"];
export type Kind = (typeof KindValues)[number];
/** Input-slot file-kind vocabulary (slot_kinds.FileKind). */
export declare const FileKindValues: readonly ["any", "audio", "glb", "image", "mask", "motion", "text", "video", "voice"];
export type FileKind = (typeof FileKindValues)[number];
/** Card-kind badge tone (card_kinds.BadgeTone). */
export declare const BadgeToneValues: readonly ["brand", "default"];
export type BadgeTone = (typeof BadgeToneValues)[number];
/** Card-kind runner family ("" = the default rule, "input" = the input family runner). */
export declare const KindRunnerValues: readonly ["", "input"];
export type KindRunner = (typeof KindRunnerValues)[number];
/** Universal sidebar sections (ActionCard.SIDEBAR_SECTIONS). */
export declare const SidebarSectionValues: readonly ["3d", "audio", "image", "image-edit", "motion", "video"];
export type SidebarSection = (typeof SidebarSectionValues)[number];
/** Weight-tier vocabulary (grammar.Quant — native = no weights matrix). */
export declare const QuantValues: readonly ["bf16", "f32", "fp8", "int8", "lightning4", "native"];
export type Quant = (typeof QuantValues)[number];
/** CLIPLoader type vocabulary (grammar.ClipType). */
export declare const ClipTypeValues: readonly ["krea2", "lumina2", "minimax", "qwen_image", "stable_diffusion", "wan"];
export type ClipType = (typeof ClipTypeValues)[number];
/** Empty-latent constructor vocabulary (grammar.LatentNode). */
export declare const LatentNodeValues: readonly ["EmptyFlux2LatentImage", "EmptyLatentImage", "EmptySD3LatentImage"];
export type LatentNode = (typeof LatentNodeValues)[number];
/** Card-knob value vocabulary (grammar.KnobKind). */
export declare const KnobKindValues: readonly ["b", "n", "s"];
export type KnobKind = (typeof KnobKindValues)[number];
/** Studio body-frame size notch (grammar.StudioSize). */
export declare const StudioSizeValues: readonly ["huge", "normal", "wide"];
export type StudioSize = (typeof StudioSizeValues)[number];
/** Studio body mount shape (grammar.StudioLayout). */
export declare const StudioLayoutValues: readonly ["panel", "studio"];
export type StudioLayout = (typeof StudioLayoutValues)[number];
/** Studio body renderer claim (grammar.StudioKind). */
export declare const StudioKindValues: readonly ["assembly", "custom"];
export type StudioKind = (typeof StudioKindValues)[number];
/** Canonical wire slots (slot_kinds.VOCAB — the closed set). */
export declare const SlotValues: readonly ["end_image", "first_frame", "image1", "image2", "image3", "input_glb", "input_image", "input_mask", "lanpaint_mask", "last_frame", "prev_motion_artifact", "preview_glb", "reference_audio", "reference_image", "source_glb", "source_image", "voice_file"];
export type Slot = (typeof SlotValues)[number];
/** Card-kind behavior rows (card_kinds.TABLE — the wire kind strings). */
export declare const CardKindValues: readonly ["body", "card-compose", "chain", "compound", "generation", "input", "preview", "studio-link"];
export type CardKind = (typeof CardKindValues)[number];
/** Universal sidebar sections (sorted — mirrors SidebarSection). */
export declare const SIDEBAR_SECTIONS: readonly SidebarSection[];
/** One card-kind behavior flag row (sorted by kind — the editor render/run contract). */
export interface CardKindDef {
    kind: string;
    runnable: boolean;
    executable: boolean;
    formSpec: boolean;
    compound: boolean;
    opensStudio: boolean;
    badgeTone: BadgeTone;
    runner: KindRunner;
    icon: string | null;
}
/** The card-kind table (card_kinds.TABLE — runner "" = the default rule). */
export declare const CARD_KINDS: readonly CardKindDef[];
//# sourceMappingURL=vocab.d.ts.map