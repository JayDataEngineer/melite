/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import type { TimelineKeyframe, TimelinePrompt } from "@melite-plugin/timeline/ui/timeline";
import type { DocCall, DocKeyframe } from "./docModel.js";
/** An array-SHAPED string that will not parse (or parses to a
 * non-array) is a CORRUPT calls/beats document — the 2026-08-30 crime
 * class ("the persist effect wrote 1 call back, and the multi-call
 * plan was destroyed permanently"). The parseable case self-heals
 * (parse → the mount persist rewrites it as a real array); the
 * corrupt case must never fall to the starter SILENTLY. The studio
 * shows the starter as VIEW state, the corruption is named loudly
 * here, and useDocState's sentinel treats the field as PRESENT so no
 * mount-persist ever writes the starter back over the corrupt
 * source. Non-array-shaped strings ("not-json") are foreign values
 * the vocabulary has always tolerated — not this crime. */
export declare function corruptCallsField(raw: {
    calls?: unknown;
    beats?: unknown;
}): "calls" | "beats" | null;
export declare function hydrateCalls(raw: {
    calls?: unknown;
    beats?: unknown;
}): DocCall[];
export declare function hydrateKeyframes(raw: unknown): DocKeyframe[];
export declare const hasKnobs: (c: DocCall) => boolean;
/** Document → bar prompts. end_frame inclusive; uuid is the call's index
 * (index-derived ids are stable for the life of a gesture — no gesture
 * spans a structural change, and every render re-derives consistently).
 * `override` = the call carries per-call knobs → the cyan dot (Layer C
 * shows where a call departs from the run's globals). */
export declare function callsToPrompts(calls: DocCall[], fps: number): TimelinePrompt[];
/** Document keyframes → bar diamonds. Same index-derived uuid contract.
 * Legacy/frame-exact keyframes only — beat-attached guides are NOT lane
 * diamonds (2026-08-15): the beat is one entity and its guides live in
 * the beat panel; the lanes render only when the document actually
 * carries hand keyframes. */
export declare function keyframesToLanes(kfs: DocKeyframe[]): TimelineKeyframe[];
/** Calls → the persisted document shape (the `calls` vocabulary, Layer
 * B): guide keys ride ONLY when non-blank (blank = none — the planner's
 * contract, kept here so the saved doc never carries "" noise); knobs
 * ride only when non-empty, and every knob value is written VERBATIM
 * (undefined was never stored — the setter deletes the key, so absent
 * IS inherit, never null). The prompt is ONE `text` — segments were
 * cut 2026-09-15 (hydration joins old beats' texts; the serializer
 * never writes beats). */
export declare function serializeCalls(calls: DocCall[]): DocCall[];
export declare const callIndexOf: (id: string) => number;
export declare const kfIndexOf: (id: string) => number;
//# sourceMappingURL=docCalls.d.ts.map
