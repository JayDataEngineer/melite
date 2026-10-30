// @contract cards-h3-upscale-arm
// @melite/video-h3-timeline — the upscale arm rows (the sixth mod
// bag, F19). Drives the registered card's own doors (def.mods for
// the served kind, def.compose for the branch, resolveFlowOutputs
// for the terminal): the kind is served verbatim with the arm-gated
// packs, an absent or EMPTY bag leaves the film path byte-identical
// (zero loop classes), a bound arm refuses LOUD — an empty
// chain_run names the seat, full denoise names the sigmas law — and
// the complete entry composes the deferred 2x loop over the named
// run (CheckpointManager at the BARE NAME → Adapter → Current →
// ReferenceConditioning → LatentUpscaler3D at 2x → Sync →
// Pass2Prepare → the res_multistep tail → SegmentSave → LoopEnd →
// ChainAssemble at <runId>/upscale). Every cross-arm pair refuses
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
import { upscaleArmed } from "../../../models/h3/src/chainUpscale.ts";

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

// The loop-only classes — zero of these may ever appear in a
// disarmed film graph (the film never mounts the upscale family).
const UPSCALE_CLASSES = [
  'MiniMaxH3ChainCheckpointManager',
  'MiniMaxH3ChainUpscaleAdapter',
  'MiniMaxH3ChainUpscaleCurrent',
  'MiniMaxH3ChainPass2Prepare',
  'MiniMaxH3ChainUpscaleLoopEnd',
];

const UPSCALE_ENTRY = (): Record<string, unknown> => ({
  chain_run: 'swap_0154b9ae9c',
  prompt: 'the same film at twice the resolution, cleaner edges',
});

const kind = () =>
  ((def as { mods?: Array<Record<string, unknown>> }).mods ?? [])
    .find((k) => k.kind === 'upscale');

