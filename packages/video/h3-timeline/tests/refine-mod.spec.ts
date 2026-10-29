// @contract cards-h3-refine-arm
// @melite/video-h3-timeline — the refine arm rows (the fifth mod
// bag). Drives the registered card's own doors (def.mods for the
// served kind, def.compose for the branch, resolveFlowOutputs for
// the terminal): the kind is served verbatim with the arm-gated
// packs, an absent or EMPTY bag leaves the film path byte-identical
// (zero handoff classes), a bound arm refuses LOUD — missing seats
// name the seat, full denoise names the sigmas law — and the
// complete entry composes the standalone second pass (VHS source →
// split-stream encode → the RefineHandoff at 2x → decode → the
// refine SaveVideo, no loop lineage). Every cross-arm pair refuses
// LOUD naming the silently-dropped arm. Every row asserts served
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
import { refineArmed } from "../../../models/h3/src/refine.ts";

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

// The refine-only classes (the handoff + the split-stream audio
// encode — zero of these may ever appear in a disarmed film graph:
// the film's handoff mounts only under upscale_route latent_2x and
// the film never encodes audio through VAEEncodeAudio).
const REFINE_CLASSES = [
  'MinimaxH3LatentUpscaler3DRefineHandoff',
  'VAEEncodeAudio',
];

const REFINE_ENTRY = (): Record<string, unknown> => ({
  source_clip: 'swap_film_v1.mp4',
  refine_prompt: 'the same scene, sharper fabric weave and cleaner edges',
});

const kind = () =>
  ((def as { mods?: Array<Record<string, unknown>> }).mods ?? [])
    .find((k) => k.kind === 'refine');

