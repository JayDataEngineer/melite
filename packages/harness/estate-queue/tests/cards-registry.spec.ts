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
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EnginesService } from "@melite/engine-contract";
import type { ModelFactsRow } from "../src/cardsFacts.ts";
import { QueueService } from "../src/service.ts";
import {
  CardRegistryService,
  cardRegistryProvider,
  needCardRegistry,
  familyFace,
} from "../src/cardsRegistry.ts";
import { prepareCardParams } from "../src/cardsCompose.ts";
import { FlowsSeatService } from "../src/flowsData.ts";

let svc: CardRegistryService;
let ctx: Context;

// the boot budget is sized for the FULL battery's oversubscription
// (same starvation as cards-lane-law's boot, same cure)
beforeAll(async () => {
  ctx = new Context();
  new FlowsSeatService(ctx);
  // J12: the registry's dangling sweep reads the queue seat's
  // stateRoots manifest (config-named call data — no env seam); the
  // boot stub pins a temp tree so the sweep never touches real runs.
  (ctx as unknown as { queue: unknown }).queue = {
    stateRoot: mkdtempSync(join(tmpdir(), "cards-reg-")),
    stateRoots: [] as string[],
  };
  svc = new CardRegistryService(ctx);
  await svc.prime();
}, 90_000);

describe("familyFace (the label law)", () => {
  it("a registered family serves its DECL label; an unknown id degrades to itself", () => {
    expect(familyFace("anny")).not.toBe("anny");
    expect(familyFace("not-a-family-id")).toBe("not-a-family-id");
  });
});

