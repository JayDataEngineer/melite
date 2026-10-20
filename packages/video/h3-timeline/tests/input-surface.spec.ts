// @melite/video-h3-timeline — THE INPUT SURFACE (the operator's law,
// 2026-09-20: the H3 architecture truth — FL2VA anchors vs Ref2VA
// conditioning, two different mechanics, one progressive rail).
// The schema OWNS the wire form (typed arrays, door-enforced);
// compose shelves them onto the 9-slot image bus (anchor 1,
// last_frame 2, refs 3..9). The bed is GONE (2026-09-22): the D-M-E
// lanes own film audio.
// Every arm below refuses loud or composes provably — never silent.
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { CardDefinition } from '@melite/comfyui-card-kit/card-definition'
import { fieldsOfEnvelope } from "@melite/card-base/client";
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

  it("THE SECOND PASS RIDES ITS OWN TAB (2026-09-22, the operator: \"Second pass looks forced, and it's under general???\")", () => {
    const fields = fieldsOfEnvelope(
      ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON() as never,
    );
    const secondPass = fields.filter((f) => f.group === "second_pass").map((f) => f.name);
    assert.deepEqual([...secondPass].sort(), [
      "second_pass_enabled",
      "interpolate_enabled", "interp_model", "interp_multiplier",
      "refine_lora", "refine_strength", "refine_steps",
      "sharpen_enabled", "sharpen_strength", "sharpen_method", "sharpen_radius", "sharpen_threshold", "sharpen_iterations",
      "sr_switch", "sr_resolution", "sr_model",
    ].sort(), "every post-pass field rides the second_pass group");
    // the attention arm + the ref conditioning knob ride SAMPLING —
    // they shape the generation pass, not a second pass
    assert.equal(fields.find((f) => f.name === "attention_backend")?.group, "sampling");
    assert.equal(fields.find((f) => f.name === "ref_image_size")?.group, "sampling");
    // General keeps only the identity + geometry cluster
    const general = fields.filter((f) => !f.group).map((f) => f.name);
    for (const stray of ["sharpen_enabled", "interpolate_enabled", "sr_switch", "refine_lora", "attention_backend"]) {
      assert.ok(!general.includes(stray), `${stray} is not a General straggler`);
    }
  });

  it("THE BED IS GONE (2026-09-22): bed fields are not on the surface — the D-M-E lanes own film audio", () => {
    const fields = fieldsOfEnvelope(
      ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON() as never,
    );
    assert.ok(!fields.some((f) => f.name === "bed_audio" || f.name === "bed_start"),
      "no bed fields on the declared surface");
  });

  // THE HIDDEN-LAW (audit h3-frames-anima B1-1, 2026-10-20: the
  // Frames row served EDITABLE as the timeline span's rival — the
  // compose proves the span owns the window (actions.ts's span rider
  // overrides doc length unless a per-call knob pins), so a doc-level
  // Frames control composes a value the operator never effectively
  // chose). THE LAW: the row NEVER serves — it stays schema-declared
  // (the compose still reads it, CALL_KNOB_KEYS pins it per call, the
  // studio carries it display-owned). This arm rides the REAL walk
  // (fieldsOfEnvelope over the real schema envelope), not a census.
  it("FRAMES NEVER SERVES (B1-1): the hidden walk drops the length row while the schema still declares it", () => {
    const envelope = ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON() as never;
    const fields = fieldsOfEnvelope(envelope);
    assert.ok(!fields.some((f) => f.name === "length"),
      "the served face carries a length control — FRAMES ARE LAYER B, the timeline's calls own the window lengths (the span's rival must not serve)");
    // the row STAYS DECLARED: the envelope's root dict still carries
    // it (the compose reads p.length; the studio's round-trip seat
    // and CALL_KNOB_KEYS depend on the declaration)
    const root = (envelope as unknown as { uid: number; refs: Record<string, { dict?: Record<string, number> }> })
      .refs[String((envelope as unknown as { uid: number }).uid)];
    assert.ok(root?.dict?.["length"] !== undefined,
      "the schema still declares length — hiding it from the face must not delete it from the truth");
    // and the schema's own validation arm still gates a junk length
    // (the vocabulary law: the schema enforces EVERY key the
    // renderer reads — hidden is validation-only)
    assert.throws(() => def.schema({ length: 23 }),
      /length/,
      "a off-grid length still refuses at the door — hidden never means unvalidated");
  });

  it("accepts the full declared surface; the bed starts at 0 by default", () => {
    const walked = def.schema({
      last_frame: "/m/end.png",
      ref_images: ["/m/a.png", "/m/b.png"],
      ref_videos: ["/m/v.mp4"],
      ref_audios: ["/m/s.wav"],
    }) as Record<string, unknown>;
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

  it("the conditioning bus projects at its declared slot shapes", () => {
    assert.equal(typeOf("ref_images"), "image_list");
    assert.equal(typeOf("ref_videos"), "image_list");
    assert.equal(typeOf("ref_audios"), "image_list");
  });

  it("THE NAMING LAW (2026-10-09): the reference buses are REAL flow input seats — declared, wireable, kinded; the renderer spelling is the legacy alias", () => {
    // "fix it all": before this wall the rail declared only the two
    // pixel anchors — ref_images/ref_videos/ref_audios sat OUTSIDE
    // the input category (the picker could not offer them, the
    // lattice refused the wire) while image-edit had already made
    // its reference stack a first-class seat. The video face now
    // speaks the same law: one seat per concept, list kinds carry
    // the producer vocabulary (image_list ← image, video_list ←
    // video, audio_list ← audio).
    assert.deepEqual(def.flowKinds.inputs, {
      image: "image",
      last_frame: "image",
      ref_images: "image_list",
      ref_videos: "video_list",
      ref_audios: "audio_list",
    });
    // the renderer's guide-image spelling rides the alias table:
    // lattice-derivable for old graphs, offered by no face.
    assert.deepEqual(def.flowKinds.legacyAliases, { image_name: "image" });
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
    // sla_dense_steps is declared for the WALK (compose
    // parses it off the card schema) but renders ONLY in the mod
    // zone — the client strips it from params via modOwnedFields.
    // sr_model WAS here as the free-text lie (operator: "rendering
    // as free text, and not a dropdown") — it is a closed
    // vocabulary select now. Any SECOND text projection is a live freeform field on the
    // params face and must be refused here. (re-pin 2026-11-06,
    // c7bc662b7) the film-level PROMPT field is GONE — calls own
    // prompts; a prompt field reappearing on the card schema is the
    // freeform lie's return and must be refused here.
    const fields = fieldsOfEnvelope(
      ((def.schemaCarrier ?? def.schema) as unknown as { toJSON(): unknown }).toJSON() as never,
    );
    assert.equal(fields.find((f) => f.name === "prompt"), undefined, "the film-level prompt stays dead — calls own prompts")
    const textFields = fields.filter((f) => f.type === "text").map((f) => f.name);
    assert.deepEqual(textFields, ["sla_dense_steps"]);
    // sr_model serves as the closed dropdown, gated behind sr_switch
    // like every other post leaf.
    const srModel = fields.find((f) => f.name === "sr_model")!;
    assert.equal(srModel.type, "select");
    assert.deepEqual(
      [...(srModel.options ?? [])].map((o) => typeof o === "string" ? o : o.value).sort(),
      ["seedvr2_ema_3b_fp16.safetensors", "seedvr2_ema_3b_fp8_e4m3fn.safetensors"].sort(),
    );
    // THE SLA MASTER SWITCH (2026-09-21, operator: "is there a switch
    // to turn SLA on/off or is it always on" — it was always on): the
    // boolean heads the sla group, default true; every tuning leaf
    // hides behind it like the sharpen/interp/sr leaves.
    const slaEnabled = fields.find((f) => f.name === "sla_enabled")!;
    assert.equal(slaEnabled.type, "boolean");
    assert.equal(slaEnabled.default, true);
    assert.equal(slaEnabled.group, "sla");
    for (const leaf of ["sla_sparsity", "sla_block_size", "sla_min_seq_len", "sla_dense_last_steps", "sla_dense_steps", "sla_dense_backend", "sla_reference_protection", "sla_protect_audio", "sla_stabilize_motion", "sla_disable_fp16_accum"]) {
      assert.equal(fields.find((f) => f.name === leaf)?.visible_when, "sla_enabled=true", `${leaf} hides behind the master switch`);
    }
    // THE GRID LAW (2026-09-21, "WHY IS WIDTH AND HEIGHT ON
    // DIFFERENT VERTICAL ROWS?"): the General group declares its
    // grid — Seed rides the grid, Width + Height share a
    // row. A stacked General face is the
    // 1:1 lie the operator caught (the component was CardForm; the
    // DECLARATIONS never carried the grid). Frames LEFT the list at
    // the B1-1 cure: it no longer serves (the hidden law arm), so
    // it owns no grid seat either.
    for (const gridded of ["seed", "width", "height"]) {
      assert.equal(fields.find((f) => f.name === gridded)?.columns, 2, `${gridded} declares the 2-col grid`);
    }
    // THE STAR IS DEAD (2026-09-21) → THE FIELD IS DEAD (c7bc662b7,
    // re-pin 2026-11-06): the film-level prompt left the schema —
    // calls own prompts; nothing required remains to judge.
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

  it("empty strings imply nothing (whitespace is absent, never a lane)", () => {
    assert.equal(def.schema({ last_frame: "  " }).variant, "t4_open");
  });

  it("a guideless end-anchor doc COMPOSES (the t4r guard admits the anchor's own surface)", () => {
    // variant derivation says last_frame implies t4r (above); the
    // compose-side guard must agree — an end-anchor-only window is
    // the FL2VA shape: input_2 locked, nothing else shelved. The
    // guard's refs law counts the anchor itself, so the window
    // composes instead of refusing as "guideless t4r".
    const out = graphOf({ last_frame: "/m/end.png", calls: [SHOT()] }, "run_anchor_only");
    const r2v = Object.values(out).filter((n) => n.class_type === "MiniMaxH3ReferenceToVideo");
    assert.equal(r2v.length, 1, "the r2v lane composes for the anchor-only doc");
    const b = bundleIn(out);
    assert.equal(loaderFor(out, b, "input_2"), "/m/end.png", "the end anchor holds input 2");
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

  it("legacy comma refs preserve a data URL's mime comma", () => {
    const data = "data:image/png;base64,iVBORw0KGgo=";
    const out = graphOf({
      calls: [SHOT({ refs: { images: `${data}, /m/b.png` } })],
    }, "run_data_refs");
    const b = bundleIn(out);
    assert.equal(loaderFor(out, b, "input_2"), data);
    assert.equal(loaderFor(out, b, "input_3"), "/m/b.png");
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

describe("THE BED IS GONE (2026-09-22, the operator: \"that is a bug that is there\")", () => {
  it("a doc composes with NO cut node and the user audios on their natural lanes", () => {
    const out = graphOf({
      ref_audios: ["/m/u1.wav", "/m/u2.wav", "/m/u3.wav"],
      calls: [SHOT()],
    }, "run_nobed");
    assert.ok(
      !Object.values(out).some((n) => n.class_type === "MeliteAudioSlice"),
      "the slicer is gone from the graph — film music rides the D-M-E lanes",
    );
    const r2vId = Object.keys(out).find((k) => out[k].class_type === "MiniMaxH3ReferenceToVideo");
    assert.ok(r2vId, "the r2v lane composes");
    const bundleOutId = Object.keys(out).find((k) => out[k].class_type === "PlagueKindBundleOut");
    assert.ok(bundleOutId, "the bundle out carries the audio lanes");
    assert.deepEqual(out[r2vId].inputs["ref_audios.ref_audio_0"], [bundleOutId, 15], "<Audio 1> is the user's");
    assert.deepEqual(out[r2vId].inputs["ref_audios.ref_audio_1"], [bundleOutId, 16], "<Audio 2> is the user's");
    assert.deepEqual(out[r2vId].inputs["ref_audios.ref_audio_2"], [bundleOutId, 17], "<Audio 3> is the user's — no shift, no clobber");
  });
});

describe("THE SPELL ARM: wired stage inputs ride tensor slots, never loaders (the naming law's merge half, 2026-10-09)", () => {
  it("a spelled anchor/last-frame/reference rides verbatim — the merge lands the producer tensor; no Load* is built for a spell", () => {
    // Before the arm, the ports validated green at the lattice and
    // the graph still built LoadImage("$gen") — the merge's ROW-4
    // refused the producer link in the file slot (the
    // validate-said-nothing disease). Now a '$name' IS the tensor:
    // the resizer's image input carries the raw spell, and the
    // graph holds NO LoadImage/LoadVideo/LoadAudio for it.
    const out = graphOf({
      image: "$gen",
      last_frame: "$end",
      ref_images: ["$refimg"],
      ref_videos: ["$refvid"],
      ref_audios: ["$refaud"],
      calls: [SHOT()],
    }, "run_spells");
    const b = bundleIn(out);
    // input_1 (the anchor) traces to the RAW spell, not a loader
    const anchorLink = out[b].inputs["input_1"] as unknown;
    const anchorSrc = (out[Array.isArray(anchorLink) ? anchorLink[0] : ""]?.inputs ?? {})["image"];
    assert.equal(anchorSrc, "$gen", "the anchor rides the producer tensor (the raw spell)");
    // the spelled end anchor and image ref ride the resizer's image input
    for (const slot of ["input_2", "input_3"]) {
      const link = out[b].inputs[slot] as [string, number];
      const resizer = out[link[0]];
      assert.equal(resizer?.class_type, "UnifiedResizeImageMask", `${slot} still resizes`);
      assert.equal(resizer.inputs["image"], slot === "input_2" ? "$end" : "$refimg", `${slot} rides the spell, not a loader`);
    }
    // the spelled motion guide rides GetVideoComponents' video input
    const comp = Object.values(out).find((n) => n.class_type === "GetVideoComponents");
    assert.ok(comp, "the video components node builds");
    assert.equal(comp.inputs["video"], "$refvid", "the motion guide rides the producer's video tensor");
    // the spelled sound reference rides the bundle's audio seat directly
    assert.equal(out[b].inputs["input_16"], "$refaud", "the sound reference rides the producer's audio tensor");
    // NO loader anywhere carries a spell (the ROW-4 death is structurally gone)
    for (const n of Object.values(out)) {
      if (n.class_type.startsWith("Load")) {
        for (const v of Object.values(n.inputs)) {
          assert.equal(typeof v === "string" && v.startsWith("$"), false, `no spell in a ${n.class_type} slot`);
        }
      }
    }
  });

  it("file paths keep the Load* disk handoff (the per-stage path owns those)", () => {
    const out = graphOf({
      image: "/m/first.png",
      ref_videos: ["/m/guide.mp4"],
      ref_audios: ["/m/tone.flac"],
      calls: [SHOT()],
    }, "run_paths");
    const b = bundleIn(out);
    const comp = Object.values(out).find((n) => n.class_type === "GetVideoComponents");
    const vidLink = comp?.inputs["video"] as [string, number] | undefined;
    assert.ok(Array.isArray(vidLink), "the path loads through a LoadVideo tensor link");
    assert.equal(out[vidLink[0]].class_type, "LoadVideo");
    assert.equal((out[vidLink[0]].inputs as Record<string, unknown>)["file"], "/m/guide.mp4");
    const audLink = out[b].inputs["input_16"] as [string, number] | undefined;
    assert.ok(Array.isArray(audLink), "the audio rides a LoadAudio tensor link");
    assert.equal(out[audLink[0]].class_type, "LoadAudio");
    assert.equal((out[audLink[0]].inputs as Record<string, unknown>)["audio"], "/m/tone.flac");
  });
});
