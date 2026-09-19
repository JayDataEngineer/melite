// @melite/video-h3-timeline — THE INPUT SURFACE (the operator's law,
// 2026-09-20: the H3 architecture truth — FL2VA anchors vs Ref2VA
// conditioning, two different mechanics, one progressive rail).
// The schema OWNS the wire form (typed arrays, door-enforced);
// compose shelves them onto the 9-slot image bus (anchor 1,
// last_frame 2, refs 3..9) and cuts the audio bed per window.
// Every arm below refuses loud or composes provably — never silent.
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-cordis/service";
import { fieldsOfEnvelope } from "@melite/card-base";
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

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});

type GNode = { class_type: string; inputs: Record<string, unknown> };
const graphOf = (params: Record<string, unknown>, runId: string): Record<string, GNode> => {
  const g = new GraphBuilder();
  def.compose(def.schema(params), model, g, runId);
  return g.toJSON() as Record<string, GNode>;
};
/** trace a bundle slot to the LoadImage feeding it: [loaderId, 0] */
const loaderFor = (out: Record<string, GNode>, bundleId: string, slot: string): string | null => {
  const link = (out[bundleId]?.inputs[slot] ?? null) as [string, number] | null;
  if (!Array.isArray(link)) return null;
  const node = out[link[0]];
  if (node?.class_type !== "LoadImage" && node?.class_type !== "UnifiedResizeImageMask") return null;
  // the resizer wraps the loader — unwrap one level to the image path
  if (node.class_type === "UnifiedResizeImageMask") {
    const inner = node.inputs["image"] as [string, number] | null;
    if (!Array.isArray(inner)) return null;
    const loader = out[inner[0]];
    return loader?.class_type === "LoadImage" ? String(loader.inputs["image"]) : null;
  }
  return String(node.inputs["image"]);
};
const bundleIn = (out: Record<string, GNode>): string => {
  const id = Object.keys(out).find((k) => out[k].class_type === "PlagueKindBundleIn");
  assert.ok(id, "the r2v lane builds the bundle");
  return id;
};

describe("the input surface: the schema owns the wire form", () => {
  it("refuses a non-string entry LOUD (never a silent shape)", () => {
    assert.throws(
      () => def.schema({ ref_images: ["/m/a.png", 42] }),
      /ref_images/,
      "a number in the image stack refuses naming the field",
    );
  });

  it("refuses over-cap stacks at the door (the bus caps, not the graph)", () => {
    const eight = Array.from({ length: 8 }, (_, i) => `/m/r${i}.png`);
    assert.throws(() => def.schema({ ref_images: [...eight, "/m/r8.png"] }), /ref_images/);
    assert.throws(
      () => def.schema({ ref_videos: ["/m/v0.mp4", "/m/v1.mp4", "/m/v2.mp4", "/m/v3.mp4"] }),
      /ref_videos/,
    );
    assert.throws(
      () => def.schema({ ref_audios: ["/m/a0.wav", "/m/a1.wav", "/m/a2.wav", "/m/a3.wav"] }),
      /ref_audios/,
    );
  });

  it("refuses a negative bed start (time never runs backward)", () => {
    assert.throws(() => def.schema({ bed_start: -1 }), /bed_start/);
  });

  it("accepts the full declared surface; the bed starts at 0 by default", () => {
    const walked = def.schema({
      last_frame: "/m/end.png",
      ref_images: ["/m/a.png", "/m/b.png"],
      ref_videos: ["/m/v.mp4"],
      ref_audios: ["/m/s.wav"],
      bed_audio: "/m/bed.wav",
    }) as Record<string, unknown>;
    assert.equal(walked.bed_start, 0, "the walk fills the bed origin");
    assert.deepEqual(walked.ref_images, ["/m/a.png", "/m/b.png"], "arrays ride verbatim");
  });
});

