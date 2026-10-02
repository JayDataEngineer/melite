// @vitest-environment happy-dom
/**
 * zoom-close.spec.tsx — zoom.tsx's dismiss arms (2026-09-16
 * burn-down): Escape closes, other keys stay quiet, the backdrop
 * click closes, card clicks never bubble-close. Renders the overlay
 * directly (the zoom-stop pattern); onClose is counted, never mocked.
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement as h } from "react";
import { CardZoomOverlay } from "../src/client/zoom.tsx";
import type { BenchStageView, CardsBenchValue } from "../src/client/cards-resource.ts";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const STAGE: BenchStageView = {
  id: "s_0", engine: "comfyui", card: "image-gen", title: "hero",
  params: { prompt: "a red cube" },
};
const BENCH: CardsBenchValue = {
  kind: "bench", draftId: "bench-main", rev: 7, stages: [STAGE], log: [],
  sessionKey: "main",
};

function mount(): { closes: () => number } {
  let closes = 0;
  vi.stubGlobal("fetch", async () => new Response("no", { status: 500 }));
  render(h(CardZoomOverlay, {
    stage: STAGE, bench: BENCH,
    running: false,
    onRun: () => {},
    onStop: () => {},
    onClose: () => { closes++; },
    onRemoved: () => {},
    onPatchParams: () => {},
    renderStageView: (_owner, fallback) => fallback,
    detail: () => h("div", null, "detail-body"),
  }));
  return { closes: () => closes };
}

function overlay(): HTMLElement {
  const el = document.querySelector('div[class*="zoomOverlay"]');
  if (el === null) throw new Error("no zoom overlay");
  return el as HTMLElement;
}

describe("the dismiss arms — Escape and backdrop close, nothing else", () => {
  test("Escape closes the zoom (never a trapped overlay)", async () => {
    const rec = mount();
    await screen.findByText("detail-body", {}, { timeout: 4000 });
    // The key rides the DOCUMENT, not the window: DSH's useModalLayer
    // owns the overlay's keyboard through a document-level listener
    // (one registration for the whole layer stack — a window listener
    // per overlay is the drift the hand-roll row named). The close
    // behavior is unchanged; where the event is dispatched changed
    // with the owner.
    fireEvent.keyDown(document, { key: "Escape" });
    expect(rec.closes()).toBe(1);
  });

  test("other keys stay quiet (never a stray dismiss)", async () => {
    const rec = mount();
    await screen.findByText("detail-body", {}, { timeout: 4000 });
    fireEvent.keyDown(window, { key: "a" });
    fireEvent.keyDown(window, { key: "Enter" });
    expect(rec.closes()).toBe(0);
  });

  test("a backdrop click closes (the target is the currentTarget)", async () => {
    const rec = mount();
    await screen.findByText("detail-body", {}, { timeout: 4000 });
    fireEvent.click(overlay());
    expect(rec.closes()).toBe(1);
  });

  test("a card click never bubble-closes (the target is the child)", async () => {
    const rec = mount();
    const body = await screen.findByText("detail-body", {}, { timeout: 4000 });
    fireEvent.click(body);
    expect(rec.closes()).toBe(0);
  });
});
