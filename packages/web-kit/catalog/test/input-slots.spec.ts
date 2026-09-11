// input-slots.spec.ts — the input-slot vocabulary: the boot fallback,
// the catalog feed, the form/model slot gates, the alias fold, and the
// file-kind guard. Fallback tests run FIRST (module state is replaced,
// never merged, by the first feed).
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import {
  canWireSlot,
  cardSlotsFor,
  firstInputSlot,
  formAliasesFor,
  formSlotsFor,
  genreToKind,
  hasInputSlots,
  inputSlots,
  isUndeclaredWireSlot,
  kindsCompatible,
  modelSlotsFor,
  normalizeSlotParams,
  padInputs,
  setInputVocabulary,
  slotKind,
  stageSlots,
} from "../src/inputSlots.ts";
import type { FileKind, InputVocabulary } from "../src/inputSlots.ts";

describe("boot fallback (pre-catalog)", () => {
  it("serves the mirror slots with no aliases or kinds", () => {
    assert.ok(inputSlots().includes("input_image"));
    assert.ok(inputSlots().includes("voice_file"));
    assert.deepEqual(formAliasesFor("form_edit"), {});
    assert.equal(formSlotsFor("form_generate"), undefined);
    assert.equal(modelSlotsFor("m"), undefined);
    assert.equal(cardSlotsFor("m", "form_generate"), undefined);
    assert.equal(slotKind("input_image"), "any");
    assert.equal(isUndeclaredWireSlot("lanpaint_mask"), true);
    assert.equal(isUndeclaredWireSlot("input_image"), false);
    assert.equal(hasInputSlots({ prompt: "x" }), false);
    assert.equal(hasInputSlots({ input_image: "u" }), true);
    assert.equal(firstInputSlot({ prompt: "x" }), null);
    assert.equal(firstInputSlot({ image1: "a", input_image: "b" }), "input_image");
    assert.deepEqual(stageSlots({ image1: "a", prompt: "x" }), ["image1"]);
  });
});

describe("setInputVocabulary", () => {
  it("replaces the boot default and honors closed vocabularies", () => {
    setInputVocabulary({
      slots: ["a_slot", "b_slot"],
      undeclared_slots: [],
      aliases: { input_artifact: "a_slot" },
      form_aliases: { f1: { input_artifact: "b_slot" }, broken: "nope" },
      form_slots: { f1: ["b_slot"], ftext: [], broken: "nope" },
      model_slots: { mm: [], nn: ["a_slot"], broken: 3 },
      slot_kinds: { a_slot: "image" },
    } as unknown as InputVocabulary);
    assert.deepEqual(inputSlots(), ["a_slot", "b_slot"]);
    assert.equal(isUndeclaredWireSlot("lanpaint_mask"), false);
    assert.deepEqual(formAliasesFor("f1"), { input_artifact: "b_slot" });
    assert.deepEqual(formAliasesFor("unknown"), { input_artifact: "a_slot" });
    assert.deepEqual(formAliasesFor(null), { input_artifact: "a_slot" });
    assert.deepEqual(formSlotsFor("f1"), ["b_slot"]);
    assert.deepEqual(formSlotsFor("ftext"), []);
    assert.equal(formSlotsFor("unknown"), undefined);
    assert.equal(formSlotsFor(null), undefined);
    assert.deepEqual(modelSlotsFor("mm"), []);
    assert.deepEqual(modelSlotsFor("nn"), ["a_slot"]);
    assert.equal(modelSlotsFor("unknown"), undefined);
    assert.equal(modelSlotsFor(null), undefined);
    // Model wins over form; form wins over the global fallback.
    assert.deepEqual(cardSlotsFor("mm", "f1"), []);
    assert.deepEqual(cardSlotsFor("unknown", "f1"), ["b_slot"]);
    assert.equal(cardSlotsFor(undefined, undefined), undefined);
    assert.equal(slotKind("a_slot"), "image");
    assert.equal(slotKind("b_slot"), "any");
  });

  it("ignores empty/non-shape feeds", () => {
    const before = inputSlots();
    setInputVocabulary({});
    setInputVocabulary({ slots: [] });
    setInputVocabulary({
      slots: "nope",
      aliases: 7,
      form_aliases: 7,
      form_slots: 7,
      model_slots: 7,
      slot_kinds: 7,
      undeclared_slots: "nope",
    } as unknown as InputVocabulary);
    assert.deepEqual(inputSlots(), before);
  });

  it("keeps non-string slot kinds permissive", () => {
    setInputVocabulary({ slot_kinds: { a_slot: 5 } } as unknown as InputVocabulary);
    assert.equal(slotKind("a_slot"), "any");
    setInputVocabulary({ slot_kinds: { a_slot: "mask" } });
    assert.equal(slotKind("a_slot"), "mask");
  });
});

