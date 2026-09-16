// @vitest-environment happy-dom
// cards-tab-dragdrop.spec.tsx — the bench's native drag contracts
// (2026-09-16 burn-down, installment 3c-drag): tile reorder
// (optimistic splice + the door + refusal rewind), the grid's
// capability/asset/file drop surface, and drop-on-tile slot attach.
// NOTE: selection/grouping mode has no entry UI (setGrouping(true)
// is never called — exemption with caller proof), so every tile
// here is draggable and every click opens.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from "../src/client/spec-form.tsx";
import type { BenchStageRow, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const CARD_MIME = "application/x-melite-card";
const CAP_MIME = "application/tech-noir-capability";
const ASSET_MIME = "application/tech-noir-asset";

interface Doors {
  posted: Array<{ method: string; args: Record<string, unknown> }>;
  frames: Record<string, (args: Record<string, unknown>) => { value?: unknown; refuse?: string; thrown?: unknown }>;
  specFields: Record<string, unknown> | null;
  uploads: () => { name?: string; thrown?: unknown };
  patches: Array<Record<string, unknown>>;
}

const doors: Doors = { posted: [], frames: {}, specFields: null, uploads: () => ({}), patches: [] };

function stubFetch(): void {
  doors.specFields = null;
  doors.posted = [];
  doors.frames = {};
  doors.patches = [];
  doors.uploads = () => ({ name: "data/input/a.png" });
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
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
      // the door answers {path} — the estate-path currency
      return new Response(JSON.stringify({ path: answer.name ?? "data/input/a.png" }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string; payload: { args: Record<string, unknown> } };
      doors.posted.push({ method: frame.method, args: frame.payload.args });
      if (frame.method === "drafts/patch") {
        const params = ((frame.payload.args["patch"] as Record<string, unknown>)["params"] ?? {}) as Record<string, unknown>;
        doors.patches.push(params);
      }
      const route = doors.frames[frame.method];
      if (route !== undefined) {
        const answer = route(frame.payload.args);
        if (answer.thrown !== undefined) throw answer.thrown;
        if (answer.refuse !== undefined) {
          return new Response(JSON.stringify({
            type: "server-response", rpcId: frame.rpcId,
            result: { ok: false, error: { message: answer.refuse } },
          }), { status: 200, headers: { "content-type": "application/json" } });
        }
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: answer.value ?? {} },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({
        type: "server-response", rpcId: frame.rpcId, result: { ok: true, value: {} },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    return new Response("no", { status: 500 });
  });
}

function mountBench(stages: BenchStageRow[]): void {
  stubFetch();
  const doc = {
    draft_id: "bench-p", rev: 1, log: [],
    stages: stages.map((s) => ({ ...s, run_status: s.runStatus })),
  };
  const impl = globalThis.fetch;
  vi.stubGlobal("fetch", async (url: unknown, init?: RequestInit): Promise<Response> => {
    const path = String(url);
    if (path.startsWith("/api/")) {
      const frame = JSON.parse(String(init?.body)) as { rpcId: string; method: string };
      if (frame.method === "bench/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: doc },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (frame.method === "drafts/get") {
        return new Response(JSON.stringify({
          type: "server-response", rpcId: frame.rpcId,
          result: { ok: true, value: { draft_id: "bench-p", bench: { rev: 1 }, stages } },
        }), { status: 200, headers: { "content-type": "application/json" } });
      }
    }
    return (impl as typeof fetch)(url, init);
  });
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live", value: { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as CardsBenchValue }),
  }));
}

function three(): BenchStageRow[] {
  return [
    { id: "s_0", card: "a-card", engine: "comfyui", params: {} },
    { id: "s_1", card: "b-card", engine: "comfyui", params: {} },
    { id: "s_2", card: "c-card", engine: "comfyui", params: {} },
  ];
}

function tileOrder(): string[] {
  return [...document.querySelectorAll('li[data-stage-id]')].map((el) => el.getAttribute("data-stage-id") ?? "?");
}

function tileLi(id: string): HTMLElement {
  const li = document.querySelector(`li[data-stage-id="${id}"]`) as HTMLElement;
  if (li === null) throw new Error("tile missing: " + id);
  return li;
}

function cardDrag(sourceId: string): Record<string, unknown> {
  const store: Record<string, string> = { [CARD_MIME]: sourceId };
  return {
    types: [CARD_MIME],
    getData: (mime: string) => store[mime] ?? "",
    setData: (mime: string, v: string) => { store[mime] = v; },
    effectAllowed: "",
    dropEffect: "",
    files: [],
  };
}

