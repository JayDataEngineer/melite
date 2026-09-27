// @vitest-environment happy-dom
// gate-r7b-bench.spec.tsx — BenchView's refusal-voice arms (the R7B
// burn-down): every catch that voices a foreign (non-Error) throw
// with its fallback text, plus the save flow's early return. Mounts
// the exported BenchView directly (no tab chrome — the grid, tiles,
// and save UI are the view's own), estate verbs on mountEstateFakes,
// fetch answering ONLY the /v1 discovery doors + /v1/uploads.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { BenchView } from "../src/client/bench-view.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageView } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

type EstateOpts = Parameters<typeof mountEstateFakes>[0];

const doors: {
  specFields: Record<string, unknown> | null;
  uploads: () => { name?: string; thrown?: unknown };
} = { specFields: null, uploads: () => ({ name: "data/input/a.png" }) };

let fetchedUrls: string[] = [];
let fakes: { calls: Array<{ method: string; args: Record<string, unknown> }>; unmount: () => void } | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function stubFetch(): void {
  fetchedUrls = [];
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    fetchedUrls.push(path);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "x", genre: "image", engine: "comfyui",
        schema: schemaEnvelope(doors.specFields ?? {
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
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
    if (path === "/v1/uploads") {
      const answer = doors.uploads();
      if (answer.thrown !== undefined) throw answer.thrown;
      return new Response(JSON.stringify({ path: answer.name ?? "data/input/a.png" }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

function mountView(stages: BenchStageView[], estate?: EstateOpts, kind?: "draft"): { rerender: (tick: number) => void } {
  doors.specFields = null;
  doors.uploads = () => ({ name: "data/input/a.png" });
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: stages.map((s) => ({ ...s })) },
    draftStages: stages.map((s) => ({ ...s }) as unknown as Record<string, unknown>),
    draftBenchRev: 1,
    refusals: estate?.refusals,
    throws: estate?.throws,
    startDocs: estate?.startDocs,
    addStageRevs: estate?.addStageRevs,
  });
  const bench = kind === "draft"
    ? { kind: "draft", draftId: "bench-p", stageId: "s_0", rev: 1, log: [], stages }
    : { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as const;
  const props = {
    bench: bench as unknown as Parameters<typeof BenchView>[0]["bench"],
    sessionKey: "main",
    onRun: () => {},
    onRunStage: () => {},
    onStopStage: () => {},
    onRemoveStage: () => {},
    stageRuns: {},
    running: false,
    onPatchParams: () => {},
    renderStageView: ((owner: unknown, fallback: unknown) => fallback) as never,
  };
  const view = render(h(BenchView, props));
  return {
    rerender: (tick: number) => { view.rerender(h(BenchView, { ...props, refreshTick: tick })); },
  };
}

function tileOrder(): string[] {
  return [...document.querySelectorAll('li[data-stage-id]')].map((el) => el.getAttribute("data-stage-id") ?? "?");
}

function tileLi(id: string): HTMLElement {
  const li = document.querySelector(`li[data-stage-id="${id}"]`) as HTMLElement;
  if (li === null) throw new Error("tile missing: " + id);
  return li;
}

function grid(): HTMLElement {
  const ol = document.querySelector('ol[data-drop-surface="cards"]') as HTMLElement;
  if (ol === null) throw new Error("grid missing");
  return ol;
}

function cardDrag(sourceId: string): Record<string, unknown> {
  const store: Record<string, string> = { "application/x-melite-card": sourceId };
  return {
    types: ["application/x-melite-card"],
    getData: (mime: string) => store[mime] ?? "",
    setData: (mime: string, v: string) => { store[mime] = v; },
    effectAllowed: "",
    dropEffect: "",
    files: [],
  };
}

function three(): BenchStageView[] {
  return [
    { id: "s_0", card: "a-card", engine: "comfyui", params: {} },
    { id: "s_1", card: "b-card", engine: "comfyui", params: {} },
    { id: "s_2", card: "c-card", engine: "comfyui", params: {} },
  ];
}

describe("the reload's foreign voice — a down wire still names the face", () => {
  test("a foreign bench/get throw voices 'bench reload failed' (never a throw past the tick)", async () => {
    const { rerender } = mountView(three(), { throws: [{ method: "bench/get", value: "kablam" }] });
    await screen.findByText("rev 1");
    rerender(1);
    // the refresh tick re-reads; the wire's foreign throw lands as
    // the fallback text (the Error arm would voice the message)
    expect(await screen.findByText("bench reload failed", {}, { timeout: 4000 })).toBeTruthy();
    expect(calls().some((p) => p.method === "bench/get")).toBe(true);
  });
});

describe("the reorder's foreign voice — rewind, then the reload heals", () => {
  test("a foreign reorder throw rewinds to the reloaded truth (never a stuck splice)", async () => {
    mountView(three(), { throws: [{ method: "bench/reorder", value: "kablam" }] });
    await screen.findByText("rev 1");
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    fireEvent.drop(tileLi("s_2"), { dataTransfer: cardDrag("s_0") });
    // optimistic first, then the rewind lands on the reloaded truth
    expect(tileOrder()).toEqual(["s_1", "s_2", "s_0"]);
    await waitFor(() => { expect(tileOrder()).toEqual(["s_0", "s_1", "s_2"]); });
    // the failed reorder's catch ran AND the reload followed it (the
    // rewind is the reload's truth, never the splice)
    const methods = calls().map((c) => c.method);
    expect(methods).toContain("bench/reorder");
    expect(methods.indexOf("bench/reorder")).toBeLessThan(methods.lastIndexOf("bench/get"));
  });
});

describe("the grid's foreign voices — capability, asset, file", () => {
  test("a foreign capability-add throw voices 'add refused' (never silent)", async () => {
    mountView(three(), { throws: [{ method: "bench/add-stage", value: "kablam" }] });
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: ["application/tech-noir-capability"],
        getData: () => JSON.stringify({ service: "svc", title: "Svc" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText("add refused", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a foreign asset-add throw voices 'add refused' (never a partial stage)", async () => {
    mountView(three(), { throws: [{ method: "bench/add-stage", value: "kablam" }] });
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: ["application/tech-noir-asset"],
        getData: () => JSON.stringify({ url: "/a.png", type: "image/png" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText("add refused", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a foreign uploads throw voices 'drop refused' (never a partial stage)", async () => {
    mountView(three());
    doors.uploads = () => ({ thrown: "kablam" });
    await screen.findByText("rev 1");
    const file = new File(["bytes"], "a.png", { type: "image/png" });
    fireEvent.drop(grid(), {
      dataTransfer: { types: ["Files"], getData: () => "", setData: () => {}, files: [file] },
    });
    expect(await screen.findByText("drop refused", {}, { timeout: 4000 })).toBeTruthy();
    expect(calls().some((p) => p.method === "bench/add-stage")).toBe(false);
  });
});

describe("the tile attach's foreign voice", () => {
  test("a foreign attach write voices 'attach refused' (never a throw past the drop)", async () => {
    mountView(
      [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      { throws: [{ method: "drafts/patch", value: "kablam" }] },
    );
    doors.specFields = {
      input_image: { type: "image", meta: { description: "Input image" } },
    };
    await screen.findByText("rev 1");
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: {
        types: ["application/tech-noir-asset"],
        getData: () => JSON.stringify({ url: "/a.png", type: "image/png" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText("attach refused", {}, { timeout: 4000 })).toBeTruthy();
  });
});

describe("the save flow's early return — a non-bench value never wires", () => {
  test("a named save on a non-bench value wires nothing (the kind guard holds)", async () => {
    mountView(three(), undefined, "draft");
    await screen.findByText("rev 1");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const name = await screen.findByPlaceholderText("flow name", {}, { timeout: 4000 });
    fireEvent.change(name, { target: { value: "x" } });
    const save = screen.getByRole("button", { name: "Save" });
    expect((save as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(save);
    await new Promise((r) => setTimeout(r, 100));
    // the kind guard returned before the wire (never an ensure)
    expect(fetchedUrls.some((u) => u.includes("/v1/bench/ensure"))).toBe(false);
    // still composing (never navigated, never cleared)
    expect(screen.queryByPlaceholderText("flow name")).not.toBeNull();
  });
});
