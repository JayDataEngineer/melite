/**
 * actionCopy.ts — THE MOTION/UI COPY DICTIONARY (the copy-scope
 * extension, 2026-11-05). Client UI copy is locale-owned (the estate's
 * decision, the DSH verify-client-i18n law): presentation code owns no
 * copy literals; it consumes them here through the typed seat. A second
 * locale plugs into this dictionary without touching a single
 * action-card viewer.
 *
 * THE BOUND: static user-visible FACES of the pose stage and the motion
 * poster/viewer live here. Parameterized sentences whose shape is fixed
 * but whose slots are live live here as typed dict functions (the
 * square.ts pattern). DATA never rides the dictionary: engine refusal
 * strings and decode-error detail text pass through as live values
 * (the `{error}` slots), never dictionary entries.
 *
 * UNIT LAW: this tree compiles as separate tsc build units
 * (motion/ui's rootDir is motion/ui; src's rootDir is src), so the
 * tree's copy seats one dictionary PER UNIT — this file owns the
 * motion/ui unit's faces; the poster shell's face lives in
 * src/actionCopy.ts. No string appears in both.
 */
/** The typed dictionary. Keys are stable copy ids. */
// v8 ignore next -- exercised key-by-key by the copy wall's census arm
export const actionCopy = {
    // ── Pose stage (viewer3d) ────────────────────────────────────────────
    /** The pose stage's mesh-loading face. */
    poseLoadingMesh: "Loading mesh…",
    /** The pose stage's mesh-failure lead (the detail is the live error). */
    poseMeshError: (p) => `Mesh error: ${p.error}`,
    /** The pose stage's no-data face. */
    poseNoMesh: "No mesh",
    // ── Motion poster ────────────────────────────────────────────────────
    /** The poster skeleton's accessible name while the snapshot renders. */
    posterLoadingLabel: "Loading motion preview",
    /** The rendered poster image's alt text. */
    posterAlt: "Motion preview",
    // ── Motion viewer ────────────────────────────────────────────────────
    /** The viewer's failure-state title (the detail is the live error). */
    viewerUnavailable: "Motion preview unavailable",
    /** The viewer skeleton's accessible name while frames decode. */
    viewerLoading: "Loading motion",
    /** The play toggle's accessible name (the Space shortcut named). */
    playAria: "Play (Space)",
    /** The pause toggle's accessible name (the Space shortcut named). */
    pauseAria: "Pause (Space)",
    /** The scrub input's accessible name. */
    seekAria: "Seek",
    /** The transport's fps badge ("<fps> fps · <frames>f"). */
    fpsBadge: (p) => `${p.fps} fps · ${p.frames}f`,
};
//# sourceMappingURL=actionCopy.js.map
