/**
 * row-law.spec.tsx — the conversation card's way into the Cards tab.
 *
 * Pins the inject-share law (client contract): FlowCards receives the
 * shell's navigation face as the register site's `inject` callback
 * (`openSurface`), and THE ROW LAW — a card row opens the draft-stage
 * address through that face when present, and falls back to the
 * in-card drill when it is not (the old embed's law: the chat card
 * opens the authoring surface, never a form). No module-level seam:
 * the face is a prop, absent in headless harnesses.
 */
import { afterEach, describe, expect, test, vi } from "vitest"
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { createElement as h } from "react"
import { cardsDraftStageAddress, parseCardsAddress } from "../src/client/cards-resource.ts"
import { FlowCards } from "../src/client/FlowCards.tsx"
import type { ToolCallBlockView } from "../src/client/types.ts"
import { mountEstateFakes } from "./estate-harness.ts"

type Fakes = ReturnType<typeof mountEstateFakes>;
let active: Fakes | null = null;

afterEach(() => {
  active?.unmount();
  active = null;
  cleanup()
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

/** drafts/get serves the doc the rows hydrate from — over the live
 *  one-lane seam (the row address rides the block's draft id, never
 *  the served doc's, so the harness's canonical draft id is fine). */
function stubDraftDoc(): void {
  active?.unmount();
  active = mountEstateFakes({
    draftStages: [
      { id: "s_0", card: "h3-timeline", engine: "comfyui", params: { seed: 1 } },
      { id: "s_1", card: "image-gen", params: {} },
    ],
  });
}

describe("the row law (FlowCards × the inject share)", () => {
  test("a row click with the injected face opens the draft-stage address", async () => {
    stubDraftDoc()
    const seen: string[] = []
    render(h(FlowCards, {
      block: flowBlock("draft-1"),
      openSurface: (address) => { seen.push(address); return true },
    }))
    // the row title is the stage id (cardRows: title ?? id)
    const row = await screen.findByText("s_0", {}, { timeout: 4000 })
    row.click()
    expect(seen).toEqual([cardsDraftStageAddress("draft-1", "s_0")])
    // the drill did NOT open (the studio surface owns the card now)
    expect(screen.queryByText(/params/i)).toBeNull()
  })

  test("a face that answers false falls back to the in-card drill", async () => {
    stubDraftDoc()
    render(h(FlowCards, {
      block: flowBlock("draft-1"),
      openSurface: () => false,
    }))
    const row = await screen.findByText("s_0", {}, { timeout: 4000 })
    row.click()
    expect(await screen.findByText(/Run/i, {}, { timeout: 4000 })).toBeTruthy()
  })

  test("without the face the row falls back to the in-card drill", async () => {
    stubDraftDoc()
    render(h(FlowCards, { block: flowBlock("draft-1") }))
    const row = await screen.findByText("s_0", {}, { timeout: 4000 })
    row.click()
    // the drill's split detail renders (the degraded, never-throw path)
    expect(await screen.findByText(/Run/i, {}, { timeout: 4000 })).toBeTruthy()
  })
})

describe("the media door (the header affordance × the inject share)", () => {
  test("the affordance renders only when the face provides it and opens the media page", async () => {
    stubDraftDoc()
    const opened: string[] = []
    render(h(FlowCards, {
      block: flowBlock("draft-1"),
      openMedia: () => { opened.push("media"); return true },
    }))
    const door = await screen.findByRole("button", { name: "open media" }, { timeout: 4000 })
    door.click()
    expect(opened).toEqual(["media"])
  })

  test("without the face the header renders no media affordance", async () => {
    stubDraftDoc()
    render(h(FlowCards, { block: flowBlock("draft-1") }))
    await screen.findByText("s_0", {}, { timeout: 4000 })
    expect(screen.queryByRole("button", { name: "open media" })).toBeNull()
  })

  test("a refused open (the shell face answers false) leaves the card standing", async () => {
    stubDraftDoc()
    render(h(FlowCards, {
      block: flowBlock("draft-1"),
      openMedia: () => false,
    }))
    const door = await screen.findByRole("button", { name: "open media" }, { timeout: 4000 })
    door.click()
    // the card did not unmount or throw — the header is still there
    expect(screen.getByText("melite")).toBeTruthy()
  })
})

describe("the row error face (the failure description under the card)", () => {
  /** Draft doc whose s_1 carries a settled failure (the headless-settle face). */
  function stubErrorDraftDoc(): void {
    active?.unmount();
    active = mountEstateFakes({
      draftStages: [
        { id: "s_0", card: "image-gen", params: {} },
        { id: "s_1", card: "image-gen", params: {}, result: { error: "stage blew up" } },
      ],
    });
  }

  function errorDoc(): Array<Record<string, unknown>> {
    return [
      { id: "s_0", card: "image-gen", params: {} },
      { id: "s_1", card: "image-gen", params: {}, result: { error: "stage blew up" } },
    ];
  }

  /** Refresh through the in-card drill (no shell face: row clicks open
   *  the drill, and its close refetches the doc). */
  async function refreshViaDrill(rowTitle = "s_1"): Promise<void> {
    fireEvent.click(screen.getByText(rowTitle));
    await screen.findByText(/Run/i, {}, { timeout: 4000 });
    fireEvent.click(screen.getByRole("button", { name: "Close card" }));
    await waitFor(() => { expect(screen.queryByText(/Run/i)).toBeNull(); }, { timeout: 4000 });
  }

  test("an error row voices with a ×; the × clears only that row and never opens the surface", async () => {
    stubErrorDraftDoc()
    const opened: string[] = []
    render(h(FlowCards, {
      block: flowBlock("draft-1"),
      openSurface: (address) => { opened.push(address); return true },
    }))
    const row = await screen.findByText("s_1", {}, { timeout: 4000 })
    const item = row.closest("button") as HTMLElement
    const face = within(item).getByRole("alert")
    expect(face.textContent ?? "").toContain("stage blew up")
    fireEvent.click(within(face).getByRole("button", { name: "Dismiss error" }))
    await waitFor(() => { expect(within(item).queryByRole("alert")).toBeNull() }, { timeout: 4000 })
    // the × never opened the surface (consumed click, no seat bubble)
    expect(opened).toEqual([])
    // the clean row never carried a face
    const clean = screen.getByText("s_0").closest("button") as HTMLElement
    expect(within(clean).queryByRole("alert")).toBeNull()
  });

  test("a changed refusal re-voices; clean and vanished rows re-arm the same words", async () => {
    stubErrorDraftDoc()
    render(h(FlowCards, { block: flowBlock("draft-1") }))
    const row = await screen.findByText("s_1", {}, { timeout: 4000 })
    fireEvent.click(within(row.closest("button") as HTMLElement).getByRole("button", { name: "Dismiss error" }))
    await waitFor(() => { expect(screen.queryByText("stage blew up")).toBeNull() }, { timeout: 4000 })
    // a CHANGED refusal voices through the silence (silence is per text)
    active?.setDraftDoc({ stages: [
      { id: "s_0", card: "image-gen", params: {} },
      { id: "s_1", card: "image-gen", params: {}, result: { error: "stage blew up LOUDER" } },
    ] })
    await refreshViaDrill()
    const row2 = await screen.findByText("s_1", {}, { timeout: 4000 })
    expect(within(row2.closest("button") as HTMLElement).getByRole("alert").textContent ?? "").toContain("stage blew up LOUDER")
    fireEvent.click(within(row2.closest("button") as HTMLElement).getByRole("button", { name: "Dismiss error" }))
    await waitFor(() => { expect(screen.queryByText("stage blew up LOUDER")).toBeNull() }, { timeout: 4000 })
    // a VANISHED row drops its silence entry (the prune's first arm)
    active?.setDraftDoc({ stages: [{ id: "s_0", card: "image-gen", params: {} }] })
    await refreshViaDrill()
    await waitFor(() => { expect(screen.queryByText("s_1")).toBeNull() }, { timeout: 4000 })
    // the same words voice again on return (no stale silence anywhere)
    active?.setDraftDoc({ stages: errorDoc() })
    await refreshViaDrill("s_0")
    const row3 = await screen.findByText("s_1", {}, { timeout: 4000 })
    expect(within(row3.closest("button") as HTMLElement).getByRole("alert").textContent ?? "").toContain("stage blew up")
  });
});
