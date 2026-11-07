// mods-schema.spec.ts — THE DECLARED MOD-KIND GATE'S TEETH (hour
// 16). registerCard now runs every declared mod-kind row through
// a strict schemastery master + type-truth predicates. These specs
// prove each law REFUSES; the boot specs (cards-registry, the
// discovery VERBATIM wall) prove the estate's real rows pass.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { validateDeclaredMods } from "../src/mods-schema.ts";
import type { DeclaredModifierKind } from "../src/service.ts";

const base = (over: Record<string, unknown>): DeclaredModifierKind =>
  ({ kind: "t", label: "T", param_key: "t", cardinality: "list", ...over }) as DeclaredModifierKind;

describe("the declared mod-kind schema gate (registerCard's third door)", () => {
  it("a healthy row passes clean (the mask shape)", () => {
    validateDeclaredMods("c", [base({
      category: "standalone",
      fields: [
        { name: "threshold", label: "Threshold", type: "number", default: 0.35, min: 0.05, max: 0.95, step: 0.05 },
        { name: "name", label: "Name", type: "string", default: "sam3" },
        { name: "part", label: "Part", type: "select", default: "face", options: [{ value: "face", label: "Face" }] },
        { name: "classes", label: "Classes", type: "select", default: "person", multi: true, options: [{ value: "person", label: "Person" }, { value: "dog", label: "Dog" }] },
      ],
    })]);
  });

  it("multi rides select fields only (a closed vocabulary's chips face)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "number", default: 1, multi: true }] })]),
      /declares multi on type 'number' — multi is the select chips face only/,
    );
  });

  it("null and array defaults name their JS truth (the type-truth ternaries)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "string", default: null }] })]),
      /its default is null/,
    );
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "string", default: ["a"] }] })]),
      /its default is array/,
    );
  });

  it("a number default on a string field refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "string", default: 42 }] })]),
      /declares type 'string' but its default is number/,
    );
  });

  it("a boolean default on a number field refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "number", default: false }] })]),
      /declares type 'number' but its default is boolean/,
    );
  });

  it("min > max refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "number", default: 1, min: 5, max: 2 }] })]),
      /declares min 5 > max 2/,
    );
  });

  it("a select with no options refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "select", default: "a" }] })]),
      /is a select with no options/,
    );
  });

  it("an unknown wire type refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "float", default: 1 }] })]),
      /not a wire type/,
    );
  });

  it("image/file/text ride the wire; media hints a file seat (the picker law, live lane 2026-10-28)", () => {
    // The presentation types pass clean — an image/file seat is the
    // media square on the leaf, and a media hint narrows its picker.
    validateDeclaredMods("c", [base({
      category: "standalone",
      fields: [
        { name: "still", label: "Still", type: "image", default: "" },
        { name: "clip", label: "Clip", type: "file", media: "video", default: "" },
        { name: "prompt", label: "Prompt", type: "text", default: "" },
      ],
    })]);
    // Type-truth reaches the presentation types: a number default on
    // an image seat refuses exactly as it does on a string seat.
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "still", label: "S", type: "image", default: 1 }] })]),
      /default is number/,
    );
  });

  it("an unknown mod-kind key refuses as drift (the strict resolve)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ feilds: [] })]),
      /unknown key\(s\) feilds/,
    );
  });

  it("a non-positive step refuses loud", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: [{ name: "n", label: "N", type: "number", default: 1, step: 0 }] })]),
      /step must be positive/,
    );
  });

  it("kindFields validate under the same laws (the type-truth reaches both planes)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ kindFields: [{ name: "k", label: "K", type: "boolean", default: "yes" }] })]),
      /declares type 'boolean' but its default is string/,
    );
  });

  it("requires rides the gate (a string pack row passes — the sam2 arm's declaration)", () => {
    validateDeclaredMods("c", [base({ requires: ["comfyui-impact-pack", "comfyui-impact-subpack"] })]);
  });

  // ── THE PRESET LAW (the timeline rework stage 3): a preset chip
  // is a starting cell over the kind's OWN schema. The wire face's
  // own guards live here — the door's teeth on every axis — while
  // the estate's real five cells (h3 edit) prove the serving face
  // in edit-presets.spec.ts. ──
  const presetFields = (): Array<Record<string, unknown>> => [
    { name: "mask_source", label: "Mask source", type: "select", default: "region", options: [{ value: "region", label: "Region" }, { value: "whole-frame", label: "Whole frame" }] },
    { name: "denoise", label: "Denoise", type: "number", default: 0.32, min: 0.05, max: 1, step: 0.01 },
  ];

  it("a preset-carrying kind passes clean, and a bare kind skips the walk (the carrying face admits)", () => {
    // the bare face: the strict resolve FILLS presets:[] (probed
    // live — schemastery default-fills the array), so a bare kind
    // walks zero rows and passes clean
    validateDeclaredMods("c", [base({ fields: presetFields() })]);
    // presets present → the walk's carrying path
    validateDeclaredMods("c", [base({
      fields: presetFields(),
      presets: [{ id: "repair", label: "Repair a region", tooltip: "the fast cell", patch: { mask_source: "region", denoise: 0.32 } }],
    })]);
  });

  it("a preset patching an undeclared key refuses (a preset is never a second vocabulary)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: presetFields(), presets: [{ id: "x", label: "X", patch: { not_a_field: 1 } }] })]),
      /patches 'not_a_field' — not a declared field of this kind/,
    );
  });

  // (F3, the front-end evasion audit 2026-11-07) the merge law's
  // file half was narrated everywhere ("staged files stay") and
  // judged nowhere: a file-seat patch key is type-lawful (image and
  // file are both string wire types) and would clobber the
  // operator's staged file on every seated-bag chip press. The
  // registration door refuses it now — the arm fires on the real
  // validateDeclaredMods door.
  it("a preset patching a staged-file seat refuses (a cell dials the matrix, it never stages files)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({
        fields: [...presetFields(), { name: "mask", label: "Mask", type: "image", default: "" }],
        presets: [{ id: "x", label: "X", patch: { mask: "masks/track-union.png" } }],
      })]),
      /patches 'mask' — a staged-file seat \(type image\): a cell dials the matrix, it never stages files/,
    );
    assert.throws(
      () => validateDeclaredMods("c", [base({
        fields: [...presetFields(), { name: "clip", label: "Clip", type: "file", default: "" }],
        presets: [{ id: "y", label: "Y", patch: { clip: "clips/a.mp4" } }],
      })]),
      /patches 'clip' — a staged-file seat \(type file\)/,
    );
  });

  it("a preset patching an unserved select value refuses (no invented vocabulary)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: presetFields(), presets: [{ id: "x", label: "X", patch: { mask_source: "quantum" } }] })]),
      /patches 'mask_source' to 'quantum' — not a served option/,
    );
  });

  it("a preset patching a mistyped value refuses (the type-truth law reaches the patches)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({ fields: presetFields(), presets: [{ id: "x", label: "X", patch: { denoise: "loud" } }] })]),
      /patches 'denoise' with string — the field declares number/,
    );
  });

  it("a repeated preset id refuses (ids are unique per kind)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({
        fields: presetFields(),
        presets: [
          { id: "same", label: "One", patch: { denoise: 0.3 } },
          { id: "same", label: "Two", patch: { denoise: 0.4 } },
        ],
      })]),
      /preset 'same' is declared twice/,
    );
  });

  it("a patchless preset row refuses loud (the patch-truth law — schemastery default-fills an absent patch to {}, probed live; the walk reads the author's row and refuses the fill)", () => {
    assert.throws(
      () => validateDeclaredMods("c", [base({
        fields: presetFields(),
        presets: [{ id: "x", label: "X" }],
      })]),
      /preset 'x' carries no patch object — a cell that dials nothing is drift/,
    );
    // the null spelling refuses through the same law (the authored
    // witness is null — the patch-truth walk refuses it before any
    // zod fill could mask it)
    assert.throws(
      () => validateDeclaredMods("c", [base({
        fields: presetFields(),
        presets: [{ id: "x", label: "X", patch: null }],
      })]),
      /carries no patch object/,
    );
  });

  it("an empty presets array admits at this door (the discovery guard owns its refusal — a form-spec half-face never serves)", () => {
    // the registration door carries no empty-array law: the row
    // schema-resolves clean and the walk loops zero times. The
    // discovery projection refuses it (discovery-mods-merge.spec,
    // THE PRESET WIRE GUARD) — two doors, two laws, no gap.
    validateDeclaredMods("c", [base({ fields: presetFields(), presets: [] })]);
  });
});
