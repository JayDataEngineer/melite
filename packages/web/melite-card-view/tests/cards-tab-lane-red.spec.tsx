// cards-tab-lane-red.spec.tsx — THE DOUBLE-RED LAW (2026-10-11,
// the operator's paste: the image-edit 2.1 stage showed its two
// requirement refusals — "this lane requires 'prompt'" + "requires
// one of 'input_images'" — TWICE). One law, one seat: the form's
// lane-warn strip is the only place the lane's relations voice on
// the stage face, and each declared law renders exactly once in
// it. This pin mounts the REAL drill against the REAL served shape
// (the doc discovery serves: schema envelope + the family's lanes
// row carrying the 2.1 DECL's relations VERBATIM) and holds both
// counts.
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/cards-tab-body.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { resetStageWrites } from "../src/client/draft.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { schemaEnvelope } from "../src/client/spec-form.tsx";

// the 2.1 served shape (discovery's doc): the family's lanes row
// carrying the DECL's relations block VERBATIM
const servedDoc = {
  form: "image-edit", genre: "image", engine: "comfyui",
  schema: schemaEnvelope({
    prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea", group: "Recipe" } } },
    input_images: { type: "array", meta: { description: "Input Images", extra: { wtype: "image_list", max_stack: 16, group: "input", zone: "inputs" } } },
  }),
  lanes: {
    base: ["prompt"],
    relations: {
      required: [
        { fields: ["prompt"], cure: "an edit states WHAT to change — write the prompt" },
        { fields: ["input_images", "image1", "image2", "image3", "reference_images"], any_of: true, cure: "an edit needs the image being edited" },
      ],
    },
    variants: {},
  },
};

function mountBench(): void {
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
      stages: [{ id: "s_1", card: "image-edit", title: "Edit", run_status: "idle" }],
    },
    draftStages: [{ id: "s_1", card: "image-edit", params: {} }],
    draftBenchRev: 1,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [{ id: "s_1", card: "image-edit", title: "Edit", runStatus: "idle" }] as unknown as BenchStageView[] } as never }),
  }));
}

afterEach(() => {
  cleanup();
  resetStageWrites();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

describe("the lane red: one law, one seat, one line (the double-red law)", () => {
  test("the 2.1 requirement refusals render ONCE each — never duplicated", async () => {
    mountBench();
    const el = document.querySelector('button[class*="tileInner"]');
    if (el === null) throw new Error("tile button not found");
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 });
    await screen.findByTestId("stage-write-face", {}, { timeout: 4000 }).catch(() => null)
    for (let i = 0; i < 40 && document.querySelectorAll("[data-lane-warn]").length === 0; i++) await new Promise((r) => setTimeout(r, 100))
    // ONE strip (the form's lane-warn seat is the only seat)
    const strips = document.querySelectorAll("[data-lane-warn]");
    expect(strips.length).toBe(1);
    // each declared law voices exactly once in it
    const text = strips[0]!.textContent ?? "";
    expect((text.match(/this lane requires 'prompt'/g) ?? []).length).toBe(1);
    expect((text.match(/this lane requires one of 'input_images'/g) ?? []).length).toBe(1);
  });
});
