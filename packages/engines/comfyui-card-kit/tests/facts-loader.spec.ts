// @melite/comfyui-card-kit — the facts loader's derivation arms
// (TEST-2 breadth, 2026-09-12). The loader takes CALLER-SUPPLIED
// reads (the registry seam) — a synthetic slice + synthetic reads
// drive every arm: frozen rows, derived rows, route re-addressing,
// artifact basenames, the optional mods/accepts/studio/requires,
// the owners map.
import { describe, it, onTestFinished } from "vitest";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadFacts } from "../src/facts.ts";

// TMP NOTE (stroke 13): this tree mints at MODULE scope (before any
// test exists — onTestFinished can't own it); the global sweep
// (tests/global-sweep.ts) reclaims it at run teardown instead.


const reads = {
  registryIds: (): string[] => ["base-model", "routed-model", "bare-id"],
  registryModel: (id: string): unknown => {
    if (id === "base-model") return {
      variants: [
        { route: "base-model" },
        { route: "alias-route", cells: [{ route: "cell-route", quant: "q8" }] },
        {}, // routeless variant: no route key at all (b136 arm)
        { route: "base-model", cells: [{}] }, // routeless cell (b140 arm)
      ],
    };
    if (id === "bare-id") return {}; // no variants key at all (b136 arm)
    return { variants: [{ route: "routed-model" }] };
  },
  getModel: (id: string): unknown => {
    if (id === "bare-model") return { mods: [], accepts: [] };
    if (id === "alias-route") return {
      variants: [
        { group: "g", route: "base-model", cells: [] },
        { group: "g", route: "v-other", cells: [] },   // dropped: a sibling's table
        { group: "g", route: "" },                         // kept: the shared matrix, no cells key
      ],
      defaults: {}, lane_inputs: {},
    };
    if (id === "derived-model") return {
      variants: [
        { group: "g", route: "alias-route", resolver_defaults: { a: 1 }, wire_defaults: { b: 2 },
          cells: [
            { quant: "q8", label: "Quant", route: "cell-route", vram_peak_gb: 6.5,
              artifact: { filename: "sub/dir/file.safetensors" } },
            { quant: "fp16", label: "FP", route: "v1",
              artifact: { source_url: "https://host/dir/src.safetensors" } },
            { quant: "none", label: "NoArt", route: "v1", artifact: null },
            { quant: "empty", label: "EmptyObj", route: "v1", artifact: {} },
            { quant: "blanks", label: "Blanks", route: "v1",
              artifact: { filename: "", source_url: "" } },
            { quant: "blankfile", label: "BlankFile", route: "v1",
              artifact: { filename: "", source_url: "https://host/dir/fb.safetensors" } },
            { quant: "noroute", label: "NoRoute", artifact: { filename: "nr.safetensors" } },
          ] },
      ],
      defaults: { steps: 12, cfg: 7.5 },
      lane_inputs: { unet: "u.safetensors" },
      card_knobs: [],
      outputs: [],
      mods: ["loras"],
      accepts: ["image"],
      studio: { panel: "gen" },
    };
    return { defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [] };
  },
};

const slice = {
  rows: {
    "frozen-model": { frozen: { id: "frozen-model", card: "c", defaults: {}, lane_inputs: {}, card_knobs: [], variants: [], variant_groups: [], outputs: [] } },
    "derived-model": { card: "the-card", card_knobs: [] },
    // a ROUTE row: an alias address owned by base-model — the
    // exporter rule re-addresses its kept variants to ITSELF
    "alias-route": { card: "the-card", card_knobs: [] },
  },
  cards: { "the-card": { outputs: [], requires_by_family: { fam: ["steps"] } } },
  extension_node_types: { Custom: ["a", "b"] },
};

const tmp = mkdtempSync(join(tmpdir(), "facts-"));
const path = join(tmp, "facts.json");
writeFileSync(path, JSON.stringify(slice));

describe("loadFacts (the derivation arms)", () => {
  const facts = loadFacts(path, reads);

  it("a frozen row rides VERBATIM (no derivation)", () => {
    assert.equal(facts.models["frozen-model"]!.card, "c");
  });

  it("a derived row re-addresses routes through the owners map", () => {
    const row = facts.models["derived-model"]!;
    assert.equal(row.card, "the-card");
    // a SELF-OWNED row keeps its declared routes verbatim (the
    // owners map re-addresses nothing — only ROUTE rows re-address)
    assert.equal(row.variants[0]!.route, "alias-route", "the declared route rides verbatim");
    assert.equal(row.variants[0]!.cells[0]!.route, "cell-route");
    assert.equal(row.variants[0]!.resolver_defaults.a, 1);
    assert.equal(row.variants[0]!.defaults.b, 2);
    assert.deepEqual(row.requires_by_family, { fam: ["steps"] });
    assert.deepEqual(row.mods, ["loras"]);
    assert.deepEqual(row.accepts, ["image"]);
    assert.deepEqual(row.studio, { panel: "gen" });
  });

  it("artifact basenames take filename, then source_url, then nothing", () => {
    const cells = facts.models["derived-model"]!.variants[0]!.cells!;
    assert.equal(cells[0]!.artifact, "file.safetensors");
    assert.equal(cells[1]!.artifact, "src.safetensors");
    assert.equal(cells[2]!.artifact, "");
    assert.equal(cells[3]!.artifact, "", "a defined-but-empty artifact basenames to nothing");
    assert.equal(cells[4]!.artifact, "", "blank strings fall through to nothing");
    assert.equal(cells[5]!.artifact, "fb.safetensors", "a blank filename falls back to source_url");
    assert.equal(cells[6]!.route, "", "a routeless cell addresses the shared matrix");
    assert.equal(cells[6]!.artifact, "nr.safetensors");
    assert.equal(cells[0]!.vram_peak_gb, 6.5);
  });

  it("a ROUTE row keeps only its owner's tables and re-addresses to itself", () => {
    const row = facts.models["alias-route"]!;
    // kept: the owner-addressed variant (re-addressed to self) +
    // the shared-matrix '' row; dropped: the sibling's v-other table
    assert.deepEqual(row.variants.map((v) => v.route), ["alias-route", ""]);
  });

  it("extension node types ride", () => {
    assert.deepEqual(facts.extension_node_types, { Custom: ["a", "b"] });
  });
});

describe("loadFacts (the absent-arm slices)", () => {
  it("a slice with no cards, no requires, no extensions walks clean", () => {
    const bare = join(tmp, "bare.json");
    writeFileSync(bare, JSON.stringify({
      rows: { "bare-model": {} },
    }));
    const facts = loadFacts(bare, reads);
    const row = facts.models["bare-model"]!;
    assert.equal(row.card_knobs.length, 0, "knobs default empty");
    assert.equal(row.outputs.length, 0, "outputs default empty");
    assert.equal(row.requires_by_family, undefined);
    assert.deepEqual(row.mods, undefined, "an EMPTY mods array stays off the row");
    assert.deepEqual(row.accepts, undefined, "an EMPTY accepts array stays off the row");
    assert.equal(row.studio, undefined);
    assert.deepEqual(facts.extension_node_types, {});
  });

  it("a file with no rows section walks clean (the ?? {} arm)", () => {
    const norows = join(tmp, "norows.json");
    writeFileSync(norows, JSON.stringify({ cards: {} }));
    const facts = loadFacts(norows, reads);
    assert.deepEqual(facts.models, {});
    assert.deepEqual(facts.extension_node_types, {});
  });
});
