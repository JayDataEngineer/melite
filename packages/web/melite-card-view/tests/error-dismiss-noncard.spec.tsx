// @vitest-environment happy-dom
// error-dismiss-noncard.spec.tsx — THE NON-CARD SHARE OF THE DISMISS
// LAW (audit 017 C4, rows 14 + 18): the add-card door's failure lines
// and the cards tab's snapshot-failure lines carry the red × on the
// same grammar the drilldown faces pin (the catalog Button ghost sm +
// the close glyph, INSIDE the error's own element, aria "Dismiss
// error"). Two laws per face: (1) the press retires the LINE (the
// failed snapshot keeps its truth); (2) a NEW failure re-voices, and
// leaving the failed state re-arms — the silence never eats a fresh
// refusal.
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";

import { AddCardDoor } from "../src/client/add-card-door.tsx";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { resetStageWrites } from "../src/client/draft.ts";
import { unbindEstateRemote } from '@melite/card-base/client';
import { mountEstateFakes } from "./estate-harness.ts";

let fakes: ReturnType<typeof mountEstateFakes> | null = null;

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  resetStageWrites();
  vi.unstubAllGlobals();
});

/** The catalog door answers one action card; every other door fails
 *  loud (the estate fakes own the bench internals the tab mounts). */
function stubCatalog(): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    const path = String(url);
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {
        "image-gen": { label: "Image Gen", description: "makes images", genre: "image", families: ["image-gen"] },
        "upscale-tools": { label: "Upscale", description: "upscales", genre: "image", families: ["seedvr2-ema"] },
      } }), { status: 200, headers: { "content-type": "application/json" } });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

function mountDoor(): void {
  stubCatalog();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [] },
  });
  render(h(AddCardDoor, {
    sessionKey: "p",
    bench: {} as never,
    onAdded: () => {},
    onClose: () => {},
  }));
}

async function doorRow(label: string): Promise<HTMLElement> {
  const row = await screen.findByRole("button", { name: new RegExp(label) }, { timeout: 4000 });
  return row;
}

/** The failure line inside the door: a <p> of the error face class
 *  that owns exactly one dismiss ×. */
function doorFailureLine(): HTMLElement {
  const lines = Array.from(document.querySelectorAll("p")).filter((el) =>
    el.className.includes("runError") && el.querySelector('[aria-label="Dismiss error"]') !== null);
  expect(lines.length, "the door renders exactly one × -carrying failure line").toBe(1);
  return lines[0]! as HTMLElement;
}

