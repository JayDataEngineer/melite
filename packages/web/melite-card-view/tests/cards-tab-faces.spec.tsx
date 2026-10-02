// @vitest-environment happy-dom
// cards-tab-faces.spec.tsx — the bench chrome's honest faces
// (2026-09-16 burn-down, installment 3i): the save door (slug,
// refuse, throw, cancel), the grid drop failures (capability/asset
// thrown, Files-typed empties, the uninterested dragover), the file
// drop's thrown tail, the attach's reload, the Play pass (refused +
// done-skip), and the thrown run start (Error + fallback).
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { resetCardFamiliesCache } from "@melite-plugin/melite-run-wire";
import { mountEstateFakes, type EstateFakes, type EstateRefusal } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

const doors: {
  specFields: Record<string, unknown> | null;
  ensureBodies: Array<Record<string, unknown>>;
  ensureMode: "ok" | "refuse" | "throw";
  catalogStatus?: number;
  catalogThrown?: unknown;
} = {
  specFields: null,
  ensureBodies: [], ensureMode: "ok",
};

// THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
// namespaces (mountEstateFakes); fetch answers ONLY the /v1
// bench-ensure/uploads/discovery doors.
let fakes: EstateFakes | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function benchGets(): number {
  return calls().filter((p) => p.method === "bench/get").length;
}

const CAP_MIME = "application/tech-noir-capability";
const ASSET_MIME = "application/tech-noir-asset";

function envelope(fields: Record<string, unknown>): unknown {
  return schemaEnvelope(fields as Parameters<typeof schemaEnvelope>[0]);
}

