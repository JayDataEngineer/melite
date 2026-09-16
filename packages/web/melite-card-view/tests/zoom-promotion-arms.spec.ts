// zoom-promotion-arms.spec.ts — createZoomPromotion's defensive arms
// the regression battery leaves uncovered (2026-09-16 burn-down):
//
//   null-doc      — overlayRoots / closeGlideWanted / gridNode / fit /
//                   arm all degrade on a null contentDocument (the
//                   document-swap gap the machine re-reads every pass).
//   hostile nodes — a throwing querySelector / rect / animate never
//                   wedges the machine (each catch is a shipped lesson).
//   stopped machine — sync/load after detach are no-ops; detach before
//                   the first arm starts no timer; attach on a loading
//                   doc arms on the load event, never early.
//   fit narrowing — documentElement null, missing scrollHeights, a null
//                   body (Math.max over 0 resizes nothing).
//   close glide   — the WAAPI keyframes + options are pinned byte-level;
//                   a dead rect skips the glide, a dead animate clears it.
//
// Pure fakes only (the module's contract): nullable docs, throwing
// nodes, manual mutation + tick + load triggers. Deep-equal on the
// recorded style/class/animate output.
import { describe, expect, test } from "vitest";
import {
  createZoomPromotion, FULLSCREEN_CLASS, GRID_PIN_SELECTOR,
  type PromotableFrameStyle, type ZoomPromotionDeps,
} from "../src/client/zoomPromotion.ts";

interface FakeRoot {
  querySelector(sel: string): unknown
}
interface FakeDoc {
  readyState: string
  querySelector(sel: string): unknown
  querySelectorAll?(sel: string): { forEach(cb: (el: unknown) => void): void }
  documentElement: { scrollHeight?: number } | null
  body: { scrollHeight?: number } | null
}

const OVERLAY_SEL = "[data-card-zoom-overlay]";
const CLOSING_SEL = "[data-card-closing]";

function overlayRoot(closing: boolean, hostile = false): FakeRoot {
  return {
    querySelector: (sel: string): unknown => {
      if (hostile) throw new Error("hostile node");
      if (sel === CLOSING_SEL) return closing ? {} : null;
      return null;
    },
  };
}

function style(): PromotableFrameStyle {
  return { position: "", inset: "", width: "", height: "", zIndex: "", background: "", transform: "", clipPath: "" };
}

interface Harness {
  promotion: ReturnType<typeof createZoomPromotion>
  frame: {
    contentDocument: unknown
    classList: { add(c: string): void; remove(c: string): void; has(c: string): boolean }
    style: PromotableFrameStyle
    getBoundingClientRect: (() => { left: number; top: number; width: number; height: number }) | undefined
    animate: ((kf: Record<string, string>[], o: { duration: number; easing: string; fill: FillMode }) => { cancel(): void }) | undefined
    addEventListener(type: string, fn: () => void): void
    removeEventListener(type: string, fn: () => void): void
  }
  animates: Array<{ kf: Record<string, string>[]; o: { duration: number; easing: string; fill: FillMode } }>
  cancels: () => number
  fireMutation(): void
  fireTick(): void
  fireLoad(): void
  observeOpts(): unknown
  clearCount(): number
  setDoc(d: FakeDoc | null): void
}

