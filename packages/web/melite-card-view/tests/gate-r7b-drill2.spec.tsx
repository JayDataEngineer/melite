// @vitest-environment happy-dom
// gate-r7b-drill2.spec.tsx — StageDrill's preview-seam arms (the R7B
// burn-down): the unclaimed preview seat, the live-figure owner
// spreads, and the timeline seam's film faces. Direct StageDrill
// mounts (the consult arms are the drill's own — no tab needed),
// fetch answering ONLY the /v1 discovery doors.
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { StageDrill } from "../src/client/stage-drill.tsx";
import { patchStageParams, resetStageWrites, stageWriteState } from "../src/client/draft.ts";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView } from "../src/client/cards-resource.ts";
import { draftIdOf } from '@melite/contracts/benchStage';

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

type SpecMode = "plain" | "figure" | "timeline";

const doors: { spec: SpecMode } = { spec: "plain" };

let fakes: EstateFakes | null = null;

function stubFetch(): void {
  doors.spec = "plain";
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      const fields: Parameters<typeof schemaEnvelope>[0] = {
        prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
      };
      let preview: Record<string, unknown> | undefined;
      if (doors.spec === "figure") {
        fields["d0"] = { type: "number", meta: { description: "D0", extra: { group: "identity", order: 0 } } };
        fields["m0"] = { type: "number", meta: { description: "M0", extra: { group: "morph" } } };
        preview = { figure: { identityModel: "anny" } };
      }
      if (doors.spec === "timeline") {
        preview = { timeline: true };
      }
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        ...(preview !== undefined ? { preview } : {}),
        schema: schemaEnvelope(fields),
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

interface PreviewOwner {
  kind: string;
  artifacts: Array<{ name: string; url: string }>;
  figure?: Record<string, unknown>;
}

interface StageViewOwner {
  hasUnsettledWrites?: () => boolean;
  [k: string]: unknown;
}

function mountDrill(opts: {
  stage: BenchStageView;
  running?: boolean;
  spec?: SpecMode;
  renderPreview?: (owner: PreviewOwner, fallback: unknown) => unknown;
  renderStageView?: (owner: StageViewOwner, fallback: unknown) => unknown;
  estate?: Parameters<typeof mountEstateFakes>[0];
}): PreviewOwner[] {
  stubFetch();
  if (opts.spec !== undefined) doors.spec = opts.spec;
  fakes?.unmount();
  fakes = mountEstateFakes(opts.estate ?? {});
  const owners: PreviewOwner[] = [];
  render(h(StageDrill, {
    stage: opts.stage,
    bench: {
      kind: "bench", draftId: "bench-p", rev: 1, log: [],
      stages: [opts.stage], sessionKey: "main",
    } as never,
    running: opts.running ?? false,
    onRun: () => {},
    onStop: () => {},
    onClose: () => {},
    onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: ((owner: StageViewOwner, fallback: unknown) => {
      if (opts.renderStageView !== undefined) return opts.renderStageView(owner, fallback);
      return fallback;
    }) as never,
    ...(opts.renderPreview !== undefined ? {
      renderPreview: ((owner: unknown, fallback: unknown) => {
        owners.push(owner as PreviewOwner);
        return opts.renderPreview?.(owner as PreviewOwner, fallback);
      }) as never,
    } : {}),
  }));
  return owners;
}

function imageStage(params: Record<string, unknown>, result?: { url: string }): BenchStageView {
  return {
    id: "s_0", card: "image-gen", engine: "comfyui", params,
    ...(result !== undefined ? { result } : {}),
  };
}

describe("the unclaimed preview seat — no host claim, the hint shows", () => {
  test("a resultless drill seats the landing hint (never a blank column)", async () => {
    mountDrill({ stage: imageStage({}) });
    expect(await screen.findByText("run lands the preview here", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a running resultless drill seats the rendering hint (never a stale promise)", async () => {
    mountDrill({ stage: { ...imageStage({}), runStatus: "running" }, running: true });
    expect(await screen.findByText("rendering… the preview lands here", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the live figure — the served claim reshapes with the params", () => {
  test("numeric identity/morph params ride the owner (the sculpt follows the drag)", async () => {
    const owners = mountDrill({
      stage: imageStage({ prompt: "x", d0: 0.5, m0: 0.3 }, { url: "/i.png" }),
      spec: "figure",
      renderPreview: (_owner, fallback) => fallback,
    });
    // the spec mode lands before the assertion (the fetch is async);
    // re-assert once the form loads — the owner carries the claim
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    expect(owners.length).toBeGreaterThan(0);
    const figure = owners[owners.length - 1].figure;
    expect(figure).toMatchObject({ identityModel: "anny" });
    expect(figure?.["identityCoeffs"]).toEqual([0.5]);
    expect(figure?.["localChanges"]).toEqual({ m0: 0.3 });
  });

  test("an unshaped params layer omits the vectors (never a null claim)", async () => {
    const owners = mountDrill({
      stage: imageStage({ prompt: "x" }, { url: "/i.png" }),
      spec: "figure",
      renderPreview: (_owner, fallback) => fallback,
    });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    expect(owners.length).toBeGreaterThan(0);
    const figure = owners[owners.length - 1].figure;
    expect(figure).toMatchObject({ identityModel: "anny" });
    expect("identityCoeffs" in (figure ?? {})).toBe(false);
    expect("localChanges" in (figure ?? {})).toBe(false);
  });
});

describe("the timeline seam — a claimed timeline films the video", () => {
  test("a landed video under a timeline claim rides the film faces", async () => {
    const owners = mountDrill({
      stage: imageStage({ prompt: "x" }, { url: "/v.mp4" }),
      spec: "timeline",
      renderPreview: (_owner, fallback) => fallback,
    });
    // the bottom bar scrubs the seam (the plain video face is retired)
    expect(await screen.findByTestId("timeline-seam-bottom", {}, { timeout: 4000 })).toBeTruthy();
    expect(owners.length).toBeGreaterThan(0);
    expect(owners[owners.length - 1].kind).toBe("video");
  });

  test("a timeline claim with no landed video keeps the image face (never an empty seam)", async () => {
    const owners = mountDrill({
      stage: imageStage({ prompt: "x" }, { url: "/i.png" }),
      spec: "timeline",
      renderPreview: (_owner, fallback) => fallback,
    });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    expect(screen.queryByTestId("timeline-seam-bottom")).toBeNull();
    expect(owners.length).toBeGreaterThan(0);
    expect(owners[owners.length - 1].kind).toBe("image");
  });
});

describe("the unsettled-write probe — a live ledger read, never a frozen copy", () => {
  // the studio seat (h3's timeline owns the consumer) receives
  // owner.hasUnsettledWrites from the drill; a stale re-hydrate must
  // HOLD while any write is in flight or failed. The probe here is
  // the drill's own callback, judged against the REAL write ledger:
  // a parked door write, its refusal, and the key's later clean
  // landing flip it exactly as production's ledger does.
  test("the owner probe reads pending and failed writes from the ledger, then settles false", async () => {
    let release: (() => void) | undefined;
    let gateCalls = 0;
    const gate = (): Promise<void> => {
      gateCalls += 1;
      if (gateCalls === 1) {
        return new Promise<void>((resolve) => { release = resolve; }); // the failing write parks
      }
      return Promise.resolve(); // the clean write sails
    };
    let probe: (() => boolean) | null = null;
    mountDrill({
      stage: imageStage({}),
      estate: { patchGate: gate, patchFailures: [{ reason: "engine busy" }] },
      renderStageView: (owner, fallback) => {
        if (owner.hasUnsettledWrites !== undefined) probe = owner.hasUnsettledWrites;
        return fallback;
      },
    });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    expect(probe).not.toBe(null);
    expect(probe!()).toBe(false); // a quiet ledger
    void patchStageParams(draftIdOf("bench-p"), "s_0", { prompt: "probe" }, 1).catch(() => {});
    await new Promise((r) => setTimeout(r, 0));
    expect(probe!()).toBe(true); // in flight
    release?.();
    await waitFor(() => {
      if (stageWriteState(draftIdOf("bench-p"), "s_0").pending !== 0) throw new Error("write still in flight");
    }, { timeout: 8000 });
    expect(stageWriteState(draftIdOf("bench-p"), "s_0").failedKeys).toContain("prompt");
    expect(probe!()).toBe(true); // the refusal is live memory
    void patchStageParams(draftIdOf("bench-p"), "s_0", { prompt: "probe" }, 1).catch(() => {});
    await waitFor(() => {
      if (stageWriteState(draftIdOf("bench-p"), "s_0").pending !== 0) throw new Error("write still in flight");
    }, { timeout: 8000 });
    expect(stageWriteState(draftIdOf("bench-p"), "s_0").failedKeys).not.toContain("prompt");
    expect(probe!()).toBe(false); // the key's own success cleared its refusal
  });
});

describe("D16 THE ONE-ROW-PER-RUN RAIL — the history face walks the trail law", () => {
  test("a doc polluted pre-law renders ONE preview per run; a clean doc is unchanged", async () => {
    const owners = mountDrill({
      stage: {
        ...imageStage({ prompt: "x" }, { url: "/melite-media/runs/r2/out.png" }),
        runStatus: "succeeded",
        // the exact wound: run r2 rode TWO rows in the served doc —
        // the media-route spelling AND the gallery proxy spelling —
        // written before the estate's run-id archive law; r1 is a
        // genuinely different generation and stays.
        history: [
          { run_id: "r2", url: "/melite-media/runs/r2/out.png" },
          { run_id: "r2", url: "/infer-gallery/artifact?path=r2%2Fout.png" },
          { run_id: "r1", url: "/melite-media/runs/r1/old.png" },
        ],
      } as unknown as BenchStageView,
      renderPreview: (_owner, fallback) => fallback,
    });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const owner = owners[owners.length - 1] as unknown as { history?: Array<unknown[]> };
    expect(owner.history).toHaveLength(2); // r2 once + r1 — never two tiles for one run
    expect((owner.history?.[0] as unknown[]).length).toBe(1);
    expect((owner.history?.[1] as unknown[]).length).toBe(1);
  });

  test("a legacy no-run_id duplicate collapses by canonical url; newest stays head", async () => {
    const owners = mountDrill({
      stage: {
        ...imageStage({ prompt: "x" }, { url: "/melite-media/runs/r9/new.png" }),
        runStatus: "succeeded",
        history: [
          { url: "/melite-media/runs/r9/new.png" },
          { url: "/infer-gallery/artifact?path=r9%2Fnew.png" }, // same file, second spelling, no run_id
        ],
      } as unknown as BenchStageView,
      renderPreview: (_owner, fallback) => fallback,
    });
    await screen.findByText("Prompt", {}, { timeout: 4000 });
    const owner = owners[owners.length - 1] as unknown as { history?: Array<unknown[]> };
    expect(owner.history).toHaveLength(1); // one file, one seat
  });
});