function stubFetch(): void {
  doors.specFields = null;
  doors.ensureBodies = [];
  doors.ensureMode = "ok";
  doors.catalogStatus = undefined;
  doors.catalogThrown = undefined;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path === "/v1/bench/ensure") {
      doors.ensureBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      if (doors.ensureMode === "throw") throw new Error("ensure down");
      if (doors.ensureMode === "refuse") {
        return new Response(JSON.stringify({ error: "taken" }), {
          status: 409, headers: { "content-type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path === "/v1/uploads") {
      return new Response(JSON.stringify({ path: "data/input/a.png" }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui",
        schema: envelope(doors.specFields ?? {
          prompt: { type: "string", meta: { description: "Prompt", extra: { wtype: "textarea" } } },
        }),
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({ "image-gen": { outputs: { default: "image" } } }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      if (doors.catalogThrown !== undefined) throw doors.catalogThrown;
      if (doors.catalogStatus !== undefined) {
        return new Response("down", { status: doors.catalogStatus });
      }
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

const STAGES: BenchStageView[] = [
  { id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a barn" } },
];

interface EstateOpts {
  refusals?: EstateRefusal[];
  throws?: EstateRefusal[];
}

function mount(stages: BenchStageView[] = STAGES, estate?: EstateOpts): void {
  stubFetch();
  // the rail reads the same rows the snapshot carries (the old
  // bench/get served the mount's rows; the old drafts/get served
  // no stages — the harness's honest draft row is the equivalent).
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages },
    draftStages: stages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
    refusals: estate?.refusals,
    throws: estate?.throws,
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({
      status: "live" as const,
      value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages },
    }),
  } as never));
}

function grid(): HTMLElement {
  const ol = document.querySelector('ol[data-drop-surface="cards"]') as HTMLElement;
  if (ol === null) throw new Error("grid missing");
  return ol;
}

function tileLi(id: string): HTMLElement {
  const li = document.querySelector(`li[data-stage-id="${id}"]`) as HTMLElement;
  if (li === null) throw new Error("tile missing: " + id);
  return li;
}

function zoomCard(): HTMLElement {
  const el = document.querySelector('div[class*="zoomCard"]') as HTMLElement;
  if (el === null) throw new Error("zoom missing");
  return el;
}

async function openZoom(): Promise<void> {
  await waitFor(() => {
    if (document.querySelector('button[class*="tileInner"]') === null) throw new Error("no tile");
  });
  fireEvent.click(document.querySelector('button[class*="tileInner"]') as HTMLElement);
  await waitFor(() => {
    if (document.querySelector('div[class*="zoomCard"]') === null) throw new Error("no zoom");
  }, { timeout: 5000 });
}

describe("the save door — slug, refuse, throw, cancel", () => {
  test("a named bench mints with a slug (results never ride)", async () => {
    mount();
    await screen.findByText("rev 1");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    const name = screen.getByPlaceholderText("flow name");
    fireEvent.change(name, { target: { value: "My Flow!" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(doors.ensureBodies.length).toBeGreaterThan(0);
    }, { timeout: 5000 });
    expect(doors.ensureBodies[0]["session"]).toBe("saved-my-flow");
    expect(doors.ensureBodies[0]["intent"]).toBe("My Flow!");
    const sent = JSON.parse(JSON.stringify((doors.ensureBodies[0]["stages"] as Array<unknown>)[0])) as Record<string, unknown>;
    expect(sent).not.toHaveProperty("result");
    expect(sent).not.toHaveProperty("runStatus");
    expect(sent).not.toHaveProperty("resolved");
    // the door closes on success
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("flow name")).toBeNull();
    }, { timeout: 5000 });
  });

  test("a refused mint voices (the door stays for retry)", async () => {
    mount();
    doors.ensureMode = "refuse";
    await screen.findByText("rev 1");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(screen.getByPlaceholderText("flow name"), { target: { value: "taken" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("save refused (taken)", {}, { timeout: 5000 })).toBeTruthy();
    expect(screen.queryByPlaceholderText("flow name")).not.toBeNull();
  });

  test("a dead mint voices the throw (never a stuck Save)", async () => {
    mount();
    doors.ensureMode = "throw";
    await screen.findByText("rev 1");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(screen.getByPlaceholderText("flow name"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText(/save failed — .*ensure down/, {}, { timeout: 5000 })).toBeTruthy();
  });

  test("cancel closes the door without minting (error clears too)", async () => {
    mount();
    doors.ensureMode = "refuse";
    await screen.findByText("rev 1");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    fireEvent.change(screen.getByPlaceholderText("flow name"), { target: { value: "taken" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByText("save refused (taken)", {}, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByPlaceholderText("flow name")).toBeNull();
    }, { timeout: 5000 });
    expect(screen.queryByText("save refused (taken)")).toBeNull();
  });
});

describe("the grid drop failures — thrown adds and empty files", () => {
  test("a capability add that throws voices the fallback (never empty)", async () => {
    // the old stub threw the bare number 42 (a non-Error, so the
    // client voiced its 'add refused' fallback); the live seam
    // throws Errors, so the queued message IS the voiced text.
    mount(STAGES, { throws: [{ method: "bench/add-stage", message: "add refused" }] });
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: [CAP_MIME], getData: () => JSON.stringify({ service: "svc", title: "Svc", params: { a: 1 } }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findAllByText("add refused", {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("an asset add that throws voices the fallback (never empty)", async () => {
    mount(STAGES, { throws: [{ method: "bench/add-stage", message: "add refused" }] });
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: [ASSET_MIME],
        getData: () => JSON.stringify({ url: "/a.png", type: "image/png" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findAllByText("add refused", {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("a thrown file-drop tail voices the fallback (never empty)", async () => {
    mount(STAGES, { throws: [{ method: "bench/add-stage", message: "drop refused" }] });
    await screen.findByText("rev 1");
    const file = new File(["bytes"], "a.png", { type: "image/png" });
    fireEvent.drop(grid(), {
      dataTransfer: { types: ["Files"], getData: () => "", setData: () => {}, files: [file] },
    });
    expect(await screen.findAllByText("drop refused", {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("a Files-typed drop with no files is ignored (never a throw past the grid)", async () => {
    mount();
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: { types: ["Files"], getData: () => "", setData: () => {}, files: [] },
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(calls().some((p) => p.method === "bench/add-stage")).toBe(false);
  });

  test("a file list with no first file is ignored (never undefined into the door)", async () => {
    mount();
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: ["Files"], getData: () => "", setData: () => {},
        files: { length: 1, item: () => null },
      },
    });
    await new Promise((r) => setTimeout(r, 100));
    expect(calls().some((p) => p.method === "bench/add-stage")).toBe(false);
  });

  test("only an interested dragover lights the grid (plain text never does)", async () => {
    mount();
    await screen.findByText("rev 1");
    const before = grid().className;
    fireEvent.dragOver(grid(), {
      dataTransfer: { types: ["text/plain"], getData: () => "", setData: () => {}, files: [] },
    });
    // uninterested: the highlight never arms
    expect(grid().className).toBe(before);
    fireEvent.dragOver(grid(), {
      dataTransfer: {
        types: [CAP_MIME], getData: () => "", setData: () => {}, files: [],
      },
    });
    expect(grid().className).not.toBe(before);
  });

  test("leaving the grid for nowhere clears the highlight (never stuck)", async () => {
    mount();
    await screen.findByText("rev 1");
    const before = grid().className;
    fireEvent.dragOver(grid(), {
      dataTransfer: {
        types: [CAP_MIME], getData: () => "", setData: () => {}, files: [],
      },
    });
    expect(grid().className).not.toBe(before);
    // a leave for a sibling keeps the highlight (only nowhere clears)
    fireEvent.dragOver(grid(), {
      dataTransfer: {
        types: [CAP_MIME], getData: () => "", setData: () => {}, files: [],
      },
    });
    fireEvent.dragLeave(grid(), { relatedTarget: document.createElement("div") });
    expect(grid().className).not.toBe(before);
    // leaving for nowhere carries relatedTarget null — happy-dom's
    // DragEvent drops the standard init, so the harness teaches the
    // constructor the init dict (the browser condition itself)
    const NativeDragEvent = globalThis.DragEvent;
    class InitDragEvent extends NativeDragEvent {
      constructor(type: string, init?: DragEventInit) {
        super(type, init);
        if (init !== undefined && "relatedTarget" in init) {
          Object.defineProperty(this, "relatedTarget", { value: init.relatedTarget });
        }
      }
    }
    vi.stubGlobal("DragEvent", InitDragEvent);
    fireEvent.dragLeave(grid(), { relatedTarget: null });
    vi.stubGlobal("DragEvent", NativeDragEvent);
    expect(grid().className).toBe(before);
  });
});

describe("the attach landing — the write reloads with the drill kept", () => {
  test("an image attach re-reads the bench (the tile, never stale)", async () => {
    mount();
    doors.specFields = {
      input_image: { type: "image", meta: { description: "Input image" } },
    };
    await screen.findByText("rev 1");
    const gets = benchGets();
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: {
        types: [ASSET_MIME],
        getData: () => JSON.stringify({ url: "/a.png", type: "image/png" }),
        setData: () => {}, files: [],
      },
    });
    await waitFor(() => {
      expect(benchGets()).toBeGreaterThan(gets);
    }, { timeout: 5000 });
  });
});

describe("the Play pass — refused voices, done skips", () => {
  test("a refused first card voices (a second press aborts cleanly)", async () => {
    // TWO refusals: the harness queues are one-shot (each press
    // consumes one) while the old frame refused every call.
    mount(STAGES, { refusals: [
      { method: "runs/start", message: "queue full" },
      { method: "runs/start", message: "queue full" },
    ] });
    await screen.findByText("rev 1");
    const play = screen.getByRole("button", { name: /Play/ });
    fireEvent.click(play);
    expect(await screen.findAllByText("queue full", {}, { timeout: 5000 })).not.toHaveLength(0);
    // the pass settled — Play is armed again, and a second press
    // (the abort arm) lands without sticking
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Play/ }).hasAttribute("disabled")).toBe(false);
    }, { timeout: 5000 });
    fireEvent.click(screen.getByRole("button", { name: /Play/ }));
    expect(await screen.findAllByText("queue full", {}, { timeout: 5000 })).not.toHaveLength(0);
  });

  test("an all-done bench passes without starting (the cache-hit skip)", async () => {
    mount([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "done" }]);
    await screen.findByText("rev 1");
    fireEvent.click(screen.getByRole("button", { name: /Play/ }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Play/ }).hasAttribute("disabled")).toBe(false);
    }, { timeout: 5000 });
    expect(calls().some((p) => p.method === "runs/start")).toBe(false);
  });
});

describe("the thrown start — carry the failure to the row", () => {
  // startRun converts wire throws to refusals — the start REJECTS
  // only when the family lookup itself dies (the families cache is
  // reset so the lookup truly fires)
  test("a dead family lookup voices the throw (the drill stays for retry)", async () => {
    mount();
    await openZoom();
    resetCardFamiliesCache();
    doors.catalogThrown = new Error("families down");
    fireEvent.click(within(zoomCard()).getByTestId("drill-run"));
    expect(await screen.findAllByText("families down", {}, { timeout: 5000 })).not.toHaveLength(0);
    // the zoom stays open for the retry
    expect(document.querySelector('div[class*="zoomCard"]')).not.toBeNull();
  });

  test("a throwing lookup voices the fallback (never empty)", async () => {
    mount();
    await openZoom();
    resetCardFamiliesCache();
    doors.catalogThrown = "gone";
    fireEvent.click(within(zoomCard()).getByTestId("drill-run"));
    expect(await screen.findAllByText("run start failed", {}, { timeout: 5000 })).not.toHaveLength(0);
  });

});
