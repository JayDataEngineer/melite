/**
 * studio-doc-void — the h3-timeline void, 2026-10-11 (BEHAVIORAL).
 *
 * THE INCIDENT: the operator typed a prompt (+ reference image) into
 * the h3 studio — the persist carried ~88 `params:calls` patches onto
 * the estate — then pressed Run and the generation composed
 * seed-only placeholders. The run's own `_request.json` carried NO
 * calls; the film rendered defaults.
 *
 * THE MECHANISM (two kills, both proven from the draft log):
 *  K1. the drill's Run flush nulled every held key outside the
 *      drill's open-time user map — fixed in stage-drill, pinned in
 *      cards-tab-run-studio.spec.tsx.
 *  K2. the studio's re-hydrate adopted the incoming document
 *      UNCONDITIONALLY — a refresh landing with stale server content
 *      reverted visible text mid-typing, and the persist wrote the
 *      reverted (or starter) doc back over the operator's work.
 *
 * THE COLLAPSE (the rework): K2's machinery (mirror + guard +
 * resend + probe) is deleted — this file now pins the collapse at
 * the production hook (useShownDoc): typing commits, a stale
 * refresh holds the stated content and sends nothing, a settled
 * refresh shows the settlement, a foreign write with nothing
 * outstanding adopts QUIET (no migration echo — there is no second
 * state to remix), and the mount commits the starter once for
 * calls-less stages.
 */
import { describe, expect, it } from "vitest"
import assert from "node:assert/strict"
import { act, renderHook } from "@testing-library/react"
import { useShownDoc } from "../src/ui/studio/useShownDoc.ts"
import type { DocCall } from "../src/ui/studio/docModel.ts"
import type { CardStage } from "@melite/contracts"

const A = [{ text: "operator prompt A", start_frame: 0, end_frame: 90 }]
const B = [{ text: "operator prompt B (typed after mount)", start_frame: 0, end_frame: 90 }]
const X = [{ text: "the other hand wrote X", start_frame: 0, end_frame: 90 }]

function chain(initial: { params: unknown }) {
  const saved: Record<string, unknown>[] = []
  const h = renderHook(
    ({ params }: { params: unknown }) => {
      return useShownDoc(
        { id: "s_1", params } as unknown as CardStage,
        (p) => { saved.push(p) },
      )
    },
    { initialProps: initial },
  )
  return { ...h, saved }
}

function callsText(doc: { calls: DocCall[] }): string | undefined {
  return doc.calls[0]!.text
}

describe("the commit path (the 88-patch law)", () => {
  it("typing commits the typed content through onSave, at the gesture", () => {
    const h = chain({ params: { calls: A } })
    assert.equal(h.saved.length, 0, "mount with persisted calls is quiet")
    act(() => {
      h.result.current.updateCalls(h.result.current.calls.map((c) => ({ ...c, text: B[0]!.text })))
    })
    assert.equal(h.saved.length, 1)
    const wire = h.saved[0]!["calls"] as Array<{ text: string }>
    assert.equal(wire[0]!.text, B[0]!.text)
    assert.equal(callsText(h.result.current), B[0]!.text)
  })

  it("mount without calls commits the starter once (the sticky law)", () => {
    const h = chain({ params: {} })
    assert.equal(h.saved.length, 1)
    assert.ok("calls" in h.saved[0]!)
    assert.equal(callsText(h.result.current), "A single shot — describe the action, camera, and mood.")
  })
})

describe("the stale-refresh hold (K2's core)", () => {
  it("holds the stated content and sends nothing on a stale refresh", () => {
    const h = chain({ params: { calls: A } })
    act(() => {
      h.result.current.updateCalls(h.result.current.calls.map((c) => ({ ...c, text: B[0]!.text })))
    })
    assert.equal(h.saved.length, 1, "the typed commit fired")
    act(() => {
      h.rerender({ params: { calls: A, seed: 7 } })
    })
    // the visible text survives the stale read …
    assert.equal(callsText(h.result.current), B[0]!.text)
    // … and the hold sends NOTHING back (the commit is the truth;
    // an echo would regress the server to the stale read).
    const callsSends = h.saved.filter((s) => "calls" in s)
    assert.equal(callsSends.length, 1)
  })

  it("a settled refresh shows the settlement and is quiet", () => {
    const h = chain({ params: { calls: A } })
    act(() => {
      h.result.current.updateCalls(h.result.current.calls.map((c) => ({ ...c, text: B[0]!.text })))
    })
    act(() => {
      h.rerender({ params: { calls: B, seed: 7 } })
    })
    assert.equal(callsText(h.result.current), B[0]!.text)
    const callsSends = h.saved.filter((s) => "calls" in s)
    assert.equal(callsSends.length, 1, "no echo of settled content")
  })
})

describe("the other hand (foreign write adopts, quiet)", () => {
  it("adopts the agent/undo write when nothing is outstanding, sending nothing", () => {
    const h = chain({ params: { calls: A } })
    act(() => {
      h.rerender({ params: { calls: X } })
    })
    assert.equal(callsText(h.result.current), X[0]!.text)
    // NO migration echo: the shown doc IS the row — there is no
    // second state to remix back over it.
    assert.equal(h.saved.length, 0)
  })
})
