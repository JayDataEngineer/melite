// @melite/comfyui-cordis — the card registry's boot + refusal arms
// (TEST-2 breadth, 2026-09-12). The boot composes REAL packages
// (no fixtures: the sweep IS the unit) — the refusal arms ride
// data-URL modules (real modules, no host face) and synthetic
// defs. The pre-boot theService() throw pins a FRESH copy of the
// module (li-m, 2026-10-10: the test project's setup awaits the
// shared models boot before any spec runs, so this file's registry
// is already booted — see the gate test's own note).
import { describe, it, vi } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import {
  assertCardIdentity, loadCardDefs, pluginPackage, refreshCardDefs,
  provisionsByFamily, theService,
} from "../src/cardDefs.ts";
import { ComfyUIService } from "../src/service.ts";
import { modelsService } from "../src/models/models.ts";
import type { CardDefinition } from '@melite/comfyui-card-kit/card-definition';
// THE PER-FILE BOOT (li-m's own law, applied to the tests): models
// never boot at import (that import-time await bricked the estate
// boot), so a spec that reads the model table SYNCONCALLY boots it
// in its own top level — one await, this file's world, exactly like
// the estate's cardsRegistry awaits bootModels() at its compose
// seat. There is deliberately no global test setup for this: a
// pre-boot that imports the engine barrel before every spec's
// `vi.mock` registers silently disarms the transport-seam mocks
// (comfyui-control.spec.ts ran against the real module and its
// best-effort swallow hid the failure).
import { cascadeInit } from "../src/models/models.ts";

await cascadeInit();

const FACELESS = "data:text/javascript,export const x = 1";

