// @vitest-environment happy-dom
// error-dismiss-construct.spec.tsx — THE CONSTRUCT-CARD SHARE OF THE
// DISMISS LAW (audit 017 C4, row 15) + the stage-view miss face: the
// keyed toolview's refusal lines and the drill's studio load refusal
// carry the red × on the same grammar the drilldown faces pin (the
// catalog Button ghost sm + the close glyph, INSIDE the error's own
// element, aria "Dismiss error"). Two laws per face: (1) the press
// retires the LINE; (2) a changed block/stage re-voices — the
// silence never eats a fresh refusal. THE MISS FACE'S RETIREMENT IS
// TO EMPTY, never to the generic form: the fallback is suppressed on
// purpose (the fallback extermination) and a dismissed × must not
// re-open the hole its cure closed.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";

import { ConstructCard, parseConstructBlock } from "../src/client/construct-card.tsx";
import { chromeCopy } from "../src/chromeCopy.ts";
import type { ToolCallBlockView } from "../src/client/types.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** A settled, failed construct call block: the persisted shape the
 *  projector hands the keyed toolview (meta carries the bench key). */
function failedBlock(text: string, callId = "c1"): ToolCallBlockView {
  return {
    callId,
    kind: "tool-result",
    isError: true,
    argsRaw: JSON.stringify({ verb: "add_stage", card: "image-gen" }),
    call: { name: "melite_construct", argsRaw: JSON.stringify({ verb: "add_stage", card: "image-gen" }) },
    meta: { bench: "bench-p" },
    content: [{ type: "text", text }],
  } as never as ToolCallBlockView;
}

/** A settled, CLEAN call whose args body is corrupt — the
 *  malformed-args face's own fixture (the failure line is the
 *  unparseable voice, not a result error). */
function malformedBlock(): ToolCallBlockView {
  return {
    callId: "c2",
    kind: "tool-result",
    isError: false,
    argsRaw: "{not json",
    call: { name: "melite_construct", argsRaw: "{not json" },
    meta: { bench: "bench-p" },
    content: [],
  } as never as ToolCallBlockView;
}

function errorLine(): HTMLElement {
  const lines = Array.from(document.querySelectorAll('span[data-state="error"]'))
    .filter((el) => (el.getAttribute("role") ?? "") === "alert");
  expect(lines.length, "the construct card renders exactly one refusal line").toBe(1);
  return lines[0]! as HTMLElement;
}

describe("the construct card's refusal line (audit 017 C4, row 15)", () => {
  test("PRESENCE + PLACEMENT: the refusal line carries the × INSIDE its own element", () => {
    render(h(ConstructCard, { block: failedBlock("card_compose: unknown quant"), openSurface: () => true }));
    const line = errorLine();
    expect(line.textContent).toContain("card_compose: unknown quant");
    const dismiss = within(line).getByRole("button", { name: "Dismiss error" });
    expect(line.contains(dismiss), "the × rides INSIDE the line's own element (the anchor law)").toBe(true);
  });

  test("the × retires the line; a CHANGED block re-voices", () => {
    const view = render(h(ConstructCard, { block: failedBlock("card_compose: unknown quant") }));
    fireEvent.click(within(errorLine()).getByRole("button", { name: "Dismiss error" }));
    expect(screen.queryByRole("alert")).toBeNull();
    // the same block stays retired across a re-render
    view.rerender(h(ConstructCard, { block: failedBlock("card_compose: unknown quant") }));
    expect(screen.queryByRole("alert")).toBeNull();
    // a fresh refusal (different words, new block) re-voices
    view.rerender(h(ConstructCard, { block: failedBlock("stage s_9 vanished") }));
    expect(errorLine().textContent).toContain("stage s_9 vanished");
    expect(within(errorLine()).getByRole("button", { name: "Dismiss error" })).toBeTruthy();
    // a FRESH CALL with identical words re-voices too — the dismissal
    // retires the (call, line) pair, never the words globally (a
    // retry's refusal is a new refusal)
    view.rerender(h(ConstructCard, { block: failedBlock("stage s_9 vanished", "c2") }));
    expect(errorLine().textContent).toContain("stage s_9 vanished");
  });

  test("the unparseable-args face carries the × and retires the same way", () => {
    const corrupted = malformedBlock();
    const parsed = parseConstructBlock(corrupted);
    expect(parsed.malformedArgs, "fixture check: the args are corrupt").toBe(true);
    expect(parsed.isError, "fixture check: the call itself is clean").toBe(false);
    render(h(ConstructCard, { block: corrupted }));
    const faces = Array.from(document.querySelectorAll('span[data-state="error"]'));
    expect(faces.length, "the malformed-args face renders").toBe(1);
    const line = faces[0]! as HTMLElement;
    expect(line.textContent).toContain(chromeCopy.argsUnparseable);
    const dismiss = within(line).getByRole("button", { name: "Dismiss error" });
    expect(line.contains(dismiss)).toBe(true);
    fireEvent.click(dismiss);
    expect(document.querySelectorAll('span[data-state="error"]').length).toBe(0);
  });
});

// ── THE STAGE-VIEW MISS FACE (the drill's studio load refusal) ────
// Mounted through StageDrill with a studio-declaring spec and a slot
// miss — the same mount law stage-view-refusal.spec.tsx pins.

import { StageDrill } from "../src/client/stage-drill.tsx";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { resetStageWrites } from "../src/client/draft.ts";
import { schemaEnvelope } from "@melite/card-base/client";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { draftIdOf } from "@melite/contracts/benchStage";

const STAGE = {
  id: "s_0", card: "input-prep", engine: "comfyui",
  params: { prompt: "x" }, runStatus: "",
} as never as BenchStageView;

const BENCH: CardsBenchValue = {
  kind: "bench", draftId: draftIdOf("bench-p"), sessionKey: "p", rev: 1, log: [], stages: [STAGE],
};

function stubStudioFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "input-prep",
        stage_view: "input-prep-studio",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

function mountMissDrill(): void {
  stubStudioFetch();
  mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [STAGE as unknown as Record<string, unknown>] },
    draftStages: [STAGE as unknown as Record<string, unknown>],
    draftBenchRev: 1,
  });
  render(h(StageDrill, {
    stage: STAGE,
    bench: BENCH,
    running: false,
    onRun: () => {},
    onStop: () => {},
    onClose: () => {},
    onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: (_owner, fallback) => fallback,
  }));
}

function missFace(): HTMLElement {
  const el = document.querySelector('[data-testid="stage-view-load-refusal"]');
  expect(el, "the studio load refusal renders as the miss face").toBeTruthy();
  return el! as HTMLElement;
}

describe("the stage-view load refusal (the drill's miss face)", () => {
  test("PRESENCE + PLACEMENT: the refusal carries the × INSIDE its own element", async () => {
    mountMissDrill();
    await waitFor(() => expect(missFace()).toBeTruthy());
    const face = missFace();
    const dismiss = within(face).getByRole("button", { name: "Dismiss error" });
    expect(face.contains(dismiss)).toBe(true);
  });

  test("the × retires the refusal TO EMPTY — never to the suppressed generic form", async () => {
    mountMissDrill();
    await waitFor(() => expect(missFace()).toBeTruthy());
    fireEvent.click(within(missFace()).getByRole("button", { name: "Dismiss error" }));
    expect(document.querySelector('[data-testid="stage-view-load-refusal"]')).toBeNull();
    // the retirement is not the fallback's return: the studio-declared
    // lane renders no prompt-edition form after the × (the fallback
    // extermination holds under the dismissal)
    expect(screen.queryByLabelText("Prompt")).toBeNull();
  });
});
