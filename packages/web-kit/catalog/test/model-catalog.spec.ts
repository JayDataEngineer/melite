// model-catalog.spec.ts — the catalog client: loaders (cache/inflight/TTL/
// failures), ensureCatalog retry gating, primes, listeners, and every
// route/family selector. Module state starts null, so the null-cache
// no-arg battery runs FIRST (covers every `_cache ??` fallback); the
// ensure-failure sequence runs before the first success latches _loaded.
import { describe, it, beforeEach, afterEach } from "vitest";
import assert from "node:assert/strict";
import {
  activeVariantForRoute,
  axisCellExists,
  canvasDefaultModel,
  composeVariantRoute,
  controlnetTypesOf,
  dropdownModels,
  ensureCatalog,
  familiesForForm,
  familyAccepts,
  familyCardSummary,
  familyConditioning,
  familyGenre,
  familyHasVariantAxis,
  familyLabel,
  familyOf,
  familyOptionalOutputs,
  familyPrimaryRoute,
  familyTransformMatrix,
  formOf,
  getCachedCatalog,
  hiddenFromDropdown,
  isCatalogLoaded,
  loadCatalog,
  modelDescription,
  modelLabel,
  narrowGenre,
  onCatalogReady,
  presetsForRoute,
  primeCatalog,
  routeCoordinates,
  studioOf,
  variantLabel,
  variantSiblings,
  variantsForRoute,
} from "../src/modelCatalog.ts";
import type { Catalog, FamilyEntry } from "../src/modelCatalog.ts";
import { setContractToastSink } from "../src/contractToast.ts";
import { useCatalogContractStore } from "../src/catalogContractStore.ts";

const realFetch = globalThis.fetch;
const realNow = Date.now;
beforeEach(() => {
  // The contract store toasts once per outage message (latch) — reset so
  // every error-report test observes its own toast.
  useCatalogContractStore.getState().clear();
});
afterEach(() => {
  globalThis.fetch = realFetch;
  Date.now = realNow;
});

const captureToasts = (): { type: string; message: string }[] => {
  const out: { type: string; message: string }[] = [];
  setContractToastSink((type, message) => {
    out.push({ type, message });
  });
  return out;
};

const json = (v: unknown, status = 200): Response =>
  new Response(JSON.stringify(v), { status });
const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

// ── Fixtures ─────────────────────────────────────────────────────────────
const RICH = {
  families: {
    fA: {
      label: "Alpha", genre: "image", default_model: "a1", description: "dA",
      card_summary: "cs", accepts: ["acc"],
      transforms: [{ name: "t", applies_to: ["image"] }],
      video: { conditioning: ["first_frame"] },
      optional_outputs: ["o1"], studio: { name: "S" },
      variant_groups: { Variant: {} },
      modifiers: [{ kind: "controlnet", options: [{ value: "canny", label: "Canny" }] }],
    },
    fB: { label: "Beta", genre: "video", default_model: "hidden1", modifiers: null },
    fC: {},
    fD: { label: "Dee", default_model: "a1", variant_groups: { Quant: {} } },
    fE: { label: "Ee" },
    fZ: { label: "Zed" },
  },
  models: {
    b1: { family: "fB", form: "form_edit", label: "B One", edit_only: true },
    lone: { form: "form_generate", label: "Lone" },
    a1: {
      family: "fA", form: "form_generate", label: "A One", variant: "Turbo",
      quant: "fp8", canvas_default: true, presets: { ps1: {} },
      input_slots: ["voice_file"],
      variants: [
        { route: "a1q5", group: "Quant", quant: "q8" },
        { route: "a1nogroup" },
        { route: "a1", group: "Variant", quant: "fp8" },
      ],
    },
    a1raw: {
      family: "fA", form: "form_generate", label: "A Raw", variant: "Raw",
      variants: [{ route: "a1raw", group: "Quant", quant: "q8" }],
    },
    a1q5: { family: "fA", form: "form_generate", label: "A Q5", variant: "Turbo", quant: "q8", hide_from_dropdown: true },
    vl1: { family: "fA", form: "form_generate", label: "L1", variant_label: "V!" },
    emptyp: { family: "fA", form: "form_generate", label: "E", presets: {} },
    strobj: { family: "fA", form: "form_generate", label: "S", presets: "x" },
    b2: { family: "fB", form: "form_generate" },
    hidden1: { family: "fB", form: "form_generate", label: "H", hide_from_dropdown: true },
    c1: { family: "fC", form: "form_generate" },
    d1: { family: "fD", form: "form_generate", label: "D" },
    fE: { family: "fE", form: "form_generate", label: "FE" },
    e2: { family: "fE", form: "form_generate", label: "E2" },
    fA: { family: "fA", form: "form_generate", label: "FA" },
    p0: { form: "form_generate", label: "P0", variants: [{ route: "p0kid" }] },
    eo1: { family: "fB", form: "form_edit", label: "EO", edit_only: true },
    // Global-scan probes: models whose own variants omit themselves, so the
    // own-level lookup misses and the family-wide scan decides.
    soloA: { family: "fA", form: "form_generate", label: "SA", variants: [{ route: "zzz" }] },
    soloB: { family: "fA", form: "form_generate", label: "SB", variants: [{ route: "zzz" }] },
    host: {
      family: "fA", form: "form_generate", label: "H",
      variants: [{ route: "soloA", group: "Quant", quant: "q8" }, { route: "soloB" }],
    },
  },
  // A vocabulary payload exercises the load-time slot fold on every prime.
} as unknown as Catalog;

