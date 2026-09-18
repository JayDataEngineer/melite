// @melite/comfyui-cordis — the models service's validation +
// resolution arms (TEST-2 breadth, 2026-09-12). Throwaway
// ModelsService instances over a REAL family DECL (krea-2 — the
// schema-valid base every synthetic derives from via clone +
// override, so the schema leg only fires when the test means it).
// The boot's happy path rides one real bootModels() at the end;
// the interlock halves are pure units over synthetic sets.
import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Context } from "@deepseek-ai/cordis";
import {
  ModelsService, assertAddressesServe, assertFactsCallers, assertModInterlock, bootModels,
  modelsProvider, modelsService, needModels, resolveCascade,
} from "../src/models/service.ts";
import { resetCatalogCache } from "../src/catalog.ts";
import { ModelError } from "../src/models/families/contract.ts";
import type { ModelDecl } from "../src/models/families/contract.ts";
import { DECL as KREA } from "../../../models/krea-2/src/index.ts";

/** Mint a tree owned by the CURRENT test (disposed with it). */
function mintRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "models-svc-"));
  onTestFinished(() => rmSync(root, { recursive: true, force: true }));
  return root;
}


const clone = (over: Record<string, unknown> = {}): ModelDecl =>
  // routeless variants by default (the base's real routes would
  // collide across registrations on one service — tests that need
  // routes declare them explicitly)
  structuredClone({ ...KREA, variants: [{ ...variant() }], ...over }) as unknown as ModelDecl;

const cell = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  quant: "q8", label: "", source: null, description: "", route: "",
  engine: "", vram_peak_gb: 0, resolver_defaults: {}, hide_from_dropdown: false,
  artifact: null, ...over,
});

const variant = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: "v1", label: "", description: "", hint: "", group: "Variant", route: "",
  engine: "", order: 0, resolver_defaults: {}, lane_inputs: {},
  wire_defaults: null, cells: [cell()], ...over,
});

const fresh = (): ModelsService => new ModelsService(new Context());

describe("modelsService (the boot gate)", () => {
  it("refuses before the boot settles", () => {
    assert.throws(
      () => modelsService(),
      /models service not booted — await bootModels\(\) first/,
    );
  });
});

describe("needModels (the threading gate)", () => {
  it("null/undefined refuse; a service passes through", () => {
    const svc = fresh();
    assert.throws(() => needModels(null, "door"), /no ModelsService for door/);
    assert.throws(() => needModels(undefined, "door"), /no ModelsService for door/);
    assert.equal(needModels(svc, "door"), svc);
  });
});

describe("modelsProvider (the fiber entry)", () => {
  it("mounts an empty service on the context", async () => {
    const ctx = new Context();
    await ctx.plugin(modelsProvider);
    assert.equal(ctx.models.familyCount(), 0);
  });
});

