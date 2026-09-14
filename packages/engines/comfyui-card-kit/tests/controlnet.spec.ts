// @melite/comfyui-card-kit — the ControlNet firing gate + chain
// (the z-image restoration). The gate IS the unit: boarding-first
// firing, the full-schedule law, the artifact precedence, the
// floor clamp. The chain IS the graph truth: ModelPatchLoader →
// ZImageFunControlnet per entry, array order, creation order.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { GraphBuilder } from "../src/graph.ts";
import { stackControlNets } from "../src/blocks/render-kit.ts";
import {
  assertControlNetSchedule,
  fireControlNets,
  type ControlNetEntry,
} from "../src/mods/guard.ts";

const ZIMAGE = { id: "z-image", mods: ["loras", "controlnet"] };
const KREA = { id: "krea-2", mods: ["loras"] };
const UNION = "z-image-fun-union-2.1/Z-Image-Turbo-Fun-Controlnet-Union-2.1-2602-8steps.safetensors";

const entry = (over: Partial<ControlNetEntry> = {}): ControlNetEntry => ({
  type: "depth",
  model: UNION,
  image_b64: "map.png",
  strength: 1.0,
  ...over,
});
const params = (controlnets: unknown, extra: Record<string, unknown> = {}): Record<string, unknown> =>
  ({ controlnets, ...extra });

describe("assertControlNetSchedule (the live node's own limit)", () => {
  it("rides the full schedule", () => {
    assertControlNetSchedule("depth", 0, 1);
  });
  it("refuses anything else LOUD, naming the node", () => {
    assert.throws(
      () => assertControlNetSchedule("depth", 0, 0.8),
      (err: unknown): boolean =>
        err instanceof Error &&
        err.message.includes("ZImageFunControlnet") &&
        err.message.includes("no start/end inputs"),
    );
  });
});

describe("fireControlNets (the boarding-first gate)", () => {
  it("empty/absent = no mutation = no gate (both planes pass through)", () => {
    assert.deepEqual(fireControlNets(ZIMAGE, {}), []);
    assert.deepEqual(fireControlNets(ZIMAGE, params([])), []);
    assert.deepEqual(fireControlNets(KREA, params([])), []);
  });
  it("a smuggled stack on a non-boarding atom refuses, naming atom + pack", () => {
    assert.throws(
      () => fireControlNets(KREA, params([entry()])),
      (err: unknown): boolean =>
        err instanceof Error &&
        err.message.includes("model 'krea-2' does not board the 'controlnet' pack"),
    );
  });
  it("fires the resolved pick on the boarding atom", () => {
    assert.deepEqual(fireControlNets(ZIMAGE, params([entry()])), [
      { type: "depth", model: UNION, image: "map.png", strength: 1.0 },
    ]);
  });
  it("enabled:false skips (a declared off-state, not a drop)", () => {
    assert.deepEqual(
      fireControlNets(ZIMAGE, params([entry({ enabled: false }), entry({ type: "pose" })])).map((p) => p.type),
      ["pose"],
    );
  });
  it("a non-boolean enabled refuses (the wire law, both planes — never a truthy fire)", () => {
    assert.throws(
      () => fireControlNets(ZIMAGE, params([entry({ enabled: "yes" })])),
      /enabled = yes: a boolean is required/,
    );
  });
  it("the artifact wins over image_b64 (the retired brick precedence)", () => {
    const [pick] = fireControlNets(ZIMAGE, params([entry({ artifact: "front_pose", image_b64: "map.png" })]));
    assert.equal(pick?.image, "front_pose");
  });
  it("a map-less entry refuses (a structure lock with no map is drift)", () => {
    assert.throws(
      () => fireControlNets(ZIMAGE, params([entry({ image_b64: "", artifact: "" })])),
      /no conditioning image/,
    );
    assert.throws(
      () => fireControlNets(ZIMAGE, params([{ type: "depth", model: UNION, strength: 1 }])),
      /no conditioning image/,
    );
  });
  it("malformed rows refuse, each naming its fault", () => {
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ type: "" })])), /names no type/);
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ model: "" })])), /carries no weight file/);
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ strength: 3 })])), /strength = 3/);
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ strength: "high" })])), /strength = high/);
    assert.throws(
      () => fireControlNets(ZIMAGE, params([entry({ start_percent: 0.5, end_percent: 0.4 })])),
      /step range/,
    );
    assert.throws(
      () => fireControlNets(ZIMAGE, params([entry({ start_percent: 0, end_percent: 0.8 })])),
      /no start\/end inputs/,
    );
  });
  it("the floor clamps UP with a log line; a malformed floor refuses", () => {
    const warns: string[] = [];
    const orig = console.warn;
    console.warn = (m: string): void => { warns.push(m); };
    try {
      const [pick] = fireControlNets(ZIMAGE, params([entry({ strength: 0.4 })], { controlnet_strength_floor: 0.7 }));
      assert.equal(pick?.strength, 0.7);
      assert.ok(warns.some((w) => w.includes("clamped UP")), "the clamp logs");
      const [same] = fireControlNets(ZIMAGE, params([entry({ strength: 0.9 })], { controlnet_strength_floor: 0.7 }));
      assert.equal(same?.strength, 0.9);
    } finally {
      console.warn = orig;
    }
    assert.throws(
      () => fireControlNets(ZIMAGE, params([entry()], { controlnet_strength_floor: 2 })),
      /controlnet_strength_floor/,
    );
  });
});

