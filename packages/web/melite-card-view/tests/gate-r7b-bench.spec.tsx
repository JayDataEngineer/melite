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
import { unbindEstateRemote } from '@melite/card-base/client';
import { BenchView } from "../src/client/bench-view.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
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
        schema: schemaEnvelope((doors.specFields ?? {
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }) as Parameters<typeof schemaEnvelope>[0]),
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

function mountView(stages: BenchStageView[], estate?: EstateOpts, kind?: "draft", log?: Array<{ rev: number; author?: string; kind?: string }>): { rerender: (tick: number) => void } {
  doors.specFields = null;
  doors.uploads = () => ({ name: "data/input/a.png" });
  stubFetch();
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: log ?? [], stages: stages.map((s) => ({ ...s })) },
    draftStages: stages.map((s) => ({ ...s }) as unknown as Record<string, unknown>),
    draftBenchRev: 1,
    refusals: estate?.refusals,
    throws: estate?.throws,
    startDocs: estate?.startDocs,
    addStageRevs: estate?.addStageRevs,
  });
  const bench = kind === "draft"
    ? { kind: "draft", draftId: "bench-p", stageId: "s_0", rev: 1, log: log ?? [], stages }
    : { kind: "bench", draftId: "bench-p", rev: 1, log: log ?? [], stages } as const;
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

// THE CLEAR ALL (2026-10-10, the operator: "THERE IS NO CLEAR ALL"
// — and a bench with a stranded wire had no way out but the wire).
describe("the clear control — the demanded door, two-step", () => {
  test("the chrome carries a Clear control that arms before it fires", async () => {
    mountView(three());
    await waitFor(() => { expect(document.querySelectorAll('li[data-stage-id]').length).toBe(3) });
    const clear = screen.getByRole("button", { name: /clear/i });
    // ONE press arms, never fires (the consequence is named, the
    // destructive door is a second click away).
    fireEvent.click(clear);
    expect(calls().filter((c) => c.method === "bench/clear")).toHaveLength(0);
    const confirm = screen.getByRole("button", { name: /confirm clear/i });
    fireEvent.click(confirm);
    await waitFor(() => { expect(calls().filter((c) => c.method === "bench/clear")).toHaveLength(1) });
    // the fired call rides the bench's live rev (the CAS handle)
    const fired = calls().find((c) => c.method === "bench/clear");
    expect(fired?.args["doc"]).toMatchObject({ expect_rev: expect.any(Number) });
    // and the grid empties from the reloaded truth
    await waitFor(() => { expect(document.querySelectorAll('li[data-stage-id]').length).toBe(0) });
  });

  // THE CLEAR'S REFUSAL VOICE (bench-view.tsx:105) — the demanded
  // door's catch. A clear that never lands must SAY so: the bench
  // still holds its stages, so a silent button would read as a
  // success that lost work.
  test("a refused clear voices 'clear refused' and leaves the bench standing", async () => {
    mountView(three(), { throws: [{ method: "bench/clear", message: "bench is locked" }] });
    await waitFor(() => { expect(document.querySelectorAll('li[data-stage-id]').length).toBe(3) });
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm clear/i }));

    expect(await screen.findByText("clear refused — bench is locked")).toBeTruthy();
    // the truth is unchanged — nothing was cleared behind the refusal
    expect(document.querySelectorAll('li[data-stage-id]').length).toBe(3);
    // the control disarms: a second press is a fresh two-step, never
    // a silent retry of the refused write
    expect(document.querySelector('[data-bench-clear]')?.getAttribute("data-bench-clear")).toBe("idle");
  });

  test("a FOREIGN clear throw voices the same face through String(e)", async () => {
    mountView(three(), { throws: [{ method: "bench/clear", value: "kablam" }] });
    await waitFor(() => { expect(document.querySelectorAll('li[data-stage-id]').length).toBe(3) });
    fireEvent.click(screen.getByRole("button", { name: /clear/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm clear/i }));

    expect(await screen.findByText("clear refused — kablam")).toBeTruthy();
  });
});

