// @melite/video-h3-timeline — the extend arm rows (the repair arm's
// own harness): drives the registered card's own doors — def.mods for
// the served kind, def.compose for the branch. The kind is served
// verbatim with the arm-gated packs, the film path is byte-identical
// with the arm empty, and a bound arm refuses LOUD on every law edge
// (missing seat, the three pairwise one-door refusals, the off-grid
// length) while complete seats compose the fresh-continuation chain
// ending in the joined-film SaveVideo. Every row asserts served
// truth or refusal text — never expect(true).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs, resolveCardFlowOutputs } from "@melite/comfyui-cordis";
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

// The extend-only classes (zero of these may ever appear in a film
// graph — the fresh-continuation window and the file join are this
// arm's alone; the shared chain tail pins inside the emission row,
// never absent here).
const EXTEND_CLASSES = [
  'ImageFromBatch',
  'SolidMask',
  'MeliteConcatVideos',
];

const EXTEND_ENTRY = (): Record<string, unknown> => ({
  source_clip: 'clips/take.mp4',
  extend_prompt: 'the dancer keeps spinning as the tempo lifts, the crowd clapping along',
  extend_seconds: 2.33,
  seed: 0,
});

describe("the extend kind", () => {
  it("is served verbatim with the arm-gated packs", () => {
    const kinds = (def as { mods?: Array<Record<string, unknown>> }).mods ?? [];
    const extend = kinds.find((k) => k.kind === 'extend');
    assert.ok(extend, "the h3-timeline card serves the extend kind on the modifiers channel");
    assert.equal(extend.param_key, 'extend', "the bag rides param_key 'extend'");
    assert.equal(extend.max_stack, 1, "one extend per doc (max_stack 1)");
    assert.equal(extend.schema_key, 'extend', "the kind stamps its own catalog name (the mod-liveness ARM 3 attribution)");
    assert.deepEqual(extend.requires, [
      'ComfyUI-VideoHelperSuite',
      'ComfyUI-MiniMaxH3-Context-Loop',
      'ComfyUI-Fantastic-MiniMaxH3-PromptBuilder',
      'comfyui-h3-oneclick-swap',
      'melite-utility-nodes',
    ], "the kind's arm packs: the VHS loader, the chain, the prompt builder, the slice's home pack, and the file join");
    const fields = (extend.fields as Array<{ name: string }>).map((f) => f.name);
    assert.ok(fields.includes('source_clip'), "the prior-clip seat is declared");
    assert.ok(fields.includes('extend_prompt'), "the continuation seat is declared");
    assert.ok(fields.includes('extend_seconds'), "the length seat is declared");
    assert.ok(fields.includes('seed'), "the plan seed is declared");
  });

  it("an empty extend bag composes the film path byte-identically (an unused arm never reshapes a film graph)", () => {
    const shot = { text: 'a slow push in', start_frame: 0, end_frame: 56 };
    const bare = def.schema({ calls: [shot], length: 56 }) as Record<string, unknown>;
    const withBag = def.schema({ calls: [shot], length: 56, extend: [] }) as Record<string, unknown>;
    const g1 = new GraphBuilder();
    def.compose(bare, model, g1, "run_film_bare");
    const g2 = new GraphBuilder();
    def.compose(withBag, model, g2, "run_film_bag");
    assert.deepEqual(graphOf(g2), graphOf(g1), "the empty extend bag leaves the film graph byte-identical");
    for (const cls of EXTEND_CLASSES) {
      assert.equal(ofClass(graphOf(g1), cls).length, 0, `a film graph carries zero ${cls}`);
    }
  });

  it("a present-but-empty bag refuses loud (never a quiet film)", () => {
    const walked = def.schema({ extend: {} }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_extend_empty_bag"),
      /extend bag is present but carries no entry/,
    );
  });

  it("a bound arm with a missing seat refuses naming the seat", () => {
    const entry = EXTEND_ENTRY();
    delete entry.source_clip;
    const walked = def.schema({ extend: [entry] }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_extend_missing_seat"),
      /'source_clip' names no media.*an extend needs both seats bound/s,
      "the armed extend with no prior clip refuses loud naming the seat (the reshoot idiom — never a silent half-build)",
    );
  });

  it("the missing-prompt refusal names the prompt seat", () => {
    const entry = EXTEND_ENTRY();
    delete entry.extend_prompt;
    const walked = def.schema({ extend: [entry] }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_extend_noprompt"),
      /'extend_prompt' names no media.*MOTION\+SOUND for the appended seconds/s,
      "the continuation seat is the authored action — MOTION+SOUND for the appended seconds",
    );
  });
});