describe("stackControlNets (the node chain)", () => {
  it("empty picks ride the bare model (byte-stable plain path)", () => {
    const g = new GraphBuilder({});
    const model = g.node("UNETLoader", { unet_name: "u.safetensors" }).out();
    const vae = g.node("VAELoader", { vae_name: "v.safetensors" }).out();
    assert.equal(stackControlNets(g, model, vae, []).nodeId, model.nodeId);
    assert.equal(Object.keys(g.toJSON()).length, 2);
  });
  it("one entry wraps LoadImage + ModelPatchLoader + ZImageFunControlnet in creation order", () => {
    const g = new GraphBuilder({});
    const model = g.node("UNETLoader", { unet_name: "u.safetensors" }).out();
    const vae = g.node("VAELoader", { vae_name: "v.safetensors" }).out();
    stackControlNets(g, model, vae, [{ type: "depth", model: UNION, image: "map.png", strength: 1 }]);
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    assert.deepEqual(Object.values(graph).map((n) => n.class_type), [
      "UNETLoader",
      "VAELoader",
      "LoadImage",
      "ModelPatchLoader",
      "ZImageFunControlnet",
    ]);
    const cn = Object.values(graph)[4]!;
    assert.equal(cn.inputs["strength"], 1);
    const patch = Object.values(graph)[3]!;
    assert.equal(patch.inputs["name"], UNION);
    const img = Object.values(graph)[2]!;
    assert.equal(img.inputs["image"], "map.png");
  });
  it("two entries chain (array order = apply order)", () => {
    const g = new GraphBuilder({});
    const model = g.node("UNETLoader", { unet_name: "u.safetensors" }).out();
    const vae = g.node("VAELoader", { vae_name: "v.safetensors" }).out();
    stackControlNets(g, model, vae, [
      { type: "depth", model: UNION, image: "d.png", strength: 1 },
      { type: "pose", model: UNION, image: "p.png", strength: 0.8 },
    ]);
    const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
    const cns = Object.values(graph).filter((n) => n.class_type === "ZImageFunControlnet");
    assert.equal(cns.length, 2);
    // the second wraps the first (the chain threads through model)
    assert.deepEqual(cns[1]!.inputs["model"], ["ZImageFunControlnet.0", 0]);
  });
});
