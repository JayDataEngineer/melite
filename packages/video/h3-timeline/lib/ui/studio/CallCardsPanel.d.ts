import { type SpecField } from "@melite/card-base/client";
import type { CallRefs, DocCall, DocKeyframe, LayerA } from "./docModel.js";
import type { LinkArtifact } from "./refUtils.js";
import type { TimelineSelection } from "./useViewSelection.js";
/** Handlers + bags the call-card tree needs (all owned by the tenant). */
export interface CallCardDeps {
    selected: TimelineSelection | null;
    fps: number;
    /** The run's Layer A — feeds the knob fold's inherited ghosts
     *  (the 2026-09-15 "inherit" wall: an unset knob shows the value
     *  it inherits from the run, never the bare word "inherit"). */
    layerA?: LayerA;
    /** THE OVERRIDE LAYER'S SCHEMA TRUTH (hour 22): the served
     *  envelope's SpecField walk keyed by wire name — the knob fold
     *  rides the generic OverlayKnob on it. No per-card projection
     *  (the old knob-spec.gen silently dropped `default` and the face
     *  said "inherit" while the admission gate composed 12). Owned by
     *  the tenant, fetched once. */
    knobFields: Record<string, SpecField>;
    callCardRefs: {
        current: (HTMLDivElement | null)[];
    };
    artifactIndex: {
        byName: Map<string, string>;
        byUrl: Map<string, string>;
    };
    linkGroups: LinkArtifact[];
    refArtifacts: Array<{
        name: string;
        url: string;
    }>;
    handlePromptDelete: (id: string) => void;
    handlePromptUpdate: (id: string, text: string) => void;
    enhanceOne: (key: string, text: string, apply: (t: string) => void) => void;
    undoEnhance: (key: string, apply: (t: string) => void) => void;
    enhancing: Record<string, boolean>;
    enhanceErr: Record<string, string | null>;
    enhanceUndo: Record<string, string>;
    setCallSpan: (i: number, which: "start" | "end", frame: number) => void;
    setCallGuide: (i: number, kind: "image" | "clip" | "audio", source: string) => void;
    setCallTransition: (i: number, t: "extend" | "cut") => void;
    setCallRefs: (i: number, key: keyof CallRefs, value: string) => void;
    setCallKnob: (i: number, key: string, value: number | string | boolean | undefined) => void;
    /** THE PIN MAP (door-guard UX arm): call indexes whose windows
     * carry a dialogue/sfx clip — their Ref audios bucket grays out
     * (the pinned window owns its audio conditioning). */
    voicePinnedCalls?: Set<number>;
    /** THE BLOCKER (2026-09-22): any D-M-E clip present → the Ref
     * audios bucket grays out on EVERY call (the timeline owns the
     * model's audio inputs while it carries clips). */
    audioClipsPresent?: boolean;
}
/** Layer B rail: compact call rows ⇄ focused call editor + legacy
 *  keyframes (monolith lines 3320–3416 + 3847–3924; per-call bodies
 *  render through CallCard). */
export declare function CallCardsPanel({ calls, selected, setSelected, fps, sourceOptions, keyframes, handleKeyframeMove, handleKeyframeDelete, setKeyframeSource, deps, }: {
    calls: DocCall[];
    selected: TimelineSelection | null;
    setSelected: (s: TimelineSelection | null) => void;
    fps: number;
    sourceOptions: Array<{
        title: string;
        name: string;
    }>;
    keyframes: DocKeyframe[];
    handleKeyframeMove: (id: string, frame: number) => void;
    handleKeyframeDelete: (id: string) => void;
    setKeyframeSource: (i: number, source: string) => void;
    deps: CallCardDeps;
}): import("react").JSX.Element;
//# sourceMappingURL=CallCardsPanel.d.ts.map
