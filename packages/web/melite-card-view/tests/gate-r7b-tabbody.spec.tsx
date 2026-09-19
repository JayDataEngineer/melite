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
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

type EstateOpts = Parameters<typeof mountEstateFakes>[0];

const STAGES: BenchStageRow[] = [
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
    refusals: estate?.refusals,
    throws: estate?.throws,
  });
  render(h(CardsTab, {
    useTabInfo: tabInfo(),
    useResource: () => ({ status: "live", value: { ...BENCH, stages: STAGES } }),
  } as never));
}

describe("the tile stop's foreign voice — a down wire still names the face", () => {
  test("a foreign runs/stop throw voices 'stop failed' (never a throw past the gesture)", async () => {
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
    // the foreign throw lands as the fallback text (the Error arm
    // would voice the thrown message instead)
    expect(await screen.findByText("stop failed", {}, { timeout: 4000 })).toBeTruthy();
    expect(calls().some((p) => p.method === "runs/stop"
      && (p.args as Record<string, unknown>)["runId"] === "r_1")).toBe(true);
  });
});
