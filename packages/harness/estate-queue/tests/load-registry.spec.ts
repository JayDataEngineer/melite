// load-registry.spec.ts — the load seat: the parameter law
// (card|flow only, name required), the card/flow bundles, and the
// provider row.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { modelsService } from "@melite/comfyui-cordis";
import { LoadResolverService, loadProvider } from "../src/loadRegistry.ts";
import type { CardDefinition } from "@melite/comfyui-cordis";

const DEF = {
  identity: { label: "L", description: "d" },
  boarded: [],
  schema: { dict: {} },
} as unknown as CardDefinition;

const seat = (): LoadResolverService => {
  const ctx = new Context();
  const svc = new LoadResolverService(ctx);
  (ctx as unknown as { cardRegistry: unknown }).cardRegistry = {
    defsSync: () => new Map([["anny", DEF]]),
    // the presence seam (no-silent-drop law): hints marks present
    modelMids: () => new Set<string>(),
  };
  return svc;
};

describe("LoadResolverService", () => {
  it("the parameter law rides verbatim", () => {
    assert.throws(
      () => seat().load("bogus", "x"),
      /load needs inference_type=card\|flow/,
    );
    assert.throws(() => seat().load("card", ""), /load needs name/);
  });

  it("flows open by name (unknowns 404 LOUD)", () => {
    const b = seat().load("flow", "anny-hmr") as { bundle: { name: string; kind: string } };
    assert.equal(b.bundle.name, "anny-hmr");
    assert.equal(b.bundle.kind, "flow");
    assert.throws(() => seat().load("flow", "ghost"), /unknown flow 'ghost'/);
  });

  it("cards open through the registry + models (unknowns 404 LOUD)", () => {
    const svc = seat();
    const b = svc.load("card", "anny") as { bundle: { name: string; kind: string } };
    assert.equal(b.bundle.name, "anny");
    assert.equal(b.bundle.kind, "card");
    assert.throws(() => svc.load("card", "ghost"), /unknown card 'ghost'/);
  });

  it("the models seam is the engine singleton", () => {
    assert.equal(typeof modelsService().allDecls, "function");
  });
});

describe("loadProvider", () => {
  it("mounts the seat", () => {
    const ctx = new Context();
    loadProvider.apply(ctx);
    assert.ok((ctx as unknown as { load: unknown }).load instanceof LoadResolverService);
  });
});
