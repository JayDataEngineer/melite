// @vitest-environment happy-dom
// cards-tab-guards.spec.tsx — the tab's mount guards (2026-09-16
// burn-down, installment 3e): the missing-hook faces, the snapshot
// faces (loading, failed with/without a message, valueless), the
// address fallbacks (no tab info, content-id only), the empty-draft
// early return, the slot consult fallbacks (a nullish claim still
// renders the fallback), and the latest-run adoption that arms the
// drill's Stop.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes, type EstateRefusal } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

// THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
// namespaces (mountEstateFakes); fetch answers ONLY the /v1
// discovery doors.
let fakes: EstateFakes | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function stubFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({
        "image-gen": { outputs: { default: "image" } },
        tts: { outputs: { default: "audio" } },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

const STAGES: BenchStageView[] = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }];
const BENCH: CardsBenchValue = { kind: "bench", draftId: "bench-p", sessionKey: "p", rev: 1, log: [], stages: STAGES };

function tabInfo(address?: string): () => unknown {
  return () => ({ tab: {
    kind: "sidebar.right.pane.tab", contentId: undefined,
    navigation: { address: address ?? "dsh-resource://cards/bench" },
    actions: { openResource: () => {} },
  } });
}

function benchDoc(stages: BenchStageView[], draftId = "bench-p"): Record<string, unknown> {
  // rows ride verbatim (readBench passes them through) — the rail
  // reads the same runStatus seat the snapshot carries.
  return { draft_id: draftId, rev: 1, log: [], stages };
}

interface EstateOpts {
  listRows?: Array<Record<string, unknown>>;
  startDocs?: Array<Record<string, unknown>>;
  refusals?: EstateRefusal[];
  throws?: EstateRefusal[];
}

interface MountOpts {
  useTabInfo?: unknown;
  useResource?: unknown;
  renderSlot?: unknown;
  stages?: BenchStageView[];
  docStages?: BenchStageView[];
  draftId?: string;
  /** Prestaged estate answers — land BEFORE the render, so
   *  mount-time calls (the adoption effect) read them on call. */
  estate?: EstateOpts;
}

function mount(opts: MountOpts = {}): void {
  stubFetch();
  // the rail reads the served doc, the drill reads the live snapshot
  // (two seats, two stage lists — split only when the faces disagree)
  const snapStages = opts.stages ?? STAGES;
  const docStages = opts.docStages ?? snapStages;
  fakes = mountEstateFakes({
    benchDoc: benchDoc(docStages, opts.draftId),
    draftStages: docStages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    listRows: opts.estate?.listRows,
    startDocs: opts.estate?.startDocs,
    refusals: opts.estate?.refusals,
    throws: opts.estate?.throws,
  });
  const props: Record<string, unknown> = {};
  if (opts.useTabInfo !== undefined) props["useTabInfo"] = opts.useTabInfo;
  else props["useTabInfo"] = tabInfo();
  if (opts.useResource !== undefined) props["useResource"] = opts.useResource;
  else props["useResource"] = () => ({ status: "live" as const, value: { ...BENCH, stages: snapStages } });
  if (opts.renderSlot !== undefined) props["renderSlot"] = opts.renderSlot;
  render(h(CardsTab, props as never));
}