describe("registerFamily (the metaclass gates)", () => {
  it("every py predicate refuses with the py words", () => {
    assert.throws(() => fresh().registerFamily(clone({ id: "" })), /model row needs an id/);
    assert.throws(() => fresh().registerFamily(clone({ id: "LOUD" })), /LOUD: ids are lowercase/);
    assert.throws(() => fresh().registerFamily(clone({ label: "" })), /a model needs a label/);
    assert.throws(() => fresh().registerFamily(clone({ genre: "Image" })), /genre 'Image' is not a wire value/);
    assert.throws(() => fresh().registerFamily(clone({ genre: "" })), /genre '' is not a wire value/);
    const nogenre = clone({});
    delete (nogenre as unknown as Record<string, unknown>)["genre"];
    assert.throws(() => fresh().registerFamily(nogenre), /genre '' is not a wire value/);
    assert.throws(
      () => fresh().registerFamily(clone({ lane_inputs: ["nope"] })),
      /lane_inputs must be a plain object/,
    );
    assert.throws(
      () => fresh().registerFamily(clone({ variants: "nope" })),
      /variants must be an array \(got string\)/,
    );
    assert.throws(
      () => fresh().registerFamily(clone({ variants: [{ ...variant(), id: "" }] })),
      /a variant needs an id/,
    );
    assert.throws(
      () => fresh().registerFamily(clone({ variants: [{ ...variant(), cells: [{ ...cell(), quant: "" }] }] })),
      /a cell needs a quant/,
    );
  });

  it("the schema leg refuses non-shape rows; drift keys refuse as stripped", () => {
    assert.throws(
      () => fresh().registerFamily(clone({ engine: 42 })),
      /schema refused/,
    );
    assert.throws(
      () => fresh().registerFamily(clone({ bogus: 1 })),
      /unknown key\(s\) refused \(extra: forbid — the law\): bogus/,
    );
  });

  it("duplicates refuse; the disposer retracts table and routes", () => {
    const svc = fresh();
    const drop = svc.registerFamily(clone({ id: "synth-a" }));
    assert.throws(
      () => svc.registerFamily(clone({ id: "synth-a" })),
      /registered twice — one owner per model id/,
    );
    assert.ok(svc.registryIds().includes("synth-a"));
    drop();
    assert.ok(!svc.registryIds().includes("synth-a"), "dispose retracts the family");
    assert.ok(!svc.modelIds().includes("synth-a"), "dispose retracts its routes");
  });

  it("a clean registration reads back sorted", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "synth-b" }));
    svc.registerFamily(clone({ id: "synth-a" }));
    assert.deepEqual(svc.registryIds(), ["synth-a", "synth-b"]);
    assert.equal(svc.familyCount(), 2);
    assert.deepEqual(svc.allDecls().map((d) => d.id), ["synth-a", "synth-b"]);
  });
});

describe("registerFamily (the route index)", () => {
  it("variant + cell routes claim; a cell echoing the variant route claims once", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      variants: [{ ...variant({ id: "v", route: "v-route", cells: [cell({ route: "v-route" }), cell({ quant: "q4", route: "c-route" })] }) }],
    }));
    assert.ok(svc.modelIds().includes("synth-a"), "the head address auto-claims");
    assert.ok(svc.modelIds().includes("v-route"));
    assert.ok(svc.modelIds().includes("c-route"));
  });

  it("an unrouted variant still serves its head address", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "synth-a", variants: [{ ...variant() }] }));
    assert.ok(svc.modelIds().includes("synth-a"));
    assert.equal(svc.modelIds().filter((id) => id !== "synth-a").length, 0);
  });

  it("a self-route supersedes a sibling alias; a foreign model id claim skips", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "aaa", variants: [{ ...variant({ route: "shared" }) }] }));
    assert.equal(svc.getModel("shared").id, "shared", "the alias resolves through aaa");
    svc.registerFamily(clone({ id: "shared", label: "Shared Two", variants: [{ ...variant({ route: "shared" }) }] }));
    assert.equal(svc.getModel("shared").label.split(" ")[0], "Shared", "the self-route supersedes");
    svc.registerFamily(clone({ id: "bbb", variants: [{ ...variant({ route: "aaa" }) }] }));
    assert.ok(svc.getModel("aaa").id.endsWith("aaa"), "the claim on a model id stays the model's");
  });

  it("a cross-model flat-id claim is drift; one model's own reuse is sharing", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "aaa", variants: [{ ...variant({ route: "shared" }) }] }));
    assert.throws(
      () => svc.registerFamily(clone({ id: "bbb", variants: [{ ...variant({ route: "shared" }) }] })),
      /route 'shared' claimed by both 'aaa' and 'bbb'/,
    );
    svc.registerFamily(clone({
      id: "ccc",
      variants: [{ ...variant({ id: "v1", route: "mine" }) }, { ...variant({ id: "v2", route: "mine" }) }],
    }));
  });
});

