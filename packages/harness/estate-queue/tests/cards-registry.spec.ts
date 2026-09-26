// cards-registry.spec.ts — the CardRegistryService's every arm
// (TEST-2 breadth, the deterministic census of 2026-09-19): the
// unprimed refusals, the lazy facts/decls/mids reads, the family
// resolution lens, the presence-served board, the admission gate's
// verdicts, the resolved-serve degrade, the miswire voice, and the
// provider prime. composeOnce rides a seam fake (the engine graph
// compose has its own seat elsewhere).
import { describe, it, expect, vi, beforeAll } from "vitest";

const composeOnce = vi.hoisted(() =>
  vi.fn(async (): Promise<Record<string, unknown>> => ({ graph: true })),
);
vi.mock("../src/cardsCompose.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/cardsCompose.ts")>();
  return { ...real, composeOnce };
});

import { Context } from "@deepseek-ai/cordis";
import { EnginesService } from "@melite/engine-contract";
import {
  CardRegistryService,
  cardRegistryProvider,
  needCardRegistry,
  familyFace,
} from "../src/cardsRegistry.ts";

let svc: CardRegistryService;
let ctx: Context;

beforeAll(async () => {
  ctx = new Context();
  svc = new CardRegistryService(ctx);
  await svc.prime();
});

describe("familyFace (the label law)", () => {
  it("a registered family serves its DECL label; an unknown id degrades to itself", () => {
    expect(familyFace("anny")).not.toBe("anny");
    expect(familyFace("not-a-family-id")).toBe("not-a-family-id");
  });
});

describe("the unprimed refusals (LOUD, never a fallback)", () => {
  it("defsSync and readsSync refuse before prime", async () => {
    const c2 = new Context();
    const fresh = new CardRegistryService(c2);
    expect(() => fresh.defsSync()).toThrow(/unprimed/);
    expect(() => fresh.readsSync()).toThrow(/unprimed/);
    await Promise.resolve();
  });
});

describe("the lazy reads", () => {
  it("defsSync serves the primed card definitions", () => {
    expect(svc.defsSync().size).toBeGreaterThan(0);
  });
  it("modelFacts derives once and caches; cardDecls derives from defs+facts and caches", () => {
    const facts = svc.modelFacts();
    expect(Object.keys(facts).length).toBeGreaterThan(0);
    expect(svc.modelFacts()).toBe(facts, "the facts cache returns the identical record");
    const decls = svc.cardDecls();
    expect(Object.keys(decls).length).toBeGreaterThan(0);
    expect(svc.cardDecls()).toBe(decls, "the decls cache returns the identical record");
  });
  it("cardDecls with caller facts derives fresh, never the cache", () => {
    const cached = svc.cardDecls();
    const fresh = svc.cardDecls({});
    expect(fresh).not.toBe(cached);
  });
  it("objectInfo mirrors the engine's reachability (both truths legal, always consistent)", async () => {
    const up: boolean = await svc.primeObjectInfo();
    if (up) {
      expect(typeof svc.objectInfo()).toBe("object");
      expect(svc.objectInfo()).not.toBeNull();
    } else {
      expect(svc.objectInfo()).toBeNull();
    }
  });
  it("modelMids serves the live catalog scan order, cached", () => {
    const mids = svc.modelMids();
    expect(mids.size).toBeGreaterThan(0);
    expect(svc.modelMids()).toBe(mids);
  });
  it("resetForTests drops every lazy read (the walls seam)", async () => {
    const c2 = new Context();
    const fresh = new CardRegistryService(c2);
    await fresh.prime();
    fresh.resetForTests();
    expect(() => fresh.defsSync()).toThrow(/unprimed/);
    await Promise.resolve();
  });
});

