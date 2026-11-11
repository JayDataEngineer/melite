// @vitest-environment happy-dom
// stage-drill-rename.spec.tsx — THE OUTPUT-RENAME VERB (queue 12
// Phase B): the outputs face's drilldown carries a Rename affordance
// over the estate's rename door. The gallery rows render LABEL-FIRST
// (the artifacts map keys carry the label), so the face shows the
// patched label after a landed rename and re-points only the renamed
// walk item — the siblings keep their own labels. A REFUSED rename
// renders the door's own words (the drilldown's op-error face) and
// the old label stands. Direct StageDrill mounts (the gate-r7b
// pattern); the estate rides the one harness fake.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote, schemaEnvelope } from '@melite/card-base/client';
import { StageDrill } from "../src/client/stage-drill.tsx";
import { resetStageWrites } from "../src/client/draft.ts";
import type { BenchStageView } from "../src/client/cards-resource.ts";
import type { StageViewOwnerProps } from '../src/client/types.ts';

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

let fakes: EstateFakes | null = null;

function stubFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
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
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

/** THE SETTLED GALLERY (Phase A's mint): the stage's result rides the
 *  artifacts map keyed LABEL-FIRST — the hero wears the stem bare,
 *  the sibling wears `stem · 2`; every url is the media-route
 *  spelling (the machine name rides inside it, never in the key). */
const goldStage = (): BenchStageView => ({
  id: "s_0", card: "image-gen", engine: "comfyui",
  params: { prompt: "x" },
  runStatus: "completed",
  result: {
    run_id: "run-gold",
    url: "/melite-media/runs/run-gold/film.mp4",
    artifacts: {
      "golden hour": "/melite-media/runs/run-gold/film.mp4",
      "golden hour · 2": "/melite-media/runs/run-gold/w1.mp4",
    },
  },
});

const runRow = (): Record<string, unknown> => ({
  run_id: "run-gold",
  status: "completed",
  stages: [{
    id: "s", status: "completed",
    url: "/melite-media/runs/run-gold/film.mp4",
    gallery: [
      { name: "film.mp4", label: "golden hour" },
      { name: "w1.mp4", label: "golden hour · 2" },
    ],
  }],
});

function mountDrill(opts: { refusals?: Array<{ method: string; message: string; code?: string }> } = {}): EstateFakes {
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    runDocs: [runRow()],
    ...(opts.refusals !== undefined ? { refusals: opts.refusals } : {}),
  });
  render(h(StageDrill, {
    stage: goldStage(),
    bench: {
      kind: "bench", draftId: "bench-p", rev: 1, log: [],
      stages: [goldStage()], sessionKey: "main",
    } as never,
    running: false,
    onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: (_o: StageViewOwnerProps, fallback: ReturnType<typeof h>): ReturnType<typeof h> => fallback,
  }));
  return fakes;
}

async function openDrilldown(): Promise<void> {
  const user = userEvent.setup();
  await user.click(await screen.findByTestId("stage-preview-seat", {}, { timeout: 4000 }));
  await screen.findByTestId("drill-rename", {}, { timeout: 4000 });
}

async function renameTo(label: string): Promise<void> {
  const user = userEvent.setup();
  await user.click(screen.getByTestId("drill-rename"));
  const input = await screen.findByTestId("drill-rename-input", {}, { timeout: 4000 });
  // THE LABEL-FIRST PRE-FILL: the input opens on the row's current
  // display label — the map key the face renders, never the file name
  expect((input as HTMLInputElement).value).toBe("golden hour");
  await user.clear(input);
  await user.type(input, label);
  await user.click(screen.getByTestId("drill-rename-save"));
}