const NOFAM = { families: {}, models: { a1: { family: "fA" }, c1: {} } } as unknown as Catalog;
// No `families` key at all — the `cat.families?.` short-circuit arm.
const NOFAMABSENT = { models: { a1: { family: "fA" } } } as unknown as Catalog;

/** Minimal contract-valid payloads for the fetch paths. */
const VA = {
  families: { v1: { label: "V1" } },
  models: { m1: { family: "v1", form: "form_generate", label: "M1" } },
};
const VB = {
  ...VA,
};
const VC = {
  families: { v9: { label: "V9" } },
  models: { m9: { family: "v9", form: "form_generate", label: "M9" } },
};

describe("null-cache no-arg battery (module fresh)", () => {
  it("serves the empty defaults before any load", () => {
    assert.equal(isCatalogLoaded(), false);
    assert.equal(getCachedCatalog(), null);
    assert.equal(familyOf("x"), undefined);
    assert.equal(studioOf("x"), undefined);
    assert.equal(formOf("x"), undefined);
    assert.equal(familyLabel("x"), "x");
    assert.equal(familyGenre("x"), undefined);
    assert.deepEqual(familyAccepts("x"), []);
    assert.deepEqual(familyTransformMatrix("x"), {});
    assert.equal(familyCardSummary("x"), null);
    assert.equal(familyConditioning("x"), undefined);
    assert.deepEqual(familyOptionalOutputs("x"), []);
    assert.equal(canvasDefaultModel(), undefined);
    assert.equal(variantLabel("x"), "x");
    assert.deepEqual(familiesForForm("form_generate"), []);
    assert.equal(familyPrimaryRoute("x"), "x");
    assert.equal(modelLabel("x"), "x");
    assert.equal(modelDescription("x"), undefined);
    assert.deepEqual(dropdownModels(), []);
    assert.deepEqual(dropdownModels("f"), []);
    assert.deepEqual(variantSiblings(""), []);
    assert.deepEqual(hiddenFromDropdown(), new Set());
    assert.deepEqual(variantsForRoute("x"), []);
    assert.equal(presetsForRoute("x"), undefined);
    assert.equal(activeVariantForRoute("x"), undefined);
    assert.deepEqual(routeCoordinates("x"), { variant: undefined, quant: undefined });
    assert.equal(composeVariantRoute("x", {}), "x");
    assert.equal(axisCellExists("x", {}), true);
    assert.equal(familyHasVariantAxis("x"), false);
    assert.equal(narrowGenre("image"), "image");
    assert.equal(narrowGenre("bogus"), undefined);
  });
});