describe("resolveCardFamily (the route lens)", () => {
  it("a facts table id is itself; an unknown id falls back to itself", () => {
    const facts = svc.modelFacts();
    const one = Object.keys(facts)[0] as string;
    expect(svc.resolveCardFamily(one)).toBe(one);
    expect(svc.resolveCardFamily("ghost-mid")).toBe("ghost-mid");
  });
  it("the live H3 timeline route folds to the h3 family row", () => {
    expect(svc.resolveCardFamily("h3-timeline")).toBe("h3");
  });

  it("a route row folds only through a declared owner", () => {
    const table = {
      route: { defaults: { model: "owner" } },
      owner: { defaults: {} },
      self: { defaults: { model: "self" } },
      ghost: { defaults: { model: "missing" } },
    } as never;
    expect(svc.resolveCardFamily("route", table)).toBe("owner");
    expect(svc.resolveCardFamily("self", table)).toBe("self");
    expect(svc.resolveCardFamily("ghost", table)).toBe("ghost");
  });

  it("caller-supplied facts govern: variant-less rows and cell-less variants walk clean", () => {
    const crafted: Record<string, never | { variants?: unknown[] }> = {
      "bare-family": {},
      "empty-variants": { variants: [] },
    };
    const table = crafted as never as Record<string, { variants: Array<{ route: string; cells?: Array<{ route: string }> }> }>;
    table["routed-family"] = {
      variants: [
        { route: "v-route", cells: [] },
        { route: "v-no-cells-key" },
        { route: "v2", cells: [{ route: "c-route" }] },
      ],
    };
    expect(svc.resolveCardFamily("mid-x", table as never)).toBe("mid-x");
  });
});

describe("cardFamilies (the presence-served board)", () => {
  it("every boarded family serves with presence + the DECL label", () => {
    const defs = svc.defsSync();
    const hit = [...defs.entries()].find(([, d]) => d.boarded.length > 0);
    if (hit === undefined) return;
    const rows = svc.cardFamilies(hit[0]);
    expect(rows.length).toBe((hit[1] as { boarded: readonly string[] }).boarded.length);
    for (const r of rows) {
      expect(typeof r.present).toBe("boolean");
      expect(typeof r.label).toBe("string");
    }
  });
  it("an unknown card serves an empty board", () => {
    expect(svc.cardFamilies("no-such-card")).toEqual([]);
  });
});

describe("admitStageModel (the write-time gate)", () => {
  const firstBoarded = (): { card: string; boarded: readonly string[] } | null => {
    for (const [card, d] of svc.defsSync().entries()) {
      if (d.boarded.length > 0) return { card, boarded: d.boarded };
    }
    return null;
  };
  it("a model-less row passes (the card itself is admitted)", () => {
    const hit = firstBoarded();
    if (hit === null) return;
    expect(svc.admitStageModel(hit.card, undefined)).toEqual({ ok: true });
    expect(svc.admitStageModel(hit.card, "")).toEqual({ ok: true });
  });
  it("an unknown card refuses with the registration voice", () => {
    const r = svc.admitStageModel("ghost-card", "anny");
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toMatch(/no registered card definition/);
  });
  it("a card id that names a REGISTERED FLOW refuses with the flow hint", () => {
    const r = svc.admitStageModel("image-upscale", "anny");
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.error).toMatch(/is a flow, not a card/);
      expect(r.error).toMatch(/add_stage/);
      expect(r.offered).toEqual([]);
    }
  });
  it("a model outside the board refuses with boards + downloaded + the offer", () => {
    const hit = firstBoarded();
    if (hit === null) return;
    const outside = "definitely-not-boarded-family";
    if (hit.boarded.includes(outside)) return;
    const r = svc.admitStageModel(hit.card, outside);
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.error).toMatch(/is not offered by card/);
      expect(r.error).toMatch(/boards:/);
      expect(r.error).toMatch(/downloaded here:/);
      expect(r.offered).toEqual([...hit.boarded]);
    }
  });
  it("a boarded family admits even before download (the offer law)", () => {
    const hit = firstBoarded();
    if (hit === null) return;
    const fam = hit.boarded[0] as string;
    expect(svc.admitStageModel(hit.card, fam)).toEqual({ ok: true });
  });
  it("an empty-board card with a model refuses with boards: none", () => {
    for (const [card, d] of svc.defsSync().entries()) {
      if (d.boarded.length > 0) continue;
      const r = svc.admitStageModel(card, "any-family");
      expect(r.ok).toBe(false);
      if (r.ok === false) expect(r.error).toMatch(/boards: none/);
      return;
    }
  });
});

