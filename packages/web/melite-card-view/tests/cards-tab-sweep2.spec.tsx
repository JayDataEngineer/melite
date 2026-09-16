// @vitest-environment happy-dom
// cards-tab-sweep2.spec.tsx — the remainder sweep, part 2 (2026-09-16
// burn-down, installment 3l): the last reachable arms — the picker's
// busy guard, the add re-read catch, the seat's Enter key, and the
// card-less drilldown head. Grouping's whole block is documented
// absent (exempt with proof — setGrouping's only sites pass false).
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

interface FrameAnswer { value?: unknown; refuse?: string; thrown?: unknown }

const doors: {
  posted: Array<{ method: string; args: Record<string, unknown> }>;
  frames: Record<string, (args: Record<string, unknown>) => FrameAnswer>;
  specFields: Record<string, unknown> | null;
  catalog: Record<string, Record<string, unknown>>;
  benchThrown: unknown;
  servedStages: BenchStageRow[];
} = {
  posted: [], frames: {}, specFields: null, catalog: {},
  benchThrown: undefined, servedStages: [],
};

function stubFetch(): void {
  doors.posted = [];
  doors.frames = {};
  doors.specFields = null;
  doors.catalog = {};
  doors.benchThrown = undefined;
  doors.servedStages = [];
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope((doors.specFields ?? {
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }) as Parameters<typeof schemaEnvelope>[0]),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({}), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: doors.catalog }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
      doors.posted.push({ method: frame.method, args: frame.payload.args });
      if (frame.method === "bench/get") {
        if (doors.benchThrown !== undefined) throw doors.benchThrown;
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: { draft_id: "bench-p", rev: 2, log: [], stages: doors.servedStages } },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
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

const STAGES: BenchStageRow[] = [
  { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } },
];

function mount(stages: BenchStageRow[] = STAGES): void {
  stubFetch();
  doors.servedStages = stages;
  doors.frames["drafts/patch"] = () => ({ value: { delivered: true } });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status: "live",
      value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages },
    }),
  } as never));
}

async function openZoom(): Promise<void> {
  await waitFor(() => {
    if (document.querySelector('button[class*="tileInner"]') === null) throw new Error("no tile");
  });
  fireEvent.click(document.querySelector('button[class*="tileInner"]') as HTMLElement);
  await waitFor(() => {
    if (document.querySelector('div[class*="zoomCard"]') === null) throw new Error("no zoom");
  }, { timeout: 5000 });
}

async function openPicker(): Promise<void> {
  await waitFor(() => {
    if (screen.queryByRole("button", { name: "Add a card" }) === null) throw new Error("no add");
  });
  fireEvent.click(screen.getByRole("button", { name: "Add a card" }));
  await screen.findByRole("button", { name: "Close picker" }, { timeout: 5000 });
}

describe("the picker busy guard — one pick in flight, never two adds", () => {
  test("a second pick mid-flight returns before any second door fires", async () => {
    // RECEIPT NOTE: the card buttons disable while busyId holds, so
    // the drill's `busyId !== null` guard is defense-in-depth for an
    // unreachable UI state (exempt with proof). What rides here is
    // the reachable law: one flight, one add, whatever the presses.
    mount();
    doors.catalog = {
      lone: { label: "Lone", genre: "image", families: ["lone"] },
      duo: { label: "Duo", genre: "image", families: ["duo"] },
    };
    doors.frames["bench/add-stage"] = () => ({ value: { rev: 2 } });
    doors.servedStages = [
      ...STAGES,
      { id: "s_9", card: "lone", engine: "comfyui", params: {} },
    ];
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    // the first pick owns the flight — the second returns at the guard
    fireEvent.click(await screen.findByRole("button", { name: "Duo" }, { timeout: 5000 }));
    await waitFor(() => {
      if (document.querySelector('div[class*="zoomCard"]') === null) throw new Error("no fresh zoom");
    }, { timeout: 5000 });
    const adds = doors.posted.filter((p) => p.method === "bench/add-stage");
    expect(adds).toHaveLength(1);
    expect(JSON.stringify(adds[0]?.args)).toContain("lone");
  });
});

describe("the add re-read catch — a dead bench after a live add still lands", () => {
  test("a throwing re-read falls to the plain add (never a stuck picker)", async () => {
    mount();
    doors.catalog = { lone: { label: "Lone", genre: "image", families: ["lone"] } };
    doors.frames["bench/add-stage"] = () => ({ value: { rev: 2 } });
    doors.benchThrown = "gone";
    await openPicker();
    fireEvent.click(await screen.findByRole("button", { name: "Lone" }, { timeout: 5000 }));
    // the picker closes (the add landed) and the fallback voices —
    // no auto-open (the re-read never named a fresh row)
    expect(await screen.findByText("bench reload failed", {}, { timeout: 5000 })).toBeTruthy();
    expect(document.querySelector('div[class*="zoomCard"]')).toBeNull();
    expect(screen.queryByRole("button", { name: "Close picker" })).toBeNull();
  });
});

describe("the preview seat keys — Enter opens like Space", () => {
  test("Enter on the seat opens the drilldown (never Space-only)", async () => {
    mount([{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" },
      result: { artifacts: { "my render": "/renders/a.png" } },
    } as BenchStageRow]);
    await openZoom();
    const seat = await screen.findByTestId("stage-preview-seat", {}, { timeout: 5000 });
    seat.focus();
    fireEvent.keyDown(seat, { key: "Enter" });
    expect(await screen.findByText("my render", {}, { timeout: 5000 })).toBeTruthy();
  });

  test("other keys on the seat stay quiet (never a stray drilldown)", async () => {
    mount([{
      id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" },
      result: { artifacts: { "my render": "/renders/a.png" } },
    } as BenchStageRow]);
    await openZoom();
    const seat = await screen.findByTestId("stage-preview-seat", {}, { timeout: 5000 });
    seat.focus();
    fireEvent.keyDown(seat, { key: "a" });
    await new Promise((r) => setTimeout(r, 300));
    expect(screen.queryByText("my render")).toBeNull();
  });
});

describe("the card-less drilldown — the head falls to the stage id", () => {
  test("a stageless card caption still names the row (never blank)", async () => {
    mount([{
      id: "s_0", engine: "comfyui", params: { prompt: "a barn" },
      result: { artifacts: { output: "/renders/a.png" } },
    } as BenchStageRow]);
    await openZoom();
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 5000 });
    fireEvent.click(screen.getByTestId("stage-preview-seat"));
    // the drilldown opens on the basename (the head took the id arm)
    expect(await screen.findByText("a.png", {}, { timeout: 5000 })).toBeTruthy();
  });
});

describe("the grouping absence — selection mode has no entry", () => {
  test("no Group action rides the bench (the dead state's receipt)", async () => {
    mount([
      ...STAGES,
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {} },
    ]);
    await screen.findByText("rev 1");
    // setGrouping's only sites pass false (init + exit): no affordance
    // ever flips it — tiles carry no grouping mark, no bar renders.
    // If an entry lands one day, this trips and the exemption is revisited.
    expect(document.querySelector('li[data-grouping="on"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Group \d+ cards/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
  });
});