describe("selectors (explicit catalog)", () => {
  it("resolves routes through own entries and parent variants", () => {
    assert.equal(familyOf("a1", RICH), "fA");
    assert.equal(familyOf("a1q5", RICH), "fA");
    assert.equal(familyOf("lone", RICH), undefined);
    assert.equal(familyOf("p0kid", RICH), undefined);
    assert.equal(familyOf("ghost", RICH), undefined);
    assert.equal(familyOf("x", {} as Catalog), undefined);
    assert.equal(familyOf("x", null as unknown as Catalog), undefined);
    assert.equal(formOf("a1", RICH), "form_generate");
    assert.equal(formOf("a1q5", RICH), "form_generate");
    assert.equal(formOf("p0kid", RICH), "form_generate");
    assert.equal(formOf("ghost", RICH), undefined);
    assert.equal(formOf("x", {} as Catalog), undefined);
    assert.deepEqual(studioOf("a1", RICH), { name: "S" });
    assert.equal(studioOf("b1", RICH), undefined);
    assert.equal(studioOf("ghost", RICH), undefined);
    assert.equal(studioOf("a1", NOFAMABSENT), undefined);
  });

  it("labels, genres, and family views with fallbacks", () => {
    assert.equal(familyLabel("a1", RICH), "Alpha");
    assert.equal(familyLabel("c1", RICH), "c1");
    assert.equal(familyLabel("ghost", RICH), "ghost");
    assert.equal(familyLabel("a1", NOFAM), "a1");
    assert.equal(familyGenre("a1", RICH), "image");
    assert.equal(familyGenre("c1", RICH), undefined);
    assert.equal(familyGenre("lone", RICH), undefined);
    assert.deepEqual(familyAccepts("a1", RICH), ["acc"]);
    assert.deepEqual(familyAccepts("c1", RICH), []);
    assert.deepEqual(familyAccepts("ghost", RICH), []);
    assert.deepEqual(familyTransformMatrix("a1", RICH), { t: ["image"] });
    assert.deepEqual(familyTransformMatrix("b1", RICH), {});
    assert.equal(familyCardSummary("a1", RICH), "cs");
    assert.equal(familyCardSummary("b1", RICH), null);
    assert.deepEqual(familyConditioning("a1", RICH), ["first_frame"]);
    assert.equal(familyConditioning("b1", RICH), undefined);
    assert.equal(familyConditioning("ghost", RICH), undefined);
    assert.deepEqual(familyOptionalOutputs("fA", RICH), ["o1"]);
    assert.deepEqual(familyOptionalOutputs("fB", RICH), []);
  });

  it("model views with the label fallback chain", () => {
    assert.equal(variantLabel("vl1", RICH), "V!");
    assert.equal(variantLabel("a1", RICH), "A One");
    assert.equal(variantLabel("b2", RICH), "b2");
    assert.equal(variantLabel("ghost", RICH), "ghost");
    assert.equal(modelLabel("a1", RICH), "A One");
    assert.equal(modelLabel("b2", RICH), "Beta");
    assert.equal(modelLabel("c1", RICH), "c1");
    assert.equal(modelLabel("ghost", RICH), "ghost");
    assert.equal(modelLabel("c1", NOFAM), "c1");
    assert.equal(modelDescription("a1", RICH), "dA");
    assert.equal(modelDescription("b1", RICH), undefined);
    assert.equal(modelDescription("ghost", RICH), undefined);
    assert.equal(modelDescription("a1", NOFAM), undefined);
  });

  it("dropdowns, siblings, and the hidden set", () => {
    assert.deepEqual(dropdownModels("form_generate", RICH), [
      "a1", "a1raw", "b2", "c1", "d1", "e2", "emptyp",
      "fA", "fE", "host", "lone", "p0", "soloA", "soloB", "strobj", "vl1",
    ]);
    assert.deepEqual(dropdownModels("form_edit", RICH), ["b1", "eo1"]);
    assert.deepEqual(dropdownModels(undefined, RICH), [
      "a1", "a1raw", "b2", "c1", "d1", "e2", "emptyp",
      "fA", "fE", "host", "lone", "p0", "soloA", "soloB", "strobj", "vl1",
    ]);
    assert.deepEqual(
      [...variantSiblings("a1", RICH)].sort(),
      ["a1", "a1q5", "a1raw", "emptyp", "fA", "host", "soloA", "soloB", "strobj", "vl1"],
    );
    assert.deepEqual(variantSiblings("ghost", RICH), ["ghost"]);
    assert.deepEqual(hiddenFromDropdown(RICH), new Set(["a1q5", "hidden1"]));
    assert.equal(canvasDefaultModel(RICH), "a1");
    assert.equal(canvasDefaultModel({ families: {}, models: {} } as unknown as Catalog), undefined);
  });

  it("variants, presets, and the active-variant preference", () => {
    assert.equal(variantsForRoute("a1", RICH).length, 3);
    assert.equal(variantsForRoute("a1q5", RICH).length, 3);
    // A route owned only by its parent's list resolves through the parent.
    assert.deepEqual(variantsForRoute("p0kid", RICH), [{ route: "p0kid" }]);
    assert.deepEqual(variantsForRoute("ghost", RICH), []);
    assert.deepEqual(presetsForRoute("a1", RICH), { ps1: {} });
    assert.equal(presetsForRoute("emptyp", RICH), undefined);
    assert.equal(presetsForRoute("strobj", RICH), undefined);
    assert.equal(presetsForRoute("c1", RICH), undefined);
    // Quant-prefer hit, Variant-row fallback hit, groupless-row hit,
    // parent scan, and the two global-scan hits.
    assert.equal(activeVariantForRoute("a1raw", RICH)?.quant, "q8");
    assert.equal(activeVariantForRoute("a1", RICH)?.group, "Variant");
    assert.equal(activeVariantForRoute("a1nogroup", RICH)?.route, "a1nogroup");
    assert.equal(activeVariantForRoute("a1q5", RICH)?.quant, "q8");
    assert.equal(activeVariantForRoute("soloA", RICH)?.quant, "q8");
    assert.equal(activeVariantForRoute("soloB", RICH)?.route, "soloB");
    assert.equal(activeVariantForRoute("ghost", RICH), undefined);
  });

  it("coordinates, composition, and the existence check", () => {
    assert.deepEqual(routeCoordinates("a1", RICH), { variant: "Turbo", quant: "fp8" });
    assert.equal(routeCoordinates("a1raw", RICH).quant, "q8");
    assert.deepEqual(routeCoordinates("b1", RICH), { variant: undefined, quant: undefined });
    assert.deepEqual(routeCoordinates("ghost", RICH), { variant: undefined, quant: undefined });
    // Quant switch with an explicit tier, then via the target's tier.
    assert.equal(
      composeVariantRoute("a1", { group: "Quant", quant: "q8", route: "a1q5" }, RICH), "a1q5",
    );
    assert.equal(
      composeVariantRoute("a1", { group: "Quant", route: "a1raw" }, RICH), "a1q5",
    );
    // Variant switch: hit falls back to the clicked route when the cell is missing…
    assert.equal(
      composeVariantRoute("a1", { group: "Variant", route: "a1raw" }, RICH), "a1raw",
    );
    // …and lands on the current cell when the target carries no axes.
    assert.equal(composeVariantRoute("a1", { group: "Variant", route: "b2" }, RICH), "a1");
    assert.equal(composeVariantRoute("ghost", { route: "x" }, RICH), "x");
    assert.equal(composeVariantRoute("ghost", {}, RICH), "ghost");
    assert.equal(composeVariantRoute("a1", {}, RICH), "a1");
    assert.equal(
      axisCellExists("a1", { group: "Quant", route: "a1q5", quant: "q8" }, RICH), true,
    );
    assert.equal(axisCellExists("a1", { group: "Variant", route: "a1raw" }, RICH), false);
    assert.equal(axisCellExists("ghost", { route: "x" }, RICH), true);
    assert.equal(familyHasVariantAxis("a1", RICH), true);
    assert.equal(familyHasVariantAxis("b1", RICH), false);
    assert.equal(familyHasVariantAxis("ghost", RICH), false);
    assert.equal(familyHasVariantAxis("d1", RICH), false);
  });

  it("family options, primaries, and CN types", () => {
    const opts = familiesForForm("form_generate", RICH);
    assert.deepEqual(opts.map((o) => o.familyId), ["fA", "fB", "fC", "fD", "fE", "lone", "p0"]);
    assert.deepEqual(
      Object.fromEntries(opts.map((o) => [o.familyId, o.primaryRoute])),
      { fA: "a1", fB: "b2", fC: "c1", fD: "d1", fE: "fE", lone: "lone", p0: "p0" },
    );
    assert.equal(opts.find((o) => o.familyId === "fC")?.label, "fC");
    assert.deepEqual(familiesForForm("form_edit", RICH).map((o) => o.primaryRoute), ["b1"]);
    assert.equal(familyPrimaryRoute("a1", RICH), "a1");
    assert.equal(familyPrimaryRoute("e2", RICH), "fE");
    assert.equal(familyPrimaryRoute("d1", RICH), "d1");
    assert.equal(familyPrimaryRoute("ghost", RICH), "ghost");
    assert.deepEqual(controlnetTypesOf(
      RICH.families["fA"] as unknown as FamilyEntry,
    ), [{ type: "canny", label: "Canny" }]);
    assert.deepEqual(controlnetTypesOf(undefined), []);
    assert.deepEqual(controlnetTypesOf({} as FamilyEntry), []);
    assert.deepEqual(controlnetTypesOf({ modifiers: [{ kind: "lora", options: [] }] } as unknown as FamilyEntry), []);
    assert.deepEqual(controlnetTypesOf({ modifiers: [{ kind: "controlnet" }] } as unknown as FamilyEntry), []);
  });
});

