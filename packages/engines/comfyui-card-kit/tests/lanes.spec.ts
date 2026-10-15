// @melite/comfyui-card-kit — the lanes' own arms (TEST-2 breadth,
// 2026-09-12). The card specs drive each lane through its compose
// door; THIS file owns the arms the cards' happy paths do not reach
// (the mask lane's proposal/export/union arms, the four tagger
// dispatches, the input-prep row gates, the mesh admission throws,
// the finalize strips). The lane IS the unit here — direct calls,
// GraphBuilder truth.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it, beforeAll } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { GraphBuilder } from "../src/graph.ts";
import {
  finalizeImageEdit, finalizeTagger, finalizeMask,
  type StripTable,
  refuseImageEditFiring, finalizeAnny, finalizeMotion,
  qvoiceUse,
} from "../src/kit.ts";
import { loadFacts } from "../src/facts.ts";
import { deriveDefaults } from "../src/graph.ts";
import { vocabulary } from "../src/vocab.ts";
import {

  getModel, registryIds, registryModel,
} from "../../comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

const dump = (g: GraphBuilder): Record<string, { class_type: string; inputs: Record<string, unknown> }> =>
  g.toJSON() as never;
const classes = (row: Record<string, { class_type: string }>): string[] =>
  Object.values(row).map((n) => n.class_type);

beforeAll(() => { assert.ok(Object.keys(facts.models).length > 0, "the facts file serves"); });

// ── the mask lane (RT-DETR proposals, exports, unions, manifests) ──
const MASK_PINS = { checkpoint: "sam3_pin.pth", unet: "rtdetr_pin.pth", sam2: "sam2_pin.pt", segm: "segm/person_pin.pt", face: "bbox/face_pin.pt", hand: "bbox/hand_pin.pt" };
const maskBase = {
  input_image: "/m/p.png", sam_threshold: 0.93, sam_dilation: 0,
  export_boxes: false, primary_via_rtdetr: false,
};


// ── the tagger dispatch (four arms + the no-arm refusal) ──────────
// THE TAGGER LANE IS FAMILY-OWNED (the kit-arm retirement, 2026-09-30):
// the four tagger families compose their own arms in their declared
// actions, each pinned to a committed golden (packages/models/*/tests/
// golden/). The dispatch and its four arm bodies are deleted with the
// spec that owned them; the per-family laws (the node, the rail-stamped
// checkpoint, the wired spell, the file loader, the blank/non-string
// refusals) live in each family's own action spec.

// THE UPSCALE LANE IS FAMILY-OWNED (the kit-arm retirement,
// 2026-09-30): the seedvr2-ema family composes its own upscale arm
// in its declared action, pinned to committed goldens
// (packages/models/seedvr2-ema/tests/golden/) — the spelled anchor,
// the explicit seed, the re-stated resolution caps and the GATE S
// mint all live in that family's action spec now.
// ── the input-prep row gates ──────────────────────────────────────
// THE INPUT-PREP LANE IS FAMILY-OWNED (the kit-arm retirement,
// 2026-09-30): the input family composes its own restage lane,
// pinned to committed goldens (packages/models/input/tests/
// golden/) — the audio restage, the crop row, the scale row and
// their refusal voices all live in that family's action spec now.

// ── the finalize strips (autofill removal) ────────────────────────
describe("the finalize strips", () => {
  it("stripAutofill/stripEmptyAutofill drop the pinned keys", () => {
    const g = {
      A: { class_type: "CLIPLoader", inputs: { device: "cpu", clip_name: "x" } },
      B: { class_type: "LoadImage", inputs: { upload: "", image: "y" } },
      C: { class_type: "KSampler", inputs: { control_after_generate: "fixed", seed: 1 } },
    } as never;
    const out = finalizeImageEdit(g);
    assert.ok(!("device" in out.A.inputs), "stripAutofill drops the pinned key");
    assert.ok("upload" in out.B.inputs, "the edit strip's LoadImage row is EMPTY — nothing dropped");
    assert.ok(!("control_after_generate" in out.C.inputs));

    // the tagger strip DOES list upload for LoadImage
    const empty = { D: { class_type: "LoadImage", inputs: { upload: "", image: "z" } } } as never;
    const out2 = finalizeTagger(empty);
    assert.ok(!("upload" in out2.D.inputs), "the tagger strip drops the empty upload");

  });

  it("finalizeMask strips ONLY the autofilled quarter-hint (the red-box hunt)", () => {
    const g = {
      A: { class_type: "SAM3_Detect", inputs: { threshold: 0.5, bboxes: { x: 0, y: 0, width: 512, height: 512 } } },
      B: { class_type: "SAM3_Detect", inputs: { threshold: 0.5, bboxes: { x: 8, y: 9, width: 64, height: 64 } } },
      C: { class_type: "SAM3_Detect", inputs: { threshold: 0.5, bboxes: ["RTDETR_detect.0", 0] } },
      D: { class_type: "SAM3_Detect", inputs: { threshold: 0.5 } },
      E: { class_type: "KSampler", inputs: { seed: 1 } },
    } as never;
    const out = finalizeMask(g);
    assert.ok(!("bboxes" in out.A.inputs), "the default-equal quarter-hint dies — the whole image is the search");
    assert.deepEqual(out.B.inputs.bboxes, { x: 8, y: 9, width: 64, height: 64 }, "a drawn Region quad survives");
    assert.deepEqual(out.C.inputs.bboxes, ["RTDETR_detect.0", 0], "RT-DETR's own boxes (a link) survive");
    assert.ok(!("bboxes" in out.D.inputs), "an already-hintless detect is untouched");
    assert.equal(out.E.inputs.seed, 1, "non-SAM3 nodes are untouched");
  });
});

