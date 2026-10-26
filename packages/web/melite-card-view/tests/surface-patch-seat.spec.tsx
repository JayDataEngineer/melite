// @vitest-environment happy-dom
// surface-patch-seat.spec.tsx — THE SEAT EDGE OF THE STRETCH CURE
// (2026-10-15). The ledger wall pins the coalescer; THIS wall pins
// the wiring: the tab's surface seats (bench AND draft) route studio
// patches through scheduleStagePatch and return its settlement to
// the studio — the promise the ghost cure retracts on. A stub studio
// bursts owner.onPatch through the REAL tab seat (tile → drill →
// slot → adapter → seat → fake door). Rewire the seat to the direct
// door and the burst reds as N concurrent writes; swallow the
// settlement in any adapter and the promises below never settle
// (the ghost's door, reopened).
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h, useEffect, useRef, useState } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "@melite/card-base/client";
import { mountEstateFakes, type EstateFakesOptions } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { resetStageWrites, stageWriteState } from "../src/client/draft.ts";
import type { BenchStageView, CardsBenchValue, CardsDraftValue } from "../src/client/cards-resource.ts";
import type { StageViewOwnerProps } from "../src/client/types.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

type CardsTabProps = Parameters<typeof CardsTab>[0];
let fakes: ReturnType<typeof mountEstateFakes> | null = null;

function stubFetch(): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    const url = String(input instanceof URL ? input : typeof input === "string" ? input : input.url);
    if (url.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }),
        { status: 200, headers: { "content-type": "application/json" } });
    }
    if (url.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
  }));
}

/** The stub studio: claims image-gen, surfaces the owner's patch
 *  verb behind two buttons — the burst (ten evolving calls writes,
 *  the stretch) and the single (one write, the refusal arm). Every
 *  settlement the seat returns is recorded for the promise arms. */
const settlements: Array<Promise<boolean | void> | void> = [];
function StubStudio({ owner }: { owner: StageViewOwnerProps }): ReturnType<typeof h> {
  const [fired, setFired] = useState(0);
  // the verb rides a ref: the bench refresh re-renders with a NEW
  // owner identity, and the burst must not refire on it (the gesture
  // is the button press, never the refresh)
  const verbRef = useRef(owner.onPatch);
  verbRef.current = owner.onPatch;
  useEffect(() => {
    if (fired === 0) return;
    if (fired === 1) {
      for (let i = 0; i < 10; i++) {
        settlements.push(verbRef.current({ calls: [{ text: "a", start_frame: 0, end_frame: 48 + i }] }));
      }
    } else {
      settlements.push(verbRef.current({ calls: [{ text: "a", start_frame: 0, end_frame: 48 }] }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fired]);
  return h("div", { "data-testid": "stub-studio" },
    h("button", { type: "button", onClick: () => { setFired(1); } }, "burst"),
    h("button", { type: "button", onClick: () => { setFired(2); } }, "send-once"));
}

function stubSlot() {
  return ((key: "cards.stage.view", owner: StageViewOwnerProps, opts?: { fallback?: unknown }) => {
    if (key === "cards.stage.view" && owner.cardName === "image-gen") return h(StubStudio, { owner });
    return (opts?.fallback ?? null) as ReturnType<typeof h>;
  }) as CardsTabProps["renderSlot"];
}

function mountBench(estateOpts: EstateFakesOptions = {}): void {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
    },
    draftStages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }] as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    ...estateOpts,
  });
  const stages: BenchStageView[] = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }];
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
    renderSlot: stubSlot(),
  }));
}

function mountDraft(estateOpts: EstateFakesOptions = {}): void {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({ draftBenchRev: 1, ...estateOpts });
  const value: CardsDraftValue = {
    kind: "draft", draftId: draftIdOf("draft-1"), stageId: "s_0",
    intent: "image-gen", rev: 1,
    stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
  };
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value }),
    renderSlot: stubSlot(),
  }));
}

