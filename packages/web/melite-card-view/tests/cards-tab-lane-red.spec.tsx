// cards-tab-lane-red.spec.tsx — THE DOUBLE-RED LAW (2026-10-11,
// the operator's paste: the image-edit 2.1 stage showed its two
// requirement refusals — "this lane requires 'prompt'" + "requires
// one of 'input_images'" — TWICE). One law, one seat: the form's
// lane-warn strip is the only place the lane's relations voice on
// the stage face, and each declared law renders exactly once in it.
//
// THE FRESH-OPEN AMENDMENT (2026-10-18, the operator's law: a
// fresh card opens with no red face): the UNSTATED-required class
// never renders in the strip — a required word the operator has
// not typed YET is the blank canvas, not a complaint; its voice is
// the run door's local claim at the Run press. Only STATED-wrong
// laws (a stated field whose required partner is missing) warn at
// the form — those are actionable at open. This pin mounts the
// REAL drill against the REAL served shape (the doc discovery
// serves: schema envelope + the family's lanes row carrying the
// DECL's relations VERBATIM) and holds both contracts.
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/cards-tab-body.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { resetStageWrites } from "../src/client/draft.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { schemaEnvelope } from '@melite/card-base/client';

// the served shape (discovery's doc): the family's lanes row
// carrying the DECL's relations block VERBATIM — two STATED-wrong
// laws (a stated field whose required partner is missing) beside
// the 2.1 required/any_of rows
const servedDoc = {
  form: "image-edit", genre: "image", engine: "comfyui",
  schema: schemaEnvelope({
    prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea", group: "Recipe" } } },
    input_images: { type: "array", meta: { description: "Input Images", extra: { wtype: "image_list", max_stack: 16, group: "input", zone: "inputs" } } },
    style_ref: { type: "string", meta: { description: "Style Ref", extra: { wtype: "text" } } },
  }),
  lanes: {
    base: ["prompt"],
    relations: {
      required: [
        { fields: ["prompt"], cure: "an edit states WHAT to change — write the prompt" },
        { fields: ["input_images", "image1", "image2", "image3", "reference_images"], any_of: true, cure: "an edit needs the image being edited" },
      ],
      requires: [
        { field: "input_images", needs: ["style_ref"], cure: "an edit over a style names the style" },
        { field: "prompt", needs: ["style_ref"], cure: "a styled edit names the style in the prompt row" },
      ],
    },
    variants: {},
  },
};

function mountBench(params: Record<string, unknown>): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify(servedDoc), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-edit": { outputs: { default: "image" } } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path === "/melite-tools/enhance") {
      return new Response(JSON.stringify({ results: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
  mountEstateFakes({
    benchDoc: {
      draft_id: "bench-p", rev: 1, log: [],
      stages: [{ id: "s_1", card: "image-edit", title: "Edit", run_status: "pending", params }],
    },
    draftStages: [{ id: "s_1", card: "image-edit", params }],
    draftBenchRev: 1,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [{ id: "s_1", card: "image-edit", title: "Edit", runStatus: "pending", params }] as unknown as BenchStageView[] } as never }),
  }));
}

async function openDrill(): Promise<void> {
  const el = document.querySelector('[role="button"][class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
  await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
}

afterEach(() => {
  cleanup();
  resetStageWrites();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

describe("the lane red: one law, one seat, one line (the double-red law)", () => {
  test("a FRESH promptless card renders NO strip — the unstated class is the blank canvas", async () => {
    mountBench({});
    await openDrill();
    await screen.findByTestId("stage-write-face", {}, { timeout: 4000 }).catch(() => null);
    await new Promise((r) => setTimeout(r, 500));
    // the blank draft is not a complaint: neither required row nor
    // the any_of row renders — their voice is the Run press's claim
    expect(document.querySelectorAll("[data-lane-warn]").length).toBe(0);
    expect(document.body.textContent ?? "").not.toContain("this lane requires");
  });

  test("stated-wrong laws render ONCE each — never duplicated", async () => {
    mountBench({ prompt: "make it warmer", input_images: ["/a.png"] });
    await openDrill();
    // the warn strip lands on its own fetch tick — poll it with the
    // RTL waiter, not a hand-rolled 40×100ms loop (same ceiling).
    await waitFor(() => { expect(document.querySelectorAll("[data-lane-warn]").length).toBe(1); }, { timeout: 4000 });
    // ONE strip (the form's lane-warn seat is the only seat)
    const strips = document.querySelectorAll("[data-lane-warn]");
    expect(strips.length).toBe(1);
    // each declared law voices exactly once in it
    const text = strips[0]!.textContent ?? "";
    expect((text.match(/field 'input_images' requires 'style_ref'/g) ?? []).length).toBe(1);
    expect((text.match(/field 'prompt' requires 'style_ref'/g) ?? []).length).toBe(1);
  });
});