function makeHarness(opts: {
  doc?: FakeDoc | null
  roots?: FakeRoot[]
  throwOnQuery?: string | null
  rect?: (() => { left: number; top: number; width: number; height: number }) | null
  animate?: "ok" | "throw" | "absent"
  depsPatch?: Partial<ZoomPromotionDeps>
} = {}): Harness {
  let doc: FakeDoc | null = opts.doc === undefined
    ? {
      readyState: "complete",
      querySelector: (sel: string): unknown => {
        if (opts.throwOnQuery !== undefined && opts.throwOnQuery !== null && sel === opts.throwOnQuery) {
          throw new Error("hostile query");
        }
        if (sel === OVERLAY_SEL) return (opts.roots ?? []).length > 0 ? (opts.roots ?? [])[0] : null;
        if (sel === GRID_PIN_SELECTOR) return null;
        return null;
      },
      querySelectorAll: (sel: string): { forEach(cb: (el: unknown) => void): void } => ({
        forEach: (cb: (el: unknown) => void): void => {
          if (sel === OVERLAY_SEL) (opts.roots ?? []).forEach((r) => cb(r));
        },
      }),
      documentElement: { scrollHeight: 259 },
      body: { scrollHeight: 259 },
    }
    : opts.doc;
  const roots = opts.roots ?? [];
  void roots;
  const mutations: Array<() => void> = [];
  const ticks: Array<() => void> = [];
  const loads: Array<() => void> = [];
  let clears = 0;
  let cancelCalls = 0;
  const animates: Harness["animates"] = [];
  const classSet = new Set<string>();
  const st = style();
  let observeOpts: unknown;
  const rectFn = opts.rect === undefined ? undefined : opts.rect;
  const harness: Harness = {
    promotion: undefined as never,
    frame: {
      get contentDocument(): unknown { return doc; },
      set contentDocument(d: unknown) { doc = d as FakeDoc | null; },
      classList: {
        add: (c: string): void => { classSet.add(c); },
        remove: (c: string): void => { classSet.delete(c); },
        has: (c: string): boolean => classSet.has(c),
      },
      style: st,
      getBoundingClientRect: rectFn === null ? undefined : rectFn,
      animate: opts.animate === "absent"
        ? undefined
        : (kf, o) => {
          if (opts.animate === "throw") throw new Error("dead animation");
          animates.push({ kf, o });
          return { cancel: () => { cancelCalls++; } };
        },
      addEventListener: (type: string, fn: () => void): void => { if (type === "load") loads.push(fn); },
      removeEventListener: (type: string, fn: () => void): void => {
        if (type !== "load") return;
        const i = loads.indexOf(fn);
        if (i >= 0) loads.splice(i, 1);
      },
    },
    animates,
    cancels: () => cancelCalls,
    fireMutation: (): void => { mutations.forEach((cb) => cb()); },
    fireTick: (): void => { ticks.forEach((fn) => fn()); },
    fireLoad: (): void => { [...loads].forEach((fn) => fn()); },
    observeOpts: (): unknown => observeOpts,
    clearCount: () => clears,
    setDoc: (d: FakeDoc | null): void => { doc = d; },
  };
  const deps: ZoomPromotionDeps = {
    intervalMs: 500,
    setInterval: (fn) => { ticks.push(fn); return ticks.length; },
    clearInterval: () => { clears++; },
    MutationObserverCtor: class {
      constructor(cb: () => void) { mutations.push(cb); }
      observe(_t: unknown, o: unknown): void { observeOpts = o; }
      disconnect(): void {}
    } as unknown as ZoomPromotionDeps["MutationObserverCtor"],
    ...(opts.depsPatch ?? {}),
  };
  harness.promotion = createZoomPromotion(harness.frame as never, deps);
  return harness;
}

const RECT = { left: 50, top: 60, width: 200, height: 200 };

describe("null-doc degrade — every pass re-reads the frame", () => {
  test("a null doc ticks clean: no promote, no fit write, no throw", () => {
    const h = makeHarness({ doc: null, animate: "ok" });
    h.promotion.attach(); // readyState read on null → no arm; load listener waits
    h.fireLoad(); // arm with a null doc → no timer, no observer, no throw
    h.promotion.tick();
    h.promotion.sync();
    expect(h.promotion.isZoomOpen()).toBe(false);
    expect(h.frame.style.height).toBe("");
    expect(h.frame.classList.has(FULLSCREEN_CLASS)).toBe(false);
  });

  test("losing the doc mid-zoom clears within one tick (the stuck-slab cure)", () => {
    const h = makeHarness({ roots: [overlayRoot(false)], rect: () => RECT });
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    h.setDoc(null);
    h.fireTick();
    expect(h.promotion.isZoomOpen()).toBe(false);
    expect(h.frame.classList.has(FULLSCREEN_CLASS)).toBe(false);
  });

  test("detach with a null doc degrades the grid unpin (never wedges)", () => {
    const h = makeHarness({ roots: [overlayRoot(false)], rect: () => RECT });
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    h.setDoc(null);
    h.promotion.detach();
    expect(h.frame.classList.has(FULLSCREEN_CLASS)).toBe(false);
  });
});