// ── the small exported helpers ────────────────────────────────────
// THE 3D LANE ARMS ARE FAMILY-OWNED (the kit-arm retirement, 2026-09-30):
// annyLane, motionLane and quadRemeshLane are deleted with the spec
// blocks that owned them. The anny turnaround sheet, the kimodo motion
// chain and the AutoRemesher lane are composed by their own families'
// declared actions, each pinned to committed goldens
// (packages/models/{anny,kimodo,autoremesher}/tests/golden/) — the
// body-handle composition, the spell arm, the empty-pin reads and the
// refusal voices all live in those families' action specs now.

// ── the mesh-lift admission throws + the rig arm ──────────────────
// THE MESH LIFT AND THE RIG COPY ARE FAMILY-OWNED (the kit-arm
// retirement, 2026-09-30 — closed by the card-system stroke): the
// mesh lift lives in the trellis2-native and pixal3d families (their
// own admission slices, their own lanes, their own goldens) and the
// rig copy in the transfer-rig family. Their closed-set
// VOCABularies (MESH_RESOLUTIONS, MESH_BG_MODES, …) stay — the
// img-to-mesh card declares its schema knobs from them.

// ── kit helpers (the ideogram lane + finalize retired with the card) ──
describe("kit helpers (strip/defaults — the ideogram lane retired with its card)", () => {
  it("stripEmptyAutofill drops empties and keeps the rest (both ==='' arms)", () => {
    // finalizeMotion is the stripEmptyAutofill face WITH entries
    // (MOTION_STRIP — ANNY_STRIP; the fit/skin strips
    // retired stroke 87 with their cards).
    const out = finalizeMotion({
      M: { class_type: "KimodoTextToPose", inputs: { prev_motion_npz: "", motion_prompts: "a walk" } },
      N: { class_type: "LoadImage", inputs: { image: "kept.png" } },
    } as never);
    assert.ok(!("prev_motion_npz" in out.M.inputs), "the empty string drops");
    assert.equal(out.M.inputs.motion_prompts, "a walk", "a non-empty value stays");
    assert.equal(out.N.inputs.image, "kept.png", "classes outside the table ride untouched");
  });



  it("deriveDefaults walks a spec with NO required section", () => {
    const out = deriveDefaults({ OptionalOnly: { input: { optional: { pad: ["INT", { default: 3 }] } } } });
    assert.deepEqual(out.OptionalOnly, { pad: 3 });
  });

  it("deriveDefaults walks missing and input-less specs (the ?? {} arms)", () => {
    const out = deriveDefaults({ Ghost: null, Bare: {} });
    assert.equal(out.Ghost, undefined, "a null spec emits no row");
    assert.equal(out.Bare, undefined, "an input-less spec emits no row");
  });

});

// ── graph.ts deriveDefaults (the object_info walker's arms) ───────
describe("deriveDefaults (the autofill derivation)", () => {
  it("optional-absent and non-array spec tails walk clean", () => {
    const out = deriveDefaults({
      OnlyRequired: { input: { required: { seed: ["INT", { default: 7 }] } } },
      NonArray: { input: { required: { plain: "STRING" } } },
      WithOptional: { input: { optional: { pad: ["INT", { default: 0 }] } } },
    });
    assert.deepEqual(out.OnlyRequired, { seed: 7 });
    assert.equal(out.NonArray, undefined, "a class with no carried defaults emits NO row");
    assert.deepEqual(out.WithOptional, { pad: 0 });
  });
});

// ── the residual lane arms (fit/quad/music/edit) ─────────────────
// THE RESIDUAL LANE ARMS ARE FAMILY-OWNED (the kit-arm retirement,
// 2026-09-30): every arm that lived here is deleted with the spec
// blocks that owned them — the image-edit lane (its laws moved to
// packages/models/qwen-img-edit-21/tests/lane-laws.spec.ts), the
// quad-remesh, music, yue2, anny and tagger lanes, and the
// input-prep restage. Each family pins its wire to committed
// goldens; this file keeps what is genuinely kit: the finalize
// strips, the mesh-lift admissions, the rig copy and the helpers.