describe("the extend emission (the fresh-continuation chain)", () => {
  it("anchors on the prior clip's LAST FRAME, taken in-graph (negative batch index)", () => {
    const walked = def.schema({ extend: [EXTEND_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_extend_anchor");
    const out = graphOf(g);
    // THE TAIL ANCHOR: the VHS loader carries the whole clip at the
    // film clock, and ImageFromBatch(batch_index: -1) takes its last
    // frame — the engine's own negative-index support, no probe.
    const vhs = ofClass(out, 'VHS_LoadVideo');
    assert.equal(vhs.length, 1, "one VHS loader seats the prior clip");
    assert.equal(vhs[0][1].inputs.force_rate, 24, "the VHS loader pins the film clock");
    assert.equal(vhs[0][1].inputs.video, 'clips/take.mp4', "the VHS loader reads the staged clip by name");
    const batch = ofClass(out, 'ImageFromBatch');
    assert.equal(batch.length, 1, "one ImageFromBatch takes the tail frame");
    assert.equal(batch[0][1].inputs.batch_index, -1, "the anchor is the LAST frame (negative index)");
    assert.equal(batch[0][1].inputs.length, 1, "exactly one frame rides the anchor");
    // the anchor rides the plan's picture seat AND the r2v pixel
    // anchor (the ref_image seat) — wires serialize [nodeKey, slot]
    const plan = ofClass(out, 'H3OneClickSwapPlan')[0]!;
    assert.deepEqual(plan[1].inputs.picture_1, [batch[0][0], 0], "the plan's picture_1 IS the last frame");
    const r2v = ofClass(out, 'MiniMaxH3ReferenceToVideo')[0]!;
    assert.deepEqual(r2v[1].inputs['ref_images.ref_image_0'], [batch[0][0], 0], "the r2v pixel anchor IS the last frame");
    assert.deepEqual(r2v[1].inputs['ref_videos.ref_video_0'], [vhs[0][0], 0], "the whole clip rides the motion-identity seat");
  });

  it("generates FRESH under an all-white mask at full denoise (nothing held)", () => {
    const walked = def.schema({ extend: [EXTEND_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_extend_fresh");
    const out = graphOf(g);
    const mask = ofClass(out, 'SolidMask');
    assert.equal(mask.length, 1, "one SolidMask seats the everywhere-generate mask");
    assert.equal(mask[0][1].inputs.value, 1, "the mask is all white (generate everywhere)");
    assert.ok(typeof mask[0][1].inputs.width !== 'number' && mask[0][1].inputs.width !== undefined,
      "the mask's width rides the chain's own geometry wire, never a hand literal");
    const target = ofClass(out, 'MiniMaxH3ContexMaskedTarget')[0]!;
    assert.equal(target[1].inputs.mask_meaning, 'white = generate', "white = generate (the fresh pole)");
    assert.equal(target[1].inputs.audio_mode, 'generate all audio', "the extension's seconds carry fresh audio");
    const sched = ofClass(out, 'BasicScheduler')[0]!;
    assert.equal(sched[1].inputs.denoise, 1, "full denoise — an extension generates, it never refines");
  });

  it("joins prior + new through the film tail's file law (prefix saves, chained boundaries, no ChainAssemble)", () => {
    const walked = def.schema({ extend: [EXTEND_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "runx");
    const out = graphOf(g);
    const saves = ofClass(out, 'SaveVideo');
    assert.equal(saves.length, 3, "three saves: prior re-save, new window, joined film");
    const prefixes = saves.map(([, n]) => n.inputs.filename_prefix).sort();
    assert.deepEqual(prefixes, ['runx/extend_film', 'runx/x0', 'runx/x1'], "the parts save at output-dir prefixes; the film lands under the run id");
    const concat = ofClass(out, 'MeliteConcatVideos');
    assert.equal(concat.length, 1, "one concat joins the saved FILES");
    assert.equal(concat[0][1].inputs.videos, 'runx/x0,runx/x1', "prior first, new window second — film order");
    assert.ok(concat[0][1].inputs.after !== undefined, "the concat waits on the boundary chain (the ordering proof)");
    const boundaries = ofClass(out, 'MeliteUnload');
    assert.equal(boundaries.length, 2, "one boundary per save, token-chained");
    // the boundary chain: one boundary's after wires the other's token
    const tokens = new Set(boundaries.map(([, n]) => n.inputs.after).filter((v) => v !== undefined));
    assert.equal(tokens.size, 1, "exactly one boundary chains onto the other — the concat's token depends on BOTH saves transitively");
    assert.equal(ofClass(out, 'MiniMaxH3ChainAssemble').length, 0,
      "no ChainAssemble terminal — its `_final.mp4` name is not a prefix the concat can glob (the join grammar this estate owns)");
  });

  it("refuses off-grid extend_seconds LOUD (never a silent snap)", () => {
    const walked = def.schema({
      extend: [{ ...EXTEND_ENTRY(), extend_seconds: 3.0 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, "run_extend_offgrid"),
      /length 72f is off-grid — the engine renders 22\+17k frames in \[22,362\]/,
      "3.0s = 72f is off-grid; the door names the grid and refuses",
    );
  });

  it("feeds the plan the exact grid landing (56f → 2.333…s, engine and door agree)", () => {
    const walked = def.schema({ extend: [EXTEND_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_extend_grid");
    const out = graphOf(g);
    const plan = ofClass(out, 'H3OneClickSwapPlan')[0]!;
    assert.equal(plan[1].inputs.clip_seconds, 56 / 24, "the stated 2.33s lands on 56f and feeds the plan as the exact grid fraction");
  });

  it("an armed extend resolves its default output to the LAST SaveVideo (the joined film)", () => {
    const walked = def.schema({ extend: [EXTEND_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_extend_flow_output");
    const out = graphOf(g);
    const flow = resolveCardFlowOutputs(def, walked, out);
    assert.deepEqual(flow.outputs, { default: "video" }, "the extend still serves the video channel");
    const node = out[flow.outputNodes.default!];
    assert.ok(node, "the resolved output node exists in the composed graph");
    assert.equal(node.class_type, "SaveVideo", "the armed extend resolves to the joined-film SaveVideo");
    assert.equal(node.inputs.filename_prefix, "run_extend_flow_output/extend_film", "the film, never a part-save");
  });
});

describe("the one-door-per-doc law (extend's three pairwise edges)", () => {
  // Each pair refuses LOUD with its OWN voice — the split-brain
  // lesson: one shared arm can mask another pair's silent drop.
  it("extend + replace refuses, naming both arms", () => {
    const walked = def.schema({
      replace: [{ source_clip: 'a.mp4', still: 's.png', swap_prompt: 'x' }],
      extend: [EXTEND_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, "run_door_ex"),
      /Replace and Extend are both armed — one door per doc \(both ride the same masked-edit spine; two armed bags would race for one emission\)/,
    );
  });

  it("extend + repair refuses, naming both arms", () => {
    const walked = def.schema({
      repair: [{ source_clip: 'a.mp4', repair_prompt: 'x', region_prompt: 'hands' }],
      extend: [EXTEND_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, "run_door_er"),
      /Repair and Extend are both armed — one door per doc/,
    );
  });

  it("extend + reshoot refuses, naming the silently-dropped arm", () => {
    const walked = def.schema({
      extend: [EXTEND_ENTRY()],
      reshoot_enabled: true,
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, "run_door_es"),
      /Extend and Reshoot are both armed — the extend branch never enters the film action/,
    );
  });
});

describe("the plan-input cure (the seat's own shots, never a source re-slice)", () => {
  // THE BUG (the unification survey, design §3): H3OneClickSwapPlan
  // SLICES its source by clip_seconds and a non-empty plan_json_input
  // OVERRIDES the literal — wiring it on extend would re-render the
  // PRIOR's own timeline, never a continuation. The literal rules;
  // the plan node contributes geometry only. Toggle-out red-proof:
  // re-wire plan_json_input on the extend seat and both arms red.
  it("single window: ChainPlanModern carries NO plan_json_input — the one literal continuation shot rules", () => {
    const walked = def.schema({ extend: [EXTEND_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_cure_single");
    const out = graphOf(g);
    const chainPlan = ofClass(out, 'MiniMaxH3ChainPlanModern')[0]!;
    assert.ok(chainPlan, "the chain plan serves");
    assert.equal(chainPlan[1].inputs.plan_json_input, undefined,
      "plan_json_input stays UNWIRED — the plan node's source slicing is the swap's semantics, never a continuation's");
    const plan = JSON.parse(chainPlan[1].inputs.plan_json as string) as { shots: Array<{ id: string; prompt: string }> };
    assert.equal(plan.shots.length, 1, "one literal shot");
    assert.equal(plan.shots[0]!.id, 'extend-1', "the shot is the extension's own");
    assert.equal(plan.shots[0]!.prompt, EXTEND_ENTRY().extend_prompt, "the shot carries the continuation prompt verbatim");
  });

  it("multi window: the literal carries one shot per composed window", () => {
    const walked = def.schema({
      extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_cure_multi");
    const out = graphOf(g);
    const chainPlan = ofClass(out, 'MiniMaxH3ChainPlanModern')[0]!;
    assert.equal(chainPlan[1].inputs.plan_json_input, undefined,
      "multi-window keeps the literal ruling too — N shots, never a source slice");
    const plan = JSON.parse(chainPlan[1].inputs.plan_json as string) as { shots: Array<{ id: string }> };
    assert.deepEqual(plan.shots.map((s) => s.id), ['extend-1', 'extend-2'],
      "379f composes exactly 2 windows: two literal continuation shots");
  });
});

describe("multi-window extend (the latent-carry assembly)", () => {
  it("composes 379f exactly as 2 windows of 209f under the 39f carry, assembling in-chain then appending to the prior by file", () => {
    const walked = def.schema({
      extend: [{ ...EXTEND_ENTRY(), extend_seconds: 379 / 24 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "runmw");
    const out = graphOf(g);
    // THE LATENT-CARRY LAW: N ≥ 2 windows assemble IN-CHAIN —
    // ChainAssemble owns the seams under the policy's overlap; the
    // assembled film then joins the raw prior BY FILE (the initial
    // boundary is the exception: a raw prior has no latents).
    const assemble = ofClass(out, 'MiniMaxH3ChainAssemble');
    assert.equal(assemble.length, 1, "one in-chain assembly composes the N windows");
    assert.equal(assemble[0][1].inputs.filename, 'runmw/extend_chain', "the assembled extension lands under the run id");
    assert.equal(assemble[0][1].inputs.audio_source, 'generated', "fresh content assembles the checkpointed H3 sound");
    const loopEnd = ofClass(out, 'MiniMaxH3ChainLoopEnd')[0]!;
    assert.deepEqual(assemble[0][1].inputs.manifest, [loopEnd[0], 0],
      "the assembly consumes the LoopEnd manifest — it fires only at true completion");
    // THE COMPOSE JOIN: prior re-muxed at x0, the assembled film
    // rides the concat's append seat (the exact wired path — the
    // DAG itself proves the assembly completed before the join).
    const saves = ofClass(out, 'SaveVideo');
    assert.equal(saves.length, 2, "two saves only: the prior re-mux and the joined film (the windows ride checkpoints, not SaveVideo)");
    const prefixes = saves.map(([, n]) => n.inputs.filename_prefix).sort();
    assert.deepEqual(prefixes, ['runmw/extend_film', 'runmw/x0'], "the prior re-muxes at x0; the film is the deliverable");
    const concat = ofClass(out, 'MeliteConcatVideos')[0]!;
    assert.equal(concat[1].inputs.videos, 'runmw/x0', "the prior is the sole prefix member");
    assert.deepEqual(concat[1].inputs.append, [assemble[0][0], 0],
      "the assembled extension appends LAST — ChainAssemble's video_path, wired");
    const boundaries = ofClass(out, 'MeliteUnload');
    assert.equal(boundaries.length, 1, "one boundary for the one prefix member (the append is DAG-proven, never boundary-proven)");
    const created = ofClass(out, 'CreateVideo');
    assert.equal(created.length, 2, "two container muxes: the prior re-mux (fps 24) and the join's own deliverable mux");
    assert.ok(created.some(([, n]) => n.inputs.fps === 24),
      "the prior re-mux pins the film clock (the extension arrives as a finished file)");
    const sched = ofClass(out, 'BasicScheduler')[0]!;
    assert.equal(sched[1].inputs.denoise, 1, "every window generates fresh — full denoise, nothing held");
  });

  it("refuses uncomposable stated frames, naming both neighbors (never a silent snap)", () => {
    const walked = def.schema({
      extend: [{ ...EXTEND_ENTRY(), extend_seconds: 20.0 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, "run_mw_refuse"),
      /stated 480f composes nowhere exactly.*nearest: 5 windows of 124f deliver 464f.*nearest: 2 windows of 260f deliver 481f/s,
      "20.0s = 480f lands nowhere; the door names the max-under (5×124−156=464f) and min-over (2×260−39=481f) compositions for re-statement",
    );
  });
});