describe("registryModel + getModel (the two planes)", () => {
  it("registryModel refuses ghosts; getModel refuses unserved ids", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "synth-a" }));
    assert.throws(() => svc.registryModel("ghost"), /no registered model 'ghost'/);
    assert.throws(() => svc.getModel("ghost"), /unknown model 'ghost'/);
  });

  it("a variant address resolves its first cell when no cell routes there", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      variants: [{ ...variant({ id: "v", route: "v-route", label: "Vee", cells: [cell({ quant: "q8", label: "Q8" })] }) }],
    }));
    const view = svc.getModel("v-route");
    assert.ok(view.label.includes("Vee") && view.label.includes("Q8"), "tokens compose model + variant + quant");
  });

  it("a cell route resolves its own cell (engine + source ride the cell)", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      engine: "comfyui",
      source: { type: "hf", repo_id: "o/m", filename: "base.safetensors", note: "n" },
      variants: [{ ...variant({
        id: "v", route: "v-route", engine: "variant-eng",
        cells: [
          cell({ quant: "q8", route: "c-route", label: "Q8", engine: "cell-eng", source: { type: "hf", repo_id: "o/m", filename: "q8.safetensors", note: "n" } }),
          cell({ quant: "q4" }),
        ],
      }) }],
    }));
    const c = svc.getModel("c-route");
    assert.equal(c.engine, "variant-eng", "the variant engine wins over the cell");
    assert.deepEqual(c.source, { type: "hf", repo_id: "o/m", filename: "q8.safetensors", note: "n" });
    const v = svc.getModel("v-route");
    assert.equal(v.engine, "variant-eng", "the variant engine wins over the atom");
    const celleng = fresh();
    celleng.registerFamily(clone({
      id: "synth-a",
      variants: [{ ...variant({ route: "r", cells: [cell({ quant: "q8", route: "c", engine: "cell-eng" })] }) }],
    }));
    assert.equal(celleng.getModel("c").engine, "cell-eng", "an engineless variant falls to the cell");
  });

  it("descriptions prefer the variant delta, else the model, else no key", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      description: "model desc",
      variants: [
        { ...variant({ id: "v1", route: "r1", description: "variant delta" }) },
        { ...variant({ id: "v2", route: "r2", description: "" }) },
      ],
    }));
    assert.equal(svc.getModel("r1").description, "variant delta");
    assert.equal(svc.getModel("r2").description, "model desc");
    const bare = fresh();
    const nodesc = clone({ id: "synth-a", variants: [{ ...variant({ route: "r", description: "" }) }] });
    delete (nodesc as unknown as Record<string, unknown>)["description"];
    bare.registerFamily(nodesc);
    assert.equal("description" in bare.getModel("r"), false, "absent ≡ no key");
  });

  it("a NULL stamp unsets the inherited default (the voicedesign meld)", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      defaults: { a: 1, b: 2 },
      variants: [{ ...variant({ route: "r", resolver_defaults: { b: null, c: 3 } }) }],
    }));
    assert.deepEqual(svc.getModel("r").defaults, { a: 1, c: 3 });
  });

  it("a sourced cell on a sourceless atom mints the cell file alone", () => {
    const svc = fresh();
    const d = clone({
      id: "synth-a",
      variants: [{ ...variant({
        route: "r",
        cells: [cell({ quant: "q8", route: "c", source: { type: "hf", repo_id: "o/m", filename: "q8.safetensors", note: "n" } })],
      }) }],
    });
    delete (d as unknown as Record<string, unknown>)["source"];
    svc.registerFamily(d);
    assert.deepEqual(svc.getModel("c").source, { filename: "q8.safetensors" });
  });

  it("a cell-less variant address resolves sourceless (no cell half to compose)", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      defaults: undefined,
      variants: [{ ...variant({ route: "r", resolver_defaults: { x: 1 }, cells: [] }) }],
    }));
    const view = svc.getModel("r");
    assert.deepEqual(view.defaults, { x: 1 }, "absent atom defaults union the variant intercept alone");
    assert.equal(view.source, undefined);
  });

  it("one-sided lane_inputs union honestly (either half may be absent)", () => {
    const svc = fresh();
    const d = clone({
      id: "synth-a",
      lane_inputs: { base: "b" },
      variants: [{ ...variant({ route: "r" }) }],
    });
    delete (d.variants[0] as unknown as Record<string, unknown>)["lane_inputs"];
    svc.registerFamily(d);
    assert.deepEqual(svc.getModel("r").lane_inputs, { base: "b" });
    const other = fresh();
    const d2 = clone({
      id: "synth-a",
      variants: [{ ...variant({ route: "r", lane_inputs: { extra: "e" } }) }],
    });
    delete (d2 as unknown as Record<string, unknown>)["lane_inputs"];
    other.registerFamily(d2);
    assert.deepEqual(other.getModel("r").lane_inputs, { extra: "e" });
  });

  it("lane_inputs union; sourceless cells mint no source key", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      source: undefined,
      lane_inputs: { base: "b" },
      variants: [{ ...variant({ route: "r", lane_inputs: { extra: "e" } }) }],
    }));
    const view = svc.getModel("r");
    assert.deepEqual(view.lane_inputs, { base: "b", extra: "e" });
    assert.equal(view.source, undefined, "no cell source, no atom source — no key");
  });
});