describe("the refine kind (the fifth mod bag)", () => {
  it("is served verbatim with the arm-gated packs and the refine seats", () => {
    const refine = kind();
    assert.ok(refine, "the h3-timeline card serves the refine kind on the modifiers channel");
    assert.equal(refine.param_key, 'refine', "the bag rides param_key 'refine'");
    assert.equal(refine.schema_key, 'refine', "the kind stamps its own catalog name (the mod-liveness ARM 3 attribution)");
    assert.equal(refine.max_stack, 1, "one refine per doc (max_stack 1)");
    assert.deepEqual(refine.requires, [
      'ComfyUI-VideoHelperSuite',
      'ComfyUI-KJNodes',
      'ComfyUI-MiniMaxH3Mod',
      'Comfyui_Minimax_h3_latent_Upscaler-Plus',
      'melite-utility-nodes',
    ], "the arm-gated packs: the VHS loader, the plane, the handoff, the resample tail");
    const names = ((refine as { fields?: Array<{ name?: string }> }).fields ?? []).map((f) => f.name);
    assert.deepEqual(names, [
      'source_clip', 'refine_prompt', 'denoise', 'steps', 'seed', 'clip_seconds',
    ], "exactly the refine seats — no mask seat (no masked edit), no keep_audio (the soundtrack is the source's own, fixed)");
  });

  it("is admitted on the card door — the stated bag is not an undeclared param", () => {
    assert.ok(((def as { admits?: string[] }).admits ?? []).includes('refine'), "the card admits the refine bag");
  });

  it("leaves the film path byte-identical with the arm empty — zero handoff classes", () => {
    for (const bag of [undefined, []]) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        ...(bag === undefined ? {} : { refine: bag }),
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      def.compose(walked, model, g, 'run_rfmod_disarmed');
      const out = graphOf(g);
      for (const cls of REFINE_CLASSES) {
        assert.equal(ofClass(out, cls).length, 0, `a disarmed film carries no ${cls}`);
      }
    }
  });

  it("a two-entry bag refuses LOUD — max_stack 1 is never a silent first-wins", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [REFINE_ENTRY(), { ...REFINE_ENTRY(), source_clip: 'other.mp4' }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, 'run_rfmod_two'),
      /h3-timeline refine: the refine bag carries 2 entries — max_stack is 1, so every entry after the first would be silently dropped/,
      'the second entry refuses naming the silent-drop class',
    );
  });

  it("the arm predicate is bag presence — armed only on a non-empty array", () => {
    assert.equal(refineArmed({}), false, 'no bag is disarmed');
    assert.equal(refineArmed({ refine: [] }), false, 'an empty bag is disarmed');
    assert.equal(refineArmed({ refine: [REFINE_ENTRY()] }), true, 'one entry is armed');
  });

  it("an armed bag refuses LOUD naming the empty seat", () => {
    for (const [entry, re] of [
      [{ refine_prompt: 'x' }, /h3-timeline refine: 'source_clip' names no media/],
      [{ source_clip: 'c.mp4' }, /h3-timeline refine: 'refine_prompt' names no media/],
    ] as Array<[Record<string, unknown>, RegExp]>) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine: [entry],
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      assert.throws(
        () => def.compose(walked, model, g, 'run_rfmod_seat'),
        re,
        'the refusal names the empty seat',
      );
    }
  });

  it("a full-denoise refine refuses LOUD naming the handoff sigmas law", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [{ ...REFINE_ENTRY(), denoise: 1 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, 'run_rfmod_denoise'),
      /h3-timeline refine: denoise 1 >= 1 — a second pass is a refine, never a re-render/,
      'denoise 1 is the reshoot door, never this arm',
    );
  });

  it("a bound arm composes the standalone second pass — the handoff at 2x on the family plane", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [REFINE_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, 'run_rfmod_armed');
    const out = graphOf(g);
    // the loader law: one force-rate-24 VHS read of the staged leaf.
    const loaders = ofClass(out, 'VHS_LoadVideo');
    assert.equal(loaders.length, 1, 'exactly one shared VHS loader');
    assert.equal(loaders[0]![1].inputs['video'], 'swap_film_v1.mp4', 'the loader reads the staged source clip');
    assert.equal(loaders[0]![1].inputs['force_rate'], 24, 'the film clock, never a private cadence');
    // the split-stream encode: video + audio latents.
    assert.equal(ofClass(out, 'VAEEncode').length, 1, 'the frames encode to the video latent');
    assert.equal(ofClass(out, 'VAEEncodeAudio').length, 1, 'the soundtrack encodes to the audio latent');
    const cond = ofClass(out, 'CLIPTextEncode');
    assert.ok(cond.some(([, n]) => n.inputs['text'] === 'the same scene, sharper fabric weave and cleaner edges'), 'the refine prompt rides the positive seat');
    // THE HANDOFF (the one-variant law): single node, 2x, locked
    // audio, the learned weights, the partial-denoise schedule.
    const hands = ofClass(out, 'MinimaxH3LatentUpscaler3DRefineHandoff');
    assert.equal(hands.length, 1, 'exactly one handoff — no external guider or second sampler');
    const h = hands[0]![1].inputs;
    assert.equal(h['model_name'], 'minimax_h3_latent_upscaler_3d_bf16.safetensors', 'the learned 3D-conv weights');
    assert.equal(h['mode'], 'scale by multiplier', 'the film handoff spelling');
    assert.equal(h['scale'], 2.0, 'ONE variant path: 2x');
    assert.equal(h['lock_audio'], true, 'the soundtrack is the source\'s own, fixed');
    assert.equal(h['precision'], 'bf16', 'the film handoff precision');
    assert.equal(h['device'], 'cuda', 'the film handoff device');
    const sched = ofClass(out, 'BasicScheduler');
    assert.ok(sched.some(([, n]) => n.inputs?.['denoise'] === 0.32), 'the refinement window (default 0.32) rides the schedule');
    // decode + the film tail's file law, no loop lineage.
    assert.equal(ofClass(out, 'VAEDecode').length, 1, 'the upscaled latent decodes');
    assert.equal(ofClass(out, 'VAEDecodeAudio').length, 1, 'the refined soundtrack decodes');
    const saves = ofClass(out, 'SaveVideo');
    assert.equal(saves.length, 1, 'a single terminal SaveVideo');
    assert.equal(String(saves[0]![1].inputs['filename_prefix']), 'run_rfmod_armed/refine', 'the refine prefix rides the run id');
    assert.equal(ofClass(out, 'MiniMaxH3ChainAssemble').length, 0, 'no ChainAssemble — a refine has no loop lineage to assemble');
  });

  it("an armed refine resolves its default output to the refine SaveVideo", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      refine: [REFINE_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, 'run_rfmod_out');
    const flow = resolveCardFlowOutputs(def, walked, graphOf(g));
    assert.deepEqual(flow.outputs, { default: 'video' }, 'the refine still serves the video channel');
    const out = graphOf(g);
    const node = out[flow.outputNodes.default!];
    assert.ok(node, 'the resolved output node exists in the composed graph');
    assert.equal(node.class_type, 'SaveVideo', 'the armed refine resolves to a SaveVideo');
    assert.equal(node.inputs.filename_prefix, 'run_rfmod_out/refine', 'the refine terminal, never a film save');
  });

  it("every cross-arm pair refuses LOUD naming the silently-dropped arm", () => {
    const edges: Array<[string, Record<string, unknown>, RegExp]> = [
      ['replace', { replace: [{ source_clip: 'c.mp4', still: 's.png', mannequin: 'm.mp4', mask: 'k.png', swap_prompt: 'x' }] }, /Replace and Refine are both armed — one door per doc \(the refine branch never enters the film action; two armed bags would race for one emission\)\. Empty the Replace arm for a refine/],
      ['repair', { repair: [{ source_clip: 'c.mp4', repair_prompt: 'x', region_prompt: 'hands' }] }, /Repair and Refine are both armed — one door per doc \(the refine branch never enters the film action; two armed bags would race for one emission\)\. Empty the Repair arm for a refine/],
      ['extend', { extend: [{ source_clip: 'c.mp4', extend_prompt: 'x', extend_seconds: 3.75 }] }, /Extend and Refine are both armed — one door per doc \(the refine branch never enters the film action; two armed bags would race for one emission\)\. Empty the Extend arm for a refine/],
      ['reshoot', { reshoot: [{ source_clip: 'c.mp4', orbit: 12 }] }, /Refine and Reshoot are both armed — the refine branch never enters the film action.*empty the Refine arm for a reshoot/],
    ];
    for (const [name, arm, re] of edges) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        refine: [REFINE_ENTRY()],
        ...arm,
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      assert.throws(
        () => def.compose(walked, model, g, `run_rfmod_${name}`),
        re,
        `refine + ${name} refuses naming the silently-dropped arm`,
      );
    }
  });
});
