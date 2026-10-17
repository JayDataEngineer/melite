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
import {
  loadFacts,
  parseDiffusionLaneFacts,
  parseEditCap,
  requireText,
} from "../src/facts.ts";

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
    // the OWNING FAMILY rostered: its claimed-but-unrostered
    // addresses (cell-route) derive below (the third live break's
    // cure — the hand roster's drift can no longer strand a
    // registry-claimed route)
    "base-model": { card: "the-card", card_knobs: [] },
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

  it("THE EXPORTER RULE, AUTOMATED: a claimed-but-unrostered address of a ROSTERED family derives its own row", () => {
    // the third live break ('no-model-facts: krea-2-raw'): the
    // registry claims cell-route (base-model's cell) and the hand
    // roster never listed it — compose phase 1 refused a route the
    // registry itself resolves. The derivation fills over the hand
    // roster: same deriveRow, the owner's card slice.
    const row = facts.models["cell-route"];
    assert.ok(row, "cell-route derives (the roster's omission is no longer a run break)");
    assert.equal(row.card, "the-card", "the owner's card owns the route's slice");
    assert.deepEqual(row.requires_by_family, { fam: ["steps"] }, "the owner's card slice rides");
  });

  it("an UNSERVED family's claimed addresses stay absent (a serving decision, never drift)", () => {
    // routed-model is registered and claims its self-route, but no
    // roster row serves it — the derivation must not paper a
    // serving decision into existence
    assert.equal(facts.models["routed-model"], undefined);
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
    // the card_knobs column is GONE (2026-10-10): 312 rows of
    // frozen inject strings that nothing read — carried by the
    // derivation, written by no composer, pinned by no wall, and
    // silently desynced by any lane edit that renumbered a node.
    assert.equal("card_knobs" in row, false, "no write-only facts column rides the row");
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

describe("requireText (the facts door's one string extractor)", () => {
  it("returns the string at the key", () => {
    assert.equal(requireText({ unet: "x.safetensors" }, "unet", "fam act"), "x.safetensors");
  });
  it("refuses an absent key, a non-string, and an empty string, with the door's own label", () => {
    const cases: [Record<string, unknown>, string][] = [
      [{}, "undefined"],
      [{ unet: 7 }, "7"],
      [{ unet: "" }, '""'],
    ];
    for (const [raw, shown] of cases) {
      assert.throws(
        () => requireText(raw, "unet", "fam act"),
        new RegExp("^Error: fam act: lane_inputs\\.unet = " + shown + " — a non-empty string is required$"),
      );
    }
  });
});

describe("parseDiffusionLaneFacts (the diffusion-lane facts core's shared gates)", () => {
  const gate = { key: "latent_node", node: "EmptySD3LatentImage" } as const;
  const lane = {
    unet: "u.safetensors",
    text_encoder: "t.safetensors",
    vae: "v.safetensors",
    clip_type: "qwen_image",
    latent_node: "EmptySD3LatentImage",
    sampling_shift: 0.5,
  };

  it("parses the four model slots and carries the gated node literal + the declared shift", () => {
    assert.deepEqual(parseDiffusionLaneFacts(lane, "fam act", gate), {
      unet: "u.safetensors",
      text_encoder: "t.safetensors",
      vae: "v.safetensors",
      clip_type: "qwen_image",
      node: "EmptySD3LatentImage",
      sampling_shift: 0.5,
    });
  });

  it("refuses a node literal outside the whitelist, naming the literal the action builds on", () => {
    assert.throws(
      () => parseDiffusionLaneFacts({ ...lane, latent_node: "EmptyLatentImage" }, "fam act", gate),
      /^Error: fam act: lane_inputs\.latent_node = "EmptyLatentImage" — the action builds on EmptySD3LatentImage$/,
    );
  });

  it("refuses a present-but-non-number sampling_shift", () => {
    assert.throws(
      () => parseDiffusionLaneFacts({ ...lane, sampling_shift: "4" }, "fam act", gate),
      /^Error: fam act: lane_inputs\.sampling_shift = "4" — a number is required$/,
    );
  });

  it("shift: false (the edit doors) skips the shift check — the core carries no shift key", () => {
    const facts = parseDiffusionLaneFacts({ ...lane, sampling_shift: undefined }, "fam act", gate, false);
    assert.equal("sampling_shift" in facts, false, "an edit core carries no shift key");
    assert.equal(facts.node, "EmptySD3LatentImage");
  });
});

describe("parseEditCap (the edit door's max_images floor)", () => {
  it("floors a fractional cap to the integer count", () => {
    assert.equal(parseEditCap({ max_images: 2.7 }, "fam act"), 2);
  });
  it("refuses an absent, non-number, non-finite, or sub-1 cap with the door's own label", () => {
    const cases: [Record<string, unknown>, string][] = [
      [{}, "undefined"],
      [{ max_images: "16" }, '"16"'],
      [{ max_images: Number.POSITIVE_INFINITY }, "null"],
      [{ max_images: 0 }, "0"],
    ];
    for (const [raw, shown] of cases) {
      assert.throws(
        () => parseEditCap(raw, "fam act"),
        new RegExp("^Error: fam act: lane_inputs\\.max_images = " + shown + " — a number ≥ 1 is required$"),
      );
    }
  });
});

describe("loadFacts (the DECL-projection arms)", () => {
  // A dedicated slice: the shared fixtures above never declare the
  // per-variant projection members (hidden flag, relations, bounds),
  // and the frozen-owner face of the exporter rule needs its own
  // registry. Same seam as every arm here: synthetic reads, tmp slice.
  const projDecl = {
    defaults: {},
    lane_inputs: {},
    variants: [
      {
        id: "hidden", group: "g", label: "Hidden", route: "std",
        hide_from_dropdown: true,
        relations: { at_most_one: [["a", "b"]] },
        bounds: { steps: { min: 4, max: 8 } },
        cells: [{ quant: "q8", label: "Q", route: "std", hide_from_dropdown: true, artifact: null }],
      },
      {
        id: "nullrel", group: "g", label: "NullRel", route: "nullrel",
        relations: null,
        bounds: null,
        cells: [{ quant: "fp16", label: "F", route: "nullrel", artifact: null }],
      },
    ],
  };
  const projReads = {
    registryIds: (): string[] => ["proj-model"],
    registryModel: (id: string): unknown => (id === "proj-model" ? { variants: [{ route: "proj-model" }] } : {}),
    getModel: (id: string): unknown => (id === "proj-model" ? projDecl : {}),
  };
  const projPath = join(tmp, "proj.json");
  writeFileSync(projPath, JSON.stringify({ rows: { "proj-model": { card: "proj-card" } }, cards: { "proj-card": {} } }));
  const projRow = loadFacts(projPath, projReads).models["proj-model"]!;

  it("a hidden DECL variant rides with its flag — the projections judge it, never the loader", () => {
    const hidden = projRow.variants[0]!;
    assert.equal(hidden.id, "hidden");
    assert.equal(hidden.hide_from_dropdown, true, "the variant's flag rides verbatim");
    assert.equal(hidden.cells[0]!.hide_from_dropdown, true, "the cell's flag rides verbatim");
  });

  it("variant relations and bounds ride where declared, cloned out of the registry's live DECL", () => {
    const declared = projRow.variants[0]!;
    assert.deepEqual(declared.relations, { at_most_one: [["a", "b"]] });
    assert.notEqual(
      declared.relations, projDecl.variants[0]!.relations,
      "a frozen snapshot, never an alias into the live DECL object",
    );
    assert.deepEqual(declared.bounds, { steps: { min: 4, max: 8 } });
  });

  it("a variant's null relations/bounds ride ABSENT (present-only-where-declared)", () => {
    const nullish = projRow.variants[1]!;
    assert.equal(nullish.id, "nullrel");
    assert.equal("relations" in nullish, false, "null ≡ undeclared — the key stays off the row");
    assert.equal("bounds" in nullish, false, "null ≡ undeclared — the key stays off the row");
  });

  it("a FROZEN family's claimed addresses stay absent — frozen IS the serving decision", () => {
    const frozenReads = {
      registryIds: (): string[] => ["frozen-owner"],
      registryModel: (id: string): unknown =>
        id === "frozen-owner" ? { variants: [{ route: "frozen-claim" }] } : {},
      getModel: (id: string): unknown => (id === "frozen-owner" ? { defaults: {}, lane_inputs: {} } : {}),
    };
    const frozenPath = join(tmp, "frozen-owner.json");
    writeFileSync(frozenPath, JSON.stringify({
      rows: {
        "frozen-owner": {
          frozen: { id: "frozen-owner", card: "c", defaults: {}, lane_inputs: {}, variants: [], variant_groups: [], outputs: [] },
        },
      },
    }));
    const facts = loadFacts(frozenPath, frozenReads);
    assert.equal(facts.models["frozen-owner"]!.card, "c", "the frozen row rides verbatim");
    assert.equal(
      facts.models["frozen-claim"], undefined,
      "the exporter rule derives nothing beside a frozen row",
    );
    assert.equal(facts.owners!["frozen-claim"], "frozen-owner", "the claim still resolves to its owner");
  });

  it("an exporter-derived row whose owner's card slice is missing serves an empty contract", () => {
    // The derivation fills over the hand roster even when the owner's
    // CARD slice is absent — the row serves with an empty outputs
    // contract and no requires (the slice is the card's own debt, the
    // address still resolves).
    const slicelessReads = {
      registryIds: (): string[] => ["sliceless-owner"],
      registryModel: (id: string): unknown =>
        id === "sliceless-owner" ? { variants: [{ route: "claimed-addr" }] } : {},
      getModel: (id: string): unknown => (id === "sliceless-owner" ? { defaults: {}, lane_inputs: {} } : {}),
    };
    const slicelessPath = join(tmp, "sliceless.json");
    writeFileSync(slicelessPath, JSON.stringify({
      rows: { "sliceless-owner": { card: "no-such-card" } },
    }));
    const facts = loadFacts(slicelessPath, slicelessReads);
    const row = facts.models["claimed-addr"];
    assert.ok(row, "the claimed address still derives its row");
    assert.deepEqual(row.outputs, [], "the missing card slice serves an empty outputs contract");
    assert.equal(row.requires_by_family, undefined, "no requires ride without a card slice");
    assert.equal(row.card, "no-such-card", "the owner's card attribution rides verbatim");
  });
});