describe("pluginPackage (the composition step)", () => {
  it("a faceless module refuses with the card voice", async () => {
    const ctx = new Context();
    await assert.rejects(
      pluginPackage(ctx, FACELESS, "card package"),
      (e: unknown) => e instanceof Error &&
        (e as Error).message.startsWith("card package missing its host face: data:"),
    );
  });

  it("a faceless module refuses with the flavor voice (label rides)", async () => {
    const ctx = new Context();
    await assert.rejects(
      pluginPackage(ctx, FACELESS, "packaged flavor", "test flavor"),
      /packaged flavor missing: test flavor \(data:/,
    );
  });

  it("a real card package composes (the happy arm)", async () => {
    const ctx = new Context();
    await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
    await pluginPackage(ctx, "@melite/audio-sfx", "card package");
    assert.ok(ctx.comfyui.getCardDef("sfx"), "the sfx card registers");
  });

  it("the real mod plane composes (packs first, then flavors)", async () => {
    const ctx = new Context();
    await ctx.plugin({ apply(c: Context) { new ComfyUIService(c); } });
    await pluginPackage(ctx, "./mods/packs.ts", "packaged flavor", "mod packs");
    await pluginPackage(ctx, "@melite/models-krea-2/mods/loras", "packaged flavor", "krea-2 loras");
  });
});

describe("assertCardIdentity (the identity rung)", () => {
  const good = { identity: { label: "L", description: "D", genre: "G" } } as unknown as CardDefinition;

  it("a fully-identified card passes silent", () => {
    assertCardIdentity("x", good);
  });

  it("every missing rung refuses with the card id", () => {
    const cases: Array<[string, unknown]> = [
      ["no identity", {}],
      ["non-string label", { identity: { label: 42, description: "D", genre: "G" } }],
      ["empty label", { identity: { label: "", description: "D", genre: "G" } }],
      ["non-string description", { identity: { label: "L", description: 42, genre: "G" } }],
      ["non-string genre", { identity: { label: "L", description: "D", genre: 42 } }],
      ["empty genre", { identity: { label: "L", description: "D", genre: "" } }],
    ];
    for (const [name, def] of cases) {
      assert.throws(
        () => assertCardIdentity("card-x", def as CardDefinition),
        /card 'card-x' declares no identity/,
        name,
      );
    }
  });
});

describe("loadCardDefs (the registry boot)", () => {
  it("boots the sweep once, then serves the cache (theService opens)", async () => {
    const first = await loadCardDefs();
    assert.ok(first.size > 10, "the sweep registers the card set");
    assert.ok(first.has("image-gen"));
    assert.equal(await loadCardDefs(), first, "the second boot rides the cache");
    assert.ok(theService().cardIds().length > 10, "theService opens after the boot");
  }, 240000);

  it("provisionsByFamily maps DECL rows + card-owned rows", async () => {
    const defs = await loadCardDefs();
    const map = await provisionsByFamily(defs);
    assert.ok(Object.keys(map).length > 10, "every DECL id maps");
    const krea = map["krea-2"]!;
    assert.equal(typeof krea.engine, "string");
    assert.ok(Array.isArray(krea.provisions));
    // a card-owned provisions row overrides under the comfyui engine
    const over = await provisionsByFamily(new Map(Object.entries({
      "custom-card": { provisions: [{ name: "n", url: "u", folder: "f" }] },
    })) as never);
    assert.deepEqual(over["custom-card"], {
      engine: "comfyui",
      provisions: [{ name: "n", url: "u", folder: "f" }],
    });
    // a card with NO provisions adds no row
    const bare = await provisionsByFamily(new Map([["bare-card", {}]]) as never);
    assert.equal(bare["bare-card"], undefined);
    // THE UNION LAW's every arm (da89924c landed the loop with the
    // happy arms only; the audit of 2026-10-13 pins the rest): a variant
    // cell WITHOUT an artifact skips; two cells sharing url+dest_sub
    // dedupe to one row; a fresh cell lands its basename with the
    // query stripped.
  }, 240000);

  it("provisionsByFamily unions a live family's variant-cell artifacts (skip + dedupe)", async () => {
    // THE UNION LAW's every arm (da89924c landed the loop with the
    // happy arms only; the audit of 2026-10-13 pins the rest). The union
    // loop reads the MODELS table, so the probe registers a family
    // DECL live on the singleton — one cell without an artifact
    // (skips), two cells sharing url+dest_sub (dedupes to one row),
    // one fresh cell (lands its basename with the query stripped).
    await loadCardDefs();
    // the MODELS singleton carries the union loop's table (the CARD
    // service is theService — the wrong door)
    const svc = modelsService();
    // the DECL resolves through the STRICT schema — clone a live row
    // (function members dropped: structuredClone cannot carry them)
    // instead of hand-building a shape the resolver refuses. The
    // base family's lane_homes ride off too: the probe's lane_inputs
    // names only the stock unet/vae slots, and a home for a slot no
    // lane_input declares is the exact dead row registration refuses.
    const { actions: _a, defaults: _d, lane_homes: _h, ...base } = svc.getModel(svc.modelIds()[0]!) as unknown as Record<string, unknown>;
    const probe = structuredClone(base) as Record<string, unknown>;
    probe["id"] = "wall-union-family";
    probe["label"] = "Union Probe";
    // the base family's real provisions would ride the clone — the
    // probe unions ONLY what its cells carry
    probe["provisions"] = [];
    // the recipe↔weights law: every downloaded basename must be
    // loaded by a lane_input row, or registration refuses — the
    // atom table spells both probe names
    // the declared-plane door judges every write row against the
    // actions' own params — the probe declares exactly the pair its
    // variants state (functions the clone dropped, rebuilt here)
    probe["actions"] = [{
      id: "probe-a",
      inputs: [],
      outputs: [],
      params: [
        { name: "steps", type: "number", bounds: [1, 100] },
        { name: "cfg", type: "number", bounds: [1, 20] },
      ],
      facts: () => ({}),
      build: () => ({}),
    }];
    probe["lane_inputs"] = { unet: "dup.safetensors", vae: "a?b.safetensors" };
    probe["variants"] = [
              { id: "v1", label: "", description: "", hint: "", group: "Variant", route: "", engine: "", order: 0, resolver_defaults: { steps: 8, cfg: 1 }, lane_inputs: {}, wire_defaults: null,
                cells: [{ quant: "int8", label: "", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false, artifact: null }] },
              // two cells sharing url+dest_sub — the dedupe arm (distinct
              // tiers per the canon's one-variant-one-tier law; the
              // shared artifact still unions once)
              { id: "v2", label: "", description: "", hint: "", group: "Variant", route: "", engine: "", order: 1, resolver_defaults: { steps: 8, cfg: 1 }, lane_inputs: {}, wire_defaults: null,
                cells: [
                  { quant: "int8", label: "", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false,
                    artifact: { source_url: "https://host/dup.safetensors", dest_sub: "unet" } },
                  { quant: "bf16", label: "", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false,
                    artifact: { source_url: "https://host/dup.safetensors", dest_sub: "unet" } },
                ] },
              // a url whose QUERY precedes the weights suffix —
              // registerable (the segment ends .safetensors, and the
              // lane truth loads the raw name) and the union's
              // basename cut lands name "a"
              { id: "v3", label: "", description: "", hint: "", group: "Variant", route: "", engine: "", order: 2, resolver_defaults: { steps: 8, cfg: 1 }, lane_inputs: {}, wire_defaults: null,
                cells: [
                  { quant: "int8", label: "", source: null, description: "", route: "", engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false,
                    artifact: { source_url: "https://host/a?b.safetensors", dest_sub: "unet" } },
                ] },
    ];
    let off: (() => void) | undefined;
    const ctx = new Context();
    await ctx.plugin({
      name: "wall-union-family",
      apply(c2: Context): void {
        c2.effect(() => {
          off = svc.registerFamily(probe as never);
          return () => { off?.() };
        });
      },
    });
    try {
      const union = await provisionsByFamily(new Map());
      const landed = union["wall-union-family"]!;
      // the engine rides the cloned base family's own row
      assert.equal(typeof landed.engine, "string");
      assert.deepEqual(landed.provisions, [
        { name: "dup.safetensors", url: "https://host/dup.safetensors", folder: "unet", sha256: undefined, size_bytes: undefined },
        { name: "a", url: "https://host/a?b.safetensors", folder: "unet", sha256: undefined, size_bytes: undefined },
      ]);
    } finally {
      off?.();
    }
  }, 240000);
});

describe("refreshCardDefs (the #39 hot re-projection)", () => {
  it("re-projects the served table from the LIVE singleton (a card registered after boot serves; its retraction un-serves)", async () => {
    await loadCardDefs();
    const svc = theService();
    // a drop-in-shaped registration: a child fiber, the singleton
    // by import — the hot door's exact shape
    const ctx = new Context();
    await ctx.plugin({
      name: "wall-hot-card",
      apply(c2: Context): void {
        c2.effect(() => {
          const off = svc.registerCard({
            id: "wall-hot-card",
            skeleton: "generate",
            boarded: [],
            tags: ["image"],
            identity: { label: "Wall Hot Card", description: "the refresh wall", genre: "image" },
            sidebar: { key: "image", order: 999, hidden: true },
            schema: (value: unknown) => value as Record<string, unknown>,
            flowKinds: { inputs: {}, outputs: { default: "image" }, requiresModel: false },
            compose(): void { throw new Error("never composed") },
          } as never);
          return () => { off() };
        });
      },
    });
    // the boot cache predates the registration — the card is IN the
    // singleton but NOT in the served defs (the snapshot law)
    assert.ok(svc.cardIds().includes("wall-hot-card"), "registered on the singleton");
    assert.ok(!(await loadCardDefs()).has("wall-hot-card"), "the cache is a snapshot");
    // THE RE-PROJECTION: one call rebuilds the served table live
    const fresh = refreshCardDefs();
    assert.ok(fresh.has("wall-hot-card"), "refreshed table serves the hot card");
    assert.equal(await loadCardDefs(), fresh, "the cache now rides the refreshed projection");
    // retraction: dispose the fiber → the reverter runs → the next
    // refresh un-serves (the drop-in's disposer calls this)
    await ctx.fiber.dispose();
    assert.ok(!svc.cardIds().includes("wall-hot-card"), "reverted on the singleton");
    const after = refreshCardDefs();
    assert.ok(!after.has("wall-hot-card"), "un-served after the retraction");
  }, 240000);

  it("keeps the identity wall: a drifted hot card refuses at the re-projection (the m1 wall rides the refresh)", async () => {
    await loadCardDefs();
    const svc = theService();
    // registerCard's gate is shape-level; the IDENTITY wall (m1)
    // runs in the projection — a drifted def may land on the
    // singleton, but the served table REFUSES to re-project it
    const off = svc.registerCard({
      id: "wall-drifted-card",
      skeleton: "generate",
      boarded: [],
      tags: ["image"],
      schema: (value: unknown) => value as Record<string, unknown>,
      flowKinds: { inputs: {}, outputs: { default: "image" }, requiresModel: false },
      compose(): void { throw new Error("never composed") },
    } as never);
    try {
      assert.ok(svc.cardIds().includes("wall-drifted-card"), "the singleton carries it");
      assert.throws(() => refreshCardDefs(), /wall-drifted-card/, "the projection refuses loud");
    } finally {
      off();
    }
    assert.ok(!svc.cardIds().includes("wall-drifted-card"), "reverted");
    assert.ok(refreshCardDefs().has("image-gen"), "the projection is clean again");
  }, 240000);
});

describe("theService (the boot gate)", () => {
  it("refuses before the boot settles", async () => {
    // THE GATE IS ABOUT MODULE STATE (li-m, the lazy-boot law): the
    // node project's setup awaits the shared models boot BEFORE any
    // spec file runs — one boot per worker, the estate's own compose
    // seat — so this file's card-defs module is already booted by the
    // time the spec body runs. The refusal is therefore pinned
    // against a FRESH copy of the module (resetModules + dynamic
    // re-import = a module with no loaded defs), which is exactly
    // the state a cold estate's first caller sees.
    // bootModels() itself loads the card defs (models/service.ts:
    // the model table needs its cards), so a booted graph can never
    // show this refusal — hence the fresh copy, and hence this test
    // runs LAST in the file: the reset gives the following tests a
    // cold module graph, and nothing after this one needs one.
    vi.resetModules();
    const fresh = await import("../src/cardDefs.ts");
    // the process-global cell outlives the module-registry reset
    // (this file's own cascadeInit above primed it); the seam
    // reproduces the fresh-process state the refusal names.
    fresh.resetCardDefsForTests();
    assert.throws(
      () => fresh.theService(),
      /card defs not booted — await loadCardDefs\(\) first/,
    );
  });
});