describe("admitStageModel — the GENERIC MCP CARD (engine-served, no card def)", () => {
  /** Boot a primed registry whose ctx carries an 'engines' seat with
   * the given mcp ids registered (a minimal real executor — the
   * admission only reads the seat's census, never calls it). */
  const bootSeated = async (ids: string[]): Promise<CardRegistryService> => {
    const ctx = new Context();
    const seat = new EnginesService(ctx);
    for (const id of ids) ctx.effect(() => seat.register(id, {
      executor: { executeStages: async () => ({ stages: [] }) },
    }));
    const s = new CardRegistryService(ctx);
    await s.prime();
    return s;
  };
  it("card 'mcp' ADMITS against the live seat census (the pick IS the add — this was the wall that killed the fake card)", async () => {
    // 'craft' rides the SAME seat (non-mcp ids never join the census)
    const s = await bootSeated(["craft", "mcp:blender", "mcp:unity"]);
    expect(s.admitStageModel("mcp", undefined)).toEqual({ ok: true });
    expect(s.admitStageModel("mcp", "")).toEqual({ ok: true });
    expect(s.admitStageModel("mcp", "mcp:blender")).toEqual({ ok: true });
    expect(s.admitStageModel("mcp", "craft")).toMatchObject({ ok: false });
  });
  it("a model outside the SEATED census refuses AT WRITE TIME with the seated list (the board law, mcp spelling)", async () => {
    const s = await bootSeated(["mcp:blender"]);
    const r = s.admitStageModel("mcp", "mcp:unity");
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.error).toMatch(/is not a seated MCP server/);
      expect(r.error).toMatch(/mcp:blender/);
      expect(r.offered).toEqual(["mcp:blender"]);
    }
  });
  it("NO seated mcp engine (or no seat at all — registry-only boots) refuses loud, never a silent pass", async () => {
    const s = await bootSeated([]);
    const r = s.admitStageModel("mcp", undefined);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toMatch(/no seated MCP server/);
    // and the shared fixture ctx (no engines seat at all) — same voice
    const bare = svc.admitStageModel("mcp", "mcp:blender");
    expect(bare.ok).toBe(false);
    if (bare.ok === false) expect(bare.error).toMatch(/no seated MCP server/);
  });
  it("the per-server ids themselves stay UNKNOWN CARDS (only the bare 'mcp' is the card — never a row per server)", async () => {
    const s = await bootSeated(["mcp:blender"]);
    const r = s.admitStageModel("mcp:blender", undefined);
    expect(r.ok).toBe(false);
    if (r.ok === false) expect(r.error).toMatch(/no registered card definition/);
  });
});

describe("resolveStageParams (the resolved-serve degrade)", () => {
  it("a row without a model string tolls to null; an unpreparable model tolls to null", () => {
    expect(svc.resolveStageParams({})).toBeNull();
    expect(svc.resolveStageParams({ model: 7 })).toBeNull();
    // an unknown variant forces prepareCardParams to refuse -> the
    // catch tolls the degrade to null (never a throw into a serve)
    expect(svc.resolveStageParams({ model: "ghost-family-id", variant: "nope" })).toBeNull();
  });
  it("a resolvable model serves its stamped params", () => {
    const facts = svc.modelFacts();
    const mid = Object.keys(facts)[0] as string;
    expect(svc.resolveStageParams({ model: mid })).not.toBeNull();
  });
});

describe("needCardRegistry (the miswire voice)", () => {
  it("an explicit service rides; null refuses LOUD", () => {
    expect(needCardRegistry(svc, "test")).toBe(svc);
    expect(() => needCardRegistry(null, "somewhere")).toThrow(/no CardRegistryService for somewhere/);
    expect(() => needCardRegistry(undefined, "x")).toThrow(/no CardRegistryService/);
  });
});

