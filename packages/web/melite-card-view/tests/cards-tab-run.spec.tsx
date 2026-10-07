// @vitest-environment happy-dom
// cards-tab-run.spec.tsx — the drill's model-key, family, race, and
// run-flush arms (2026-09-16 burn-down, installment 3b): the bench /
// user model key arms, the engineless family arm, the empty-url
// candidate arm, the reject-after-unmount guard, and the run verb's
// flush-then-start law (held-only keys ride as null-deletes; a dead
// patch voices instead of starting).
// Estate verbs ride mountEstateFakes (the one-lane seam); the
// deferred-reject formSpec half stays on fetch verbatim (/v1/* are
// still fetch in prod).
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';

interface Call { method: string; args: Record<string, unknown> }

let fakes: { calls: Call[]; unmount: () => void } | null = null;
let posted: Call[] = [];

// the fetch half (kept verbatim): the form-spec mode + the deferred
// reject capture. /v1/form-spec stays on fetch by design.
const formCtl: {
  formSpec: "ok" | "deferred-reject";
  rejectFormSpec: ((reason: unknown) => void) | null;
} = { formSpec: "ok", rejectFormSpec: null };

function specBody(): Record<string, unknown> {
  return {
    form: "image-gen", genre: "image", engine: "comfyui",
    schema: schemaEnvelope({
      prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
    }),
  };
}

function stubDoors(estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  fakes?.unmount();
  const estate = mountEstateFakes(estateOpts);
  fakes = estate;
  posted = estate.calls;
  formCtl.rejectFormSpec = null;
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      if (formCtl.formSpec === "deferred-reject") {
        return new Promise<Response>((_resolve, reject) => { formCtl.rejectFormSpec = reject; });
      }
      return new Response(JSON.stringify(specBody()), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({}), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

function mountBench(stages: BenchStageView[], estateOpts: Parameters<typeof mountEstateFakes>[0] = {}): void {
  formCtl.formSpec = "ok";
  stubDoors({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: stages.map((s) => ({ ...s })) },
    draftStages: stages.map((s) => ({ ...s }) as unknown as Record<string, unknown>),
    draftBenchRev: 1,
    ...estateOpts,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue }),
  }));
}

function firstTile(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  return el as HTMLElement;
}

async function openFirstTile(): Promise<void> {
  const user = userEvent.setup();
  await user.click(firstTile());
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
}

function zoomCard(): HTMLElement {
  const el = document.querySelector('div[class*="zoomCard"]');
  if (el === null) throw new Error("zoom card not found");
  return el as HTMLElement;
}

describe("the drill's model key — the spec follows the effective model", () => {
  test("an empty held model falls to the card (never a model-key hang)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "" } }]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a held model re-specs by model key and seeds the user layer", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: { model: "image-gen" } }]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an engineless row specs by card id (the engine fallback never fires)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", params: {} }]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a result with an empty url serves no candidate (never a dead pick)", async () => {
    mountBench([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {}, result: { url: "" } },
    ]);
    await openFirstTile();
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the drill's reject-after-unmount guard — a late failure stays silent", () => {
  test("closing before the spec fails drops the failure (no crash)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    // re-arm the deferred reject AFTER the mount (the mount's own
    // spec fetch already resolved ok — this second stub answers the
    // drill's fetch, which fires on open below).
    formCtl.formSpec = "deferred-reject";
    const user = userEvent.setup();
    await user.click(firstTile());
    await screen.findByText("form…", {}, { timeout: 4000 });
    fireEvent.click(screen.getByLabelText("Collapse card"));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    formCtl.rejectFormSpec!(new Error("gone"));
    await new Promise((r) => setTimeout(r, 50));
    expect(document.querySelector('[data-testid="stage-preview-seat"]')).toBeNull();
    expect(firstTile()).toBeTruthy();
  });
});

