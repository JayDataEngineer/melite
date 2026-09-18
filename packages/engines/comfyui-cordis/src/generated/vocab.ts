/**
 * HAND-OWNED frozen vocabularies (purge S-vocab 2026-09-08 — the
 * SSOT (card_kinds/slot_kinds/flow.Kind/grammar/dsl) + tools/
 * export_vocab.py are deleted). Edits by hand; never regenerated.
 * The sibling-owned seam unions live in uiMap.generated.ts only
 * no second spelling here.
 */

/** Model family genre (grammar.Genre — the 7 lanes + unordered). */
export const GenreValues = ["", "3d", "audio", "image", "motion", "other", "text", "video"] as const;
export type Genre = (typeof GenreValues)[number];

/** Flow edge-type vocabulary (python/flow.Kind — what flows on the wire). */
export const KindValues = ["audio", "image", "lora", "mesh", "num", "seg", "text", "video"] as const;
export type Kind = (typeof KindValues)[number];

/** Input-slot file-kind vocabulary (slot_kinds.FileKind). */
export const FileKindValues = ["any", "audio", "glb", "image", "mask", "motion", "text", "video", "voice"] as const;
export type FileKind = (typeof FileKindValues)[number];

/** Card-kind badge tone (card_kinds.BadgeTone). */
export const BadgeToneValues = ["brand", "default"] as const;
export type BadgeTone = (typeof BadgeToneValues)[number];

/** Card-kind runner family ("" = the default rule, "input" = the input family runner). */
export const KindRunnerValues = ["", "input"] as const;
export type KindRunner = (typeof KindRunnerValues)[number];

/** Universal sidebar sections (ActionCard.SIDEBAR_SECTIONS). */
export const SidebarSectionValues = ["3d", "audio", "image", "image-edit", "motion", "video"] as const;
export type SidebarSection = (typeof SidebarSectionValues)[number];

/** Weight-tier vocabulary (grammar.Quant — native = no weights matrix). */
export const QuantValues = ["bf16", "f32", "fp8", "int8", "lightning4", "native"] as const;
export type Quant = (typeof QuantValues)[number];

/** CLIPLoader type vocabulary (grammar.ClipType). */
export const ClipTypeValues = ["krea2", "lumina2", "minimax", "qwen_image", "stable_diffusion", "wan"] as const;
export type ClipType = (typeof ClipTypeValues)[number];

/** Empty-latent constructor vocabulary (grammar.LatentNode). */
export const LatentNodeValues = ["EmptyFlux2LatentImage", "EmptyLatentImage", "EmptySD3LatentImage"] as const;
export type LatentNode = (typeof LatentNodeValues)[number];

/** Card-knob value vocabulary (grammar.KnobKind). */
export const KnobKindValues = ["b", "n", "s"] as const;
export type KnobKind = (typeof KnobKindValues)[number];

/** Studio body-frame size notch (grammar.StudioSize). */
export const StudioSizeValues = ["huge", "normal", "wide"] as const;
export type StudioSize = (typeof StudioSizeValues)[number];

/** Studio body mount shape (grammar.StudioLayout). */
export const StudioLayoutValues = ["panel", "studio"] as const;
export type StudioLayout = (typeof StudioLayoutValues)[number];

/** Studio body renderer claim (grammar.StudioKind). */
export const StudioKindValues = ["assembly", "custom"] as const;
export type StudioKind = (typeof StudioKindValues)[number];

/** Canonical wire slots (slot_kinds.VOCAB — the closed set). */
export const SlotValues = ["end_image", "first_frame", "image1", "image2", "image3", "input_glb", "input_image", "input_mask", "lanpaint_mask", "last_frame", "prev_motion_artifact", "preview_glb", "reference_audio", "reference_image", "source_glb", "source_image", "voice_file"] as const;
export type Slot = (typeof SlotValues)[number];

/** Card-kind behavior rows (card_kinds.TABLE — the wire kind strings). */
export const CardKindValues = ["body", "card-compose", "chain", "compound", "generation", "input", "preview", "studio-link"] as const;
export type CardKind = (typeof CardKindValues)[number];

/** Every canonical wire slot (sorted — the closed set). */
export const SLOTS: readonly string[] = ["end_image", "first_frame", "image1", "image2", "image3", "input_glb", "input_image", "input_mask", "lanpaint_mask", "last_frame", "prev_motion_artifact", "preview_glb", "reference_audio", "reference_image", "source_glb", "source_image", "voice_file"];

/** Slot key -> FileKind (sorted by slot). */
export const SLOT_KINDS: Record<string, FileKind> = {
  "end_image": "image",
  "first_frame": "image",
  "image1": "image",
  "image2": "image",
  "image3": "image",
  "input_glb": "glb",
  "input_image": "image",
  "input_mask": "mask",
  "lanpaint_mask": "mask",
  "last_frame": "image",
  "prev_motion_artifact": "motion",
  "preview_glb": "glb",
  "reference_audio": "audio",
  "reference_image": "image",
  "source_glb": "glb",
  "source_image": "image",
  "voice_file": "voice"
};

/** Wire-live slots no form/model declares (protected from purges). */
export const UNDECLARED_SLOTS: readonly string[] = ["lanpaint_mask"];

/** Universal sidebar sections (sorted — mirrors SidebarSection). */
export const SIDEBAR_SECTIONS: readonly SidebarSection[] = ["3d", "audio", "image", "image-edit", "motion", "video"];

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
export const CARD_KINDS: readonly CardKindDef[] = [
  { kind: "body", runnable: false, executable: false, formSpec: false, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: "Box" },
  { kind: "card-compose", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: null },
  { kind: "chain", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: null },
  { kind: "compound", runnable: true, executable: true, formSpec: false, compound: true, opensStudio: false, badgeTone: "default", runner: "", icon: null },
  { kind: "generation", runnable: true, executable: true, formSpec: true, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: null },
  { kind: "input", runnable: true, executable: true, formSpec: false, compound: false, opensStudio: false, badgeTone: "default", runner: "input", icon: null },
  { kind: "preview", runnable: true, executable: true, formSpec: false, compound: false, opensStudio: false, badgeTone: "default", runner: "", icon: null },
  { kind: "studio-link", runnable: true, executable: false, formSpec: false, compound: false, opensStudio: true, badgeTone: "brand", runner: "", icon: null },
];