describe("hostile nodes — a throwing seam never wedges the machine", () => {
  test("a throwing overlay root skips the close glide, zoom state holds", () => {
    const h = makeHarness({ roots: [overlayRoot(false, true)], animate: "ok", rect: () => RECT });
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    h.promotion.sync(); // maybeGlide: closeGlideWanted catches → no glide
    expect(h.animates).toHaveLength(0);
    expect(h.promotion.isZoomOpen()).toBe(true);
  });

  test("a throwing grid-pin query degrades the pin (the zoom still lands)", () => {
    const h = makeHarness({
      roots: [overlayRoot(false)], rect: () => RECT, throwOnQuery: GRID_PIN_SELECTOR,
    });
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    expect(h.frame.classList.has(FULLSCREEN_CLASS)).toBe(true);
  });

  test("a throwing rect at open still promotes (restBox degrades to null)", () => {
    const h = makeHarness({
      roots: [overlayRoot(false)],
      rect: () => { throw new Error("dead rect"); },
    });
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    expect(h.frame.style.position).toBe("fixed");
  });

  test("a dead rect at glide time skips the glide (from degrades to null)", () => {
    let calls = 0;
    const h = makeHarness({
      roots: [overlayRoot(true)], animate: "ok",
      rect: () => {
        calls++;
        if (calls > 1) throw new Error("rect died mid-close");
        return RECT;
      },
    });
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    h.promotion.sync();
    expect(h.animates).toHaveLength(0);
    expect(h.promotion.isZoomOpen()).toBe(true);
  });

  test("a throwing animate clears the glide (never wedges, never sticks)", () => {
    const h = makeHarness({
      roots: [overlayRoot(true)], animate: "throw",
      rect: (() => {
        let calls = 0;
        return () => {
          calls++;
          // the open captures the resting box; the close sees a bigger box
          return calls === 1 ? RECT : { left: 0, top: 0, width: 400, height: 400 };
        };
      })(),
    });
    h.promotion.attach();
    h.promotion.sync();
    expect(h.animates).toHaveLength(0);
    expect(h.promotion.isZoomOpen()).toBe(true);
  });
});

describe("close glide — the frame rides home, byte-pinned", () => {
  test("the glide keyframes + options land verbatim on the frame", () => {
    const h = makeHarness({
      roots: [overlayRoot(true)], animate: "ok",
      rect: (() => {
        let calls = 0;
        return () => {
          calls++;
          return calls === 1 ? RECT : { left: 0, top: 0, width: 400, height: 400 };
        };
      })(),
    });
    h.promotion.attach();
    h.promotion.sync();
    expect(h.animates).toEqual([{
      kf: [
        { transform: "translate(0px, 0px)", clipPath: "inset(0px 0px 0px 0px)" },
        { transform: "translate(50px, 60px)", clipPath: "inset(0px 200px 200px 0px)" },
      ],
      o: { duration: 300, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" },
    }]);
  });

  test("a settled frame glides nothing (sub-pixel deltas are rest)", () => {
    const h = makeHarness({ roots: [overlayRoot(true)], animate: "ok", rect: () => RECT });
    h.promotion.attach();
    h.promotion.sync();
    expect(h.animates).toHaveLength(0);
  });

  test("a card view (no overlay ever) never promotes, however often synced", () => {
    const h = makeHarness({ animate: "ok", rect: () => RECT });
    h.promotion.attach();
    h.promotion.sync();
    h.fireTick();
    h.fireMutation();
    expect(h.promotion.isZoomOpen()).toBe(false);
    expect(h.animates).toHaveLength(0);
    expect(h.frame.classList.has(FULLSCREEN_CLASS)).toBe(false);
  });
});

describe("mid-pass swap — the doc changes between the pass's own reads", () => {
  // THE CONTRACT UNDER TEST (the header: "the tick re-reads
  // frame.contentDocument every pass — never a stale doc"): one
  // syncZoom reads the frame SEVERAL times (the open read, the glide
  // read). A document swap landing BETWEEN those reads must degrade
  // to no-glide, never throw, never glide on a dead doc. The
  // scripted getter models the swap landing mid-pass.
  function swappingHarness(reads: Array<FakeDoc | null>): Harness {
    const h = makeHarness({ roots: [overlayRoot(true)], animate: "ok", rect: () => RECT });
    let n = 0;
    const base = h.frame.contentDocument;
    Object.defineProperty(h.frame, "contentDocument", {
      configurable: true,
      get: (): unknown => {
        n++;
        // reads[0] serves the open steady-state; reads[1] the glide
        // read of the second pass; the base doc serves the rest.
        if (n <= reads.length) return reads[n - 1];
        return base;
      },
      set: (d: unknown): void => { h.setDoc(d as never); },
    });
    return h;
  }

  function overlayDoc(): FakeDoc {
    return {
      readyState: "complete",
      querySelector: (sel: string): unknown => (sel === OVERLAY_SEL ? overlayRoot(true) : null),
      querySelectorAll: (sel: string): { forEach(cb: (el: unknown) => void): void } => ({
        forEach: (cb: (el: unknown) => void): void => {
          if (sel === OVERLAY_SEL) cb(overlayRoot(true));
        },
      }),
      documentElement: { scrollHeight: 259 },
      body: { scrollHeight: 259 },
    };
  }

  function emptyDoc(): FakeDoc {
    return {
      readyState: "complete",
      querySelector: (): unknown => null,
      querySelectorAll: (): { forEach(cb: (el: unknown) => void): void } => ({
        forEach: (): void => {},
      }),
      documentElement: { scrollHeight: 259 },
      body: { scrollHeight: 259 },
    };
  }

  test("the glide read landing on a null doc glides nothing (swap mid-pass)", () => {
    // attach consumes four reads (readyState, arm, the open read,
    // the grid read); pass 2's open read still sees the overlay, its
    // glide read sees the swap.
    const o = overlayDoc();
    const h = swappingHarness([o, o, o, o, o, null]);
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    h.promotion.sync();
    expect(h.animates).toHaveLength(0);
    expect(h.promotion.isZoomOpen()).toBe(true);
  });

  test("the glide read landing on an emptied doc glides nothing (unmount mid-pass)", () => {
    // the glide path reads the frame TWICE (its own null check, then
    // overlayRoots' re-read) — the swap covers both reads.
    const o = overlayDoc();
    const e = emptyDoc();
    const h = swappingHarness([o, o, o, o, o, e, e]);
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    h.promotion.sync();
    expect(h.animates).toHaveLength(0);
    expect(h.promotion.isZoomOpen()).toBe(true);
  });
});

describe("fit narrowing — zero heights resize nothing", () => {
  test("a null documentElement fits nothing", () => {
    const h = makeHarness({
      doc: {
        readyState: "complete",
        querySelector: () => null,
        documentElement: null,
        body: { scrollHeight: 300 },
      },
    });
    h.promotion.attach();
    h.fireTick();
    expect(h.frame.style.height).toBe("");
  });

  test("missing scrollHeights + a null body fit nothing (Math.max over 0)", () => {
    const h = makeHarness({
      doc: {
        readyState: "complete",
        querySelector: () => null,
        documentElement: {},
        body: null,
      },
    });
    h.promotion.attach();
    h.fireTick();
    expect(h.frame.style.height).toBe("");
  });

  test("a healthy doc fits its height", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.fireTick();
    expect(h.frame.style.height).toBe("259px");
  });
});

