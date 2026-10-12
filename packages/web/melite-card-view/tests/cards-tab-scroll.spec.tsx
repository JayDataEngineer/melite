// @vitest-environment happy-dom
// cards-tab-scroll.spec.tsx — THE TAB OWNS ITS SCROLL (operator volley
// 2026-10-24, items d+j: "errors flow above the visually available
// area" / "too much content and I can't scroll down"). The partial cure
// 5f627762 wrapped the three value branches in .tabScroll but left the
// early faces bare (a bare <p> / bare Fragments) and bound classes
// (css.failed/css.missing/css.loading) with NO rules in card.module.css
// (only .load/.runError/.rowError exist) — plus .tabScroll claimed the
// .zoomBody law without its flex half. A clipping host pane cut the TOP
// off when an error line grew the head and left the BOTTOM unreachable.
//
// THE WALL (law: every fix lands with an arm that reds on toggle):
//   D1 — a bounded 200px clipping host, a failed bench: the error strip
//        rides INSIDE the scroller, the seat scrolls (overflow-y:auto),
//        and a GROWING error does not move scrollTop.
//   J  — a 50-tile bench in the same bounded host: the last tile rides
//        inside the scroller and scroll-to-max keeps it (structural
//        proxy — happy-dom does no layout, see below).
//   CSS-CONTRACT — card.module.css carries .tabScroll (overflow-y:auto
//        + flex:1 1 0%) and the .failed/.missing/.loading rules.
//   UNIFORM — the early faces (hook-missing, valueless live/failed,
//        loading) ride the SAME scroll seat, never a bare Fragment.
// TOGGLES (each reds its arm, restore greens):
//   withTabScroll→Fragment revert reds D1/J/UNIFORM (no testid seat);
//   .failed-rule deletion reds the CSS arm; flex:1 1 0% removal reds it.
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { createElement as h } from "react";
import { readFileSync } from "node:fs";
import { CardsTab } from "../src/client/CardsTab.tsx";
import { schemaEnvelope } from '@melite/card-base/client';
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";
import { mountEstateFakes } from "./estate-harness.ts";
import { unbindEstateRemote } from '@melite/card-base/client';

let fakes: { calls: Array<{ method: string; args: Record<string, unknown> }>; unmount: () => void } | null = null;

function stubDoors(stages: BenchStageView[] = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }]): void {
  fakes?.unmount();
  fakes = mountEstateFakes({
    benchDoc: { draft_id: "bench-p", rev: 1, log: [], stages: stages.map((s) => ({ ...s })) },
    draftStages: stages.map((s) => ({ ...s }) as unknown as Record<string, unknown>),
    draftBenchRev: 1,
  });
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
      return new Response(JSON.stringify({}), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    if (path.includes("/v1/model-catalog")) {
      return new Response(JSON.stringify({ cards: {} }), {
        status: 200, headers: { "content-type": "application/json" },
      });
    }
    throw new Error("estate door on the fetch lane: " + path);
  });
}

afterEach(() => {
  cleanup();
  fakes?.unmount();
  fakes = null;
  unbindEstateRemote();
  vi.unstubAllGlobals();
});

function tabInfo(): () => unknown {
  return () => ({ tab: {
    kind: "sidebar.right.pane.tab", contentId: undefined,
    navigation: { address: "dsh-resource://cards/bench" },
    actions: { openResource: () => {} },
  } });
}

function benchValue(stages: BenchStageView[]): CardsBenchValue {
  return { kind: "bench", draftId: "bench-p", rev: 1, log: [], stages } as unknown as CardsBenchValue;
}

/** The clipping host pane: 200px tall, overflow hidden — the sidebar
 *  seat that cut the tab's top and stranded its bottom (items d+j). */
function mountInClip(stages: BenchStageView[], useResource: unknown): void {
  stubDoors(stages);
  render(h("div", { style: { height: "200px", overflow: "hidden" }, "data-testid": "clip-host" },
    h(CardsTab, { useTabInfo: tabInfo(), useResource } as never)));
}

function scroller(): HTMLElement {
  return screen.getByTestId("cards-tab-scroll");
}

/** card.module.css is the honest contract in happy-dom (no layout):
 *  slice a rule's declaration block out of the file text. */
function ruleBlock(law: string, selector: string): string | null {
  const at = law.indexOf(selector + " {");
  if (at < 0) return null;
  const end = law.indexOf("}", at);
  if (end < 0) return null;
  return law.slice(at, end + 1);
}

const LAW = "packages/web/melite-card-view/src/client/card.module.css";