describe("overlayCardParams (the validate overlay, phase-1 voice)", () => {
  it("a legal mid selects, stamps, and lifts", () => {
    const facts = svc.modelFacts();
    const mid = Object.keys(facts)[0] as string;
    const out = svc.overlayCardParams({}, mid);
    expect(out.fam.length).toBeGreaterThan(0);
    expect(typeof out.card).toBe("string");
    expect(typeof out.params).toBe("object");
  });

  it("a family-less card id uses the card-unit marker", () => {
    const out = svc.overlayCardParams({ model: "mask", input_image: "/m/p.png" }, "mask");
    expect(out.fam).toBe("");
    expect(out.card).toBe("mask");
    expect(out.params["model"]).toBeUndefined();
  });

  it("an unregistered model id does not become a family-less card", () => {
    expect(() => svc.overlayCardParams({}, "not-a-card")).toThrow(/composes outside the cordis plane/);
  });

  it("a catalog id that resolves through a route still uses the family row", () => {
    const out = svc.overlayCardParams({}, "h3-fl2va");
    expect(out.fam).toBe("h3");
    expect(out.card).toBe("h3-timeline");
  });

  it("the timeline route prepares as the h3 family, not a second family", () => {
    const out = svc.overlayCardParams({ prompt: "x" }, "h3-timeline");
    expect(out.fam).toBe("h3");
  });

  it("a catalog id that is not a family row does not enter the family-less arm", () => {
    const view = svc as unknown as {
      modelMids: () => Set<string>;
      resolveCardFamily: (mid: string, facts?: unknown) => string;
    };
    const originalMids = svc.modelMids.bind(svc);
    const originalResolve = svc.resolveCardFamily.bind(svc);
    view.modelMids = () => new Set([...originalMids(), "mask"]);
    view.resolveCardFamily = (mid: string): string => mid === "mask" ? "h3" : originalResolve(mid);
    try {
      const out = svc.overlayCardParams({ model: "mask" }, "mask");
      expect(out.fam).toBe("h3");
    } finally {
      view.modelMids = originalMids;
      view.resolveCardFamily = originalResolve;
    }
  });
});

describe("phase2Card output resolution", () => {
  it("refuses an unknown card after composition", async () => {
    composeOnce.mockResolvedValueOnce({} as never);
    const p1 = { mid: "m", fam: "f", card: "ghost", skeleton: "s", decl: {}, params: {}, spell: null } as never;
    await expect(svc.phase2Card(p1, "r-unknown")).rejects.toMatchObject({ code: "card_compose" });
  });

  it("maps a declared output producer refusal to a card-compose error", async () => {
    composeOnce.mockResolvedValueOnce({} as never);
    const p1 = { mid: "m", fam: "f", card: "tts", skeleton: "s", decl: {}, params: {}, spell: null } as never;
    await expect(svc.phase2Card(p1, "r-missing-producer")).rejects.toMatchObject({ code: "card_compose" });
  });

  it("rethrows a non-ComposeRefusal producer error unchanged", async () => {
    const defs = svc.defsSync();
    const original = defs.get("tts")!;
    defs.set("tts", {
      ...original,
      flowOutputBindings: [{
        channel: "default",
        node: "SaveAudio.0",
        nodeClass: "SaveAudio",
        when: () => { throw new Error("producer exploded"); },
      }],
    });
    try {
      composeOnce.mockResolvedValueOnce({} as never);
      const p1 = { mid: "m", fam: "f", card: "tts", skeleton: "s", decl: {}, params: {}, spell: null } as never;
      await expect(svc.phase2Card(p1, "r-producer-throw")).rejects.toThrow("producer exploded");
    } finally {
      defs.set("tts", original);
    }
  });
});

