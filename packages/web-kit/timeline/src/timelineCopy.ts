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
 * its remaining rendered faces (the canvas seconds unit, the "(Empty)"
 * placeholder) are upstream's, argued at the copy wall's pin, never
 * this dictionary's. (F2, 2026-11-05: the zoom cluster re-homed out of
 * the vendored dir to `TimelineScrollbar.tsx`; its copy joined this
 * dictionary — `zoomFitTip`/`zoomFitLabel` beside the aria names.)
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const timelineCopy = {
  /** A new audio track's fallback label (F-B4, the 2026-11-05 timeline
   *  nativity audit: melite-authored copy planted outside the dict at
   *  store/timelineAudio.ts — the pin's own admitted debt seat). */
  audioTrackFallback: (n: number): string => `Audio ${n}`,
  // ── Lane heads + bar defaults ────────────────────────────────────────
  /** The prompts lane's gutter head (the bar's default label). */
  lanePrompts: "Prompts",
  /** The beats lane's gutter head (the bar's default label). */
  laneBeats: "Beats",
  /** A chapter marker's auto label when the caller names none. */
  markerAutoLabel: (p: { index: number }): string => `Marker ${p.index}`,
  /** The keyframe lanes' empty hint (the bar's default). */
  laneHintDefault: "Double-click a lane to pin a pose constraint at the playhead",
  /** The prompts lane's empty hint (the bar's default). */
  emptyPromptsHint: "No prompt cards — the Add button carves one",
  /** The beats lane's empty hint (the bar's default). */
  beatsHintDefault: "double-click to add a beat — prompt segments join into the call's one prompt",
  // ── Zoom cluster (the pinned gutter; TimelineScrollbar.tsx) ──────────
  /** The zoom-out button's accessible name. */
  zoomOutAria: "Zoom out",
  /** The zoom-in button's accessible name. */
  zoomInAria: "Zoom in",
  /** The fit-to-window button's hover title + accessible name. */
  zoomFitTip: "Fit to window (reset zoom)",
  /** The fit-to-window button's rendered glyph text. */
  zoomFitLabel: "fit",
  // ── Audio lane heads ─────────────────────────────────────────────────
  /** A stem-carrying layer's hover title (the bed-under-every-cut law). */
  audioBedTitle: (p: { stem: string }): string => `${p.stem} — one bed under every cut; each window hears its own slice in time`,
  /** A layer head's hover title before a stem is wired. */
  audioDropTitle: "drop an audio / music track — sliced to each window in time",
  /** The add door's accessible name for one layer. */
  addClipAria: (p: { label: string }): string => `Add ${p.label} clip`,
  /** The add door's hover title for one layer. */
  addClipTitle: (p: { label: string }): string => `Add a ${p.label} clip — from flow, from media, or from file`,
  /** The detach button's accessible name for one layer. */
  detachAria: (p: { label: string }): string => `Detach ${p.label}`,
  /** The ruler tick's second-suffixed label. */
  tickSeconds: (p: { value: string }): string => `${p.value}s`,
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
  clipSeconds: (p: { seconds: string }): string => `${p.seconds}s`,
  /** The knob-override dot's hover title. */
  knobOverrideTitle: "This call overrides run knobs (per-call)",
  /** The reference-image badge's hover title (singular/plural). */
  refImagesTitle: (p: { count: number }): string => `${p.count} reference image${p.count === 1 ? "" : "s"} (guide + extras)`,
  /** The clip delete button's accessible name. */
  deletePromptCardAria: "Delete this prompt card",
  // ── Audio clips + slices ─────────────────────────────────────────────
  /** An audio clip's hover title (name · window · gain — drag law). */
  audioClipTitle: (p: { name: string; start: string; end: string; gain: string | null }): string =>
    `${p.name} · ${p.start}–${p.end}s${p.gain !== null ? ` · gain ${p.gain}` : ""} — drag to move`,
  /** The audio clip delete button's accessible name. */
  deleteClipAria: (p: { name: string }): string => `Delete ${p.name}`,
  /** A stem slice's hover title (which call hears which window). */
  audioSliceTitle: (p: { call: number; start: string; end: string }): string => `call #${p.call} · window hears bed ${p.start}–${p.end}s`,
  /** A stem slice's rendered range ("1.0–3.5s"). */
  sliceRange: (p: { start: string; end: string }): string => `${p.start}–${p.end}s`,
  /** The empty audio lane's drop hint. */
  audioDropHint: "drop or upload audio — clips land where you drop them, drag to move",
  // ── Keyframes ────────────────────────────────────────────────────────
  /** A keyframe pin's accessible name. */
  keyframeAria: (p: { track: string; frame: number }): string => `${p.track} keyframe at frame ${p.frame}`,
  /** A keyframe delete button's accessible name. */
  deleteKeyframeAria: (p: { track: string; frame: number }): string => `Delete ${p.track} keyframe at frame ${p.frame}`,
  // ── The scrub bar (the form card's bottom seam) ──────────────────────
  /** The toggle's accessible name while playing. */
  scrubPauseAria: "Pause",
  /** The toggle's accessible name while paused. */
  scrubPlayAria: "Play",
  /** The scrub track's accessible name. */
  scrubAria: "Timeline scrub",
  /** The track's value text ("1.2s of 9.8s"). */
  scrubValuetext: (p: { current: string; duration: string }): string => `${p.current} of ${p.duration}`,
  /** The readout's frame column (" · frame 24/96"). */
  scrubFramesSuffix: (p: { frame: number; total: number }): string => ` · frame ${p.frame}/${p.total}`,
  /** The sub-minute second unit ("5.2s"). */
  secondsUnit: "s",
} as const