describe("D1 — the error strip rides INSIDE the scroller and growth never moves it", () => {
  const stages: BenchStageView[] = [{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }];

  test("a failed bench voices INSIDE the scroll seat (never above it)", async () => {
    mountInClip(stages, () => ({
      status: "failed" as const, value: benchValue(stages), failure: new Error("engine cold"),
    }));
    const seat = scroller();
    expect(seat.className).toMatch(/tabScroll/);
    const err = await screen.findByTestId("cards-refresh-failed");
    expect(seat.contains(err)).toBe(true);
    // the seat IS the scroll owner — the CSS law (pinned verbatim in
    // the CSS-CONTRACT arm) gives it overflow-y:auto; the host clips.
    const host = screen.getByTestId("clip-host");
    expect(host.contains(seat)).toBe(true);
  });

  test("a GROWING error does not move scrollTop (the d-item: errors flowed above the visible area)", async () => {
    const shortMsg = "engine cold";
    const longMsg = "engine cold: " + "the head grew another line. ".repeat(20);
    const value = benchValue(stages);
    let msg = shortMsg;
    const useResource = (): unknown => ({ status: "failed" as const, value, failure: new Error(msg) });
    stubDoors(stages);
    const hostProps = { style: { height: "200px", overflow: "hidden" }, "data-testid": "clip-host" };
    const view = render(h("div", hostProps, h(CardsTab, { useTabInfo: tabInfo(), useResource } as never)));
    const seat = scroller();
    await screen.findByTestId("cards-refresh-failed");
    // the user has scrolled into the bench; the head's error strip
    // then grows (refresh failure with a longer voice).
    seat.scrollTop = 40;
    msg = longMsg;
    view.rerender(h("div", hostProps, h(CardsTab, { useTabInfo: tabInfo(), useResource } as never)));
    // the strip's seat is stable across the growth (testid, not an
    // exact-string match — the grown voice is ~600 chars and the
    // matcher's normalization chokes on it; the invariant is the
    // seat's survival, judged here).
    const grown = await screen.findByTestId("cards-refresh-failed");
    expect(grown.textContent).toContain("the head grew another line.");
    // the SAME seat node survived the patch (no remount jump) and the
    // grown strip stayed inside it — scrollTop untouched.
    expect(screen.getByTestId("cards-tab-scroll")).toBe(seat);
    expect(seat.contains(grown)).toBe(true);
    expect(seat.scrollTop).toBe(40);
  });
});

describe("J — a 50-tile bench scrolls to its last tile inside the seat", () => {
  test("scroll-to-max reveals the last tile (never stranded below the fold)", async () => {
    const stages: BenchStageView[] = Array.from({ length: 50 }, (_, i) => (
      { id: "s_" + i, card: "image-gen", engine: "comfyui", params: {} }
    ));
    mountInClip(stages, () => ({ status: "live" as const, value: benchValue(stages) }));
    const seat = scroller();
    // the stage tiles ride data-stage-id (the trailing + add tile rides
    // tileInner too but carries no stage id — count the bench's own).
    const tiles = document.querySelectorAll('[data-stage-id]');
    expect(tiles.length).toBe(50);
    const last = tiles[tiles.length - 1] as HTMLElement;
    expect(seat.contains(last)).toBe(true);
    // happy-dom does no layout (scrollHeight/clientHeight read 0), so
    // the wall mounts the pane's measured geometry the way filmSeam
    // mounts getBoundingClientRect — and judges the structural half:
    // the seat accepts and HOLDS scroll-to-max with the last tile
    // inside it (in a browser, the CSS overflow-y:auto + flex law —
    // pinned in the CSS-CONTRACT arm — makes that offset real).
    Object.defineProperty(seat, "scrollHeight", { value: 5200, configurable: true });
    Object.defineProperty(seat, "clientHeight", { value: 200, configurable: true });
    expect(seat.scrollHeight).toBeGreaterThan(seat.clientHeight);
    seat.scrollTop = seat.scrollHeight - seat.clientHeight;
    expect(seat.scrollTop).toBe(5000);
    expect(seat.contains(last)).toBe(true);
  });
});

describe("the CSS contract — the scroll seat and its faces exist on the stylesheet plane", () => {
  test(".tabScroll scrolls inside AND claims the .zoomBody flex half", async () => {
    const law = readFileSync(LAW, "utf8");
    const tab = ruleBlock(law, ".tabScroll");
    expect(tab, ".tabScroll must exist in card.module.css").not.toBeNull();
    expect(tab).toContain("overflow-y: auto");
    expect(tab).toContain("flex: 1 1 0%");
    expect(tab).toContain("height: 100%");
    expect(tab).toContain("min-height: 0");
    expect(tab).toContain("overflow-anchor: none");
  });

  test("css.failed/css.missing/css.loading are DEFINED (the strip's unstyled-<p> half of d+j)", async () => {
    const law = readFileSync(LAW, "utf8");
    const failed = ruleBlock(law, ".failed");
    expect(failed, "css.failed must exist in card.module.css").not.toBeNull();
    expect(failed).toContain("overflow-wrap: anywhere");
    expect(failed).toContain("margin: 0");
    const missing = ruleBlock(law, ".missing");
    expect(missing, "css.missing must exist in card.module.css").not.toBeNull();
    expect(missing).toContain("overflow-wrap: anywhere");
    expect(missing).toContain("margin: 0");
    const loading = ruleBlock(law, ".loading");
    expect(loading, "css.loading must exist in card.module.css").not.toBeNull();
    expect(loading).toContain("margin: 0");
  });
});

describe("the uniform law — EVERY early face rides the same scroll seat (no exempt branch)", () => {
  test("hook-missing, valueless live/failed, and loading faces each render inside the seat", async () => {
    // hook-missing: no resource hook at all.
    stubDoors();
    render(h(CardsTab, { useTabInfo: tabInfo(), useResource: null } as never));
    expect(scroller().textContent).toMatch("cards resource hook unavailable");
    cleanup();

    // valueless live: a broken provider voices LOUD, inside the seat.
    mountInClip([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      () => ({ status: "live" as const }));
    expect(scroller().textContent).toMatch("cards resource gave no value");
    cleanup();

    // valueless failed: the estate's own words, inside the seat.
    mountInClip([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      () => ({ status: "failed" as const, failure: new Error("door down") }));
    expect(scroller().textContent).toMatch("door down");
    cleanup();

    // loading: the wait face, inside the seat.
    mountInClip([{ id: "s_0", card: "image-gen", engine: "comfyui", params: {} }],
      () => ({ status: "loading" as const }));
    expect(scroller().textContent).toMatch(/loading .*…/);
  });
});