describe("the input surface: EVERY slot declares its slot shape (the freeform-text lie, 2026-09-21)", () => {
  // THE PROJECTION WALL (the operator's catch: "THESE ARE FREEFORM
  // TEXT FIELDS. YOU SAID EVERY LAST PARAMETER WAS VALIDATED BY THE
  // SCHEMA SETUP"): the served envelope's own projection — the same
  // walk the client runs — types every slot field by its DECLARED
  // wtype. An undeclared string field derives 'text' and renders a
  // freeform box: the 2026-09-21 lie was image/last_frame riding
  // bare .role('path') with no wtype. This wall walks the REAL
  // carrier's toJSON (the envelope formSchemas serves) and pins the
  // projection: slot fields are 'image'/'file', stacks are
  // 'image_list' — the only legal text field is the prompt itself.
  const typeOf = (name: string): string | undefined =>
    fieldsOfEnvelope(
      ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON() as never,
    ).find((f) => f.name === name)?.type;

  it("the FL2VA pixel anchors project as IMAGE rail rows, never text boxes", () => {
    assert.equal(typeOf("image"), "image", "First frame is a slot");
    assert.equal(typeOf("last_frame"), "image", "Last frame is a slot");
  });

  it("VALIDATION-ONLY KEYS NEVER PROJECT — the renderer vocabulary, the legacy aliases, and the renderer spelling are gate keys, not surface fields (the blank-rows catch, 2026-09-21)", () => {
    // "WHAT IS WINDOW INDEX, WHY IS IT BLANK" — k + noise_seed are
    // declared DELIBERATELY default-less (the renderer's ?? chains
    // stay authoritative; the walk refuses garbage only). Rendered,
    // they were blank rows. The hidden arm (extra.hidden) keeps the
    // schema enforcement and kills the face row. The aliases
    // (interp/sharpen/sla switches) are the mods' switches' old
    // spellings; image_name is the renderer's guide-image key — the
    // rail's First frame is the user face.
    const names = fieldsOfEnvelope(
      ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON() as never,
    ).map((f) => f.name);
    for (const gone of ["k", "noise_seed", "interp_switch", "sharpen_switch", "sla_switch", "image_name"]) {
      assert.ok(!names.includes(gone), `${gone} is validation-only — a rendered ${gone} row is a lie`);
    }
  });

  it("the conditioning bus + bed project at their declared slot shapes", () => {
    assert.equal(typeOf("ref_images"), "image_list");
    assert.equal(typeOf("ref_videos"), "image_list");
    assert.equal(typeOf("ref_audios"), "image_list");
    assert.equal(typeOf("bed_audio"), "file");
  });

  it("the refine lora pick is a CATALOG-FED SELECT — the freeform lora id is dead (LORAS ARE ONLY MODS)", () => {
    const ff = fieldsOfEnvelope(
      ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON() as never,
    ).find((f) => f.name === "refine_lora")!;
    assert.equal(ff.type, "select", "the pick serves as a select");
    // the OPTIONS ride the door's runtime stamp (optionsFrom), never
    // a closed schema list — the wall pins the declaration, the
    // discovery stamp wall pins the serve
    assert.ok((ff.tooltip ?? "").includes("LORAS ARE ONLY MODS"));
  });

  it("the only card-owned TEXT fields are the prompt and the two mod-zone stragglers — a new one is a freeform lie", () => {
    // sr_model + sla_dense_steps are declared for the WALK (compose
    // parses them off the card schema) but render ONLY in the mod
    // zone — the client strips them from params via modOwnedFields.
    // Any FOURTH text projection is a live freeform field on the
    // params face and must be refused here. The prompt itself is a
    // TEXTAREA (full-row by the textarea law) — never a bare text box.
    const fields = fieldsOfEnvelope(
      ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON() as never,
    );
    assert.equal(fields.find((f) => f.name === "prompt")?.type, "textarea");
    const textFields = fields.filter((f) => f.type === "text").map((f) => f.name);
    assert.deepEqual(textFields, ["sr_model", "sla_dense_steps"]);
    // THE GRID LAW (2026-09-21, "WHY IS WIDTH AND HEIGHT ON
    // DIFFERENT VERTICAL ROWS?"): the General group declares its
    // grid — Bed start + Seed share a row, Width + Height share a
    // row, Frames rides the grid. A stacked General face is the
    // 1:1 lie the operator caught (the component was CardForm; the
    // DECLARATIONS never carried the grid).
    for (const gridded of ["bed_start", "seed", "width", "height", "length"]) {
      assert.equal(fields.find((f) => f.name === gridded)?.columns, 2, `${gridded} declares the 2-col grid`);
    }
    // THE STAR IS DEAD (2026-09-21): the film-level prompt was
    // `required` while compose treated it as a per-call fallback —
    // decoration on a lie. The call owns the text; a textless call
    // refuses at compose. The prompt is the single-window shape's
    // text face — never required.
    const promptField = fields.find((f) => f.name === "prompt")!;
    assert.notEqual(promptField.required, true, "the film-level prompt is never a required field");
  });
});

