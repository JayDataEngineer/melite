// h3-reshoot-chain.spec.ts — THE CAMERA RE-SHOOT WALL (feature 024,
// the ComfyUI "Open Source Higgsfield" entry: the same scene
// re-rendered from a NEW camera) — THE FOURTH-MOD-BAG LAW (§8 of the
// multiwindow unification audit, 2026-11-12).
//
// The chain: source clip frames (the SHARED loader law —
// force-rate-24 VHS, never a private LoadVideo pair) →
// video-consistent depth (VDA-Small) → point-cloud reprojection
// under the new camera (CrossViewWarp, twice — once for the depth
// stack, once for the RGB) → the warped depth conditions the
// generation through the Fun ControlNet Union 2.0 patch, with the
// magenta disocclusion holes fenced as the inpaint mask.
//
// The wall pins the operator-facing contract on the card's own
// doors: an absent or EMPTY bag composes byte-stable graphs with
// the flat-knob noise gone (ARM 1), the bag's ten entry fields
// exist on the served kind with the emission's own dial bands in
// 1:1 agreement — the two homes the bag law splits the old
// three-face match into (ARM 2), out-of-domain dials refuse LOUD at
// the compose door ahead of the engine (ARM 3), an armed doc wires
// the full chain on the shared loader with the apply seat mounted
// ahead of the file-based picks and the FILM's SaveVideo as its
// terminal (ARM 4), and — once the depth pack lands on the engine —
// the armed graph passes the RUN-door wiring gate and the arm's
// requires rows name the packs (ARM 5).
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

const RESHOOT_CLASSES = [
  "LoadVideoDepthAnythingModel", "VideoDepthAnythingProcess", "VideoDepthAnythingOutput",
  "CrossViewWarp", "ColorToMask", "ModelPatchLoader", "MiniMaxH3FunControlNetApply",
];

const reshootKind = () =>
  ((def as unknown as { mods?: Array<Record<string, unknown>> }).mods ?? [])
    .find((k) => k.kind === "reshoot");

describe("the h3 camera re-shoot wall (the fourth mod bag)", () => {
  it("ARM 1 — no bag and EMPTY bag compose byte-identical films (the unused arm is surface, never noise)", () => {
    const plain = compose(BASE);
    const empty = compose({ ...BASE, reshoot: [] });
    expect(JSON.stringify(empty)).toBe(JSON.stringify(plain));
    const flat = Object.values(plain).map((n) => n.class_type);
    for (const cls of RESHOOT_CLASSES) {
      expect(flat, `${cls} composes on no disarmed graph`).not.toContain(cls);
    }
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

  it("ARM 3 — an out-of-domain dial refuses LOUD at the compose door, ahead of the engine; in-band extremes walk", () => {
    for (const [name, value] of [
      ["orbit", 181], ["tilt", -91], ["dolly", 0.05],
      ["zoom", 121], ["pan", 1.5], ["strength", 10.5],
      ["depth_ratio", 1],
    ] as const) {
      assert.throws(
        () => compose({ ...BASE, reshoot: [{ source_clip: "sources/take3.mp4", [name]: value }] }),
        new RegExp(`${name}.*outside the camera band|outside the camera band.*${name}`),
        `${name}=${value} must refuse at the compose door, never a widget 400`,
      );
    }
    // every dial at its band edge walks green (and arms)
    const edge = compose({
      ...BASE,
      reshoot: [{
        source_clip: "sources/take3.mp4", orbit: 180, tilt: 90, dolly: 3,
        zoom: 20, pan: 0.5, strength: 10, depth_ratio: 1000,
      }],
    });
    expect(ofClass(edge, "CrossViewWarp")).toHaveLength(2);
  });

  it("ARM 4 — an armed doc wires the full chain on the SHARED loader law, and the film's SaveVideo is its terminal", () => {
    const out = compose(ARMED);
    // THE SHARED LOADER LAW: the clip rides force-rate-24 VHS — the
    // private LoadVideo→GetVideoComponents pair is dead
    expect(ofClass(out, "LoadVideo")).toHaveLength(0);
    expect(ofClass(out, "GetVideoComponents")).toHaveLength(0);
    const vhs = ofClass(out, "VHS_LoadVideo");
    expect(vhs.length).toBeGreaterThanOrEqual(1);
    expect(vhs[0]![1].inputs.video).toBe("sources/take3.mp4");
    expect(vhs[0]![1].inputs.force_rate).toBe(24);
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
    const rgbPass = warps.filter(([, w]) => String(w.inputs.frames).includes("VHS_LoadVideo"));
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
    expect(String(mask[0]![1].inputs.images)).toBe(`${rgbPass[0]![0]},0`);
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
    // THE TERMINAL: the reshoot is a film AUGMENTATION — the film
    // tail's SaveVideo serves it, never the chain terminal
    expect(ofClass(out, "MiniMaxH3ChainAssemble")).toHaveLength(0);
    const flow = resolveCardFlowOutputs(def, def.schema(ARMED) as Record<string, unknown>, out);
    expect(out[flow.outputNodes.default!]!.class_type).toBe("SaveVideo");
  });

  // THE PACK-PRESENT GATE: the depth chain's VDA pack is still an
  // unprovisioned upstream (the named feature-024 debt — the warp
  // pack IS landed); the run-door wiring gate cannot judge an armed
  // graph here without reding on the MISSING plane (an
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
      `missing surfaces: ${missing.join("; ")}. The arm fires when the VDA provision lands ` +
      `(the viggle parallel lane it once leaned on is exterminated; the arm's own requires rows ` +
      `land with the provision).`,
    );
  }

  it.skipIf(!warpLanded || !vdaLanded)("ARM 5a — an armed graph passes the RUN-door wiring gate (the engine owns every class)", () => {
    const out = compose(ARMED);
    assertWiringAgainst(boot.nodes, boot.inputs, "h3-timeline", out);
  });

  it.skipIf(!warpLanded || !vdaLanded)("ARM 5b — with the packs live, the arm's requires rows name them (the pack gate lands with the provision)", () => {
    const kind = reshootKind();
    assert.ok(kind);
    const requires = (kind.requires as string[]) ?? [];
    for (const pack of ["ComfyUI-CrossViewWarp", "ComfyUI-Video-Depth-Anything"]) {
      expect(requires, `${pack} must be on the arm once it is served`).toContain(pack);
    }
  });
});
