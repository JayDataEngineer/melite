/**
 * surface.spec.ts — the conversation card's way into the Cards tab.
 *
 * Pins the seam law (surface.ts): set/clear symmetry, the degraded
 * no-shell answer, and THE ROW LAW — FlowCards' card row opens the
 * draft-stage address through the shell face when installed, and
 * falls back to the in-card drill when it is not (the old embed's
 * law: the chat card opens the authoring surface, never a form).
 */
import { afterEach, describe, expect, test, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import { createElement as h } from "react"
import { cardsDraftStageAddress, parseCardsAddress } from "../src/client/cards-resource.ts"
import { cardsSurfaceFace, openCardsSurface, setOpenCardsSurface } from "../src/client/surface.ts"
import { FlowCards } from "../src/client/FlowCards.tsx"
import type { ToolCallBlockView } from "../src/client/types.ts"

afterEach(() => {
  cleanup()
  setOpenCardsSurface(null)
  vi.unstubAllGlobals()
})

describe("the draft-stage address grammar", () => {
  test("round-trips ids with separators", () => {
    const address = cardsDraftStageAddress("draft-1", "s_0")
    expect(address).toBe("dsh-resource://cards/draft/draft-1/s_0")
    expect(parseCardsAddress(address)).toEqual({ draft: "draft-1", stage: "s_0" })
  })

  test("encodes both segments", () => {
    const address = cardsDraftStageAddress("a/b", "c d")
    const parsed = parseCardsAddress(address)
    expect(parsed).toEqual({ draft: "a/b", stage: "c d" })
  })

  test("refuses a draft arm without a stage", () => {
    expect(parseCardsAddress("dsh-resource://cards/draft/only-one")).toBeNull()
  })

  test("keeps the bench and run arms", () => {
    expect(parseCardsAddress("dsh-resource://cards/bench")).toEqual({ bench: true })
    expect(parseCardsAddress("dsh-resource://cards/run/run-1")).toEqual({ run: "run-1" })
  })
})

describe("the surface seam", () => {
  test("absent face answers false, never throws", () => {
    expect(cardsSurfaceFace()).toBeNull()
    expect(openCardsSurface("dsh-resource://cards/bench")).toBe(false)
  })

  test("an installed face receives the address and answers true", () => {
    const seen: string[] = []
    setOpenCardsSurface((address) => { seen.push(address) })
    expect(openCardsSurface(cardsDraftStageAddress("draft-1", "s_0"))).toBe(true)
    expect(seen).toEqual(["dsh-resource://cards/draft/draft-1/s_0"])
  })

  test("clear restores the degraded answer", () => {
    setOpenCardsSurface(() => {})
    setOpenCardsSurface(null)
    expect(cardsSurfaceFace()).toBeNull()
  })
})

/** A settled melite_flow block whose presentationMeta names the draft. */
function flowBlock(draftId: string): ToolCallBlockView {
  return {
    kind: "tool-result",
    callId: "c1",
    toolName: "melite_flow",
    argsRaw: JSON.stringify({ model: "h3-timeline" }),
    isError: false,
    meta: { draft_id: draftId },
    content: [],
  } as unknown as ToolCallBlockView
}

/** drafts/get serves the doc the rows hydrate from (the wire's frame
 *  law: the answer echoes the request's rpcId). */
function stubDraftDoc(draftId: string): void {
  vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init?: RequestInit) => {
    const rpcId = (JSON.parse(String(init?.body)) as { rpcId: string }).rpcId
    return new Response(JSON.stringify({
      type: "server-response",
      rpcId,
      result: { ok: true, value: {
        draft_id: draftId,
        intent: "the film",
        stages: [
          { id: "s_0", card: "h3-timeline", engine: "comfyui", params: { seed: 1 } },
          { id: "s_1", card: "image-gen", params: {} },
        ],
      } },
    }), { status: 200, headers: { "content-type": "application/json" } })
  }))
}

describe("the row law (FlowCards)", () => {
  test("a row click with the shell face opens the draft-stage address", async () => {
    stubDraftDoc("draft-1")
    const seen: string[] = []
    setOpenCardsSurface((address) => { seen.push(address) })
    render(h(FlowCards, { block: flowBlock("draft-1") }))
    // the row title is the stage id (cardRows: title ?? id)
    const row = await screen.findByText("s_0", {}, { timeout: 4000 })
    row.click()
    expect(seen).toEqual([cardsDraftStageAddress("draft-1", "s_0")])
    // the drill did NOT open (the studio surface owns the card now)
    expect(screen.queryByText(/params/i)).toBeNull()
  })

  test("without the shell face the row falls back to the in-card drill", async () => {
    stubDraftDoc("draft-1")
    render(h(FlowCards, { block: flowBlock("draft-1") }))
    const row = await screen.findByText("s_0", {}, { timeout: 4000 })
    row.click()
    // the drill's split detail renders (the degraded, never-throw path)
    expect(await screen.findByText(/Run/i, {}, { timeout: 4000 })).toBeTruthy()
  })
})
