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
export declare const timelineCopy: {
    /** A new audio track's fallback label (F-B4, the 2026-11-05 timeline
     *  nativity audit: melite-authored copy planted outside the dict at
     *  store/timelineAudio.ts — the pin's own admitted debt seat). */
    readonly audioTrackFallback: (n: number) => string;
    /** The prompts lane's gutter head (the bar's default label). */
    readonly lanePrompts: "Prompts";
    /** The beats lane's gutter head (the bar's default label). */
    readonly laneBeats: "Beats";
    /** A chapter marker's auto label when the caller names none. */
    readonly markerAutoLabel: (p: {
        index: number;
    }) => string;
    /** The keyframe lanes' empty hint (the bar's default). */
    readonly laneHintDefault: "Double-click a lane to pin a pose constraint at the playhead";
    /** The prompts lane's empty hint (the bar's default). */
    readonly emptyPromptsHint: "No prompt cards — the Add button carves one";
    /** The beats lane's empty hint (the bar's default). */
    readonly beatsHintDefault: "double-click to add a beat — prompt segments join into the call's one prompt";
    /** The zoom-out button's accessible name. */
    readonly zoomOutAria: "Zoom out";
    /** The zoom-in button's accessible name. */
    readonly zoomInAria: "Zoom in";
    /** The fit-to-window button's hover title + accessible name. */
    readonly zoomFitTip: "Fit to window (reset zoom)";
    /** The fit-to-window button's rendered glyph text. */
    readonly zoomFitLabel: "fit";
    /** A stem-carrying layer's hover title (the bed-under-every-cut law). */
    readonly audioBedTitle: (p: {
        stem: string;
    }) => string;
    /** A layer head's hover title before a stem is wired. */
    readonly audioDropTitle: "drop an audio / music track — sliced to each window in time";
    /** The add door's accessible name for one layer. */
    readonly addClipAria: (p: {
        label: string;
    }) => string;
    /** The add door's hover title for one layer. */
    readonly addClipTitle: (p: {
        label: string;
    }) => string;
    /** The detach button's accessible name for one layer. */
    readonly detachAria: (p: {
        label: string;
    }) => string;
    /** The ruler tick's second-suffixed label. */
    readonly tickSeconds: (p: {
        value: string;
    }) => string;
    /** A first clip's dead left-edge hover title (the frame-0 wall). */
    readonly firstCallTitle: "First call — nothing before it to trim into";
    /** The extend-seam dot's hover title. */
    readonly seamExtendTitle: "extend — latent tail carries across this seam";
    /** The clip editor's placeholder. */
    readonly promptPlaceholder: "Enter prompt…";
    /** A clip's face when its prompt text is empty. */
    readonly emptyClip: "(empty)";
    /** A clip's duration chip ("2.4s"). */
    readonly clipSeconds: (p: {
        seconds: string;
    }) => string;
    /** The knob-override dot's hover title. */
    readonly knobOverrideTitle: "This call overrides run knobs (per-call)";
    /** The reference-image badge's hover title (singular/plural). */
    readonly refImagesTitle: (p: {
        count: number;
    }) => string;
    /** The clip delete button's accessible name. */
    readonly deletePromptCardAria: "Delete this prompt card";
    /** An audio clip's hover title (name · window · gain — drag law). */
    readonly audioClipTitle: (p: {
        name: string;
        start: string;
        end: string;
        gain: string | null;
    }) => string;
    /** The audio clip delete button's accessible name. */
    readonly deleteClipAria: (p: {
        name: string;
    }) => string;
    /** A stem slice's hover title (which call hears which window). */
    readonly audioSliceTitle: (p: {
        call: number;
        start: string;
        end: string;
    }) => string;
    /** A stem slice's rendered range ("1.0–3.5s"). */
    readonly sliceRange: (p: {
        start: string;
        end: string;
    }) => string;
    /** The empty audio lane's drop hint. */
    readonly audioDropHint: "drop or upload audio — clips land where you drop them, drag to move";
    /** A keyframe pin's accessible name. */
    readonly keyframeAria: (p: {
        track: string;
        frame: number;
    }) => string;
    /** A keyframe delete button's accessible name. */
    readonly deleteKeyframeAria: (p: {
        track: string;
        frame: number;
    }) => string;
    /** The toggle's accessible name while playing. */
    readonly scrubPauseAria: "Pause";
    /** The toggle's accessible name while paused. */
    readonly scrubPlayAria: "Play";
    /** The scrub track's accessible name. */
    readonly scrubAria: "Timeline scrub";
    /** The track's value text ("1.2s of 9.8s"). */
    readonly scrubValuetext: (p: {
        current: string;
        duration: string;
    }) => string;
    /** The readout's frame column (" · frame 24/96"). */
    readonly scrubFramesSuffix: (p: {
        frame: number;
        total: number;
    }) => string;
    /** The sub-minute second unit ("5.2s"). */
    readonly secondsUnit: "s";
};
//# sourceMappingURL=timelineCopy.d.ts.map
