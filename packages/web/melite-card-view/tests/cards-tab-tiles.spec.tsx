// @vitest-environment happy-dom
// cards-tab-tiles.spec.tsx — the tile chrome (2026-09-16 burn-down,
// installment 3f): every tile face the rail can show — the media
// faces (audio bars, video hero, image thumb, kind fallback), the
// running fold (spinner with/without the progress percent, the
// zero-max guard), the wiring marks (⛓ for a source edge, 📎 for an
// attached source, ⟵ for the resolved upstream), and the caption
// (prompt slice, service name).
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { mountEstateFakes, type EstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from "@melite/card-base/estate-remote";
import { CardsTab } from "../src/client/CardsTab.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

const CARD_MIME = "application/x-melite-card";
const ASSET_MIME = "application/tech-noir-asset";

afterEach(() => {
  cleanup();
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

// THE ONE-FAKE LAW (stroke 81): estate verbs ride the bound
// namespaces (mountEstateFakes); fetch answers ONLY the /v1
// discovery doors. The harness's managed bench rows serve the
// mounted stages, so the rail reads the doc seats live.
let fakes: EstateFakes | null = null;

function calls(): Array<{ method: string; args: Record<string, unknown> }> {
  if (fakes === null) throw new Error("estate fakes not mounted");
  return fakes.calls;
}

function stubFetch(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/form-spec")) {
      return new Response(JSON.stringify({
        form: "image-gen", genre: "image", engine: "comfyui", schema: { kind: "object", properties: {} },
      }), { status: 200, headers: { "content-type": "application/json" } });
    }
    if (path.includes("/v1/forms")) {
      return new Response(JSON.stringify({
        "image-gen": { outputs: { default: "image" } },
        tts: { outputs: { default: "audio" } },
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

// the rail reads the served doc (the drill reads the snapshot) —
// faces ride the doc seats
function mountTiles(docStages: BenchStageView[]): void {
  stubFetch();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: docStages },
    draftStages: docStages as Array<Record<string, unknown>>,
    draftBenchRev: 1,
  });
  const value: CardsBenchValue = { kind: "bench", draftId: "bench-p", sessionKey: "p", rev: 1, log: [], stages: docStages };
  render(h(CardsTab, {
    useTabInfo: () => ({ tab: {
      kind: "sidebar.right.pane.tab", contentId: undefined,
      navigation: { address: "dsh-resource://cards/bench" },
      actions: { openResource: () => {} },
    } }),
    useResource: () => ({ status: "live" as const, value }),
  } as never));
}

function tile(): HTMLElement {
  const el = document.querySelector('li[data-stage-id="s_0"]');
  if (el === null) throw new Error("tile s_0 not found");
  return el as HTMLElement;
}

async function tileReady(): Promise<HTMLElement> {
  await waitFor(() => { expect(tile()).toBeTruthy(); });
  await new Promise((r) => setTimeout(r, 200));
  return tile();
}

describe("the tile media faces — the artifact's kind owns the face", () => {
  test("an audio result never reaches an image tag (bars, not a broken image)", async () => {
    mountTiles([{ id: "s_0", card: "tts", engine: "comfyui", params: {}, result: { url: "/x.wav" } }]);
    const el = await tileReady();
    expect(el.querySelector('[data-testid="tile-face-audio"]')).not.toBeNull();
    expect(el.querySelector("img")).toBeNull();
  });

  test("a video result heroes the tile (muted, metadata-only)", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/x.mp4" } }]);
    const el = await tileReady();
    const hero = el.querySelector('[data-testid="tile-face-video"]');
    expect(hero).not.toBeNull();
    expect((hero as HTMLVideoElement).muted).toBe(true);
  });

  test("an image result thumbs the tile", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, result: { url: "/x.png" } }]);
    const el = await tileReady();
    const img = el.querySelector("img");
    expect(img).not.toBeNull();
    expect((img as HTMLImageElement).getAttribute("src")).toBe("/x.png");
  });

  test("a bare filename cannot resolve (the kind face rides instead)", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, result: { url: "run-relative.png" } }]);
    const el = await tileReady();
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("video")).toBeNull();
    expect(el.textContent ?? "").toContain("Image Gen");
  });

  test("a faceless row shows its kind (initial + name, never blank)", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    const el = await tileReady();
    expect(el.textContent ?? "").toContain("Image Gen");
  });
});

describe("the running fold — the spinner persists, the percent rides along", () => {
  test("a running row spins without a percent when the tap is silent", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running" }]);
    const el = await tileReady();
    expect(el.querySelector('[data-testid="tile-spin"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="tile-progress"]')).toBeNull();
  });

  test("a tapping run percents the spinner (floored, never a fraction)", async () => {
    mountTiles([{
      id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running",
      result: { progress: { value: 1, max: 2 } },
    }]);
    const el = await tileReady();
    expect(el.querySelector('[data-testid="tile-progress"]')?.textContent).toBe("50%");
  });

  test("a zero-max tap spins on (never a divide-by-zero face)", async () => {
    mountTiles([{
      id: "s_0", card: "image-gen", engine: "comfyui", params: {}, runStatus: "running",
      result: { progress: { value: 5, max: 0 } },
    }]);
    const el = await tileReady();
    expect(el.querySelector('[data-testid="tile-spin"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="tile-progress"]')).toBeNull();
  });
});