describe("the add-card door's failure lines (audit 017 C4, row 14)", () => {
  test("PRESENCE + PLACEMENT: the catalog-failure line carries the × INSIDE its own element", async () => {
    // the catalog door itself refuses — the line renders inside the picker
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      if (String(url).includes("/v1/model-catalog")) {
        return new Response("upstream melite down", { status: 502 });
      }
      throw new Error("estate door on the fetch lane: " + String(url));
    });
    fakes = mountEstateFakes({ benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [] } });
    render(h(AddCardDoor, { sessionKey: "p", bench: {} as never, onAdded: () => {}, onClose: () => {} }));
    const line = await waitFor(() => {
      const el = Array.from(document.querySelectorAll("p")).find((p) =>
        p.className.includes("runError") && p.textContent!.length > 0);
      expect(el, "the catalog refusal renders as the door's failure line").toBeTruthy();
      return el! as HTMLElement;
    });
    const dismiss = within(line).getByRole("button", { name: "Dismiss error" });
    expect(line.contains(dismiss)).toBe(true);
  });

  test("the × retires the line; a fresh door re-voices (the dismissal never outlives the face)", async () => {
    // the catalog door itself refuses — the failure line exists to dismiss
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      if (String(url).includes("/v1/model-catalog")) {
        return new Response("upstream melite down", { status: 502 });
      }
      throw new Error("estate door on the fetch lane: " + String(url));
    });
    fakes = mountEstateFakes({ benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [] } });
    render(h(AddCardDoor, { sessionKey: "p", bench: {} as never, onAdded: () => {}, onClose: () => {} }));
    await waitFor(() => expect(doorFailureLine()).toBeTruthy());
    fireEvent.click(within(doorFailureLine()).getByRole("button", { name: "Dismiss error" }));
    expect(document.querySelectorAll('p[class*="runError"]').length).toBe(0);
    // the same door mounts fresh on the next open — the law re-arms
    cleanup();
    fakes?.unmount();
    fakes = mountEstateFakes({ benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [] } });
    render(h(AddCardDoor, { sessionKey: "p", bench: {} as never, onAdded: () => {}, onClose: () => {} }));
    await waitFor(() => expect(doorFailureLine()).toBeTruthy());
  });

  test("the add-failure line: the × retires it; picking again re-voices the NEW refusal", async () => {
    // catalog answers; every spec fetch (the add's form-spec seed) refuses
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      const path = String(url);
      if (path.includes("/v1/model-catalog")) {
        return new Response(JSON.stringify({ cards: {
          "image-gen": { label: "Image Gen", description: "makes images", genre: "image", families: ["image-gen"] },
          "upscale-tools": { label: "Upscale", description: "upscales", genre: "image", families: ["seedvr2-ema"] },
        } }), { status: 200, headers: { "content-type": "application/json" } });
      }
      throw new Error("estate door on the fetch lane: " + path);
    });
    fakes = mountEstateFakes({ benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [] } });
    render(h(AddCardDoor, { sessionKey: "p", bench: {} as never, onAdded: () => {}, onClose: () => {} }));
    const user = userEvent.setup();
    await user.click(await doorRow("Image Gen"));
    const line = await waitFor(() => {
      const el = Array.from(document.querySelectorAll("p")).find((p) =>
        p.className.includes("runError") && (p.textContent ?? "").includes("Image Gen"));
      expect(el, "the pick's refusal renders as the door's failure line").toBeTruthy();
      return el! as HTMLElement;
    });
    fireEvent.click(within(line).getByRole("button", { name: "Dismiss error" }));
    expect(document.querySelectorAll('p[class*="runError"]').length).toBe(0);
    // a NEW pick re-voices — the second card's refusal is its own line
    await user.click(await doorRow("Upscale"));
    const again = await waitFor(() => {
      const el = Array.from(document.querySelectorAll("p")).find((p) =>
        p.className.includes("runError") && (p.textContent ?? "").includes("Upscale"));
      expect(el, "the second pick's refusal re-voices").toBeTruthy();
      return el! as HTMLElement;
    });
    expect(within(again).getByRole("button", { name: "Dismiss error" })).toBeTruthy();
  });
});

// ── THE SNAPSHOT-FAILURE LINES (audit 017 C4, row 18) ────────────

const cleanStage = (): unknown =>
  ({ id: "s_0", card: "image-gen", engine: "comfyui", params: { prompt: "a red cube" } });

function mountFailedTab(failure: string): void {
  vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
    throw new Error("estate door on the fetch lane: " + String(url));
  });
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [cleanStage()] },
  });
  const value = { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [cleanStage()] };
  render(h(CardsTab, {
    useTabInfo: () => ({
      tab: {
        kind: "sidebar.right.pane.tab", contentId: undefined,
        navigation: { address: "dsh-resource://cards/bench" },
        actions: { openResource: () => {} },
      },
    }),
    useResource: () => ({ status: "failed" as const, value: value as never, failure: new Error(failure) }),
  } as never));
}

function refreshFailedLine(): HTMLElement {
  return screen.getByTestId("cards-refresh-failed");
}

