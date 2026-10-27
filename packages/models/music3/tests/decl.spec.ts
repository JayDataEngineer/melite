// @melite/models-music3 — the model-plugin data pins.
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

describe("the music3 model plugin (the whole model, one package)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-music3");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("declares the carrier — the id matches the package, variants named", () => {
    assert.equal(DECL.id, "music3");
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
  // AUDIT 014 C5: the fp16 DiT is the atom — the template's own body
  // (HF LFS metadata, api-tree 2026-11-12 — the first row, never the
  // second tier's row). The int8_convrot row is the low-VRAM cell's
  // load ("# For low VRAM"); the text-encoder and vae ride both
  // cells (a cell's lane truth is atom ∪ variant ∪ cell).
  ["minimax_music3_dit_fp16.safetensors", "45494a2b6b69af115902ff28eaf54118d19067aa54da01000f3e3efce7ba0e34", "https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/diffusion_models/minimax_music3_dit_fp16.safetensors", 4914197682],
  ["minimax_music3_dit_int8_convrot.safetensors", "d6b959633e69899f99f3a92d6741c0fe79f26958a30811e50e372ef978b24d5f", "https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/diffusion_models/minimax_music3_dit_int8_convrot.safetensors", 2502161682],
  ["minimax_music3_text_encoder_pruned_int8_convrot.safetensors", "010b7416d2336a08c711bc22ee65849c9623069ddb7d89bec011a75699e52014", "https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/text_encoders/minimax_music3_text_encoder_pruned_int8_convrot.safetensors", 9196611886],
  ["minimax_music3_dav.safetensors", "2a32155b769be01445fcc2a8663b910fc9e1751e18dc1c3ec528064512d9ef0c", "https://huggingface.co/Comfy-Org/MiniMax-Music-3/resolve/main/vae/minimax_music3_dav.safetensors", 216696128],
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

// AUDIT 014 C5 — the fp16 DiT variant row: served with real
// provision. The template's two-tier pair (fp16 default,
// int8_convrot "# For low VRAM") both plate real seats: the atom
// serves the template's own body at the family's own address (the
// first-declared FP16 cell routes the family id), and the offered
// low-VRAM cell names its own route + its own lane file + a matching
// provision row. The servability law (998dc25ed) governs: offered
// Variant rows carry offered cells, and every served file a lane may
// load rides a provision (the h3 ghost tree class — the shipped DECL
// names a tiers the box cannot fetch). A removed cell or an
// unprovisioned file reds here, at DECL time — never at a run press.
describe("the fp16 DiT variant row (audit 014 C5)", () => {
  it("SERVABILITY — the offered standard row carries both served cells with declared provision", () => {
    const offered = DECL.variants.filter((x) => x.group === "Variant" && !x.hide_from_dropdown);
    assert.ok(offered.length >= 1, "the family offers at least one body variant");
    for (const v of offered) {
      const offeredCells = (v.cells ?? []).filter((c) => !c.hide_from_dropdown);
      assert.ok(offeredCells.length >= 1,
        `variant '${v.id}' is offered with no offered cells — a dead door (the 7B class): land its provision + cell or hide the row`);
      // The tier pair, derived through the quant vocabulary — the arm
      // refutes a re-collapse onto a single tier (either spelling).
      const quants = new Set(offeredCells.map((c) => c.quant));
      assert.ok(quants.has("fp16"),
        `variant '${v.id}': the template's fp16 body is the default tier (audit 014 C5) — a fp16-less matrix is the collapsed single-quant burn`);
      assert.ok(quants.has("int8_convrot"),
        `variant '${v.id}': the low-VRAM tier stays served (audit 014 C5 cures ADDS a tier, never swaps the served face)`);
      for (const c of offeredCells) {
        const unet = c.quant === "fp16"
          // the fp16 cell rides the atom's lane truth (no cell stamp)
          ? (DECL.lane_inputs as Record<string, unknown>)["unet"]
          : (c.lane_inputs as Record<string, unknown> | undefined)?.["unet"];
        assert.equal(typeof unet, "string",
          `variant '${v.id}' cell '${String(c.quant)}': the cell's load resolves — no phantom weights`);
        assert.ok((DECL.provisions ?? []).some((p) => p.name === unet),
          `variant '${v.id}' cell '${String(c.quant)}': ${String(unet)} is a declared provision — a served file the box cannot fetch`);
      }
    }
  });

  it("the fp16 default routes at the family address; the low-VRAM cell owns its route", () => {
    const standard = DECL.variants.find((v) => v.id === "standard")!;
    assert.ok(standard, "the standard variant row is the body's home");
    const fp16 = (standard.cells ?? []).find((c) => c.quant === "fp16")!;
    assert.ok(fp16, "the fp16 cell rides the standard row");
    assert.equal(fp16.route, DECL.id,
      "the fp16 default answers the family address — the unstated pick loads the template's own body");
    const int8 = (standard.cells ?? []).find((c) => c.quant === "int8_convrot")!;
    assert.ok(int8, "the low-VRAM cell rides the standard row");
    assert.ok(typeof int8.route === "string" && int8.route !== "" && int8.route !== DECL.id,
      "the int8 cell names its own route — a stated pick re-keys the address view and folds its own lane file");
    assert.equal((int8.lane_inputs as Record<string, unknown> | undefined)?.["unet"],
      "minimax_music3_dit_int8_convrot.safetensors",
      "the int8 cell's lane stamp is its own load (the cell-lane cascade folds it over the fp16 atom)");
  });
});