describe("variantOf + cellOf (the coordinates)", () => {
  it("null rides the family/variant default; misses refuse", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      variants: [
        { ...variant({ id: "v1", cells: [cell({ quant: "q8" })] }) },
        { ...variant({ id: "v2", cells: [] }) },
      ],
    }));
    const decl = svc.registryModel("synth-a");
    assert.equal(svc.variantOf(decl, null).id, "v1");
    assert.throws(() => svc.variantOf(decl, "ghost"), /has no variant 'ghost'/);
    assert.equal(svc.cellOf(svc.variantOf(decl, null), null)!.quant, "q8");
    assert.equal(svc.cellOf(svc.variantOf(decl, "v2"), null), null, "a cell-less variant defaults to null");
    assert.throws(() => svc.cellOf(svc.variantOf(decl, null), "ghost"), /has no quant 'ghost'/);
  });
});

describe("mergedDefaults + cascade (the inherency primitive)", () => {
  it("bare reads copy the family defaults (absent ≡ {})", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "synth-a", defaults: { a: 1 } }));
    assert.deepEqual(svc.mergedDefaults("synth-a"), { a: 1 });
    const bare = fresh();
    bare.registerFamily(clone({ id: "synth-a", defaults: undefined }));
    assert.deepEqual(bare.mergedDefaults("synth-a"), {});
  });

  it("one coordinate at a time (variant-only, quant-only)", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      defaults: { a: 1 },
      variants: [{ ...variant({ id: "v", resolver_defaults: { b: 2 }, cells: [cell({ quant: "q8" })] }) }],
    }));
    assert.deepEqual(svc.mergedDefaults("synth-a", "v"), { a: 1, b: 2 });
    assert.deepEqual(svc.mergedDefaults("synth-a", undefined, "q8"), { a: 1, b: 2 });
  });

  it("absent defaults/resolvers union to the present halves", () => {
    const svc = fresh();
    const d = clone({
      id: "synth-a",
      variants: [{ ...variant({ id: "v", cells: [cell({ quant: "q8" })] }) }],
    });
    delete (d as unknown as Record<string, unknown>)["defaults"];
    delete (d.variants[0] as unknown as Record<string, unknown>)["resolver_defaults"];
    svc.registerFamily(d);
    assert.deepEqual(svc.mergedDefaults("synth-a", "v", "q8"), {});
  });

  it("coordinates merge base ← variant ← cell (root-closer wins)", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      defaults: { a: 1, b: 1, c: 1 },
      variants: [{ ...variant({
        id: "v", resolver_defaults: { b: 2 },
        cells: [cell({ quant: "q8", resolver_defaults: { c: 3 } })],
      }) }],
    }));
    assert.deepEqual(svc.mergedDefaults("synth-a", "v", "q8"), { a: 1, b: 2, c: 3 });
  });

  it("cascade honors empty intercept/head (no view minted for nothing)", () => {
    const svc = fresh();
    assert.deepEqual(svc.cascade({ a: 1 }, null, null), { a: 1 });
    assert.deepEqual(svc.cascade({ a: 1 }, {}, {}), { a: 1 });
    assert.deepEqual(svc.cascade({ a: 1 }, { b: 2 }, null), { a: 1, b: 2 });
    assert.deepEqual(svc.cascade({ a: 1 }, null, { c: 3 }), { a: 1, c: 3 });
  });
});