describe("ensureCatalog gating (pre-load)", () => {
  it("returns while a load is already inflight", async () => {
    let resolveFetch!: (r: Response) => void;
    let calls = 0;
    globalThis.fetch = (() => {
      calls++;
      return new Promise<Response>((r) => {
        resolveFetch = r;
      });
    }) as typeof fetch;
    const p = loadCatalog();
    ensureCatalog(); // _inflight set → early return, no second fetch
    assert.equal(calls, 1);
    resolveFetch(new Response("bad", { status: 400 }));
    await assert.rejects(p);
  });

  it("reports a contract violation without scheduling a retry", async () => {
    const toasts = captureToasts();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return json({});
    }) as typeof fetch;
    ensureCatalog();
    await sleep(150);
    assert.equal(calls, 1);
    assert.equal(toasts.length, 1);
    assert.equal(isCatalogLoaded(), false);
  });

  it("schedules a 3s retry on a fetch failure", async () => {
    const toasts = captureToasts();
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("bad", { status: 400 });
    }) as typeof fetch;
    ensureCatalog();
    await sleep(150);
    assert.equal(calls, 1);
    assert.equal(toasts.length, 1);
    assert.equal(isCatalogLoaded(), false);
  });

  it("a racing manual ensure clears the pending retry and proves it", async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return json(VA);
    }) as typeof fetch;
    ensureCatalog(); // T1 pending → success clears it (then TRUE arm)
    await sleep(150);
    assert.equal(calls, 1);
    assert.equal(isCatalogLoaded(), true);
    assert.ok(getCachedCatalog() !== null);
    // T1 was cleared: no stray fetch may land for a full retry window.
    await sleep(3400);
    assert.equal(calls, 1);
    const before = calls;
    ensureCatalog(); // loaded → early return
    assert.equal(calls, before);
  });
});