// ── the lanpaint merge arms (kit.ts 171/260/266/268/272) ─────────
// The card spec drives the happy region arm through the compose
// door; THESE arms own the merge-law branches the door never
// reaches (kit-direct, hand-rolled params — no schema defaults to
// hide behind).
describe("the lanpaint merge arms (the bag/flat law)", () => {
  const editModel = (): import("../src/facts.ts").ModelFacts => facts.models["qwen-img-edit-2511"]!;

  it("a region-less single-entry bag states nothing (the ?? '' arm)", () => {
    // bagN === 1 but the entry carries no input_mask — bagMask falls
    // back to '' (kit.ts:171), so no region is stated and the gate
    // passes the run through to the plain-edit lane.
    assert.doesNotThrow(
      () => refuseImageEditFiring({ mask: [{ mask_grow: 4 }] }),
      "a single bag entry without input_mask states no region — the gate passes",
    );
  });

  it("a non-object single-entry bag states nothing (the typeof arm)", () => {
    assert.doesNotThrow(
      () => refuseImageEditFiring({ mask: ["/m/stray.png"] }),
      "a single string entry is not a region row — the gate passes",
    );
    assert.doesNotThrow(
      () => refuseImageEditFiring({ mask: [null] }),
      "a single null entry is not a region row — the gate passes",
    );
  });

  it("the gate merges the same row (flat wins, bag fills the rest)", () => {
    assert.doesNotThrow(
      () => refuseImageEditFiring({ input_mask: "/m/flat.png", mask: [{ input_mask: "/m/bag.png" }] }),
      "flat region + single bag entry passes the gate — the flat key wins the merge",
    );
  });



});

// ── the vocabulary law ────────────────────────────────────────────
describe("vocabulary (the one-row law)", () => {
  it("an empty closed set refuses (not a type)", () => {
    assert.throws(() => vocabulary([]), /a closed set with no members is not a type/);
  });
});

// ── the stroke-78 arm sweep (coverage: every new loud arm fires) ──


// ── THE QVOICE READER (a kit helper) ──────────
// every family's action reads its qvoice through qvoiceUse: the
// media-shape normalization and the refusal voices below are the
// one contract the actions inherit.
describe("the qvoice reader (a kit helper)", () => {
  it("normalizes every admitted qvoice media shape", () => {
    assert.deepEqual(qvoiceUse({ qvoice: "flat.qvoice", voice_strength: "1.25" }), { path: "flat.qvoice", strength: 1.25 });
    assert.deepEqual(qvoiceUse({ qvoice: [{ qvoice: "bag.qvoice", voice_strength: "0.5" }] }), { path: "bag.qvoice", strength: 0.5 });
    assert.deepEqual(qvoiceUse({ qvoice: { item: { qvoice: "wrapped.qvoice", voice_strength: 2 } } }), { path: "wrapped.qvoice", strength: 2 });
    assert.deepEqual(qvoiceUse({ qvoice: { item: [{ qvoice: "wrapped-array.qvoice" }] } }), { path: "wrapped-array.qvoice", strength: undefined });
    assert.equal(qvoiceUse({ qvoice: [] }), undefined);
    assert.equal(qvoiceUse({ qvoice: { item: [] } }), undefined);
    assert.equal(qvoiceUse({ qvoice: "  " }), undefined);
    assert.equal(qvoiceUse({ qvoice: { qvoice: "  " } }), undefined);
    assert.throws(() => qvoiceUse({ qvoice: "bad.qvoice", voice_strength: "not-a-number" }), /voice_strength/);
    assert.throws(() => qvoiceUse({ qvoice: "bad.qvoice", voice_strength: 3 }), /voice_strength/);
    assert.throws(() => qvoiceUse({ qvoice: [{ qvoice: "a" }, { qvoice: "b" }] }), /one media entry/);
    assert.throws(() => qvoiceUse({ qvoice: 7 }), /path or one-entry/);
    assert.throws(() => qvoiceUse({ qvoice: { item: 7 } }), /path or one-entry/);
  });

  it("an unusable qvoice bag entry refuses before graph construction (the gate itself — the lane is gone)", () => {
    // The refusal was observed THROUGH the lane: a bag entry that is not a
    // string path refuses before any node renders. With the lane retired the
    // gate is the reader's own — qvoiceUse refuses the same entry, and every
    // family's action reads its qvoice through it.
    assert.throws(() => qvoiceUse({ qvoice: { voice_strength: "0.5" } }), /qvoice bag entry requires a string qvoice path/);
    assert.throws(() => qvoiceUse({ qvoice: { qvoice: 7 } }), /qvoice bag entry requires a string qvoice path/);
    assert.throws(() => qvoiceUse({ qvoice: 7 }), /qvoice must be a path or one-entry qvoice bag/);
  });
});
