// @vitest-environment happy-dom
// gate-r7b-tabbody.spec.tsx — cards-tab-body's stop fallback arm: a
// FOREIGN (non-Error) runs/stop throw voices 'stop failed' (the
// message-throw and refusal arms already ride in cards-tab-guards).
// CardsTab mount (the stop gesture is the tab's own), estate verbs
// on mountEstateFakes, fetch on the /v1 discovery doors only.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

type EstateOpts = Parameters<typeof mountEstateFakes>[0];

const STAGES: BenchStageView[] = [
  { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
];
const BENCH = { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: STAGES } as const;

let fakes: { calls: Array<{ method: string; args: Record<string, unknown> }>; unmount: () => void } | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function stubFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "x", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms") || path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify(path.includes("catalog") ? { cards: {} } : {}), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

function tabInfo(): () => { tab: unknown } {
  return () => ({ tab: {
    kind: "sidebar.right.pane.tab",
    navigation: { address: "dsh-resource://cards/bench" },
    actions: {},
  } });
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

function mount(estate?: EstateOpts): void {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [{ ...STAGES[0], runStatus: "running" }] },
    draftStages: [{ ...STAGES[0] } as unknown as Record<string, unknown>],
    draftBenchRev: 1,
    startDocs: estate?.startDocs,
    runDocs: estate?.runDocs,
    refusals: estate?.refusals,
    throws: estate?.throws,
    verbGates: estate?.verbGates,
  });
  render(h(CardsTab, {
    useTabInfo: tabInfo(),
    useResource: () => ({ status: "live" as const, value: { ...BENCH, stages: STAGES } }),
  } as never));
}

describe("the tile stop's foreign voice — a down wire still names the face", () => {
  test("a foreign runs/stop throw voices its own words (never a throw past the gesture)", async () => {
    mount({
      startDocs: [{ run_id: "r_1" }],
      throws: [{ method: "runs/stop", value: "kablam" }],
    });
    const user = userEvent.setup();
    await waitFor(() => { expect(firstTile()).toBeTruthy(); });
    await user.click(firstTile());
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    // the zoom's Run arms the tile stop with the session run
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(calls().some((p) => p.method === "runs/start")).toBe(true);
    });
    const stop = await screen.findByTestId("tile-stop", {}, { timeout: 4000 });
    expect((stop as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(stop);
    // the foreign throw surfaces verbatim (the failureText law),
    // never a fixed fallback that masks it
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
    expect(calls().some((p) => p.method === "runs/stop"
      && (p.args as Record<string, unknown>)["runId"] === "r_1")).toBe(true);
  });
});

describe("the tile trash's in-flight fence (card-view F4)", () => {
  // THE FENCE: one wire per stage — the parked door holds the first
  // remove; the double click must not fire a second remove for a row
  // already going (its refusal would voice a lie on the face).
  test("a remove in flight fences the tile — one wire per stage", async () => {
    let release!: () => void;
    const parked = new Promise<void>((r) => { release = r; });
    mount({ verbGates: { "bench/remove-stage": [parked] } });
    const trash = await screen.findByTestId("tile-remove", {}, { timeout: 4000 });
    fireEvent.click(trash);
    fireEvent.click(trash); // fenced: the first wire is in flight
    await waitFor(() => { expect(calls().filter((c) => c.method === "bench/remove-stage")).toHaveLength(1) });
    expect(calls().filter((c) => c.method === "bench/remove-stage")).toHaveLength(1);
    release();
    // the flight lands; still exactly one wire for the stage
    await waitFor(() => {
      expect(calls().every((c) => c.method !== "bench/remove-stage" || c.args["doc"] !== undefined)).toBe(true);
    });
    expect(calls().filter((c) => c.method === "bench/remove-stage")).toHaveLength(1);
  });
});

describe("the settle-to-paint window (card-view F2)", () => {
  // THE WINDOW: an observer's settle clears the REF synchronously and
  // queues the state write; until React commits, the mounted tree is
  // the PRE-settle render — a Stop click in that window dispatches
  // the STALE closure. testing-library's act wrappers flush queued
  // writes at each act exit, collapsing the window (the arm would be
  // vacuously green: the committed map is already empty). The rig:
  // the settle rides microtasks only (a lingering terminal runs/status
  // doc — the observer's poll path sleeps only on LIVE rows), and the
  // click is a RAW DOM dispatch, outside every act wrapper — the
  // handler that runs is the pre-commit closure, exactly the browser's
  // shape. THE LAW: stop reads the ref (the fence's truth), never the
  // render's mirror — a settled run is never stopped again.
  const tick = async (n: number): Promise<void> => {
    for (let i = 0; i < n; i++) await Promise.resolve();
  };

  test("a stop in the settle-to-paint window never wires a settled run", async () => {
    // THE HOLD: the observer's first poll parks on the verb gate, so
    // the mapping commit can be confirmed (the button up, enabled)
    // BEFORE the settle races ahead — the real run's shape, where the
    // mapping and the settle are frames apart
    let release!: () => void;
    const parked = new Promise<void>((r) => { release = r; });
    mount({
      startDocs: [{ run_id: "r_1" }],
      // rows serve in order: the probe reads the live row (the stamp
      // mounts the stop face), the parked poll reads the terminal row
      runDocs: [
        { run_id: "r_1", status: "running", draft_id: "bench-p", stages: [{ id: "s_0", status: "running", url: "" }] },
        { run_id: "r_1", status: "completed", draft_id: "bench-p", stages: [{ id: "s_0", status: "done", url: "" }] },
      ],
      // gate 1 passes the probe through; gate 2 parks the loop's
      // terminal poll until the mapping commit is confirmed
      verbGates: { "runs/status": [Promise.resolve(), parked] },
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
    // the settle: the gate releases the terminal answer; the ref
    // clears in microtasks and the state write stays QUEUED (no act
    // wraps the ticks — React's scheduler never runs on microtasks)
    release();
    await tick(60);
    // still enabled: the commit has NOT landed — the window is open,
    // exactly the frame the user's click lands in
    expect((stop as HTMLButtonElement).disabled).toBe(false);
    // the raw dispatch: outside act, the mounted (pre-commit) tree's
    // handler answers the click — the stale closure uncured
    stop.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    // THE WALL: the settle already gave the run id back — a stop here
    // must not wire the settled run (a cancel for a done run refuses,
    // voicing a lie on the face)
    expect(calls().some((p) => p.method === "runs/stop")).toBe(false);
    // the settle wrote through: the outcome patch carries the
    // terminal word (the same write whose commit the click outran)
    expect(calls().some((p) => p.method === "drafts/patch"
      && JSON.stringify(p.args).includes('"runStatus":"done"'))).toBe(true);
  });
});
