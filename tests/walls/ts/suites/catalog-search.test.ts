// catalog-search.test.ts — the disclosure stroke's routing law
// (2026-09-09): summaries route, bodies load by id. The search
// builders are PURE (no boot, no registry) — fake defs in, clamped
// summaries out. The operator's case is pinned: {image, upscale}
// retrieves the upscale card, never the model.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchCards, searchFlows, resolveCardPackageDir } from "../../../../packages/gateway/doors/src/doors/catalogs.ts";
import { GENERIC_ENHANCE_RECIPE } from "../../../../packages/gateway/core/src/schema/promptGuide.ts";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const DEFS = new Map([
  ["image-gen", { identity: { label: "Image Gen", description: "text to image", genre: "image" }, tags: ["image", "generate", "text-to-image"] }],
  ["upscale-tools", { identity: { label: "Upscale", description: "upscale and enhance", genre: "image" }, tags: ["image", "upscale", "enhance"] }],
  ["tts", { identity: { label: "TTS", description: "text to speech", genre: "audio" }, tags: ["audio", "tts", "voice", "generate"] }],
  ["untagged", {}],
]);

describe("card search", () => {
  it("the operator case: 'image upscale' retrieves the upscale card", () => {
    const rows = searchCards(DEFS, "image upscale", "");
    assert.deepEqual(rows.map((r) => r.id), ["upscale-tools"]);
  });
  it("tags=upscale retrieves by declaration, never by prose", () => {
    const rows = searchCards(DEFS, "", "upscale");
    assert.deepEqual(rows.map((r) => r.id), ["upscale-tools"]);
  });
  it("empty q + tags lists all (id-sorted)", () => {
    const rows = searchCards(DEFS, "", "");
    assert.deepEqual(rows.map((r) => r.id), ["image-gen", "tts", "untagged", "upscale-tools"]);
  });
  it("summaries carry no bodies (no schema, no docs, no models)", () => {
    const rows = searchCards(DEFS, "tts", "");
    assert.equal(rows.length, 1);
    assert.deepEqual(Object.keys(rows[0]).sort(), ["description", "genre", "id", "label", "tags"]);
  });
  it("untagged cards match on id/prose, never on tags", () => {
    assert.equal(searchCards(DEFS, "", "image").some((r) => r.id === "untagged"), false);
    assert.equal(searchCards(DEFS, "untagged", "").map((r) => r.id).join(), "untagged"); // id IS searchable
  });
});

describe("flow search", () => {  const ROWS = [
    { name: "image-upscale", title: "Upscale", description: "generate then upscale", stages: 2, skillRefs: [] },
    { name: "tts-voice", title: "Voice", description: "speak the words", stages: 1, skillRefs: [] },
  ];
  it("q tokens ALL match across name + title + description", () => {
    assert.deepEqual(searchFlows(ROWS, "image upscale").map((r) => r.name), ["image-upscale"]);
    assert.deepEqual(searchFlows(ROWS, "image voice"), []);
  });
  it("empty q lists all (name-sorted)", () => {
    assert.deepEqual(searchFlows(ROWS, "").map((r) => r.name), ["image-upscale", "tts-voice"]);
  });
});

describe("card package resolution (repo-tree truth, never node_modules)", () => {
  const REPO: string = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
  it("upscale-tools resolves to packages/image/upscale-tools", () => {
    const dir: string = resolveCardPackageDir(REPO, "upscale-tools");
    assert.equal(dir, join(REPO, "packages", "image", "upscale-tools"));
  });
  it("dashed ids resolve past the genre prefix (img-to-mesh)", () => {
    const dir: string = resolveCardPackageDir(REPO, "img-to-mesh");
    assert.equal(dir, join(REPO, "packages", "3d", "img-to-mesh"));
  });
  it("unknown ids refuse LOUD", () => {
    assert.throws(() => resolveCardPackageDir(REPO, "wall-kind-never-registered-zzz"), /unknown card/);
  });
});

