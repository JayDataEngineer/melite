// @contract cards-filmseam-observe-seat
// @vitest-environment happy-dom
// filmseam-seat.spec.tsx — the seam's SEAT laws (handroll 1.6, the
// second half, cured 2026-11-12): (1) the lazy creation form — the
// seam is created exactly once per StageDrill MOUNT, never a
// throwaway factory call per render (the useRef(createFilmSeam())
// revert the 2026-10-12 verification found: the comment claimed
// "created once" while the tree allocated a listener Set per
// render); (2) the store adoption — observation is the engine's
// (dsh-client-store per instance), never a hand-rolled listener Set.
// The seam's behavioral laws (report/subscribe, the listener fault,
// the straddle) live at filmSeam.spec.tsx; this file pins the FORM.
import { cleanup, render, waitFor } from "@testing-library/react";
import assert from "node:assert/strict";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/client";
import { StageDrill } from "../src/client/stage-drill.tsx";
import { resetStageWrites } from "../src/client/draft.ts";
import { schemaEnvelope } from "@melite/card-base/client";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

// count the FACTORY, never mock it: the real seam (now the engine's)
// rides under the counter — the arm judges how many times StageDrill
// asked for a seam, not what the seam is. `created` is read at CALL
// time only, never at hoisted-factory time.
let created = 0;
vi.mock("../src/client/filmSeam.tsx", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/client/filmSeam.tsx")>();
  return {
    ...real,
    createFilmSeam: (fps?: number) => { created += 1; return real.createFilmSeam(fps) },
  };
});
const seamCount = (): number => created;

const STAGE = {
  id: "s_0", card: "image-gen", engine: "comfyui",
  params: { prompt: "x" }, runStatus: "",
} as never as BenchStageView;

const BENCH: CardsBenchValue = {
  kind: "bench", draftId: "bench-fs", sessionKey: "f", rev: 1, log: [], stages: [STAGE],
};

function stubEstate(): void {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const path = String(input);
    if (path.includes("/v1/forms/spec") || path.includes("/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: schemaEnvelope({
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms") || path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
  }));
  mountEstateFakes({
    benchDoc: { draft_id: "bench-fs", rev: 1, log: [], stages: [STAGE] },
    draftStages: [STAGE as unknown as Record<string, unknown>],
    draftBenchRev: 1,
  });
}

const drillProps = (running: boolean) => ({
  stage: STAGE,
  bench: BENCH,
  running,
  onRun: (): void => {},
  onStop: (): void => {},
  onClose: (): void => {},
  onRemoved: (): void => {},
  onPatchParams: (): void => {},
  renderStageView: (_owner: unknown, fallback: unknown) => h("div", null, fallback),
  bindRun: (): void => {},
});

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
  resetStageWrites();
});

describe("the lazy seam seat (handroll 1.6's unpinned half)", () => {
  test("THE CREATION FORM: one seam per StageDrill MOUNT across re-renders — a factory call per render is the revert this arm reds on", async () => {
    created = 0;
    stubEstate();
    const view = render(h(StageDrill, drillProps(false)));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toContain("Prompt");
    });
    const afterMount = seamCount();
    assert.equal(afterMount, 1, "exactly one seam per mount");
    // re-render the drill (running flips — a prop every drill consumer
    // re-renders on); the lazy initializer must NOT run again
    view.rerender(h(StageDrill, drillProps(true)));
    view.rerender(h(StageDrill, drillProps(false)));
    view.rerender(h(StageDrill, drillProps(true)));
    assert.equal(seamCount(), 1, "re-renders never re-create the seam (the useRef(createFilmSeam()) revert would sit at 4+)");
    view.unmount();
  });

  test("THE PER-MOUNT LIFETIME: two mounts create two seams — the bridge is never shared across drills (the module-level store is the wrong lifetime)", async () => {
    created = 0;
    stubEstate();
    const first = render(h(StageDrill, drillProps(false)));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toContain("Prompt");
    });
    const second = render(h(StageDrill, drillProps(false)));
    await waitFor(() => {
      expect(document.body.textContent ?? "").toContain("Prompt");
    });
    assert.equal(seamCount(), 2, "each mount owns its own seam");
    first.unmount();
    second.unmount();
  });
});

describe("the store adoption (the raw Set is gone)", () => {
  test("observation rides dsh-client-store per instance — the module carries no hand-rolled listener Set (source oracle, the E-M9 law)", () => {
    const src = readFileSync(resolve(import.meta.dirname, "../src/client/filmSeam.tsx"), "utf8");
    assert.ok(src.includes("createSnapshotStore"), "the seam builds on the engine");
    assert.ok(!/new Set<\(\) => void>/.test(src), "no hand-rolled listener Set survives");
    assert.ok(src.includes("LISTENER FAULT LAW is the engine's own"), "the fault law's ownership is recorded at the seat");
  });
});