describe("stageSlots + padInputs", () => {
  it("filters by the declared vocabulary when one exists", () => {
    setInputVocabulary({
      slots: ["a_slot", "b_slot"],
      model_slots: { mm: [] },
      form_slots: { f1: ["b_slot"] },
    });
    assert.deepEqual(stageSlots({ a_slot: "x", b_slot: "y" }, "f1", "mm"), []);
    assert.deepEqual(stageSlots({ a_slot: "x", b_slot: "y" }, "f1", "unknown"), ["b_slot"]);
    assert.deepEqual(stageSlots({ a_slot: "x", b_slot: "y" }), ["a_slot", "b_slot"]);
    assert.deepEqual(stageSlots({ prompt: "x" }, "f1", "mm"), []);
  });

  it("pads short input arrays, never truncates", () => {
    assert.deepEqual(padInputs(["a"], ["s1", "s2", "s3"]), ["a", "", ""]);
    assert.deepEqual(padInputs(["a", "b"], ["s1", "s2"]), ["a", "b"]);
    assert.deepEqual(padInputs(["a", "b", "c"], ["s1"]), ["a", "b", "c"]);
  });
});

describe("normalizeSlotParams", () => {
  it("folds aliases with slot-wins and null-placeholder rules", () => {
    setInputVocabulary({
      slots: ["a_slot", "b_slot"],
      aliases: { input_artifact: "a_slot", same: "same" },
    });
    // Explicit slot value wins over the alias.
    assert.deepEqual(
      normalizeSlotParams({ a_slot: "keep", input_artifact: "drop" }),
      { a_slot: "keep" },
    );
    // Alias fills an absent or null slot.
    assert.deepEqual(normalizeSlotParams({ input_artifact: "v" }), { a_slot: "v" });
    assert.deepEqual(
      normalizeSlotParams({ a_slot: null, input_artifact: "v" }),
      { a_slot: "v" },
    );
    // Identity aliases copy verbatim; unknown keys pass through.
    assert.deepEqual(normalizeSlotParams({ same: 1, prompt: "x" }), { same: 1, prompt: "x" });
  });

  it("purges stale global-slot keys outside the declared vocabulary", () => {
    setInputVocabulary({
      slots: ["a_slot", "b_slot", "lanpaint_mask"],
      undeclared_slots: ["lanpaint_mask"],
      form_slots: { f1: ["b_slot"] },
      model_slots: { mm: [] },
    });
    // Form gate: a_slot is stale on f1, lanpaint_mask is wire-exempt.
    assert.deepEqual(normalizeSlotParams({ a_slot: "x", lanpaint_mask: "w" }, "f1"), {
      lanpaint_mask: "w",
    });
    // Model gate (closed []): every slot key purges except the exempt wire.
    assert.deepEqual(
      normalizeSlotParams({ b_slot: "x", lanpaint_mask: "w" }, "f1", "mm"),
      { lanpaint_mask: "w" },
    );
    // No declared vocabulary: everything stays.
    assert.deepEqual(normalizeSlotParams({ a_slot: "x" }, "unknown"), { a_slot: "x" });
    // Declared key survives the purge.
    assert.deepEqual(normalizeSlotParams({ b_slot: "x" }, "f1"), { b_slot: "x" });
  });

  it("uses the per-form alias table", () => {
    setInputVocabulary({
      slots: ["a_slot", "b_slot"],
      aliases: { input_artifact: "a_slot" },
      form_aliases: { f1: { input_artifact: "b_slot" } },
    });
    assert.deepEqual(normalizeSlotParams({ input_artifact: "v" }, "f1"), { b_slot: "v" });
    assert.deepEqual(normalizeSlotParams({ input_artifact: "v" }, "other"), { a_slot: "v" });
  });
});

describe("file-kind guard", () => {
  it("maps genres onto kinds permissively", () => {
    assert.equal(genreToKind("image"), "image");
    assert.equal(genreToKind("3d"), "glb");
    assert.equal(genreToKind(null), "any");
    assert.equal(genreToKind(undefined), "any");
    assert.equal(genreToKind(""), "any");
    assert.equal(genreToKind("nope"), "any");
    const k: FileKind = genreToKind("video");
    assert.equal(k, "video");
  });

  it("declares image↔mask compatible and everything else strict", () => {
    assert.equal(kindsCompatible("any", "glb"), true);
    assert.equal(kindsCompatible("glb", "any"), true);
    assert.equal(kindsCompatible("audio", "audio"), true);
    assert.equal(kindsCompatible("image", "mask"), true);
    assert.equal(kindsCompatible("mask", "image"), true);
    assert.equal(kindsCompatible("audio", "glb"), false);
    assert.equal(canWireSlot("image", "nope"), true);
    assert.equal(canWireSlot(undefined, "nope"), true);
  });

  it("guards setSlotInput through the served kinds", () => {
    setInputVocabulary({ slot_kinds: { a_slot: "glb" } });
    assert.equal(canWireSlot("3d", "a_slot"), true);
    assert.equal(canWireSlot("audio", "a_slot"), false);
  });
});
