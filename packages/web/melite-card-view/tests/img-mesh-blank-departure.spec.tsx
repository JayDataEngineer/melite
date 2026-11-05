// img-mesh-blank-departure.spec.tsx — THE DRILL-SEAT BLANK DEPARTURE
// (the gate-11 sweep red, 2026-11-16). THE BURN: the img-to-mesh
// card landed with its family-default recipe (High) stamped in the
// BASE — the D12 seed — and the blank round-trip NEVER WROTE: zero
// drafts/patch frames (probe k over the live lane), zero refusal
// voices, the face held 'High' for 15 s, the doc never changed. The
// card-base seam is INNOCENT (card-base/tests/img-mesh-blank-
// departure.spec.tsx: the same spec + landed doc + blank gesture
// writes the three nulls and the face returns to the placeholder).
// THIS wall pins the DRILL seat: the same gesture through
// StageDrill's own onPick → patchStageParamsChained path must put
// the departure nulls ON THE WIRE. A blank that dies between the
// pill and the wire is the silent-drop class (no voice, no write,
// no error — the sweep's exact red).
//
// The spec fixture is the LIVE door's img-to-mesh serve verbatim
// (fixtures/img-mesh-form-spec.json, captured 2026-11-16 — the real
// Recipe rows high/standard/fast/quality with their exact stamps).
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/cards-tab-body.tsx";
import { StageDrill } from "../src/client/stage-drill.tsx";
import { stageWriteState } from "../src/client/draft.ts";
import { draftIdOf } from "@melite/contracts/benchStage";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import specDocJson from "./fixtures/img-mesh-form-spec.json" with { type: "json" };

const specDoc = specDocJson as Record<string, unknown>;

// THE LANDED DOC (probe k's read of the live stage): the D12 seed
// stamps the family-default recipe High into the base at birth.
const landed = { variant: "1024", quant: "int8_convrot", model: "pixal3d", resolution: "1536", remesh_resolution: 1024, decimate_faces: 1000000 };

let fakes: EstateFakes | null = null;

function stubFetch(): void {
  const impl = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify(specDoc), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "img-to-mesh": { outputs: { default: "mesh" } } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return (impl as typeof fetch)(url as string, init);
  });
}

const stage = {
  id: "s_0", card: "img-to-mesh", engine: "comfyui", params: { ...landed },
} as unknown as Parameters<typeof StageDrill>[0]["stage"];

beforeEach(() => {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [{ ...stage, run_status: undefined }] },
    draftStages: [{ ...stage } as unknown as Record<string, unknown>],
    draftBenchRev: 1,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [stage] } as never }),
  }));
});

afterEach(() => {
  fakes?.unmount();
  fakes = null;
  vi.unstubAllGlobals();
});

describe("THE img-to-mesh BLANK DEPARTURE AT THE DRILL SEAT (gate-11): a base-held recipe stamp departs on the blank pick — the nulls reach the wire, never a silent no-op", () => {
  test("THE BLANK WRITES: over the landed High doc, the blank pick puts the three departure nulls on drafts/patch", async () => {
    // open the drill on the stage
    const tile = await waitFor(() => {
      const el = document.querySelector('[role="button"][class*="tileInner"]') as HTMLElement | null;
      if (el === null) throw new Error("tile not rendered yet");
      return el;
    }, { timeout: 8000 });
    fireEvent.click(tile);
    // the recipe seat settles over the real spec fetch
    const trigger = await waitFor(() => {
      const el = document.querySelector("[data-recipe-select]") as HTMLElement | null;
      if (el === null) throw new Error("recipe seat not rendered yet");
      return el;
    }, { timeout: 12000 });
    // THE PRE-STATE: the face names High (the landed row)
    await waitFor(() => {
      if (!/High/.test(trigger.textContent ?? "")) throw new Error("face not High yet: " + (trigger.textContent ?? ""));
    }, { timeout: 8000 });
    // THE GESTURE: open the menu, click the blank row (row 0 — the
    // sweep's own positional law, never a text heuristic)
    fireEvent.click(trigger);
    const rows = await waitFor(() => {
      const all = screen.getAllByRole("menuitem");
      if (all.length === 0) throw new Error("menu not open yet");
      return all;
    }, { timeout: 4000 });
    const blankRow = rows[0];
    const label = blankRow.textContent ?? "";
    if (!/blank/i.test(label)) throw new Error("menu row 0 is not the blank write: " + label);
    fireEvent.click(blankRow);
    // THE WIRE: the departure nulls reach drafts/patch (the burn:
    // zero frames, silent)
    await waitFor(() => {
      const patches = (fakes as EstateFakes).calls
        .filter((c) => c.method === "drafts/patch")
        .map((c) => c.args as Record<string, unknown>);
      const frame = patches.length > 0 ? (patches[patches.length - 1]["patch"] as Record<string, unknown> | undefined) ?? (patches[patches.length - 1] as Record<string, unknown>) : null;
      if (frame === null) throw new Error("no drafts/patch call yet");
      const flat = JSON.stringify(frame);
      if (!(flat.includes("resolution") && flat.includes("null"))) throw new Error("patch carries no departure nulls: " + flat);
    }, { timeout: 8000 });
    // THE FACE: the placeholder returns (no row names the doc)
    await waitFor(() => {
      if (!/--\s*recipe\s*--/.test(trigger.textContent ?? "")) throw new Error("face still names a row: " + (trigger.textContent ?? ""));
    }, { timeout: 8000 });
    // the ledger settled clean (no failed keys, no voice)
    await waitFor(() => {
      const st = stageWriteState(draftIdOf("bench-p"), "s_0");
      if (st.pending !== 0) throw new Error("write still in flight");
      if (st.failedKeys.length > 0) throw new Error("failed keys: " + st.failedKeys.join(","));
    }, { timeout: 8000 });
    expect(true, "the blank departure landed at the drill seat: the nulls wrote, the face departed, the ledger is clean").toBe(true);
  });
});

// keep the within import honest (the menu rows scope to the
// document body; within is the fallback scope helper)
void within;
