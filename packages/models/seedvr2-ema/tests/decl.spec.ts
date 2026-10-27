// @melite/models-seedvr2-ema — the model-plugin data pins.
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

describe("the seedvr2-ema model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-seedvr2-ema");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "seedvr2-ema");
    assert.ok(DECL.variants.length > 0, "a family declares at least one variant");
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
  });
});

// THE VERBATIM CONTENT LAW: every declared provision row's digest, url
// and size are literals in the table below — a substituted sha, a wrong
// path inside the right repo, or a drifted size fails this block. A new
// row is a deliberate edit of this table.
const PROVISION_PINS: ReadonlyArray<
  readonly [name: string, sha256: string, url: string, size_bytes: number]
> = [
  ["seedvr2_ema_3b_fp16.safetensors", "2fd0e03a3dad24e07086750360727ca437de4ecd456f769856e960ae93e2b304", "https://huggingface.co/numz/SeedVR2_comfyUI/resolve/main/seedvr2_ema_3b_fp16.safetensors", 6783018808],
  // the pack's DEFAULT_DIT (bytes audit 2026-10-13): the loader
  // resolves it out of the box — declared or the door can never
  // provision the engine's own default pick
  ["seedvr2_ema_3b_fp8_e4m3fn.safetensors", "3bf1e43ebedd570e7e7a0b1b60d6a02e105978f505c8128a241cde99a8240cff", "https://huggingface.co/numz/SeedVR2_comfyUI/resolve/main/seedvr2_ema_3b_fp8_e4m3fn.safetensors", 3391544696],
  ["ema_vae_fp16.safetensors", "20678548f420d98d26f11442d3528f8b8c94e57ee046ef93dbb7633da8612ca1", "https://huggingface.co/numz/SeedVR2_comfyUI/resolve/main/ema_vae_fp16.safetensors", 501324814],
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

// THE QUANT AXIS CONTRACT (E2-4, the operator's burn: "NOTICE THE
// UPSCALE CARD HERE. THE MODEL / VARIANT / RECIPE LAYOUT IS MISSING
// QUANT! … WHERE IS THE SHARED VOCAB HERE AS A CONTRACT?" — the
// verbatim voice lives in the ERRORS_2 ledger): the family DECLARES
// a Quant axis group, so its tiers are ROWS on that axis — never
// faces stuffed into variant labels until the label spills over the
// Model row. The shared vocab is the krea-2 pattern verbatim: the
// variant carries CELLS, one per precision body, each cell naming
// its own route and its own weights file (CellRow's lane stamps —
// merged base ← variant ← cell at the derived route read).
describe("THE QUANT AXIS CONTRACT (E2-4 — the tiers are axis rows, never label stuffing)", () => {
  const three = DECL.variants.find((v) => v.id === "3b")!;

  it("the default variant carries its tier cells — BOTH real provisioned bodies", () => {
    const quants = (three.cells ?? []).map((c) => c.quant);
    assert.deepEqual(quants, ["fp16", "fp8"],
      "3B has two download tiers on disk (fp16 + fp8_e4m3fn) — the Quant axis serves both");
  });

  it("every cell names its own route and its own weights file (no tier rides another's weights)", () => {
    for (const c of three.cells ?? []) {
      assert.ok(c.route !== "" && c.route !== undefined, `cell ${c.quant}: a tier re-keys the lane under its own route`);
      const unet = (c.lane_inputs as Record<string, unknown> | undefined)?.["unet"];
      assert.equal(typeof unet, "string", `cell ${c.quant}: the tier's weights file is named`);
      const declared = (DECL.provisions ?? []).some((p) => p.name === unet);
      assert.ok(declared, `cell ${c.quant}: ${String(unet)} is a declared provision — no phantom weights`);
    }
    const fp16 = three.cells?.find((c) => c.quant === "fp16");
    const fp8 = three.cells?.find((c) => c.quant === "fp8");
    assert.equal(fp16?.lane_inputs?.["unet"], "seedvr2_ema_3b_fp16.safetensors");
    assert.equal(fp8?.lane_inputs?.["unet"], "seedvr2_ema_3b_fp8_e4m3fn.safetensors");
  });

  it("variant labels carry NO precision face — the Quant axis owns the vocabulary", () => {
    // EVERY offered Variant row, derived — the arm once enumerated
    // id === "3b" || id === "7b", a literal a new row simply bypasses.
    for (const v of DECL.variants.filter((x) => x.group === "Variant" && !x.hide_from_dropdown)) {
      assert.ok(!/fp\s?\d|fp8|fp16|int8|bf16/i.test(v.label),
        `variant '${v.id}' label '${v.label}' stuffs a quant face — the axis row owns it (the shared-vocab contract)`);
    }
  });

  it("SERVABILITY — an offered body variant resolves weights: at least one offered cell (the 7B law)", () => {
    // THE OPERATOR'S LIVE BURN (2026-11-12): the "7B" row was offered
    // with cells: [] and no provision anywhere — any quant under it
    // refused "declares no cells for this variant — DECL/projection
    // sync break" at the operator's run press, and UNSTATED it would
    // have fallen to the family lane_inputs and silently run the 3B
    // file. A body variant the estate cannot serve is refused HERE,
    // at DECL time — never at a run press. Hidden rows (the vae
    // helper's real fold) are exempt: they are never offered.
    const offered = DECL.variants.filter((x) => x.group === "Variant" && !x.hide_from_dropdown);
    assert.ok(offered.length >= 1, "the family offers at least one body variant");
    for (const v of offered) {
      const offeredCells = (v.cells ?? []).filter((c) => !c.hide_from_dropdown);
      assert.ok(offeredCells.length >= 1,
        `variant '${v.id}' is offered with no offered cells — a dead door (the 7B class, 2026-11-12): land its provision + cell or hide the row`);
      for (const c of offeredCells) {
        const unet = (c.lane_inputs as Record<string, unknown> | undefined)?.["unet"];
        const declared = (DECL.provisions ?? []).some((p) => p.name === unet);
        assert.ok(declared,
          `variant '${v.id}' cell '${String(c.quant)}': ${String(unet)} is a declared provision — no phantom weights`);
      }
    }
  });
});