describe("the input surface: variant derivation owns the lane first", () => {
  it("card-level refs imply t4r (no per-call guide needed)", () => {
    assert.equal(def.schema({ ref_images: ["/m/a.png"] }).variant, "t4r");
    assert.equal(def.schema({ ref_videos: ["/m/v.mp4"] }).variant, "t4r");
    assert.equal(def.schema({ ref_audios: ["/m/s.wav"] }).variant, "t4r");
  });

  it("an end anchor alone implies t4r (it is an r2v input)", () => {
    assert.equal(def.schema({ last_frame: "/m/end.png" }).variant, "t4r");
  });

  it("the bed alone implies t4r (it rides the r2v audio lane)", () => {
    assert.equal(def.schema({ bed_audio: "/m/bed.wav" }).variant, "t4r");
  });

  it("empty strings imply nothing (whitespace is absent, never a lane)", () => {
    assert.equal(def.schema({ last_frame: "  ", bed_audio: "" }).variant, "t4_open");
  });
});

describe("the input surface: the 9-slot bus shelves the FL2VA pair first", () => {
  it("last_frame lands input_2; refs re-shelve to input_3 (anchor stays input_1)", () => {
    const out = graphOf({
      image: "/m/first.png",
      last_frame: "/m/end.png",
      ref_images: ["/m/a.png", "/m/b.png"],
      calls: [SHOT({ ref_image: "/m/first.png" })],
    }, "run_pair");
    const b = bundleIn(out);
    assert.equal(loaderFor(out, b, "input_1"), "/m/first.png", "the anchor holds input 1");
    assert.equal(loaderFor(out, b, "input_2"), "/m/end.png", "the end anchor holds input 2");
    assert.equal(loaderFor(out, b, "input_3"), "/m/a.png", "refs re-shelve from input 3");
    assert.equal(loaderFor(out, b, "input_4"), "/m/b.png");
  });

  it("without an end anchor refs ride the legacy shelf from input_2", () => {
    const out = graphOf({
      ref_images: ["/m/a.png"],
      calls: [SHOT()],
    }, "run_legacy");
    const b = bundleIn(out);
    assert.equal(loaderFor(out, b, "input_2"), "/m/a.png", "the legacy shelf holds");
  });

  it("a last frame + 8 refs refuses LOUD (10 > the 9-slot bus, never a silent clobber)", () => {
    const eight = Array.from({ length: 8 }, (_, i) => `/m/r${i}.png`);
    assert.throws(
      () => graphOf({ last_frame: "/m/end.png", ref_images: eight, calls: [SHOT()] }, "run_full"),
      /bus is full/,
    );
  });

  it("declared + legacy merge: declared first, legacy appends deduped", () => {
    const out = graphOf({
      ref_images: ["/m/a.png"],
      calls: [SHOT({ refs: { images: ["/m/a.png", "/m/b.png"] } })],
    }, "run_merge");
    const b = bundleIn(out);
    assert.equal(loaderFor(out, b, "input_2"), "/m/a.png", "declared leads");
    assert.equal(loaderFor(out, b, "input_3"), "/m/b.png", "legacy appends");
    assert.equal(loaderFor(out, b, "input_4"), null, "the dup never double-loads");
  });

  it("Layer B wins: a call's knobs replace the card-level stack (never union)", () => {
    const out = graphOf({
      ref_images: ["/m/a.png"],
      calls: [SHOT({ knobs: { ref_images: ["/m/c.png"] } })],
    }, "run_layerb");
    const b = bundleIn(out);
    assert.equal(loaderFor(out, b, "input_2"), "/m/c.png", "the stanza's own stack rides");
    const loaders = Object.values(out)
      .filter((n) => n.class_type === "LoadImage")
      .map((n) => String(n.inputs["image"]));
    assert.ok(!loaders.includes("/m/a.png"), "the card-level stack yields to the stanza");
  });
});

