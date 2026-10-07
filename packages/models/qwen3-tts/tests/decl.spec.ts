// @melite/models-qwen3-tts — the model-plugin data pins.
//
// THE 0.6B FAMILY (the operator's table: SIZES are models, FLAVORS
// are variants — "for models there is .6B or 1.7B; for the variants
// there is Base, CustomVoice, VoiceDesign"). This package owns the
// .6 checkpoint with TWO variant lanes: CustomVoice synthesis
// (personas + style control) and the Base 3-second clone. The old
// qwen3-tts-base FAMILY is dead — Base is a variant route
// ('qwen3-tts-base'), so old drafts keep resolving to the clone
// lane. Sibling: models-qwen3-tts-voicedesign (the 1.7B model).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { DECL, family, LANE_TOPOLOGY, variantRoute } from "../src/index.ts";

describe("the qwen3-tts model plugin (0.6B, two variants)", () => {
  it("is a plugin: named family export, inject ['models'], apply registers", () => {
    assert.equal(family.name, "family-qwen3-tts");
    assert.deepEqual(family.inject, ["models"]);
    assert.equal(typeof family.apply, "function");
  });

  it("MODEL names the checkpoint — no flavor in the Model seat", () => {
    assert.equal(DECL.id, "qwen3-tts");
    assert.equal(DECL.label, "Qwen3-TTS 0.6B");
    assert.equal((DECL.lane_inputs as Record<string, unknown>)["model_path"], "Qwen3-TTS-12Hz-0.6B-CustomVoice-merged");
    assert.equal(LANE_TOPOLOGY.customvoice?.instruction_control, false, "the head lane (CustomVoice) carries no instruction control");
    assert.equal(LANE_TOPOLOGY.customvoice?.synth_lane, "speak", "the head lane is the default variant's lane — THE FLOW's lane");
    assert.ok((DECL.mods as string[]).includes("qvoice"), "the family loads embeddings (the CustomVoice lane)");
    // QVOICE SAVES AND LOADS ACROSS ALL qwen3-tts (operator
    // 2026-09-23, the full law): the save pack boards here too — the
    // studio exporter fires from any lane (it loads its own
    // variants), while the checkpoint matrix keeps the 1:1 upstream
    // table (no VoiceDesign variant rides the 0.6B — that lane
    // alone stays unclaimed below).
    assert.ok((DECL.mods as string[]).includes("qvoice_save"), "the save fires from any lane (the studio exporter)");
    assert.ok(
      !DECL.variants.some((v) => v.id === "voicedesign"),
      "design-export boards as a MOD, never a 0.6B variant lane (the 1:1 upstream released-models table holds)",
    );
  });

  it("VARIANTS name the submodels — CustomVoice first (the head), Base second (the clone)", () => {
    const ids = DECL.variants.map((v) => v.id);
    assert.equal(new Set(ids).size, ids.length, "variant ids unique");
    const custom = DECL.variants[0]!;
    assert.equal(custom.id, "customvoice", "the head variant is CustomVoice (the family address resolves here)");
    assert.equal(custom.route, "qwen3-tts");
    assert.equal(custom.group, "Variant");
    const base = DECL.variants.find((v) => v.id === "base")!;
    assert.ok(base, "Base rides as a variant, never a family");
    assert.equal(base.label, "Base");
    assert.equal(base.route, "qwen3-tts-base", "the dead family's address survives as the variant route — old drafts keep resolving");
  });

  it("the Base variant carries the clone lane — byte-identical to the dead family's truth", () => {
    const base = DECL.variants.find((v) => v.id === "base")!;
    const li = base.lane_inputs as Record<string, unknown>;
    assert.equal(LANE_TOPOLOGY.base?.synth_lane, "clone", "the lane branch reads the variant topology, never the family id");
    // THE HF-TREE ADDRESS (transcript-014, stage 3): the bare
    // container dir 'qwen3-tts' holds only hf/ — the C++ load gate
    // refused it (RuntimeError: Failed to load qwen3_tts). The
    // 0.6B Base weights sit one level down with top-level
    // safetensors; the lane names the loadable address.
    assert.equal(li["model_path"], "qwen3-tts/hf/Qwen3-TTS-12Hz-0.6B-Base", "the clone checkpoint address — the real weights inside the hf tree, not the bare container the engine refuses");
    const resolver = base.resolver_defaults as Record<string, unknown>;
    assert.equal(resolver["model"], "qwen3-tts-base", "the re-point stamp (krea-2-raw precedent) resolves variant picks server-side");
    assert.equal(resolver["voice"], null, "the NULL stamp unsets the inherited persona (the clone takes no voice)");
  });

  // THE ROUTE READ (the card audit's M5): the card resolves a variant's
  // own address through this, so a lane that declares none must answer
  // '' — the honest "board nothing" signal the caller filters on.
  it("variantRoute reads the DECL's own address and answers '' for a lane that declares none", () => {
    assert.equal(variantRoute(DECL, "customvoice"), "qwen3-tts");
    assert.equal(variantRoute(DECL, "base"), "qwen3-tts-base");
    // `variants` is optional on the read's own shape — a decl with none
    assert.equal(variantRoute({}, "base"), "");
    // a lane that declares no route (a recipe row) and an unknown id
    assert.equal(variantRoute({ variants: [{ id: "plain" }] }, "plain"), "");
    assert.equal(variantRoute(DECL, "ghost"), "");
  });

  // THE DIRECTORY PROVISION (the model-families audit fix 8): the
  // fetchable Base tree pins its upstream snapshot (repo + revision
  // + patterns).
  // The operator merge pins nothing (no upstream exists).
  it("snapshot_provisions pins the fetchable Base tree and nothing else", () => {
    const rows = DECL.snapshot_provisions ?? [];
    assert.equal(rows.length, 1, "exactly one snapshot row — the fetchable tree, never a merge");
    const row = rows[0]!;
    assert.equal(row.name, "Qwen3-TTS-12Hz-0.6B-Base");
    assert.equal(row.folder, "audio/qwen3-tts/hf");
    assert.equal(row.repo_id, "Qwen/Qwen3-TTS-12Hz-0.6B-Base");
    assert.match(row.revision, /^[0-9a-f]{40}$/, "the revision is a pinned commit, never a branch");
    for (const need of ["config.json", "model.safetensors"]) {
      assert.ok(row.allow_patterns.includes(need), `patterns cover ${need}`);
    }
    assert.ok(
      row.allow_patterns.some((p) => p.startsWith("speech_tokenizer/")),
      "patterns cover the speech tokenizer subtree",
    );
    const placed = DECL.hand_placed_weights ?? [];
    assert.ok(placed.some((w) => w.endsWith(row.name)), "the fetchable tree stays dual-declared in hand_placed_weights");
    assert.ok(
      placed.some((w) => w.endsWith("Qwen3-TTS-12Hz-0.6B-CustomVoice-merged")),
      "the merged tree stays hand-placed",
    );
  });
});
