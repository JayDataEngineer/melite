// @vitest-environment happy-dom
// journey-prompt-not-stated.spec.tsx — THE TYPED PROMPT REACHES THE
// JUDGED ROW (the image-edit burn, 2026-11-15: the operator filled the
// card's prompt and the press answered "the compose door … this lane
// requires 'prompt' — 'prompt' is not stated"). The gate-r7b arm pins
// the same contract on a synthetic one-field spec; THIS file rides the
// WELDED image-edit contract (tests/fixtures/image-edit-spec.json, the
// real /v1/form-spec projector's own output — see real-contract.spec.tsx
// and melite-tools/test/spec-fixture-weld.spec.ts) through the real
// drill: UI seat → typed write → press flush → the gate's judged doc →
// the runs/start body.
//
// The three hops are asserted as ONE journey because the burn lived in
// the seam between them: the field showed the text, the write landed,
// and the press still judged a doc without it. Each hop names its own
// seat so a regression reds at the hop that broke.
import { LOADED_WAIT } from "../../../../tests/helpers/loaded-wait.ts";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { resetStageWrites } from "../src/client/draft.ts";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import fixture from "./fixtures/image-edit-spec.json" with { type: "json" };

const STAGE: BenchStageView = {
  id: "s_0", card: "image-edit", engine: "comfyui", params: { model: "qwen-img-edit-21" },
} as BenchStageView;

let fakes: EstateFakes | null = null;

function calls(): EstateFakes["calls"] {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  fakes?.unmount();
  fakes = null;
  vi.unstubAllGlobals();
});

// THE SERVED DOC IS THE WELDED FIXTURE, byte for byte: the client's own
// boundary judgment (assertFormSpecDoc) seats it, so a fixture/declaration
// drift reds here too — the arm cannot ride a test copy of the contract.
function mountBench(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/melite-tools/catalog")) {
      return new Response(JSON.stringify({ routes: [] }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify(fixture), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-edit": { outputs: { default: "image" } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: { "image-edit": { families: ["qwen-img-edit-21"] } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [STAGE] },
    draftStages: [STAGE as unknown as Record<string, unknown>],
    draftBenchRev: 1,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value: {
      kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [STAGE],
    } as unknown as CardsBenchValue }),
  }));
}

function firstTile(): HTMLElement {
  const el = document.querySelector('[role="button"][class*="tileInner"]');
  if (el === null) throw new Error("tile button not found");
  return el as HTMLElement;
}

async function openDrill(): Promise<HTMLElement> {
  const user = userEvent.setup();
  await user.click(firstTile());
  return await screen.findByTestId("stage-preview-seat", {}, { timeout: LOADED_WAIT() });
}

function pressRun(): void {
  const play = screen.getByRole("button", { name: /play/i });
  fireEvent.click(play);
}

function stripText(): string {
  const strip = screen.queryByTestId("stage-error-strip");
  const face = screen.queryByTestId("stage-write-face");
  return (strip?.textContent ?? "") + "\n" + (face?.textContent ?? "");
}