describe("the wiring marks — edges read at a glance", () => {
  test("a source edge chains (⛓) and names its upstream (⟵ card)", async () => {
    mountTiles([
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_0", card: "upscaler", engine: "comfyui", params: {}, inputs: { source: { stage: "s_1" } } },
    ]);
    const el = await tileReady();
    expect(el.textContent ?? "").toContain("⛓");
    expect(el.textContent ?? "").toContain("⟵ image-gen");
  });

  test("an upstream without a card falls to its id (never blank)", async () => {
    mountTiles([
      { id: "s_1", engine: "comfyui", params: {} } as BenchStageView,
      { id: "s_0", card: "upscaler", engine: "comfyui", params: {}, inputs: { source: { stage: "s_1" } } },
    ]);
    const el = await tileReady();
    expect(el.textContent ?? "").toContain("⟵ s_1");
  });

  test("a dangling edge marks the chain but names nothing", async () => {
    mountTiles([
      { id: "s_0", card: "upscaler", engine: "comfyui", params: {}, inputs: { source: { stage: "s_gone" } } },
    ]);
    const el = await tileReady();
    expect(el.textContent ?? "").toContain("⛓");
    expect(el.textContent ?? "").not.toContain("⟵");
  });

  test("an attached source clips on (📎)", async () => {
    mountTiles([
      { id: "s_0", card: "upscaler", engine: "comfyui", params: { image: "data/input/x.png" } },
    ]);
    const el = await tileReady();
    expect(el.querySelector('[title="source attached"]')).not.toBeNull();
  });

  test("a plain row carries neither mark", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    const el = await tileReady();
    expect(el.querySelector('[title="source wired"]')).toBeNull();
    expect(el.querySelector('[title="source attached"]')).toBeNull();
  });
});

describe("the caption — prompt slice and service name", () => {
  test("the prompt reads under the title (the service beside it)", async () => {
    mountTiles([{
      id: "s_0", card: "image-gen", engine: "comfyui",
      params: { prompt: "a red barn at dusk" },
    }]);
    const el = await tileReady();
    expect(el.textContent ?? "").toContain("a red barn at dusk");
    expect(el.textContent ?? "").toContain("Comfyui");
  });

  test("null inputs mark nothing (null is an object, the guard knows)", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, inputs: null } as never]);
    const el = await tileReady();
    expect(el.querySelector('[title="source wired"]')).toBeNull();
  });

  test("sourceless inputs mark nothing (the edge, not the bag)", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {}, inputs: { seed: 7 } }]);
    const el = await tileReady();
    expect(el.querySelector('[title="source wired"]')).toBeNull();
  });
});

describe("the tile drop guards — malformed and typeless payloads drop silent", () => {
  function tileLi(id: string): HTMLElement {
    const li = document.querySelector(`li[data-stage-id="${id}"]`);
    if (li === null) throw new Error("tile missing: " + id);
    return li as HTMLElement;
  }

  function assetTransfer(payload: string): Record<string, unknown> {
    return { types: [ASSET_MIME], getData: () => payload, setData: () => {}, files: [] };
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

  test("a malformed asset payload never parses (never a throw past the gesture)", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    await tileReady();
    fireEvent.drop(tileLi("s_0"), { dataTransfer: assetTransfer("{not json") });
    await new Promise((r) => setTimeout(r, 100));
    expect(calls().some((p) => p.method === "drafts/patch")).toBe(false);
  });

  test("a typeless asset never attaches (the kind gate holds)", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    await tileReady();
    fireEvent.drop(tileLi("s_0"), { dataTransfer: assetTransfer(JSON.stringify({ url: "/a.png" })) });
    await new Promise((r) => setTimeout(r, 100));
    expect(calls().some((p) => p.method === "drafts/patch")).toBe(false);
  });

  test("dropping on the add seat never reorders (the tail guard holds)", async () => {
    mountTiles([
      { id: "add", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
    ]);
    await tileReady();
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    fireEvent.drop(tileLi("add"), { dataTransfer: cardDrag("s_0") });
    await new Promise((r) => setTimeout(r, 100));
    expect(calls().some((p) => p.method === "bench/reorder")).toBe(false);
  });

  test("a ghost id never splices (the index guard holds)", async () => {
    mountTiles([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]);
    await tileReady();
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_gone") });
    fireEvent.drop(tileLi("s_0"), { dataTransfer: cardDrag("s_gone") });
    await new Promise((r) => setTimeout(r, 100));
    expect(calls().some((p) => p.method === "bench/reorder")).toBe(false);
  });

  test("a revless reorder still lands (the estate's rev is a hint, never a lock)", async () => {
    mountTiles([
      { id: "s_0", card: "image-gen", engine: "comfyui", params: {} },
      { id: "s_1", card: "image-gen", engine: "comfyui", params: {} },
    ]);
    await tileReady();
    fireEvent.dragStart(tileLi("s_0"), { dataTransfer: cardDrag("s_0") });
    fireEvent.drop(tileLi("s_1"), { dataTransfer: cardDrag("s_0") });
    await waitFor(() => {
      expect(calls().some((p) => p.method === "bench/reorder")).toBe(true);
    });
  });
});
