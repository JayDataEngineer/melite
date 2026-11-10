// @melite/models-h3 — THE EDIT BAG'S DOOR (the timeline rework's
// stage 2b, 2026-11-15). One bag, the whole mask × reference ×
// denoise matrix: this spec fires on the card's OWN compose door
// (def.compose) for the eighth kind — the dial resolution (the
// entry's seats become the matrix seat's dial values and ride the
// emission), the one-door refusals placed BEFORE every sibling
// dispatch branch (the silent-drop class the placement bug almost
// shipped: a refusal after a sibling's return is dead code), and
// the empty-arm film staying byte-clean of the edit vocabulary.
// The matrix seat's own emission laws + band refusals live in
// models/h3 edit-matrix.spec.ts; the skill-leaf censuses live in
// bag-skill-coverage.spec.ts. No @contract marker: package-local
// law, prose header (the registry row owns the door law).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import * as cardMod from "../src/card.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import {
  getModel, registryIds, registryModel,
} from "../../../engines/comfyui-cordis/src/models/models.ts";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = facts.models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (g: GraphBuilder): Record<string, Node> =>
  g.toJSON() as Record<string, Node>;
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);

const EDIT_ENTRY = (): Record<string, unknown> => ({
  source_clip: "clips/take.mp4",
  edit_prompt: "the same hands, five clean fingers, gripping the cup",
  mask_source: "region",
  region_prompt: "hands",
  mask_grow: 24,
  mask_blur: 6,
  detection_threshold: 0.4,
  reference: "self",
  denoise: 0.32,
  keep_audio: true,
});

const EDIT_CLASSES = [
  "MiniMaxH3ChainLoopStart",
  "MiniMaxH3FantasticVideoEditLatent",
  "MiniMaxH3ContexMaskedTarget",
  "MiniMaxH3ChainAssemble",
];

