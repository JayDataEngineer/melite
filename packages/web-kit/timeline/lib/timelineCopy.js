/**
 * timelineCopy.ts — THE TIMELINE KIT COPY DICTIONARY (the copy-scope
 * extension, 2026-11-05). Client UI copy is locale-owned (the estate's
 * decision, the DSH verify-client-ui-i18n law): presentation code owns
 * no copy literals; it consumes them here through the typed seat. A
 * second locale plugs into this dictionary without touching a single
 * timeline component.
 *
 * THE BOUND: static user-visible FACES of the melite-authored
 * components live here (lane heads, zoom aria names, clip and keyframe
 * labels, empty/hint states, the scrub bar's transport copy).
 * Parameterized sentences whose shape is fixed but whose slots are live
 * live here as typed dict functions (the square.ts pattern) — the site
 * passes exactly the params the entry declares. Two exclusions carry
 * the estate's documented bounds: `tip=` hover help is not a census
 * seat and stays at the site (the motionCopy bound), and the vendored
 * `viser-timeline/` subtree is NVIDIA upstream kept pull-diff-clean —
 * its rendered faces (the ruler "Prompts" label, the zoom aria names,
 * the "(Empty)" placeholder) are upstream's, argued at the copy wall's
 * pin, never this dictionary's.
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const timelineCopy = {
    // ── Lane heads + bar defaults ────────────────────────────────────────
    /** The prompts lane's gutter head (the bar's default label). */
    lanePrompts: "Prompts",
    /** The beats lane's gutter head (the bar's default label). */
    laneBeats: "Beats",
    /** A chapter marker's auto label when the caller names none. */
    markerAutoLabel: (p) => `Marker ${p.index}`,
    /** The keyframe lanes' empty hint (the bar's default). */
    laneHintDefault: "Double-click a lane to pin a pose constraint at the playhead",
    /** The prompts lane's empty hint (the bar's default). */
    emptyPromptsHint: "No prompt cards — the Add button carves one",
    /** The beats lane's empty hint (the bar's default). */
    beatsHintDefault: "double-click to add a beat — prompt segments join into the call's one prompt",
    // ── Zoom cluster (the pinned gutter) ─────────────────────────────────
    /** The zoom-out button's accessible name. */
    zoomOutAria: "Zoom out",
    /** The zoom-in button's accessible name. */
    zoomInAria: "Zoom in",
    // ── Audio lane heads ─────────────────────────────────────────────────
    /** A stem-carrying layer's hover title (the bed-under-every-cut law). */
    audioBedTitle: (p) => `${p.stem} — one bed under every cut; each window hears its own slice in time`,
    /** A layer head's hover title before a stem is wired. */
    audioDropTitle: "drop an audio / music track — sliced to each window in time",
    /** The add door's accessible name for one layer. */
    addClipAria: (p) => `Add ${p.label} clip`,
    /** The add door's hover title for one layer. */
    addClipTitle: (p) => `Add a ${p.label} clip — from flow, from media, or from file`,
    /** The detach button's accessible name for one layer. */
    detachAria: (p) => `Detach ${p.label}`,
    /** The ruler tick's second-suffixed label. */
    tickSeconds: (p) => `${p.value}s`,
    // ── Prompt clips ─────────────────────────────────────────────────────
    /** A first clip's dead left-edge hover title (the frame-0 wall). */
    firstCallTitle: "First call — nothing before it to trim into",
    /** The extend-seam dot's hover title. */
    seamExtendTitle: "extend — latent tail carries across this seam",
    /** The clip editor's placeholder. */
    promptPlaceholder: "Enter prompt…",
    /** A clip's face when its prompt text is empty. */
    emptyClip: "(empty)",
    /** A clip's duration chip ("2.4s"). */
    clipSeconds: (p) => `${p.seconds}s`,
    /** The knob-override dot's hover title. */
    knobOverrideTitle: "This call overrides run knobs (per-call)",
    /** The reference-image badge's hover title (singular/plural). */
    refImagesTitle: (p) => `${p.count} reference image${p.count === 1 ? "" : "s"} (guide + extras)`,
    /** The clip delete button's accessible name. */
    deletePromptCardAria: "Delete this prompt card",
    // ── Audio clips + slices ─────────────────────────────────────────────
    /** An audio clip's hover title (name · window · gain — drag law). */
    audioClipTitle: (p) => `${p.name} · ${p.start}–${p.end}s${p.gain !== null ? ` · gain ${p.gain}` : ""} — drag to move`,
    /** The audio clip delete button's accessible name. */
    deleteClipAria: (p) => `Delete ${p.name}`,
    /** A stem slice's hover title (which call hears which window). */
    audioSliceTitle: (p) => `call #${p.call} · window hears bed ${p.start}–${p.end}s`,
    /** A stem slice's rendered range ("1.0–3.5s"). */
    sliceRange: (p) => `${p.start}–${p.end}s`,
    /** The empty audio lane's drop hint. */
    audioDropHint: "drop or upload audio — clips land where you drop them, drag to move",
    // ── Keyframes ────────────────────────────────────────────────────────
    /** A keyframe pin's accessible name. */
    keyframeAria: (p) => `${p.track} keyframe at frame ${p.frame}`,
    /** A keyframe delete button's accessible name. */
    deleteKeyframeAria: (p) => `Delete ${p.track} keyframe at frame ${p.frame}`,
    // ── The scrub bar (the form card's bottom seam) ──────────────────────
    /** The toggle's accessible name while playing. */
    scrubPauseAria: "Pause",
    /** The toggle's accessible name while paused. */
    scrubPlayAria: "Play",
    /** The scrub track's accessible name. */
    scrubAria: "Timeline scrub",
    /** The track's value text ("1.2s of 9.8s"). */
    scrubValuetext: (p) => `${p.current} of ${p.duration}`,
    /** The readout's frame column (" · frame 24/96"). */
    scrubFramesSuffix: (p) => ` · frame ${p.frame}/${p.total}`,
    /** The sub-minute second unit ("5.2s"). */
    secondsUnit: "s",
};
//# sourceMappingURL=timelineCopy.js.map