describe("the input surface: the audio bed cuts per window", () => {
  it("a bed-only film wires MeliteAudioSlice as the hidden <Audio 1>", () => {
    const out = graphOf({ bed_audio: "/m/bed.wav", calls: [SHOT()] }, "run_bed");
    const sliceId = Object.keys(out).find((k) => out[k].class_type === "MeliteAudioSlice");
    assert.ok(sliceId, "the cut node composes");
    assert.equal(out[sliceId].inputs["audio"], "/m/bed.wav");
    assert.equal(out[sliceId].inputs["start_seconds"], 0, "window 1 starts at the bed origin");
    assert.equal(out[sliceId].inputs["duration_seconds"], 10.0, "the window's own duration");
    const r2vId = Object.keys(out).find((k) => out[k].class_type === "MiniMaxH3ReferenceToVideo");
    assert.ok(r2vId, "the bed rides the r2v lane");
    assert.deepEqual(
      out[r2vId].inputs["ref_audios.ref_audio_0"], [sliceId, 0],
      "the cut is the behind-the-scenes <Audio 1>",
    );
  });

  it("window k starts where window k-1 ended (each stanza's own duration)", () => {
    const out = graphOf({
      bed_audio: "/m/bed.wav",
      calls: [SHOT(), SHOT({ text: "then", start_frame: 56, end_frame: 124, knobs: { fps_seconds: 5 } })],
    }, "run_bedfilm");
    const slices = Object.keys(out).filter((k) => out[k].class_type === "MeliteAudioSlice");
    assert.equal(slices.length, 2, "every window carries its own cut");
    const starts = slices.map((k) => out[k].inputs["start_seconds"] as number).sort((x, y) => x - y);
    assert.deepEqual(starts, [0, 10], "window 2 starts after window 1's 10s");
    const durs = slices.map((k) => out[k].inputs["duration_seconds"] as number).sort((x, y) => x - y);
    assert.deepEqual(durs, [5, 10], "each cut spans its own window");
  });

  it("bed_start offsets the whole film (the origin is declarable)", () => {
    const out = graphOf({ bed_audio: "/m/bed.wav", bed_start: 30, calls: [SHOT()] }, "run_bedoff");
    const sliceId = Object.keys(out).find((k) => out[k].class_type === "MeliteAudioSlice");
    assert.ok(sliceId);
    assert.equal(out[sliceId].inputs["start_seconds"], 30);
  });

  it("user ref audios shift behind the bed (<Audio 2-3>, never clobbered)", () => {
    const out = graphOf({
      bed_audio: "/m/bed.wav",
      ref_audios: ["/m/u1.wav", "/m/u2.wav"],
      calls: [SHOT()],
    }, "run_bedshift");
    const r2vId = Object.keys(out).find((k) => out[k].class_type === "MiniMaxH3ReferenceToVideo");
    assert.ok(r2vId);
    const sliceId = Object.keys(out).find((k) => out[k].class_type === "MeliteAudioSlice");
    assert.ok(sliceId);
    assert.deepEqual(out[r2vId].inputs["ref_audios.ref_audio_0"], [sliceId, 0]);
    const bundleOutId = Object.keys(out).find((k) => out[k].class_type === "PlagueKindBundleOut");
    assert.ok(bundleOutId, "the bundle out carries the audio lanes");
    assert.deepEqual(out[r2vId].inputs["ref_audios.ref_audio_1"], [bundleOutId, 15]);
    assert.deepEqual(out[r2vId].inputs["ref_audios.ref_audio_2"], [bundleOutId, 16]);
  });

  it("an empty bed string behaves as no bed (whitespace never wires a node)", () => {
    const out = graphOf({ bed_audio: "  ", calls: [SHOT()] }, "run_nobed");
    assert.ok(
      !Object.values(out).some((n) => n.class_type === "MeliteAudioSlice"),
      "no cut node without a track",
    );
  });

  it("a whitespace bed beside real refs composes refs-only (the guard reads the trim, never the presence)", () => {
    const out = graphOf({ ref_images: ["/m/a.png"], bed_audio: "  ", calls: [SHOT()] }, "run_bedblank");
    assert.ok(
      !Object.values(out).some((n) => n.class_type === "MeliteAudioSlice"),
      "whitespace is absent even on the r2v lane",
    );
    const b = bundleIn(out);
    assert.equal(loaderFor(out, b, "input_2"), "/m/a.png", "the refs still ride");
  });

  it("whitespace-only inputs never stage a guideless window (the guard still demands a real anchor)", () => {
    assert.throws(
      () => graphOf({ variant: "t4r", last_frame: "  ", calls: [SHOT()] }, "run_blanklast"),
      /staged guide image/,
    );
    assert.throws(
      () => graphOf({ variant: "t4r", bed_audio: "  ", calls: [SHOT()] }, "run_blankbed"),
      /staged guide image/,
    );
  });
});
