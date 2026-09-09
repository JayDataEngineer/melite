/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useRef, useState } from "react"
import type { CardStage } from "@melite/contracts"
import type { DocCall, DocKeyframe, LayerA } from "./docModel"
import { hydrateLayerA, serializeLayerA } from "./docHydrate"
import { hydrateCalls, hydrateKeyframes } from "./docCalls"

/** Document state (tenant §1). Verbatim lines 1536–1560. */
export function useDocState(stage: CardStage) {
  // ── Document state: hydrate ONCE from stage.params (lazy initializer —
  // studio state = f(stage.params), rehydrated on mount; the card form /
  // the agent are the other writers, and their mid-session edits ride the
  // next mount). Persist guards hold the last-saved snapshot so the
  // effects can no-op on mount (no redundant write, no recompute churn).
  const [calls, setCalls] = useState<DocCall[]>(() =>
    hydrateCalls({ calls: stage.params?.calls, beats: stage.params?.beats }))
  const [keyframes, setKeyframes] = useState<DocKeyframe[]>(() => hydrateKeyframes(stage.params?.keyframes))
  const [layerA, setLayerA] = useState<LayerA>(() => hydrateLayerA(stage.params))
  // The model ROUTE: params.model (the Layer A selector — wins at the
  // run door) → the STAGE's model (a flow authored on the
  // timeline-ref2fa/ref2va variant) → FL2VA default. Drives which
  // per-call inputs the call editor shows (FL2VA: first/last frame
  // subcards; Ref2VA: the per-call identity refs section).
  const stageModel = typeof (stage as { model?: unknown }).model === "string"
    ? String((stage as { model?: unknown }).model) : ""
  const routeKey = layerA.model ?? layerA.variant ?? stageModel
  // The agent-lane ROUTE id is "h3-timeline-ref" (no "ref2va" substring —
  // that lives in the CHECKPOINT name, minimax_h3_ref2va_*); the variant id
  // "timeline-ref2va" does carry it. Match both spellings.
  const isRef2va = routeKey === "h3-timeline-ref" || routeKey.includes("ref2va")
  const lastCallsRef = useRef(JSON.stringify(calls))
  const lastKeyframesRef = useRef(JSON.stringify(keyframes))
  const lastLayerARef = useRef(JSON.stringify(serializeLayerA(layerA)))

  return {
    calls, setCalls, keyframes, setKeyframes, layerA, setLayerA,
    stageModel, routeKey, isRef2va,
    lastCallsRef, lastKeyframesRef, lastLayerARef,
  }
}
