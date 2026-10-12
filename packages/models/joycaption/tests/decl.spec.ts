// @melite/models-joycaption — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the mods boarding, the lane inputs,
// the defaults. These pins hold the PLUGIN SHAPE + identity; the
// full carrier (every HF link, sha256, lane weight, variant
// matrix) is the declaration itself, and registration is proven
// engine-side (the walls' registry count, the flavor↔DECL.mods
// interlock, the boot gates). Family-specific truth pins land here
// hand-written when a fact needs pinning — never generated guesses.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the joycaption model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-joycaption");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "joycaption");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("ONE Standard variant on the shared checkpoint key (the freeform upstream is not enumerated)", () => {
    assert.equal(DECL.variants.length, 1, "no closed set to enumerate — one variant only");
    assert.equal(DECL.variants[0]!.id, "standard");
    assert.equal(
      (DECL.defaults as Record<string, unknown>)["checkpoint"], "fancyfeast/llama-joycaption-beta-one-hf-llava",
      "the family default stamps beta-one on the shared key",
    );
  });

  it("group ids match the row groups case-EXACT (a lowercase drift doubles the rail's axes)", () => {
    const ids = new Set((DECL.variant_groups ?? []).map((g) => g.id));
    for (const v of DECL.variants) {
      assert.ok(ids.has(v.group), `row group '${v.group}' names a declared variant_groups id (case-exact)`);
    }
  });

  it("ONE variant claims the family address (cells may claim for quant addressing; variants may not share)", () => {
    const claimants = DECL.variants.filter((v) => v.route === DECL.id).map((v) => v.id);
    assert.deepEqual(claimants, [DECL.variants[0]!.id], "the head alone claims the family address");
  });

  it("the Standard cell is F32 with an honest measured VRAM claim", () => {
    const cells = DECL.variants[0]!.cells ?? [];
    assert.equal(cells.length, 1, "one quant cell only");
    assert.equal(cells[0]!.quant, "f32");
    assert.equal(cells[0]!.vram_peak_gb, 20, "measured claim rides the head cell only");
  });
});

// THE VERBATIM SNAPSHOT LAW (the joytag provision pins' twin, for
// the whole-dir channel): the beta-one tree's repo, revision,
// folder and load set are literals in the table below — a moved
// revision, a renamed tree, or a dropped load file fails this
// block. The 13 patterns are EXACT repo paths (the liveness wall
// HEAD-probes every literal): config + generation config + the
// weights index + the FOUR shards + the processor/tokenizer set +
// the chat template. A new row, or a file leaving the set, is a
// deliberate edit of this table.
const SNAPSHOT_PINS: ReadonlyArray<
  readonly [name: string, folder: string, repo_id: string, revision: string, patterns: readonly string[]]
> = [
  ["llama-joycaption-beta-one-hf-llava", "LLavacheckpoints", "fancyfeast/llama-joycaption-beta-one-hf-llava", "ebf414ea497a020da0f82df3913e5b6cb8e9663a", [
    "config.json",
    "generation_config.json",
    "model.safetensors.index.json",
    "model-00001-of-00004.safetensors",
    "model-00002-of-00004.safetensors",
    "model-00003-of-00004.safetensors",
    "model-00004-of-00004.safetensors",
    "preprocessor_config.json",
    "processor_config.json",
    "special_tokens_map.json",
    "tokenizer.json",
    "tokenizer_config.json",
    "chat_template.json",
  ]],
];

describe("the managed beta-one tree is pinned verbatim", () => {
  it("the snapshot row carries its pinned repo, revision, folder and load set", () => {
    const rows = DECL.snapshot_provisions ?? [];
    assert.deepEqual(rows.map((r) => r.name), SNAPSHOT_PINS.map((p) => p[0]),
      "the pin table IS the declared table — a row added, dropped or renamed is a deliberate edit");
    for (const [name, folder, repo_id, revision, patterns] of SNAPSHOT_PINS) {
      const row = rows.find((r) => r.name === name)!;
      assert.equal(row.folder, folder, `${name}: the dest parent under the models root is pinned verbatim`);
      assert.equal(row.repo_id, repo_id, `${name}: the upstream repo is pinned verbatim`);
      assert.equal(row.revision, revision, `${name}: the revision is a pinned 40-hex commit, never a branch`);
      assert.deepEqual([...row.allow_patterns].sort(), [...patterns].sort(),
        `${name}: the load set is pinned verbatim — a file leaving the set fails here`);
    }
  });

  it("the declared tree and home name the loader's path (the ghost/run-gate planes)", () => {
    assert.deepEqual(DECL.lane_inputs, { model_path: "llama-joycaption-beta-one-hf-llava" },
      "lane_inputs names the tree the JJC loader reads (<models>/LLavacheckpoints/<stem>)");
    assert.deepEqual(DECL.lane_homes, { model_path: "LLavacheckpoints" },
      "lane_homes names the store parent the run gate probes at press");
  });
});