describe("resolve (the R1 contract)", () => {
  it("cell route > variant route > owner id; engine falls back to comfyui", () => {
    const svc = fresh();
    svc.registerFamily(clone({
      id: "synth-a",
      engine: "",
      variants: [
        { ...variant({ id: "v1", route: "r1", cells: [cell({ quant: "q8", route: "c1" })] }) },
        { ...variant({ id: "v2", cells: [cell({ quant: "q4" })] }) },
      ],
    }));
    const c = svc.resolve("c1");
    assert.equal(c.route, "c1");
    assert.equal(c.engine, "comfyui", "an engineless atom serves comfyui");
    assert.equal(c.cell!.quant, "q8");
    const v = svc.resolve("r1", "v1", "q8");
    assert.equal(v.route, "c1", "the cell route wins when the quant routes");
    const owner = svc.resolve("synth-a", "v2", "q4");
    assert.equal(owner.route, "synth-a", "unaddressable coordinates resolve to the owner");
    assert.equal(owner.cell!.quant, "q4");
    const noeng = fresh();
    const d = clone({ id: "synth-a", variants: [{ ...variant({ route: "r" }) }] });
    delete (d as unknown as Record<string, unknown>)["engine"];
    noeng.registerFamily(d);
    assert.equal(noeng.resolve("r").engine, "comfyui", "a missing engine key serves comfyui");
  });
});

describe("servedModels + catalogModels (the serving halves)", () => {
  it("servedModels enumerates the served views", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "synth-a", variants: [{ ...variant({ route: "r" }) }] }));
    const served = svc.servedModels();
    assert.ok(served["synth-a"] && served["r"], "head + route both serve");
  });

  it("catalogModels caches per root; resetForTests drops the cache", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "synth-a" }));
    const first = svc.catalogModels("/root");
    assert.equal(svc.catalogModels("/root"), first, "the second read rides the cache");
    svc.registerFamily(clone({ id: "synth-b" }));
    assert.equal(svc.catalogModels("/root"), first, "the cache survives registration (root-pinned)");
    svc.resetForTests();
    resetCatalogCache();
    const second = svc.catalogModels("/root");
    assert.equal(second.length, first.length + 1, "recompute after the reset sees the new family");
  });

  it("resolveCatalogArtifact delegates (miss voices stay legacy)", () => {
    const svc = fresh();
    svc.registerFamily(clone({ id: "synth-a" }));
    assert.throws(
      () => svc.resolveCatalogArtifact("ghost"),
      /not found in catalog/,
    );
  });

  it("checkModelPresent delegates (unparseable config collapses the mount leg)", () => {
    const svc = fresh();
    const root = mintRoot();
    assert.equal(svc.checkModelPresent("models/checkpoints", "nope.safetensors", root), null);
    const bad = join(root, "endpoint.json");
    writeFileSync(bad, "{nope");
    const prev = process.env["COMFYUI_ENDPOINT_CONFIG"];
    process.env["COMFYUI_ENDPOINT_CONFIG"] = bad;
    try {
      assert.equal(svc.checkModelPresent("models/checkpoints", "nope.safetensors", root), null);
    } finally {
      if (prev === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
      else process.env["COMFYUI_ENDPOINT_CONFIG"] = prev;
    }
  });
});