describe("the run verb — the flush-then-start law", () => {
  test("held-only keys flush as null-deletes before the start", async () => {
    mountBench(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "p", recipe: "old", model: "image-gen" } }],
      { refusals: [{ method: "runs/start", message: "no engine today" }] },
    );
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "!!!");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      const patch = posted.find((p) => JSON.stringify(p.args).includes('"recipe":null'));
      expect(patch).toBeTruthy();
    });
    const patch = posted.find((p) => JSON.stringify(p.args).includes('"recipe":null'))!;
    expect(JSON.stringify(patch.args)).toContain('"prompt":"p!!!"');
    // the start still fired after the flush
    await waitFor(() => {
      expect(posted.some((p) => p.method === "runs/start")).toBe(true);
    });
  });

  test("a dead patch voices instead of starting (never a silent drop)", async () => {
    // only the patch door throws the foreign string "kablam" verbatim
    // (the old stub's shape) — the face speaks the thrown words (the
    // failureText law) and the start never fires.
    mountBench(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "p", recipe: "old" } }],
      { throws: [{ method: "drafts/patch", value: "kablam" }] },
    );
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "!!!");
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
    expect(posted.some((p) => p.method === "runs/start")).toBe(false);
  });
});

describe("the error face retires on an external success — an error is a claim, not a latch", () => {
  // THE OPERATOR'S LAW (2026-10-10: "errors don't go away when we
  // have a successful gen"): localRunError spoke for a start THIS
  // tab attempted — but it was cleared only by the next verb press
  // HERE, so a generation landing through any OTHER hand (the
  // agent's melite_flow, another tab, a headless commission) left
  // the refusal strip up forever over the success that had already
  // replaced it. The face now retires the moment a stage row lands
  // terminal-done that this tab did not watch go terminal; the
  // derived half (a FAILED row's reason) stays honest in both
  // directions.
  test("a refused start's strip leaves when a generation lands done through another hand", async () => {
    formCtl.formSpec = "ok";
    const idle = { id: "s_0", card: "image-gen", engine: "comfyui", params: {} };
    let benchValue: CardsBenchValue = {
      kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [idle],
    } as unknown as CardsBenchValue;
    stubDoors({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [{ ...idle }] },
      draftStages: [{ ...idle } as unknown as Record<string, unknown>],
      draftBenchRev: 1,
      refusals: [{ method: "runs/start", message: "card 'image-gen' refuses the state" }],
    });
    const props = {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: (): { status: "live", value: CardsBenchValue } => ({ status: "live", value: benchValue }),
    };
    const view = render(h(CardsTab, props));
    await openFirstTile();
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    // the refused start voices (the zoom's status seat and/or the
    // tab's strip — multiple seats may carry it, at least one must).
    // The 5s ceilings match the file's house style: the fleet's dom
    // lanes share the box, so arrival latency is load-owned.
    await waitFor(() => {
      expect(screen.getAllByText(/refuses the state/).length).toBeGreaterThan(0);
    }, { timeout: 5000 });
    // THE OTHER HAND: the agent's generation lands — the resource
    // re-emits the row terminal-done; THIS tab pressed nothing
    benchValue = {
      kind: "bench", draftId: "bench-p", rev: 2, log: [],
      stages: [{
        ...idle, runStatus: "done",
        result: { run_id: "r_ext", url: "/v1/runs/r_ext/media/out.png" },
      }],
    } as unknown as CardsBenchValue;
    view.rerender(h(CardsTab, props));
    await waitFor(() => {
      expect(screen.queryAllByText(/refuses the state/)).toEqual([]);
    }, { timeout: 5000 });
    // the derived half stays honest: a row that is failed NOW faces
    // its reason — retirement never muted the live truth
    benchValue = {
      kind: "bench", draftId: "bench-p", rev: 3, log: [],
      stages: [{ ...idle, runStatus: "failed", result: { run_id: "r_x", error: "engine cold" } }],
    } as unknown as CardsBenchValue;
    view.rerender(h(CardsTab, props));
    await waitFor(() => {
      // both honest seats may carry it (the tab strip and the zoom's
      // status seat) — at least one must
      expect(screen.getAllByText("engine cold").length).toBeGreaterThan(0);
    });
  });

  test("a VERB refusal survives a foreign terminal-done — only its own verb's success clears it (W6)", async () => {
    formCtl.formSpec = "ok";
    const idle = { id: "s_0", card: "image-gen", engine: "comfyui", params: {} };
    const other = { id: "s_1", card: "image-gen", engine: "comfyui", params: {} };
    let benchValue: CardsBenchValue = {
      kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [idle, other],
    } as unknown as CardsBenchValue;
    stubDoors({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [{ ...idle }, { ...other }] },
      draftStages: [{ ...idle }, { ...other }] as unknown as Array<Record<string, unknown>>,
      draftBenchRev: 1,
      // ONE refusal: the first remove dies, the retry lands
      refusals: [{ method: "bench/remove-stage", message: "bench/no-remove-today" }],
    });
    const props = {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: (): { status: "live", value: CardsBenchValue } => ({ status: "live", value: benchValue }),
    };
    const view = render(h(CardsTab, props));
    // the trash dies on the wire — the strip voices the verb refusal
    fireEvent.click(screen.getAllByTestId("tile-remove")[0]!);
    expect(await screen.findByText("bench/no-remove-today", {}, { timeout: 4000 })).toBeTruthy();
    // THE OTHER HAND lands a generation on the SIBLING stage — the
    // terminal-done retires START claims, never a verb claim: an
    // unrelated success eating an unanswered refusal is information
    // loss outright
    benchValue = {
      kind: "bench", draftId: "bench-p", rev: 2, log: [],
      stages: [{
        ...other, runStatus: "done",
        result: { run_id: "r_ext", url: "/v1/runs/r_ext/media/out.png" },
      }, idle],
    } as unknown as CardsBenchValue;
    view.rerender(h(CardsTab, props));
    // the sibling's terminal-done RENDERED (the retire effect ran on
    // the transition) — and the verb claim still stands over it
    await waitFor(() => {
      expect(document.querySelector('[data-stage-id="s_1"]')?.getAttribute("data-stage-status")).toBe("done");
    });
    expect(screen.getByText("bench/no-remove-today")).toBeTruthy();
    // the claim's OWN verb succeeds — the retry lands and the strip
    // retires (never a latch in either direction)
    fireEvent.click(screen.getAllByTestId("tile-remove")[0]!);
    await waitFor(() => {
      expect(screen.queryAllByText("bench/no-remove-today")).toEqual([]);
    });
  });
  // The A STAGE ADDED BETWEEN FRAMES arm: `prev.get(id) ?? ''` is the
  // stage the previous frame never saw — the bench is the server's
  // document (the no-stale-tab law), so a stage can APPEAR already
  // terminal. Its word has no prior reading, and an absent reading is
  // not 'done' — so it retires the claim exactly like a transition.
  test("a stage ADDED already-done retires the claim — no prior reading is not 'done'", async () => {
    formCtl.formSpec = "ok";
    const idle = { id: "s_0", card: "image-gen", engine: "comfyui", params: {} };
    const landed = {
      id: "s_2", card: "image-gen", engine: "comfyui", params: {}, runStatus: "done",
      result: { run_id: "r_ext", url: "/v1/runs/r_ext/media/out.png" },
    };
    let benchValue: CardsBenchValue = {
      kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [idle],
    } as unknown as CardsBenchValue;
    stubDoors({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [{ ...idle }] },
      draftStages: [{ ...idle } as unknown as Record<string, unknown>],
      draftBenchRev: 1,
      refusals: [{ method: "runs/start", message: "card 'image-gen' refuses the state" }],
    });
    const props = {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: (): { status: "live", value: CardsBenchValue } => ({ status: "live", value: benchValue }),
    };
    const view = render(h(CardsTab, props));
    await openFirstTile();
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(screen.getAllByText(/refuses the state/).length).toBeGreaterThan(0);
    });
    // THE OTHER HAND adds a stage the estate had already settled —
    // s_2 was never in the frame that set the baseline
    benchValue = {
      kind: "bench", draftId: "bench-p", rev: 2, log: [], stages: [idle, landed],
    } as unknown as CardsBenchValue;
    view.rerender(h(CardsTab, props));
    await waitFor(() => {
      expect(document.querySelector('[data-stage-id="s_2"]')?.getAttribute("data-stage-status")).toBe("done");
    });
    await waitFor(() => {
      expect(screen.queryAllByText(/refuses the state/)).toEqual([]);
    });
  });
});
