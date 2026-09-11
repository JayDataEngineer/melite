// @melite/comfyui-cordis — the catalog's resolution + presence core
// (TEST-2 breadth, 2026-09-12). The catalog is pure: DECL rows in,
// artifact rows out — miss texts ARE the wire (the manage door maps
// CatalogMiss -> 404), so every text pins here.
import { describe, it, beforeEach } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  CatalogMiss, isCatalogMiss, loadCatalogModels, resetCatalogCache,
  resolveCatalogArtifact, resolveArtifactRows,
  runtimeModelsRoot, checkModelPresent, findModelPresent,
} from "../src/catalog.ts";
import type { ModelDecl } from "../src/models/families/contract.ts";

const decl = (over: Record<string, unknown> = {}): ModelDecl => ({
  id: "krea-2",
  genre: "image",
  engine: "comfyui",
  provisions: [],
  variants: [],
  ...over,
} as unknown as ModelDecl);

const cellQ = (quant: string, artifact?: { source_url: string; dest_sub: string }) =>
  ({ quant, ...(artifact ? { artifact } : {}) });

const variant = (id: string, cells: ReturnType<typeof cellQ>[]) => ({ id, cells });

beforeEach(() => { resetCatalogCache(); });

describe("isCatalogMiss (the 404/500 split)", () => {
  it("CatalogMiss is the 404 channel, everything else the 500 class", () => {
    assert.equal(isCatalogMiss(new CatalogMiss("x")), true);
    assert.equal(isCatalogMiss(new Error("x")), false);
    assert.equal(isCatalogMiss("x"), false);
    assert.equal(isCatalogMiss(null), false);
    const miss = new CatalogMiss("boom");
    assert.equal(miss.name, "CatalogMiss");
  });
});

describe("loadCatalogModels (the projection + cache)", () => {
  it("projects decls to catalog rows (artifact + artifact-less cells)", () => {
    const rows = loadCatalogModels([
      decl({ provisions: [{ name: "p", url: "https://h/p", folder: "x/" }] }),
      decl({ id: "bare", variants: [variant("v", [cellQ("q8"), cellQ("fp16", { source_url: "https://h/f.safetensors", dest_sub: "unet/" })])] }),
    ]);
    assert.equal(rows.length, 2);
    assert.equal(rows[0]!.provisions[0]!.name, "p");
    assert.equal(rows[1]!.variants[0]!.cells[0]!.artifact, undefined);
    assert.equal(rows[1]!.variants[0]!.cells[1]!.artifact!.source_url, "https://h/f.safetensors");
    // the cache: a second load returns the SAME rows (decls not re-read)
    assert.equal(loadCatalogModels([decl({ id: "other" })]).length, 2, "the process cache holds");
    resetCatalogCache();
    assert.equal(loadCatalogModels([decl({ id: "other" })]).length, 1, "reset drops the cache");
  });
});

describe("resolveCatalogArtifact (the legacy texts ARE the wire)", () => {
  it("an unknown model id throws the not-found text", () => {
    assert.throws(
      () => resolveCatalogArtifact([decl({ variants: [] })], "nope"),
      (e: unknown) => e instanceof CatalogMiss && (e as Error).message === "model 'nope' not found in catalog",
    );
  });

  it("provisions ride first (name/url gate + dest derivation)", () => {
    const rows = resolveCatalogArtifact([decl({
      provisions: [
        { name: " good ", url: " https://h/g.bin ", folder: "/checkpoints/" },
        { name: "", url: "https://h/blank.bin", folder: "x" },
        { name: "nourl", url: "  ", folder: "x" },
        { name: "bare", url: "https://h/bare.bin", folder: "" },
        { name: "stock", url: "https://h/s.bin", folder: "models/diffusion_models" },
      ],
    })], "krea-2");
    assert.deepEqual(rows.map((r) => r.name), ["good", "bare", "stock"]);
    assert.equal(rows[0]!.relative_path, "models/checkpoints");
    assert.equal(rows[1]!.relative_path, "models", "the empty folder is bare models");
    assert.equal(rows[2]!.relative_path, "models/diffusion_models", "a models-headed folder rides verbatim");
  });

  it("all-filtered provisions throw the no-downloadable text", () => {
    assert.throws(
      () => resolveCatalogArtifact([decl({ provisions: [{ name: "", url: "", folder: "" }] })], "krea-2"),
      /declares no downloadable provisions/,
    );
  });

  it("the matrix fallback: first variant / first cell, basename + dest", () => {
    const ds = [decl({ variants: [variant("turbo", [cellQ("int8", { source_url: "https://h/dir/w.safetensors", dest_sub: "/unet//" })])] })];
    const rows = resolveCatalogArtifact(ds, "krea-2");
    assert.deepEqual(rows, [{ name: "w.safetensors", url: "https://h/dir/w.safetensors", relative_path: "models/unet" }]);
    // explicit coordinates ride the same row
    assert.deepEqual(resolveCatalogArtifact(ds, "krea-2", "turbo", "int8"), rows);
    // an unknown variant id resolves to no-variant (never a throw there)
    assert.throws(
      () => resolveCatalogArtifact(ds, "krea-2", "ghost", ""),
      (e: unknown) => e instanceof CatalogMiss && /has no artifact at \(ghost, None\)/.test((e as Error).message),
    );
  });

  it("an unknown quant is a ValueError-class 500, never a 404", () => {
    const ds = [decl({ variants: [variant("turbo", [cellQ("int8")])] })];
    assert.throws(
      () => resolveCatalogArtifact(ds, "krea-2", "turbo", "bogus"),
      (e: unknown) => !(e instanceof CatalogMiss) && (e as Error).message === "'bogus' is not a valid Quant",
    );
  });

  it("a known-quant miss on the variant throws the no-artifact text", () => {
    const ds = [decl({ variants: [variant("a", [cellQ("int8")]), variant("b", [cellQ("int8", { source_url: "https://h/b.safetensors", dest_sub: "" })])] })];
    assert.throws(
      () => resolveCatalogArtifact(ds, "krea-2", "a", "int8"),
      /has no artifact at \(a, int8\)/,
    );
    // the empty coordinate prints None
    assert.throws(
      () => resolveCatalogArtifact([decl({ variants: [variant("a", [cellQ("int8")])] })], "krea-2", "", "int8"),
      /has no artifact at \(None, int8\)/,
    );
    // a bare dest_sub is bare models
    assert.equal(resolveCatalogArtifact(ds, "krea-2", "b", "int8")[0]!.relative_path, "models");
  });

  it("resolveArtifactRows is the pure core (no cache, no I/O)", () => {
    const models = loadCatalogModels([decl({ variants: [variant("v", [])] })]);
    resetCatalogCache();
    assert.throws(() => resolveArtifactRows(models, "krea-2"), /has no artifact at \(None, None\)/);
    assert.throws(() => resolveArtifactRows([], "krea-2"), /not found in catalog/);
  });
});