describe("assertModInterlock (the satisfaction gate, pure)", () => {
  const decls = (over: Record<string, unknown> = {}): ModelDecl[] =>
    [clone({ id: "synth-a", genre: "image", mods: ["loras"], ...over })];
  const flavors = [{ pack: "loras", families: ["synth-a"] }];

  it("a satisfied plane passes silent", () => {
    assertModInterlock(decls(), new Set(["loras"]), new Set(), flavors, [], { loras: "fires" });
    assertModInterlock(decls({ mods: [] }), new Set(), new Set(), [], [], null);
  });

  it("a flavor for a ghost family refuses (the registry holds atoms)", () => {
    assert.throws(
      () => assertModInterlock(decls(), new Set(["loras"]), new Set(), [{ pack: "loras", families: ["ghost"] }], [], null),
      /no registered model 'ghost'/,
    );
    assert.throws(
      () => assertModInterlock(decls(), new Set(), new Set(), [], [{ id: "v", families: ["ghost"] }], null),
      /no registered model 'ghost'/,
    );
  });

  it("an unboarded flavor/verb claim is an undeclared mutation", () => {
    // the mods key ABSENT (not []) — absent ≡ empty rides the ??
    // arms, then the mutation still refuses (correct: the flavor
    // claims a model that declares nothing).
    const bare = clone({ id: "synth-a" });
    delete (bare as unknown as Record<string, unknown>)["mods"];
    assert.throws(
      () => assertModInterlock([bare], new Set(["loras"]), new Set(), flavors, [], null),
      /a 'loras' flavor is registered for it but DECL\.mods does not board/,
    );
    const bare2 = clone({ id: "synth-a" });
    delete (bare2 as unknown as Record<string, unknown>)["mods"];
    assert.throws(
      () => assertModInterlock([bare2], new Set(), new Set(["v"]), [], [{ id: "v", families: ["synth-a"] }], null),
      /verb 'v' claims it but DECL\.mods does not board/,
    );
  });

  it("a boarding naming nothing registered is dead (verbs exempt the fate edge)", () => {
    assert.throws(
      () => assertModInterlock(decls({ mods: ["ghost-pack"] }), new Set(["loras"]), new Set(), [], [], null),
      /DECL\.mods 'ghost-pack' names no registered pack or verb/,
    );
    assertModInterlock(
      decls({ mods: ["v"] }), new Set(), new Set(["v"]), [], [{ id: "v", families: ["synth-a"] }], null,
    );
  });

  it("a pack boarding without its family flavor refuses (the third edge)", () => {
    assert.throws(
      () => assertModInterlock(decls(), new Set(["loras"]), new Set(), [], [], null),
      /boards 'loras' but no flavor of that pack registers for it/,
    );
  });

  it("a mods-less DECL boards nothing (absent ≡ empty on every edge)", () => {
    const d = clone({ id: "synth-a" });
    delete (d as unknown as Record<string, unknown>)["mods"];
    assertModInterlock(
      [d, clone({ id: "synth-b", mods: ["loras", "v"] })],
      new Set(["loras"]), new Set(["v"]),
      [{ pack: "loras", families: ["synth-b"] }], [{ id: "v", families: ["synth-b"] }],
      { loras: "fires" },
    );
  });

  it("a fateless pack refuses unless the fate table is absent (the fourth edge)", () => {
    assert.throws(
      () => assertModInterlock(decls(), new Set(["loras"]), new Set(), flavors, [], {}),
      /has no fate in this plane/,
    );
    assertModInterlock(decls(), new Set(["loras"]), new Set(), flavors, [], null);
  });
});

describe("assertFactsCallers (the compose contract, pure)", () => {
  const ds = [clone({ id: "synth-a" })];
  const boards = new Map([["card1", ["synth-a"]]]);

  it("matching callers pass; absent rows and cardless facts skip", () => {
    assertFactsCallers(ds, { "synth-a": { card: "card1" } }, boards);
    assertFactsCallers(ds, {}, boards);
    assertFactsCallers(ds, { "synth-a": {} }, boards);
  });

  it("a facts card no caller names refuses with the caller list", () => {
    assert.throws(
      () => assertFactsCallers(ds, { "synth-a": { card: "ghost" } }, boards),
      /facts card 'ghost' is not one of its callers \[card1\]/,
    );
    assert.throws(
      () => assertFactsCallers(ds, { "synth-a": { card: "ghost" } }, new Map()),
      /is not one of its callers \[\]/,
    );
  });
});

describe("assertAddressesServe (the satisfaction gate, pure)", () => {
  it("a fully-served table passes silent; a hole refuses named", () => {
    assertAddressesServe(["a", "b"], ["a", "b"]);
    assert.throws(
      () => assertAddressesServe(["a"], ["a", "b"]),
      /model 'b' registers but serves no address/,
    );
  });
});

describe("bootModels (the transactional boot)", () => {
  it("boots the whole registry once, then serves the singleton", async () => {
    const svc = await bootModels();
    assert.ok(svc.familyCount() > 10, "the families land");
    assert.equal(await bootModels(), svc, "the second boot rides the singleton");
    assert.equal(modelsService(), svc, "the gate opens after the boot");
    assert.deepEqual(resolveCascade({ a: 1 }, null, null), { a: 1 });
  }, 240000);
});
