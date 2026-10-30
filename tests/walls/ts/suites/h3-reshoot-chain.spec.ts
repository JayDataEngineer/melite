// h3-reshoot-chain.spec.ts — THE CAMERA RE-SHOOT WALL (feature 024,
// the ComfyUI "Open Source Higgsfield" entry: the same scene
// re-rendered from a NEW camera) — THE FOURTH-MOD-BAG LAW (§8 of the
// multiwindow unification audit, 2026-11-12), REWORKED 2026-11-13
// onto the OFFICIAL implementation.
//
// The chain (Comfy-Org's comfy-reshoot reference app,
// workflows/generate.api.json, pack revision fbb1e93c): the source
// clip on the OFFICIAL loader posture (core LoadVideo — the VIDEO
// type CrossViewPrepareClip demands; the prepare node owns the 24
// fps resample, the H3 17k+5 grid snap and the crop) → MoGe-2
// METRIC geometry (LoadMoGeModel + MoGeInference, core nodes) →
// ONE CrossViewWarp on the moge_geometry seat → the prepared clip
// rides the r2v's ref_video_0 (the appearance reference), the warp
// pins through MiniMaxH3AddGuide at row 0 (the H3-native guide
// lane), the trigger word `crossview` leads the prompt, and the
// CrossView LoRA (band 0.5–1, default 0.8) loads on the model —
// the camera spine ahead of the file-based picks.
//
// The wall pins the operator-facing contract on the card's own
// doors: an absent or EMPTY bag composes byte-stable graphs with
// the flat-knob noise gone (ARM 1), the bag's ten entry fields
// exist on the served kind with the emission's own dial bands in
// 1:1 agreement — the two homes the bag law splits the old
// three-face match into (ARM 2), out-of-domain dials refuse LOUD at
// the compose door ahead of the engine (ARM 3), an armed doc wires
// the full official chain with the FILM's SaveVideo as its
// terminal (ARM 4), and — once the engine census carries the fork's
// CrossViewPrepareClip — the armed graph passes the RUN-door wiring
// gate and the arm's requires row names the pack (ARM 5).
//
// Run: npx vitest run tests/walls/ts/suites/h3-reshoot-chain.spec.ts
import "../../../helpers/boot-models.ts";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs, resolveCardFlowOutputs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { deriveWiringDoc, assertWiringAgainst } from "../../../../packages/engines/comfyui-cordis/src/wiringWall.ts";
import { RESHOOT_DIAL_BOUNDS } from "../../../../packages/models/h3/src/reshoot.ts";
import {
  hydrateLayerA, serializeLayerA, LAYERA_KEY_UNIVERSE,
} from "../../../../packages/video/h3-timeline/src/ui/studio/docHydrate.ts";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..");
const FACTS_PATH = join(ROOT, "packages", "engines", "comfyui-cordis", "data", "model-facts.json");
const BOOT_FIXTURE_PATH = join(ROOT, "tests", "walls", "fixtures", "object_info.boot.json");

let def: CardDefinition;
let model: ModelFacts;

beforeAll(async () => {
  def = (await loadCardDefs()).get("h3-timeline")!;
  assert.ok(def, "the composition root serves the h3-timeline card");
  model = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel }).models["h3-timeline"]!;
  assert.ok(model, "the h3-timeline family facts row serves");
});

type Node = { class_type: string; inputs: Record<string, unknown> };
const compose = (doc: Record<string, unknown>): Record<string, Node> => {
  const g = new GraphBuilder();
  def.compose(def.schema(doc) as Record<string, unknown>, model, g, "run_reshoot_wall");
  return g.toJSON() as Record<string, Node>;
};
const ofClass = (out: Record<string, Node>, cls: string): [string, Node][] =>
  Object.entries(out).filter(([, n]) => n.class_type === cls);

const BASE = {
  calls: [{ text: "a slow push in", start_frame: 0, end_frame: 56 }],
};
const ARMED = { ...BASE, reshoot: [{ source_clip: "sources/take3.mp4" }] };

