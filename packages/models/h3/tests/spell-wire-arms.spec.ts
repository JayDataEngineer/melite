// @contract models-h3-refaudio-spell-wire
// @contract models-h3-keyframe-spell-wire
// @contract models-h3-soundtrack-spell-wire
//
// THE SOUNDTRACK ARMS (2026-11-01, the merged-form wire — plan
// 2026-11-01-soundtrack-merged-wire §3; session 2 truth): an
// audio_clips row whose src is a $spell names a WIRED STAGE INPUT —
// the film tail seats it on MeliteFilmAudioMix.wired_audio_k THROUGH
// a DECLARED film-clock hop (the manifest row carries wired: k, NEVER
// src — src embedded in the clips_json string is dead text to the
// merge): the compose states one MeliteAudioResample at FILM_AUDIO_RATE
// between the producer and the seat and carries the HOP'S LINK into the
// seat, so the seat receives film-rate audio and the mix's own wired-seat
// law (film_mix.py seat_source — a foreign rate refuses loud, "never
// silently resampled") has nothing to refuse. THE F-B RE-STATEMENT
// (2026-11-13, the wired tts→film press): the verbatim seat red was the
// burn — a 24 kHz producer landed on a 48 kHz film and the law killed
// the run; the declared node is the graph-visible opposite of the silent
// coercion the law bans. A spelled clip that CONDITIONS a window still
// slices through MeliteAudioTensorSlice.audio_tensor VERBATIM — the
// model hears the voice at the voice's rate; only the film-tail overlay
// rides the hop — and the pack's typed AUDIO socket (the file slice
// node's Combo seat can never take a producer link) still refuses that
// lane's file form; the session-1 interim
// conditioning door DELETED there (the wall EXTENDED: S4/S5 judge the
// tensor path the door used to refuse). planMerge lands the producer's
// link in BOTH seats (the tensor seat verbatim, the overlay seat through
// the hop). A path src keeps the staged-file handoff
// byte-frozen — tail rows AND the file slice node.
//
// THE SPELL-WIRE ARMS — the card half of the ONE-WAY LAW (GAPS-20,
// operator directive; corrected framing 2026-11-01: a value rides the
// wire when it crosses through a DECLARED input — a path is a lawful
// VALUE of that input; the burn is a side-channel). The h3 card's
// media seats carry the spell law (actions.ts, the SPELL ARM comment
// block): a `$name` value names a WIRED STAGE INPUT, never a file —
// the compose rides it into its TENSOR slot verbatim and never builds
// a loader; the merge (rewriteSpells) lands the upstream producer's
// link, and ROW-4 (comfyui-merge.ts) refuses a producer link in a
// Load* file slot. The merge half is walled (comfyui-merge.spec.ts
// ROW-4, bench-wire-chain.spec.ts, wire-order.spec.ts); the CARD half
// — the seat actually carrying the spell into the tensor slot — was
// judged by nothing. Two faces of the GAPS-20 mapping ride it:
//
//   FACE #14 (the audio port): `ref_audios` — the declared audio_list
//   input (h3-timeline card.ts flowKinds). A spelled sound reference
//   rides the reference bundle's audio seat (input_16..18) verbatim; a
//   path keeps the LoadAudio disk handoff (lawful at the estate
//   boundary). Toggle: the ref_audios entry loses its isSpell arm →
//   ARM A1/A2 red naming the audio face.
//
//   FACE #16 (the keyframes rail): the pins' `image` values. A spelled
//   pin rides its tensor slot — an endpoint pin through the anchor
//   seat (the guide resizer's image input), an interior pin through
//   the AddGuide image chain (imageRef, actions.ts) — and never builds
//   a LoadImage. The PATH half of the same lane is the disk handoff
//   arm already walled by value-roundtrip's KEYFRAMES VALUE ARM (a
//   path pin MUST build its LoadImage). Toggle: imageRef loses its
//   spell branch → ARM K1/K2 red naming the keyframes face.
//
// DEPTH: the real composition root (loadCardDefs → def.schema →
// def.compose — the same door the run rides, hop [4]) and the REAL
// merge planner (planMerge) over a real producer row — never a
// hand-built fixture for the seat under test.
//
// ADMISSION (the initial-grammar law, 2026-11-14): these arms pin
// the MERGE face — a spelled TENSOR slot resolves to the wired
// producer's link. The DOOR face (an initial-bound $spell rooted at
// a card-declared tensor port refuses at admission, before any
// compose) is owned by the registry twin: flows-producer-agreement
// ARM 6 (composeCardStageRow) and the kindsOk arm in
// runs-validate-stages.spec.ts.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { FILM_AUDIO_RATE } from "../src/actions.ts";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { getModel, registryIds, registryModel } from "../../../engines/comfyui-cordis/src/models/models.ts";
import { planMerge } from "../../../engines/comfyui-cordis/src/comfyui-merge.ts";
import type { MergeRow } from "../../../engines/comfyui-cordis/src/comfyui-merge.ts";
import { join } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FACTS_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..", "..", "..", "..",
  "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
);
const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