// THE WALKABLE REVISION LOG (2026-10-13): a bench mutation is
// undoable from the tab, by rev — one press fires the server's
// inverse walk (no confirm step: undo RESTORES; the two-step law
// arms only destructive controls). The gate is the streamed log
// heads: an ACTION entry (any kind but 'undo') is a candidate; a
// log of undos alone offers no press.
describe("the undo control — the walkable revision log", () => {
  test("one press fires bench/undo at the live rev — no confirm step (undo restores)", async () => {
    mountView(three(), undefined, undefined, [{ rev: 1, author: "agent", kind: "add_stage" }]);
    await waitFor(() => { expect(document.querySelectorAll('li[data-stage-id]').length).toBe(3) });
    const undo = screen.getByRole("button", { name: /undo/i }) as HTMLButtonElement;
    expect(undo.disabled).toBe(false);
    fireEvent.click(undo);
    // ONE press, one frame — the restore is not destructive, so the
    // two-step arms nothing
    await waitFor(() => { expect(calls().filter((c) => c.method === "bench/undo")).toHaveLength(1) });
    const fired = calls().find((c) => c.method === "bench/undo");
    expect(fired?.args["doc"]).toMatchObject({ expect_rev: expect.any(Number) });
  });

  test("a log of undos alone (or none) offers no press — the candidate gate is the log itself", async () => {
    mountView(three(), undefined, undefined, [{ rev: 1, author: "agent", kind: "undo" }]);
    await waitFor(() => { expect(document.querySelectorAll('li[data-stage-id]').length).toBe(3) });
    const undo = screen.getByRole("button", { name: /undo/i }) as HTMLButtonElement;
    expect(undo.disabled).toBe(true);
    fireEvent.click(undo);
    expect(calls().filter((c) => c.method === "bench/undo")).toHaveLength(0);
  });

  test("a refused undo voices 'undo refused' and the bench stands", async () => {
    mountView(three(), { throws: [{ method: "bench/undo", message: "bench/nothing-to-undo" }] }, undefined,
      [{ rev: 1, author: "agent", kind: "add_stage" }]);
    await waitFor(() => { expect(document.querySelectorAll('li[data-stage-id]').length).toBe(3) });
    fireEvent.click(screen.getByRole("button", { name: /undo/i }));
    expect(await screen.findByText("undo refused — bench/nothing-to-undo")).toBeTruthy();
    expect(document.querySelectorAll('li[data-stage-id]').length).toBe(3);
  });
});

describe("the reload's foreign voice — a down wire still names the face", () => {
  test("a foreign bench/get throw voices 'bench reload failed' (never a throw past the tick)", async () => {
    const { rerender } = mountView(three(), { throws: [{ method: "bench/get", value: "kablam" }] });
    await screen.findByText("rev 1");
    rerender(1);
    // the refresh tick re-reads; the wire's foreign throw surfaces
    // verbatim (the failureText law), never a fixed fallback
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
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
  test("a foreign capability-add throw voices its own words (never silent)", async () => {
    mountView(three(), { throws: [{ method: "bench/add-stage", value: "kablam" }] });
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: ["application/tech-noir-capability"],
        getData: () => JSON.stringify({ service: "svc", title: "Svc" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
  });

  // L9 (the fallback audit): a PRESENT-but-corrupt capability body
  // badges — the drag was ours; a silent no-op reads as breakage.
  // Foreign/empty data stays quiet (the fall-through contract).
  test("a malformed capability drop badges and never writes (L9)", async () => {
    mountView(three());
    await screen.findByText("rev 1");
    // corrupt body: the MIME is ours, the payload is not JSON
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: ["application/tech-noir-capability"],
        getData: () => "{not json",
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText(/malformed/, {}, { timeout: 4000 })).toBeTruthy();
    expect(calls().some((p) => p.method === "bench/add-stage")).toBe(false);
  });

  test("a foreign asset-add throw voices its own words (never a partial stage)", async () => {
    mountView(three(), { throws: [{ method: "bench/add-stage", value: "kablam" }] });
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: ["application/tech-noir-asset"],
        getData: () => JSON.stringify({ url: "/a.png", type: "image/png" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a foreign uploads throw voices its own words (never a partial stage)", async () => {
    mountView(three());
    doors.uploads = () => ({ thrown: "kablam" });
    await screen.findByText("rev 1");
    const file = new File(["bytes"], "a.png", { type: "image/png" });
    fireEvent.drop(grid(), {
      dataTransfer: { types: ["Files"], getData: () => "", setData: () => {}, files: [file] },
    });
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
    expect(calls().some((p) => p.method === "bench/add-stage")).toBe(false);
  });
});

describe("the tile attach's foreign voice", () => {
  test("a foreign attach write voices its own words (never a throw past the drop)", async () => {
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
    expect(await screen.findByText("kablam", {}, { timeout: 4000 })).toBeTruthy();
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
