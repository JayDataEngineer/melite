// @vitest-environment happy-dom
// skeleton-law.spec.tsx — THE LOADING SEAT IS A SKELETON (operator
// 2026-11-15: "Instead of form… — can we get a real skeleton when
// things are loading?"). The law, per seat: while the seat's door
// hydrates, the face renders the shimmer shapes shaped like the face
// it replaces (aria-busy, the hidden copy word) and NEVER a text
// ellipsis; when the door answers, the real face replaces the
// skeleton wholesale. Seat queries only — the testid + aria-busy
// attrs the component owns, never singular text.
import { LOADED_WAIT } from "../../../../tests/helpers/loaded-wait.ts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { resetStageWrites } from "../src/client/draft.ts";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { AddCardDoor } from "../src/client/add-card-door.tsx";
import { FlowCards } from "../src/client/FlowCards.tsx";
import { BenchSkeleton, CardsSkeleton, FormSkeleton } from "../src/client/skeleton.tsx";
import { chromeCopy } from "../src/chromeCopy.ts";
import type { ToolCallBlockView } from "../src/client/types.ts";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

let fakes: EstateFakes | null = null;

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  fakes?.unmount();
  fakes = null;
  vi.unstubAllGlobals();
});

function mountBench(stages: BenchStageView[]): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/melite-tools/catalog")) {
      return new Response(JSON.stringify({ routes: [] }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: { "image-gen": { families: ["krea-2"] } } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages },
    draftStages: stages as unknown as Array<Record<string, unknown>>,
    draftBenchRev: 1,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: {
      kind: "bench", draftId: "bench-p", rev: 1, log: [], stages,
    } as unknown as CardsBenchValue }),
  }));
}

function firstTile(): HTMLElement {
  const el = document.querySelector('[role="button"][class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  return el as HTMLElement;
}

describe("the pure shapes (no doors)", () => {
  test("each skeleton seats aria-busy, the hidden copy word, and zero ellipsis literals", () => {
    const seats: Array<[string, ReturnType<typeof h>]> = [
      ["stage-form", h(FormSkeleton)],
      ["add-cards", h(CardsSkeleton)],
      ["bench", h(BenchSkeleton)],
    ];
    for (const [seat, node] of seats) {
      const { container, unmount } = render(node);
      const el = container.querySelector('[data-testid="' + seat + '-skeleton"]');
      expect(el, seat + " seats its skeleton").toBeTruthy();
      expect(el!.getAttribute("aria-busy"), seat + " announces hydration").toBe("true");
      const text = el!.textContent ?? "";
      expect(text, seat + " carries the hidden loading word").toContain(chromeCopy.skeletonLoading);
      expect(text, seat + " never renders an ellipsis literal").not.toContain("…");
      // the shapes exist: at least one shimmer line
      expect(el!.querySelectorAll("div").length, seat + " renders shape rows").toBeGreaterThan(1);
      unmount();
    }
  });
});

describe("the drill's form seat (the operator's own face)", () => {
  test("a held form-spec door renders the skeleton rail, never 'form…'; the landed spec replaces it", { timeout: LOADED_WAIT() }, async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} } as BenchStageView]);
    const user = userEvent.setup();
    await user.click(firstTile());
    // THE HELD DOOR: while the form-spec hydrates the rail is the
    // skeleton — the words 'form…' are gone from the face. The spec
    // door here answers through the estate fakes' own fetch binding
    // (form-spec rides the bound remote), so the seat is asserted on
    // the mounted drill BEFORE the form lands (the skeleton is the
    // first frame the operator sees at open).
    const skel = await screen.findByTestId("stage-form-skeleton", {}, { timeout: LOADED_WAIT() * 2 / 15 });
    expect(skel.getAttribute("aria-busy")).toBe("true");
    expect(document.body.textContent ?? "", "no ellipsis literal anywhere in the loading face").not.toContain("form…");
    await waitFor(() => {
      if (screen.queryByTestId("stage-form-skeleton") !== null) throw new Error("skeleton still seated after the spec landed");
    }, { timeout: LOADED_WAIT() * 2 / 15 });
    expect(screen.queryByTestId("stage-form-skeleton")).toBeNull();
  });
});

describe("the add-card picker seat", () => {
  test("the picker mounts the cards skeleton until the catalog answers", async () => {
    let answerCatalog: ((doc: unknown) => void) | null = null;
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/model-catalog")) {
        const doc = await new Promise<unknown>((resolve) => { answerCatalog = resolve; });
        return new Response(JSON.stringify(doc), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("door on the fetch lane: " + path);
    });
    const benchValue = { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [] } as unknown as CardsBenchValue;
    render(h(AddCardDoor, {
      sessionKey: "bench-p", bench: benchValue, onAdded: () => {}, onClose: () => {},
    }));
    // THE MODAL PORTALS to body — the seat is queried on the document,
    // never on the render container.
    const skel = await waitFor(() => {
      const el = document.querySelector('[data-testid="add-cards-skeleton"]');
      if (el === null) throw new Error("picker skeleton not seated");
      return el;
    }, { timeout: 4000 });
    expect(skel.getAttribute("aria-busy")).toBe("true");
    answerCatalog?.({ cards: { "image-gen": { families: ["krea-2"] } } });
    await waitFor(() => {
      if (document.querySelector('[data-testid="add-cards-skeleton"]') !== null) throw new Error("picker skeleton never stood down");
    }, { timeout: 4000 });
  });
});

describe("the chat flow card's doc seat", () => {
  test("a held drafts/get renders the cards skeleton, never 'cards…'", async () => {
    // THE HELD DOC: the flow card's drafts/get answer is parked open
    // (the harness's verb gate) — the seat is judged mid-hydration,
    // the exact frame the operator called out. The block carries no
    // persisted rows (a card that pressed nothing), so the hydrated
    // face renders no strip — the stand-down judges the seat, not rows.
    let openDoc: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => { openDoc = resolve; });
    fakes = mountEstateFakes({
      draftStages: [{ id: "s_0", title: "film", kind: "generation", status: "success", params: {}, result: {} }],
      draftBenchRev: 1,
      verbGates: { "drafts/get": [gate] },
    });
    render(h(FlowCards, { block: {
      kind: "tool-result", callId: "c1", toolName: "melite_flow",
      argsRaw: JSON.stringify({ model: "krea-2" }),
      isError: false, meta: { draft_id: "draft-1" }, content: [],
    } as unknown as ToolCallBlockView }));
    const skel = await waitFor(() => {
      const el = document.querySelector('[data-testid="add-cards-skeleton"]');
      if (el === null) throw new Error("flow card skeleton not seated");
      return el;
    }, { timeout: 4000 });
    expect(skel.getAttribute("aria-busy")).toBe("true");
    expect(document.body.textContent ?? "", "no ellipsis literal in the loading face").not.toContain("cards…");
    openDoc?.();
    await waitFor(() => {
      if (document.querySelector('[data-testid="add-cards-skeleton"]') !== null) throw new Error("flow card skeleton never stood down");
    }, { timeout: 4000 });
  });
});