type GNode = { class_type: string; inputs: Record<string, unknown> };
type Graph = Record<string, GNode>;

async function composeH3(doc: Record<string, unknown>, runId: string): Promise<Graph> {
  const defs = await loadCardDefs();
  const def = defs.get("h3-timeline");
  assert.ok(def, "the composition root serves the h3-timeline card");
  const model: ModelFacts | undefined = facts.models["h3"];
  assert.ok(model, "the h3 family facts row serves");
  const g = new GraphBuilder();
  def.compose(def.schema({ ...doc }), model, g, runId);
  return g.toJSON() as Graph;
}

/** Every composed node whose named input carries the spell verbatim. */
function nodesCarrying(graph: Graph, input: string, spell: string): Array<[string, GNode]> {
  return Object.entries(graph).filter(([, n]) => n.inputs[input] === spell);
}

function assertSpellRides(
  graph: Graph,
  cls: string,
  input: string,
  spell: string,
  face: string,
): void {
  const hits = nodesCarrying(graph, input, spell).filter(([, n]) => n.class_type === cls);
  assert.ok(
    hits.length > 0,
    `${face} SPELL-WIRE ARM: no '${cls}' node carries '${spell}' at its '${input}' slot — ` +
    `the spelled value never rode its tensor slot, so the merge cannot land the producer's link ` +
    `(the seat fell back to a disk handoff that owns no wire)`,
  );
}

function assertNoLoaderBuilt(graph: Graph, cls: string, input: string, spell: string, face: string): void {
  const loader = Object.entries(graph).find(
    ([, n]) => n.class_type === cls && Object.values(n.inputs).includes(spell),
  );
  assert.ok(
    loader === undefined,
    `${face} SPELL-WIRE ARM: node '${loader?.[0]}' (${cls}) carries '${spell}' — ` +
    `the spelled value built a disk loader; a producer link cannot land in a ${cls} file slot ` +
    `(ROW-4 refuses it at the merge — the wire dies behind a compose that looked legal)`,
  );
}

const SHOT = (over: Record<string, unknown> = {}): Record<string, unknown> => ({
  text: "a slow push in", start_frame: 0, end_frame: 56, ...over,
});

/** A producer row the merge reads: one Save* node publishing `default`
 *  (inferProducers' single-save arm binds every declared channel). */
const producerRow = (stageId: string, cls: string): MergeRow =>
  ({
    stageId,
    card: undefined,
    workflow: { save: { class_type: cls, inputs: {} } },
    outputs: { default: cls === "SaveAudio" ? "audio" : "image" },
    outputNodes: {},
    params: {},
  }) as unknown as MergeRow;

/** The consumer row: the REAL composed graph carries the spells; the
 *  film tail's own saves stay unbound (no stage wires FROM the film). */
const consumerRow = (stageId: string, graph: Graph): MergeRow =>
  ({
    stageId,
    card: "h3-timeline",
    workflow: graph as unknown as Record<string, unknown> as Record<string, unknown> as MergeRow["workflow"],
    outputs: {},
    outputNodes: {},
    params: {},
  }) as unknown as MergeRow;

/** The merged workflow's rows are EngineJson — narrow to the node
 *  shape the arms read (the merge only ever stores node dicts). */
const asNode = (v: unknown): GNode => v as GNode;