describe("the unprimed refusals (LOUD, never a fallback)", () => {
  it("defsSync and readsSync refuse before prime", async () => {
    const c2 = new Context();
    new FlowsSeatService(c2);
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
  it("defsSync follows a refreshCardDefs swap — the registry reads the ONE cache the doors serve (the G2 receipt, 2026-10-11)", async () => {
    // THE ONE TRUTH: /v1/forms serves loadCardDefs()'s module cache
    // and refreshCardDefs() swaps it. This seat used to return its
    // own boot-time copy — a live-mounted hot card served in forms
    // and REFUSED at POST /v1/flows/validate ("is not a registered
    // card"). The prime stays (the primed proof); the READ rides
    // the one cache. This arm mounts the G2 drop-in the way the
    // lane does and asserts the SEAT sees the card the MOMENT the
    // forms door does — no re-prime.
    const { loadCardDefs, refreshCardDefs, theService } = await import("@melite/comfyui-cordis");
    const { apply: applyG2 } = await import("../../../web/melite-estate/hot/g2-maker-door.plugin.ts");
    const defs = await loadCardDefs();
    expect(defs.has("hot-g2-door")).toBe(false);
    expect(svc.defsSync().has("hot-g2-door")).toBe(false);
    const fiberCtx = new Context();
    new FlowsSeatService(fiberCtx);
    await fiberCtx.plugin({ name: "g2-wall", apply: applyG2 });
    try {
      // refreshCardDefs SWAPS the module cache (a new map) — the
      // doors re-read loadCardDefs(); the old local would still be
      // the pre-refresh object
      const served = await loadCardDefs();
      expect(served.has("hot-g2-door")).toBe(true); // the drop-in's refreshCardDefs served it in the forms cache
      expect(svc.defsSync().has("hot-g2-door")).toBe(true); // …and the registry seat reads the SAME cache, no re-prime
    } finally {
      await fiberCtx.fiber.dispose();
    }
    expect((await loadCardDefs()).has("hot-g2-door")).toBe(false);
    expect(svc.defsSync().has("hot-g2-door")).toBe(false); // the disposer's refresh un-serves at the seat too
    expect(refreshCardDefs).toBeTypeOf("function");
    void theService;
  });
  it("modelFacts derives once and caches; cardDecls derives from defs+facts and caches", () => {
    const facts = svc.modelFacts();
    expect(Object.keys(facts).length).toBeGreaterThan(0);
    expect(svc.modelFacts()).toBe(facts);
    const decls = svc.cardDecls();
    expect(Object.keys(decls).length).toBeGreaterThan(0);
    expect(svc.cardDecls()).toBe(decls);
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
    new FlowsSeatService(c2);
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
      expect(r.error).toMatch(/melite_flow/);
      expect(r.offered).toEqual([]);
    }
  });
  it("a flow whose stage rides a FAMILY names the family rider, not a card rider", () => {
    // the cut's wake (d7ba0c77): the family-rider flows were the
    // only rows whose stages carried family+action with NO card —
    // anny-params still rides one, and the refusal names it
    const r = svc.admitStageModel("anny-params", "anny");
    expect(r.ok).toBe(false);
    if (r.ok === false) {
      expect(r.error).toMatch(/card riders \(none\)/);
      expect(r.error).toMatch(/family riders \(anny\.bake\)/);
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
  it("an empty-board card with a model refuses with boards: none", async () => {
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
    new FlowsSeatService(ctx);
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
  it("THE EMPTY-FORM BURN (2026-10-09): a qwen-img-edit-21 stage SERVES width/height 1024 — the form's servedBase carries them, never empty fields", () => {
    // The operator's catch: the image-edit card's Width and Height
    // rendered EMPTY (image-gen showed 1024) because the 2.1 DECL
    // declared no resolution and only the LANE knew `?? 1024`. The
    // serve seam (resolveStageParams → stampCardOverlay → the drafts'
    // withResolvedStages → the drill's servedBase) is what the FORM
    // displays — this wall pins the resolution riding it. Lose the
    // DECL row, lose this wall, lose the build.
    const resolved = svc.resolveStageParams({ model: "qwen-img-edit-21", prompt: "brighten the anchor" });
    expect(resolved).not.toBeNull();
    expect((resolved as Record<string, unknown>).width).toBe(1024);
    expect((resolved as Record<string, unknown>).height).toBe(1024);
    // the user's explicit value never yields to the stamp
    const own = svc.resolveStageParams({ model: "qwen-img-edit-21", prompt: "x", width: 768, height: 1024 }) as Record<string, unknown>;
    expect(own.width).toBe(768);
    expect(own.height).toBe(1024);
  });
});

describe("needCardRegistry (the miswire voice)", () => {
  it("an explicit service rides; null refuses LOUD", () => {
    expect(needCardRegistry(svc, "test")).toBe(svc);
    expect(() => needCardRegistry(null, "somewhere")).toThrow(/no CardRegistryService for somewhere/);
    expect(() => needCardRegistry(undefined, "x")).toThrow(/no CardRegistryService/);
  });
});

describe("prepareCardParams, phase-1 voice (the run-start compose)", () => {
  it("a legal mid selects, stamps, and lifts", () => {
    const facts = svc.modelFacts();
    const mid = Object.keys(facts)[0] as string;
    const out = prepareCardParams(svc, {}, mid, "1");
    expect(out.fam.length).toBeGreaterThan(0);
    expect(typeof out.card).toBe("string");
    expect(typeof out.params).toBe("object");
  });

  it("a family-less card id uses the card-unit marker", () => {
    const out = prepareCardParams(svc, { model: "mask", input_image: "/m/p.png" }, "mask", "1");
    expect(out.fam).toBe("");
    expect(out.card).toBe("mask");
    expect(out.params["model"]).toBeUndefined();
  });

  it("an unregistered model id does not become a family-less card", () => {
    // An id that resolves NOWHERE answers the unknown-unit
    // refusal — the cordis-plane skew voice belongs to ids that
    // resolve but lack a facts row.
    expect(() => prepareCardParams(svc, {}, "not-a-card", "1")).toThrow(/no model unit for model: not-a-card/);
  });

  it("a catalog id that resolves through a route still uses the family row", () => {
    const out = prepareCardParams(svc, {}, "h3-fl2va", "1");
    expect(out.fam).toBe("h3");
    expect(out.card).toBe("h3-timeline");
  });

  it("the timeline route prepares as the h3 family, not a second family", () => {
    const out = prepareCardParams(svc, { prompt: "x" }, "h3-timeline", "1");
    expect(out.fam).toBe("h3");
  });

  it("a catalog id that is not a family row does not enter the family-less arm", () => {
    const view = svc as unknown as {
      modelMids: () => Set<string>;
      resolveCardFamily: (mid: string, facts?: Record<string, ModelFactsRow>) => string;
    };
    const originalMids = svc.modelMids.bind(svc);
    const originalResolve = svc.resolveCardFamily.bind(svc);
    view.modelMids = () => new Set([...originalMids(), "mask"]);
    view.resolveCardFamily = (mid: string): string => mid === "mask" ? "h3" : originalResolve(mid);
    try {
      const out = prepareCardParams(svc, { model: "mask" }, "mask", "1");
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
    // the arm PREPARES before it composes (the final live
    // verification, FIX A: it used to compose the raw family atom,
    // so it missed the board check and the resolved route — the
    // validate seat and the bench disagreed in both directions).
    // An unregistered card is now a refusal, not a clean answer.
    // THE HAPPY PATH IS STILL WALLED (the work audit's P1: the
    // li-ak fix replaced this positive case with a refusal case, so
    // nothing pinned a LAWFUL validate answering null through the
    // prepared path — the fix's own success was unwalled). A lawful
    // state composes and answers null.
    vi.mocked(composeOnce).mockReset();
    composeOnce.mockResolvedValueOnce({ graph: true } as never);
    expect(await svc.composeValidateCard("upscale-tools", "seedvr2_ema", { input_image: "a.png" })).toBeNull();
    // and an unregistered card still refuses, by name
    composeOnce.mockResolvedValueOnce({ graph: true } as never);
    const ans = await svc.composeValidateCard("c", "f", {});
    expect(ans).not.toBeNull();
    expect(ans?.message).toMatch(/no registered card definition|no model unit|not offered/i);
  });
  // THE VALIDATE-START PARITY LAW (2026-10-10, the operator's
  // question: "HOW DID THE VALIDATE RETURN SUCCESS WHEN THE INPUT
  // IMAGE DID NOT GO"): a $spell param is a promise only a flow's
  // links can keep — validate refuses it with the START wall's own
  // voice, BEFORE any compose tolerates it into a graph.
  it("THE PARITY PIN: a $spell param refuses — the same voice as the start wall, never a tolerated compose", async () => {
    // earlier tests share the mock — clear, then assert THIS call
    vi.mocked(composeOnce).mockClear();
    const ans = await svc.composeValidateCard("c", "f", {
      input_images: ["$input_images"],
      prompt: "make the hair crimson",
    });
    expect(ans).not.toBeNull();
    expect(ans?.code).toBe("invalid_request");
    expect(ans?.message).toContain("$input_images");
    expect(ans?.message).toContain("resolves no wires");
    // the compose NEVER RAN — the spell refused before tolerance
    expect(composeOnce).not.toHaveBeenCalled();
  });
  it("a CardArmError refusal maps to message+code", async () => {
    // the arm PREPARES first, so the compose is reached through a
    // card whose family the fixture seats (upscale-tools, the card
    // behind that flow)
    vi.mocked(composeOnce).mockReset();
    composeOnce.mockRejectedValueOnce(
      new (await import("../src/cardsArmError.ts")).CardArmError(400, "the refusal", "card_compose"),
    );
    const ans = await svc.composeValidateCard("upscale-tools", "seedvr2_ema", { input_image: "a.png" });
    expect(ans?.message).toBe("the refusal");
    expect(ans?.code).toBe("card_compose");
  });
  it("a non-card error rethrows (never swallowed)", async () => {
    vi.mocked(composeOnce).mockReset();
    composeOnce.mockRejectedValueOnce(new Error("wire died"));
    await expect(
      svc.composeValidateCard("upscale-tools", "seedvr2_ema", { input_image: "a.png" }),
    ).rejects.toThrow(/wire died/);
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
    // THE BODY IS NOW A LEGAL ONE (2026-10-10, the DECL audit's gap 4
    // kill): the first model is an image family, whose required word
    // now says the prompt must be stated — a prompt-less body is
    // refused at the bench AND at the phase seat, and this arm is
    // about the two phases riding one seat, not about composing
    // nothing.
    const p1 = await svc.phase1Card({ model: mid, prompt: "a harbour at dusk" }, mid);
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
      new FlowsSeatService(c2);
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
    new FlowsSeatService(c2);
    // J12: the provider's inject reads the queue seat — mount the
    // REAL service on a temp root (config-named, hermetic)
    new QueueService(c2, { stateRoot: mkdtempSync(join(tmpdir(), "cards-reg-prov-")) });
    await c2.plugin(cardRegistryProvider);
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

// ── THE RUN SEAT'S BOARD REFUSAL (batch-6 closure, 2026-10-14 —
// O25e): phase1Card re-checks the board before it composes, and its
// refusal is the write door's own voice — CardArmError 400
// invalid_request, the same code the write door stamps. The wiring
// arm's DISARM ride is here too: a null doc stands the wiring down.
describe("phase1Card + armWiringFromDoc (the run-seat refusal and the disarm)", () => {
  it("phase1Card refuses a model off the board with the write door's voice", async () => {
    await expect(
      svc.phase1Card({ model: "zzz-no-such-model", text: "a" }, "tts"),
    ).rejects.toThrow(/not offered|no registered|not boarded/);
  });
  it("armWiringFromDoc(null) stands the wiring down (a cleared bench disarms)", () => {
    const disarm = vi.fn();
    const ctx2 = new Context();
    new FlowsSeatService(ctx2);
    ctx2.provide("comfyuiWiring" as never, { disarm } as never);
    const svc2 = new CardRegistryService(ctx2);
    svc2.armWiringFromDoc(null);
    expect(disarm).toHaveBeenCalledTimes(1);
  });
});

// ── THE FAMILY-INTERSECTION FOLD (batch-8 closure, 2026-10-14,
// re-audit's ranked #1): a card boarded on TWO declaring families
// is judged by what BOTH state — rows AGREE by their members (the
// cure prose may differ; arrays sort before the key), and the
// bounds intersect to the tightest common span, deleting the
// fields only one side declares or the spans that cannot overlap.
describe("modellessDraftVerdict (the family-intersection fold)", () => {
  /** boards a throwaway card on two crafted families, restoring
   *  both caches after — the same temporary-override seat the
   *  producer-throw test rides. */
  const withXsect = (
    run: (card: string) => void,
    famA: Record<string, unknown>,
    famB: Record<string, unknown>,
  ): void => {
    const defs = svc.defsSync();
    const facts = svc.modelFacts();
    const template = defs.get("tts")!;
    const origA = facts["xsect-a"];
    const origB = facts["xsect-b"];
    // the fold's fixture fields ride the admission surface via the
    // card's admits list (the undeclared-key gate owns its own seat
    // before the lane judgment — the fold is judged over the params
    // the card already declares)
    const FIXTURE_FIELDS = [
      "text", "speaker", "style", "alpha", "gamma", "beta", "delta",
      "a", "b", "x1", "x2", "steps", "cfg", "rate",
    ];
    defs.set("xsect", {
      ...template,
      boarded: ["xsect-a", "xsect-b"],
      admits: [...new Set([...(template.admits ?? []), ...FIXTURE_FIELDS])],
    });
    const base = facts["qwen3-tts"] ?? { params: {} } as ModelFactsRow;
    facts["xsect-a"] = { ...base, ...famA } as ModelFactsRow;
    facts["xsect-b"] = { ...base, ...famB } as ModelFactsRow;
    // the decl projection caches on first read and exposes no
    // public invalidation — stand the cache down so the throwaway
    // card is aboard for admissionRefusal's surface gate (the defs
    // map and the facts object are the same references the
    // re-derivation reads)
    (svc as unknown as { decls: unknown }).decls = null;
    svc.cardDecls();
    try {
      run("xsect");
    } finally {
      defs.delete("xsect");
      if (origA === undefined) delete facts["xsect-a"];
      else facts["xsect-a"] = origA;
      if (origB === undefined) delete facts["xsect-b"];
      else facts["xsect-b"] = origB;
      // and re-derive again so no later test sees the throwaway card
      (svc as unknown as { decls: unknown }).decls = null;
      svc.cardDecls();
    }
  };

  it("rows agree by MEMBERS (prose differs, arrays sort) and words one side states never judge", () => {
    withXsect(
      (card) => {
        // requires: BOTH families state it (same members, different
        // cure prose) — the intersection keeps it, so a draft
        // stating the field without its need refuses naming the need
        const miss = svc.admitStageRelations(card, { text: "t" });
        expect(miss.ok).toBe(false);
        if (miss.ok === false) expect(miss.error).toMatch(/speaker/);
        // the need stated → the word is satisfied
        expect(svc.admitStageRelations(card, { text: "t", speaker: "Cherry" }).ok).toBe(true);
        // together: only famA states it — NOT in the intersection,
        // so a half-stated group sails (the run door owns it)
        expect(svc.admitStageRelations(card, { text: "t", speaker: "c", alpha: 1 }).ok).toBe(true);
        // either_or: only famB states it — same tolerance
        expect(svc.admitStageRelations(card, { text: "t", speaker: "c", beta: 2 }).ok).toBe(true);
      },
      {
        relations: {
          requires: [{ field: "text", needs: ["speaker"], cure: "say it" }],
          together: [{ fields: ["alpha", "gamma"], cure: "both or neither" }],
        },
      },
      {
        relations: {
          // the cure prose differs — the row still agrees (members)
          requires: [{ field: "text", needs: ["speaker"], cure: "entirely different prose" }],
          either_or: [{ groups: [["beta"], ["delta"]], cure: "pick a source" }],
        },
      },
    );
  });

  it("an array row agrees regardless of member order (the key sorts arrays)", () => {
    withXsect(
      (card) => {
        // requires with the same members in DIFFERENT array order in
        // the two declarations — the sorted key agrees, so stating
        // the field without its needs refuses in both directions
        const miss1 = svc.admitStageRelations(card, { text: "t" });
        expect(miss1.ok).toBe(false);
        if (miss1.ok === false) expect(miss1.error).toMatch(/speaker|style/);
        const miss2 = svc.admitStageRelations(card, { text: "t", speaker: "s" });
        expect(miss2.ok).toBe(false);
        if (miss2.ok === false) expect(miss2.error).toMatch(/style/);
        // every need stated → satisfied
        expect(svc.admitStageRelations(card, { text: "t", speaker: "s", style: "x" }).ok).toBe(true);
      },
      { relations: { requires: [{ field: "text", needs: ["speaker", "style"] }] } },
      { relations: { requires: [{ field: "text", needs: ["style", "speaker"] }] } },
    );
  });

  it("bounds intersect to the tightest span; disjoint or one-sided fields fall away", () => {
    withXsect(
      (card) => {
        // steps: [2,8] ∩ [4,12] = [4,8]
        expect(svc.admitStageRelations(card, { steps: 6 }).ok).toBe(true);
        const over = svc.admitStageRelations(card, { steps: 9 });
        expect(over.ok).toBe(false);
        if (over.ok === false) expect(over.error).toMatch(/steps/);
        // cfg: only famA declares it — deleted from the fold
        expect(svc.admitStageRelations(card, { cfg: 999 }).ok).toBe(true);
      },
      { bounds: { steps: { min: 2, max: 8 }, cfg: { min: 1, max: 4 } } },
      { bounds: { steps: { min: 4, max: 12 } } },
    );
    withXsect(
      (card) => {
        // disjoint spans ([2,3] ∩ [8,12] cannot overlap) — the
        // field is deleted, so the value sails
        expect(svc.admitStageRelations(card, { steps: 99 }).ok).toBe(true);
      },
      { bounds: { steps: { min: 2, max: 3 } } },
      { bounds: { steps: { min: 8, max: 12 } } },
    );
    withXsect(
      (card) => {
        // one side open-ended: famB's max 6 caps, famA's min is
        // -Infinity (dropped key) — the fold keeps {max: 6}
        expect(svc.admitStageRelations(card, { rate: 5 }).ok).toBe(true);
        const over = svc.admitStageRelations(card, { rate: 7 });
        expect(over.ok).toBe(false);
        if (over.ok === false) expect(over.error).toMatch(/rate/);
      },
      { bounds: { rate: { min: 0 } } },
      { bounds: { rate: { max: 6 } } },
    );
  });

  it("a family with no bounds at all stands the whole span down (null breaks the fold)", () => {
    withXsect(
      (card) => {
        expect(svc.admitStageRelations(card, { steps: 99 }).ok).toBe(true);
      },
      { bounds: { steps: { min: 1, max: 4 } } },
      { relations: { requires: [] } }, // no bounds key — famBounds === null
    );
  });
});