describe("the upscale kind (the sixth mod bag)", () => {
  it("is served verbatim with the arm-gated packs and the upscale seats", () => {
    const upscale = kind();
    assert.ok(upscale, "the h3-timeline card serves the upscale kind on the modifiers channel");
    assert.equal(upscale.param_key, 'upscale', "the bag rides param_key 'upscale'");
    assert.equal(upscale.schema_key, 'upscale', "the kind stamps its own catalog name (the mod-liveness ARM 3 attribution)");
    assert.equal(upscale.max_stack, 1, "one upscale per doc (max_stack 1)");
    assert.deepEqual(upscale.requires, [
      'ComfyUI-MiniMaxH3-Context-Loop',
      'Comfyui_Minimax_h3_latent_Upscaler-Plus',
      'melite-utility-nodes',
    ], "the arm-gated packs: the loop family, the learned 3D upscaler, the estate's listing route");
    const names = ((upscale as { fields?: Array<{ name?: string }> }).fields ?? []).map((f) => f.name);
    assert.deepEqual(names, [
      'chain_run', 'prompt', 'denoise', 'steps', 'segment_crf',
    ], "exactly the upscale seats — no source_clip (the loop roots at a prior run's lineage, never a staged clip), no seed (the loop's Current owns it)");
  });

  it("is admitted on the card door — the stated bag is not an undeclared param", () => {
    assert.ok(((def as { admits?: string[] }).admits ?? []).includes('upscale'), "the card admits the upscale bag");
  });

  it("leaves the film path byte-identical with the arm empty — zero loop classes", () => {
    for (const bag of [undefined, []]) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        ...(bag === undefined ? {} : { upscale: bag }),
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      def.compose(walked, model, g, 'run_upmod_disarmed');
      const out = graphOf(g);
      for (const cls of UPSCALE_CLASSES) {
        assert.equal(ofClass(out, cls).length, 0, `a disarmed film carries no ${cls}`);
      }
    }
  });

  it("a two-entry bag refuses LOUD — max_stack 1 is never a silent first-wins", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      upscale: [UPSCALE_ENTRY(), { ...UPSCALE_ENTRY(), chain_run: 'other' }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, 'run_upmod_two'),
      /h3-timeline upscale: the upscale bag carries 2 entries — max_stack is 1, so every entry after the first would be silently dropped/,
      'the second entry refuses naming the silent-drop class',
    );
  });

  it("the arm predicate is bag presence — armed only on a non-empty array", () => {
    assert.equal(upscaleArmed({}), false, 'no bag is disarmed');
    assert.equal(upscaleArmed({ upscale: [] }), false, 'an empty bag is disarmed');
    assert.equal(upscaleArmed({ upscale: [UPSCALE_ENTRY()] }), true, 'one entry is armed');
  });

  it("an armed bag with no chain_run refuses LOUD naming the seat", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      upscale: [{ prompt: 'x' }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, 'run_upmod_seat'),
      /h3-timeline upscale: 'chain_run' names no run — .*an upscale needs the prior chain run bound/,
      'the refusal names the empty seat',
    );
  });

  it("a full-denoise upscale refuses LOUD naming the sigmas law", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      upscale: [{ ...UPSCALE_ENTRY(), denoise: 1 }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    assert.throws(
      () => def.compose(walked, model, g, 'run_upmod_denoise'),
      /h3-timeline upscale: denoise 1 >= 1 — a second pass is an upscale, never a re-render/,
      'denoise 1 is the reshoot door, never this arm',
    );
  });

  it("a bound arm composes the deferred 2x loop — the bare name at the head, the family plane beneath", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      upscale: [UPSCALE_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, 'run_upmod_armed');
    const out = graphOf(g);
    // THE SELECTION LAW: the CheckpointManager carries the BARE run
    // name — the execute door resolves it to the newest per-scene
    // lineage (resolveH3ChainSelections), never a hand-authored JSON
    // here.
    const managers = ofClass(out, 'MiniMaxH3ChainCheckpointManager');
    assert.equal(managers.length, 1, 'exactly one CheckpointManager at the head');
    assert.equal(managers[0]![1].inputs['selection_json'], 'swap_0154b9ae9c', 'the bare chain-run name, resolved at the execute door');
    // the adapter: the family's own defaults + the entry's crf.
    const adapters = ofClass(out, 'MiniMaxH3ChainUpscaleAdapter');
    assert.equal(adapters.length, 1, 'exactly one UpscaleAdapter');
    const a = adapters[0]![1].inputs;
    assert.equal(a['profile'], 'h3_2x', 'the 2x latent profile');
    assert.equal(a['backend'], 'h3_latent', 'the latent backend');
    assert.equal(a['start_clip'], 1, 'the whole run from scene 1');
    assert.equal(a['end_clip'], 0, 'through the final source scene');
    assert.equal(a['segment_crf'], 18, 'the adapter segment quality (default 18)');
    assert.equal(a['start_mode'], 'resume', 'resume — earlier saved HQ scenes verify, never re-render');
    // the conditioning rebuild: the entry's prompt rides the override.
    const conds = ofClass(out, 'MiniMaxH3ChainUpscaleReferenceConditioning');
    assert.equal(conds.length, 1, 'exactly one ReferenceConditioning');
    assert.equal(conds[0]![1].inputs['prompt_override'], 'the same film at twice the resolution, cleaner edges', 'the pass-2 prompt rides the override seat');
    // THE ONE-VARIANT LAW: the learned 3D upscaler at 2x, the
    // family's single weights spelling, bf16 on cuda.
    const ups = ofClass(out, 'MinimaxH3LatentUpscaler3D');
    assert.equal(ups.length, 1, 'exactly one learned upscaler');
    const u = ups[0]![1].inputs;
    assert.equal(u['model_name'], 'minimax_h3_latent_upscaler_3d_bf16.safetensors', 'the family weights (the file the engine store carries)');
    assert.equal(u['mode'], 'scale by multiplier', 'the multiplier spelling');
    assert.equal(u['scale'], 2.0, 'ONE variant path: 2x');
    assert.equal(u['precision'], 'bf16', 'bf16 weights, bf16 compute');
    assert.equal(u['offload_after_upscale'], true, 'offload after — the recipe posture, VRAM freed for pass 2');
    // pass 2: Pass2Prepare + the res_multistep tail at the entry's
    // denoise/steps, DisableNoise (Pass2Prepare owns the noise
    // member).
    assert.equal(ofClass(out, 'MiniMaxH3ChainPass2Prepare').length, 1, 'exactly one Pass2Prepare');
    const sels = ofClass(out, 'KSamplerSelect');
    assert.equal(sels.length, 2, 'the plane\'s euler select + the loop family\'s own');
    assert.ok(sels.some(([, n]) => n.inputs['sampler_name'] === 'res_multistep'), 'the pass-2 sampler is res_multistep, the recipe spelling');
    assert.ok(sels.some(([, n]) => n.inputs['sampler_name'] === 'euler'), 'the family plane\'s select still mounts');
    assert.equal(ofClass(out, 'DisableNoise').length, 1, 'the tail\'s noise is disabled — Pass2Prepare owns it');
    const sched = ofClass(out, 'BasicScheduler');
    assert.ok(sched.some(([, n]) => n.inputs?.['denoise'] === 0.24 && n.inputs?.['steps'] === 20 && n.inputs?.['scheduler'] === 'simple'), 'the pass-2 window (0.24/20/simple) rides the schedule');
    // THE FAMILY PLANE: the shared stack, never a hand-rolled one.
    assert.equal(ofClass(out, 'H3SLAAttention').length, 1, 'the family plane\'s SLA seat mounts');
    assert.equal(ofClass(out, 'LTX_lora_loader').length, 1, 'the operator\'s lora law seat mounts');
    assert.equal(ofClass(out, 'MiniMaxH3SigmaShift').length, 1, 'the family plane\'s sigma shift mounts');
    // the loop tail + the estate's assemble law.
    assert.equal(ofClass(out, 'MiniMaxH3ChainUpscaleLoopEnd').length, 1, 'exactly one UpscaleLoopEnd');
    const loopEnd = ofClass(out, 'MiniMaxH3ChainUpscaleLoopEnd')[0]![1];
    assert.ok(Array.isArray(loopEnd.inputs['flow']), 'the raw adapter flow wire rides the LoopEnd');
    const assembles = ofClass(out, 'MiniMaxH3ChainAssemble');
    assert.equal(assembles.length, 1, 'a single ChainAssemble terminal');
    const asm = assembles[0]![1].inputs;
    assert.equal(asm['filename'], 'run_upmod_armed/upscale', 'the assemble prefix rides the run id');
    assert.equal(asm['copy_to_output'], true, 'the estate film law — the assembled file lands in the output tree');
    assert.equal(asm['audio_source'], 'plan', 'the plan\'s own soundtrack policy');
    assert.equal(ofClass(out, 'SaveVideo').length, 0, 'no film SaveVideo — the loop assembles, never the film tail');
  });

  it("an armed upscale resolves its default output to the ChainAssemble terminal", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      upscale: [UPSCALE_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, 'run_upmod_out');
    const flow = resolveCardFlowOutputs(def, walked, graphOf(g));
    assert.deepEqual(flow.outputs, { default: 'video' }, 'the upscale still serves the video channel');
    const out = graphOf(g);
    const node = out[flow.outputNodes.default!];
    assert.ok(node, 'the resolved output node exists in the composed graph');
    assert.equal(node.class_type, 'MiniMaxH3ChainAssemble', 'the armed upscale resolves to the assemble terminal (copy_to_output true)');
  });

  it("every cross-arm pair refuses LOUD naming the silently-dropped arm", () => {
    const edges: Array<[string, Record<string, unknown>, RegExp]> = [
      ['replace', { replace: [{ source_clip: 'c.mp4', still: 's.png', mannequin: 'm.mp4', mask: 'k.png', swap_prompt: 'x' }] }, /Replace and Upscale are both armed — one door per doc.*Empty the Replace arm for an upscale/],
      ['repair', { repair: [{ source_clip: 'c.mp4', repair_prompt: 'x', region_prompt: 'hands' }] }, /Repair and Upscale are both armed — one door per doc.*Empty the Repair arm for an upscale/],
      ['extend', { extend: [{ source_clip: 'c.mp4', extend_prompt: 'x', extend_seconds: 3.75 }] }, /Extend and Upscale are both armed — one door per doc.*Empty the Extend arm for an upscale/],
      ['refine', { refine: [{ source_clip: 'c.mp4', refine_prompt: 'x' }] }, /Refine and Upscale are both armed — one door per doc.*Empty the Refine arm for an upscale/],
      ['reshoot', { reshoot: [{ source_clip: 'c.mp4', orbit: 12 }] }, /Upscale and Reshoot are both armed — the upscale branch never enters the film action.*empty the Upscale arm for a reshoot/],
    ];
    for (const [name, arm, re] of edges) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        upscale: [UPSCALE_ENTRY()],
        ...arm,
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      assert.throws(
        () => def.compose(walked, model, g, `run_upmod_${name}`),
        re,
        `upscale + ${name} refuses naming the silently-dropped arm`,
      );
    }
  });
});