describe("the snapshot-failure lines (audit 017 C4, row 18)", () => {
  test("PRESENCE + PLACEMENT: the refresh-failed line carries the × INSIDE its own element", async () => {
    mountFailedTab("engine cold");
    await waitFor(() => expect(refreshFailedLine()).toBeTruthy());
    const line = refreshFailedLine();
    expect(line.textContent).toContain("engine cold");
    const dismiss = within(line).getByRole("button", { name: "Dismiss error" });
    expect(line.contains(dismiss)).toBe(true);
  });

  test("the × retires the LINE — the failed snapshot's body keeps its truth", async () => {
    mountFailedTab("engine cold");
    await waitFor(() => expect(refreshFailedLine()).toBeTruthy());
    fireEvent.click(within(refreshFailedLine()).getByRole("button", { name: "Dismiss error" }));
    expect(screen.queryByTestId("cards-refresh-failed")).toBeNull();
  });

  test("the silence is per failure text: new words re-voice; leaving failed re-arms", async () => {
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      throw new Error("estate door on the fetch lane: " + String(url));
    });
    fakes = mountEstateFakes({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [cleanStage()] },
    });
    const value = { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages: [cleanStage()] };
    const snap = (status: "failed" | "live", failure?: string) => ({
      useTabInfo: () => ({
        tab: {
          kind: "sidebar.right.pane.tab", contentId: undefined,
          navigation: { address: "dsh-resource://cards/bench" },
          actions: { openResource: () => {} },
        },
      }),
      useResource: () => status === "failed"
        ? { status, value: value as never, failure: new Error(failure) }
        : { status, value: value as never },
    });
    const view = render(h(CardsTab, { ...snap("failed", "engine cold") } as never));
    await waitFor(() => expect(refreshFailedLine()).toBeTruthy());
    fireEvent.click(within(refreshFailedLine()).getByRole("button", { name: "Dismiss error" }));
    // the SAME words stay retired across re-renders
    view.rerender(h(CardsTab, { ...snap("failed", "engine cold") } as never));
    expect(screen.queryByTestId("cards-refresh-failed")).toBeNull();
    // NEW words re-voice — the silence never eats a fresh refusal
    view.rerender(h(CardsTab, { ...snap("failed", "weights file went missing") } as never));
    expect(refreshFailedLine().textContent).toContain("weights file went missing");
    // leaving `failed` re-arms: the same words fail loud on their next arrival
    fireEvent.click(within(refreshFailedLine()).getByRole("button", { name: "Dismiss error" }));
    view.rerender(h(CardsTab, { ...snap("live") } as never));
    view.rerender(h(CardsTab, { ...snap("failed", "weights file went missing") } as never));
    expect(refreshFailedLine().textContent).toContain("weights file went missing");
  });
});

// the valueless failed arm (no last-good frame): the same law, the
// other face — cards-tab-body.tsx's no-value snapshot refusal
describe("the valueless snapshot-failure face (audit 017 C4, row 18)", () => {
  test("the no-value failure line carries the × and the press retires it", async () => {
    vi.stubGlobal("fetch", async (url: unknown): Promise<Response> => {
      throw new Error("estate door on the fetch lane: " + String(url));
    });
    fakes = mountEstateFakes({
      benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: [cleanStage()] },
    });
    render(h(CardsTab, {
      useTabInfo: () => ({
        tab: {
          kind: "sidebar.right.pane.tab", contentId: undefined,
          navigation: { address: "dsh-resource://cards/bench" },
          actions: { openResource: () => {} },
        },
      }),
      useResource: () => ({ status: "failed" as const, failure: new Error("bench ensure refused") }),
    } as never));
    const line = await waitFor(() => {
      const el = Array.from(document.querySelectorAll("p")).find((p) =>
        p.className.includes("failed") && (p.textContent ?? "").includes("bench ensure refused"));
      expect(el, "the valueless refusal renders its failure line").toBeTruthy();
      return el! as HTMLElement;
    });
    fireEvent.click(within(line).getByRole("button", { name: "Dismiss error" }));
    expect(document.contains(line)).toBe(false);
  });
});
