// @melite/models-qwen3-tts — the model-plugin data pins.
//
// THE ONE QWEN FAMILY (operator 2026-10-26, the size-at-quant
// ruling): A) MODEL = QWEN — one atom, one address; B) VARIANT =
// CustomVoice, VoiceDesign, Base — the three flavors; C) QUANT =
// the size picker — 1.7B or 0.6B, the cell the ladder names. This
// spec IS the size-at-quant wall: every assertion here fires red
// the moment the matrix regresses to the dead two-family split
// (size on the MODEL axis) or the instruct split leaves its cell.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family, LANE_TOPOLOGY, variantRoute } from "../src/index.ts";

/** the configured (non-Recipe) variants, in DECL order */
function lanes(): Array<ReturnType<typeof Object>> {
  return DECL.variants.filter((v) => v.group === "Variant") as unknown as Array<ReturnType<typeof Object>>;
}

describe("the qwen3-tts model plugin (ONE family, size at the quant cell)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen3-tts");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("MODEL names the checkpoint — ONE atom, NO size in the seat (the axis law)", () => {
    assert.equal(DECL.id, "qwen3-tts");
    // THE LABEL LAW: the size lives at the quant axis — a size
    // suffix on the family label is the dead two-family split
    // regrown (this literal fired red on "Qwen3-TTS 0.6B").
    assert.equal(DECL.label, "Qwen3-TTS");
    // the family lane_inputs are the LARGE default ("ALWAYS the
    // big model") — the unstated-quant coordinate on every door.
    assert.equal(
      (DECL.lane_inputs as Record<string, unknown>)["model_path"],
      "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged",
      "the family default is the 1.7B CustomVoice tree",
    );
    assert.ok((DECL.mods as string[]).includes("qvoice"), "the family loads embeddings (the CustomVoice lane)");
    assert.ok((DECL.mods as string[]).includes("qvoice_save"), "the save fires from any lane (the studio exporter)");
  });

  it("VARIANT names the flavor — THREE lanes: CustomVoice (head), VoiceDesign, Base", () => {
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
    const configured = DECL.variants.filter((v) => v.group === "Variant");
    assert.equal(configured.length, 3, "exactly three flavor lanes — the operator's 'whatever the three'");
    const custom = configured[0]!;
    assert.equal(custom.id, "customvoice", "the head variant is CustomVoice (the family default resolves here)");
    assert.equal(custom.group, "Variant");
    assert.ok(configured.some((v) => v.id === "voicedesign"), "VoiceDesign rides as a variant lane");
    assert.ok(configured.some((v) => v.id === "base"), "Base rides as a variant lane");
    // THE DEFAULT STAMP: the family's resting lane. THE NO-DEFAULT-
    // VOICE LAW (operator ruling 2026-11-10: "Make sure it DEFAULTS
    // to no voice, instead of VIVIAN"): the defaults seed NO persona.
    assert.equal((DECL.defaults as Record<string, unknown>)["variant"], "customvoice");
    assert.equal(
      Object.prototype.hasOwnProperty.call(DECL.defaults as Record<string, unknown>, "voice"), false,
      "the family defaults seat no voice — the fresh card's persona is UNSTATED (the offered presets are choices, never a seed)",
    );
  });

  it("QUANT names the size — every ladder leads with its 1.7B rung, and every cell names its OWN weights tree", () => {
    const cell = (variantId: string, quantId: string) => {
      const v = DECL.variants.find((x) => x.id === variantId)!;
      const c = (v.cells ?? []).find((x) => x.quant === quantId);
      assert.ok(c, `${variantId} offers the ${quantId} cell`);
      return c as { quant: string; label: string; route?: string; lane_inputs?: Record<string, unknown>; params?: readonly string[] };
    };
    // THE LADDERS (the size matrix): customvoice and base ship both
    // sizes; voicedesign is 1.7B only (upstream ships no small
    // design checkpoint).
    assert.deepEqual(
      DECL.variants.find((v) => v.id === "customvoice")!.cells!.map((c) => c.quant),
      ["1_7b", "0_6b"],
      "customvoice: the large rung leads",
    );
    assert.deepEqual(
      DECL.variants.find((v) => v.id === "base")!.cells!.map((c) => c.quant),
      ["1_7b", "0_6b"],
      "base: the large rung leads",
    );
    assert.deepEqual(
      DECL.variants.find((v) => v.id === "voicedesign")!.cells!.map((c) => c.quant),
      ["1_7b"],
      "voicedesign: 1.7B only — no 0.6B design checkpoint exists upstream",
    );
    assert.equal(cell("customvoice", "1_7b").label, "1.7B");
    assert.equal(cell("customvoice", "0_6b").label, "0.6B");
    // THE WEIGHTS TREES: every (variant × size) pair names its own
    // tree at the cell — merged base ← variant ← cell at the
    // derived read. A tree on the wrong cell is the silent
    // neighbor-cell bug (a 0.6B run on 1.7B weights).
    assert.equal(cell("customvoice", "1_7b").lane_inputs?.["model_path"], "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged");
    assert.equal(cell("customvoice", "0_6b").lane_inputs?.["model_path"], "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged");
    assert.equal(cell("voicedesign", "1_7b").lane_inputs?.["model_path"], "Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    assert.equal(cell("base", "1_7b").lane_inputs?.["model_path"], "Qwen3-TTS-12Hz-1.7B-Base-merged");
    // THE HF-TREE ADDRESS (transcript-014): the bare container dir
    // 'qwen3-tts' holds only hf/ — the C++ load gate refused it.
    assert.equal(
      cell("base", "0_6b").lane_inputs?.["model_path"],
      "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base",
      "the loadable address inside the hf tree, never the bare container",
    );
  });

  it("THE INSTRUCT SPLIT — style_instruction rides the 1.7B CustomVoice CELL alone (upstream's own capability matrix)", () => {
    const cell = (variantId: string, quantId: string): readonly string[] | undefined =>
      (DECL.variants.find((x) => x.id === variantId)?.cells ?? [])
        .find((x) => x.quant === quantId)?.params;
    // the 1.7B cell: generate_custom_voice(text, language, speaker,
    // instruct?) — the instruct input EXISTS.
    assert.deepEqual(cell("customvoice", "1_7b"), ["style_instruction"], "the large cell adds the instruct input");
    // the 0.6B cell: the small generate_custom_voice takes NO
    // instruct — the cell declares no params, so the surface law
    // refuses a stated style_instruction on this size.
    assert.equal(cell("customvoice", "0_6b"), undefined, "the small cell adds nothing");
    // the VARIANT's own surface (both sizes): the persona picker
    // only — style on the variant would leak it to the small cell.
    assert.deepEqual(
      DECL.variants.find((v) => v.id === "customvoice")!.params,
      ["voice"],
      "the variant surface carries no instruct — the split lives at the cell",
    );
    // no other lane carries it.
    assert.equal(cell("voicedesign", "1_7b"), undefined, "the design lane's instruct is design_prompt, its own input");
    assert.equal(cell("base", "1_7b"), undefined);
    assert.equal(cell("base", "0_6b"), undefined);
    // THE GRAPH TOPOLOGY mirrors upstream: the customvoice graph
    // wires the instruct input (the 1.7B cell owns it; the 0.6B
    // cell's SURFACE gates the write away — topology wires, surface
    // laws the write).
    assert.equal(LANE_TOPOLOGY.customvoice?.instruction_control, true, "the 1.7B graph wires instruct");
    assert.equal(LANE_TOPOLOGY.customvoice?.synth_lane, "speak");
    assert.equal(LANE_TOPOLOGY.voicedesign?.synth_lane, "design");
    assert.equal(LANE_TOPOLOGY.base?.synth_lane, "clone", "the clone branch reads the variant topology, never the family id");
  });

  it("EVERY dead address survives as a cell route — the fold's coverage law (five addresses, one owner)", () => {
    const routes = new Set<string>();
    for (const v of DECL.variants) {
      if (v.route) routes.add(v.route);
      for (const c of v.cells ?? []) if (c.route) routes.add(c.route);
    }
    // the family atom + the four lane addresses the two dead atoms
    // served. An address missing here is an old draft resolving to
    // nothing — the exact failure the FOLD LAW forbids.
    for (const addr of [
      "qwen3-tts",
      "qwen3-tts-base",
      "qwen3-tts-voicedesign",
      "qwen3-tts-voicedesign-design",
      "qwen3-tts-voicedesign-base",
    ]) {
      assert.ok(routes.has(addr), `the address ${addr} survives the fold`);
    }
  });

  it("variantRoute reads the DECL's own address and answers '' for a lane that declares none", () => {
    assert.equal(variantRoute(DECL, "customvoice"), "qwen3-tts-voicedesign", "the head variant's default address is its large cell's route");
    assert.equal(variantRoute(DECL, "voicedesign"), "qwen3-tts-voicedesign-design");
    assert.equal(variantRoute(DECL, "base"), "qwen3-tts-voicedesign-base");
    // `variants` is optional on the read's own shape — a decl with none
    assert.equal(variantRoute({}, "base"), "");
    // a lane that declares no route (a recipe row) and an unknown id
    assert.equal(variantRoute({ variants: [{ id: "plain" }] }, "plain"), "");
    assert.equal(variantRoute(DECL, "ghost"), "");
  });

  it("the weights truth — five hand-placed trees, two pinned snapshot rows (the union the fold owes)", () => {
    const placed = DECL.hand_placed_weights ?? [];
    assert.equal(placed.length, 5, "every tree the family's lanes load, stated once");
    for (const tree of [
      "Qwen3-TTS-12Hz-1.7B-CustomVoice-merged",
      "Qwen3-TTS-12Hz-1.7B-VoiceDesign",
      "Qwen3-TTS-12Hz-1.7B-Base-merged",
      "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged",
      "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base",
    ]) {
      assert.ok(placed.includes(tree), `the tree ${tree} is declared`);
    }
    const rows = DECL.snapshot_provisions ?? [];
    assert.equal(rows.length, 2, "exactly the two fetchable HF trees — never a merge");
    const byName = new Map(rows.map((r) => [r.name, r]));
    const vd = byName.get("Qwen3-TTS-12Hz-1.7B-VoiceDesign")!;
    const base = byName.get("Qwen3-TTS-12Hz-0.6B-Base")!;
    assert.equal(vd.repo_id, "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign");
    assert.equal(base.repo_id, "Qwen/Qwen3-TTS-12Hz-0.6B-Base");
    for (const row of [vd, base]) {
      assert.equal(row.folder, "audio/qwen3-tts/hf");
      assert.match(row.revision, /^[0-9a-f]{40}$/, "the revision is a pinned commit, never a branch");
      for (const need of ["config.json", "model.safetensors"]) {
        assert.ok(row.allow_patterns.includes(need), `patterns cover ${need}`);
      }
      assert.ok(
        row.allow_patterns.some((p) => p.startsWith("speech_tokenizer/")),
        "patterns cover the speech tokenizer subtree",
      );
      assert.ok(placed.some((w) => w.endsWith(row.name)), "every fetchable tree stays dual-declared in hand_placed_weights");
    }
  });

  it("the Recipe rows ride the family head — steady/expressive presets, Default stamps nothing", () => {
    const recipes = DECL.variants.filter((v) => v.group === "Recipe");
    assert.deepEqual(
      recipes.map((r) => r.id).sort(),
      ["default", "expressive-read", "steady-read"],
      "the preset truth rides Recipe rows (RULE A), not lane variants",
    );
    const steady = recipes.find((r) => r.id === "steady-read")!;
    assert.deepEqual((steady as { wire_defaults?: Record<string, unknown> }).wire_defaults, { temperature: 0.05 });
    const expr = recipes.find((r) => r.id === "expressive-read")!;
    assert.deepEqual((expr as { wire_defaults?: Record<string, unknown> }).wire_defaults, { temperature: 2 });
    const plain = recipes.find((r) => r.id === "default")!;
    assert.ok(!("wire_defaults" in plain), "Default stamps nothing — a fresh card lands here");
    // recipes carry no cells (the head lane) and no route.
    for (const r of recipes) {
      assert.deepEqual(r.cells ?? [], [], "a recipe rides the family head — no size ladder of its own");
      assert.ok(!r.route, "a recipe claims no address");
    }
  });
});