describe("the h3 spell arms ride the wire (GAPS-20: the value crosses through the declared input)", () => {
  it("ARM A1 — a spelled ref_audios entry rides the reference bundle's audio seat verbatim, never a LoadAudio (face #14)", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      ref_audios: ["$ref_audios"],
    }, "h3_spell_arm_a1");
    assertSpellRides(graph, "PlagueKindBundleIn", "input_16", "$ref_audios", "AUDIO");
    assertNoLoaderBuilt(graph, "LoadAudio", "audio", "$ref_audios", "AUDIO");
  });

  it("ARM A2 — the spelled audio seat RESOLVES at the merge: the producer's link lands in input_16 (face #14 end to end)", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      ref_audios: ["$ref_audios"],
    }, "h3_spell_arm_a2");
    const plan = planMerge(
      [producerRow("voicer", "SaveAudio"), consumerRow("film", graph)],
      {},
      { film: { ref_audios: "voicer.default" } },
    );
    const bundle = Object.entries(plan.workflow).find(
      ([, n]) => asNode(n).class_type === "PlagueKindBundleIn",
    );
    assert.ok(bundle, "the merged graph keeps the reference bundle");
    // F41 pass 2.5: the slot resolves THROUGH the pass seam's
    // MeliteBoundary — the boundary's own through carries the voicer.
    assert.deepEqual(
      asNode(bundle![1]).inputs["input_16"],
      ["__unload$0", 0],
      "AUDIO SPELL-WIRE ARM: the merge did not land the voicer's wire (boundary-mediated) in the bundle's audio seat — " +
      "the declared input's wire dies between compose and merge",
    );
    assert.deepEqual(
      asNode(plan.workflow["__unload$0"]!).inputs["through"],
      ["voicer::save", 0],
      "AUDIO SPELL-WIRE ARM: the seam boundary's through lost the voicer's producer link",
    );
  });

  it("ARM K1 — spelled keyframe pins ride their tensor seats (endpoint anchor, interior AddGuide), never a LoadImage (face #16)", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      keyframes: [
        { frame: 0, image: "$anchor_stage" },
        { frame: 28, image: "$mid_stage" },
      ],
    }, "h3_spell_arm_k1");
    // the endpoint pin rides the anchor seat: the guide resizer's image
    // input (bundle input_1's feeder) carries the spell verbatim.
    assertSpellRides(graph, "UnifiedResizeImageMask", "image", "$anchor_stage", "KEYFRAMES");
    // the interior pin rides the AddGuide image chain.
    assertSpellRides(graph, "MiniMaxH3AddGuide", "image", "$mid_stage", "KEYFRAMES");
    assertNoLoaderBuilt(graph, "LoadImage", "image", "$anchor_stage", "KEYFRAMES");
    assertNoLoaderBuilt(graph, "LoadImage", "image", "$mid_stage", "KEYFRAMES");
  });

  it("ARM K2 — the spelled pins RESOLVE at the merge: the producer's link lands in both tensor seats (face #16 end to end)", async () => {
    const graph = await composeH3({
      length: 56,
      calls: [SHOT()],
      keyframes: [
        { frame: 0, image: "$anchor_stage" },
        { frame: 28, image: "$mid_stage" },
      ],
    }, "h3_spell_arm_k2");
    const plan = planMerge(
      [producerRow("framer", "SaveImage"), consumerRow("film", graph)],
      {},
      { film: { anchor_stage: "framer.default", mid_stage: "framer.default" } },
    );
    const resize = Object.entries(plan.workflow).find(
      ([, n]) => asNode(n).class_type === "UnifiedResizeImageMask" && asNode(n).inputs["image"] !== undefined,
    );
    assert.ok(resize, "the merged graph keeps the anchor resizer");
    assert.deepEqual(
      asNode(resize![1]).inputs["image"],
      ["__unload$0", 0],
      "KEYFRAMES SPELL-WIRE ARM: the merge did not land the framer's wire (boundary-mediated) in the endpoint pin's anchor seat",
    );
    const guide = Object.entries(plan.workflow).find(
      ([, n]) => asNode(n).class_type === "MiniMaxH3AddGuide",
    );
    assert.ok(guide, "the merged graph keeps the interior pin's AddGuide");
    assert.deepEqual(
      asNode(guide![1]).inputs["image"],
      ["__unload$0", 0],
      "KEYFRAMES SPELL-WIRE ARM: the merge did not land the framer's wire (boundary-mediated) in the interior pin's AddGuide seat",
    );
    // both seats ride the SAME boundary — one producer, one seam
    // (the F41 dedupe law), and its through aims at the framer.
    assert.deepEqual(
      asNode(plan.workflow["__unload$0"]!).inputs["through"],
      ["framer::save", 0],
      "KEYFRAMES SPELL-WIRE ARM: the seam boundary's through lost the framer's producer link",
    );
  });
});