describe("composeValidateCard (the validate refusal voice)", () => {
  it("a clean compose answers null", async () => {
    composeOnce.mockResolvedValueOnce({ graph: true } as never);
    expect(await svc.composeValidateCard("c", "f", {})).toBeNull();
  });
  it("a CardArmError refusal maps to message+code", async () => {
    composeOnce.mockRejectedValueOnce(
      new (await import("../src/cardsArmError.ts")).CardArmError(400, "the refusal", "card_compose"),
    );
    expect(await svc.composeValidateCard("c", "f", {})).toEqual({
      message: "the refusal",
      code: "card_compose",
    });
  });
  it("a non-card error rethrows (never swallowed)", async () => {
    composeOnce.mockRejectedValueOnce(new Error("wire died"));
    await expect(svc.composeValidateCard("c", "f", {})).rejects.toThrow(/wire died/);
  });
});

describe("phase1Card + phase2Card (the two phases, one compose seat)", () => {
  it("a spell body pools its $ inputs and composes NO graph", async () => {
    // upscale-tools carries spells: ['input_image'] — a $ value
    // pools and phase-1 composes nothing (the two-card handoff)
    composeOnce.mockClear();
    const p1 = await svc.phase1Card({ input_image: "$upstream" }, "seedvr2_ema");
    expect(p1.spell).not.toBeNull();
    expect((p1.spell as { inputs: Record<string, unknown> }).inputs["input_image"]).toBe("$upstream");
    expect(composeOnce).not.toHaveBeenCalled();
  });
  it("a non-$ spell value stays OUT of the pool (the plain compose arm)", async () => {
    composeOnce.mockClear();
    const p1 = await svc.phase1Card({ input_image: "plain.png" }, "seedvr2_ema");
    expect(p1.spell).toBeNull();
    expect(composeOnce).toHaveBeenCalled();
  });
  it("phase-2 resolves semantic card outputs and producer nodes", async () => {
    const graph = { "SaveAudio.0": { class_type: "SaveAudio", inputs: {} } };
    composeOnce.mockResolvedValueOnce(graph as never).mockResolvedValueOnce(graph as never);
    const p1 = await svc.phase1Card({ text: "hello" }, "qwen3-tts-voicedesign");
    const composed = await svc.phase2Card(p1, "run-tts");
    expect(composed.outputs).toEqual({ default: "audio" });
    expect(composed.outputNodes).toEqual({ default: "SaveAudio.0" });
  });

  it("a plain body composes phase-1 and phase-2 rides the same seat", async () => {
    composeOnce.mockClear();
    const facts = svc.modelFacts();
    const mid = Object.keys(facts)[0] as string;
    const p1 = await svc.phase1Card({ model: mid }, mid);
    expect(p1.spell).toBeNull();
    const c = await svc.phase2Card(p1, "run-1");
    expect(c.graph).toEqual({ graph: true });
    expect(c.skeleton).toBe(p1.skeleton);
    expect(composeOnce).toHaveBeenCalledTimes(2);
  });
});

describe("primeObjectInfo's unreachable-engine arm", () => {
  it("a dead engine endpoint degrades to null + false, never a throw", async () => {
    const prev = process.env["COMFYUI_URL"];
    process.env["COMFYUI_URL"] = "http://127.0.0.1:1";
    try {
      const c2 = new Context();
      const fresh = new CardRegistryService(c2);
      expect(await fresh.primeObjectInfo()).toBe(false);
      expect(fresh.objectInfo()).toBeNull();
    } finally {
      if (prev === undefined) delete process.env["COMFYUI_URL"];
      else process.env["COMFYUI_URL"] = prev;
    }
  });
});

describe("the provider (fiber-owned prime)", () => {
  it("cardRegistryProvider primes a real service on the fiber", async () => {
    const c2 = new Context();
    await c2.plugin(cardRegistryProvider as never);
    const mounted = c2.get("cardRegistry") as CardRegistryService;
    expect(mounted.defsSync().size).toBeGreaterThan(0);
    await Promise.resolve();
  });
});