function firstTile(): HTMLElement {
  const el = document.querySelector('button[class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  return el as HTMLElement;
}

function zoomCard(): HTMLElement {
  const el = document.querySelector('div[class*="zoomCard"]');
  if (el === null) throw new Error("zoom card not found");
  return el as HTMLElement;
}

describe("the mount guards — hooks and snapshots", () => {
  test("no tab hook falls to the default bench address (never a blank tab)", async () => {
    mount({ useTabInfo: null });
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
  });

  test("a content-id tab resolves its address (never a blank tab)", async () => {
    mount({
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: "dsh-resource://cards/bench",
        navigation: {},
        actions: { openResource: () => {} },
      } }),
    });
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
  });

  test("no resource hook says so (never a silent empty)", async () => {
    mount({ useResource: null });
    expect(await screen.findByText("cards resource hook unavailable", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a loading snapshot waits out loud", async () => {
    mount({ useResource: () => ({ status: "loading" }) });
    expect(await screen.findByText(/loading .*…/, {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a failed snapshot voices the estate's own words", async () => {
    mount({ useResource: () => ({ status: "failed" as const, failure: new Error("door down") }) });
    expect(await screen.findByText("door down", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a messageless failure still names the face", async () => {
    mount({ useResource: () => ({ status: "failed" }) });
    expect(await screen.findByText("cards resource failed", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a valueless live snapshot says so", async () => {
    mount({ useResource: () => ({ status: "live" }) });
    expect(await screen.findByText("cards resource gave no value", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an empty draft id renders without adopting a run", async () => {
    // the snapshot carries the empty id (the estate doc is not the
    // adoption's source — the live snapshot is)
    mount({ useResource: () => ({ status: "live" as const, value: { ...BENCH, draftId: "" } }) });
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    expect(calls().some((p) => p.method === "runs/list")).toBe(false);
  });
});

describe("the slot consult fallbacks — a nullish claim keeps the fallback", () => {
  test("an undefined stage-view claim still drills", async () => {
    mount({ renderSlot: () => undefined });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an undefined preview claim still previews", async () => {
    mount({
      stages: [{
        id: "s_0", card: "image-gen", engine: "comfyui", params: {},
        result: { url: "/x.mp4" },
      }],
      renderSlot: () => undefined,
    });
    const user = userEvent.setup();
    await user.click(firstTile());
    const seat = await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    // the consult fell through to the fallback — the shared video
    // face still renders (never a claimed-or-blank fork)
    expect(seat.querySelector("video")).not.toBeNull();
  });
});

/** The draft-tab wire: discovery fetch + the bound estate fakes
 *  (the harness's default draft row is the s_0 the snapshots open). */
function mountDraftWire(estate?: EstateOpts): void {
  stubFetch();
  fakes = mountEstateFakes({
    listRows: estate?.listRows,
    refusals: estate?.refusals,
    throws: estate?.throws,
  });
}

describe("the latest-run adoption — the estate's newest run arms Stop", () => {
  test("a runless draft keeps the stop noop (the press drops silent)", async () => {
    mountDraftWire();
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: {},
      } }),
      useResource: () => ({ status: "live" as const, value: {
        kind: "draft", draftId: "draft-1", stageId: "s_0",
        intent: "the film", rev: 1,
        stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      } }),
      renderSlot: ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
        if (slot !== "cards.stage.view") return opts.fallback;
        return h("div", null,
          opts.fallback as never,
          h("button", {
            type: "button", "data-testid": "slot-stop",
            onClick: () => { (owner["onStop"] as () => void)(); },
          }, "SLOT-STOP"),
        );
      }) as never,
    } as never));
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await screen.findByTestId("slot-stop", {}, { timeout: 4000 });
    // no run adopted — the stop noop drops the press (never a post,
    // never a throw past the gesture)
    fireEvent.click(screen.getByTestId("slot-stop"));
    await new Promise((r) => setTimeout(r, 200));
    expect(calls().some((p) => p.method === "runs/stop")).toBe(false);
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a departed stage voices its absence and the back noop lands silent", async () => {
    mountDraftWire();
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_gone" },
        actions: {},
      } }),
      useResource: () => ({ status: "live" as const, value: {
        kind: "draft", draftId: "draft-1", stageId: "s_gone",
        intent: "the film", rev: 1,
        stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      } }),
    } as never));
    expect(await screen.findByText(/no longer on draft/, {}, { timeout: 4000 })).toBeTruthy();
    // no bench seat behind this tab — back is a silent noop
    fireEvent.click(screen.getByRole("button", { name: "Back to the bench" }));
    await new Promise((r) => setTimeout(r, 200));
    expect(await screen.findByText(/no longer on draft/, {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a draft's adopted run arms the slot's stop and the press rides runs/stop", async () => {
    mountDraftWire({ listRows: [{ run_id: "r_9", draft_id: "draft-1", created_at: 7 }] });
    const seen: Array<unknown> = [];
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: {},
      } }),
      useResource: () => ({ status: "live" as const, value: {
        kind: "draft", draftId: "draft-1", stageId: "s_0",
        intent: "the film", rev: 1,
        stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      } }),
      renderSlot: ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
        if (slot !== "cards.stage.view") return opts.fallback;
        seen.push(owner["runId"]);
        return h("div", null,
          opts.fallback as never,
          h("button", {
            type: "button", "data-testid": "slot-stop",
            onClick: () => { (owner["onStop"] as () => void)(); },
          }, "SLOT-STOP"),
        );
      }) as never,
    } as never));
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    // the adoption lands through the owner (never press the pre-armed noop)
    await waitFor(() => { expect(seen).toContain("r_9"); }, { timeout: 4000 });
    fireEvent.click(await screen.findByTestId("slot-stop", {}, { timeout: 4000 }));
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/stop"
        && (p.args as Record<string, unknown>)["runId"] === "r_9")).toBe(true);
    });
  });

  test("a refused draft cancel voices the refusal (never a silent drop)", async () => {
    mountDraftWire({
      listRows: [{ run_id: "r_9", draft_id: "draft-1", created_at: 7 }],
      refusals: [{ method: "runs/stop", message: "already gone" }],
    });
    const seen: Array<unknown> = [];
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: {},
      } }),
      useResource: () => ({ status: "live" as const, value: {
        kind: "draft", draftId: "draft-1", stageId: "s_0",
        intent: "the film", rev: 1,
        stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      } }),
      renderSlot: ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
        if (slot !== "cards.stage.view") return opts.fallback;
        seen.push(owner["runId"]);
        return h("div", null,
          opts.fallback as never,
          h("button", {
            type: "button", "data-testid": "slot-stop",
            onClick: () => { (owner["onStop"] as () => void)(); },
          }, "SLOT-STOP"),
        );
      }) as never,
    } as never));
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await waitFor(() => { expect(seen).toContain("r_9"); }, { timeout: 4000 });
    fireEvent.click(await screen.findByTestId("slot-stop", {}, { timeout: 4000 }));
    expect(await screen.findByText("already gone", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a throwing draft cancel falls back loud (never a throw past the gesture)", async () => {
    // the old stub threw the bare string "kablam" (a non-Error, so
    // the client voiced its 'cancel failed' fallback); the live seam
    // throws Errors, so the queued message IS the voiced text.
    mountDraftWire({
      listRows: [{ run_id: "r_9", draft_id: "draft-1", created_at: 7 }],
      throws: [{ method: "runs/stop", message: "cancel failed" }],
    });
    const seen: Array<unknown> = [];
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: {},
      } }),
      useResource: () => ({ status: "live" as const, value: {
        kind: "draft", draftId: "draft-1", stageId: "s_0",
        intent: "the film", rev: 1,
        stages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      } }),
      renderSlot: ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
        if (slot !== "cards.stage.view") return opts.fallback;
        seen.push(owner["runId"]);
        return h("div", null,
          opts.fallback as never,
          h("button", {
            type: "button", "data-testid": "slot-stop",
            onClick: () => { (owner["onStop"] as () => void)(); },
          }, "SLOT-STOP"),
        );
      }) as never,
    } as never));
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    await waitFor(() => { expect(seen).toContain("r_9"); }, { timeout: 4000 });
    fireEvent.click(await screen.findByTestId("slot-stop", {}, { timeout: 4000 }));
    expect(await screen.findByText("cancel failed", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a bench drill without a session run stops nothing (the guard holds)", async () => {
    mount({
      renderSlot: ((slot: string, owner: Record<string, unknown>, opts: { fallback: unknown }) => {
        if (slot !== "cards.stage.view") return opts.fallback;
        return h("div", null,
          opts.fallback as never,
          h("button", {
            type: "button", "data-testid": "slot-stop",
            onClick: () => { (owner["onStop"] as () => void)(); },
          }, "SLOT-STOP"),
        );
      }) as never,
    });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    fireEvent.click(await screen.findByTestId("slot-stop", {}, { timeout: 4000 }));
    await new Promise((r) => setTimeout(r, 200));
    expect(calls().some((p) => p.method === "runs/stop")).toBe(false);
  });

  test("a session run arms the tile stop and the press rides runs/stop", async () => {
    mount({
      docStages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running" }],
      estate: { startDocs: [{ run_id: "r_1" }] },
    });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/start")).toBe(true);
    });
    const stop = await screen.findByTestId("tile-stop", {}, { timeout: 4000 });
    expect((stop as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(stop);
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/stop"
        && (p.args as Record<string, unknown>)["runId"] === "r_1")).toBe(true);
    });
  });

  test("a refused tile stop voices the refusal in the zoom (never silent)", async () => {
    mount({
      docStages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running" }],
      estate: {
        startDocs: [{ run_id: "r_1" }],
        refusals: [{ method: "runs/stop", message: "too late" }],
      },
    });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/start")).toBe(true);
    });
    fireEvent.click(await screen.findByTestId("tile-stop", {}, { timeout: 4000 }));
    // the bench voices the refusal at its own level (above the rail)
    expect(await screen.findByText("too late", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a throwing tile stop falls back loud in the zoom (never a throw)", async () => {
    // the old stub threw the bare string "kablam" (a non-Error, so
    // the client voiced its 'stop failed' fallback); the live seam
    // throws Errors, so the queued message IS the voiced text.
    mount({
      docStages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running" }],
      estate: {
        startDocs: [{ run_id: "r_1" }],
        throws: [{ method: "runs/stop", message: "stop failed" }],
      },
    });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/start")).toBe(true);
    });
    fireEvent.click(await screen.findByTestId("tile-stop", {}, { timeout: 4000 }));
    expect(await screen.findByText("stop failed", {}, { timeout: 4000 })).toBeTruthy();
  });
});
