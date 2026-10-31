// @melite/video/h3-timeline — the reshoot arm rows (the fourth mod
// bag, §8 of the multiwindow unification audit 2026-11-12; the
// emission REWORKED 2026-11-13 onto the official comfy-reshoot
// chain). Drives the registered card's own doors (def.mods for the
// served kind, def.compose for the film augmentation): the kind is
// served verbatim with the arm-gated pack, an absent or EMPTY bag
// leaves the film path byte-identical (zero chain classes), an
// armed bag augments the film on the OFFICIAL loader posture (core
// LoadVideo → CrossViewPrepareClip — the VIDEO type the prepare
// node demands), and every cross-arm pair refuses LOUD naming the
// silently-dropped arm. Every row asserts served truth or refusal
// text — never expect(true).
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

// The re-shoot-only classes (the official chain — zero of these may
// ever appear in a disarmed film graph).
const RESHOOT_CLASSES = [
  'LoadVideo',
  'CrossViewPrepareClip',
  'LoadMoGeModel',
  'MoGeInference',
  'CrossViewWarp',
  'LoraLoaderModelOnly',
];

// The FIRST CUT's classes (VDA depth + Fun ControlNet) — they died
// with the 2026-11-13 official rework and must stay dead on BOTH
// the disarmed and the armed doc (the retired-chain guard).
// ColorToMask belongs to the OPPOSITE law: the official port
// (2026-10-30) runs NO hole fill, so the class and its three fill
// siblings are pinned ABSENT by the anti-fill arm in
// packages/models/h3/tests/reshoot.spec.ts (and by the wall's ARM 4
// in tests/walls/ts/suites/h3-reshoot-chain.spec.ts) — re-arming a
// filler reds both.
const RETIRED_CLASSES = [
  'LoadVideoDepthAnythingModel',
  'VideoDepthAnythingProcess',
  'VideoDepthAnythingOutput',
  'ImageResizeKJ',
  'ModelPatchLoader',
  'MiniMaxH3FunControlNetApply',
];

const RESHOOT_ENTRY = (): Record<string, unknown> => ({
  source_clip: 'clips/take3.mp4',
  orbit: 24,
  tilt: -12,
  dolly: 1.2,
  zoom: 60,
  pan: 0.14,
  strength: 0.9,
  depth_ratio: 7,
  smooth_depth: false,
  invert_depth: false,
});

const kind = () =>
  ((def as { mods?: Array<Record<string, unknown>> }).mods ?? [])
    .find((k) => k.kind === 'reshoot');