describe("loadCatalog cache + inflight + TTL", () => {
  it("serves the fresh cache and honors explicit force flags", async () => {
    const cached = getCachedCatalog();
    assert.ok(cached !== null);
    globalThis.fetch = (async () => {
      throw new Error("must not fetch");
    }) as typeof fetch;
    assert.equal(await loadCatalog(), cached);
    assert.equal(await loadCatalog({ force: false }), cached);
  });

  it("force bypasses the cache and collapses concurrent loads", async () => {
    let calls = 0;
    let resolveFetch!: (r: Response) => void;
    globalThis.fetch = (async () => {
      calls++;
      return new Promise<Response>((r) => {
        resolveFetch = r;
      });
    }) as typeof fetch;
    const p1 = loadCatalog({ force: true });
    const p2 = loadCatalog({ force: true });
    assert.equal(calls, 1);
    resolveFetch(json(VA));
    const [a, b] = await Promise.all([p1, p2]);
    assert.equal(a, b);
  });

  it("reports violations, errors, and non-Error throws without caching", async () => {
    const toasts = captureToasts();
    globalThis.fetch = (async () => json({})) as typeof fetch;
    await assert.rejects(loadCatalog({ force: true }), /violations|contract/i);
    assert.equal(toasts.length, 1);
    globalThis.fetch = (async () => new Response("bad", { status: 400 })) as typeof fetch;
    await assert.rejects(loadCatalog({ force: true }), /400/);
    assert.equal(toasts.length, 2);
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw "boom-string";
      },
    })) as unknown as typeof fetch;
    await assert.rejects(loadCatalog({ force: true }), /boom-string/);
    assert.equal(toasts.length, 3);
    assert.match(toasts[2].message, /boom-string/);
  });

  it("background-refreshes an expired cache, replacing it on success", async () => {
    captureToasts();
    // Re-prime first: the TTL compares against the last success stamp, so
    // anchor it to real-now before skewing (a skewed stamp from an earlier
    // test would make this refresh look fresh).
    globalThis.fetch = (async () => json(VA)) as typeof fetch;
    await loadCatalog({ force: true });
    let notified = 0;
    const unsub = onCatalogReady(() => {
      notified++;
    });
    try {
      const stale = getCachedCatalog();
      Date.now = () => realNow() + 31_000;
      globalThis.fetch = (async () => json(VC)) as typeof fetch;
      const ret = await loadCatalog();
      assert.equal(ret, stale);
      await sleep(150);
      assert.equal(getCachedCatalog()?.families?.["v9"] !== undefined, true);
      assert.equal(notified, 1);
    } finally {
      Date.now = realNow;
      unsub();
    }
  });

  it("skips the background refresh while a load is inflight", async () => {
    globalThis.fetch = (async () => json(VA)) as typeof fetch;
    await loadCatalog({ force: true }); // anchor the stamp to real-now
    let calls = 0;
    let resolveFetch!: (r: Response) => void;
    globalThis.fetch = (async () => {
      calls++;
      return new Promise<Response>((r) => {
        resolveFetch = r;
      });
    }) as typeof fetch;
    try {
      Date.now = () => realNow() + 31_000;
      const stale = getCachedCatalog();
      const p = loadCatalog({ force: true });
      assert.equal(await loadCatalog(), stale);
      assert.equal(calls, 1);
      resolveFetch(json(VA));
      await p;
    } finally {
      Date.now = realNow;
    }
  });

  it("reports background failures and keeps serving the stale cache", async () => {
    const toasts = captureToasts();
    globalThis.fetch = (async () => json(VA)) as typeof fetch;
    await loadCatalog({ force: true }); // anchor the stamp to real-now
    const stale = getCachedCatalog();
    // Violation payload.
    Date.now = () => realNow() + 31_000;
    globalThis.fetch = (async () => json({})) as typeof fetch;
    assert.equal(await loadCatalog(), stale);
    await sleep(150);
    assert.equal(toasts.length, 1);
    // Fetch error.
    globalThis.fetch = (async () => new Response("bad", { status: 400 })) as typeof fetch;
    assert.equal(await loadCatalog(), stale);
    await sleep(150);
    assert.equal(toasts.length, 2);
    // Non-Error throw.
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => {
        throw "bg-string";
      },
    })) as unknown as typeof fetch;
    assert.equal(await loadCatalog(), stale);
    await sleep(150);
    assert.equal(toasts.length, 3);
    assert.match(toasts[2].message, /bg-string/);
    Date.now = realNow;
    assert.equal(getCachedCatalog(), stale);
  });
});