describe("stopped machine + load arming — the lifecycle arms", () => {
  test("sync after detach is a silent no-op", () => {
    const h = makeHarness({ roots: [overlayRoot(false)] });
    h.promotion.attach();
    expect(h.promotion.isZoomOpen()).toBe(true);
    h.promotion.detach();
    h.setDoc({
      readyState: "complete",
      querySelector: () => ({}),
      documentElement: { scrollHeight: 1 },
      body: { scrollHeight: 1 },
    });
    h.promotion.sync();
    // the stopped machine keeps its last state AND restores the slab:
    // an overlay arriving after detach never re-promotes
    expect(h.promotion.isZoomOpen()).toBe(true);
    expect(h.frame.classList.has(FULLSCREEN_CLASS)).toBe(false);
    expect(h.frame.style.position).toBe("");
  });

  test("load after detach never re-arms (no timer, no observer)", () => {
    const h = makeHarness();
    h.promotion.attach();
    h.promotion.detach();
    const clears = h.clearCount();
    h.promotion.load();
    h.fireTick();
    expect(h.clearCount()).toBe(clears);
    expect(h.frame.style.height).toBe("");
  });

  test("attach on a loading doc arms on the load event (never early)", () => {
    const h = makeHarness({
      doc: {
        readyState: "loading",
        querySelector: () => null,
        documentElement: { scrollHeight: 259 },
        body: { scrollHeight: 259 },
      },
    });
    h.promotion.attach();
    // not armed yet: ticks do nothing (no interval registered)
    h.fireTick();
    expect(h.frame.style.height).toBe("");
    h.fireLoad();
    expect(h.observeOpts()).toEqual({
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-card-closing"],
    });
    h.fireTick();
    expect(h.frame.style.height).toBe("259px");
  });

  test("detach before the first arm starts no timer (nothing to clear)", () => {
    const h = makeHarness({
      doc: {
        readyState: "loading",
        querySelector: () => null,
        documentElement: { scrollHeight: 259 },
        body: { scrollHeight: 259 },
      },
    });
    h.promotion.attach();
    h.promotion.detach();
    expect(h.clearCount()).toBe(0);
    // the late load finds a stopped machine: no re-arm, no throw
    h.fireLoad();
    expect(h.frame.style.height).toBe("");
  });
});
