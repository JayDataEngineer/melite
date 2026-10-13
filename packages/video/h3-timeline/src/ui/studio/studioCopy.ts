/**
 * studioCopy.ts — THE STUDIO COPY DICTIONARY (the rail-law audit's
 * H8, 2026-10-31). Client UI copy is locale-owned (the estate's
 * decision, mirrored from card-base's square.ts): presentation code
 * owns no copy literals; it consumes them here through the typed
 * seat. A second locale plugs into this dictionary without touching
 * a single studio component.
 *
 * THE BOUND: static user-visible FACES live here (labels, titles,
 * placeholders, aria names). Computed LAW WORDINGS — a hover title
 * that narrates its lane's own rule with live numbers ("3 claimed —
 * the loader holds 8 slots…") — are one-of-a-kind per seat and ride
 * the seat; the dictionary would only rename them, not own them.
 * The refusal/error literals that EVERY seat shares live in
 * refUtils (FOREIGN_URL_REFUSAL, REF_READ_ERROR) — one law, one
 * home, not two.
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const studioCopy = {
  /** Image-bus label (slot roles + the cap, the biggest lane face). */
  imagesBusLabel: "Images — slot 1 anchor ref (guides the first frame; it does not pin it) · slots 2–9 reference",
  /** Ref-videos lane label. */
  refVideos: "Ref videos",
  /** Ref-audios lane label. */
  refAudios: "Ref audios",
  /** Ref-mods lane label (engine-side packs). */
  refMods: "Ref mods (packs)",
  /** The mods chip strip's hover action. */
  removePack: "remove this pack",
  /** The mods path door's placeholder (the wire's example path). */
  modPathPlaceholder: "refmods/pack.safetensors",
  /** The mods path door's accessible name. */
  modPathAria: "ref mod path",
  /** The anchor slot's square caption (the bus's slot 1). */
  anchorSlot: "anchor ref · slot 1",
  /** The seam picker's carried option. */
  seamCarried: "carried — drift-control chain",
  /** The seam picker's cut option. */
  seamCut: "cut — independent window",
  /** The strip pane's head. */
  timelineTitle: "Timeline",
  /** The preview pane's head. */
  previewTitle: "Preview",
  /** The preview's empty state (the run order, in one line). */
  previewEmpty: "No render yet — author the calls below, then Run.",
  /** Focused mode's back door. */
  backToGlobal: "Back to global parameters",
  /** The seam picker's hover law (how carried vs cut join). */
  seamHelp: "How this call joins the previous one: carried continues the previous window's latent through drift control (schedule-matched carry, soft audio release — seamless across the seam); cut is an independent window, a true butt",
  /** The prompt lane's enhance action. */
  enhanceAction: "Rewrite this call's prompt in H3 cinematic style",
  /** The prompt lane's empty-state placeholder (and its refusal hint). */
  promptPlaceholder: "describe the action, camera, and mood for this call — empty calls refuse the plan",
  /** The recipe engine's frame-rate seat. */
  fps: "FPS",
  /** The refs-clips lane's per-clip removal. */
  removeClip: "remove the clip",
} as const