describe("primes, listeners, and the cached no-arg battery", () => {
  it("folds model slots, tolerates missing vocabularies, and notifies", () => {
    let good = 0;
    const unsub = onCatalogReady(() => {
      good++;
    });
    const unsubThrow = onCatalogReady(() => {
      throw new Error("listener fault");
    });
    try {
      // Models present (one with slots, one without, one null) → the fold
      // loops; models absent → the fold bails with {}.
      primeCatalog({
        families: {},
        models: { r1: { input_slots: ["s"] }, r2: {}, r3: null },
      } as unknown as Catalog);
      primeCatalog({ families: {} } as unknown as Catalog);
      // No vocabulary → the feed skips.
      primeCatalog({ families: {}, models: {} } as unknown as Catalog);
      primeCatalog(RICH);
      assert.equal(good, 4);
      unsub();
      unsubThrow();
      primeCatalog(RICH);
      assert.equal(good, 4);
    } finally {
      unsub();
      unsubThrow();
    }
  });

  it("resolves every selector through the live cache", () => {
    assert.equal(familyOf("a1"), "fA");
    assert.deepEqual(studioOf("a1"), { name: "S" });
    assert.equal(formOf("a1q5"), "form_generate");
    assert.equal(familyLabel("a1"), "Alpha");
    assert.equal(familyGenre("a1"), "image");
    assert.deepEqual(familyAccepts("a1"), ["acc"]);
    assert.deepEqual(familyTransformMatrix("a1"), { t: ["image"] });
    assert.equal(familyCardSummary("a1"), "cs");
    assert.deepEqual(familyConditioning("a1"), ["first_frame"]);
    assert.deepEqual(familyOptionalOutputs("fA"), ["o1"]);    assert.equal(canvasDefaultModel(), "a1");
    assert.equal(variantLabel("vl1"), "V!");
    assert.equal(familiesForForm("form_generate").length, 7);
    assert.equal(familyPrimaryRoute("a1"), "a1");
    assert.equal(modelLabel("a1"), "A One");
    assert.equal(modelDescription("a1"), "dA");
    assert.ok(dropdownModels().includes("a1"));
    assert.ok(variantSiblings("a1").includes("a1q5"));
    assert.ok(hiddenFromDropdown().has("a1q5"));
    assert.equal(variantsForRoute("a1").length, 3);
    assert.deepEqual(presetsForRoute("a1"), { ps1: {} });
    assert.equal(activeVariantForRoute("a1")?.group, "Variant");
    assert.deepEqual(routeCoordinates("a1"), { variant: "Turbo", quant: "fp8" });
    assert.equal(
      composeVariantRoute("a1", { group: "Quant", quant: "q8", route: "a1q5" }), "a1q5",
    );
    assert.equal(
      axisCellExists("a1", { group: "Quant", route: "a1q5", quant: "q8" }), true,
    );
    assert.equal(familyHasVariantAxis("a1"), true);
  });

  it("accepts a null prime (the feed's data-absent arm) as the last word", () => {
    primeCatalog(null as unknown as Catalog);
    assert.equal(getCachedCatalog(), null);
    assert.equal(isCatalogLoaded(), true);
  });
});
