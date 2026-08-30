// zoom-promotion.test.ts -- the frame-sync state machine's regression battery.
//
// Every case here corresponds to a SHIPPED bug from the 2026-08-22
// operator reports (the logic lived untestable inside useSeamlessFrame
// until this extraction -- that testability gap IS how the bugs shipped):
//
//   stuck-slab      -- promotion stuck open after a DOCUMENT SWAP or a
//                      reload left a #17171c slab at z 2147483000 covering
//                      the right-sidebar toggle buttons ("weird background
//                      EVEN COVERS THE RIGHT SIDEBAR BUTTONS").
//   dead detection  -- an observer bound to a swapped-out document never
//                      fired again (the "left app rail" flash family).
//   frozen fit      -- zoomOpen gated fit(); height froze at 100vh.
//
// Pure fakes only: swappable documents, manual mutation + tick triggers.
// Run: cd dsh/melite-card-view && bun test tests/
import { describe, expect, test } from "bun:test";
import { createZoomPromotion, FULLSCREEN_CLASS, type ZoomPromotionDeps } from "../src/client/zoomPromotion";

interface FakeDoc {
  readyState: string
  querySelector: (sel: string) => unknown
  documentElement: { scrollHeight: number }
  body: { scrollHeight: number }
}

function fakeDoc(opts: { overlay?: boolean; preview?: boolean; height?: number } = {}): FakeDoc {
  const overlay = opts.overlay ?? false;
  const preview = opts.preview ?? false;
  const h = opts.height ?? 259;
  return {
    readyState: "complete",
    querySelector: (sel: string) => {
      if (sel === "[data-card-zoom-overlay]") return overlay ? {} : null;
      if (sel === "[data-asset-preview-dialog]") return preview ? {} : null;
      return null;
    },
    documentElement: { scrollHeight: h },
    body: { scrollHeight: h },
  };
}

function makeHarness(
  initialOverlay = false,
  depsPatch: Partial<ZoomPromotionDeps> = {},
) {
  let currentDoc = fakeDoc({ overlay: initialOverlay });
  const mutations: Array<() => void> = [];
  const ticks: Array<() => void> = [];
  const loads: Array<() => void> = [];
  let clearCount = 0;
  // The doc-swap helpers below must carry BOTH overlay flags -- a lightbox
  // closing over a STILL-OPEN drilldown is exactly the state under test.
  let flags = { overlay: initialOverlay, preview: false };
  const syncFlagsToDoc = (): void => { currentDoc = fakeDoc(flags); };
  const style = { position: "", inset: "", width: "", height: "", zIndex: "", background: "" };
  const classSet = new Set<string>();
  const frame = {
    get contentDocument(): Document | null { return currentDoc as unknown as Document; },
    set contentDocument(d: Document | null) { currentDoc = (d ?? fakeDoc()) as unknown as FakeDoc; },
    classList: {
      add: (c: string) => classSet.add(c),
      remove: (c: string) => classSet.delete(c),
      has: (c: string) => classSet.has(c),
    },
    style,
    addEventListener(type: string, fn: () => void) { if (type === "load") loads.push(fn); },
    removeEventListener(type: string, fn: () => void) { const i = loads.indexOf(fn); if (i >= 0) loads.splice(i, 1); },
  };
  const deps: ZoomPromotionDeps = {
    intervalMs: 500,
    setInterval: (fn, _ms) => { ticks.push(fn); return ticks.length; },
    clearInterval: () => { clearCount++; },
    MutationObserverCtor: class {
      constructor(cb: () => void) { mutations.push(cb); }
      observe(_t: unknown, _o: unknown) {}
      disconnect() {}
    } as unknown as ZoomPromotionDeps["MutationObserverCtor"],
    ...depsPatch,
  };
  const promotion = createZoomPromotion(frame as never, deps);
  return {
    promotion,
    frame,
    style,
    classHas: (c: string) => classSet.has(c),
    loadEvent: () => loads.forEach((fn) => fn()),
    fireMutation: () => mutations.forEach((cb) => cb()),
    tick: () => ticks.forEach((fn) => fn()),
    tickCount: () => ticks.length,
    clearCount: () => clearCount,
    /** THE document swap: the observer stays bound to the OLD doc. */
    hardSwapDoc: (opts: { overlay?: boolean }) => {
      flags = { overlay: opts.overlay ?? false, preview: false };
      currentDoc = fakeDoc(opts);
    },
    setOverlay: (v: boolean) => { flags.overlay = v; syncFlagsToDoc(); },
    /** The deck's trigger: the editor's asset lightbox mounts/unmounts. */
    setPreview: (v: boolean) => { flags.preview = v; syncFlagsToDoc(); },
  };
}

