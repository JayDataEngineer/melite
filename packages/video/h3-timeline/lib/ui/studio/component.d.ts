/**
 * VideoTimelineStudio — tenant #4, the timeline card's wide authoring
 * surface (dev_docs/design/video-timeline-card.md §3 D3 + §7 S5 + §10).
 *
 * WHAT IT IS: the DOCUMENT, editable — with the THREE-LAYER control
 * system usable (2026-08-15 rework — "the card [REDACTED 2026-11-05], it is missing 95%
 * of the features discussed"):
 *
 *   LAYER A    the Run panel (tl-run-panel) — in the LEFT SIDEBAR (the
 *              rail IS the parameter surface — the viewport belongs to
 *              the video): global values every model
 *              call inherits — Recipe (preset/fps/audio mode/continuity/
 *              seed) + Engine (shift/sampler/scheduler/steps/accel) +
 *              positioned audio clips (audio_clips — NLE-style Music row).
 *              Legacy docs with audio_stem are converted to clips on load.
 *              These write the doc-level keys; calls inherit them, per-call
 *              overrides REPLACE them (backend CALL_KNOB_KEYS, §10.3).
 *   LAYER B    the call cards (data-call-card): ONE entity per MODEL
 *              CALL — the prompt (a `text` prompt, or `beats` prompt
 *              segments — Layer C WITHIN the call), the span (start/end
 *              frames, synced both ways with the bar), the three guide
 *              sources (image/clip/audio — anchored at the call's
 *              start), and the "Call knobs" fold (per-call REPLACE over
 *              Layer A; absent knob = inherit; a call with overrides
 *              shows a cyan dot on its bar clip).
 *   LAYER C    prompt beats — SEGMENTS WITHIN a call (2026-08-16, the
 *              B/C conflation fix: a beat is a SUBSET of a model call,
 *              never the timeline entity). Segments join into the
 *              call's ONE prompt with time markers ("(0.0-4.2s): …")
 *              and NEVER cut — cuts land on CALL boundaries. A segment
 *              may CROSS a call boundary (one unbroken bar, ≥1 frame
 *              owned by its call): the compiler slices it at the
 *              window cut with window-local markers — the user never
 *              slices manually. The strip
 *              (MotionTimelineBar) shows CALLS: cut an edge = a new
 *              model call at that timestamp, the window render previews
 *              inside the clip (hover plays it), and the BEATS row
 *              under the calls renders the segments. Clicking a CALL or
 *              BEAT clip SELECTS it — the LEFT SIDEBAR SHIFTS MODE (the
 *              mode-switching rail, 2026-08-16): global params (Layer A +
 *              compact call rows) ⇄ THAT item's full editor (its card,
 *              scrolled + ringed). A click on the EMPTY timeline — or the
 *              rail's back button — shifts back to global.
 *
 * THE VIEW MODEL is MotionTimelineBar (the pose-studio DOM clips — the
 * 2026-08-14 model that REPLACED the vendored viser canvas; D3's
 * component reference predates that retirement). Reused, not forked:
 * the bar is the interaction model, and this tenant passes its own
 * lanes/labels/packed mode.
 *
 * E1 (the pattern, dev_docs/design/card-studio-pattern.md §3): a studio is a
 * param editor. The registry's `writes` set (cardStudios.ts) is the
 * DECLARED surface — the document keys + every Layer A doc key the run
 * panel owns; the E4 contract test drives real gestures and asserts
 * every onSave key ∈ that set.
 *
 * FRAMES: the document's end_frame is EXCLUSIVE (calls tile 0..T exactly —
 * plan_windows' contiguity rule); the bar's end_frame is INCLUSIVE (the
 * last frame index). The hydrate/serialize helpers are the ONLY places
 * that translate (prompt.end = call.end - 1).
 *
 * SPLIT (2026-09-06): pure move into focused modules under ui/studio/
 * (doc model + hydrate, ref utils, use- hooks, Run/Call/Studio panes) —
 * every logic line below the imports is verbatim from the monolith.
 */
import type { CardStage } from "@melite/contracts";
export { stemToClip } from "./docModel.js";
export declare function VideoTimelineStudio({ stage, running, onSave, upstreams, }: {
    stage: CardStage;
    running: boolean;
    onSave: (params: Record<string, unknown>) => void;
    upstreams?: CardStage[];
}): import("react").JSX.Element;
export default VideoTimelineStudio;
/** THE SHELL RIDE, as data (row 5 stroke 4) — LIVE since the
 *  2026-09-07 chrome stroke: the body renders StudioShell with these
 *  seams (the rail IS the parameter surface; the video windows own
 *  the viewport, kind "native" — the card renders no shared
 *  viewport; MotionTimelineBar is the view model on the bottom). */
export declare const shellDeclaration: Readonly<import("@melite/card-base/client").ShellDeclaration>;
//# sourceMappingURL=component.d.ts.map