describe("THE OUTPUT-RENAME VERB (queue 12 Phase B — the outputs face)", () => {
  test("a landed rename re-points the face with the patched label; the sibling keeps its own", async () => {
    const f = mountDrill();
    await openDrilldown();
    await renameTo("second take");
    // THE DOOR'S RECEIPT: the verb resolved the address off the run
    // row's gallery (stage 0, gallery 0 — the hero) and patched the
    // label through runs/rename-output
    const rename = f.calls.find((c) => c.method === "runs/rename-output");
    expect(rename).toBeTruthy();
    expect(rename?.args).toMatchObject({ runId: "run-gold", stageIndex: 0, galleryIndex: 0, label: "second take" });
    // THE RE-RENDER: the renamed row wears the new label in the
    // caption; the drilldown title (the modal head) follows the item
    await screen.findByText("second take", {}, { timeout: 4000 });
    // THE SIBLING STANDS: walk to the other item — it still wears its
    // own minted label; one row addressed, one row moved
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByText("golden hour · 2", {}, { timeout: 4000 });
  });

  test("a refused rename renders the door's own words and the old label stands", async () => {
    mountDrill({
      refusals: [{
        method: "runs/rename-output",
        code: "runs/invalid-request",
        message: 'run "run-gold" still executing — rename waits for settle',
      }],
    });
    await openDrilldown();
    await renameTo("second take");
    // THE DOOR'S VOICE, VERBATIM — the op-error face carries the
    // refusal's own words, never a paraphrase, never a silent no-op
    const voice = await screen.findByTestId("drill-op-error", {}, { timeout: 4000 });
    expect(voice.textContent).toBe('run "run-gold" still executing — rename waits for settle');
    // THE OLD LABEL STANDS: the item keeps the pre-refusal display
    // name (the drilldown title) — a refused write re-points nothing
    expect(screen.getByText("golden hour")).toBeTruthy();
    expect(screen.queryByText("second take")).toBeNull();
  });

  test("an artifact the run row cannot address voices the miss (never a silent click)", async () => {
    // THE RUN ROW MOVED UNDER THE FACE: the served gallery no longer
    // carries the walk item's machine name, so the resolver finds no
    // address — the verb refuses with its own voice (chromeCopy's
    // renameAddressMiss) instead of firing a door call it cannot
    // address.
    stubFetch();
    fakes?.unmount();
    fakes = mountEstateFakes({
      runDocs: [{
        run_id: "run-gold",
        status: "completed",
        stages: [{
          id: "s", status: "completed",
          url: "/melite-media/runs/run-gold/film.mp4",
          gallery: [{ name: "film.mp4", label: "golden hour" }],
        }],
      }],
    });
    render(h(StageDrill, {
      stage: goldStage(),
      bench: {
        kind: "bench", draftId: "bench-p", rev: 1, log: [],
        stages: [goldStage()], sessionKey: "main",
      } as never,
      running: false,
      onRun: () => {}, onStop: () => {}, onClose: () => {}, onRemoved: () => {},
      onPatchParams: () => {},
      renderStageView: (_o: StageViewOwnerProps, fallback: ReturnType<typeof h>): ReturnType<typeof h> => fallback,
    }));
    await openDrilldown();
    // walk to the sibling — the item whose name the served row lacks
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByText("golden hour · 2", {}, { timeout: 4000 });
    const user = userEvent.setup();
    await user.click(screen.getByTestId("drill-rename"));
    const input = await screen.findByTestId("drill-rename-input", {}, { timeout: 4000 });
    await user.clear(input);
    await user.type(input, "window two");
    await user.click(screen.getByTestId("drill-rename-save"));
    expect(fakes?.calls.find((c) => c.method === "runs/rename-output")).toBeUndefined();
    const voice = await screen.findByTestId("drill-op-error", {}, { timeout: 4000 });
    expect(voice.textContent).toBe('rename skipped — no gallery row on the run carries "w1.mp4"');
    expect(screen.getByText("golden hour · 2")).toBeTruthy();
  });

  test("the walk sibling renames through its own address — the resolver reads the item's url, not the hero's", async () => {
    const f = mountDrill();
    await openDrilldown();
    // walk to the sibling (ArrowRight — the drilldown's own line law)
    fireEvent.keyDown(window, { key: "ArrowRight" });
    await screen.findByText("golden hour · 2", {}, { timeout: 4000 });
    const user = userEvent.setup();
    await user.click(screen.getByTestId("drill-rename"));
    const input = await screen.findByTestId("drill-rename-input", {}, { timeout: 4000 });
    expect((input as HTMLInputElement).value).toBe("golden hour · 2");
    await user.clear(input);
    await user.type(input, "window two");
    await user.click(screen.getByTestId("drill-rename-save"));
    const rename = f.calls.find((c) => c.method === "runs/rename-output");
    expect(rename?.args).toMatchObject({ runId: "run-gold", stageIndex: 0, galleryIndex: 1, label: "window two" });
    await screen.findByText("window two", {}, { timeout: 4000 });
  });
});