function grid(): HTMLElement {
  const ol = document.querySelector('ol[data-drop-surface="cards"]') as HTMLElement;
  if (ol === null) throw new Error("grid missing");
  return ol;
}

describe("tile reorder — the optimistic splice, then the door", () => {
  test("dropping a tile on another splices the order and posts the door", async () => {
    doors.frames["bench/reorder"] = () => ({ value: { rev: 2 } });
    mountBench(three());
    doors.frames["bench/reorder"] = () => ({ value: { rev: 2 } });
    await screen.findByText("rev 1");
    expect(tileOrder()).toEqual(["s_0", "s_1", "s_2"]);
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    fireEvent.drop(tileLi("s_2"), { dataTransfer: cardDrag("s_0") });
    // optimistic first (the splice lands before the door answers)
    expect(tileOrder()).toEqual(["s_1", "s_2", "s_0"]);
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "bench/reorder")).toBe(true);
    });
    const wire = doors.posted.find((p) => p.method === "bench/reorder")!;
    const redoc = wire.args["doc"] as Record<string, unknown>;
    expect(redoc["stage"]).toBe("s_0");
    expect(redoc["to"]).toBe(2);
  });

  test("dropping a tile on itself is a no-op (never a wire call)", async () => {
    mountBench(three());
    await screen.findByText("rev 1");
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    fireEvent.drop(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.posted.some((p) => p.method === "bench/reorder")).toBe(false);
    expect(tileOrder()).toEqual(["s_0", "s_1", "s_2"]);
  });

  test("a drop carrying no id is a no-op (never a wire call)", async () => {
    mountBench(three());
    await screen.findByText("rev 1");
    fireEvent.drop(tileLi("s_1"), { dataTransfer: cardDrag("") });
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.posted.some((p) => p.method === "bench/reorder")).toBe(false);
  });

  test("a refused reorder rewinds to the reloaded truth (never a stuck splice)", async () => {
    mountBench(three());
    doors.frames["bench/reorder"] = () => ({ refuse: "bench moved" });
    await screen.findByText("rev 1");
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    fireEvent.drop(tileLi("s_2"), { dataTransfer: cardDrag("s_0") });
    // the rewind lands on the reloaded truth (the refusal's own
    // voice is cleared by the reload's reset — pinned as-is)
    await waitFor(() => { expect(tileOrder()).toEqual(["s_0", "s_1", "s_2"]); });
    expect(doors.posted.filter((x) => x.method === "bench/reorder").length).toBe(1);
    expect(document.querySelector('[class*="runError"]')).toBeNull();
  });

  test("a throwing reorder rewinds too (never a throw past the drop)", async () => {
    mountBench(three());
    doors.frames["bench/reorder"] = () => ({ thrown: "kablam" });
    await screen.findByText("rev 1");
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    fireEvent.drop(tileLi("s_2"), { dataTransfer: cardDrag("s_0") });
    await waitFor(() => { expect(tileOrder()).toEqual(["s_0", "s_1", "s_2"]); });
  });

  test("dragover arms the tile and dragend releases (no wire on either)", async () => {
    mountBench(three());
    await screen.findByText("rev 1");
    fireEvent.dragOver(tileLi("s_1"), { dataTransfer: cardDrag("s_0") });
    fireEvent.dragOver(tileLi("s_1"), {
      dataTransfer: { types: [ASSET_MIME], getData: () => "", setData: () => {}, files: [] },
    });
    fireEvent.dragOver(tileLi("s_1"), {
      dataTransfer: { types: ["text/plain"], getData: () => "", setData: () => {}, files: [] },
    });
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    fireEvent.dragEnd(tileLi("s_0"));
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.posted.some((p) => p.method === "bench/reorder")).toBe(false);
  });
});