describe("findModelPresent (runtime first, then the mount leg)", () => {
  const root = mkdtempSync(join(tmpdir(), "catalog-"));

  it("the runtime tree hits first", () => {
    const dir = join(runtimeModelsRoot(root), "checkpoints");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "w.safetensors"), "x");
    assert.equal(findModelPresent("models/checkpoints", "w.safetensors", root, null), join(dir, "w.safetensors"));
    // a non-models-headed path rides verbatim under the runtime root
    assert.equal(findModelPresent("checkpoints", "w.safetensors", root, null), join(dir, "w.safetensors"));
  });

  it("no base configured = mount leg skipped (the null arms)", () => {
    assert.equal(findModelPresent("models/checkpoints", "missing.safetensors", root, null), null);
    assert.equal(findModelPresent("models/checkpoints", "missing.safetensors", root, {}), null);
    assert.equal(findModelPresent("models/checkpoints", "missing.safetensors", root, { model_base_path: "  " }), null);
    assert.equal(findModelPresent("models/checkpoints", "missing.safetensors", root, { model_base_path: 42 }), null);
  });

  it("the mount leg maps heads through extra_model_folders", () => {
    const base = mkdtempSync(join(tmpdir(), "mount-"));
    mkdirSync(join(base, "mapped", "sub"), { recursive: true });
    writeFileSync(join(base, "mapped", "sub", "w.safetensors"), "x");
    mkdirSync(join(base, "checkpoints"), { recursive: true });
    writeFileSync(join(base, "checkpoints", "v.safetensors"), "x");
    const cfg = { model_base_path: base, extra_model_folders: { checkpoints: "/mapped/", loras: "" } };
    assert.equal(
      findModelPresent("models/checkpoints/sub", "w.safetensors", root, cfg),
      join(base, "mapped", "sub", "w.safetensors"),
    );
    // an empty mapping falls back to the head itself
    assert.equal(
      findModelPresent("models/loras", "v.safetensors", root, { model_base_path: base, extra_model_folders: { loras: "//" } }),
      null,
      "loras/ has no v.safetensors under the base",
    );
    // a headless folder (no slash) joins straight under the base
    mkdirSync(join(base, "flat"), { recursive: true });
    writeFileSync(join(base, "flat", "f.safetensors"), "x");
    assert.equal(
      findModelPresent("models/flat", "f.safetensors", root, { model_base_path: base }),
      join(base, "flat", "f.safetensors"),
    );
    // stock folders map to themselves
    assert.equal(
      findModelPresent("models/checkpoints", "v.safetensors", root, { model_base_path: base, extra_model_folders: "nope" }),
      join(base, "checkpoints", "v.safetensors"),
    );
    assert.equal(findModelPresent("models/checkpoints", "gone.safetensors", root, { model_base_path: base }), null);
  });

  it("checkModelPresent reads the endpoint config (unparseable = mount skipped)", () => {
    // no sandbox config around — falls back to the runtime probe then null
    assert.equal(checkModelPresent("models/checkpoints", "definitely-not-here-xyz.safetensors", root), null);
  });

  it("an unparseable endpoint config collapses the mount leg (the catch arm)", () => {
    const bad = join(root, "endpoint.json");
    writeFileSync(bad, "{nope");
    const prev = process.env["COMFYUI_ENDPOINT_CONFIG"];
    process.env["COMFYUI_ENDPOINT_CONFIG"] = bad;
    try {
      assert.equal(
        checkModelPresent("models/checkpoints", "definitely-not-here-xyz.safetensors", root),
        null,
        "the parse refusal collapses to cfg null — the runtime probe already missed",
      );
    } finally {
      if (prev === undefined) delete process.env["COMFYUI_ENDPOINT_CONFIG"];
      else process.env["COMFYUI_ENDPOINT_CONFIG"] = prev;
    }
  });

  it("a decl WITHOUT provisions maps the matrix arm (the ?? [] fallback)", () => {
    resetCatalogCache();
    const rows = loadCatalogModels([
      decl({ provisions: undefined, variants: [variant("v", [cellQ("q8", { source_url: "https://h/w.safetensors", dest_sub: "" })])] }),
    ]);
    assert.equal(rows[0]!.provisions.length, 0);
    assert.equal(resolveCatalogArtifact([decl({ provisions: undefined, variants: [variant("v", [cellQ("q8", { source_url: "https://h/w.safetensors", dest_sub: "" })])] })], "krea-2")[0]!.name, "w.safetensors");
  });
});