function patchBodies(): Array<Record<string, unknown>> {
  return (fakes?.calls ?? [])
    .filter((c) => c.method === "drafts/patch")
    .map((c) => ((c.args as { patch?: { params?: Record<string, unknown> } }).patch?.params ?? {}) as Record<string, unknown>);
}

async function openFirstTile(): Promise<void> {
  const user = userEvent.setup();
  const el = document.querySelector('[role="button"][class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  await user.click(el as HTMLElement);
  await screen.findByTestId("stub-studio", {}, { timeout: 4000 });
}

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  settlements.length = 0;
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

describe("THE BENCH SEAT — a studio burst through the real tab is one write, and every caller hears it land", () => {
  test("ten onPatch calls in one tick land as a single drafts/patch carrying the last calls", async () => {
    mountBench({ patchAnswerRevs: [2] });
    await openFirstTile();
    await userEvent.setup().click(screen.getByRole("button", { name: "burst" }));
    await waitFor(() => { expect(patchBodies().length).toBe(1); }, { timeout: 4000 });
    const bodies = patchBodies();
    expect(bodies[0]!["calls"]).toEqual([{ text: "a", start_frame: 0, end_frame: 57 }]);
    // the settlement rode every adapter unbroken: ten promises, all true
    expect(settlements.length).toBe(10);
    const outcomes = await Promise.all(settlements.map((s) => Promise.resolve(s)));
    expect(outcomes).toEqual(new Array(10).fill(true));
    // no error face, no ledger memory
    expect(screen.queryByText(/THE WRITE DID NOT LAND/)).toBeNull();
    expect(stageWriteState(draftIdOf("bench-p"), "s_0").failedKeys).toEqual([]);
  });

  test("a refused write paints the ledger's voice naming the key — never the sentinel", async () => {
    mountBench({ patchFailures: [{ draftId: "bench-p", stageId: "s_0", delivered: false, reason: "stage not found" }] });
    await openFirstTile();
    await userEvent.setup().click(screen.getByRole("button", { name: "send-once" }));
    // the face paints on BOTH the drill strip and the tab strip (the
    // same claim, two seats — every banner carries the ledger voice)
    const banners = await screen.findAllByText(/THE WRITE DID NOT LAND/, {}, { timeout: 4000 });
    expect(banners.length).toBeGreaterThan(0);
    for (const banner of banners) {
      expect(banner.textContent).toContain("calls");
      expect(banner.textContent).not.toContain("@surface-patch");
    }
    expect(settlements.length).toBe(1);
    await expect(Promise.resolve(settlements[0])).resolves.toBe(false);
    expect(stageWriteState(draftIdOf("bench-p"), "s_0").failedKeys).toEqual(["calls"]);
  });
});

describe("THE DRAFT SEAT — the same storm law on the draft view's own patch arm", () => {
  test("a landing write clears the verb and settles true", async () => {
    mountDraft({ patchAnswerRevs: [2] });
    await screen.findByTestId("stub-studio", {}, { timeout: 4000 });
    await userEvent.setup().click(screen.getByRole("button", { name: "send-once" }));
    await waitFor(() => { expect(patchBodies().length).toBe(1); }, { timeout: 4000 });
    expect(patchBodies()[0]!["calls"]).toEqual([{ text: "a", start_frame: 0, end_frame: 48 }]);
    expect(settlements.length).toBe(1);
    await expect(Promise.resolve(settlements[0])).resolves.toBe(true);
    expect(screen.queryByText(/THE WRITE DID NOT LAND/)).toBeNull();
  });

  test("a refused write paints the ledger's voice and settles false", async () => {
    mountDraft({ patchFailures: [{ draftId: "draft-1", stageId: "s_0", delivered: false, reason: "stage not found" }] });
    await screen.findByTestId("stub-studio", {}, { timeout: 4000 });
    await userEvent.setup().click(screen.getByRole("button", { name: "send-once" }));
    const banner = await screen.findByText(/THE WRITE DID NOT LAND/, {}, { timeout: 4000 });
    expect(banner.textContent).toContain("calls");
    expect(settlements.length).toBe(1);
    await expect(Promise.resolve(settlements[0])).resolves.toBe(false);
  });
});
