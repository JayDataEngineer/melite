// @vitest-environment happy-dom
// cards-tab-run-studio.spec.tsx — the run verb's flush when OTHER
// hands grew the held row after the drill opened (the h3-timeline
// void, 2026-10-11).
//
// THE INCIDENT: the operator typed in the h3 studio (88
// `params:calls` patches, revs 50–137) and hit Run — the flush
// posted `calls: null` (rev 138) because the drill's open-time user
// map had no `calls` key, deleting the estate content the compose
// then missed. The s_2 wire image died the same way (rev 151:
// `input_images` nulled after the wire menu saved it post-open).
//
// THE LAW NOW: the flush nulls a held-but-unseen key ONLY when the
// drill owns its domain half — authored in THIS drill (touched) or
// deliberately dropped by its own seed (the dead recipe layer).
// Keys written after open by OTHER hands (the studio, the wire menu,
// the agent) survive the flush. The dead-recipe GC (`recipe: null`)
// is pinned in cards-tab-run.spec.tsx and must stay green.
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

// A bench the test can grow AFTER the drill opens — the fake's row
// (the flush's freshStageRow source) and the resource value (the
// drill's live bench) are staged together, exactly as the studio's
// own patch + the tab's re-emit stage them in production.
function mountLive(openParams: Record<string, unknown>) {
  formCtl.formSpec = "ok";
  const fakeRow = { id: "s_0", card: "image-gen", engine: "comfyui", params: { ...openParams } };
  let benchValue = {
    kind: "bench", draftId: "bench-p", rev: 1, log: [],
    stages: [{ ...fakeRow, params: { ...openParams } }],
  } as unknown as CardsBenchValue;
  stubDoors({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [fakeRow] },
    draftStages: [fakeRow as unknown as Record<string, unknown>],
    draftBenchRev: 1,
    refusals: [{ method: "runs/start", message: "no engine today" }],
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
  return {
    // the other hand's estate write landing after open (the studio's
    // own patch + the tab's re-emit, staged as one move)
    growHeld(nextParams: Record<string, unknown>, rev: number) {
      fakeRow.params = { ...nextParams };
      benchValue = {
        kind: "bench", draftId: "bench-p", rev, log: [],
        stages: [{ ...fakeRow, params: { ...nextParams } }],
      } as unknown as CardsBenchValue;
      view.rerender(h(CardsTab, props));
    },
  };
}

describe("the run verb's flush — post-open growth by other hands survives", () => {
  test("rev-138 shape: studio-saved calls survive the Run press (no calls:null)", async () => {
    const live = mountLive({ prompt: "p", model: "image-gen" });
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const user = userEvent.setup();
    const area = document.querySelector("textarea");
    if (area === null) throw new Error("prompt field not found");
    await user.type(area, "!!!");
    // THE STUDIO'S OWN SAVE, after open: the typed prompt plus the
    // studio document's calls land on the estate; the tab re-emits.
    live.growHeld(
      { prompt: "p!!!", model: "image-gen", calls: [{ text: "operator text", start_frame: 0, end_frame: 90 }] },
      2,
    );
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    // the flush never deletes what the drill never owned …
    await waitFor(() => {
      expect(posted.some((p) => p.method === "drafts/patch")).toBe(true);
    });
    await new Promise((r) => setTimeout(r, 250));
    for (const p of posted) {
      expect(JSON.stringify(p.args)).not.toContain('"calls":null');
    }
    // … the authored prompt still rides …
    expect(posted.some((p) => JSON.stringify(p.args).includes('"prompt":"p!!!"'))).toBe(true);
    // … and the start still fired after the flush
    await waitFor(() => {
      expect(posted.some((p) => p.method === "runs/start")).toBe(true);
    });
  });

  test("rev-151 shape: wire-saved input_images survive the Run press (no input_images:null)", async () => {
    const live = mountLive({ prompt: "p", model: "image-gen" });
    await openFirstTile();
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    // THE WIRE MENU'S SAVE, after open: picking the upstream writes
    // input_images through the estate door, never through the drill.
    live.growHeld(
      { prompt: "p", model: "image-gen", input_images: ["http://upstream/frame.png"] },
      2,
    );
    fireEvent.click(within(zoomCard()).getByRole("button", { name: "Run stage" }));
    await waitFor(() => {
      expect(posted.some((p) => p.method === "drafts/patch")).toBe(true);
    });
    await new Promise((r) => setTimeout(r, 250));
    for (const p of posted) {
      expect(JSON.stringify(p.args)).not.toContain('"input_images":null');
    }
    await waitFor(() => {
      expect(posted.some((p) => p.method === "runs/start")).toBe(true);
    });
  });
});