describe("the typed prompt rides the drill to the judge (the real image-edit contract)", () => {
  test("an UNTYPED press reaches the run door, which refuses with the burn's own voice", { timeout: LOADED_WAIT() }, async () => {
    // THE BURN'S SEAT (audit hop 3): the touchless press carries an
    // empty patch, so the CLIENT gate never judges it — the press
    // starts the run and the DOOR composes the row that never heard
    // the prompt. The refusal is scripted verbatim from the operator's
    // burn ("this lane requires 'prompt' — 'prompt' is not stated");
    // the wall pins that the press's refusal is VOICED on the drill's
    // own strip, never swallowed, and no second start rides past it.
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/melite-tools/catalog")) {
        return new Response(JSON.stringify({ routes: [] }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      if (path.includes("/v1/form-spec")) {
        return new Response(JSON.stringify(fixture), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      if (path.includes("/v1/forms")) {
        return new Response(JSON.stringify({ "image-edit": { outputs: { default: "image" } } }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: { "image-edit": { families: ["qwen-img-edit-21"] } } }), {
          status: 200, headers: { "content-type": "application/json" },
        });
      }
      throw new Error("estate door on the fetch lane: " + path);
    });
    fakes = mountEstateFakes({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [STAGE] },
      draftStages: [STAGE as unknown as Record<string, unknown>],
      draftBenchRev: 1,
      refusals: [{
        method: "runs/start",
        message: "lane 'qwen-img-edit-21/turbo' refuses the state: this lane requires 'prompt' — 'prompt' is not stated",
      }],
    });
    render(h(CardsTab, {
      useTabInfo: () => ({ tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      } }),
      useResource: () => ({ status: "live" as const, value: {
        kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [STAGE],
      } as unknown as CardsBenchValue }),
    }));
    await openDrill();
    pressRun();
    await waitFor(() => {
      const starts = calls().filter((c) => c.method === "runs/start");
      if (starts.length === 0) throw new Error("the press never reached the run door");
      if (starts.length > 1) throw new Error("a refused start rode past the refusal (" + starts.length + " starts)");
      // THE VOICE'S SEAT (cards-tab-run's law): the refused start
      // lands on the zoom's status seat and/or the tab's strip —
      // multiple seats may carry it, at least one MUST.
      if ((document.body.textContent ?? "").includes("'prompt' is not stated") === false) {
        throw new Error("the door's refusal is voiced nowhere; body lacks the burn's words");
      }
    }, { timeout: LOADED_WAIT() * 2 / 15 });
  });

  test("the TYPED prompt reaches the run body and the judge never says it is unstated", { timeout: LOADED_WAIT() }, async () => {
    mountBench();
    await openDrill();
    // THE UI SEAT: the real contract's prompt is a declared textarea,
    // required by the welded envelope — the label is the declaration's
    // own description, never a test's word.
    // the welded contract carries TWO Prompt-labeled seats (the
    // section header and the textarea) — the typing arm takes the
    // textarea, the declaration's own input face.
    const seats = await screen.findAllByLabelText("Prompt", {}, { timeout: LOADED_WAIT() * 2 / 15 });
    const field = seats.find((el) => el.tagName === "TEXTAREA") ?? seats[0]!;
    fireEvent.change(field, { target: { value: "a red cloak on the dunes" } });
    // THE WRITE HOP: the typed value rides the bench row (the fidelity
    // the burn's first hop already had — asserted so a regression names
    // the hop it broke).
    await waitFor(() => {
      const landed = calls().some((c) => {
        if (c.method !== "drafts/patch") return false;
        return JSON.stringify(c.args).includes("a red cloak on the dunes");
      });
      if (!landed) throw new Error("the typed prompt never rode a drafts/patch; calls: " + JSON.stringify(calls().map((c) => c.method)));
    }, { timeout: LOADED_WAIT() });
    pressRun();
    // THE RUN HOP: the press's gate judged a doc that HEARD the prompt —
    // the refusal voice the operator burned on cannot appear, and the
    // body the engine receives carries the text verbatim.
    await waitFor(() => {
      const starts = calls().filter((c) => c.method === "runs/start");
      if (starts.length === 0) throw new Error("the press never started a run; strip: " + JSON.stringify(stripText()));
      const doc = starts[starts.length - 1]!.args["doc"] as Record<string, unknown>;
      if (!JSON.stringify(doc).includes("a red cloak on the dunes")) {
        throw new Error("the run body lost the typed prompt: " + JSON.stringify(doc));
      }
    }, { timeout: LOADED_WAIT() });
    expect(stripText(), "the judge never calls the typed prompt unstated").not.toContain("'prompt' is not stated");
    expect(stripText(), "and the write face is silent").toBe("\n");
  });
});
