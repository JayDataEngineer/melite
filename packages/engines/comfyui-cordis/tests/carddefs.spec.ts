// @melite/comfyui-cordis — the card registry's boot + refusal arms
// (TEST-2 breadth, 2026-09-12). The boot composes REAL packages
// (no fixtures: the sweep IS the unit) — the refusal arms ride
// data-URL modules (real modules, no host face) and synthetic
// defs. The pre-boot theService() throw runs FIRST in this file
// (module state is per-file: nothing has booted yet).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import {
  assertCardIdentity, loadCardDefs, pluginPackage,
  provisionsByFamily, theService,
} from "../src/cardDefs.ts";
import { ComfyUIService } from "../src/service.ts";
import type { CardDefinition } from "../src/service.ts";

const FACELESS = "data:text/javascript,export const x = 1";

describe("theService (the boot gate)", () => {
  it("refuses before the boot settles", () => {
    assert.throws(
      () => theService(),
      /card defs not booted — await loadCardDefs\(\) first/,
    );
  });
});

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
  }, 240000);
});
