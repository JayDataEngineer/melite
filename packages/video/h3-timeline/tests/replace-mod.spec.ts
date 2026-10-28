// @melite/video-h3-timeline — the replace (swap) arm rows.
// Drives the registered card's own doors (def.mods for the served
// kind, def.compose for the branch): the kind is served verbatim
// with the arm-gated packs, the film path is byte-identical with
// the arm empty (zero swap classes), and a bound arm refuses LOUD —
// missing seats name the seat, complete seats compose the emission
// (the masked-edit chain ending in MiniMaxH3ChainAssemble). Every row asserts served truth or
// refusal text — never expect(true).
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

// The swap-only edit classes (the manifest-pinned seats — zero of
// these may ever appear in a film graph). MiniMaxH3ReferenceToVideo
// is FILM vocabulary too (the t4r guide windows compose it) — it
// pins present in the emission row, never absent here. The shared
// tail (sampler, loaders) likewise pins inside the emission row.
const SWAP_CLASSES = [
  'MiniMaxH3ChainPlanModern',
  'MiniMaxH3SourceTimeline',
  'MiniMaxH3ChainLoopStart',
  'MiniMaxH3ChainCurrent',
  'H3SourceSlice',
  'MiniMaxH3FantasticVideoEditLatent',
  'MiniMaxH3ContexMaskedTarget',
  'MiniMaxH3ChainContext',
  'MiniMaxH3LoopTrim',
  'MiniMaxH3ChainSegmentSave',
  'MiniMaxH3ChainReview',
  'MiniMaxH3ChainLoopEnd',
  'MiniMaxH3ChainAssemble',
  'H3OneClickSwapPlan',
  'ImageToMask',
];

const SWAP_ENTRY = (): Record<string, unknown> => ({
  source_clip: 'clips/source.mp4',
  still: 'stills/hero.png',
  mannequin: 'masks/mannequin.mp4',
  mask: 'masks/person.png',
  swap_prompt: 'the same person smiling, studio light',
});