describe("the reshoot kind (the fourth mod bag, official rework)", () => {
  it("is served verbatim with the arm-gated pack and every camera dial", () => {
    const reshoot = kind();
    assert.ok(reshoot, "the h3-timeline card serves the reshoot kind on the modifiers channel");
    assert.equal(reshoot.param_key, 'reshoot', "the bag rides param_key 'reshoot'");
    assert.equal(reshoot.schema_key, 'reshoot', "the kind stamps its own catalog name (the mod-liveness ARM 3 attribution)");
    assert.equal(reshoot.max_stack, 1, "one re-shoot per doc (max_stack 1)");
    assert.deepEqual(reshoot.requires, [
      'ComfyUI-CrossViewWarp',
    ], "the arm names its ONE pack (the official chain's prepare + warp — every other node is engine core: LoadVideo, the MoGe pair, the MiniMaxH3 trio, LoraLoaderModelOnly; the retired VDA/KJNodes/H3Mod rows died with the 2026-11-13 rework)");
    const fields = (reshoot.fields as Array<Record<string, unknown>>) ?? [];
    const names = fields.map((f) => f.name);
    assert.deepEqual(names, [
      'source_clip', 'orbit', 'tilt', 'dolly', 'zoom', 'pan',
      'strength', 'depth_ratio', 'smooth_depth', 'invert_depth',
    ], "the entry carries the clip + the nine camera dials, exactly");
  });

  it("the strength dial serves the official LoRA band and admits NOTHING under it (0.8–1, default 0.8) on the card's own field row", () => {
    const reshoot = kind();
    assert.ok(reshoot);
    const by = Object.fromEntries(
      ((reshoot.fields as Array<Record<string, unknown>>) ?? []).map((f) => [f.name, f]),
    );
    assert.equal(by.strength.default, 0.8, "the default is the reference app's own 0.8");
    // (re-pin, qa8 F33/GAPS-18 2026-10-31: the chain was vindicated — the
    // style drift was a 0.7 press. The old 0.5 floor sat BELOW the tested
    // band, so the exact drift the operator saw stayed reachable by any
    // value in [0.5, 0.8). The floor is the band's own floor now.)
    assert.equal(by.strength.min, 0.8, "the band's floor — under 0.8 the warp is followed less and the model's prior rebuilds the frame (the F33 anime drift)");
    assert.equal(by.strength.max, 1, "the band's ceiling — the old 0–10 Fun-ControlNet-era band died with the rework");
  });

  it("serves its media seat square-claiming, never freeform text (the picker law)", () => {
    const reshoot = kind();
    assert.ok(reshoot);
    const by = Object.fromEntries(
      ((reshoot.fields as Array<Record<string, unknown>>) ?? []).map((f) => [f.name, f]),
    );
    assert.equal(by.source_clip.type, 'file', "the clip seat claims the square");
    assert.equal(by.source_clip.media, 'video', "the clip seat claims the VIDEO square");
    for (const dial of ['orbit', 'tilt', 'dolly', 'zoom', 'pan', 'strength', 'depth_ratio']) {
      assert.equal(by[dial].type, 'number', `${dial} is a number row (never freeform text)`);
    }
    assert.equal(by.smooth_depth.type, 'boolean');
    assert.equal(by.invert_depth.type, 'boolean');
  });

  it("admits names the bag (the commission rides the same admission plane as its siblings)", () => {
    const admits = (def as { admits?: string[] }).admits ?? [];
    for (const seat of ['replace', 'repair', 'extend', 'reshoot']) {
      assert.ok(admits.includes(seat), `admits carries '${seat}' — the five bags share one plane`);
    }
  });

  it("THE FLAT SURFACE REFUSES LOUD (F13b, 2026-11-12): a doc-following press with the retired reshoot_enabled/reshoot_clip knobs never composes an ordinary film — the admission plane names the keys", () => {
    // The burn: the skill doc taught `reshoot_enabled`/`reshoot_clip`
    // while the code read the `reshoot` bag, and the retired flat
    // knobs composed an ordinary film with NO refusal — the doc's
    // own "never silently disarms" law broken by a silent drop. The
    // knobs retired with §8; the admission gate is what refuses now,
    // and this arm pins that it refuses (a re-declared knob would
    // green the compose and red this arm — the toggle-proof).
    assert.throws(
      () => def.compose(def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }],
        reshoot_enabled: true,
        reshoot_clip: 'clips/take3.mp4',
      }) as Record<string, unknown>, model, new GraphBuilder(), 'run_rsmod_flat'),
      /undeclared param\(s\): reshoot_clip, reshoot_enabled.*typo'd key never composes/,
      "the retired flat knobs refuse at admission, naming every key — never a silent disarmed film",
    );
    // the pointed sibling: a lone flat camera dial refuses too (the
    // whole retired group, not just the master switch)
    assert.throws(
      () => def.compose(def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }],
        reshoot_orbit: 24,
      }) as Record<string, unknown>, model, new GraphBuilder(), 'run_rsmod_flat_dial'),
      /undeclared param\(s\): reshoot_orbit/,
      "a lone retired camera dial refuses at admission (no partial flat surface)",
    );
  });

  it("a doc with no reshoot bag leaves the film path byte-identical (zero chain classes)", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_rsmod_off");
    const flat = Object.values(graphOf(g)).map((n) => n.class_type);
    for (const cls of RESHOOT_CLASSES) {
      assert.ok(!flat.includes(cls), `${cls} never composes on a disarmed doc`);
    }
  });

  it("an EMPTY bag is the unused arm (present-but-empty stays disarmed — the fourth arm's own shape guard)", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      reshoot: [],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_rsmod_empty");
    assert.deepEqual(ofClass(graphOf(g), "CrossViewWarp"), [], "the empty bag composes no warp");
  });

  it("an armed bag augments the FILM on the OFFICIAL loader posture — core LoadVideo → prepare, the film's own SaveVideo terminal", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      reshoot: [RESHOOT_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_rsmod_armed");
    const out = graphOf(g);
    // THE OFFICIAL LOADER (2026-11-13): core LoadVideo — the one
    // node that emits the VIDEO type CrossViewPrepareClip demands
    // (the retired VHS-seat law died with the first cut; the
    // prepare node owns the resample + grid + crop now)
    const lv = ofClass(out, "LoadVideo");
    assert.equal(lv.length, 1, "exactly one core LoadVideo (the whole video, by staged name)");
    assert.equal(lv[0]![1].inputs.file, 'clips/take3.mp4');
    const prep = ofClass(out, "CrossViewPrepareClip");
    assert.equal(prep.length, 1, "the clip hands off to the prepare node");
    assert.equal(String(prep[0]![1].inputs.video).includes("LoadVideo"), true, "the prepare node reads the loader's VIDEO output");
    // the chain classes mount (the augmentation)
    for (const cls of RESHOOT_CLASSES) {
      assert.ok(ofClass(out, cls).length >= 1, `${cls} mounts on the armed bag`);
    }
    // THE RETIRED-CHAIN GUARD: the first cut's classes stay dead on
    // the ARMED doc too — the rework's own toggle-proof
    for (const cls of RETIRED_CLASSES) {
      assert.deepEqual(ofClass(out, cls), [], `${cls} died with the official rework — never again on an armed doc`);
    }
    // the terminal is the FILM's own SaveVideo — the reshoot is an
    // augmentation, never a ChainAssemble emission
    assert.deepEqual(ofClass(out, "MiniMaxH3ChainAssemble"), [], "the reshoot arm never composes the chain terminal");
    assert.ok(ofClass(out, "SaveVideo").length >= 1, "the film tail's SaveVideo serves as the terminal");
  });

  it("the flow output binding resolves SaveVideo for an armed reshoot doc (the film tail serves the fourth arm)", () => {
    const walked = def.schema({
      calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
      reshoot: [RESHOOT_ENTRY()],
    }) as Record<string, unknown>;
    const g = new GraphBuilder();
    def.compose(walked, model, g, "run_rsmod_flow_output");
    const out = graphOf(g);
    const flow = resolveCardFlowOutputs(def, walked, out);
    assert.deepEqual(flow.outputs, { default: "video" }, "the armed reshoot serves the video channel");
    const node = out[flow.outputNodes.default!];
    assert.ok(node, "the resolved output node exists in the composed graph");
    assert.equal(node.class_type, "SaveVideo", "the armed reshoot resolves to the film tail's SaveVideo (the augmentation's own terminal)");
  });

  it("an armed bag under each of the three edit arms refuses LOUD naming the conflict (one door per doc)", () => {
    const edges: Array<[string, Record<string, unknown>, RegExp]> = [
      ['replace', { replace: [{ source_clip: 'c.mp4', swap_prompt: 'x' }] }, /Replace and Reshoot are both armed — the swap branch never enters the film action.*empty the Reshoot arm for a swap/],
      ['repair', { repair: [{ source_clip: 'c.mp4', repair_prompt: 'x', region_prompt: 'hands' }] }, /Repair and Reshoot are both armed — the repair branch never enters the film action.*empty the Reshoot arm for a repair/],
      ['extend', { extend: [{ source_clip: 'c.mp4', extend_prompt: 'x', extend_seconds: 3.75 }] }, /Extend and Reshoot are both armed — the extend branch never enters the film action.*empty the Reshoot arm for an extension/],
    ];
    for (const [name, arm, re] of edges) {
      const walked = def.schema({
        calls: [{ text: 'a slow push in', start_frame: 0, end_frame: 56 }], length: 56,
        reshoot: [RESHOOT_ENTRY()],
        ...arm,
      }) as Record<string, unknown>;
      const g = new GraphBuilder();
      assert.throws(
        () => def.compose(walked, model, g, `run_rsmod_${name}`),
        re,
        `reshoot + ${name} refuses naming the silently-dropped arm`,
      );
    }
  });
});