describe("the grid drop surface — capability, asset, file", () => {
  function capTransfer(payload: string): Record<string, unknown> {
    return {
      types: [CAP_MIME], getData: () => payload, setData: () => {}, files: [],
    };
  }

  test("a capability drop lands a stage named by its service (title stays diagnostics)", async () => {
    doors.frames["bench/add-stage"] = () => ({ value: { rev: 2 } });
    mountBench(three());
    doors.frames["bench/add-stage"] = () => ({ value: { rev: 2 } });
    await screen.findByText("rev 1");
    fireEvent.dragOver(grid(), { dataTransfer: capTransfer("x") });
    fireEvent.drop(grid(), { dataTransfer: capTransfer(JSON.stringify({ service: "svc", title: "Svc", params: { a: 1 } })) });
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(true);
    });
    const wire = doors.posted.find((p) => p.method === "bench/add-stage")!;
    const addoc = wire.args["doc"] as Record<string, unknown>;
    expect(addoc["card"]).toBe("svc");
    expect(addoc).not.toHaveProperty("title");
    expect((addoc["params"] as Record<string, unknown>)["a"]).toBe(1);
  });

  test("malformed, fieldless, and empty capability payloads never wire", async () => {
    mountBench(three());
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), { dataTransfer: capTransfer("{bad json") });
    fireEvent.drop(grid(), { dataTransfer: capTransfer(JSON.stringify({ service: "svc" })) });
    fireEvent.drop(grid(), { dataTransfer: capTransfer("") });
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(false);
  });

  test("a refused capability add voices (never a silent grid)", async () => {
    mountBench(three());
    doors.frames["bench/add-stage"] = () => ({ refuse: "no room" });
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), { dataTransfer: capTransfer(JSON.stringify({ service: "svc", title: "Svc" })) });
    expect(await screen.findByText("no room", {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an image asset drop lands an input-prep card", async () => {
    doors.frames["bench/add-stage"] = () => ({ value: { rev: 2 } });
    mountBench(three());
    doors.frames["bench/add-stage"] = () => ({ value: { rev: 2 } });
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: [ASSET_MIME],
        getData: () => JSON.stringify({ url: "/a.png", type: "image/png" }),
        setData: () => {}, files: [],
      },
    });
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(true);
    });
    const wire = doors.posted.find((p) => p.method === "bench/add-stage")!;
    const indoc = wire.args["doc"] as Record<string, unknown>;
    expect(indoc["card"]).toBe("input-prep");
    expect((indoc["params"] as Record<string, unknown>)["source"]).toBe("/a.png");
  });

  test("an asset without a url never wires", async () => {
    mountBench(three());
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: [ASSET_MIME], getData: () => JSON.stringify({ type: "image/png" }),
        setData: () => {}, files: [],
      },
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(false);
  });

  test("a video asset is refused with its own words", async () => {
    mountBench(three());
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: [ASSET_MIME],
        getData: () => JSON.stringify({ url: "/a.mp4", type: "video/mp4" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText(/don’t accept video\/mp4 assets/, {}, { timeout: 4000 })).toBeTruthy();
    expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(false);
  });

  test("a typeless asset is refused as unsupported (never silent)", async () => {
    mountBench(three());
    await screen.findByText("rev 1");
    fireEvent.drop(grid(), {
      dataTransfer: {
        types: [ASSET_MIME], getData: () => JSON.stringify({ url: "/a.bin" }),
        setData: () => {}, files: [],
      },
    });
    expect(await screen.findByText(/isn’t supported/, {}, { timeout: 4000 })).toBeTruthy();
  });

  test("an OS image file rides the uploads door then lands", async () => {
    doors.frames["bench/add-stage"] = () => ({ value: { rev: 2 } });
    mountBench(three());
    doors.frames["bench/add-stage"] = () => ({ value: { rev: 2 } });
    await screen.findByText("rev 1");
    const file = new File(["bytes"], "a.png", { type: "image/png" });
    fireEvent.drop(grid(), {
      dataTransfer: { types: ["Files"], getData: () => "", setData: () => {}, files: [file] },
    });
    await new Promise((r) => setTimeout(r, 300));
    await waitFor(() => {
      expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(true);
    });
    const wire = doors.posted.find((p) => p.method === "bench/add-stage")!;
    const updoc = wire.args["doc"] as Record<string, unknown>;
    expect((updoc["params"] as Record<string, unknown>)["source"]).toBe("data/input/a.png");
  });

  test("a dead uploads door voices instead of landing (never a partial stage)", async () => {
    mountBench(three());
    doors.uploads = () => ({ thrown: new Error("disk gone") });
    await screen.findByText("rev 1");
    const file = new File(["bytes"], "a.png", { type: "image/png" });
    fireEvent.drop(grid(), {
      dataTransfer: { types: ["Files"], getData: () => "", setData: () => {}, files: [file] },
    });
    expect(await screen.findByText("disk gone", {}, { timeout: 4000 })).toBeTruthy();
    expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(false);
  });

  test("a foreign drag over the grid is ignored (never claimed)", async () => {
    mountBench(three());
    await screen.findByText("rev 1");
    fireEvent.dragOver(grid(), {
      dataTransfer: { types: ["text/plain"], getData: () => "", setData: () => {}, files: [] },
    });
    fireEvent.drop(grid(), {
      dataTransfer: { types: ["text/plain"], getData: () => "", setData: () => {}, files: [] },
    });
    fireEvent.dragLeave(grid(), { relatedTarget: document.createElement("div") });
    fireEvent.dragLeave(grid(), { relatedTarget: null });
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.posted.some((p) => p.method === "bench/add-stage")).toBe(false);
    expect(doors.posted.some((p) => p.method === "bench/reorder")).toBe(false);
  });
});

