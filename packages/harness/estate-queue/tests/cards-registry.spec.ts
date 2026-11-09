// cards-registry.spec.ts — the CardRegistryService's every arm
// (TEST-2 breadth, the deterministic census of 2026-09-19): the
// unprimed refusals, the lazy facts/decls/mids reads, the family
// resolution lens, the presence-served board, the admission gate's
// verdicts, the resolved-serve degrade, the miswire voice, and the
// provider prime. composeOnce rides a seam fake (the engine graph
// compose has its own seat elsewhere).
import { describe, it, expect, vi, afterAll, beforeAll } from "vitest";
// THE FILE-LEVEL ENGINE MOCK (gate-37 flake cure): this file
// sequences one-shot census events (mockResolvedValueOnce /
// mockRejectedOnce) for primeObjectInfo's degrade + re-arm arms,
// so the mock lives HERE, not in the shared hermetic helper (a
// helper-registered mock serves transitive importers; this file
// drives the seam itself). Stable double identity per file (the
// transport's cache contract — the unchanged-doc skip rides it).
// The census fn is stashed in hoisted state: arms sequence it
// DIRECTLY (a dynamic barrel import inside the test resolves a
// re-import — arms feed the census plain-data directives (failNext
// / nextDoc): test→factory data crosses (the decl-corners bounds
// pattern), while a factory-side mock-fn reference does NOT
// propagate back (identity does not cross — the failure that
// taught this comment). The impl below interprets the directives.
const bootSeat = vi.hoisted(() => ({
  fetches: 0,
  doc: null as Record<string, unknown> | null,
  failNext: null as string | null,
  nextDoc: null as Record<string, unknown> | null,
  censusFn: vi.fn(async (): Promise<Record<string, unknown>> => {
    throw new Error("hermetic census unarmed");
  }),
}));
const BOOT_DOC_URL = new URL(
  "../../../../tests/walls/fixtures/object_info.boot.json",
  import.meta.url,
);
vi.mock("@melite/comfyui-cordis", async (importOriginal) => {
  const real = await importOriginal<typeof import("@melite/comfyui-cordis")>();
  const { readFileSync: readBootDoc } = await import("node:fs");
  bootSeat.censusFn.mockImplementation(async () => {
    bootSeat.fetches += 1;
    // one-shot directives first (arms feed plain data — the
    // decl-corners test→factory pattern), then the stable double.
    if (bootSeat.failNext !== null) {
      const message = bootSeat.failNext;
      bootSeat.failNext = null;
      throw new Error(message);
    }
    if (bootSeat.nextDoc !== null) {
      const staged = bootSeat.nextDoc;
      bootSeat.nextDoc = null;
      return staged;
    }
    if (bootSeat.doc === null) {
      bootSeat.doc = JSON.parse(readBootDoc(BOOT_DOC_URL, "utf8")) as Record<string, unknown>;
    }
    return bootSeat.doc;
  });
  return { ...real, liveObjectInfo: bootSeat.censusFn };
});

const composeOnce = vi.hoisted(() =>
  vi.fn(async (): Promise<Record<string, unknown>> => ({ graph: true })),
);
vi.mock("../src/cardsCompose.ts", async (importOriginal) => {
  const real = await importOriginal<typeof import("../src/cardsCompose.ts")>();
  return { ...real, composeOnce };
});

import { installLaneStoreOverlay, restoreLaneStoreOverlay } from "../../../../tests/helpers/lane-store-overlay.ts";
import { Context } from "@deepseek-ai/cordis";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
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
import { loadCardDefs, theService } from "../../../engines/comfyui-cordis/src/cardDefs.ts";
import { prepareCardParams } from "../src/cardsCompose.ts";
import { ESTATE_STORE_SEATED, STORE_SEATED_SKIP } from "../../../../tests/helpers/estate-store-seat.ts";
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

  // THE HERMETIC STORE (the lane-presence cure's seat): the gate's
  // declared arms now judge every lane file, and a compose spec's
  // subject is the card, not this machine's store. The overlay
  // mirrors the runtime store and materializes the declared-home
  // rows the real store lacks; the endpoint config (the compose
  // URL + the mount leg) stays ambient. Presence judgment itself
  // stays owned by cards-lanes.spec's fixture world.
  installLaneStoreOverlay();
}, 90_000);

