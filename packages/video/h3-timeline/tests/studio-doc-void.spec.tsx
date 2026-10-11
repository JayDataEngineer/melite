/**
 * studio-doc-void — the h3-timeline void, 2026-10-11 (BEHAVIORAL).
 *
 * THE INCIDENT: the operator typed a prompt (+ reference image) into
 * the h3 studio — the persist carried ~88 `params:calls` patches onto
 * the estate (bench-session-aaf6b92b revs 50–137) — then pressed Run
 * and the generation composed seed-only placeholders. The run's own
 * `_request.json` carried NO calls; the film rendered defaults.
 *
 * THE MECHANISM (two kills, both proven from the draft log):
 *  K1. the drill's Run flush nulled every held key outside the
 *      drill's open-time user map (rev 138: calls; s_2's rev 151:
 *      input_images) — fixed in stage-drill (null-domain = touched
 *      ∪ seed-dropped), pinned in cards-tab-run-studio.spec.tsx.
 *  K2. the studio's re-hydrate adopted the incoming document
 *      UNCONDITIONALLY — a refresh landing with stale server content
 *      reverted visible text mid-typing, and the persist wrote the
 *      reverted (or starter) doc back over the operator's work.
 *
 * THIS FILE pins K2's cure at the production wiring (useDocState +
 * useDocEffects composed exactly as component.tsx composes them):
 * typing saves, a stale refresh while our send is unsettled HOLDS
 * the local and sends nothing, a settled refresh adopts the other
 * hand, dirty content resends exactly once, and a converged refresh
 * is quiet.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useDocState } from "../src/ui/studio/useDocState.ts"
import { useDocEffects } from "../src/ui/studio/useDocEffects.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import type { CardStage } from "@melite/contracts"

const A = [{ text: "operator prompt A", start_frame: 0, end_frame: 90 }]
const B = [{ text: "operator prompt B (typed after mount)", start_frame: 0, end_frame: 90 }]
const X = [{ text: "the other hand wrote X", start_frame: 0, end_frame: 90 }]

function chain(initial: {
  params: unknown
  probe?: () => boolean
}) {
  const saved: Record<string, unknown>[] = []
  const h = renderHook(
    ({ params, probe }: { params: unknown; probe?: () => boolean }) => {
      const doc = useDocState({ id: "s_1", params } as unknown as CardStage, { hasUnsettledWrites: probe })
      useDocEffects({
        totalFrames: 96,
        setFrameIdx: () => {},
        selected: null,
        setSelected: () => {},
        calls: doc.calls,
        keyframes: doc.keyframes,
        layerA: doc.layerA,
        setLayerA: doc.setLayerA,
        onSave: (p) => { saved.push(p) },
        callCardRefs: { current: [] },
        beatRowRefs: { current: [] },
        lastCallsRef: doc.lastCallsRef,
        lastKeyframesRef: doc.lastKeyframesRef,
        lastLayerARef: doc.lastLayerARef,
        resendEpoch: doc.resendEpoch,
      })
      return doc
    },
    { initialProps: initial },
  )
  return { ...h, saved }
}

function callsText(doc: { calls: DocCall[] }): string | undefined {
  return doc.calls[0]!.text
}

describe("the persist path (the 88-patch law)", () => {
  it("typing saves the typed content through onSave", () => {
    const h = chain({ params: { calls: A } })
    assert.equal(h.saved.length, 0, "mount with persisted calls is quiet")
    act(() => {
      h.result.current.setCalls(h.result.current.calls.map((c) => ({ ...c, text: B[0]!.text })))
    })
    assert.equal(h.saved.length, 1)
    const wire = h.saved[0]!["calls"] as Array<{ text: string }>
    assert.equal(wire[0]!.text, B[0]!.text)
  })
})

describe("the stale-refresh hold (K2's core)", () => {
  it("holds the local and sends nothing while our send is unsettled", () => {
    // production race, honestly staged: the B-send fired (the probe
    // reads the host ledger, which still shows it in flight) and a
    // refresh returns the PRE-B server position (same calls, a new
    // signature via an unrelated knob so the guard runs).
    const h = chain({ params: { calls: A }, probe: () => true })
    act(() => {
      h.result.current.setCalls(h.result.current.calls.map((c) => ({ ...c, text: B[0]!.text })))
    })
    assert.equal(h.saved.length, 1, "the typed send fired")
    act(() => {
      h.rerender({ params: { calls: A, seed: 7 }, probe: () => true })
    })
    // the visible text survives the stale read …
    assert.equal(callsText(h.result.current), B[0]!.text)
    // … and the hold sends NOTHING back (the in-flight send is the
    // truth; an echo would regress the server to the stale read).
    const callsSends = h.saved.filter((s) => "calls" in s)
    assert.equal(callsSends.length, 1)
  })

  it("a converged refresh (the send landed) is quiet", () => {
    const h = chain({ params: { calls: A }, probe: () => true })
    act(() => {
      h.result.current.setCalls(h.result.current.calls.map((c) => ({ ...c, text: B[0]!.text })))
    })
    // the send lands; the server now holds B (new object, same
    // content, plus an unrelated knob so the guard runs).
    act(() => {
      h.rerender({ params: { calls: B, seed: 7 }, probe: () => false })
    })
    assert.equal(callsText(h.result.current), B[0]!.text)
    const callsSends = h.saved.filter((s) => "calls" in s)
    assert.equal(callsSends.length, 1, "no echo of converged content")
  })
})

describe("the other hand (settled refresh adopts)", () => {
  it("adopts the agent/undo write when nothing is outstanding", () => {
    const h = chain({ params: { calls: A } })
    act(() => {
      h.rerender({ params: { calls: X } })
    })
    assert.equal(callsText(h.result.current), X[0]!.text)
    // the clean adopt echoes once (the migration echo the path always had)
    assert.equal(h.saved.length, 1)
    const wire = h.saved[0]!["calls"] as Array<{ text: string }>
    assert.equal(wire[0]!.text, X[0]!.text)
  })
})

describe("the dirty resend (newer than the last send)", () => {
  it("keeps the dirty local and re-sends it exactly once", () => {
    const h = chain({ params: { calls: A } })
    const sentA = h.result.current.lastCallsRef.current
    assert.ok(sentA.length > 0, "mount armed the sent position")
    act(() => {
      h.result.current.setCalls(h.result.current.calls.map((c) => ({ ...c, text: B[0]!.text })))
    })
    assert.equal(h.saved.length, 1)
    // THE SUB-TICK RACE, forged precisely: the persist's guard had
    // not yet advanced to B when the refresh landed (local=B,
    // sent=A, incoming=A) — the guard must keep B and re-arm ONE
    // resend, never adopt A.
    h.result.current.lastCallsRef.current = sentA
    act(() => {
      h.rerender({ params: { calls: A, seed: 7 } })
    })
    assert.equal(callsText(h.result.current), B[0]!.text)
    const callsSends = h.saved.filter((s) => "calls" in s)
    assert.equal(callsSends.length, 2, "exactly one resend")
    const wire = callsSends[1]!["calls"] as Array<{ text: string }>
    assert.equal(wire[0]!.text, B[0]!.text, "the resend carries the kept local")
    // and the guard now rests at the local — a further refresh is quiet
    expect(h.result.current.lastCallsRef.current).toBe(JSON.stringify(h.result.current.calls))
  })
})
