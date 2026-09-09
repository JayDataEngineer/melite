// catalog-search.test.ts — the disclosure stroke's routing law
// (2026-09-09): summaries route, bodies load by id. The search
// builders are PURE (no boot, no registry) — fake defs in, clamped
// summaries out. The operator's case is pinned: {image, upscale}
// retrieves the upscale card, never the model.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchCards, searchFlows, resolveCardPackageDir } from "../../../../packages/gateway/doors/src/doors/catalogs.ts";
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
    const mod = await import("../../../../packages/gateway/doors/src/doors/catalogs.ts");
    const fakeCards = {
      defsSync: () => new Map([
        ["img-gen", {
          boarded: ["krea-2"],
          schema: (v: unknown) => v as Record<string, unknown>,
          identity: { label: "Image Gen", description: "generate", genre: "image" },
          tags: ["image", "generate"],
        }],
      ]),
    };
    const fakeModels = { allDecls: () => [{ id: "krea-2", label: "Krea 2", description: "image model" }] };
    // toolBaseRows needs the engine emitter over a real-shaped def —
    // the fake schema is NOT Schemastery: expect the LOUD emitter
    // refusal (the projection never silently degrades).
    assert.throws(() => (mod as { loadBundle: Function }).loadBundle("/repo", fakeCards, fakeModels, "img-gen"));
    assert.throws(() => (mod as { loadBundle: Function }).loadBundle("/repo", fakeCards, fakeModels, "nope"), /unknown card/);
  });
});