describe("repairStageModel — THE SCHEMA-MASTER REPAIR (operator law 2026-09-24)", () => {
  // Receipt: restoring the design-era history refused "unknown
  // model 'qwen3-tts-voicedesign-design'" at the bench load door
  // (live reproduction: bench/bad-model "is not offered by card
  // 'tts'" on a pre-VARIANT_ADDRESSES build; the registryModel
  // "(registered: …)" voice is the same poison at another site).
  it("THE RECEIPT: the design route id repairs to family + the DECL's own variant (route ladder)", () => {
    expect(svc.repairStageModel("tts", "qwen3-tts-voicedesign-design")).toEqual({
      model: "qwen3-tts-voicedesign",
      variant: "voicedesign",
    });
  });
  it("a variant-id suffix repairs via the prefix ladder (family + variant)", () => {
    expect(svc.repairStageModel("tts", "qwen3-tts-voicedesign-voicedesign")).toEqual({
      model: "qwen3-tts-voicedesign",
      variant: "voicedesign",
    });
  });
  it("an era-junk suffix strips to the LONGEST boarded family (no variant guess)", () => {
    // both qwen3-tts and qwen3-tts-voicedesign prefix — longest wins
    expect(svc.repairStageModel("tts", "qwen3-tts-voicedesign-mystery")).toEqual({
      model: "qwen3-tts-voicedesign",
    });
    expect(svc.repairStageModel("tts", "qwen3-tts-mystery")).toEqual({
      model: "qwen3-tts",
    });
  });
  it("no boarded dash-prefix and no route match → null (never a fuzzy guess)", () => {
    expect(svc.repairStageModel("tts", "mystery-thing")).toBeNull();
    // a REAL family another card boards is not this card's repair
    expect(svc.repairStageModel("tts", "z-image-design")).toBeNull();
  });
  it("an unknown card repairs nothing", () => {
    expect(svc.repairStageModel("no-such-card", "qwen3-tts-voicedesign-design")).toBeNull();
  });
  it("the repaired coordinate passes admission (the load lands, not just the id)", () => {
    const fix = svc.repairStageModel("tts", "qwen3-tts-voicedesign-design");
    expect(fix).not.toBeNull();
    expect(svc.admitStageModel("tts", fix!.model)).toEqual({ ok: true });
  });

  it("walks missing variant/cell rows and the prefix identity fallback", () => {
    const view = svc as unknown as { modelFacts: () => Record<string, unknown> };
    const original = view.modelFacts;
    view.modelFacts = () => ({
      bare: {},
      "not-boarded": {
        variants: [{ id: "foreign", route: "foreign", cells: [{ route: "cell-route" }] }],
      },
      "qwen3-tts-voicedesign": {
        variants: [
          { id: "no-cells", route: "not-a-cell" },
          { id: "cell", route: "also-not", cells: [{ route: "cell-route" }] },
        ],
      },
    });
    try {
      expect(svc.repairStageModel("tts", "cell-route")).toEqual({
        model: "qwen3-tts-voicedesign",
        variant: "cell",
      });
      view.modelFacts = () => ({});
      expect(svc.repairStageModel("tts", "qwen3-tts-voicedesign-mystery")).toEqual({
        model: "qwen3-tts-voicedesign",
      });
    } finally {
      view.modelFacts = original;
    }
  });
});

describe("resolveCardFamily — THE ROUTE-ADDRESS FOLD (ROADMAP §36.5)", () => {
  it("THE RECEIPT: an address row folds to the owning atom its own defaults name", () => {
    expect(svc.resolveCardFamily("qwen3-tts-voicedesign-design")).toBe("qwen3-tts-voicedesign");
  });
  it("a real family id resolves to itself (its defaults point at itself or are absent)", () => {
    expect(svc.resolveCardFamily("qwen3-tts-voicedesign")).toBe("qwen3-tts-voicedesign");
    expect(svc.resolveCardFamily("qwen3-tts")).toBe("qwen3-tts");
  });
  it("a variant route not keyed in facts still folds through the variant table", () => {
    // route ladder unchanged: the cell/variant route arms keep their law
    const out = svc.resolveCardFamily("qwen3-tts-voicedesign-base");
    expect(out).toBe("qwen3-tts-voicedesign");
  });
  it("an unknown id rides verbatim (never a fuzzy guess)", () => {
    expect(svc.resolveCardFamily("not-a-model")).toBe("not-a-model");
  });
});
