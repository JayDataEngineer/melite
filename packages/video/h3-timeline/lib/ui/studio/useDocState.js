/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useEffect, useRef, useState } from "react";
import { hydrateLayerA, serializeLayerA } from "./docHydrate.js";
import { hydrateCalls, hydrateKeyframes, serializeCalls, corruptCallsField } from "./docCalls.js";
/** Document state (tenant §1). Verbatim lines 1536–1560. */
export function useDocState(stage) {
    // ── Document state: hydrate ONCE from stage.params (lazy initializer —
    // studio state = f(stage.params), rehydrated on mount; the card form /
    // the agent are the other writers, and their mid-session edits ride the
    // next mount). Persist guards hold the last-saved snapshot so the
    // effects can no-op on mount (no redundant write, no recompute churn).
    const [calls, setCalls] = useState(() => hydrateCalls({ calls: stage.params?.calls, beats: stage.params?.beats }));
    // THE STICKY STARTER (stroke 41 — the operator's "h3 timeline is
    // broken: card_compose phase 1 … no calls to compose"): a fresh
    // stage carries NO calls (the add door seeds {}), hydrate falls
    // back to STARTER_CALLS — and the guard used to initialize to the
    // HYDRATED serialization, so the mount-time persist no-opped and
    // the stage stayed calls-less until the first manual edit. A Run
    // Stages that carried calls keep the no-op-on-mount behavior
    // exactly. A CORRUPT array-shaped calls/beats string also counts
    // as PRESENT (the fallback audit's CRITICAL-1): the starter shows
    // as view state, but the sentinel HOLDS — the mount persist never
    // writes the default back over the corrupt source. The parseable
    // legacy string still arms (""), so the designed self-heal
    // migration (parse → persist as a real array) is untouched.
    const rawList = Array.isArray(stage.params?.calls) && (stage.params?.calls).length > 0
        ? stage.params?.calls
        : Array.isArray(stage.params?.beats) && (stage.params?.beats).length > 0
            ? stage.params?.beats
            : null;
    const rawPresent = rawList !== null
        || corruptCallsField({ calls: stage.params?.calls, beats: stage.params?.beats }) !== null;
    const lastCallsRef = useRef(rawPresent ? JSON.stringify(calls) : "");
    const [keyframes, setKeyframes] = useState(() => hydrateKeyframes(stage.params?.keyframes));
    const [layerA, setLayerA] = useState(() => hydrateLayerA(stage.params));
    // The model ROUTE: params.model (the Layer A selector — wins at the
    // run door) → the STAGE's model (a flow authored on the
    // timeline-ref2fa/ref2va variant) → FL2VA default. Drives which
    // THE ROUTE LENS IS DEAD (operator 2026-09-20: "we use ONE
    // model") — the fused checkpoint takes anchors AND refs in one
    // graph; there is no second wiring to detect.
    const lastKeyframesRef = useRef(JSON.stringify(keyframes));
    const lastLayerARef = useRef(JSON.stringify(serializeLayerA(layerA)));
    const stateRef = useRef({ calls, keyframes, layerA });
    stateRef.current = { calls, keyframes, layerA };
    const stageIdRef = useRef(stage.id);
    const paramsSignature = JSON.stringify(stage.params ?? {});
    useEffect(() => {
        const incomingCalls = hydrateCalls({ calls: stage.params?.calls, beats: stage.params?.beats });
        const incomingKeyframes = hydrateKeyframes(stage.params?.keyframes);
        const incomingLayerA = hydrateLayerA(stage.params);
        const current = stateRef.current;
        const currentSignature = JSON.stringify({
            calls: serializeCalls(current.calls),
            keyframes: current.keyframes,
            layerA: serializeLayerA(current.layerA),
        });
        const incomingSignature = JSON.stringify({
            calls: serializeCalls(incomingCalls),
            keyframes: incomingKeyframes,
            layerA: serializeLayerA(incomingLayerA),
        });
        const stageChanged = stageIdRef.current !== stage.id;
        stageIdRef.current = stage.id;
        if (!stageChanged && currentSignature === incomingSignature) {
            const rawList = Array.isArray(stage.params?.calls) && (stage.params?.calls).length > 0
                ? stage.params?.calls
                : Array.isArray(stage.params?.beats) && (stage.params?.beats).length > 0
                    ? stage.params?.beats
                    : null;
            // corrupt sources HOLD here too — never re-arm the persist
            // over an unparseable document (CRITICAL-1's second arm)
            const rawPresent = rawList !== null
                || corruptCallsField({ calls: stage.params?.calls, beats: stage.params?.beats }) !== null;
            lastCallsRef.current = rawPresent ? JSON.stringify(incomingCalls) : "";
            lastKeyframesRef.current = JSON.stringify(incomingKeyframes);
            lastLayerARef.current = JSON.stringify(serializeLayerA(incomingLayerA));
            return;
        }
        lastCallsRef.current = JSON.stringify(current.calls);
        lastKeyframesRef.current = JSON.stringify(current.keyframes);
        lastLayerARef.current = JSON.stringify(serializeLayerA(current.layerA));
        setCalls(incomingCalls);
        setKeyframes(incomingKeyframes);
        setLayerA(incomingLayerA);
    }, [paramsSignature, stage.id]);
    return {
        calls, setCalls, keyframes, setKeyframes, layerA, setLayerA,
        lastCallsRef, lastKeyframesRef, lastLayerARef,
    };
}
//# sourceMappingURL=useDocState.js.map