/** The two-call film doc the film tail serves (the same shape the
 *  value-roundtrip film arms ride — multi-call is the film
 *  property). */
const FILM_DOC = (audio_clips: Array<Record<string, unknown>>): Record<string, unknown> => ({
  length: 56,
  audio_clips,
  calls: [SHOT(), SHOT({ text: "then a turn", start_frame: 56, end_frame: 124 })],
});

const findMix = (graph: Graph): [string, GNode] => {
  const hit = Object.entries(graph).find(([, n]) => n.class_type === "MeliteFilmAudioMix");
  assert.ok(hit, "the composed film keeps the MeliteFilmAudioMix tail");
  return hit;
};

/** The film-clock hop a wired seat rides: resolve the seat's link to its
 *  node and judge the declared resample (class + stated rate + the spell
 *  on its audio input). The F-B cure's shape — a visible node between the
 *  producer and the seat, never a silent coercion. */
function assertSeatRidesFilmClockHop(
  graph: Graph,
  mix: GNode,
  seatKey: string,
  spell: string,
): void {
  const seat = mix.inputs[seatKey] as unknown;
  assert.ok(
    Array.isArray(seat) && seat.length === 2 && typeof seat[0] === "string",
    `FILM-CLOCK HOP ARM: wired seat '${seatKey}' carries ${JSON.stringify(seat)} — ` +
    `the seat must carry a LINK into a declared MeliteAudioResample at the film's own clock ` +
    `(a bare spell or literal would land at the producer's rate and the mix's wired-seat law refuses it)`,
  );
  const [hopId, slot] = seat as [string, number];
  const hop = graph[hopId];
  assert.ok(hop, `FILM-CLOCK HOP ARM: the seat's link targets '${hopId}' — no such node in the composed graph`);
  assert.equal(hop.class_type, "MeliteAudioResample",
    `FILM-CLOCK HOP ARM: wired seat '${seatKey}' feeds '${hop.class_type}' — the hop must be the join-rate door`);
  assert.equal(slot, 0, `FILM-CLOCK HOP ARM: the seat must take the hop's AUDIO output (slot 0)`);
  assert.equal(hop.inputs["sample_rate"], FILM_AUDIO_RATE,
    `FILM-CLOCK HOP ARM: the hop into '${seatKey}' states ${hop.inputs["sample_rate"]} — it must state the film's own clock (FILM_AUDIO_RATE)`);
  assert.equal(hop.inputs["audio"], spell,
    `FILM-CLOCK HOP ARM: the hop into '${seatKey}' lost the spelled producer — its audio input must carry '${spell}' verbatim for the merge to land the link`);
}

