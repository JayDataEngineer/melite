// h3-reshoot-chain.spec.ts — THE CAMERA RE-SHOOT WALL (feature 024,
// the ComfyUI "Open Source Higgsfield" entry: the same scene
// re-rendered from a NEW camera).
//
// The chain: source clip frames → video-consistent depth (VDA-Small)
// → point-cloud reprojection under the new camera (CrossViewWarp,
// twice — once for the depth stack, once for the RGB) → the warped
// depth conditions the generation through the Fun ControlNet Union
// 2.0 patch, with the magenta disocclusion holes fenced as the
// inpaint mask. The wall pins the operator-facing contract on the
// card's own doors: a disarmed doc composes byte-stable graphs
// (ARM 1), the eleven knobs exist 1:1 on all three faces — advertised
// (the action's params doc), served (the schema walk's domains),
// declared (the family's studio writes) — with matching bounds
// (ARM 2), the gate refuses out-of-domain knobs ahead of the engine
// (ARM 3), an armed doc wires the full chain with the apply seat
// mounted ahead of the file-based picks (ARM 4), and — once the
// reprojection pack lands on the engine — the armed graph passes the
// RUN-door wiring gate and the card names its packs (ARM 5).
//
// Run: npx vitest run tests/walls/ts/suites/h3-reshoot-chain.spec.ts
import "../../../helpers/boot-models.ts";
import { beforeAll, describe, expect, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { GraphBuilder } from "@melite/comfyui-card-kit/graph";
import { loadCardDefs } from "@melite/comfyui-cordis";
import { loadFacts } from "@melite/comfyui-card-kit/facts";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import type { CardDefinition } from "@melite/comfyui-card-kit/card-definition";
import { getModel, registryIds, registryModel } from "../../../../packages/engines/comfyui-cordis/src/models/models.ts";
import { fieldDomains } from "../../../../packages/engines/comfyui-cordis/src/models/validate.ts";
import { deriveWiringDoc, assertWiringAgainst } from "../../../../packages/engines/comfyui-cordis/src/wiringWall.ts";
import { fieldsOfEnvelope } from "@melite/card-base/client";
import { film } from "../../../../packages/models/h3/src/actions.ts";

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

// The eleven knobs, with the bounds the served face enforces —
// restated HERE as the wall's own expectation, judged against the
// advertised and served faces (a drift on either side reds ARM 2).
const KNOBS: ReadonlyArray<{ name: string; type: string; bounds?: readonly [number, number] }> = [
  { name: "reshoot_enabled", type: "boolean" },
  { name: "reshoot_clip", type: "image" },
  { name: "reshoot_orbit", type: "number", bounds: [-180, 180] },
  { name: "reshoot_tilt", type: "number", bounds: [-90, 90] },
  { name: "reshoot_dolly", type: "number", bounds: [0.1, 3] },
  { name: "reshoot_zoom", type: "number", bounds: [20, 120] },
  { name: "reshoot_pan", type: "number", bounds: [-1, 1] },
  { name: "reshoot_strength", type: "number", bounds: [0, 10] },
  { name: "reshoot_depth_ratio", type: "number", bounds: [1.5, 1000] },
  { name: "reshoot_smooth_depth", type: "boolean" },
  { name: "reshoot_invert_depth", type: "boolean" },
];

const BASE = {
  calls: [{ text: "a slow push in", start_frame: 0, end_frame: 56 }],
};
const ARMED = { ...BASE, reshoot_enabled: true, reshoot_clip: "sources/take3.mp4" };

describe("the h3 camera re-shoot wall (feature 024)", () => {
  it("ARM 1 — a disarmed doc composes byte-stable: the switch off, the knobs ride as noise", () => {
    const plain = compose(BASE);
    const off = compose({ ...BASE, reshoot_enabled: false, reshoot_clip: "sources/take3.mp4", reshoot_orbit: -30, reshoot_strength: 4 });
    expect(JSON.stringify(off)).toBe(JSON.stringify(plain));
    const flat = Object.values(plain).map((n) => n.class_type);
    for (const cls of ["LoadVideoDepthAnythingModel", "VideoDepthAnythingProcess", "VideoDepthAnythingOutput", "CrossViewWarp", "ColorToMask", "ModelPatchLoader", "MiniMaxH3FunControlNetApply"]) {
      expect(flat, `${cls} composes on no disarmed graph`).not.toContain(cls);
    }
  });

  it("ARM 2 — the eleven knobs exist 1:1 on all three faces with matching bounds", () => {
    // the ADVERTISED face: the film action's params doc
    const advertised = new Map(film.params.map((r) => [r.name, r]));
    // the SERVED face: the schema walk's own domains (the wall reads
    // the walk through fieldDomains — never a hand-copied literal)
    const carrier = def.schemaCarrier as unknown as { dict?: Record<string, unknown>; toJSON(): unknown };
    assert.ok(carrier?.dict, "the card's schema carrier exposes its field dict");
    const served = fieldDomains(carrier.dict as Parameters<typeof fieldDomains>[0]);
    // the PROJECTED face: the form spec the operator's panel renders
    // (fieldsOfEnvelope over the carrier's own envelope — the seat the
    // client actually paints, group + visibility + bounds included)
    const projected = new Map(
      fieldsOfEnvelope(carrier.toJSON() as never).map((f) => [f.name, f]),
    );
    for (const knob of KNOBS) {
      const ad = advertised.get(knob.name);
      assert.ok(ad, `${knob.name} is advertised on the film action's params doc`);
      assert.equal(ad.type, knob.type, `${knob.name} advertises as ${knob.type}`);
      assert.deepEqual(ad.bounds, knob.bounds, `${knob.name} advertises bounds ${JSON.stringify(knob.bounds)}`);
      assert.ok(served.has(knob.name), `${knob.name} is served by the schema walk`);
      const dom = served.get(knob.name)!;
      if (knob.bounds) {
        assert.equal(dom.min, knob.bounds[0], `${knob.name} serves min ${knob.bounds[0]}`);
        assert.equal(dom.max, knob.bounds[1], `${knob.name} serves max ${knob.bounds[1]}`);
      }
      const pf = projected.get(knob.name);
      assert.ok(pf, `${knob.name} projects on the card's form face`);
      assert.equal(pf.group, "reshoot", `${knob.name} paints in the reshoot group`);
      if (knob.name === "reshoot_enabled") {
        assert.equal(pf.visible_when ?? "", "", "the master switch paints unguarded");
      } else {
        assert.equal(pf.visible_when, "reshoot_enabled=true", `${knob.name} paints behind the master switch`);
      }
      if (knob.bounds) {
        assert.equal(pf.min, knob.bounds[0], `${knob.name} projects min ${knob.bounds[0]}`);
        assert.equal(pf.max, knob.bounds[1], `${knob.name} projects max ${knob.bounds[1]}`);
      }
    }
  });

  it("ARM 3 — the gate refuses out-of-domain knobs ahead of the engine, in-bounds knobs walk", () => {
    for (const [name, value] of [
      ["reshoot_orbit", 181], ["reshoot_tilt", -91], ["reshoot_dolly", 0.05],
      ["reshoot_zoom", 121], ["reshoot_pan", 0.51], ["reshoot_strength", 10.5],
      ["reshoot_depth_ratio", 1],
    ] as const) {
      assert.throws(
        () => def.schema({ ...ARMED, [name]: value }),
        new RegExp(name),
        `${name}=${value} must refuse at the schema gate`,
      );
    }
    // every knob at an in-bounds value walks green (and arms)
    const walked = def.schema({
      ...ARMED, reshoot_orbit: 180, reshoot_tilt: 90, reshoot_dolly: 3,
      reshoot_zoom: 20, reshoot_pan: 0.5, reshoot_strength: 10, reshoot_depth_ratio: 1000,
    }) as Record<string, unknown>;
    assert.equal(walked.reshoot_enabled, true);
  });

  it("ARM 4 — an armed doc wires the full chain and the guider renders patched", () => {
    const out = compose(ARMED);
    // the source clip + its frames
    expect(out["LoadVideo.0"]?.inputs.file).toBe("sources/take3.mp4");
    expect(ofClass(out, "GetVideoComponents")).toHaveLength(1);
    // the depth chain, exactly once
    expect(ofClass(out, "LoadVideoDepthAnythingModel")).toHaveLength(1);
    const proc = ofClass(out, "VideoDepthAnythingProcess");
    expect(proc).toHaveLength(1);
    expect(proc[0]![1].inputs.precision).toBe("fp16");
    expect(String(proc[0]![1].inputs.vda_model)).toContain("LoadVideoDepthAnythingModel");
    expect(ofClass(out, "VideoDepthAnythingOutput")[0]![1].inputs.colormap).toBe("gray");
    // the two aligned warps off one geometry source: warp A splats the
    // depth stack (the DEPTH conditioning), warp B the RGB frames (the
    // color anchor + the hole source)
    const warps = ofClass(out, "CrossViewWarp");
    expect(warps).toHaveLength(2);
    const depthPass = warps.filter(([, w]) => String(w.inputs.frames).includes("VideoDepthAnythingOutput"));
    const rgbPass = warps.filter(([, w]) => String(w.inputs.frames).includes("GetVideoComponents"));
    expect(depthPass).toHaveLength(1);
    expect(rgbPass).toHaveLength(1);
    for (const [, w] of warps) {
      expect(String(w.inputs.depth)).toContain("VideoDepthAnythingOutput");
    }
    // the disocclusion mask reads the RGB warp, the pack's magenta
    const mask = ofClass(out, "ColorToMask");
    expect(mask).toHaveLength(1);
    expect(mask[0]![1].inputs.blue).toBe(255);
    expect(mask[0]![1].inputs.green).toBe(0);
    expect(mask[0]![1].inputs.red).toBe(255);
    expect(mask[0]![1].inputs.threshold).toBe(10);
    expect(String(mask[0]![1].images ?? mask[0]![1].inputs.images)).toBe(`${rgbPass[0]![0]},0`);
    // the union 2.0 patch + the apply seat, the guider riding it
    expect(ofClass(out, "ModelPatchLoader")[0]![1].inputs.name)
      .toBe("h3-fun-controlnet/minimax_h3_fun_controlnet_union_2.0_pruned_bf16.safetensors");
    const apply = ofClass(out, "MiniMaxH3FunControlNetApply");
    expect(apply).toHaveLength(1);
    // exact seats: the warped DEPTH conditions, the reprojected RGB anchors
    expect(String(apply[0]![1].inputs.control_video)).toBe(`${depthPass[0]![0]},0`);
    expect(String(apply[0]![1].inputs.source_video)).toBe(`${rgbPass[0]![0]},0`);
    expect(String(apply[0]![1].inputs.mask)).toContain("ColorToMask");
    expect(String(apply[0]![1].inputs.model_patch)).toContain("ModelPatchLoader");
    const guider = ofClass(out, "BasicGuider")[0]!;
    expect(String(guider[1].inputs.model)).toContain("MiniMaxH3FunControlNetApply");
  });

  // THE PACK-PRESENT GATE: the reprojection + depth packs are the
  // parallel lane's vendor surface (comfyui-viggle-animate-h3,
  // ComfyUI-CrossViewWarp + the VDA ComfyUI pack) — absent from the
  // engine census today, so the run-door wiring gate cannot judge an
  // armed graph here without reding on the MISSING plane (an
  // environmental absence, not a contract break). The arm stands up
  // the moment the census carries the classes; until then the skip
  // names exactly what is missing.
  const boot = deriveWiringDoc(JSON.parse(readFileSync(BOOT_FIXTURE_PATH, "utf8")) as Record<string, unknown>);
  const warpLanded = boot.nodes.has("CrossViewWarp");
  const vdaLanded = boot.nodes.has("LoadVideoDepthAnythingModel");
  const missing = [
    !warpLanded ? "ComfyUI-CrossViewWarp (class CrossViewWarp)" : null,
    !vdaLanded ? "ComfyUI-Video-Depth-Anything (classes LoadVideoDepthAnythingModel, VideoDepthAnythingProcess, VideoDepthAnythingOutput)" : null,
  ].filter((s): s is string => s !== null);
  if (missing.length > 0) {
    console.warn(
      `[h3-reshoot-chain] ARM 5 SKIPPED — the re-shoot packs are not on the engine census yet; ` +
      `missing surfaces: ${missing.join("; ")}. The arm fires when the parallel provision lands ` +
      `(then the card's requires rows + the manifest pins land with it).`,
    );
  }

  it.skipIf(!warpLanded || !vdaLanded)("ARM 5a — an armed graph passes the RUN-door wiring gate (the engine owns every class)", () => {
    const out = compose(ARMED);
    assertWiringAgainst(boot.nodes, boot.inputs, "h3-timeline", out);
  });

  it.skipIf(!warpLanded || !vdaLanded)("ARM 5b — with the packs live, the card names them (the requires rows land with the provision)", () => {
    const requires: readonly string[] = def.requires ?? [];
    for (const pack of ["ComfyUI-CrossViewWarp", "ComfyUI-Video-Depth-Anything"]) {
      expect(requires, `${pack} must be required once it is served`).toContain(pack);
    }
  });
});
