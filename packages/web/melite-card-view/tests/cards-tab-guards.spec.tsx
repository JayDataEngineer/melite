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
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

interface FrameAnswer { value?: unknown; refuse?: string; thrown?: unknown }
interface Doors {
  posted: Array<{ method: string; args: Record<string, unknown> }>;
  frames: Record<string, (args: Record<string, unknown>) => FrameAnswer>;
}

const doors: Doors = { posted: [], frames: {} };

function stubFetch(): void {
  doors.posted = [];
  doors.frames = {};
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
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
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
      doors.posted.push({ method: frame.method, args: frame.payload.args });
      const route = doors.frames[frame.method];
      if (route !== undefined) {
        const answer = route(frame.payload.args);
        if (answer.thrown !== undefined) throw answer.thrown;
        if (answer.refuse !== undefined) {
          return new Response(JSON.stringify({
            type: "server-response", rpcId: frame.rpcId,
            result: { ok: false, error: { message: answer.refuse } },
          }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: answer.value ?? {} },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        type: "server-response", rpcId: frame.rpcId, result: { ok: true, value: {} },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("no", { status: 500 });
  });
}

const STAGES: BenchStageRow[] = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }];
const BENCH: CardsBenchValue = { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: STAGES };

function tabInfo(address?: string): () => unknown {
  return () => ({ tab: {
    kind: "sidebar.right.pane.tab", contentId: undefined,
    navigation: { address: address ?? "dsh-resource://cards/bench" },
    actions: { openResource: () => {} },
  } });
}

function benchDoc(stages: BenchStageRow[], draftId = "bench-p"): Record<string, unknown> {
  return {
    draft_id: draftId, rev: 1, log: [],
    stages: stages.map((s) => ({ ...s, run_status: s.runStatus })),
  };
}

interface MountOpts {
  useTabInfo?: unknown;
  useResource?: unknown;
  renderSlot?: unknown;
  stages?: BenchStageRow[];
  docStages?: BenchStageRow[];
  draftId?: string;
  prestage?: Record<string, (args: Record<string, unknown>) => FrameAnswer>;
}

function mount(opts: MountOpts = {}): void {
  stubFetch();
  // prestaged doors land BEFORE the render — mount-time fetches
  // (the adoption effect) read them on call, never after
  if (opts.prestage !== undefined) Object.assign(doors.frames, opts.prestage);
  // the rail reads the served doc, the drill reads the live snapshot
  // (two seats, two stage lists — split only when the faces disagree)
  const snapStages = opts.stages ?? STAGES;
  const docStages = opts.docStages ?? snapStages;
  const doc = benchDoc(docStages, opts.draftId);
  const impl = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string };
      if (frame.method === "bench/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: doc },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (frame.method === "drafts/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: { draft_id: "bench-p", bench: { rev: 1 }, stages: docStages } },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    return (impl as typeof fetch)(url, init);
  });
  const props: Record<string, unknown> = {};
  if (opts.useTabInfo !== undefined) props["useTabInfo"] = opts.useTabInfo;
  else props["useTabInfo"] = tabInfo();
  if (opts.useResource !== undefined) props["useResource"] = opts.useResource;
  else props["useResource"] = () => ({ status: "live", value: { ...BENCH, stages: snapStages } });
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
    mount({ useResource: () => ({ status: "failed", failure: new Error("door down") }) });
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
    mount({ useResource: () => ({ status: "live", value: { ...BENCH, draftId: "" } }) });
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    expect(doors.posted.some((p) => p.method === "runs/list")).toBe(false);
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

describe("the latest-run adoption — the estate's newest run arms Stop", () => {
  test("a runless draft keeps the stop noop (the press drops silent)", async () => {
    stubFetch();
    doors.frames["runs/list"] = () => ({ value: { runs: [] } });
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: {},
      } }),
      useResource: () => ({ status: "live", value: {
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
    expect(doors.posted.some((p) => p.method === "runs/stop")).toBe(false);
    expect(await screen.findByText("Prompt", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a departed stage voices its absence and the back noop lands silent", async () => {
    stubFetch();
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_gone" },
        actions: {},
      } }),
      useResource: () => ({ status: "live", value: {
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
    stubFetch();
    doors.frames["runs/list"] = () => ({ value: { runs: [{ run_id: "r_9", draft_id: "draft-1", created_at: 7 }] } });
    const seen: Array<unknown> = [];
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: {},
      } }),
      useResource: () => ({ status: "live", value: {
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
      expect(doors.posted.some((p) => p.method === "runs/stop"
        && (p.args as Record<string, unknown>)["runId"] === "r_9")).toBe(true);
    });
  });

  test("a refused draft cancel voices the refusal (never a silent drop)", async () => {
    stubFetch();
    doors.frames["runs/list"] = () => ({ value: { runs: [{ run_id: "r_9", draft_id: "draft-1", created_at: 7 }] } });
    doors.frames["runs/stop"] = () => ({ refuse: "already gone" });
    const seen: Array<unknown> = [];
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: {},
      } }),
      useResource: () => ({ status: "live", value: {
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
    stubFetch();
    doors.frames["runs/list"] = () => ({ value: { runs: [{ run_id: "r_9", draft_id: "draft-1", created_at: 7 }] } });
    doors.frames["runs/stop"] = () => ({ thrown: "kablam" });
    const seen: Array<unknown> = [];
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/draft/draft-1/s_0" },
        actions: {},
      } }),
      useResource: () => ({ status: "live", value: {
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
    expect(doors.posted.some((p) => p.method === "runs/stop")).toBe(false);
  });

  test("a session run arms the tile stop and the press rides runs/stop", async () => {
    mount({ docStages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running" }] });
    doors.frames["drafts/patch"] = () => ({ value: { delivered: true, rev: 2 } });
    doors.frames["runs/start"] = () => ({ value: { run_id: "r_1" } });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/start")).toBe(true);
    });
    const stop = await screen.findByTestId("tile-stop", {}, { timeout: 4000 });
    expect((stop as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(stop);
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/stop"
        && (p.args as Record<string, unknown>)["runId"] === "r_1")).toBe(true);
    });
  });

  test("a refused tile stop voices the refusal in the zoom (never silent)", async () => {
    mount({ docStages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running" }] });
    doors.frames["drafts/patch"] = () => ({ value: { delivered: true, rev: 2 } });
    doors.frames["runs/start"] = () => ({ value: { run_id: "r_1" } });
    doors.frames["runs/stop"] = () => ({ refuse: "too late" });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/start")).toBe(true);
    });
    fireEvent.click(await screen.findByTestId("tile-stop", {}, { timeout: 4000 }));
    // the bench voices the refusal at its own level (above the rail)
    expect(await screen.findByText("too late", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a throwing tile stop falls back loud in the zoom (never a throw)", async () => {
    mount({ docStages: [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running" }] });
    doors.frames["drafts/patch"] = () => ({ value: { delivered: true, rev: 2 } });
    doors.frames["runs/start"] = () => ({ value: { run_id: "r_1" } });
    doors.frames["runs/stop"] = () => ({ thrown: "kablam" });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "runs/start")).toBe(true);
    });
    fireEvent.click(await screen.findByTestId("tile-stop", {}, { timeout: 4000 }));
    expect(await screen.findByText("stop failed", {}, { timeout: 4000 })).toBeTruthy();
  });
});
