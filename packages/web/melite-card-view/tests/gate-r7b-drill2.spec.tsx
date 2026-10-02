// @vitest-environment happy-dom
// gate-r7b-drill2.spec.tsx — StageDrill's preview-seam arms (the R7B
// burn-down): the unclaimed preview seat, the live-figure owner
// spreads, and the timeline seam's film faces. Direct StageDrill
// mounts (the consult arms are the drill's own — no tab needed),
// fetch answering ONLY the /v1 discovery doors.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { StageDrill } from "../src/client/stage-drill.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
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

function mountDrill(opts: {
  stage: BenchStageView;
  running?: boolean;
  spec?: SpecMode;
  renderPreview?: (owner: PreviewOwner, fallback: unknown) => unknown;
}): PreviewOwner[] {
  stubFetch();
  if (opts.spec !== undefined) doors.spec = opts.spec;
  fakes?.unmount();
  fakes = mountEstateFakes({});
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
    renderStageView: ((_owner: unknown, fallback: unknown) => fallback) as never,
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