afterAll(() => {
  restoreLaneStoreOverlay();
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
  it("cardDecls re-derives across a refreshCardDefs swap — the hot-swap epoch (audit 2026-10-22, serve-yes/run-no)", async () => {
    // E3's cure: the decl projection keyed on nothing and kept the
    // boot snapshot — a hot card served in forms (defsSync follows
    // the module cache) then refused at validate/run (decls stale).
    // The projection now re-derives once when the cache identity
    // differs from the primed proof, and caches again at the new
    // epoch — the G2 drop-in is the mount this arm rides.
    const { apply: applyG2 } = await import("../../../web/melite-estate/hot/g2-maker-door.plugin.ts");
    expect(svc.cardDecls()["hot-g2-door"]).toBeUndefined();
    const fiberCtx = new Context();
    new FlowsSeatService(fiberCtx);
    await fiberCtx.plugin({ name: "g2-wall-epoch", apply: applyG2 });
    try {
      const declsAfter = svc.cardDecls();
      expect(declsAfter["hot-g2-door"]).toBeDefined(); // the projection followed the swap
      expect(svc.cardDecls()).toBe(declsAfter);        // …and caches again at the new epoch
    } finally {
      await fiberCtx.fiber.dispose();
    }
    expect(svc.cardDecls()["hot-g2-door"]).toBeUndefined(); // the disposer un-serves at the seat too
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
  it("rearmWeights drops the presence cache; the next read re-derives (the landing law)", () => {
    const before = svc.modelMids();
    svc.rearmWeights();
    const after = svc.modelMids();
    expect(after).not.toBe(before);
    expect([...after].sort()).toEqual([...before].sort());
    // a second read re-caches (the re-arm is a drop, not a mode)
    expect(svc.modelMids()).toBe(after);
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
  it("THE EMPTY-FORM BURN, recut (latent law 2026-11-08): a qwen-img-edit-21 stage serves NO geometry — never an empty field, never a ghost 1024", () => {
    // The operator's catch: the image-edit card's Width and Height
    // rendered EMPTY (image-gen showed 1024) because the 2.1 DECL
    // declared no resolution and only the LANE knew `?? 1024`. The
    // serve seam (resolveStageParams → stampCardOverlay → the drafts'
    // withResolvedStages → the drill's servedBase) is what the FORM
    // displays — this wall pins the resolution riding it. Lose the
    // DECL row, lose this wall, lose the build.
    const resolved = svc.resolveStageParams({ model: "qwen-img-edit-21", prompt: "brighten the anchor" });
    expect(resolved).not.toBeNull();
    // THE EMPTY-FORM BURN, recut by the latent law (2026-11-08): the
    // original burn was EMPTY fields (no DECL resolution, only the
    // lane knew `?? 1024`). The latent law retired the axes outright
    // (both lanes edit at the source's own frame; width/height ride
    // hidden faces), so the honest serve is NO geometry keys at all —
    // an empty field AND a ghost stamped 1024 are both lies now; the
    // form renders the match toggle's note instead. This pin is the
    // resurrect wall: a stamped width/height here reds it.
    expect(resolved as Record<string, unknown>).not.toHaveProperty("width");
    expect(resolved as Record<string, unknown>).not.toHaveProperty("height");
    // a LEGAL member still rides the serve untouched (the degrade is
    // geometry-only — nothing else dropped)
    expect((resolved as Record<string, unknown>).prompt).toBe("brighten the anchor");
  });
});

describe("THE ONE-SPELLING SERVE (operator 2026-11-14: \"I told you ONE BENCH, but the agent and user have different input parameters\")", () => {
  // The burn: the agent attached the input image (params image1 on
  // image-edit, image_name on the h3 video card — spellings the
  // tool's own docs taught and the compose lanes still admit), the
  // run composed it, and the user's drill rendered the CANONICAL
  // seat EMPTY — a blank input square for an image that was there.
  // The serve is the 1:1 law (the map the NEXT RUN composes): the
  // lanes merge aliases engine-side, so the serve folds the same
  // merge and hands the form ONE spelling — the canonical seat.
  it("THE IMAGE-EDIT BURN: a row stating the image1 alias serves input_images — the drill's form renders the agent's image, never a blank square", () => {
    const resolved = svc.resolveStageParams({
      model: "qwen-img-edit-21",
      prompt: "brighten the anchor",
      image1: "data/input/a.png",
    });
    expect(resolved).not.toBeNull();
    const r = resolved as Record<string, unknown>;
    expect(r["input_images"]).toEqual(["data/input/a.png"]);
    expect(r).not.toHaveProperty("image1");
    // the untouched member still rides (the fold is alias-only)
    expect(r["prompt"]).toBe("brighten the anchor");
  });
  it("THE VIDEO-CARD BURN (h3): the image_name alias serves the canonical image seat — the timeline's First frame renders", () => {
    const resolved = svc.resolveStageParams({
      model: "h3",
      image_name: "data/input/first.png",
    });
    expect(resolved).not.toBeNull();
    const r = resolved as Record<string, unknown>;
    expect(r["image"]).toBe("data/input/first.png");
    expect(r).not.toHaveProperty("image_name");
  });
  it("THE MIGRATION LAW rides the serve: a stated canonical WINS and the alias folds away — never a second spelling beside the user's", () => {
    const resolved = svc.resolveStageParams({
      model: "qwen-img-edit-21",
      input_images: ["data/input/user.png"],
      image1: "data/input/agent.png",
    });
    expect(resolved).not.toBeNull();
    const r = resolved as Record<string, unknown>;
    expect(r["input_images"]).toEqual(["data/input/user.png"]);
    expect(r).not.toHaveProperty("image1");
  });
  it("declared order, blanks dropped: anchor, numbered slots, then the stack — the lane's own merge order", () => {
    const resolved = svc.resolveStageParams({
      model: "qwen-img-edit-21",
      image1: "data/input/a.png",
      image2: "  ",
      image3: "data/input/c.png",
      reference_images: ["data/input/d.png", "data/input/e.png"],
    });
    expect(resolved).not.toBeNull();
    expect((resolved as Record<string, unknown>)["input_images"]).toEqual([
      "data/input/a.png",
      "data/input/c.png",
      "data/input/d.png",
      "data/input/e.png",
    ]);
  });
  it("a blank-only alias folds to nothing (the empty list law — compose drops blanks, the serve never invents a slot)", () => {
    const resolved = svc.resolveStageParams({
      model: "qwen-img-edit-21",
      image1: "   ",
    });
    expect(resolved).not.toBeNull();
    expect((resolved as Record<string, unknown>)["input_images"]).toBeUndefined();
  });
  it("THE 1:1 COMPOSE PROOF: the folded serve composes the SAME list the raw row composes (orderedInputImages equal on every alias shape)", async () => {
    const kit = await import("@melite/comfyui-card-kit");
    const def = (await loadCardDefs()).get("image-edit");
    const fk = def?.flowKinds;
    expect(fk).toBeDefined();
    const shapes: Array<Record<string, unknown>> = [
      { image1: "data/input/a.png" },
      { image2: "data/input/b.png" },
      { image3: "data/input/c.png" },
      { reference_images: ["data/input/d.png", "data/input/e.png"] },
      { image1: "data/input/a.png", image2: "data/input/b.png", reference_images: ["data/input/d.png"] },
      { image1: "  " },
      { input_images: ["data/input/x.png"], image1: "data/input/a.png" },
      { input_images: [], image1: "data/input/a.png" },
      {},
    ];
    for (const raw of shapes) {
      expect(
        kit.orderedInputImages(kit.foldLegacyAliases(fk, raw)),
        "shape " + JSON.stringify(raw),
      ).toEqual(kit.orderedInputImages(raw));
    }
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

  it("a retired fold address refuses LOUD — never a false admit (the 2026-10-27 lesson, kept)", () => {
    // The folded single-shot/keyframe routes retired 2026-11-02
    // with the recipe rework; the facts row left WITH the route, so
    // the refusal is the clean unknown-model voice (the selection-
    // tolerance catch never sees a stale resolution truth).
    expect(() => prepareCardParams(svc, {}, "h3-fl2va", "1")).toThrow(/no model unit for model: h3-fl2va/);
    expect(() => prepareCardParams(svc, {}, "h3-keyframe", "1")).toThrow(/no model unit for model: h3-keyframe/);
  });

  it("the timeline route prepares as the h3 family, not a second family", () => {
    const out = prepareCardParams(svc, { prompt: "x" }, "h3-timeline", "1");
    expect(out.fam).toBe("h3");
  });

  // THE B7 RESIDUE (the tts dossier's second-rebuild live refusal,
  // 2026-11-12): the bench-save stanza shape ({model, params:{…}})
  // carried the qvoice bag where the overlay's top-level look never
  // saw it — 'ryan' stamped at the top level, the lift merged stamp +
  // stanza, and card-mode qvoice compose refused verbatim with NO
  // voice stated anywhere. THE REAL DOOR, REAL DEFS: the estate's one
  // prepare must never emit a preset beside a stated persona, at
  // EITHER seat (the flat agent body and the saved stanza).
  it("B7 residue: a stanza-carried qvoice composes with NO preset stamped (card-mode, real defs)", () => {
    const out = prepareCardParams(svc, {
      model: "qwen3-tts",
      params: {
        variant: "customvoice",
        text: "You dare enter my hall uninvited?",
        qvoice: "/mnt/data/models/audio/voices/hecate-01.qvoice",
        style_instruction: "FURIOUS.",
      },
    }, "qwen3-tts", "1");
    expect(out.fam).toBe("qwen3-tts");
    expect(out.params["voice"]).toBeUndefined();
    expect(out.params["qvoice"], "the customvoice lane's 'ryan' stamp must not land beside a stated persona — the engine's clone branch carries no speaker")
      .toBe("/mnt/data/models/audio/voices/hecate-01.qvoice");
  });

  it("B7 control: the same stanza naming NO qvoice still resolves the customvoice rest (the no-non-speaker ruling stands)", () => {
    const out = prepareCardParams(svc, {
      model: "qwen3-tts",
      params: { variant: "customvoice", text: "line" },
    }, "qwen3-tts", "1");
    expect(out.params["voice"]).toBe("ryan");
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

  it("maps a producer `when` throw to the card-compose refusal (PHASE2-CATCH-ALL)", async () => {
    // Round-22 compose audit Q5a: the raw rethrow surfaced as a 500
    // past both doors' CardArmError-only catches. A binding `when`
    // that throws is this card's resolution failing on the request —
    // the same 400 envelope as the refusal arm, the card and the
    // producer's own words named.
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
      await expect(svc.phase2Card(p1, "r-producer-throw")).rejects.toMatchObject({
        code: "card_compose",
        message: "flow-output: tts: producer exploded",
      });
    } finally {
      defs.set("tts", original);
    }
  });

  it("maps a flowKinds-less def's resolution crash to the card-compose refusal (PHASE2-CATCH-ALL)", async () => {
    // The unguarded `def.flowKinds.outputs` read (audit Q5a shape 1):
    // a hot-plugin def omitting flowKinds used to escape as a raw
    // TypeError; now the same 400 envelope.
    const defs = svc.defsSync();
    const original = defs.get("tts")!;
    const { flowKinds: _dropped, ...bare } = original as never as Record<string, unknown>;
    defs.set("tts", bare as never);
    try {
      composeOnce.mockResolvedValueOnce({} as never);
      const p1 = { mid: "m", fam: "f", card: "tts", skeleton: "s", decl: {}, params: {}, spell: null } as never;
      await expect(svc.phase2Card(p1, "r-no-flowkinds")).rejects.toMatchObject({
        code: "card_compose",
        message: expect.stringMatching(/^flow-output: tts: /),
      });
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
    expect(await svc.composeValidateCard("upscale-tools", "seedvr2-ema", { input_image: "a.png" })).toBeNull();
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
    const ans = await svc.composeValidateCard("upscale-tools", "seedvr2-ema", { input_image: "a.png" });
    expect(ans?.message).toBe("the refusal");
    expect(ans?.code).toBe("card_compose");
  });
  it("a non-card error rethrows (never swallowed)", async () => {
    vi.mocked(composeOnce).mockReset();
    composeOnce.mockRejectedValueOnce(new Error("wire died"));
    await expect(
      svc.composeValidateCard("upscale-tools", "seedvr2-ema", { input_image: "a.png" }),
    ).rejects.toThrow(/wire died/);
  });
});

describe.skipIf(!ESTATE_STORE_SEATED)("phase1Card + phase2Card (the two phases, one compose seat) (" + STORE_SEATED_SKIP + ")", () => {
  it("THE CLIP-GEOMETRY STAMP (2026-10-28, the operator's burn: width/height defaulting to zero for viggle): zeroed size knobs take the clip's OWN geometry before any resolution or judge", async () => {
    // A hand-crafted minimal MP4 (ftyp + moov{trak{tkhd, mdia{hdlr:
    // vide}}}) — the probe's tkhd fallback arm reads the display
    // size, so 928×1344 rides 16.16 fixed. The stamp fires at
    // phase1Card's head: the BODY mutates in place, and every seat
    // after (prep, lane verdict, compose) reads real numbers. The
    // toggle-out proof: without the stamp the 0s ride and this arm
    // reds on the first expect.
    // (RECUT onto h3-timeline, fix 7: the stamp is CARD-SCOPED now —
    // it fires only for a card whose own declaration admits
    // width/height. The hermetic world carries no viggle provision
    // row (its card resolves live only), and h3-timeline is the
    // video card here that declares both knobs; the original burn's
    // absent-key spelling stays the third arm below.)
    const mp4 = craftMinimalMp4(928, 1344);
    const dir = mkdtempSync(join(tmpdir(), "clip-geo-"));
    const clipPath = join(dir, "drive.mp4");
    writeFileSync(clipPath, mp4);
    const body: Record<string, unknown> = {
      clip: clipPath, width: 0, height: 0,
    };
    await svc.phase1Card(body, "h3-timeline").catch(() => undefined);
    expect(body["width"]).toBe(928);
    expect(body["height"]).toBe(1344);
    // BOTH STATED = the user owns the geometry (no stamp)
    const own: Record<string, unknown> = {
      clip: clipPath, width: 640, height: 480,
    };
    await svc.phase1Card(own, "h3-timeline").catch(() => undefined);
    expect(own["width"]).toBe(640);
    expect(own["height"]).toBe(480);
    // ABSENT KEYS = the GUI wire's spelling of unstated (the GUI
    // omits untouched form knobs — the 2026-10-28 lane-1 replay,
    // run-9e6585c227c8, carried NO width/height and the stamp
    // no-opped while the 0s rode): absent stamps exactly like 0
    const bare: Record<string, unknown> = {
      clip: clipPath,
    };
    await svc.phase1Card(bare, "h3-timeline").catch(() => undefined);
    expect(bare["width"]).toBe(928);
    expect(bare["height"]).toBe(1344);
    // AN UNREADABLE CLIP = no stamp, never a refusal (the engine's
    // follow-the-clip contract is the belt)
    const miss: Record<string, unknown> = {
      clip: join(dir, "not-there.mp4"), width: 0, height: 0,
    };
    await svc.phase1Card(miss, "h3-timeline").catch(() => undefined);
    expect(miss["width"]).toBe(0);
    expect(miss["height"]).toBe(0);
  });
  it("THE STAMP'S STATED/UNSTATED MATRIX (the write-door's guard rows): junk geometry, a half-owned size, a repo-relative clip, and every no-stamp source severity", async () => {
    // The stamp only ever touches knobs the user does not own. A
    // STATED non-number width (the GUI wire's string spelling) is
    // owned-but-unjudgeable: the door refuses downstream, it never
    // silently replaces the word. One arm per guard row, each asserting
    // the body the door hands the judges.
    const dir = mkdtempSync(join(tmpdir(), "clip-geo-matrix-"));
    const clipPath = join(dir, "drive.mp4");
    writeFileSync(clipPath, craftMinimalMp4(928, 1344));
    try {
      // junk width: stated, non-number -> the whole stamp stands down
      // (the unstated twin stays 0 too — no partial stamp on junk)
      const junkW: Record<string, unknown> = { clip: clipPath, width: "640", height: 0 };
      await svc.phase1Card(junkW, "h3-timeline").catch(() => undefined);
      expect(junkW["width"]).toBe("640");
      expect(junkW["height"]).toBe(0);
      // junk height: same guard, other axis
      const junkH: Record<string, unknown> = { clip: clipPath, width: 0, height: "480" };
      await svc.phase1Card(junkH, "h3-timeline").catch(() => undefined);
      expect(junkW["width"]).toBe("640"); // (a prior arm's body is unchanged)
      expect(junkH["width"]).toBe(0);
      expect(junkH["height"]).toBe("480");
      // HALF-OWNED GEOMETRY: one knob stated non-zero = the user owns
      // that axis; the unstated twin still takes the clip's truth
      const wOwn: Record<string, unknown> = { clip: clipPath, width: 640 };
      await svc.phase1Card(wOwn, "h3-timeline").catch(() => undefined);
      expect(wOwn["width"]).toBe(640);
      expect(wOwn["height"]).toBe(1344);
      const hOwn: Record<string, unknown> = { clip: clipPath, height: 480 };
      await svc.phase1Card(hOwn, "h3-timeline").catch(() => undefined);
      expect(hOwn["width"]).toBe(928);
      expect(hOwn["height"]).toBe(480);
      // THE ESTATE-UPLOADS SPELLING: a repo-relative `data/input/<name>`
      // clip resolves against the repo root and stamps like an absolute
      // one (the probe arm's path seat; the root is pointed at a throwaway
      // tree so the arm stays hermetic).
      const repoTmp = mkdtempSync(join(tmpdir(), "clip-geo-rel-"));
      mkdirSync(join(repoTmp, "data", "input"), { recursive: true });
      const relName = "clip-geo-rel-drive.mp4";
      writeFileSync(join(repoTmp, "data", "input", relName), craftMinimalMp4(928, 1344));
      process.env["MELITE_REPO_ROOT"] = repoTmp;
      try {
        const rel: Record<string, unknown> = { clip: "data/input/" + relName, width: 0, height: 0 };
        await svc.phase1Card(rel, "h3-timeline").catch(() => undefined);
        expect(rel["width"]).toBe(928);
        expect(rel["height"]).toBe(1344);
      } finally {
        delete process.env["MELITE_REPO_ROOT"];
        rmSync(repoTmp, { recursive: true, force: true });
      }
      // A CLIP THAT IS A DIRECTORY: stat answers, the file check
      // refuses — no stamp, never a refusal (the follow-the-clip
      // contract's belt)
      const dirClip: Record<string, unknown> = { clip: dir, width: 0, height: 0 };
      await svc.phase1Card(dirClip, "h3-timeline").catch(() => undefined);
      expect(dirClip["width"]).toBe(0);
      expect(dirClip["height"]).toBe(0);
      // A PROBE THE READER CANNOT NAME: a readable file of bytes no
      // container parser claims -> the probe refuses -> no stamp
      const junk = join(dir, "junk.bin");
      writeFileSync(junk, "this is not a media container");
      const junkClip: Record<string, unknown> = { clip: junk, width: 0, height: 0 };
      await svc.phase1Card(junkClip, "h3-timeline").catch(() => undefined);
      expect(junkClip["width"]).toBe(0);
      expect(junkClip["height"]).toBe(0);
      // A READABLE CONTAINER WITH NO VIDEO STREAM: the probe answers
      // (audio-only WAV) but no stream carries a display size — the
      // stamp has no geometry to take and the 0s ride
      const wav = join(dir, "tone.wav");
      writeFileSync(wav, craftMinimalWav());
      const wavClip: Record<string, unknown> = { clip: wav, width: 0, height: 0 };
      await svc.phase1Card(wavClip, "h3-timeline").catch(() => undefined);
      expect(wavClip["width"]).toBe(0);
      expect(wavClip["height"]).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("THE SILENT-SOURCE REFUSAL (F26, round 6): an armed sound-carrying bag whose source has NO audio track refuses at the door, naming the lane and the file — never mid-render in the VHS extractor's raw dump", async () => {
    // The burn: a bag source with no audio died mid-run inside the
    // vendored ffmpeg extractor AFTER the GPU bill. The door probes a
    // positive reading now: no `soun` track = refuse, zero GPU. A
    // container the probe cannot read stays the engine's belt (the
    // clip-geometry stamp's own posture).
    const dir = mkdtempSync(join(tmpdir(), "silent-src-"));
    const silent = join(dir, "silent.mp4");
    writeFileSync(silent, craftMinimalMp4(928, 1344));
    const withSound = join(dir, "with-sound.mp4");
    writeFileSync(withSound, craftMinimalMp4(928, 1344, true));
    const body = (clip: string): Record<string, unknown> => ({
      prompt: "a yard at dusk",
      refine: [{ source_clip: clip, refine_prompt: "sharpen the leaves" }],
    });
    await expect(svc.phase1Card(body(silent), "h3-timeline")).rejects.toThrow(
      /the refine pass carries the source clip's soundtrack, and ".*silent\.mp4" has no audio track/,
    );
    // the same bag over a track-carrying source hears no such voice
    const ok: Record<string, unknown> = body(withSound);
    await svc.phase1Card(ok, "h3-timeline").catch(() => undefined);
    // (a downstream refusal — weights, lanes — may speak; this door's
    // sentence must not)
    try {
      await svc.phase1Card(body(withSound), "h3-timeline");
    } catch (e: unknown) {
      expect(String((e as Error).message)).not.toMatch(/has no audio track/);
    }
  });
  it("THE LIVE BAG'S OWN VOICE (the collapse, slice 4 follow-up): the edit arm is sound-carrying too — its silent source refuses naming the edit lane, while the upscale posture (chain_run stated) reads no source sound and stays silent", async () => {
    // The deletion moved the one live door to `edit`; the belt still
    // listed only the five legacy spellings, so a hand-authored edit
    // bag over a silent source passed the door and died mid-render.
    const dir = mkdtempSync(join(tmpdir(), "silent-edit-"));
    const silent = join(dir, "silent-edit.mp4");
    writeFileSync(silent, craftMinimalMp4(928, 1344));
    const withSound = join(dir, "sound-edit.mp4");
    writeFileSync(withSound, craftMinimalMp4(928, 1344, true));
    const editBody = (clip: string): Record<string, unknown> => ({
      prompt: "a yard at dusk",
      edit: [{ source_clip: clip, edit_prompt: "clean the leaves", mask_source: "region", region_prompt: "leaves", denoise: 0.32 }],
    });
    await expect(svc.phase1Card(editBody(silent), "h3-timeline")).rejects.toThrow(
      /the edit pass carries the source clip's soundtrack, and ".*silent-edit\.mp4" has no audio track/,
    );
    const ok: Record<string, unknown> = editBody(withSound);
    await svc.phase1Card(ok, "h3-timeline").catch(() => undefined);
    try {
      await svc.phase1Card(editBody(withSound), "h3-timeline");
    } catch (e: unknown) {
      expect(String((e as Error).message)).not.toMatch(/has no audio track/);
    }
    // the upscale posture resumes a prior run and never reads this
    // clip's soundtrack — the same silent file hears no such voice
    const upscale: Record<string, unknown> = {
      prompt: "a yard at dusk",
      edit: [{ source_clip: silent, chain_run: "chain-a", denoise: 0.24 }],
    };
    await svc.phase1Card(upscale, "h3-timeline").catch(() => undefined);
    try {
      await svc.phase1Card(upscale, "h3-timeline");
    } catch (e: unknown) {
      expect(String((e as Error).message)).not.toMatch(/has no audio track/);
    }
  });
  it("THE REFINE WINDOW RANGE REFUSAL (qa8 F36): a window whose start_seconds runs past its source clip's end refuses at the door in words — never the VHS buffer crash mid-run", async () => {
    // The burn: chaining a refined output with start_seconds past its
    // end crashed VHS (`both buffer length (0) and count (-1) must
    // not be 0`) AFTER the GPU bill. The door probes the window's
    // clip first: skip (start × 24 at the film clock) at or past the
    // probed frame count refuses here, naming clip, length, start,
    // and the cure. Only a positive reading refuses — a clip the
    // probe cannot time stays the engine's belt.
    const dir = mkdtempSync(join(tmpdir(), "refine-range-"));
    // 48 frames at the film clock = 2.0s
    const short = join(dir, "short.mp4");
    writeFileSync(short, craftTimedMp4(928, 1344, 48));
    const body = (start: number | undefined): Record<string, unknown> => ({
      prompt: "a yard at dusk",
      refine: [
        start === undefined
          ? { source_clip: short, refine_prompt: "sharpen the leaves" }
          : { source_clip: short, refine_prompt: "sharpen the leaves", start_seconds: start },
      ],
    });
    const noRangeVoice = async (bagBody: Record<string, unknown>): Promise<void> => {
      try {
        await svc.phase1Card(bagBody, "h3-timeline");
      } catch (e: unknown) {
        expect(String((e as Error).message)).not.toMatch(/refine window starts/);
      }
    };
    try {
      // THE BURN FACE: start 2s over a 2s clip — skip 48 meets 48 frames
      await expect(svc.phase1Card(body(2.0), "h3-timeline")).rejects.toThrow(
        /the refine window starts at 2s \(skip 48 frames at the film clock\) but ".*short\.mp4" carries 48 frame\(s\) \(2s\) — the loader's skip_first_frames runs past the clip's end and the engine dies in the buffer arithmetic; start the window inside the clip \(start_seconds < 2\.00s\)/,
      );
      // a window INSIDE the clip hears no such voice
      await noRangeVoice(body(1.0));
      // an unstated start stays the engine's belt
      await noRangeVoice(body(undefined));
      // a clip the probe cannot time (no mvhd — no duration, no
      // frames) rides even with a wild start: only a positive
      // reading refuses
      const untimed = join(dir, "untimed.mp4");
      writeFileSync(untimed, craftMinimalMp4(928, 1344, true));
      await noRangeVoice({
        prompt: "a yard at dusk",
        refine: [{ source_clip: untimed, refine_prompt: "sharpen the leaves", start_seconds: 99 }],
      });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("THE BAG'S SECOND WINDOW IS PROBED TOO (qa8 F36, GAPS-19): a stacked refine bag whose SECOND entry starts past the clip's end refuses at the door — the probe walks every window, not just bag[0]", async () => {
    // THE BAG FACE OF THE BURN: the walk composes N windows over ONE
    // source, so a past-end origin on entry k>0 would die in the same
    // VHS buffer arithmetic AFTER the GPU bill. The probe reads every
    // entry's clip: the second window's skip past the probed frame
    // count refuses with the same sentence, naming the same clip.
    const dir = mkdtempSync(join(tmpdir(), "refine-range-bag-"));
    const short = join(dir, "short.mp4");
    writeFileSync(short, craftTimedMp4(928, 1344, 48)); // 48 frames = 2.0s
    const bag = (second: Record<string, unknown>): Record<string, unknown> => ({
      prompt: "a yard at dusk",
      refine: [
        { source_clip: short, refine_prompt: "sharpen the leaves" },
        second,
      ],
    });
    const noRangeVoice = async (bagBody: Record<string, unknown>): Promise<void> => {
      try {
        await svc.phase1Card(bagBody, "h3-timeline");
      } catch (e: unknown) {
        expect(String((e as Error).message)).not.toMatch(/refine window starts/);
      }
    };
    try {
      // THE BURN FACE ON ENTRY 1: the head window is clean; the tail
      // window's start 2s over the 2s clip refuses
      await expect(
        svc.phase1Card(bag({ source_clip: short, refine_prompt: "the tail, sharper", start_seconds: 2.0 }), "h3-timeline"),
      ).rejects.toThrow(
        /the refine window starts at 2s \(skip 48 frames at the film clock\) but ".*short\.mp4" carries 48 frame\(s\)/,
      );
      // a tail window INSIDE the clip hears no such voice
      await noRangeVoice(bag({ source_clip: short, refine_prompt: "the tail, sharper", start_seconds: 1.0 }));
      // an unstated tail origin rides the engine's belt (it starts at 0)
      await noRangeVoice(bag({ source_clip: short, refine_prompt: "the tail, sharper" }));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("THE PROBED-LENGTH STAMP (defect board D-5, 2026-11-16): a locally readable h3 bag source's TRUE frame count rides the compose copy — and never the caller's saved doc", async () => {
    // The burn: the operator's refine 2x press on a 56 f clip
    // refused "a 144 f window" — the edit cell planned the unstated
    // 6 s default and never read the film. The door now stamps the
    // probe's true count (__source_frames) onto the compose copy of
    // every h3 bag row it can read, so the render judges the film.
    // NON-POLLUTION is half the law: touched rows are CLONED — the
    // caller's body (the saved bench doc) never carries the key.
    const dir = mkdtempSync(join(tmpdir(), "d5-stamp-"));
    // 56 frames — the 2 s class's rung, the press's own clip
    const clip = join(dir, "take56.mp4");
    writeFileSync(clip, craftTimedMp4(928, 1344, 56));
    const row: Record<string, unknown> = {
      source_clip: clip, edit_prompt: "clean the leaves", mask_source: "region", region_prompt: "leaves", denoise: 0.32,
    };
    try {
      const p1 = await svc.phase1Card({ edit: [row] }, "h3-timeline");
      const stamped = (p1.params["edit"] as Array<Record<string, unknown>>)[0]!;
      expect(stamped["__source_frames"]).toBe(56);
      expect("__source_frames" in row).toBe(false);
      // a SECOND lane stamps too — the belt's whole bag list, one law
      const p1b = await svc.phase1Card(
        { refine: [{ source_clip: clip, refine_prompt: "sharpen" }] },
        "h3-timeline",
      );
      expect(((p1b.params["refine"] as Array<Record<string, unknown>>)[0]!)["__source_frames"]).toBe(56);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("AN UNRESOLVABLE SOURCE STAMPS NOTHING (the render's conservative clip_seconds plan keeps its voice — never an invented length)", async () => {
    const p1 = await svc.phase1Card({
      edit: [{
        source_clip: "/nonexistent/take.mp4", edit_prompt: "clean the leaves",
        mask_source: "region", region_prompt: "leaves", denoise: 0.32,
      }],
    }, "h3-timeline");
    expect("__source_frames" in ((p1.params["edit"] as Array<Record<string, unknown>>)[0]!)).toBe(false);
  });
  it("A chain_run RESUME ROW STAMPS NOTHING (the upscale posture resumes a prior run's scenes and reads no local clip)", async () => {
    const dir = mkdtempSync(join(tmpdir(), "d5-resume-"));
    const clip = join(dir, "take56.mp4");
    writeFileSync(clip, craftTimedMp4(928, 1344, 56));
    try {
      const p1 = await svc.phase1Card({
          edit: [{ source_clip: clip, chain_run: "chain-a", denoise: 0.24 }],
      }, "h3-timeline");
      expect("__source_frames" in ((p1.params["edit"] as Array<Record<string, unknown>>)[0]!)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("THE TRIM START RANGE REFUSAL (friction F3-08, TRM-P0-9): a trim whose start_seconds runs past the source clip's end refuses at the door in words — never the silent empty-clip done", async () => {
    // The burn (the Phase-3 violation log): start_seconds 99 on a
    // 3.75s clip composed GREEN — the run answered done and the
    // operator's clip came back EMPTY (skip 2376 frames into 90).
    // The door probes the trim's source first: skip (start × 24)
    // at or past the probed frame count refuses here, naming clip,
    // length, start, and the cure — the trim sibling of the F36
    // refine law above. Only a positive reading refuses; the
    // end-beyond-tail face stays the loader's documented clamp.
    const dir = mkdtempSync(join(tmpdir(), "trim-range-"));
    // 90 frames at the film clock = 3.75s (the log's own shape)
    const short = join(dir, "short.mp4");
    writeFileSync(short, craftTimedMp4(928, 1344, 90));
    const body = (start: number, end = -1): Record<string, unknown> => ({
      card: "trim", clip: short, start_seconds: start, end_seconds: end,
    });
    const noRangeVoice = async (bagBody: Record<string, unknown>): Promise<void> => {
      try {
        await svc.phase1Card(bagBody, "trim");
      } catch (e: unknown) {
        expect(String((e as Error).message)).not.toMatch(/trim window starts/);
      }
    };
    try {
      // THE BURN FACE: start 99s over a 3.75s clip
      await expect(svc.phase1Card(body(99), "trim")).rejects.toThrow(
        /the trim window starts at 99s \(skip 2376 frames at the trim card's 24 fps\) but ".*short\.mp4" carries 90 frame\(s\) \(3\.75s\) — the loader's skip_first_frames runs past the clip's last frame and the run composes an empty clip; trim inside the clip \(start_seconds < 3\.75s\) — end_seconds beyond the last frame stays the loader's own clamp/,
      );
      // the boundary edge: skip exactly AT the frame count (90 on
      // 90) is the same empty clip — at-or-past refuses
      await expect(svc.phase1Card(body(3.75), "trim")).rejects.toThrow(/trim window starts at 3\.75s/);
      // a start INSIDE the clip hears no such voice
      await noRangeVoice(body(1.0));
      // END BEYOND THE TAIL stays the loader's documented clamp,
      // never this door's (start 0, end 999 on a 3.75s clip)
      await noRangeVoice(body(0, 999));
      // a clip the probe cannot time (no mvhd — no duration, no
      // frames) rides even with the wild start: only a positive
      // reading refuses
      const untimed = join(dir, "untimed.mp4");
      writeFileSync(untimed, craftMinimalMp4(928, 1344, true));
      await noRangeVoice({ card: "trim", clip: untimed, start_seconds: 99, end_seconds: -1 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("THE PRODUCED CLIP RESOLVES (friction F3-08, the clip-source seat): a trim AND a refine window whose source is a prior stage's output — spelled as a run tail only the estate's own roots resolve — refuse past the tail in the same words", async () => {
    // THE REV-122 MISS: the bench composes over PRODUCED clips (a
    // prior stage's render in the run tree), but the window probes
    // resolved only the three compose spellings — a produced leaf
    // read as null and the arm silently went deaf while the live
    // bench composed green (start 99 on a 7.5 s film, rev 122). The
    // door now resolves through the queue seat's own roots
    // (runsSourceEcho's resolver) before the compose spellings; the
    // burn face refuses identically on both window seats.
    const root = mkdtempSync(join(tmpdir(), "trim-produced-"));
    const runId = "run-deadbeef-f308wall";
    const gen = join(root, "output", runId, "gen");
    mkdirSync(gen, { recursive: true });
    // 90 frames at the film clock = 3.75s (the log's own shape)
    writeFileSync(join(gen, "f308-wall.mp4"), craftTimedMp4(928, 1344, 90));
    const c2 = new Context();
    new FlowsSeatService(c2);
    (c2 as unknown as { queue: unknown }).queue = { stateRoot: root, stateRoots: [root] as string[] };
    const svc2 = new CardRegistryService(c2);
    await svc2.prime();
    const produced = `${runId}/gen/f308-wall.mp4`;
    try {
      // THE TRIM BURN FACE on the produced spelling
      await expect(
        svc2.phase1Card({ card: "trim", clip: produced, start_seconds: 99, end_seconds: -1 }, "trim"),
      ).rejects.toThrow(
        /the trim window starts at 99s \(skip 2376 frames at the trim card's 24 fps\) but "run-deadbeef-f308wall\/gen\/f308-wall\.mp4" carries 90 frame\(s\) \(3\.75s\)/,
      );
      // THE REFINE FACE rides the same resolver: the same produced
      // spelling past the tail refuses with the film clock's words
      await expect(
        svc2.phase1Card(
          { prompt: "a yard at dusk", refine: [{ source_clip: produced, refine_prompt: "sharpen the leaves", start_seconds: 99 }] },
          "h3-timeline",
        ),
      ).rejects.toThrow(
        /the refine window starts at 99s \(skip 2376 frames at the film clock\) but "run-deadbeef-f308wall\/gen\/f308-wall\.mp4" carries 90 frame\(s\)/,
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("THE CLIP-SOURCE BELT (friction F3-08): a produced spelling the estate roots cannot resolve still composes, and a produced clip inside its own tail hears no voice — the probe refuses only on a positive reading", async () => {
    // The belt posture is the cure's own contract: the probe may not
    // invent a refusal for a leaf it cannot see (a dead run tail is
    // the run door's own voice), and a live produced clip whose
    // window starts INSIDE it stays belt — only past the tail
    // refuses.
    const root = mkdtempSync(join(tmpdir(), "trim-belt-"));
    const c2 = new Context();
    new FlowsSeatService(c2);
    (c2 as unknown as { queue: unknown }).queue = { stateRoot: root, stateRoots: [root] as string[] };
    const svc2 = new CardRegistryService(c2);
    await svc2.prime();
    const noTrimVoice = async (bagBody: Record<string, unknown>): Promise<void> => {
      try {
        await svc2.phase1Card(bagBody, "trim");
      } catch (e: unknown) {
        expect(String((e as Error).message)).not.toMatch(/trim window starts/);
      }
    };
    try {
      // a dead run tail: no output tree, no compose spelling, no
      // input-index leaf
      await noTrimVoice({ card: "trim", clip: "run-deadbeef-gones/gen/f308-wall.mp4", start_seconds: 99, end_seconds: -1 });
      // a LIVE produced clip, window inside it: skip 24 < 90 — belt
      const gen = join(root, "output", "run-deadbeef-f308live", "gen");
      mkdirSync(gen, { recursive: true });
      writeFileSync(join(gen, "f308-wall.mp4"), craftTimedMp4(928, 1344, 90));
      await noTrimVoice({ card: "trim", clip: "run-deadbeef-f308live/gen/f308-wall.mp4", start_seconds: 1.0, end_seconds: -1 });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it("THE WINDOW BELT'S UNJUDGEABLE ARMS (friction F3-08, the belt's last shapes): a refine source that resolves nowhere, junk containers on both window seats, and a trim start that is no finite number ride the belt — the probe refuses only a positive reading", async () => {
    // The belt's posture is the window cure's own contract (the F36
    // sibling arms above): the probe judges only what it can SEE and
    // READ. A source the estate roots and the compose spellings
    // cannot resolve is the run door's voice; a readable file the
    // container parser refuses is the engine's; a start_seconds that
    // is no finite number reads as the zero origin (the window's own
    // guard, the same sentence the unstated-start arm rides on the
    // refine seat). Each arm asserts the seat never speaks the window
    // sentence for its shape.
    const dir = mkdtempSync(join(tmpdir(), "window-belt-"));
    const junk = join(dir, "junk.bin");
    writeFileSync(junk, "this is not a media container");
    // 90 frames at the film clock — a real, readable, timed clip for
    // the unreadable-start arm (the shape is the START, not the clip)
    const timed = join(dir, "timed.mp4");
    writeFileSync(timed, craftTimedMp4(928, 1344, 90));
    const noRefineVoice = async (bagBody: Record<string, unknown>): Promise<void> => {
      try {
        await svc.phase1Card(bagBody, "h3-timeline");
      } catch (e: unknown) {
        expect(String((e as Error).message)).not.toMatch(/refine window starts/);
      }
    };
    const noTrimVoice = async (trimBody: Record<string, unknown>): Promise<void> => {
      try {
        await svc.phase1Card(trimBody, "trim");
      } catch (e: unknown) {
        expect(String((e as Error).message)).not.toMatch(/trim window starts/);
      }
    };
    try {
      // a produced spelling the estate roots and the compose
      // spellings cannot resolve: the walk answers null and the
      // refine seat rides
      await noRefineVoice({
        prompt: "a yard at dusk",
        refine: [
          { source_clip: "run-deadbeef-gones/gen/f308-belt-miss.mp4", refine_prompt: "sharpen the leaves", start_seconds: 99 },
        ],
      });
      // a readable file no container parser claims, on the refine seat
      await noRefineVoice({
        prompt: "a yard at dusk",
        refine: [{ source_clip: junk, refine_prompt: "sharpen the leaves", start_seconds: 99 }],
      });
      // the same junk on the trim seat
      await noTrimVoice({ card: "trim", clip: junk, start_seconds: 99, end_seconds: -1 });
      // a start the film clock cannot read reads as zero — the belt,
      // never an invented refusal
      await noTrimVoice({ card: "trim", clip: timed, start_seconds: NaN, end_seconds: -1 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("THE WINDOW REFUSAL'S FRAME-ONLY SENTENCE (friction F3-08): a clip whose container names a frame count but no movie clock refuses past the tail naming the count alone — both window seats speak the length they can prove", async () => {
    // The burn sentence names "the probed length". A container can
    // carry the sample table (the stts count — the loader's own skip
    // arithmetic) without a movie header (no mvhd — no duration): the
    // probe still answers a positive frame count, so past-the-tail
    // still refuses on both seats — and the sentence names exactly
    // the count, never a duration it cannot prove.
    const dir = mkdtempSync(join(tmpdir(), "window-frames-"));
    // 48 frames named by the sample table, no movie clock
    const framed = join(dir, "framed.mp4");
    writeFileSync(framed, craftFramedMp4(928, 1344, 48));
    try {
      // THE REFINE SEAT: start 99s over a 48-frame clip — skip 2376
      await expect(
        svc.phase1Card(
          { prompt: "a yard at dusk", refine: [{ source_clip: framed, refine_prompt: "sharpen the leaves", start_seconds: 99 }] },
          "h3-timeline",
        ),
      ).rejects.toThrow(
        /the refine window starts at 99s \(skip 2376 frames at the film clock\) but ".*framed\.mp4" carries 48 frame\(s\) — the loader's skip_first_frames runs past the clip's end/,
      );
      // THE TRIM SEAT: the same container, the trim card's own words
      await expect(
        svc.phase1Card({ card: "trim", clip: framed, start_seconds: 99, end_seconds: -1 }, "trim"),
      ).rejects.toThrow(
        /the trim window starts at 99s \(skip 2376 frames at the trim card's 24 fps\) but ".*framed\.mp4" carries 48 frame\(s\) — the loader's skip_first_frames runs past the clip's last frame/,
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("THE BAG GUARD'S TAIL ARMS (the silent-source belt skips what it cannot judge): junk entries, clip-less entries, dead leaves, directory leaves, and unnamed containers ride to the run door's own voice — never this probe's", async () => {
    // The belt judges only what it can name: an entry that is not an
    // object, an entry without a source_clip, a leaf that resolves
    // nowhere, a leaf that stats to a directory, and a readable file
    // the container parser refuses are ALL skipped — the refusal
    // (F26) fires only for a named, readable, probed source that
    // answers with no audio. Each arm asserts the door never speaks
    // the silent-source sentence for its shape.
    const dir = mkdtempSync(join(tmpdir(), "bag-guards-"));
    const junk = join(dir, "junk.bin");
    writeFileSync(junk, "this is not a media container");
    const noSilentVoice = async (bagBody: Record<string, unknown>): Promise<void> => {
      try {
        await svc.phase1Card(bagBody, "h3-timeline");
      } catch (e: unknown) {
        expect(String((e as Error).message)).not.toMatch(/has no audio track/);
      }
    };
    const body = (refine: unknown[]): Record<string, unknown> => ({
      prompt: "a yard at dusk",
      refine,
    });
    try {
      // an entry that is not an object: not judged, not probed
      await noSilentVoice(body(["not-an-object"]));
      // an entry with no source_clip: nothing to name
      await noSilentVoice(body([{ refine_prompt: "sharpen the leaves" }]));
      // a relative leaf that resolves nowhere (repo root, then the
      // input index) plus a leaf ending in "/" (no basename): the
      // candidates all miss -> the belt skips
      await noSilentVoice(
        body([
          { source_clip: "no-such-bag-source.mp4" },
          { source_clip: "no-such-dir/" },
        ]),
      );
      // a leaf that stats to a directory: the file check skips it
      await noSilentVoice(body([{ source_clip: dir }]));
      // a readable file the probe cannot name: the probe refuses and
      // the belt skips (the engine's belt, the stamp's own posture)
      await noSilentVoice(body([{ source_clip: junk }]));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
  it("THE STAMP IS CARD-SCOPED (fix 7, 2026-10-28 — the track-card admission burn): a card that declares no size knobs gets NO stamped keys; the stamp may not invent params admission refuses", async () => {
    // The burn: the track card's ONE media seat is `clip`, its
    // schema declares no width/height knobs, and the h3 swap press
    // rode the absent-key spelling — the stamp wrote width/height
    // onto the body and admission refused the run it was trying to
    // help: "unknown param(s) on the track card: height, width".
    // The identical shape on a .webm probe miss passed (no stamp).
    // The cure scopes the stamp to admission's own predicate.
    // Toggle-out proof: an unconditional stamp reds the first
    // expect (width/height appear on the body).
    const mp4 = craftMinimalMp4(928, 1344);
    const dir = mkdtempSync(join(tmpdir(), "clip-geo-"));
    const clipPath = join(dir, "drive.mp4");
    writeFileSync(clipPath, mp4);
    const body: Record<string, unknown> = { clip: clipPath, prompt: "person" };
    const verdict = await svc.phase1Card(body, "track").then(
      () => null,
      (e: unknown) => e,
    );
    expect(body).not.toHaveProperty("width");
    expect(body).not.toHaveProperty("height");
    // and the run must not die in the burn's voice — a downstream
    // refusal (weights, lanes) may speak, admission for stamped
    // geometry may not
    expect(verdict === null ? "" : String(verdict)).not.toMatch(/unknown param/);
  });
  it("a spell body pools its $ inputs and composes NO graph", async () => {
    // upscale-tools carries spells: ['input_image'] — a $ value
    // pools and phase-1 composes nothing (the two-card handoff)
    composeOnce.mockClear();
    const p1 = await svc.phase1Card({ input_image: "$upstream" }, "seedvr2-ema");
    expect(p1.spell).not.toBeNull();
    expect((p1.spell as { inputs: Record<string, unknown> }).inputs["input_image"]).toBe("$upstream");
    expect(composeOnce).not.toHaveBeenCalled();
  });
  it("a non-$ spell value stays OUT of the pool (the plain compose arm)", async () => {
    composeOnce.mockClear();
    const p1 = await svc.phase1Card({ input_image: "plain.png" }, "seedvr2-ema");
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
    // THE SUBJECT IS DECLARED, NEVER INHERITED (the order-coupling
    // cure, 2026-11-01): this arm used to ride Object.keys(facts)[0]
    // — the facts fixture's ROW ORDER chose the composed family
    // (anima sorted first, so the arm composed image-gen and the
    // assertions held). A facts regen that fronts any other family
    // flips the verdict with zero code movement (toggled 2026-11-01:
    // fronting 'anny' reds THIS arm alone — "unknown param(s) on the
    // anny card: prompt" — while the 78 order-tolerant arms stay
    // green). The subject is now the first facts row whose DECLARED
    // card is image-gen — the same family the arm always composed,
    // picked by declaration, never by position.
    const facts = svc.modelFacts();
    const mid = Object.keys(facts).find((id) => facts[id]?.card === "image-gen");
    if (mid === undefined) {
      throw new Error("no image-gen facts row — the arm's declared subject is gone");
    }
    // THE BODY IS NOW A LEGAL ONE (2026-10-10, the DECL audit's gap 4
    // kill): an image family's required word says the prompt must be
    // stated — a prompt-less body is refused at the bench AND at the
    // phase seat, and this arm is about the two phases riding one
    // seat, not about composing nothing. THE DOUBLE CARRIES THE REAL
    // EMIT (the object-forge producer-law cure, 2026-11-01): the
    // image-gen card's flowOutputBindings row phase-2 resolves
    // against the graph — the fake composes the save every family
    // press emits, so the seat's phases stay the arm's subject.
    // THE SEAM IS PER-ARM (the shared-mock-state cure, the same
    // order lesson): mockClear left PRIOR ARMS' queued
    // once-implementations alive (the tts arm queues two above), so
    // this arm's queue could inherit another arm's emits — the
    // verdict coupled to arm ORDER. mockReset drops the once-queue
    // and restores the factory fallback, so this arm consumes
    // exactly its own two emits in any arm order.
    composeOnce.mockReset();
    const emitted = { "SaveImage.0": { class_type: "SaveImage", inputs: {} } };
    composeOnce.mockResolvedValueOnce(emitted as never).mockResolvedValueOnce(emitted as never);
    const p1 = await svc.phase1Card({ model: mid, prompt: "a harbour at dusk" }, mid);
    expect(p1.spell).toBeNull();
    const c = await svc.phase2Card(p1, "run-1");
    expect(c.graph).toEqual(emitted);
    expect(c.skeleton).toBe(p1.skeleton);
    expect(c.outputNodes).toEqual({ default: "SaveImage.0" });
    expect(composeOnce).toHaveBeenCalledTimes(2);
  });
});

describe("primeObjectInfo's unreachable-engine arm", () => {
  it("a dead engine endpoint degrades to null + false, never a throw", async () => {
    // EXPLICIT SIMULATION (the hermetic-engine file mock owns the
    // boot fetch — a dead port would never be dialed): the throw
    // stands in for the refused connection; the degrade path
    // (null + false, never a throw) is the subject, not the socket.
    // Sequenced as plain data (never a barrel re-import).
    bootSeat.failNext = "connect ECONNREFUSED 127.0.0.1:1";
    const c2 = new Context();
    new FlowsSeatService(c2);
    const fresh = new CardRegistryService(c2);
    expect(await fresh.primeObjectInfo()).toBe(false);
    expect(fresh.objectInfo()).toBeNull();
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
    // THE FOLD (2026-10-26, size-at-quant): ONE qwen3-tts atom — the
    // retained design route folds to the merged family, and the
    // DECL's own voicedesign variant restores the lane coordinate.
    expect(svc.repairStageModel("tts", "qwen3-tts-voicedesign-design")).toEqual({
      model: "qwen3-tts",
      variant: "voicedesign",
    });
  });
  it("a variant-id suffix repairs via the prefix ladder (family + variant)", () => {
    // THE FOLD: the merged family's own variant suffix restores the
    // coordinate through the prefix ladder (the dead family's
    // '-voicedesign' suffix died with it — the retained boarded
    // route declares no variant row, so a suffix on it strips to
    // the route itself, pinned below).
    expect(svc.repairStageModel("tts", "qwen3-tts-customvoice")).toEqual({
      model: "qwen3-tts",
      variant: "customvoice",
    });
    expect(svc.repairStageModel("tts", "qwen3-tts-voicedesign-voicedesign")).toEqual({
      model: "qwen3-tts-voicedesign",
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
    // THE FOLD (2026-10-26, size-at-quant): the retained design
    // address folds to the ONE merged atom (the owners map names
    // qwen3-tts for every retained route).
    expect(svc.resolveCardFamily("qwen3-tts-voicedesign-design")).toBe("qwen3-tts");
  });
  it("a retained route folds to the merged atom; the head id resolves to itself", () => {
    // THE FOLD: qwen3-tts-voicedesign is no family — it is the merged
    // atom's retained large-CustomVoice route, so it folds to
    // qwen3-tts; the head id's defaults point at itself.
    expect(svc.resolveCardFamily("qwen3-tts-voicedesign")).toBe("qwen3-tts");
    expect(svc.resolveCardFamily("qwen3-tts")).toBe("qwen3-tts");
  });
  it("a retained base route folds to the merged atom through the variant table", () => {
    // THE FOLD: the retained clone route resolves to the one atom —
    // the cell/variant route arms keep their law, one family deep.
    const out = svc.resolveCardFamily("qwen3-tts-voicedesign-base");
    expect(out).toBe("qwen3-tts");
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

// ── THE SINGLETON RE-ARM (auditor G's row, 2026-10-22): a weight
// landing drops the live /object_info doc; the next re-prime
// fetches a NEW doc identity — and the process singleton the
// serving surfaces read (the spec door's packs block, the load
// bundle's pack hints) must follow it without a reboot. The
// identity guard keeps the hot-cache path free, and an unreachable
// engine never degrades a healthy singleton.
describe("the singleton re-arm (a weight landing reaches the serving surfaces without a reboot)", () => {
  it("re-prime arms on a changed doc, skips an unchanged one, and keeps the last good doc when the engine is gone", async () => {
    // EXPLICIT SEQUENCING (the hermetic-engine file mock owns the
    // boot fetch — sockets would never be dialed): each leg feeds
    // the census exactly one doc event; the re-arm identity law is
    // the subject. The transport's own invalidation law (drop the
    // cache, re-fetch post-landing) rides the REAL liveObjectInfo
    // in manage-plane-acquire-weight.spec.ts's fixture socket —
    // this arm judges the registry's re-arm, never the cache.
    // Sequenced on the hoisted censusFn (never a barrel re-import —
    // loadCardDefs/theService ride the static source import above,
    // the same module instance the mocked barrel re-exports).
    await loadCardDefs(); // the singleton is resolvable in this fiber
    const spy = vi.spyOn(theService(), "setObjectInfo");
    let freshCtx: Context | null = null;
    try {
      freshCtx = new Context();
      new FlowsSeatService(freshCtx);
      (freshCtx as unknown as { queue: unknown }).queue = {
        stateRoot: mkdtempSync(join(tmpdir(), "cards-rearm-")),
        stateRoots: [] as string[],
      };
      const reg = new CardRegistryService(freshCtx);
      await reg.prime(); // leg 1: the boot arm (unconditional)
      expect(spy).toHaveBeenCalledTimes(1);
      // leg 2: the stable mock answers the SAME doc identity — no re-arm
      expect(await reg.primeObjectInfo()).toBe(true);
      expect(spy).toHaveBeenCalledTimes(1);
      // leg 3: the landing shape — the census serves a new identity,
      // the re-prime follows it
      bootSeat.nextDoc = { generation: 2, ChangedNode: {} };
      expect(await reg.primeObjectInfo()).toBe(true);
      expect(spy).toHaveBeenCalledTimes(2);
      // leg 4: an unreachable engine keeps the last good singleton doc
      bootSeat.failNext = "connect ECONNREFUSED 127.0.0.1:1";
      expect(await reg.primeObjectInfo()).toBe(false);
      expect(spy).toHaveBeenCalledTimes(2);
    } finally {
      spy.mockRestore();
      // no mockReset: the mock*Once queue is consumed by the legs
      // above — the file mock's double answers again after.
      await freshCtx?.fiber.dispose();
    }
  });
});

describe("the hermetic engine (the gate-37 flake cure: no live socket on the boot path)", () => {
  it("every prime rode the mock", () => {
    expect(bootSeat.fetches).toBeGreaterThan(0);
  });
});

/** A minimal probe-able MP4 for the clip-geometry stamp arm: ftyp +
 *  moov{trak{tkhd(display size), mdia{hdlr: vide}}} — the probe's
 *  tkhd fallback reads width/height as 16.16 fixed points; no stsd
 *  needed (the fallback arm is the point). Pure bytes, hermetic. */
function craftMinimalMp4(width: number, height: number, audio = false): Buffer {
  const box = (type: string, body: Buffer): Buffer => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length + 8, 0);
    head.write(type, 4, "ascii");
    return Buffer.concat([head, body]);
  };
  const tkhd = Buffer.alloc(84);
  tkhd.writeUInt32BE(0, 0); // version 0 + flags
  // created/modified/track_id/reserved/duration (20), reserved (8),
  // layer/alt/volume/reserved (8), matrix (36) all stay zero
  tkhd.writeUInt32BE(width << 16, 76);
  tkhd.writeUInt32BE(height << 16, 80);
  const hdlr = Buffer.alloc(24);
  // handler fourcc at body offset 8: version/flags(4) + pre_defined(4)
  hdlr.write("vide", 8, "ascii");
  const trak = Buffer.concat([box("tkhd", tkhd), box("mdia", box("hdlr", hdlr))]);
  // THE SOUND TRACK (the F26 arm): a second trak whose mdia/hdlr says
  // `soun` — the probe reports it as an audio stream, which is all the
  // silent-source door reads.
  const strak = (): Buffer => {
    const shdlr = Buffer.alloc(24);
    shdlr.write("soun", 8, "ascii");
    return box("trak", box("mdia", box("hdlr", shdlr)));
  };
  const ftyp = Buffer.alloc(8);
  ftyp.write("isom", 4, "ascii");
  return Buffer.concat([
    box("ftyp", ftyp),
    box("moov", audio ? Buffer.concat([box("trak", trak), strak()]) : box("trak", trak)),
  ]);
}

/** A timed variant for the F36 range arms: the same shape plus an
 *  mvhd (v0, timescale 24) so the probe answers duration_s — the
 *  movie clock the range refusal reads. Carries the sound track
 *  (the silent-source door runs first and would otherwise speak). */
function craftTimedMp4(width: number, height: number, frames: number): Buffer {
  const box = (type: string, body: Buffer): Buffer => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length + 8, 0);
    head.write(type, 4, "ascii");
    return Buffer.concat([head, body]);
  };
  const tkhd = Buffer.alloc(84);
  tkhd.writeUInt32BE(0, 0);
  tkhd.writeUInt32BE(width << 16, 76);
  tkhd.writeUInt32BE(height << 16, 80);
  const hdlr = Buffer.alloc(24);
  hdlr.write("vide", 8, "ascii");
  const trak = Buffer.concat([box("tkhd", tkhd), box("mdia", box("hdlr", hdlr))]);
  const shdlr = Buffer.alloc(24);
  shdlr.write("soun", 8, "ascii");
  const strak = box("trak", box("mdia", box("hdlr", shdlr)));
  const mvhd = Buffer.alloc(20);
  mvhd.writeUInt32BE(0, 0); // version 0 + flags
  // created + modified stay zero
  mvhd.writeUInt32BE(24, 12); // timescale: the film clock
  mvhd.writeUInt32BE(frames, 16); // duration: the frame count
  const ftyp = Buffer.alloc(8);
  ftyp.write("isom", 4, "ascii");
  return Buffer.concat([
    box("ftyp", ftyp),
    box("moov", Buffer.concat([box("mvhd", mvhd), box("trak", trak), strak])),
  ]);
}

/** A frame-counted container with NO movie clock for the window
 *  refusal's sentence arms: the timed shape above minus the mvhd —
 *  the frame count lives in the sample table (stbl/stts, one
 *  count/delta pair; the count IS the frame count the loader skips
 *  by) and the movie header is absent, so the probe answers frames
 *  and NO duration. The sound track rides (the silent-source door
 *  runs first on the refine seat and would otherwise speak). Pure
 *  bytes, hermetic. */
function craftFramedMp4(width: number, height: number, frames: number): Buffer {
  const box = (type: string, body: Buffer): Buffer => {
    const head = Buffer.alloc(8);
    head.writeUInt32BE(body.length + 8, 0);
    head.write(type, 4, "ascii");
    return Buffer.concat([head, body]);
  };
  const tkhd = Buffer.alloc(84);
  tkhd.writeUInt32BE(0, 0);
  tkhd.writeUInt32BE(width << 16, 76);
  tkhd.writeUInt32BE(height << 16, 80);
  const hdlr = Buffer.alloc(24);
  hdlr.write("vide", 8, "ascii");
  const stsdHead = Buffer.alloc(8);
  stsdHead.writeUInt32BE(1, 4); // one sample entry
  const avc1 = Buffer.alloc(28); // reserved(6) + dri(2) + reserved(16)
  avc1.writeUInt16BE(width, 24); // the visual entry's width
  avc1.writeUInt16BE(height, 26); // and height
  const stts = Buffer.alloc(16);
  stts.writeUInt32BE(1, 4); // one count/delta entry
  stts.writeUInt32BE(frames, 8); // the count IS the frame count
  stts.writeUInt32BE(1, 12); // one tick per frame
  const stbl = box("stbl", Buffer.concat([
    box("stsd", Buffer.concat([stsdHead, box("avc1", avc1)])),
    box("stts", stts),
  ]));
  const mdia = box("mdia", Buffer.concat([box("hdlr", hdlr), box("minf", stbl)]));
  const trak = box("trak", Buffer.concat([box("tkhd", tkhd), mdia]));
  const shdlr = Buffer.alloc(24);
  shdlr.write("soun", 8, "ascii");
  const strak = box("trak", box("mdia", box("hdlr", shdlr)));
  const ftyp = Buffer.alloc(8);
  ftyp.write("isom", 4, "ascii");
  // NO mvhd in the moov: the container names its frame count and no
  // duration — the probe answers exactly that
  return Buffer.concat([
    box("ftyp", ftyp),
    box("moov", Buffer.concat([trak, strak])),
  ]);
}

/** A minimal probe-able PCM WAV (RIFF/WAVE + fmt + data): the probe
 *  answers with ONE audio stream that carries no display size — the
 *  clip-geometry stamp's no-video-stream arm. Pure bytes, hermetic.
 *  RIFF chunk order is fourcc-first, size-second (LE) — the opposite
 *  of ISO-BMFF's box header. */
function craftMinimalWav(): Buffer {
  const fmt = Buffer.alloc(16);
  fmt.writeUInt16LE(1, 0); // PCM tag
  fmt.writeUInt16LE(1, 2); // channels
  fmt.writeUInt32LE(44100, 4); // sample rate
  fmt.writeUInt32LE(88200, 8); // byte rate
  fmt.writeUInt16LE(2, 12); // block align
  fmt.writeUInt16LE(16, 14); // bits
  const chunk = (id: string, body: Buffer): Buffer => {
    const h = Buffer.alloc(8);
    h.write(id, 0, "ascii");
    h.writeUInt32LE(body.length, 4);
    return Buffer.concat([h, body]);
  };
  const riff = Buffer.alloc(12);
  riff.write("RIFF", 0, "ascii");
  riff.writeUInt32LE(4 + 8 + 16 + 8 + 4, 4);
  riff.write("WAVE", 8, "ascii");
  return Buffer.concat([riff, chunk("fmt ", fmt), chunk("data", Buffer.alloc(4))]);
}

describe.skipIf(!ESTATE_STORE_SEATED)("THE ONE-BENCH FAMILY DOOR — RETIRED (2026-11-15): no lane dead letter; the lane fires the post quartet (" + STORE_SEATED_SKIP + ")", () => {
  // operator (2026-11-14, verbatim): "sharpen_enabled,
  // interpolate_enabled, sr_switch, second_pass_enabled fires
  // nothing on the t4r lane — the lane refuses it (unsanctioned
  // inject keys); the estate walk refuses the same key at the door.
  // The AI MADE A CARD WITH THAT ERROR, AND RENDERED ANYWAYS...! I
  // KEPT SAYING ONE BENCH. BUT THAT IS *never* TRUE."
  //
  // THE CURE IS THE RENDERER, NEVER A LOUDER REFUSAL (2026-11-15):
  // the t4r render arm now MOUNTS the post chain (actions.ts
  // renderH3Window hoists it above the family branch), so the four
  // fire on every lane and the card declares NO family admission
  // face (card.ts's retirement note). ONE BENCH now holds the other
  // way round: the write seat is an honest no-op on a card with no
  // face, the compose seat admits and keeps the quartet, the
  // validate walk lands it, and the serve hands it on with its
  // stamps — four doors, one verdict. The only family-shaped refusal
  // left is the compose walk's film-only gate (schema.ts:
  // duck_depth_db is read only inside the multi-window film tail),
  // and that gate fires at the run door; packages/models/h3/tests/
  // door.spec.ts owns its firing proof.
  const clean = { model: "h3", image: "data/input/first.png" };
  const quartet = {
    ...clean,
    sharpen_enabled: true,
    interpolate_enabled: true,
    sr_switch: true,
    second_pass_enabled: true,
  };

  it("A. the seat is a no-op on the real def (no lane dead letter) and the compose seat admits the quartet", () => {
    expect(svc.admitStageFamily("h3-timeline", quartet)).toEqual({ ok: true });
    const prep = prepareCardParams(svc, { ...quartet }, "h3", "1");
    // the quartet is NOT state the door may eat: it lands in the
    // prepared params and the run composes it
    expect(prep.params["sharpen_enabled"]).toBe(true);
    expect(prep.params["interpolate_enabled"]).toBe(true);
    expect(prep.params["sr_switch"]).toBe(true);
    expect(prep.params["second_pass_enabled"]).toBe(true);
    // the film-only key is ADMITTED at the write/compose seats too:
    // the stored doc keeps its author's bytes and the run door's walk
    // (the card's def.schema) speaks the film-only letter — no door
    // pretends to be the other's judge.
    expect(svc.admitStageFamily("h3-timeline", { ...clean, duck_depth_db: 0.4 })).toEqual({ ok: true });
  });

  it("B. the CLEAN t4r compose stamps ZERO of the four (the seat cannot false-fire) and a legal film keeps its post keys", () => {
    const prep = prepareCardParams(svc, { ...clean }, "h3", "1");
    expect(prep.params["sharpen_enabled"]).toBeUndefined();
    expect(prep.params["interpolate_enabled"]).toBeUndefined();
    expect(prep.params["sr_switch"]).toBeUndefined();
    expect(prep.params["second_pass_enabled"]).toBeUndefined();
    const film = {
      model: "h3",
      prompt: "two beats",
      calls: [
        { prompt: "beat one" },
        { prompt: "beat two", second_pass_enabled: true },
      ],
    };
    const filmPrep = prepareCardParams(svc, film, "h3", "1");
    expect(filmPrep.params["calls"]).toEqual(film.calls);
  });

  it("C. the validate walk lands the quartet doc on h3-timeline (the burn no longer bricks the press)", async () => {
    const verdict = await svc.phase1Card({ ...quartet }, "h3");
    expect(verdict.card).toBe("h3-timeline");
    const cleanVerdict = await svc.phase1Card({ ...clean }, "h3");
    expect(cleanVerdict.card).toBe("h3-timeline");
  });

  it("D. the serve hands the run the doc it authored — the quartet keeps its stamps", () => {
    const served = svc.resolveStageParams({ ...quartet }) as Record<string, unknown>;
    expect(served).not.toBeNull();
    expect(served["sharpen_enabled"]).toBe(true);
    expect(served["interpolate_enabled"]).toBe(true);
    expect(served["sr_switch"]).toBe(true);
    expect(served["second_pass_enabled"]).toBe(true);
    expect(served["image"]).toBe("data/input/first.png");
  });
});