describe("load_skills bundle (a/b/c, models as data)", () => {
  it("bundle keys are exactly id/tool/skills/model_hints (models never addressable)", async () => {
    const mod = await import("../../../../packages/gateway/doors/src/doors/catalogs.ts") as {
      loadBundle: (repo: string, dataRoot: string, cards: unknown, models: unknown, id: string) => Record<string, unknown>;
    };
    // The fake def wears a REAL card id (image-gen): the bundle walks
    // end to end over fakes — pinning the SHAPE (the a/b/c contract),
    // not the emitter's leniency over a non-Schemastery schema.
    const REPO: string = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
    const fakeCards = {
      defsSync: () => new Map([
        ["image-gen", {
          boarded: ["krea-2"],
          schema: (v: unknown) => v as Record<string, unknown>,
          identity: { label: "Image Gen", description: "generate", genre: "image" },
          tags: ["image", "generate"],
        }],
      ]),
    };
    const fakeModels = { allDecls: () => [{ id: "krea-2", label: "Krea 2", description: "image model" }] };
    const bundle: Record<string, unknown> = mod.loadBundle(REPO, "/data", fakeCards, fakeModels, "image-gen");
    assert.deepEqual(Object.keys(bundle).sort(), ["digest", "id", "model_hints", "skills", "tool"]);
    const hints = bundle["model_hints"] as Array<Record<string, unknown>>;
    assert.equal(hints.length, 1);
    assert.deepEqual(Object.keys(hints[0]).sort(), ["description", "enhance", "id", "label"]);
    assert.deepEqual(hints[0]["enhance"], { prompt: GENERIC_ENHANCE_RECIPE }); // the fallback IS the kernel const — one spelling
    assert.throws(() => mod.loadBundle(REPO, "/data", fakeCards, fakeModels, "nope"), /unknown card/);
  });
});

describe("enhance recipes (the migrated toll)", () => {
  it("declared recipes surface verbatim; the rest fall back to the kernel generic", async () => {
    const mod = await import("../../../../packages/gateway/doors/src/doors/catalogs.ts") as {
      enhanceMap: (dataRoot: string) => Map<string, Record<string, string>>;
    };
    const { mkdtempSync, mkdirSync, writeFileSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const root: string = mkdtempSync(join(tmpdir(), "catalog-enhance-"));
    mkdirSync(join(root, "packages", "gateway", "shell", "data"), { recursive: true });
    writeFileSync(join(root, "packages", "gateway", "shell", "data", "discovery-catalog.json"), JSON.stringify({
      form_specs: {
        "krea-2": { body: { enhance_prompts: { prompt: "krea recipe" } } },
        "dead": { body: { enhance_prompt: "None", enhance_prompts: "None" } },
      },
    }));
    const map: Map<string, Record<string, string>> = mod.enhanceMap(root);
    assert.deepEqual(map.get("krea-2"), { prompt: "krea recipe" });
    assert.equal(map.has("dead"), false);
    assert.equal(map.has("undec"), false); // the door serves GENERIC for these — one spelling in promptGuide
  });
});

describe("bundle digest (agent-side dedupe)", () => {
  it("same bytes, same digest — stable across loads", async () => {
    const mod = await import("../../../../packages/gateway/doors/src/doors/catalogs.ts") as {
      bundleDigest: (b: Record<string, unknown>) => string;
    };
    const a: Record<string, unknown> = { id: "x", tool: {}, skills: [], model_hints: [] };
    const b: Record<string, unknown> = { id: "x", tool: {}, skills: [], model_hints: [] };
    assert.equal(mod.bundleDigest(a), mod.bundleDigest(b));
    assert.match(mod.bundleDigest(a), /^[0-9a-f]{16}$/);
    assert.notEqual(mod.bundleDigest({ ...a, id: "y" }), mod.bundleDigest(a));
  });
});
