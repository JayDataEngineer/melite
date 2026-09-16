/**
 * draft-view.spec.tsx — the draft-stage view: the conversation card's
 * studio target (the old embed's law). Pins the provider's draft arm
 * (readDraft + one snapshot frame) and the DraftView render (the
 * studio claim through renderStageView, the no-removal law, the
 * missing-stage refusal) — the surface the chat row lands on.
 */
import { afterEach, describe, expect, test, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { createElement as h } from "react"
import { openCardsResource, readDraft } from "../src/client/cards-resource.ts"
import { CardsTab } from "../src/client/CardsTab.tsx"
import type { CardsDraftValue } from "../src/client/cards-resource.ts"
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts"

type Fakes = ReturnType<typeof mountEstateFakes>;
let active: Fakes | null = null;

/** Mount the one-lane fakes for one test (drained in afterEach). */
function wire(opts: EstateFakesOptions = {}): Fakes {
  active?.unmount();
  active = mountEstateFakes(opts);
  return active;
}

afterEach(() => {
  active?.unmount();
  active = null;
  cleanup()
  vi.unstubAllGlobals()
})

const DRAFT_DOC = {
  draft_id: "draft-1",
  intent: "the film",
  stages: [
    { id: "s_0", card: "h3-timeline", engine: "comfyui", params: { seed: 1 } },
    { id: "s_1", card: "image-gen", params: {}, result: { url: "/melite-media/runs/r/image-gen/out.png" } },
    "malformed-row",
  ],
}

/** The provider's draft arm rides the live one-lane seam: drafts/get
 *  serves the doc's stages (readDraft drops the malformed row). */
function stubDraftStages(): void {
  wire({ draftStages: DRAFT_DOC.stages as unknown as Array<Record<string, unknown>> });
}

describe("readDraft", () => {
  test("normalizes the doc and keeps malformed rows out", () => {
    const value = readDraft("draft-1", "s_0", DRAFT_DOC)
    expect(value.kind).toBe("draft")
    expect(value.draftId).toBe("draft-1")
    expect(value.stageId).toBe("s_0")
    expect(value.intent).toBe("the film")
    expect(value.stages.map((s) => s.id)).toEqual(["s_0", "s_1"])
  })

  test("a doc without stages serves the empty list, never a throw", () => {
    const value = readDraft("d", "s", { draft_id: "d", stages: null })
    expect(value.stages).toEqual([])
  })
})

describe("the provider's draft arm", () => {
  test("yields one snapshot frame for a draft address", async () => {
    stubDraftStages()
    const frames: unknown[] = []
    for await (const frame of openCardsResource("dsh-resource://cards/draft/draft-1/s_0", { signal: AbortSignal.timeout(4000) })) {
      frames.push(frame)
      break // the snapshot law: exactly one frame on first read
    }
    const first = frames[0] as { ok: boolean; value: CardsDraftValue }
    expect(first.ok).toBe(true)
    expect(first.value.kind).toBe("draft")
    expect(first.value.stageId).toBe("s_0")
  })

  test("a refused drafts/get is a failure frame, never a throw", async () => {
    wire({ refusals: [{ method: "drafts/get", message: "no such draft" }] })
    const frames: unknown[] = []
    for await (const frame of openCardsResource("dsh-resource://cards/draft/nope/s_0", { signal: AbortSignal.timeout(4000) })) {
      frames.push(frame)
      break
    }
    const first = frames[0] as { ok: boolean; error: { message: string } }
    expect(first.ok).toBe(false)
    expect(first.error.message).toContain("no such draft")
  })
})

/** The tab body over a live draft value — the renderSlot consult rides.
 *  (fetch answers ONLY the /v1 discovery doors; an estate verb on the
 *  fetch lane is a wiring bug and throws loud.) */
function stubFormSpec(): void {
  vi.stubGlobal("fetch", vi.fn(async (url: unknown) => {
    const path = String(url)
    if (path.includes("/v1/form-spec") || path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({
        form: "h3-timeline", fields: [{ name: "prompt", label: "Prompt", type: "textarea" }],
      }), { status: 200, headers: { "content-type": "application/json" } })
    }
    throw new Error("estate door on the fetch lane: " + path)
  }))
}

