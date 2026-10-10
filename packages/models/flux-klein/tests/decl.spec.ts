// @melite/models-flux-klein — the model-plugin data pins.
//
// A MODEL PLUGIN carries its WHOLE truth (the operator's law): the
// variants, their quant cells, the lane inputs, the defaults. These
// pins hold the PLUGIN SHAPE + identity + the Klein lane contract
// (the official template truth, the corrected Apache-2.0 licence row,
// the 4B-first premise the research round corrected, the BFL
// author-recipe row the operator's sources verified); registration is
// proven engine-side (the walls' registry count, the boot gates).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family } from "../src/index.ts";

describe("the flux-klein model plugin (the low-VRAM FLUX.2 Klein 4B lane)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-flux-klein");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id names the MODEL, never the operation (the naming law)", () => {
    assert.equal(DECL.id, "flux-klein");
    assert.ok(!DECL.id.includes("t2i") && !DECL.id.includes("4b"), "the family id names the model family, not a lane or a size");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });

  it("carries the corrected Apache-2.0 licence row (BFL's own sources, 2026-10-22): the 4B family is Apache, the 9B tier is the non-commercial one", () => {
    assert.equal(DECL.licence?.id, "apache-2.0");
    assert.equal(DECL.licence?.commercial_use, true);
    // the licence wall's law holds from the other side: no served
    // text may claim non-commercial without the structural twin
    const served = [DECL.description ?? "", DECL.label,
      ...DECL.variants.map((v) => [v.label, (v as { hint?: string }).hint ?? ""]).flat()];
    assert.ok(served.every((t) => !/non-?commercial/i.test(t)),
      "a non-commercial mention in served text with an apache row is a licence-law offender");
  });

  it("carries the author-recipe row (006-tail, the operator's sources): BFL's own base defaults stamp, Default stamps nothing", () => {
    const recipes = DECL.variants.filter((v) => v.group === "Recipe");
    assert.equal(recipes.length, 2, "author-base + Default");
    const author = recipes.find((v) => v.id === "author-base")!;
    // BFL flux2 src/flux2/util.py — flux.2-klein-base-4b:
    // defaults {guidance: 4.0, num_steps: 50}, fixed_params {}
    assert.deepEqual(author.wire_defaults, { steps: 50, cfg: 4 });
    // inside the card's declared bounds (steps [1,100], cfg [1,20])
    assert.ok(50 >= 1 && 50 <= 100 && 4 >= 1 && 4 <= 20, "the stamps sit inside the card's own bounds");
    // and inside the base variant's widened envelope (the compose
    // gate judges stated values against the SELECTED variant)
    const base = DECL.variants.find((v) => v.id === "base")!;
    const env = (base as { sampler_envelope?: { steps: [number, number]; cfg: [number, number] } }).sampler_envelope!;
    assert.ok(50 >= env.steps[0] && 50 <= env.steps[1], "the recipe's steps compose on the base tier");
    assert.ok(4 >= env.cfg[0] && 4 <= env.cfg[1], "the recipe's cfg composes on the base tier");
    // while the ComfyUI template marriage stays untouched
    assert.equal((base.resolver_defaults as Record<string, unknown>).steps, 20);
    assert.equal((base.resolver_defaults as Record<string, unknown>).cfg, 5);
    const dflt = recipes.find((v) => v.id === "default")!;
    assert.equal(Object.keys(dflt.wire_defaults ?? {}).length, 0, "Default stamps nothing");
    // the group is declared with Default as its landing pick
    const groups = (DECL.variant_groups ?? []).map((g) => (g as { id?: string }).id);
    assert.ok(groups.includes("Recipe"), "the Recipe group is declared");
    const recipeGroup = (DECL.variant_groups ?? []).find((g) => (g as { id?: string }).id === "Recipe") as { default?: string };
    assert.equal(recipeGroup.default, "default");
  });

  it("carries the official distilled template's lane contract", () => {
    const li = DECL.lane_inputs ?? {} as Record<string, unknown>;
    assert.equal(li.text_encode_node, "CLIPTextEncode");
    assert.equal(li.clip_type, "flux2");
    assert.equal(li.text_encoder, "qwen_3_4b.safetensors");
    assert.equal(li.unet, "flux-2-klein-4b.safetensors");
    assert.equal(li.vae, "flux2-vae.safetensors");
    assert.equal(li.max_references, 4);
    // the official distilled template's sampler truth: 1024², 4
    // steps, cfg 1, euler (the scheduler knob declares the card
    // domain; the Flux2Scheduler node owns the shift)
    const d = DECL.defaults ?? {} as Record<string, unknown>;
    assert.equal(d.width, 1024);
    assert.equal(d.height, 1024);
    assert.equal(d.steps, 4);
    assert.equal(d.cfg, 1);
    assert.equal(d.sampler, "euler");
    assert.equal(d.scheduler, "simple");
  });

  it("the base tier overrides the unet lane input (the krea-2 raw-lane law: the variant's own checkpoint)", () => {
    const base = DECL.variants.find((v) => v.id === "base")!;
    assert.equal((base.lane_inputs as Record<string, unknown> | undefined)?.unet, "flux-2-klein-base-4b.safetensors");
    assert.equal((base.resolver_defaults as Record<string, unknown> | undefined)?.steps, 20);
    assert.equal((base.resolver_defaults as Record<string, unknown> | undefined)?.cfg, 5);
  });

  it("provisions the shared weights (the silent-failure cure): tokenizer + vae carry url/sha/size", () => {
    const provs = DECL.provisions ?? [];
    assert.equal(provs.length, 2);
    for (const p of provs) {
      assert.ok(p.url.startsWith("https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/"),
        `${p.name}: the split repo is upstream's own (its repo-name spelling is verbatim)`);
      assert.match(p.sha256 ?? "", /^[0-9a-f]{64}$/);
      assert.ok((p.size_bytes ?? 0) > 0);
    }
  });

  it("quant cells carry downloadable artifacts (one per variant tier)", () => {
    const cells = DECL.variants.filter((v) => v.group === "Variant").flatMap((v) => v.cells);
    assert.equal(cells.length, 2);
    for (const c of cells) {
      assert.ok(c.artifact, `cell ${c.quant} carries its artifact`);
      assert.match(c.artifact!.sha256, /^[0-9a-f]{64}$/);
    }
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["qwen_3_4b.safetensors", "6c671498573ac2f7a5501502ccce8d2b08ea6ca2f661c458e708f36b36edfc5a", "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/text_encoders/qwen_3_4b.safetensors", 8044982048],
  ["flux2-vae.safetensors", "868fe7b343cc8f3a19dbcfcafbc3d5f888802be3f89bd81b65b3621a066ce8f3", "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/vae/flux2-vae.safetensors", 336211292],
];

describe("the declared provisions are pinned verbatim", () => {
  it("every row carries its pinned sha256, url and size_bytes", () => {
    const rows = DECL.provisions ?? [];
    assert.deepEqual(rows.map((r) => r.name), PROVISION_PINS.map((p) => p[0]),
      "the pin table IS the declared table — a row added, dropped or renamed is a deliberate edit");
    for (const [name, sha256, url, size_bytes] of PROVISION_PINS) {
      const row = rows.find((r) => r.name === name)!;
      assert.equal(row.sha256, sha256, `${name}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(row.url, url, `${name}: the url is pinned verbatim — a wrong path inside the right repo fails here`);
      assert.equal(row.size_bytes, size_bytes, `${name}: the declared size is pinned verbatim`);
    }
  });
});

// THE VERBATIM CELL-ARTIFACT LAW: each declared cell artifact's source
// url, digest, size and destination are literals here — a substituted
// sha or a moved file fails this block.
const CELL_ARTIFACT_PINS: ReadonlyArray<
  readonly [variant: string, quant: string, source_url: string, sha256: string, size_bytes: number, dest_root: string, dest_sub: string]
> = [
  ["distilled", "bf16", "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/diffusion_models/flux-2-klein-4b.safetensors", "ec3d4e733a771f61c052fb4856c48b336c55eaf2c65487c2a1faeb9bbda7a343", 7751105712, "COMFYUI_ROOT", "diffusion_models"],
  ["base", "bf16", "https://huggingface.co/Comfy-Org/vae-text-encorder-for-flux-klein-4b/resolve/main/split_files/diffusion_models/flux-2-klein-base-4b.safetensors", "9c5fed22b76baea749d88fc2abe3ad53245e7b21a0d353a762665eea00043b92", 7751105712, "COMFYUI_ROOT", "diffusion_models"],
];

describe("the declared cell artifacts are pinned verbatim", () => {
  it("every cell carries its pinned source_url, sha256 and destination", () => {
    const cells = DECL.variants.flatMap((v) => v.cells);
    assert.equal(cells.length, CELL_ARTIFACT_PINS.length,
      "every declared cell artifact is pinned — a new cell edits this table");
    for (const [variant, quant, source_url, sha256, size_bytes, dest_root, dest_sub] of CELL_ARTIFACT_PINS) {
      const cell = DECL.variants.find((v) => v.id === variant)!.cells.find((c) => c.quant === quant)!;
      const art = cell.artifact!;
      assert.equal(art.source_url, source_url, `${variant}/${quant}: the source url is pinned verbatim`);
      assert.equal(art.sha256, sha256, `${variant}/${quant}: the digest is pinned verbatim — a substituted sha fails here`);
      assert.equal(art.size_bytes, size_bytes, `${variant}/${quant}: the declared size is pinned verbatim`);
      assert.equal(art.dest_root, dest_root, `${variant}/${quant}: the destination root is pinned verbatim`);
      assert.equal(art.dest_sub, dest_sub, `${variant}/${quant}: the destination sub-folder is pinned verbatim`);
    }
  });
});