describe("the replace kind", () => {
  it("is served verbatim with the arm-gated packs", () => {
    const kinds = (def as { mods?: Array<Record<string, unknown>> }).mods ?? [];
    const replace = kinds.find((k) => k.kind === 'replace');
    assert.ok(replace, "the h3-timeline card serves the replace kind on the modifiers channel");
    assert.equal(replace.param_key, 'replace', "the bag rides param_key 'replace'");
    assert.equal(replace.max_stack, 1, "one swap per doc (max_stack 1)");
    assert.equal(replace.schema_key, 'replace', "the kind stamps its own catalog name (the mod-liveness ARM 3 attribution: the card IS the catalog)");
    assert.deepEqual(replace.requires, [
      'comfyui-h3-oneclick-swap',
      'ComfyUI-MiniMaxH3-Context-Loop',
      'ComfyUI-Fantastic-MiniMaxH3-PromptBuilder',
    ], "the kind's arm names exactly the three swap packs (the mask SAM2 law: declared, then auto provisioned)");
    const names = ((replace.fields as Array<Record<string, unknown>>) ?? []).map((f) => f.name);
    for (const seat of ['source_clip', 'still', 'mannequin', 'mask', 'swap_prompt']) {
      assert.ok(names.includes(seat), `the kind declares the '${seat}' seat (a swap needs all five bound)`);
    }
  });

  it("serves its media seats square-claiming, never freeform text (the picker law)", () => {
    const kinds = (def as { mods?: Array<Record<string, unknown>> }).mods ?? [];
    const replace = kinds.find((k) => k.kind === 'replace');
    assert.ok(replace, "the h3-timeline card serves the replace kind on the modifiers channel");
    const by = Object.fromEntries(
      ((replace.fields as Array<Record<string, unknown>>) ?? []).map((f) => [f.name, f]),
    );
    // The leaf's square claims f.type image/file/mesh (the square
    // provider's own gate); the operator's live-lane law 2026-10-28:
    // media seats render pickers, never freeform text boxes.
    assert.equal(by.still.type, 'image', "the still seat claims the image square");
    assert.equal(by.mask.type, 'image', "the mask seat claims the image square");
    assert.equal(by.source_clip.type, 'file', "the source-clip seat claims the file square");
    assert.equal(by.source_clip.media, 'video', "the source-clip seat narrows the picker + OS accept to video");
    assert.equal(by.mannequin.type, 'file', "the mannequin seat claims the file square");
    assert.equal(by.mannequin.media, 'video', "the mannequin seat narrows the picker + OS accept to video");
    // The plan's own tier vocabulary, closed (the live enum verbatim).
    assert.equal(by.resolution.type, 'select', "the resolution seat is a select over the plan's tiers");
    assert.deepEqual(
      ((by.resolution.options as Array<{ value: string }>) ?? []).map((o) => o.value),
      ['480p', '576p', '736p', '768p', '1080p'],
      "the resolution tiers mirror the H3OneClickSwapPlan enum (never freeform)",
    );
    // THE AUDIO SWITCH (operator, live lane 2026-10-28: "just add a
    // switch to use source audio or not"): one boolean derives the
    // three engine audio seats (EditLatent.keep_audio,
    // ContexMaskedTarget.audio_mode, ChainAssemble.audio_source).
    assert.equal(by.keep_audio.type, 'boolean', "the audio seat is one boolean switch");
    assert.equal(by.keep_audio.default, true, "the default keeps the source audio (the reference posture)");
    // THE MASK-SEAT CONVENTION (friction-report #3, 2026-10-28):
    // the seat is one image, never the staged frames folder — the
    // tooltip states the union convention so no agent re-guesses
    // it (the folder guess burned a compose refusal whose "stale"
    // suffix blamed the engine build).
    assert.ok(String(by.mask.tooltip).includes('never rides this seat'),
      "the mask tooltip forbids the folder");
    assert.ok(String(by.mask.tooltip).includes('UNION'),
      "the mask tooltip states the union convention");
  });

  it("rides the card's admission (a doc carrying it is not unknown-param)", () => {
    assert.ok((def.admits ?? []).includes('replace'), "the replace bag rides admits (the mask precedent: mod-owned names ride admits)");
    // THE FLAT-REFUSAL HALF (friction-report #2): the bag KEY is
    // the admitted surface — no entry FIELD may ride admits, so the
    // flat spelling refuses at the compose door as unknown
    // param(s) (the served bench grammar states the container;
    // admission never projects mod fields).
    const kinds = (def as { mods?: Array<Record<string, unknown>> }).mods ?? [];
    const replace = kinds.find((k) => k.kind === 'replace');
    const fields = ((replace?.fields as Array<Record<string, unknown>>) ?? []).map((f) => String(f.name));
    assert.ok(fields.length > 0, "the kind declares entry fields to judge against");
    for (const name of fields) {
      assert.ok(!(def.admits ?? []).includes(name), `entry field '${name}' rides no admit — the flat spelling refuses (bag key only)`);
    }
  });

  it("leaves the film byte-identical with the arm empty (zero swap classes)", () => {
    const walked = def.schema({}) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_replace_empty");
    const out = graphOf(g);
    for (const cls of SWAP_CLASSES) {
      assert.equal(ofClass(out, cls).length, 0, `the empty-arm film composes no ${cls} (the swap vocabulary never leaks into a film graph)`);
    }
    assert.ok(ofClass(out, 'SaveVideo').length > 0, "the empty-arm film still delivers its SaveVideo");
  });

  it("a bound arm with a missing seat refuses naming the seat", () => {
    const entry = SWAP_ENTRY();
    delete entry.still;
    const walked = def.schema({ replace: [entry] }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_replace_missing_seat"),
      /'still' names no media/,
      "the armed swap with no still refuses loud naming the seat (the reshoot idiom — never a silent half-build)",
    );
  });

  it("a bound arm under an armed reshoot refuses naming the conflict (one door per doc)", () => {
    const walked = def.schema({ replace: [SWAP_ENTRY()], reshoot_enabled: true }) as Record<string, unknown>;
    assert.throws(
      () => def.compose(walked, model, new GraphBuilder(), "run_replace_reshoot_conflict"),
      /Replace and Reshoot are both armed/,
      "the swap branch returns before the film action, so a reshoot under it would be silently dropped — the compose door refuses loud instead (the operator's conflict report, live lane 2026-10-28)",
    );
  });

  it("a bound arm composes the masked-edit chain on the family's own model + lora plane", () => {
    const walked = def.schema({ replace: [SWAP_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_swap_emission");
    const out = graphOf(g);
    for (const cls of SWAP_CLASSES) {
      assert.ok(ofClass(out, cls).length > 0, `the armed swap composes ${cls} (the reference map, emission-landed)`);
    }
    assert.ok(ofClass(out, 'MiniMaxH3ReferenceToVideo').length > 0,
      "the armed swap composes MiniMaxH3ReferenceToVideo (film-shared class, pinned present here)");
    // THE OPERATOR'S LORA LAW (2026-10-28, verbatim: "KEEP OUR
    // CURRENT LORA SETUP FOR NOW"): the swap rides the family's own
    // plane — LTX_lora_loader over the SLA chain with the mod bag /
    // absent-bag default — NEVER the reference's fixed DMAD
    // LoraLoaderModelOnly accelerator chain.
    const ltx = ofClass(out, 'LTX_lora_loader');
    assert.ok(ltx.length > 0, "the swap composes LTX_lora_loader (the family lora plane)");
    const absentBag = JSON.parse(String(ltx[0][1].inputs.stack_data)) as Array<{ lora: string }>;
    assert.equal(absentBag[0].lora, 'h3/minimax_h3_fl2v_turbo_8step_v1.0_comfyui_bf16.safetensors',
      "an absent loras bag rides the family default row (the film's own default, one owner)");
    assert.equal(ofClass(out, 'LoraLoaderModelOnly').length, 0,
      "no fixed accelerator row rides (the reference's DMAD chain is NOT adopted)");
    assert.equal(ofClass(out, 'ModelAttentionBackend').length, 0,
      "no reference attention-backend substitution (the estate's SLA/lowvram/chunked chain owns attention)");
    assert.ok(ofClass(out, 'H3SLAAttention').length > 0, "the family SLA chain renders under the swap");
    // The assemble target rides the run tree.
    const assemble = ofClass(out, 'MiniMaxH3ChainAssemble');
    assert.equal(assemble[0][1].inputs.filename, 'run_swap_emission/swap',
      "the swap assembles under the run tree (<runId>/swap)");
    // THE LAZY-VIDEO WIRE (friction-report #4): the timeline's
    // video_path is a raw CWD-relative path upstream while VHS needs
    // an input-dir leaf — one string cannot serve both. The timeline
    // rides the core loader's file-backed VIDEO wire (its own
    // tooltip-preferred contract); video_path rides along unread.
    const loaders = ofClass(out, 'LoadVideo');
    assert.equal(loaders.length, 1, "one core LoadVideo feeds the timeline (the lazy wire)");
    assert.equal(loaders[0][1].inputs.file, 'clips/source.mp4',
      "the core loader reads the same staged source_clip string VHS reads");
    const timelines = ofClass(out, 'MiniMaxH3SourceTimeline');
    assert.equal(timelines.length, 1, "one source timeline gates the loop");
    assert.deepEqual(timelines[0][1].inputs.source_video, [loaders[0][0], 0],
      "the timeline's source_video wires the core loader's VIDEO (video_path unread)");
  });

  it("the keep_audio switch derives all three engine audio seats (both poles)", () => {
    for (const [keep, audioMode, source] of [
      [true, 'preserve source audio', 'source'],
      [false, 'generate all audio', 'generated'],
    ] as const) {
      const walked = def.schema({ replace: [{ ...SWAP_ENTRY(), keep_audio: keep }] }) as Record<string, unknown>;
      const g = new GraphBuilder();
      def.compose(walked, model, g, `run_swap_audio_${keep ? 'on' : 'off'}`);
      const out = graphOf(g);
      assert.equal(ofClass(out, 'MiniMaxH3FantasticVideoEditLatent')[0][1].inputs.keep_audio, keep,
        `EditLatent.keep_audio is ${keep}`);
      assert.equal(ofClass(out, 'MiniMaxH3ContexMaskedTarget')[0][1].inputs.audio_mode, audioMode,
        `ContexMaskedTarget.audio_mode is '${audioMode}'`);
      assert.equal(ofClass(out, 'MiniMaxH3ChainAssemble')[0][1].inputs.audio_source, source,
        `ChainAssemble.audio_source is '${source}'`);
    }
  });

  it("the entry scalars stamp the plan head verbatim (the reference operating point)", () => {
    const walked = def.schema({ replace: [SWAP_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_swap_plan");
    const plan = graphOf(g);
    const head = ofClass(plan, 'H3OneClickSwapPlan')[0][1].inputs;
    assert.equal(head.clip_seconds, 6, "plan clip_seconds 6 (the reference operating point)");
    assert.equal(head.overlap_frames, 39, "plan overlap_frames 39");
    assert.equal(head.steps, 6, "plan steps 6");
    assert.equal(head.seed, 0, "plan seed 0");
    assert.equal(head.resolution, '736p', "plan resolution '736p'");
  });

  it("a stated operating point overrides every scalar default (seats, not shadows)", () => {
    const walked = def.schema({
      replace: [{
        ...SWAP_ENTRY(),
        seed: 4242, steps: 8, clip_seconds: 3, overlap_frames: 12, resolution: '1080p',
      }],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_swap_stated");
    const out = graphOf(g);
    const head = ofClass(out, 'H3OneClickSwapPlan')[0][1].inputs;
    assert.equal(head.seed, 4242, "a stated seed stamps the plan head");
    assert.equal(head.steps, 8, "a stated steps stamps the plan head");
    assert.equal(head.clip_seconds, 3, "a stated clip_seconds stamps the plan head");
    assert.equal(head.overlap_frames, 12, "a stated overlap_frames stamps the plan head");
    assert.equal(head.resolution, '1080p', "a stated tier overrides the 736p default");
    const chain = ofClass(out, 'MiniMaxH3ChainPlanModern')[0][1].inputs;
    assert.equal(chain.base_seed, 4242, "the chain plan carries the stated base_seed");
    assert.equal(chain.default_steps, 8, "the chain plan carries the stated default_steps");
    assert.equal(chain.default_duration_seconds, 3, "the chain plan carries the stated duration");
  });

  it("sla_enabled=false wires the switch literal true (the family's own master-switch spelling)", () => {    // The sla knobs are DOC params (admits: 'sla_*'), not lane facts —
    // parseH3Facts carries only the four lane files. So the arm rides
    // the walked doc with the master switch off; the model stays the
    // real family facts row.
    const walked = def.schema({
      replace: [SWAP_ENTRY()],
      sla_enabled: false,
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_swap_sla_off");
    const out = graphOf(g);
    const switchInput = ofClass(out, 'ComfySwitchNode')[0][1].inputs.switch;
    assert.equal(switchInput, true, "sla_enabled=false parks the switch at literal true (the film renderer's own spelling, swap mirrored)");
  });

  it("an armed swap resolves its default output to MiniMaxH3ChainAssemble (friction-report #1)", () => {
    // THE FLOW-OUTPUT WALL: the estate resolves the card's default
    // channel over the composed graph with the walked params. A film
    // resolves SaveVideo; an armed swap must resolve the swap
    // terminal — never refuse `expects * as SaveVideo, got missing`.
    const walked = def.schema({ replace: [SWAP_ENTRY()] }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_swap_flow_output");
    const out = graphOf(g);
    const flow = resolveCardFlowOutputs(def, walked, out);
    assert.deepEqual(flow.outputs, { default: "video" }, "the swap still serves the video channel");
    const node = out[flow.outputNodes.default!];
    assert.ok(node, "the resolved output node exists in the composed graph");
    assert.equal(node.class_type, "MiniMaxH3ChainAssemble", "the armed swap resolves to the assemble terminal (copy_to_output true)");
  });

});
