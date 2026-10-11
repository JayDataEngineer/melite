/**
 * h3-timeline studio split (2026-09-06) — PURE MOVE from
 * ui/studio/component.tsx. No behavior change: headers/footers are new,
 * every logic line is verbatim from the monolith (source range noted).
 */
import { useEffect, useRef, useState } from "react"
import type { CardStage } from "@melite/contracts"
import type { DocCall, DocKeyframe, LayerA } from "./docModel.ts"
import { hydrateLayerA, serializeLayerA } from "./docHydrate.ts"
import { hydrateCalls, hydrateKeyframes, serializeCalls, corruptCallsField } from "./docCalls.ts"

/** Document state (tenant §1). Verbatim lines 1536–1560. */
export function useDocState(stage: CardStage, opts?: { hasUnsettledWrites?: () => boolean }) {
  // ── Document state: hydrate ONCE from stage.params (lazy initializer —
  // studio state = f(stage.params), rehydrated on mount; the card form /
  // the agent are the other writers, and their mid-session edits ride the
  // next mount). Persist guards hold the last-saved snapshot so the
  // effects can no-op on mount (no redundant write, no recompute churn).
  const [calls, setCalls] = useState<DocCall[]>(() =>
    hydrateCalls({ calls: stage.params?.calls, beats: stage.params?.beats }))
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
  const rawList: unknown = Array.isArray(stage.params?.calls) && (stage.params?.calls as unknown[]).length > 0
    ? stage.params?.calls
    : Array.isArray(stage.params?.beats) && (stage.params?.beats as unknown[]).length > 0
      ? stage.params?.beats
      : null
  const rawPresent = rawList !== null
    || corruptCallsField({ calls: stage.params?.calls, beats: stage.params?.beats }) !== null
  const lastCallsRef = useRef(rawPresent ? JSON.stringify(calls) : "")
  const [keyframes, setKeyframes] = useState<DocKeyframe[]>(() => hydrateKeyframes(stage.params?.keyframes))
  const [layerA, setLayerA] = useState<LayerA>(() => hydrateLayerA(stage.params))
  // The model ROUTE: params.model (the Layer A selector — wins at the
  // run door) → the STAGE's model (a flow authored on the
  // timeline-ref2fa/ref2va variant) → FL2VA default. Drives which
  // THE ROUTE LENS IS DEAD (operator 2026-09-20: "we use ONE
  // model") — the fused checkpoint takes anchors AND refs in one
  // graph; there is no second wiring to detect.
  const lastKeyframesRef = useRef(JSON.stringify(keyframes))
  const lastLayerARef = useRef(JSON.stringify(serializeLayerA(layerA)))
  const stateRef = useRef({ calls, keyframes, layerA })
  stateRef.current = { calls, keyframes, layerA }
  const stageIdRef = useRef(stage.id)
  const paramsSignature = JSON.stringify(stage.params ?? {})
  // the probe rides a ref (guard-time read — the ledger is the
  // truth, never a render's frozen copy; and a ref-read keeps the
  // re-hydrate effect's deps honest).
  const probeRef = useRef<(() => boolean) | undefined>(undefined)
  probeRef.current = opts?.hasUnsettledWrites
  // THE RESEND EPOCH (the h3-timeline void, 2026-10-11): the dirty
  // guard below re-points a channel's guard WITHOUT touching its
  // state — the persist effects (deps [calls]/[keyframes]/[layerA])
  // would never re-fire, so the kept-local content would sit unsent
  // until the next keystroke (and a Run before that composed stale).
  // Every dirty-keep bumps this epoch; the persist effects watch it
  // and re-run, sending exactly the diverged channels. A bump
  // re-renders once; the re-hydrate effect's own deps are unchanged
  // by it, so no loop.
  const [resendEpoch, setResendEpoch] = useState(0)

  useEffect(() => {
    const incomingCalls = hydrateCalls({ calls: stage.params?.calls, beats: stage.params?.beats })
    const incomingKeyframes = hydrateKeyframes(stage.params?.keyframes)
    const incomingLayerA = hydrateLayerA(stage.params)
    const current = stateRef.current
    const currentSignature = JSON.stringify({
      calls: serializeCalls(current.calls),
      keyframes: current.keyframes,
      layerA: serializeLayerA(current.layerA),
    })
    const incomingSignature = JSON.stringify({
      calls: serializeCalls(incomingCalls),
      keyframes: incomingKeyframes,
      layerA: serializeLayerA(incomingLayerA),
    })
    const stageChanged = stageIdRef.current !== stage.id
    stageIdRef.current = stage.id
    if (!stageChanged && currentSignature === incomingSignature) {
      const rawList = Array.isArray(stage.params?.calls) && (stage.params?.calls as unknown[]).length > 0
        ? stage.params?.calls
        : Array.isArray(stage.params?.beats) && (stage.params?.beats as unknown[]).length > 0
          ? stage.params?.beats
          : null
      // corrupt sources HOLD here too — never re-arm the persist
      // over an unparseable document (CRITICAL-1's second arm)
      const rawPresent = rawList !== null
        || corruptCallsField({ calls: stage.params?.calls, beats: stage.params?.beats }) !== null
      lastCallsRef.current = rawPresent ? JSON.stringify(incomingCalls) : ""
      lastKeyframesRef.current = JSON.stringify(incomingKeyframes)
      lastLayerARef.current = JSON.stringify(serializeLayerA(incomingLayerA))
      return
    }
    if (stageChanged) {
      lastCallsRef.current = JSON.stringify(current.calls)
      lastKeyframesRef.current = JSON.stringify(current.keyframes)
      lastLayerARef.current = JSON.stringify(serializeLayerA(current.layerA))
      setCalls(incomingCalls)
      setKeyframes(incomingKeyframes)
      setLayerA(incomingLayerA)
      return
    }
    // THE DIRTY GUARD (the h3-timeline void, 2026-10-11): the old
    // code adopted the incoming document UNCONDITIONALLY — a refresh
    // landing with stale server content reverted the operator's
    // visible text mid-typing, and the persist then wrote the
    // reverted (or starter) doc back over their work. Each channel
    // now decides alone over THREE positions — the local, the
    // last-SENT snapshot (the persist guard), and the incoming:
    // - local == incoming: converged (re-point the guard, no touch).
    // - local == sent but incoming differs: EITHER a stale read
    //   racing our own send OR another hand's write. The host's
    //   unsettled-write probe breaks the tie: our send still
    //   unsettled → STALE RACE — hold the local AND the guards
    //   (the persist stays quiet since local == sent; a later
    //   refresh converges); nothing outstanding → FOREIGN TRUTH
    //   (the card form, the agent, an undo) — adopt, re-pointing
    //   the guard at the pre-adopt local so the persist echoes the
    //   adopted content (the migration echo the clean path always
    //   had). Hosts without a ledger read settled (pre-probe law).
    // - local != sent: DIRTY (newer than the last send) — keep the
    //   local and re-point its guard at the incoming server position,
    //   which re-fires the persist with the local (one self-healing
    //   resend via resendEpoch, not a storm: the send advances the
    //   guard to the local).
    const unsettled = probeRef.current?.() === true
    const guardChannel = (
      local: string,
      sent: string,
      incoming: string,
      adopt: () => void,
      repoint: (to: string) => void,
    ): void => {
      if (local === incoming) {
        repoint(incoming)
        return
      }
      if (local === sent) {
        if (!unsettled) {
          repoint(local)
          adopt()
        }
        return
      }
      repoint(incoming)
      setResendEpoch((e) => e + 1)
    }
    guardChannel(
      JSON.stringify(current.calls),
      lastCallsRef.current,
      JSON.stringify(incomingCalls),
      () => setCalls(incomingCalls),
      (to) => { lastCallsRef.current = to },
    )
    guardChannel(
      JSON.stringify(current.keyframes),
      lastKeyframesRef.current,
      JSON.stringify(incomingKeyframes),
      () => setKeyframes(incomingKeyframes),
      (to) => { lastKeyframesRef.current = to },
    )
    guardChannel(
      JSON.stringify(serializeLayerA(current.layerA)),
      lastLayerARef.current,
      JSON.stringify(serializeLayerA(incomingLayerA)),
      () => setLayerA(incomingLayerA),
      (to) => { lastLayerARef.current = to },
    )
  }, [paramsSignature, stage.id])

  return {
    calls, setCalls, keyframes, setKeyframes, layerA, setLayerA,
    lastCallsRef, lastKeyframesRef, lastLayerARef, resendEpoch,
  }
}