// The official chain's classes (zero of these may appear on a
// disarmed doc).
const RESHOOT_CLASSES = [
  "CrossViewPrepareClip", "LoadMoGeModel", "MoGeInference",
  "CrossViewWarp", "LoraLoaderModelOnly",
];

// The FIRST CUT's classes (VDA depth + Fun ControlNet + the private
// loader pair) — retired with the 2026-11-13 rework; they must stay
// dead on every doc, disarmed or armed.
const RETIRED_CLASSES = [
  "LoadVideoDepthAnythingModel", "VideoDepthAnythingProcess", "VideoDepthAnythingOutput",
  "ImageResizeKJ", "ColorToMask", "ModelPatchLoader", "MiniMaxH3FunControlNetApply",
  "GetVideoComponents",
];

const reshootKind = () =>
  ((def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [])
  .find((k) => k.kind === "reshoot");

describe("the h3 camera re-shoot wall (the fourth mod bag, official rework)", () => {
  it("ARM 1 — no bag and EMPTY bag compose byte-identical films (the unused arm is surface, never noise)", () => {
    const plain = compose(BASE);
    const empty = compose({ ...BASE, reshoot: [] });
    expect(JSON.stringify(empty)).toBe(JSON.stringify(plain));
    const flat = Object.values(plain).map((n) => n.class_type);
    for (const cls of RESHOOT_CLASSES) {
      expect(flat, `${cls} composes on no disarmed graph`).not.toContain(cls);
    }
    expect(flat, "the official loader is the arm's own").not.toContain("LoadVideo");
  });

  it("ARM 2 — the bag's fields ride the served kind, and the emission's dial bands agree 1:1 (the two homes of the bag law)", () => {
    const kind = reshootKind();
    assert.ok(kind, "the card serves the reshoot kind on the modifiers channel");
    assert.equal(kind.param_key, "reshoot", "the bag rides param_key 'reshoot'");
    assert.equal(kind.max_stack, 1, "one re-shoot per doc");
    const fields = new Map(
      ((kind.fields as Array<Record<string, unknown>>) ?? []).map((f) => [f.name as string, f]),
    );
    // the clip + the nine dials, exactly (no missing seat, no ghost)
    expect([...fields.keys()]).toEqual([
      "source_clip", "orbit", "tilt", "dolly", "zoom", "pan",
      "strength", "depth_ratio", "smooth_depth", "invert_depth",
    ]);
    // the clip seat claims the VIDEO square (the picker law)
    assert.equal(fields.get("source_clip")!.type, "file");
    assert.equal(fields.get("source_clip")!.media, "video");
    // the official LoRA band on the served row (the reference app's
    // own default)
    assert.equal(fields.get("strength")!.default, 0.8, "the served strength default is the official 0.8");
    // THE 1:1 BAND AGREEMENT: every dial the emission bounds is a
    // served field with the same band, and every bounded served
    // field is an emission band — neither home can drift alone
    const servedBanded = new Set(Object.keys(RESHOOT_DIAL_BOUNDS));
    for (const [name, row] of fields) {
      if (servedBanded.has(name)) {
        const [lo, hi] = RESHOOT_DIAL_BOUNDS[name]!;
        assert.equal(row.min, lo, `${name} serves min ${lo} (the emission's own band)`);
        assert.equal(row.max, hi, `${name} serves max ${hi}`);
        servedBanded.delete(name);
      }
    }
    assert.deepEqual([...servedBanded], [], "every emission band has a served field");
  });

  it("ARM 3 — an out-of-domain dial refuses LOUD on BOTH sides of every band, ahead of the engine", () => {
    // Both edges, derived from the emission's own bounds: a dial can
    // drift in either direction, so each side gets its own firing
    // value. The refusal is the composer's own voice (the band, the
    // recorded value, and the never-a-widget-400 tail), not a bare
    // "outside" fragment.
    const EPS = 1e-6;
    for (const [name, [lo, hi]] of Object.entries(RESHOOT_DIAL_BOUNDS)) {
      for (const value of [lo - EPS, hi + EPS]) {
        assert.throws(
          () => compose({ ...BASE, reshoot: [{ source_clip: "sources/take3.mp4", [name]: value }] }),
          new RegExp(`outside the camera band \\[${lo}, ${hi}\\].*never a widget 400`),
          `${name}=${value} must refuse at the compose door naming the band`,
        );
      }
    }
    // every dial at BOTH band edges walks green (and arms): the low
    // doc and the high doc each compose the official chain's one
    // warp; the two booleans walk on the high side (their own model
    // + card legs).
    const low = compose({
      ...BASE,
      reshoot: [{
        source_clip: "sources/take3.mp4", orbit: -180, tilt: -90, dolly: 0.1,
        zoom: 20, pan: -1, strength: 0.5, depth_ratio: 1.5,
      }],
    });
    expect(ofClass(low, "CrossViewWarp")).toHaveLength(1);
    const high = compose({
      ...BASE,
      reshoot: [{
        source_clip: "sources/take3.mp4", orbit: 180, tilt: 90, dolly: 3,
        zoom: 120, pan: 1, strength: 1, depth_ratio: 1000,
        smooth_depth: true, invert_depth: true,
      }],
    });
    expect(ofClass(high, "CrossViewWarp")).toHaveLength(1);
  });

  it("ARM 3b — a two-entry bag refuses at the compose door (max_stack 1, never a silent first-wins)", () => {
    const entry = { source_clip: "sources/take3.mp4" };
    assert.throws(
      () => compose({ ...BASE, reshoot: [entry, { ...entry, orbit: 30 }] }),
      /reshoot bag carries 2 entries — max_stack is 1.*Keep exactly one reshoot entry/,
      "the second entry would be silently dropped; refuse loud instead",
    );
    // the four bags share the guard: the swap arm names its own noun
    assert.throws(
      () => compose({ ...BASE, replace: [{ source_clip: "c.mp4", swap_prompt: "x" }, { source_clip: "c.mp4" }] }),
      /replace bag carries 2 entries — max_stack is 1.*Keep exactly one swap entry/,
    );
  });

  it("ARM 3c — the studio hydrate→serialize ride keeps the armed bag and the film graph (the bench merge-patch path)", () => {
    // JOURNEY hop 2: the doc that lands on the bench is hydrated into
    // Layer A and serialized back as a merge-patch over the saved
    // stage.params. The four bags live OUTSIDE LayerA's write
    // channels, so the patch never states them and the bench's
    // merge-patch preserves them — an upstream drop would disarm the
    // commission silently (an absent bag is legal). Judge the real
    // hydrate + serializer, then compose the round-tripped doc.
    for (const bag of ["replace", "repair", "extend", "reshoot"]) {
      assert.equal(LAYERA_KEY_UNIVERSE.has(bag), false,
        `${bag} stays outside Layer A's write channels (the bag law's carrier)`);
    }
    const base = { ...BASE, reshoot: [{ source_clip: "sources/take3.mp4", orbit: 45 }] };
    const patch = serializeLayerA(hydrateLayerA(base), base);
    assert.equal("reshoot" in patch, false, "the serializer states no bag key — the base bag rides the merge-patch");
    const saved: Record<string, unknown> = { ...base };
    for (const [k, v] of Object.entries(patch)) {
      if (v === null) delete saved[k];
      else saved[k] = v;
    }
    assert.deepEqual(saved.reshoot, base.reshoot, "the armed bag survives open→save byte-equal");
    const out = compose(saved);
    expect(ofClass(out, "CrossViewWarp")).toHaveLength(1);
    expect(ofClass(out, "LoraLoaderModelOnly").length).toBeGreaterThanOrEqual(1);
  });

  it("ARM 4 — an armed doc wires the OFFICIAL chain verbatim, and the film's SaveVideo is its terminal", () => {
    const out = compose(ARMED);
    // THE OFFICIAL LOADER (2026-11-13): core LoadVideo — the one
    // node that emits the VIDEO type CrossViewPrepareClip demands;
    // the staged leaf binds by name, the whole video hands off to
    // the prepare node (the retired VHS-seat law and the private
    // LoadVideo→GetVideoComponents pair died with the first cut)
    const lv = ofClass(out, "LoadVideo");
    expect(lv).toHaveLength(1);
    expect(lv[0]![1].inputs.file).toBe("sources/take3.mp4");
    // stage 1 — the clip normalization, the official literals
    const prep = ofClass(out, "CrossViewPrepareClip");
    expect(prep).toHaveLength(1);
    expect(prep[0]![1].inputs.duration).toBe(5);
    expect(prep[0]![1].inputs.aspect_ratio).toBe("source");
    expect(prep[0]![1].inputs.megapixels).toBe(0.5);
    expect(prep[0]![1].inputs.multiple).toBe(32);
    expect(String(prep[0]![1].inputs.video)).toBe(`${lv[0]![0]},0`);
    // stage 2 — MoGe-2 metric geometry, the official checkpoint + flags
    const moge = ofClass(out, "LoadMoGeModel");
    expect(moge).toHaveLength(1);
    expect(moge[0]![1].inputs.model_name).toBe("moge_2_vitl_normal_fp16.safetensors");
    const infer = ofClass(out, "MoGeInference");
    expect(infer).toHaveLength(1);
    expect(infer[0]![1].inputs.resolution_level).toBe(2);
    expect(infer[0]![1].inputs.fov_x_degrees).toBe(0);
    expect(infer[0]![1].inputs.batch_size).toBe(4);
    expect(infer[0]![1].inputs.force_projection).toBe(true);
    expect(infer[0]![1].inputs.apply_mask).toBe(true);
    expect(infer[0]![1].inputs.refine_steps).toBe(3);
    expect(String(infer[0]![1].inputs.image)).toBe(`${prep[0]![0]},0`);
    expect(String(infer[0]![1].inputs.moge_model)).toContain("LoadMoGeModel");
    // stage 3 — ONE warp on the METRIC seat (never the retired
    // brightness-depth input), the official posture literals
    const warps = ofClass(out, "CrossViewWarp");
    expect(warps).toHaveLength(1);
    const w = warps[0]![1].inputs;
    expect(String(w.frames)).toBe(`${prep[0]![0]},0`);
    expect(String(w.moge_geometry)).toContain("MoGeInference");
    expect(w.depth).toBeUndefined();
    expect(w.keep_source_aim).toBe(true);
    expect(w.roll_lock).toBe(false);
    expect(w.use_keyframes).toBe(false);
    expect(w.interpolation).toBe("linear");
    expect(w.pivot_z).toBe(1.05);
    // the appearance + guide + LoRA seats: the prepared clip IS
    // ref_video_0 (no ref audio on the slot — the official graph
    // wires none), the warp pins at row 0, the LoRA loads at 0.8
    const r2v = ofClass(out, "MiniMaxH3ReferenceToVideo");
    expect(r2v).toHaveLength(1);
    expect(r2v[0]![1].inputs.prompt).toBe("crossview. a slow push in");
    expect(String(r2v[0]![1].inputs["ref_videos.ref_video_0"])).toBe(`${prep[0]![0]},0`);
    expect(r2v[0]![1].inputs["ref_video_audios.ref_video_audio_0"]).toBeUndefined();
    const guide = ofClass(out, "MiniMaxH3AddGuide")
      .filter(([, n]) => String(n.inputs.image).includes("CrossViewWarp"));
    expect(guide).toHaveLength(1);
    expect(guide[0]![1].inputs.frame_idx).toBe(0);
    expect(String(guide[0]![1].inputs.positive)).toContain("MiniMaxH3ReferenceToVideo");
    const lora = ofClass(out, "LoraLoaderModelOnly");
    expect(lora).toHaveLength(1);
    expect(lora[0]![1].inputs.lora_name).toBe("h3/MiniMax-H3_Ref2VA-LoRA-CrossView-Warp_v1_3500.safetensors");
    expect(lora[0]![1].inputs.strength_model).toBe(0.8);
    const guider = ofClass(out, "BasicGuider")[0]!;
    expect(String(guider[1].inputs.model)).toContain("LoraLoaderModelOnly");
    expect(String(guider[1].inputs.conditioning)).toContain("MiniMaxH3AddGuide");
    // THE RETIRED-CHAIN GUARD: the first cut's classes stay dead on
    // the ARMED doc — the rework's own toggle-proof at the wall tier
    for (const cls of RETIRED_CLASSES) {
      expect(ofClass(out, cls), `${cls} died with the official rework`).toHaveLength(0);
    }
    // THE TERMINAL: the reshoot is a film AUGMENTATION — the film
    // tail's SaveVideo serves it, never the chain terminal
    expect(ofClass(out, "MiniMaxH3ChainAssemble")).toHaveLength(0);
    const flow = resolveCardFlowOutputs(def, def.schema(ARMED) as Record<string, unknown>, out);
    expect(out[flow.outputNodes.default!]!.class_type).toBe("SaveVideo");
  });

  // THE PACK-PRESENT GATE (2026-11-13 rework): the warp pack is
  // re-pinned to Comfy-Org's official comfyrob fork (revision
  // fbb1e93c — the revision comfy-reshoot's build/model-files.md
  // pins; it carries CrossViewPrepareClip), and both engine trees
  // hold it — but the RUNNING engine loads custom_nodes at boot, so
  // the census (and the boot fixture derived from it) serves the
  // fork's classes only after the operator restarts the engine and
  // the boot fixture regens. The arm stands up the moment the
  // census carries the classes; until then the skip names exactly
  // what is missing.
  const boot = deriveWiringDoc(JSON.parse(readFileSync(BOOT_FIXTURE_PATH, "utf8")) as Record<string, unknown>);
  const prepareLanded = boot.nodes.has("CrossViewPrepareClip");
  const warpLanded = boot.nodes.has("CrossViewWarp");
  const loraLanded = boot.nodes.has("LoraLoaderModelOnly");
  const missing = [
    !warpLanded ? "ComfyUI-CrossViewWarp (class CrossViewWarp)" : null,
    !prepareLanded ? "ComfyUI-CrossViewWarp @ fbb1e93c (class CrossViewPrepareClip — the engine restart + boot-fixture regen debt)" : null,
    !loraLanded ? "LoraLoaderModelOnly (the boot fixture's address set — the regen debt)" : null,
  ].filter((s): s is string => s !== null);
  if (missing.length > 0) {
    console.warn(
      `[h3-reshoot-chain] ARM 5 SKIPPED — the official re-shoot chain's classes are not on the engine census yet; ` +
      `missing surfaces: ${missing.join("; ")}. The arm fires when the operator restarts the engine over the ` +
      `re-pinned fork and the boot fixture regens (regen-node-vocab --boot).`,
    );
  }

  it.skipIf(!warpLanded || !prepareLanded || !loraLanded)("ARM 5a — an armed graph passes the RUN-door wiring gate (the engine owns every class)", () => {
    const out = compose(ARMED);
    assertWiringAgainst(boot.nodes, boot.inputs, "h3-timeline", out);
  });

  it.skipIf(!warpLanded || !prepareLanded || !loraLanded)("ARM 5b — with the pack live, the arm's requires row names it (the pack gate lands with the provision)", () => {
    const kind = reshootKind();
    assert.ok(kind);
    const requires = (kind.requires as string[]) ?? [];
    expect(requires, "the rework's one-pack roster").toEqual(["ComfyUI-CrossViewWarp"]);
  });
});