const promotedStyles = (s: { position: string; zIndex: string; background: string; width: string; height: string }) =>
  s.position === "fixed" && s.zIndex !== "" && s.background !== "" && s.width === "100vw" && s.height === "100vh";

describe("zoomPromotion", () => {
  test("overlay mounts -> promoted within one mutation; styles are the whole-page slab", () => {
    const h = makeHarness();
    h.promotion.attach(); // initial arm on a no-overlay doc
    expect(h.promoted_check).toBeUndefined();
    h.setOverlay(true);
    h.fireMutation();
    expect(promotedStyles(h.style)).toBe(true);
    expect(h.classHas(FULLSCREEN_CLASS)).toBe(true);
    expect(h.style.zIndex).toBe("2147483000");
  });

  test("overlay unmounts -> cleared and fit resumes", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.setOverlay(true);
    h.fireMutation();
    expect(promotedStyles(h.style)).toBe(true);
    h.setOverlay(false);
    h.fireMutation();
    expect(h.style.position).toBe("");
    expect(h.classHas(FULLSCREEN_CLASS)).toBe(false);
    // fit resumed: height carries the fake doc's scrollHeight
    expect(h.style.height).toBe("259px");
  });

  test("STUCK-SLAB KILLER: document swaps while promoted -> one tick clears it", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.setOverlay(true);
    h.fireMutation();
    expect(promotedStyles(h.style)).toBe(true);
    // The navigation swaps the document; the NEW doc has no overlay. The
    // old observer never fires (it is bound to the dead document) -- only
    // the tick re-reads frame.contentDocument and can see the truth.
    h.hardSwapDoc({ overlay: false });
    h.tick();
    expect(h.style.position).toBe("");
    expect(promotedStyles(h.style)).toBe(false);
  });

  test("RELOAD KILLER: reload while promoted -> fresh doc arms UNPROMOTED", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.setOverlay(true);
    h.fireMutation();
    expect(promotedStyles(h.style)).toBe(true);
    // A reload swaps in a FRESH document whose zoom state died with the old
    // one (the embed never persists an open drilldown). The load must arm
    // unpromoted AND STAY unpromoted across ticks -- the old stuck-slab bug
    // kept the slab alive here.
    h.hardSwapDoc({ overlay: false });
    h.loadEvent();
    expect(h.style.position).toBe("");
    for (let i = 0; i < 5; i++) h.tick();
    expect(h.style.position).toBe("");
    expect(h.promotion.isZoomOpen()).toBe(false);
  });

  test("card view (never an overlay) NEVER promotes, across many ticks", () => {
    const h = makeHarness();
    h.promotion.attach();
    for (let i = 0; i < 10; i++) h.tick();
    expect(h.style.position).toBe("");
    expect(h.style.height).toBe("259px"); // fit runs every tick instead
  });

  test("fit freezes while promoted, resumes after clear (no 100vh inline card)", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.setOverlay(true);
    h.fireMutation();
    const promotedHeight = h.style.height;
    expect(promotedHeight).toBe("100vh");
    h.setOverlay(false);
    h.fireMutation();
    expect(h.style.height).not.toBe("100vh");
  });

  test("idempotent sync: repeated syncs with unchanged state do not flip styles", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.setOverlay(true);
    h.fireMutation();
    const snapshot = JSON.stringify(h.style);
    for (let i = 0; i < 5; i++) { h.fireMutation(); h.tick(); }
    expect(JSON.stringify(h.style)).toBe(snapshot);
  });

  test("detach stops everything and restores styles (unmount mid-zoom)", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.setOverlay(true);
    h.fireMutation();
    expect(promotedStyles(h.style)).toBe(true);
    const clearsBefore = h.clearCount();
    h.promotion.detach();
    expect(h.style.position).toBe("");
    // post-detach mutations and ticks are inert
    h.setOverlay(true);
    h.fireMutation();
    h.tick();
    expect(h.style.position).toBe("");
    expect(h.clearCount()).toBeGreaterThanOrEqual(clearsBefore);
  });

  test("onDocReady fires on every arm AFTER the reset (bridge restart hook)", () => {
    const calls: number[] = [];
    const h = makeHarness();
    // rebuild with the hook via the same factory the component uses
    const p2 = createZoomPromotion(h.frame as never, {
      intervalMs: 500,
      setInterval: (fn, _ms) => { h.tickCount(); return 1; },
      clearInterval: () => {},
      MutationObserverCtor: class {
        constructor(_cb: () => void) {}
        observe(_t: unknown, _o: unknown) {}
        disconnect() {}
      } as unknown as ZoomPromotionDeps["MutationObserverCtor"],
      onDocReady: () => { calls.push(calls.length); },
    });
    p2.attach();
    h.loadEvent();
    h.loadEvent();
    expect(calls.length).toBe(3); // attach-arm + two loads
  });

  // ── 2026-08-25 deck bug ("THE LEFT SIDEBAR IS STILL VISIBLE") ─────────
  // The deck's editor opens the asset lightbox INSIDE its iframe; without
  // a promotion keyed on it, the black covered only the center column and
  // DSH's left sidebar stayed lit beside "fullscreen" image mode.

  test("DECK LIGHTBOX: preview dialog alone promotes with the #000 slab", () => {
    const h = makeHarness(false, {
      overlaySelectors: ["[data-asset-preview-dialog]"],
      fitHeight: false,
      background: "#000",
    });
    h.promotion.attach();
    expect(h.style.position).toBe("");
    h.setPreview(true);
    h.fireMutation();
    // promoted, and the slab is the lightbox's own black
    expect(promotedStyles(h.style)).toBe(true);
    expect(h.style.background).toBe("#000");
    expect(h.classHas(FULLSCREEN_CLASS)).toBe(true);
    h.setPreview(false);
    h.fireMutation();
    // cleared -- and NO inline height: fit is off for a CSS-sized frame
    expect(h.style.position).toBe("");
    expect(h.style.height).toBe("");
    expect(h.style.background).toBe("");
  });

  test("UNION (toolview): lightbox over the drilldown keeps the slab until BOTH close", () => {
    const h = makeHarness(false, {
      overlaySelectors: ["[data-card-zoom-overlay]", "[data-asset-preview-dialog]"],
    });
    h.promotion.attach();
    h.setOverlay(true);
    h.fireMutation();
    expect(promotedStyles(h.style)).toBe(true);
    // the lightbox layers ON TOP of the still-mounted drilldown...
    h.setPreview(true);
    h.fireMutation();
    expect(promotedStyles(h.style)).toBe(true);
    // ...and closing the lightbox alone returns to the promoted drilldown
    h.setPreview(false);
    h.fireMutation();
    expect(promotedStyles(h.style)).toBe(true);
    // only closing the drilldown drops the promotion (fit resumes)
    h.setOverlay(false);
    h.fireMutation();
    expect(h.style.position).toBe("");
    expect(h.style.height).toBe("259px");
  });

  test("fitHeight:false never writes an inline height across unpromoted ticks", () => {
    const h = makeHarness(false, {
      overlaySelectors: ["[data-asset-preview-dialog]"],
      fitHeight: false,
    });
    h.promotion.attach();
    for (let i = 0; i < 10; i++) h.tick();
    expect(h.style.height).toBe(""); // the column owns the size, not us
  });

  test("defaults are untouched: no options == the shipped toolview contract", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.setPreview(true); // the DEFAULT selector list ignores the lightbox
    h.fireMutation();
    h.tick();
    expect(h.style.position).toBe("");
    expect(h.style.height).toBe("259px"); // fit still runs
  });
});