function renderDraftTab(value: CardsDraftValue, renderSlot?: (owner: Record<string, unknown>) => unknown): void {
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab",
      navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
      actions: {},
    } }),
    useResource: () => ({ status: "live", value }),
    renderSlot: renderSlot === undefined ? undefined : ((_key: string, owner: Record<string, unknown>) => renderSlot(owner)) as never,
  }))
}

describe("DraftView", () => {
  test("the studio slot is consulted with the stage's card name", async () => {
    stubFormSpec()
    const value = readDraft("draft-1", "s_0", DRAFT_DOC)
    const owners: Array<Record<string, unknown>> = []
    renderDraftTab(value, (owner) => {
      owners.push(owner)
      return h("div", { "data-testid": "claimed-studio" }, "THE STUDIO")
    })
    expect(await screen.findByTestId("claimed-studio", {}, { timeout: 4000 })).toBeTruthy()
    await waitFor(() => {
      expect(owners.length).toBeGreaterThan(0)
      expect(owners[0]?.["cardName"]).toBe("h3-timeline")
      expect(owners[0]?.["stageId"]).toBe("s_0")
    })
  })

  test("an unclaimed card falls back to the generic zoom card (no Remove)", async () => {
    stubFormSpec()
    const value = readDraft("draft-1", "s_0", DRAFT_DOC)
    renderDraftTab(value)
    // the generic body renders the form loader or the spec form — and
    // NEVER the bench's Remove button (the draft's shape is not the
    // bench's to take)
    await waitFor(() => {
      expect(screen.queryByText("Remove stage")).toBeNull()
    })
  })

  test("a card-born draft (intent carries the card; the bench row lost it) consults the intent as cardName", async () => {
    stubFormSpec()
    // the card-birth law: the h3 tool births the draft with intent
    // 'h3-timeline' + ONE stage; the estate's bench normalization
    // discards service/title, so the row arrives without `card`.
    // The studio consult must still see the card (live-lane receipt
    // 2026-09-12: chat-born bench-default/s_0 got the generic drill).
    const value = readDraft("bench-default", "s_0", {
      draft_id: "bench-default",
      intent: "h3-timeline",
      stages: [
        { id: "s_0", engine: "comfyui", params: {}, inputs: {}, outputs: { default: "image" }, provenance: "agent" },
      ],
    })
    const owners: Array<Record<string, unknown>> = []
    renderDraftTab(value, (owner) => {
      owners.push(owner)
      return h("div", { "data-testid": "claimed-studio" }, "THE STUDIO")
    })
    expect(await screen.findByTestId("claimed-studio", {}, { timeout: 4000 })).toBeTruthy()
    await waitFor(() => {
      expect(owners[0]?.["cardName"]).toBe("h3-timeline")
    })
  })

  test("a multi-stage draft never borrows the intent as the card (user benches carry card on the row)", async () => {
    stubFormSpec()
    const value = readDraft("draft-1", "s_0", {
      draft_id: "draft-1",
      intent: "some-flow",
      stages: [
        { id: "s_0", engine: "comfyui", params: {} },
        { id: "s_1", engine: "comfyui", params: {} },
      ],
    })
    const owners: Array<Record<string, unknown>> = []
    renderDraftTab(value, (owner) => {
      owners.push(owner)
      return h("div", { "data-testid": "claimed-studio" }, "THE STUDIO")
    })
    expect(await screen.findByTestId("claimed-studio", {}, { timeout: 4000 })).toBeTruthy()
    await waitFor(() => {
      expect(owners[0]?.["cardName"]).toBe("")
    })
  })

  test("a stage that left the draft refuses loud with a way back", async () => {
    stubFormSpec()
    const value = readDraft("draft-1", "gone", DRAFT_DOC)
    renderDraftTab(value)
    expect(await screen.findByText(/no longer on draft draft-1/, {}, { timeout: 4000 })).toBeTruthy()
  })
})