describe("the soundtrack's spelled clip rides the wire (GAPS-20 face #14 film tail, 2026-11-01)", () => {
  it("ARM S1 — an overlay-only spelled clip rides a DECLARED film-clock hop into wired_audio_1; the manifest row carries wired, never src", async () => {
    const graph = await composeH3(FILM_DOC([
      { src: "$bed", start_frame: 0, dur_frames: 0, class: "music" },
    ]), "h3_spell_arm_s1");
    const [, mix] = findMix(graph);
    assertSeatRidesFilmClockHop(graph, mix, "wired_audio_1", "$bed");
    const rows = JSON.parse(mix.inputs["clips_json"] as string) as Array<Record<string, unknown>>;
    assert.deepEqual(
      rows, [{ wired: 1, start_sec: 0, dur_sec: 0, class: "music" }],
      "SOUNDTRACK SPELL-WIRE ARM: the manifest row must carry wired: 1 with NO src key — " +
      "src embedded in the clips_json string is dead text to the merge",
    );
    assertNoLoaderBuilt(graph, "LoadAudio", "audio", "$bed", "SOUNDTRACK");
  });

  it("ARM S2 — the spelled hop RESOLVES at the merge: the producer's link lands on the hop, the seat carries the hop at the film clock (end to end)", async () => {
    const graph = await composeH3(FILM_DOC([
      { src: "$bed", start_frame: 0, dur_frames: 0, class: "music" },
    ]), "h3_spell_arm_s2");
    const plan = planMerge(
      [producerRow("voicer", "SaveAudio"), consumerRow("film", graph)],
      {},
      { film: { bed: "voicer.default" } },
    );
    const [, mix] = Object.entries(plan.workflow).find(
      ([, n]) => asNode(n).class_type === "MeliteFilmAudioMix",
    ) ?? [];
    assert.ok(mix, "the merged graph keeps the film mix");
    const seat = asNode(mix).inputs["wired_audio_1"] as unknown as [string, number];
    assert.ok(
      Array.isArray(seat) && typeof seat[0] === "string" && seat[0].startsWith("film::MeliteAudioResample."),
      "SOUNDTRACK SPELL-WIRE ARM: the merged seat must carry the namespaced film-clock hop's link — " +
      `it carries ${JSON.stringify(seat)}`,
    );
    const hop = plan.workflow[seat[0]!] as GNode | undefined;
    assert.ok(hop, "the merged graph keeps the seat's film-clock hop");
    assert.equal(hop!.inputs["sample_rate"], FILM_AUDIO_RATE,
      "the merged hop must state the film's own clock — the mix's seat receives film-rate audio");
    assert.deepEqual(
      hop!.inputs["audio"],
      ["__unload$0", 0],
      "SOUNDTRACK SPELL-WIRE ARM: the merge did not land the voicer's wire (boundary-mediated) on the hop's audio input — " +
      "the soundtrack's wire dies between compose and merge",
    );
    assert.deepEqual(
      asNode(plan.workflow["__unload$0"]!).inputs["through"],
      ["voicer::save", 0],
      "SOUNDTRACK SPELL-WIRE ARM: the seam boundary's through lost the voicer's producer link",
    );
    const rows = JSON.parse(asNode(mix).inputs["clips_json"] as string) as Array<Record<string, unknown>>;
    assert.equal(rows[0]!["wired"], 1);
    assert.equal("src" in rows[0]!, false, "the merged manifest row grew a src key — the row must ride wired");
  });

  it("ARM S3 — a PATH src keeps the exact old shape: byte-frozen rows, zero wired keys, zero wired inputs", async () => {
    const graph = await composeH3(FILM_DOC([
      { src: "/melite-media/runs/run-x/bed.flac", start_frame: 0, dur_frames: 0, class: "music" },
    ]), "h3_spell_arm_s3");
    const [, mix] = findMix(graph);
    const rows = JSON.parse(mix.inputs["clips_json"] as string) as Array<Record<string, unknown>>;
    assert.deepEqual(
      rows,
      [{ src: "/melite-media/runs/run-x/bed.flac", start_sec: 0, dur_sec: 0, class: "music" }],
      "SOUNDTRACK PATH ARM: the placed-artifact path is lawful and byte-frozen — the row grew a wired key or lost its src shape",
    );
    for (const key of Object.keys(mix.inputs)) {
      assert.match(key, /^(videos|after|clips_json|duck_spans|music_duck_spans|duck_db|film_seconds|state_roots)$/,
        `SOUNDTRACK PATH ARM: the path film grew a wired input '${key}' — path rows never seat`);
    }
    const wiredAnywhere = Object.entries(graph).filter(([, n]) =>
      Object.keys(n.inputs).some((k) => k.startsWith("wired_audio_")));
    assert.deepEqual(wiredAnywhere, [], "a path-only film composed wired soundtrack seats");
  });

  it("ARM S4 — a fifth spelled clip refuses loud, naming the row and both cures", async () => {
    const five = [1, 2, 3, 4, 5].map((i) => ({ src: `$bed${i}`, start_frame: 0, dur_frames: 0, class: "music" }));
    let caught: unknown = null;
    try {
      await composeH3(FILM_DOC(five), "h3_spell_arm_s4");
    } catch (e) {
      caught = e;
    }
    assert.ok(caught instanceof Error, "the seat overflow did not refuse — a fifth seat would ride undeclared");
    const voice = (caught as Error).message;
    assert.match(voice, /audio_clips\[4\]/, "the overflow refusal must name the overflow row");
    assert.match(voice, /wired_audio_1\.\.4/, "the overflow refusal must name the declared seats");
    assert.match(voice, /WIRED_CLIP_SEATS in the melite-audio-nodes pack/, "the overflow refusal must name the second cure");
  });

  it("ARM S5 — a spelled clip that CONDITIONS a window slices through the tensor seat verbatim, never a file node, never a loader", async () => {
    const graph = await composeH3(FILM_DOC([
      { src: "$line1", start_frame: 0, dur_frames: 24, class: "dialogue", text: "hello there" },
    ]), "h3_spell_arm_s4");
    const tensor = Object.entries(graph).find(
      ([, n]) => n.class_type === "MeliteAudioTensorSlice",
    );
    assert.ok(tensor, "no 'MeliteAudioTensorSlice' composed for the spelled conditioning stamp — " +
      "the window would hear nothing (or the interim door came back: a refusal is retired, the wire replaced it)");
    assert.equal(
      tensor![1].inputs["audio_tensor"], "$line1",
      "SOUNDTRACK SPELL-WIRE ARM: the tensor slice does not carry '$line1' at its 'audio_tensor' slot — " +
      "the spelled conditioning stamp never rode the wire, so the merge cannot land the producer's link",
    );
    // the stamp's slice geometry rides too (24f at the doc clock's
    // 24fps default = 1.0s, source offset 0)
    assert.equal(tensor![1].inputs["start_seconds"], 0, "the tensor slice lost the stamp's source offset");
    assert.equal(tensor![1].inputs["duration_seconds"], 1, "the tensor slice lost the stamp's slice duration");
    // the FILE slice node is dead for the spelled stamp (the F17 class:
    // a link in its Combo seat would die at submit), and no loader rode.
    const fileSlice = Object.entries(graph).find(
      ([, n]) => n.class_type === "MeliteAudioSlice" && Object.values(n.inputs).includes("$line1"),
    );
    assert.equal(fileSlice, undefined, "the spelled conditioning stamp built a MeliteAudioSlice — a producer link cannot land in its Combo FILE seat");
    assertNoLoaderBuilt(graph, "LoadAudio", "audio", "$line1", "SOUNDTRACK");
    // the film tail rides too: the same spelled clip overlays at the mix
    // through its wired seat (the audible authority) THROUGH the declared
    // film-clock hop — the conditioning half above stays verbatim (the
    // model hears the voice at the voice's rate), the manifest row
    // carrying wired: k, never src.
    const [, mix] = findMix(graph);
    assertSeatRidesFilmClockHop(graph, mix, "wired_audio_1", "$line1");
    const rows = JSON.parse(mix.inputs["clips_json"] as string) as Array<Record<string, unknown>>;
    assert.deepEqual(rows, [{ wired: 1, start_sec: 0, dur_sec: 1, class: "dialogue" }],
      "the conditioning clip's manifest row must carry wired with NO src key");
  });

  it("ARM S6 — the conditioning stamp RESOLVES at the merge: the producer's link lands in audio_tensor verbatim AND on the film-clock hop feeding wired_audio_1 (end to end)", async () => {
    const graph = await composeH3(FILM_DOC([
      { src: "$line1", start_frame: 0, dur_frames: 24, class: "dialogue", text: "hello there" },
    ]), "h3_spell_arm_s5");
    const plan = planMerge(
      [producerRow("voicer", "SaveAudio"), consumerRow("film", graph)],
      {},
      { film: { line1: "voicer.default" } },
    );
    const tensor = Object.entries(plan.workflow).find(
      ([, n]) => asNode(n).class_type === "MeliteAudioTensorSlice",
    );
    assert.ok(tensor, "the merged graph keeps the conditioning tensor slice");
    assert.deepEqual(
      asNode(tensor![1]).inputs["audio_tensor"],
      ["__unload$0", 0],
      "SOUNDTRACK SPELL-WIRE ARM: the merge did not land the voicer's wire (boundary-mediated) in the conditioning stamp's audio_tensor seat — " +
      "the window's heard wire dies between compose and merge",
    );
    const mix = Object.entries(plan.workflow).find(
      ([, n]) => asNode(n).class_type === "MeliteFilmAudioMix",
    );
    assert.ok(mix, "the merged graph keeps the film mix");
    const seat = asNode(mix![1]).inputs["wired_audio_1"] as unknown as [string, number];
    assert.ok(
      Array.isArray(seat) && typeof seat[0] === "string" && seat[0].startsWith("film::MeliteAudioResample."),
      "SOUNDTRACK SPELL-WIRE ARM: the overlay seat must carry the namespaced film-clock hop's link — " +
      `it carries ${JSON.stringify(seat)}`,
    );
    const hop = plan.workflow[seat[0]!] as GNode | undefined;
    assert.ok(hop, "the merged graph keeps the overlay seat's film-clock hop");
    assert.equal(hop!.inputs["sample_rate"], FILM_AUDIO_RATE,
      "the merged hop must state the film's own clock — the mix's seat receives film-rate audio");
    assert.deepEqual(
      hop!.inputs["audio"],
      ["__unload$0", 0],
      "SOUNDTRACK SPELL-WIRE ARM: the merge did not land the voicer's wire (boundary-mediated) on the overlay hop's audio input",
    );
    // one producer (voicer.default) → ONE seam boundary carrying both
    // seats (the F41 dedupe law); its through aims at the voicer.
    assert.deepEqual(
      asNode(plan.workflow["__unload$0"]!).inputs["through"],
      ["voicer::save", 0],
      "SOUNDTRACK SPELL-WIRE ARM: the seam boundary's through lost the voicer's producer link",
    );
  });

  it("ARM S8 — EVERY wired seat of a multi-clip film rides its OWN declared film-clock hop (the F-B cure's one way: no seat escapes the stated rate)", async () => {
    const graph = await composeH3(FILM_DOC([
      { src: "$bed", start_frame: 0, dur_frames: 0, class: "music" },
      { src: "$line1", start_frame: 0, dur_frames: 24, class: "dialogue", text: "hello there" },
    ]), "h3_spell_arm_s8");
    const [, mix] = findMix(graph);
    assertSeatRidesFilmClockHop(graph, mix, "wired_audio_1", "$bed");
    assertSeatRidesFilmClockHop(graph, mix, "wired_audio_2", "$line1");
    const hops = Object.values(graph).filter((n) => n.class_type === "MeliteAudioResample");
    // the window muxes ride the join-rate door too (filmJoinAudio, F25);
    // the F-B claim is the SOUNDTRACK hops specifically: one per seat,
    // each distinct, each stating the film clock.
    const soundtrackHops = hops.filter((n) => n.inputs["audio"] === "$bed" || n.inputs["audio"] === "$line1");
    assert.equal(soundtrackHops.length, 2,
      "FILM-CLOCK HOP ARM: the two spelled seats must ride two DISTINCT hops, never a shared or missing one");
    const rates = new Set(soundtrackHops.map((n) => n.inputs["sample_rate"]));
    assert.deepEqual([...rates], [FILM_AUDIO_RATE],
      "FILM-CLOCK HOP ARM: a soundtrack hop states a rate that is not the film's own clock");
  });

  it("ARM S7 — a PATH stamp keeps the file slice node byte-frozen: zero tensor slices compose", async () => {
    const graph = await composeH3(FILM_DOC([
      { src: "/melite-media/runs/run-x/line.flac", start_frame: 0, dur_frames: 24, class: "dialogue", text: "hello there" },
    ]), "h3_spell_arm_s6");
    const slice = Object.entries(graph).find(([, n]) => n.class_type === "MeliteAudioSlice");
    assert.ok(slice, "the path stamp lost its file slice node");
    assert.equal(
      slice![1].inputs["audio"], "/melite-media/runs/run-x/line.flac",
      "SOUNDTRACK PATH ARM: the placed-artifact path is lawful and byte-frozen — the file slice node lost its staged-name seat",
    );
    assert.equal(slice![1].inputs["audio_tensor"], undefined, "a path stamp grew a tensor input");
    const tensorAnywhere = Object.entries(graph).filter(([, n]) => n.class_type === "MeliteAudioTensorSlice");
    assert.deepEqual(tensorAnywhere, [], "a path-only film composed a MeliteAudioTensorSlice — path rows never seat on the tensor wire");
  });
});