describe("drop-on-tile attach — the estate's slot mechanism", () => {
  function assetTransfer(payload: string): Record<string, unknown> {
    return { types: [ASSET_MIME], getData: () => payload, setData: () => {}, files: [] };
  }

  test("an image asset on a tile patches the card's image slot", async () => {
    doors.specFields = {
      input_image: { type: "image", meta: { description: "Input image" } },
    };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.specFields = {
      input_image: { type: "image", meta: { description: "Input image" } },
    };
    await screen.findByText("rev 1");
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: assetTransfer(JSON.stringify({ url: "/a.png", type: "image/png" })),
    });
    await waitFor(() => { expect(doors.patches.length).toBeGreaterThan(0); });
    expect(doors.patches[doors.patches.length - 1]).toEqual({ input_image: "/a.png" });
  });

  test("an audio asset on a tile refuses honestly (no audio-typed slot exists)", async () => {
    // the attach looks up fieldsOf(spec) for type === 'audio' —
    // field types are image/file, so an audio drop voices 'no audio
    // slot' instead of writing a foreign key (never a silent drop)
    doors.specFields = {
      voice: { type: "file", meta: { description: "Voice" } },
    };
    mountBench([{ id: "s_0", card: "tts", engine: "comfyui", params: {} }]);
    doors.specFields = {
      voice: { type: "file", meta: { description: "Voice" } },
    };
    await screen.findByText("rev 1");
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: assetTransfer(JSON.stringify({ url: "/v.wav", type: "audio/wav" })),
    });
    expect(await screen.findByText(/has no audio slot/, {}, { timeout: 4000 })).toBeTruthy();
    expect(doors.patches).toEqual([]);
  });

  test("a non-slot asset on a tile is ignored (never a foreign key)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    await screen.findByText("rev 1");
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: assetTransfer(JSON.stringify({ url: "/a.mp4", type: "video/mp4" })),
    });
    fireEvent.drop(tileLi("s_0"), { dataTransfer: assetTransfer("") });
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.patches).toEqual([]);
  });

  test("an OS image file on a tile uploads then patches", async () => {
    doors.specFields = {
      input_image: { type: "image", meta: { description: "Input image" } },
    };
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.specFields = {
      input_image: { type: "image", meta: { description: "Input image" } },
    };
    await screen.findByText("rev 1");
    const file = new File(["bytes"], "b.webp", { type: "image/webp" });
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: { types: ["Files"], getData: () => "", setData: () => {}, files: [file] },
    });
    await waitFor(() => { expect(doors.patches.length).toBeGreaterThan(0); });
    expect(doors.patches[doors.patches.length - 1]).toEqual({ input_image: "data/input/a.png" });
  });

  test("a foreign file on a tile is ignored (never uploaded)", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    await screen.findByText("rev 1");
    const file = new File(["%PDF"], "a.pdf", { type: "application/pdf" });
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: { types: ["Files"], getData: () => "", setData: () => {}, files: [file] },
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(doors.patches).toEqual([]);
  });

  test("a card with no image slot refuses honestly", async () => {
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    await screen.findByText("rev 1");
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: assetTransfer(JSON.stringify({ url: "/a.png", type: "image/png" })),
    });
    expect(await screen.findByText(/has no image slot/, {}, { timeout: 4000 })).toBeTruthy();
  });

  test("a dead attach write voices the fallback (never a throw past the drop)", async () => {
    doors.specFields = {
      input_image: { type: "image", meta: { description: "Input image" } },
    };
    doors.frames["drafts/patch"] = () => ({ thrown: "kablam" });
    mountBench([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    doors.specFields = {
      input_image: { type: "image", meta: { description: "Input image" } },
    };
    doors.frames["drafts/patch"] = () => ({ thrown: "kablam" });
    await screen.findByText("rev 1");
    fireEvent.drop(tileLi("s_0"), {
      dataTransfer: assetTransfer(JSON.stringify({ url: "/a.png", type: "image/png" })),
    });
    expect(await screen.findByText("attach refused", {}, { timeout: 4000 })).toBeTruthy();
  });
});