describe("the edit bag's door (stage 2b: one bag, the whole matrix)", () => {
  it("an armed edit bag composes the matrix emission through the card's own compose door", () => {
    const walked = def.schema({ edit: [EDIT_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_door");
    const out = graphOf(g);
    const assemble = ofClass(out, "MiniMaxH3ChainAssemble");
    assert.equal(assemble.length, 1, "one assemble terminal ends the chain");
    assert.equal(assemble[0]![1].inputs.filename, "run_edit_door/edit",
      "the edit emission rides the run tree under its own name");
    for (const cls of EDIT_CLASSES) {
      assert.ok(ofClass(out, cls).length > 0, `the emission composes ${cls}`);
    }
  });

  it("THE DIAL RESOLUTION: the entry's tuning seats ride the emission verbatim", () => {
    const walked = def.schema({ edit: [EDIT_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_dials");
    const out = graphOf(g);
    const track = ofClass(out, "SAM3_VideoTrack");
    assert.equal(track.length, 1, "the region dial composes the per-frame tracker");
    assert.equal(track[0]![1].inputs.detection_threshold, 0.4,
      "detection_threshold flows entry → matrix dial → emission");
    const grow = ofClass(out, "GrowMaskWithBlur");
    assert.equal(grow.length, 1, "the region dial grows the tracked mask");
    assert.equal(grow[0]![1].inputs.expand, 24, "mask_grow flows through the resolution");
    assert.equal(grow[0]![1].inputs.blur_radius, 6, "mask_blur flows through the resolution");
    const sched = ofClass(out, "BasicScheduler");
    assert.equal(sched[0]![1].inputs.denoise, 0.32, "denoise flows through the resolution");
  });

  it("the static-png dial rides the in-graph geometry cure through the door", () => {
    const entry = {
      ...EDIT_ENTRY(), mask_source: "static-png", mask: "masks/union.png",
    };
    const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_png");
    const out = graphOf(g);
    assert.equal(ofClass(out, "ImageScale").length, 1,
      "the staged PNG resizes to the chain geometry through the door (F3-16 defect 1; D-16: core ImageScale — ImageResize is a class no engine owns)");
    assert.equal(ofClass(out, "ImageResize").length, 0,
      "the dead class is gone (D-16: compose-time refusal, after the whole authoring pass)");
    assert.equal(ofClass(out, "SAM3_VideoTrack").length, 0, "no tracker on the static-png dial");
  });

  it("the video dial rides the length-match check through the door (the operator's own mask)", () => {
    const entry = {
      ...EDIT_ENTRY(), mask_source: "video", mask_video: "masks/take_mask.mp4",
      mask_grow: 20, mask_blur: 5,
    };
    const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_vmask");
    const out = graphOf(g);
    const loader = ofClass(out, "VHS_LoadVideo")
      .find(([, n]) => (n.inputs.video as string)?.includes("take_mask.mp4"));
    assert.ok(loader !== undefined, "the mask video loads on its own leaf through the door");
    const check = ofClass(out, "MiniMaxH3ContexLoopMaskLengthCheck");
    assert.equal(check.length, 1, "THE LENGTH-MATCH CHECK composes on the video dial — the mask's frames must equal the clip's, refused loud naming both counts");
    const grow = ofClass(out, "GrowMaskWithBlur");
    assert.equal(grow.length, 1, "the grown/feathered seat rides the video door too");
    assert.equal(grow[0]![1].inputs.expand, 20, "mask_grow flows through the video resolution");
    assert.equal(grow[0]![1].inputs.blur_radius, 5, "mask_blur flows through the video resolution");
    assert.equal(ofClass(out, "SAM3_VideoTrack").length, 0, "no tracker — the mask is the operator's own");
  });

  it("a video entry naming no mask video refuses through the door", () => {
    assert.throws(
      () => {
        const entry = {
          ...EDIT_ENTRY(), mask_source: "video", region_prompt: undefined, mask: undefined,
        };
        const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
        const g = new GraphBuilder();
        def.compose(walked, model, g, "run_edit_vmask_empty");
      },
      /the video mask dial names no media.*length-match the clip/i,
    );
    assert.throws(
      () => {
        const entry = {
          ...EDIT_ENTRY(), mask_source: "video", mask_video: undefined,
          region_prompt: undefined, mask: undefined,
        };
        const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
        const g = new GraphBuilder();
        def.compose(walked, model, g, "run_edit_vmask_unset");
      },
      /the video mask dial names no media.*length-match the clip/i,
    );
  });

  it("the video dial's unstated grow/blur fall to their defaults (16/0)", () => {
    const entry = {
      ...EDIT_ENTRY(), mask_source: "video", mask_video: "masks/take_mask.mp4",
      mask_grow: undefined, mask_blur: undefined,
    };
    const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_vmask_defaults");
    const out = graphOf(g);
    const grow = ofClass(out, "GrowMaskWithBlur");
    assert.equal(grow.length, 1, "the grow seat rides the video door");
    assert.equal(grow[0]![1].inputs.expand, 16, "an unstated grow falls to 16 on the video door");
    assert.equal(grow[0]![1].inputs.blur_radius, 0, "an unstated blur falls to 0");
  });

  it("the still+mannequin dial seats both reference loaders", () => {
    const entry = {
      ...EDIT_ENTRY(), reference: "still+mannequin",
      still: "stills/girl.png", mannequin: "clips/mannequin.mp4",
    };
    const walked = def.schema({ edit: [entry] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_pair");
    const out = graphOf(g);
    const stillImg = ofClass(out, "LoadImage").find(([, n]) => n.inputs.image === "stills/girl.png");
    assert.ok(stillImg !== undefined, "the still seat loads");
    const mannequin = ofClass(out, "VHS_LoadVideo").find(([, n]) => (n.inputs.video as string)?.includes("mannequin.mp4"));
    assert.ok(mannequin !== undefined, "the mannequin seat loads");
  });

  it("ONE DOOR, THE PLACEMENT LAW: edit beside an armed sibling refuses BEFORE the sibling's dispatch", () => {
    // Each sibling pair its own firing arm — and the arms fire
    // through the card's own door, where a refusal placed after
    // the sibling's dispatch branch would be dead code (the silent
    // drop this exact spec pins dead).
    const pairs: Array<[string, Record<string, unknown>]> = [
      ["replace", { replace: [{ source_clip: "clips/take.mp4", still: "stills/a.png", mannequin: "clips/m.mp4", mask: "masks/m.png", swap_prompt: "swap" }] }],
      ["repair", { repair: [{ source_clip: "clips/take.mp4", repair_prompt: "fix", region_prompt: "hands" }] }],
      ["extend", { extend: [{ source_clip: "clips/take.mp4", extend_prompt: "more", extend_seconds: 3 }] }],
      ["refine", { refine: [{ source_clip: "clips/take.mp4", refine_prompt: "sharper" }] }],
      ["upscale", { upscale: [{ source_run: "run_prior" }] }],
    ];
    for (const [name, sibling] of pairs) {
      const walked = def.schema({ edit: [EDIT_ENTRY()], ...sibling }) as Record<string, unknown>;
      assert.throws(
        () => def.compose(walked, model, new GraphBuilder(), "run_edit_race"),
        new RegExp(`Video edit and ${name} are both armed`),
        `edit + ${name} refuses loud naming both doors (BEFORE the ${name} dispatch — never a silent drop)`,
      );
    }
  });

  it("edit beside an armed reshoot refuses (the reshoot is not a sibling dispatch — it is the film arm)", () => {
    const walked = def.schema({
      edit: [EDIT_ENTRY()],
      reshoot: [{ source_clip: "sources/take3.mp4" }],
    }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_edit_reshoot"),
      /Video edit and Reshoot are both armed/,
    );
  });

  it("leaves the film byte-clean of the edit vocabulary with the arm empty", () => {
    const walked = def.schema({}) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_empty");
    const out = graphOf(g);
    for (const cls of EDIT_CLASSES) {
      assert.equal(ofClass(out, cls).length, 0, `the empty-arm film composes no ${cls} (the edit vocabulary never leaks into a film graph)`);
    }
    assert.ok(ofClass(out, "SaveVideo").length > 0, "the empty-arm film still delivers its SaveVideo");
  });

  it("the matrix seat's own refusals surface through the door (the boil, the empty prompt)", () => {
    const boil = def.schema({
      edit: [{ ...EDIT_ENTRY(), mask_source: "whole-frame", reference: "self", denoise: 0.9 }],
    }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(boil, model, new GraphBuilder(), "run_edit_boil"),
      /identity boil/,
      "the door surfaces the matrix seat's safety law — never a silent compose",
    );
    const noPrompt = def.schema({
      edit: [{ ...EDIT_ENTRY(), edit_prompt: "" }],
    }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(noPrompt, model, new GraphBuilder(), "run_edit_noprompt"),
      /edit_prompt.*names no action/,
    );
  });

  it("THE UNSTATED SEATS FALL TO THEIR DEFAULTS (mask_source region, self, 16/0/0.5)", () => {
    const { mask_source, reference, mask_grow, mask_blur, detection_threshold, ...bare } = EDIT_ENTRY();
    assert.ok(
      mask_source !== undefined && reference !== undefined
        && mask_grow !== undefined && mask_blur !== undefined && detection_threshold !== undefined,
      "the arm stages its premise honestly: the factory seats every dial the entry then drops",
    );
    const walked = def.schema({ edit: [bare] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_defaults");
    const out = graphOf(g);
    const track = ofClass(out, "SAM3_VideoTrack");
    assert.equal(track.length, 1, "the unstated mask_source falls to region — the tracker composes");
    assert.equal(track[0]![1].inputs.detection_threshold, 0.5,
      "the unstated detection_threshold falls to 0.5");
    const grow = ofClass(out, "GrowMaskWithBlur");
    assert.equal(grow.length, 1, "the region dial grows the tracked mask");
    assert.equal(grow[0]![1].inputs.expand, 16, "the unstated mask_grow falls to 16");
    assert.equal(grow[0]![1].inputs.blur_radius, 0, "the unstated mask_blur falls to 0");
    assert.equal(ofClass(out, "ImageToMask").length, 0,
      "the default is region, never the static PNG — no red-channel conversion");
  });

  it("an entry naming no region refuses through the door (the empty dial surfaces)", () => {
    const { region_prompt, mask_grow, mask_blur, detection_threshold, ...noTarget } = EDIT_ENTRY();
    assert.ok(region_prompt !== undefined, "the arm stages its premise honestly: the factory names a target the entry then drops");
    const walked = def.schema({ edit: [noTarget] }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_edit_notarget"),
      /the region mask dial names no target/,
      "the door surfaces the matrix seat's empty-dial law — defaults never invent the detection target",
    );
  });

  it("a static-png entry naming no image refuses through the door", () => {
    const walked = def.schema({
      edit: [{ ...EDIT_ENTRY(), mask_source: "static-png", region_prompt: undefined, mask: undefined }],
    }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_edit_noimage"),
      /the static-png mask dial names no image/,
      "the door surfaces the matrix seat's imageless-PNG law",
    );
  });

  it("a still+mannequin entry missing the still refuses through the door", () => {
    const walked = def.schema({
      edit: [{
        ...EDIT_ENTRY(), reference: "still+mannequin",
        still: undefined, mannequin: "mannequins/pose.png",
      }],
    }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_edit_nostill"),
      /the still\+mannequin reference dial needs both seats bound/,
      "the door surfaces the matrix seat's half-pair law (still missing)",
    );
  });

  it("a still+mannequin entry missing the mannequin refuses through the door", () => {
    const walked = def.schema({
      edit: [{
        ...EDIT_ENTRY(), reference: "still+mannequin",
        still: "stills/face.png", mannequin: undefined,
      }],
    }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_edit_nomann"),
      /the still\+mannequin reference dial needs both seats bound/,
      "the door surfaces the matrix seat's half-pair law (mannequin missing)",
    );
  });

  it("an explicitly empty edit bag composes the clean film (the dispatch checks length)", () => {
    const walked = def.schema({ edit: [] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_edit_emptybag");
    const out = graphOf(g);
    for (const cls of EDIT_CLASSES) {
      assert.equal(ofClass(out, cls).length, 0, `the [] film composes no ${cls}`);
    }
    assert.ok(ofClass(out, "SaveVideo").length > 0, "the [] film still delivers its SaveVideo");
  });
});

const editFields = (): Array<{ name?: string; tooltip?: string }> => {
  const mod = (cardMod as unknown as { EDIT_MOD?: { fields?: Array<{ name?: string; tooltip?: string }> } }).EDIT_MOD;
  return mod?.fields ?? [];
};
describe("THE DEFECT-BOARD DOC PASS (D-10 + D-12, 2026-11-16: 'the bundle names the fields and their presence, not their units' / 'the single most useful v2v door for wardrobe work — discoverable only by pressing it')", () => {
  it("D-10 THE UNITS ARE STATED: mask_grow and mask_blur name their geometry (px at the EDIT tier) and the transfer rule", () => {
    const fields = editFields();
    const grow = fields.find((f) => f.name === "mask_grow");
    const blur = fields.find((f) => f.name === "mask_blur");
    if (grow?.tooltip === undefined || blur?.tooltip === undefined) throw new Error("mask_grow/mask_blur rows not found");
    for (const t of [grow.tooltip, blur.tooltip]) {
      if (!/UNITS .*px at the EDIT geometry — the plan's resolution tier/.test(t)) {
        throw new Error("units clause missing: " + t.slice(0, 80));
      }
      if (!/never the latent and never the output upscale|applied after the grow/.test(t)) {
        throw new Error("the geometry discrimination is missing");
      }
    }
    if (!/px-per-short-side/.test(grow.tooltip)) throw new Error("the transfer rule is missing from mask_grow");
  });

  it("D-12 THE QUOTABLE LINE: region_prompt's tooltip states the text-conditioned door — no reference image unless a specific person or mark", () => {
    const fields = editFields();
    const region = fields.find((f) => f.name === "region_prompt");
    if (region?.tooltip === undefined) throw new Error("region_prompt row not found");
    if (!/region_prompt selects the region by text; the edit prompt redraws inside it; no reference image is required unless the new content must be a specific person or a specific mark/.test(region.tooltip)) {
      throw new Error("the board's quotable line is not verbatim on the tooltip");
    }
  });
});

describe("THE SWAP-POSTURE TRUTH (defect board D-13 + D-14 + D-15, 2026-11-18: 'an identity swap silently does NOT happen below near-full noise' / 'the identity anchors are documented as unusable, and they are the door that works' / 'the anchors skill never says the still must share the video's medium')", () => {
  const chipTooltips = (): Array<{ id?: string; tooltip?: string }> => {
    const mod = (cardMod as unknown as { EDIT_MOD?: { sections?: Array<{ id?: string; tooltip?: string }> } }).EDIT_MOD;
    return mod?.sections ?? [];
  };
  const skillMd = (leaf: string): string =>
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), `../src/agents/skills/${leaf}/SKILL.md`), "utf8");

  it("D-13 THE RECAST LAW: the swap chip's denoise advice states the measured band — a DIFFERENT person needs near-full noise; 0.55 keeps identity (the unqualified advice is gone)", () => {
    const chip = chipTooltips().find((s) => s.id === "identity-swap");
    if (chip?.tooltip === undefined) throw new Error("identity-swap section not found");
    if (!/swap of a DIFFERENT person needs near-full noise/.test(chip.tooltip)) {
      throw new Error("the recast clause is missing from the chip tooltip");
    }
    if (!/measured: 0\.5 = none, 1\.0 = full/.test(chip.tooltip)) {
      throw new Error("the measured band is missing from the chip tooltip");
    }
    if (!/0\.55 keeps the source'?s motion by keeping its identity/.test(chip.tooltip)) {
      throw new Error("the 0.55 truth is missing from the chip tooltip");
    }
    if (/push toward 0\.55 to keep source motion riding through/.test(chip.tooltip)) {
      throw new Error("the board's misleading unqualified advice is still on the chip");
    }
  });

  it("D-13 THE SKILL SEAT: the edit skill's identity-swap cell carries the same measured recast law", () => {
    const md = skillMd("edit");
    if (!/swap of a\s+DIFFERENT person needs near-full noise/.test(md)) {
      throw new Error("the recast clause is missing from the edit skill");
    }
    if (!/measured: 0\.5 = none,\s+1\.0 = full/.test(md)) {
      throw new Error("the measured band is missing from the edit skill");
    }
    if (/push denoise toward 0\.55 to\s+keep source motion riding through/.test(md)) {
      throw new Error("the board's misleading unqualified advice is still in the edit skill");
    }
  });

  it("D-14 THE MOTION CARRIER: every mannequin seat states any-video-bind + the source clip itself — the track-run requirement is gone (decl, chip, edit skill, swap skill)", () => {
    const fields = editFields();
    const reference = fields.find((f) => f.name === "reference");
    const mannequin = fields.find((f) => f.name === "mannequin");
    if (reference?.tooltip === undefined || mannequin?.tooltip === undefined) {
      throw new Error("reference/mannequin rows not found");
    }
    const chip = chipTooltips().find((s) => s.id === "identity-swap");
    if (chip?.tooltip === undefined) throw new Error("identity-swap section not found");
    for (const [seat, t] of [["reference", reference.tooltip], ["mannequin", mannequin.tooltip], ["chip", chip.tooltip], ["edit skill", skillMd("edit")], ["swap skill", skillMd("swap")]] as const) {
      if (!/any video clip may\s+be bound/.test(t)) {
        throw new Error(`the any-video law is missing from the ${seat} seat`);
      }
      if (!/the source clip itself is a\s+valid\s+mannequin/.test(t)) {
        throw new Error(`the source-as-mannequin law is missing from the ${seat} seat`);
      }
    }
    if (/the track run'?s mannequin video/.test(reference.tooltip)) {
      throw new Error("the reference tooltip still names the track run as the mannequin's source");
    }
    if (/The mannequin video from the track-card run/.test(mannequin.tooltip)) {
      throw new Error("the mannequin tooltip still requires the track-card run");
    }
  });

  it("D-12 THE SKILL MIRROR: the edit skill's region bullet carries the board's quotable text-conditioned door line verbatim (the served doc, not only the tooltip)", () => {
    const md = skillMd("edit");
    if (!/`region_prompt` selects the region by\s+text; the edit prompt redraws inside it; no\s+reference image is\s+required unless the new content must be a specific person or a\s+specific mark/.test(md)) {
      throw new Error("the board's quotable line is not verbatim in the edit skill's region bullet");
    }
  });

  it("D-15 THE MEDIUM + THE ENUM: the still states the medium law; the reference tooltip enumerates its values", () => {
    const fields = editFields();
    const still = fields.find((f) => f.name === "still");
    const reference = fields.find((f) => f.name === "reference");
    if (still?.tooltip === undefined || reference?.tooltip === undefined) {
      throw new Error("still/reference rows not found");
    }
    if (!/should be photoreal when the source is photoreal/.test(still.tooltip)) {
      throw new Error("the medium law is missing from the still tooltip");
    }
    if (!/transfers garments and colour, not identity/.test(still.tooltip)) {
      throw new Error("the stylized-still truth is missing from the still tooltip");
    }
    if (!/the enum is self \| still\+mannequin/.test(reference.tooltip)) {
      throw new Error("the reference tooltip does not enumerate its values");
    }
    if (!/should be photoreal when the source\s+is photoreal/.test(skillMd("edit"))) {
      throw new Error("the medium law is missing from the edit skill's anchor bullet");
    }
  });
});
