// @melite/video-h3-timeline — the repair arm rows (the replace arm's
// own harness): drives the registered card's own doors — def.mods for
// the served kind, def.compose for the branch. The kind is served
// verbatim with the arm-gated packs, the film path is byte-identical
// with the arm empty (zero repair classes), and a bound arm refuses
// LOUD on every law edge (missing seat, reshoot conflict, the
// replace↔repair mutual refusal, the denoise ceiling) while complete
// seats compose the masked second-pass chain ending in
// MiniMaxH3ChainAssemble. Every row asserts served truth or refusal
// text — never expect(true).
import "../../../../tests/helpers/boot-models.ts";
import { beforeAll, describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

// The repair-only classes (zero of these may ever appear in a film
// graph — the inline SAM3 mask chain and its loader-side helpers are
// this arm's alone; the shared chain tail pins inside the emission
// row, never absent here).
const REPAIR_CLASSES = [
  'SAM3_VideoTrack',
  'SAM3_TrackToMask',
  'GrowMaskWithBlur',
  'ImageScaleToMaxDimension',
  'ImageFromBatch',
  'CheckpointLoaderSimple',
];

const REPAIR_ENTRY = (): Record<string, unknown> => ({
  source_clip: 'clips/take.mp4',
  repair_prompt: 'the same hands, five clean fingers, gripping the cup',
  region_prompt: 'hands',
});

describe("the repair kind", () => {
  it("is served verbatim with the arm-gated packs", () => {
    const kinds = (def as { mods?: Array<Record<string, unknown>> }).mods ?? [];
    const repair = kinds.find((k) => k.kind === 'repair');
    assert.ok(repair, "the h3-timeline card serves the repair kind on the modifiers channel");
    assert.equal(repair.param_key, 'repair', "the bag rides param_key 'repair'");
    assert.equal(repair.max_stack, 1, "one repair per doc (max_stack 1)");
    assert.equal(repair.schema_key, 'repair', "the kind stamps its own catalog name (the mod-liveness ARM 3 attribution)");
    assert.deepEqual(repair.requires, [
      'ComfyUI-VideoHelperSuite',
      'ComfyUI-MiniMaxH3-Context-Loop',
      'ComfyUI-Fantastic-MiniMaxH3-PromptBuilder',
      'ComfyUI-KJNodes',
      'comfyui-h3-oneclick-swap',
    ], "the kind's arm names exactly the repair packs (VHS loader, chain, edit latent, mask grow, plan head)");
    const names = ((repair.fields as Array<Record<string, unknown>>) ?? []).map((f) => f.name);
    for (const seat of ['source_clip', 'repair_prompt', 'region_prompt']) {
      assert.ok(names.includes(seat), `the kind declares the '${seat}' seat (a repair needs all three bound)`);
    }
  });

  it("serves its seats typed, with the denoise ceiling + region law stated on the surface", () => {
    const kinds = (def as { mods?: Array<Record<string, unknown>> }).mods ?? [];
    const repair = kinds.find((k) => k.kind === 'repair');
    assert.ok(repair, "the h3-timeline card serves the repair kind on the modifiers channel");
    const by = Object.fromEntries(
      ((repair.fields as Array<Record<string, unknown>>) ?? []).map((f) => [f.name, f]),
    );
    assert.equal(by.source_clip.type, 'file', "the source-clip seat claims the file square");
    assert.equal(by.source_clip.media, 'video', "the source-clip seat narrows the picker + OS accept to video");
    assert.equal(by.repair_prompt.type, 'text', "the repair prompt is an agent-authored text seat");
    assert.equal(by.region_prompt.type, 'text', "the region prompt is a free-text detection target, never a closed enum (region-agnostic law)");
    assert.ok(String(by.region_prompt.tooltip).includes('"hands"'),
      "the region tooltip names the param values (hands / a person / a face) — no card-per-region");
    // THE DENOISE CEILING (the refine window law): the field's hint
    // bounds are 0.05–0.50 with the 0.32 default; the loud >= 1
    // refusal lives at the compose door (the row below).
    assert.equal(by.denoise.type, 'number');
    assert.equal(by.denoise.default, 0.32, "the default sits in the 0.30–0.35 refine window");
    assert.equal(by.denoise.min, 0.05, "the hint floor");
    assert.equal(by.denoise.max, 0.5, "the hint ceiling (compose refuses >= 1 loud)");
    // The plan tier vocabulary, closed (same tiers as the swap arm).
    assert.equal(by.resolution.type, 'select');
    assert.deepEqual(
      ((by.resolution.options as Array<{ value: string }>) ?? []).map((o) => o.value),
      ['480p', '576p', '736p', '768p', '1080p'],
      "the resolution tiers mirror the H3OneClickSwapPlan enum (never freeform)",
    );
  });

  it("rides the card's admission (a doc carrying it is not unknown-param)", () => {
    assert.ok((def.admits ?? []).includes('repair'), "the repair bag rides admits (the bag key only)");
    const kinds = (def as { mods?: Array<Record<string, unknown>> }).mods ?? [];
    const repair = kinds.find((k) => k.kind === 'repair');
    const fields = ((repair?.fields as Array<Record<string, unknown>>) ?? []).map((f) => String(f.name));
    assert.ok(fields.length > 0, "the kind declares entry fields to judge against");
    for (const name of fields) {
      assert.ok(!(def.admits ?? []).includes(name), `entry field '${name}' rides no admit — the flat spelling refuses (bag key only)`);
    }
  });

  it("leaves the film byte-identical with the arm empty (zero repair classes)", () => {
    const walked = def.schema({}) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_repair_empty");
    const out = graphOf(g);
    for (const cls of REPAIR_CLASSES) {
      assert.equal(ofClass(out, cls).length, 0, `the empty-arm film composes no ${cls} (the repair vocabulary never leaks into a film graph)`);
    }
    assert.ok(ofClass(out, 'SaveVideo').length > 0, "the empty-arm film still delivers its SaveVideo");
  });

  it("a bound arm with a missing seat refuses naming the seat", () => {
    const entry = REPAIR_ENTRY();
    delete entry.region_prompt;
    const walked = def.schema({ repair: [entry] }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_repair_missing_seat"),
      /'region_prompt' names no media/,
      "the armed repair with no region prompt refuses loud naming the seat (the reshoot idiom — never a silent half-build)",
    );
  });

  it("a present-but-empty bag refuses loud (never a quiet film)", () => {
    const walked = def.schema({ repair: {} }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_repair_empty_bag"),
      /repair bag is present but carries no entry/,
    );
  });

  it("a bound arm under an armed reshoot refuses naming the conflict (one door per doc)", () => {
    const walked = def.schema({ repair: [REPAIR_ENTRY()], reshoot: [{ source_clip: 'sources/take3.mp4' }] }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_repair_reshoot_conflict"),
      /Repair and Reshoot are both armed/,
      "the repair branch returns before the film action, so a reshoot under it would be silently dropped — refuse loud instead",
    );
  });

  it("Replace and Repair both armed refuse naming the conflict (the one-door law's second edge)", () => {
    const walked = def.schema({
      replace: [{
        source_clip: 'clips/source.mp4', still: 'stills/hero.png',
        mannequin: 'masks/mannequin.mp4', mask: 'masks/person.png',
        swap_prompt: 'the same person smiling',
      }],
      repair: [REPAIR_ENTRY()],
    }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_replace_repair_conflict"),
      /Replace and Repair are both armed/,
      "both arms ride the same masked-edit spine — two armed bags would race for one emission; refuse loud, never a quiet first-wins",
    );
  });

  it("a denoise at or above 1 refuses loud (a repair is a refine, never a re-render)", () => {
    const walked = def.schema({ repair: [{ ...REPAIR_ENTRY(), denoise: 1 }] }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_repair_boil"),
      /denoise 1 >= 1.*never a re-render/s,
      "full denoise would boil the held region into a new take — the sigmas law precedent (actions.ts refine arm) guards this seat",
    );
  });

  it("a bound arm composes the masked second-pass chain on the family's own plane", () => {
    const walked = def.schema({ repair: [REPAIR_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_repair_emission");
    const out = graphOf(g);
    for (const cls of [...REPAIR_CLASSES, 'CLIPTextEncode', 'MiniMaxH3ChainPlanModern',
      'MiniMaxH3SourceTimeline', 'MiniMaxH3ChainLoopStart', 'MiniMaxH3ChainCurrent',
      'H3SourceSlice', 'MiniMaxH3FantasticVideoEditLatent', 'MiniMaxH3ContexMaskedTarget',
      'MiniMaxH3ChainContext', 'MiniMaxH3LoopTrim', 'MiniMaxH3ChainSegmentSave',
      'MiniMaxH3ChainReview', 'MiniMaxH3ChainLoopEnd', 'MiniMaxH3ChainAssemble',
      'H3OneClickSwapPlan']) {
      assert.ok(ofClass(out, cls).length > 0, `the armed repair composes ${cls} (the shared spine, emission-landed)`);
    }
    // THE OPERATOR'S LORA LAW: the repair rides the family's own
    // plane — the shared h3MaskedEditPlane, never a hand-rolled stack.
    const ltx = ofClass(out, 'LTX_lora_loader');
    assert.ok(ltx.length > 0, "the repair composes LTX_lora_loader (the family lora plane, shared with the swap)");
    assert.equal(ofClass(out, 'LoraLoaderModelOnly').length, 0, "no fixed accelerator row rides");
    assert.equal(ofClass(out, 'ModelAttentionBackend').length, 0, "no reference attention-backend substitution");
    assert.ok(ofClass(out, 'H3SLAAttention').length > 0, "the family SLA chain renders under the repair");
    // THE SAM3 MASK LAW: per-frame, inline, region-prompted, grown.
    assert.equal(ofClass(out, 'CheckpointLoaderSimple')[0]![1].inputs.ckpt_name,
      'sam3.1_multiplex_fp16.safetensors', "the mask family's declared SAM3 weights");
    assert.equal(ofClass(out, 'CLIPTextEncode')[0]![1].inputs.text, 'hands', "the region prompt drives detection");
    assert.equal(ofClass(out, 'SAM3_VideoTrack')[0]![1].inputs.max_objects, 0, "all tracked objects — the union is the region");
    assert.equal(ofClass(out, 'SAM3_TrackToMask')[0]![1].inputs.object_indices, '', "empty indices = union");
    assert.equal(ofClass(out, 'GrowMaskWithBlur')[0]![1].inputs.expand, 16, "the default grow stamps the seat");
    // NO STAGED MASK: the swap's PNG seats never appear on a repair.
    assert.equal(ofClass(out, 'LoadImage').length, 0, "no staged still or mask image (the source is its own anchor)");
    assert.equal(ofClass(out, 'ImageToMask').length, 0, "no staged-PNG mask decode (the mask is inline SAM3)");
    // THE MASKED-EDIT OPERATING POINT: grow 0, megapixels 0 (the
    // mask seats the region; the canvas never moves), white =
    // generate, H3 exact conversion, partial denoise on the scheduler.
    const edit = ofClass(out, 'MiniMaxH3FantasticVideoEditLatent')[0]![1].inputs;
    assert.equal(edit.grow, 0, "edit latent grow 0 (zero new pixel positions)");
    assert.equal(edit.megapixels, 0, "edit latent megapixels 0 (the clip's own geometry)");
    assert.equal(edit.keep_audio, true, "the edit latent keeps the source audio");
    const target = ofClass(out, 'MiniMaxH3ContexMaskedTarget')[0]![1].inputs;
    assert.equal(target.mask_meaning, 'white = generate', "white = generate (the SAM3 union is the generate region)");
    assert.equal(target.mask_conversion, 'H3 exact (causal/token max)', "the H3 exact conversion");
    assert.equal(target.audio_mode, 'preserve source audio', "audio is held");
    assert.equal(ofClass(out, 'BasicScheduler')[0]![1].inputs.denoise, 0.32, "the partial denoise default (the refine window)");
    // THE LOOP TAIL: requeue mode (the swap-chain burn's law, mirrored).
    assert.equal(ofClass(out, 'MiniMaxH3ChainLoopEnd')[0]![1].inputs.execution_mode, 'top_level_requeue', "the repair rides the requeue driver");
    const assemble = ofClass(out, 'MiniMaxH3ChainAssemble')[0]![1].inputs;
    assert.equal(assemble.filename, 'run_repair_emission/repair', "the repair assembles under the run tree (<runId>/repair)");
    assert.equal(assemble.audio_source, 'source', "the soundtrack is the source's own, always");
    // THE ANCHOR: the source rides its own ref_video seat — no still.
    const r2vInputs = ofClass(out, 'MiniMaxH3ReferenceToVideo')[0]![1].inputs;
    assert.ok(r2vInputs["ref_videos.ref_video_0"] !== undefined, "ref_video_0 = the source frames (the identity anchor)");
    assert.ok(!Object.keys(r2vInputs).some((k) => k.startsWith("ref_images.")), "no still rides the conditioner");
  });

  it("a stated denoise + grow + window stamp their seats (seats, not shadows)", () => {
    const walked = def.schema({
      repair: [{ ...REPAIR_ENTRY(), denoise: 0.25, mask_grow: 0, window_start: 48, window_length: 124 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_repair_stated");
    const out = graphOf(g);
    assert.equal(ofClass(out, 'BasicScheduler')[0]![1].inputs.denoise, 0.25, "a stated denoise stamps the scheduler");
    assert.equal(ofClass(out, 'GrowMaskWithBlur')[0]![1].inputs.expand, 0, "a stated grow 0 stamps the grow seat (the seam-ring test posture)");
    const vhs = ofClass(out, 'VHS_LoadVideo')[0]![1].inputs;
    assert.equal(vhs.skip_first_frames, 48, "VHS skips to the window head");
    assert.equal(vhs.frame_load_cap, 124, "VHS caps at the window length");
    assert.equal(ofClass(out, 'MiniMaxH3SourceTimeline')[0]![1].inputs.skip_first_frames, 48,
      "the timeline maps the same window (both loaders stamped identically)");
  });

  it("F4/F5: the served surface states ONE WINDOW PER DOC — the arm emits a window, never a film", () => {
    // The friction report's F4/F5 (2026-10-30, still open as DESIGN
    // debt): a doc carries ONE repair window and the arm assembles a
    // WINDOW artifact, so an agent asked to repair a long film must
    // press per window at the step the walk teaches. The door cannot
    // say nothing: an empty surface reads as "name the clip and I fix
    // the film". Judge the served section text (the surface the agent
    // reads), never a doc the client may not load.
    const repair = (def.mods ?? []).find((k) => (k as unknown as { param_key?: string }).param_key === 'repair')! as unknown as { section: string; max_stack: number };
    assert.equal(repair.max_stack, 1, "one entry per doc (the bag is the window seat)");
    assert.match(repair.section, /ONE WINDOW PER DOC/,
      "the served section names the one-window law");
    assert.match(repair.section, /68 f step/,
      "the served section names the step a film walk uses (window 90 − carry 22)");
    assert.match(repair.section, /emits a window, never a re-assembled film/,
      "the served section refuses the film promise the arm cannot keep");
    // and the leaf's recipe agrees with the surface (one home per fact
    // is not licence for two different numbers).
    const md = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'agents', 'skills', 'repair', 'SKILL.md'), 'utf-8');
    assert.match(md, /one press per window|ONE WINDOW PER DOC|one press, no splice/i,
      "the leaf teaches the same window-per-press walk");
  });

  it("F3: the served window_length tooltip states the 22+17k grid the compose enforces", () => {
    const kind = ((def as unknown as { mods: Array<Record<string, unknown>> }).mods)
      .find((k) => k.kind === "repair")!
    const fields = ((kind.fields ?? []) as Array<{ name: string; tooltip?: string }>)
    const seat = fields.find((f) => f.name === "window_length")!
    assert.ok(seat, "the repair kind serves the window_length seat")
    assert.match(String(seat.tooltip), /22\+17k/, "the tooltip names the engine grid");
    assert.match(String(seat.tooltip), /nearest legal/i, "the tooltip states the refusal, not just a range");
  });

  it("the entry scalars stamp the plan head verbatim (the reference operating point)", () => {
    const walked = def.schema({
      repair: [{ ...REPAIR_ENTRY(), seed: 4242, steps: 8, clip_seconds: 3, resolution: '1080p' }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_repair_plan");
    const out = graphOf(g);
    const head = ofClass(out, 'H3OneClickSwapPlan')[0]![1].inputs;
    assert.equal(head.seed, 4242, "a stated seed stamps the plan head");
    assert.equal(head.steps, 8, "a stated steps stamps the plan head");
    assert.equal(head.clip_seconds, 3, "a stated clip_seconds stamps the plan head");
    assert.equal(head.resolution, '1080p', "a stated tier overrides the 736p default");
    assert.equal(head.roles, '', "the repair carries no roles seat (the region prompt selects, never a person roster)");
    const chain = ofClass(out, 'MiniMaxH3ChainPlanModern')[0]![1].inputs;
    assert.equal(chain.base_seed, 4242, "the chain plan carries the stated base_seed");
    assert.equal(chain.default_steps, 8, "the chain plan carries the stated default_steps");
    assert.equal(chain.default_duration_seconds, 3, "the chain plan carries the stated duration");
    assert.equal(JSON.parse(String(chain.plan_json)).shots[0].id, 'repair', "the plan carries the repair shot");
    assert.equal(JSON.parse(String(chain.plan_json)).shots[0].prompt, 'the same hands, five clean fingers, gripping the cup',
      "the repair prompt rides the shot (the authored action, never a describer)");
  });

  it("an armed repair resolves its default output to MiniMaxH3ChainAssemble (the flow-output wall)", () => {
    const walked = def.schema({ repair: [REPAIR_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_repair_flow_output");
    const out = graphOf(g);
    const flow = resolveCardFlowOutputs(def, walked, out);
    assert.deepEqual(flow.outputs, { default: "video" }, "the repair still serves the video channel");
    const node = out[flow.outputNodes.default!];
    assert.ok(node, "the resolved output node exists in the composed graph");
    assert.equal(node.class_type, "MiniMaxH3ChainAssemble", "the armed repair resolves to the assemble terminal");
  });
});
