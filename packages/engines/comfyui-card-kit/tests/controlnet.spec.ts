// @melite/comfyui-card-kit — the ControlNet firing gate + chain
// (the z-image restoration, generalized 002 H2-H5). The gate IS the
// unit: boarding-first firing, the row-capability schedule law, the
// artifact precedence, the clip/mask channels, the row-stamped
// strength ceiling, the floor clamp. The chain IS the graph truth:
// ModelPatchLoader → ZImageFunControlnet per entry, array order,
// creation order — and the still-only honesty wall.
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

describe("assertControlNetSchedule (the ROW's declared capability)", () => {
  it("rides the full schedule on every row", () => {
    assertControlNetSchedule("depth", 0, 1);
    assertControlNetSchedule("h3-fun", 0, 1, "ranged");
    assertControlNetSchedule("h3-fun", 0, 1, "full");
  });
  it("a full-schedule row refuses a range, naming the ROW's type — never a foreign family's node", () => {
    assert.throws(
      () => assertControlNetSchedule("depth", 0, 0.8),
      (err: unknown): boolean =>
        err instanceof Error &&
        err.message.includes("'depth'") &&
        err.message.includes("no start/end inputs") &&
        !err.message.includes("ZImageFunControlnet"),
    );
  });
  it("a 'ranged' row rides any legal window (H3's Fun-ControlNet dials)", () => {
    assertControlNetSchedule("h3-fun", 0, 0.8, "ranged");
    assertControlNetSchedule("h3-fun", 0.2, 0.9, "ranged");
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
  it("fires the resolved pick on the boarding atom (schedule window stamped)", () => {
    assert.deepEqual(fireControlNets(ZIMAGE, params([entry()])), [
      { type: "depth", model: UNION, image: "map.png", strength: 1.0, start_percent: 0, end_percent: 1 },
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
  it("the clip and mask channels ride their own lanes (002 H2/H4)", () => {
    // clip-only: a video-valued entry — image empty, clip set
    const [clipPick] = fireControlNets(ZIMAGE, params([entry({ image_b64: "", artifact: "", clip: "pose_ref.mp4" })]));
    assert.equal(clipPick?.image, "");
    assert.equal(clipPick?.clip, "pose_ref.mp4");
    // mask rides beside a still map, both channels present
    const [masked] = fireControlNets(ZIMAGE, params([entry({ mask: "regions.png" })]));
    assert.equal(masked?.image, "map.png");
    assert.equal(masked?.mask, "regions.png");
    // absent channels stay ABSENT on the pick (exactOptionalPropertyTypes)
    assert.equal("clip" in (clipPick ?? {}), true);
    assert.equal("mask" in (clipPick ?? {}), false);
  });
  it("a map-less entry refuses only when EVERY channel is absent (the words stay)", () => {
    assert.throws(
      () => fireControlNets(ZIMAGE, params([entry({ image_b64: "", artifact: "", clip: "", mask: "" })])),
      /carries no conditioning image \(neither artifact nor image_b64\) — a structure lock with no map is drift, not a skip/,
    );
    assert.throws(
      () => fireControlNets(ZIMAGE, params([{ type: "depth", model: UNION, strength: 1 }])),
      /no conditioning image/,
    );
    // a mask-only entry composes (002 H4 — the mask-shaped lane)
    const [masked] = fireControlNets(ZIMAGE, params([entry({ image_b64: "", artifact: "", mask: "regions.png" })]));
    assert.equal(masked?.mask, "regions.png");
  });
  it("the strength ceiling is the ROW'S stamp (002 H5 — H3's dial runs to 10)", () => {
    // unstamped hand-built row: the pack default 2
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ strength: 3 })])), /\[0, 2\]/);
    // stamped 10: 3 rides, 11 refuses against the row's own ceiling
    const [hi] = fireControlNets(ZIMAGE, params([entry({ strength: 3, strength_max: 10 })]));
    assert.equal(hi?.strength, 3);
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ strength: 11, strength_max: 10 })])), /\[0, 10\]/);
  });
  it("a stamped 'ranged' schedule rides its window onto the pick", () => {
    const [pick] = fireControlNets(
      ZIMAGE,
      params([entry({ start_percent: 0.2, end_percent: 0.8, schedule: "ranged", strength_max: 10 })]),
    );
    assert.equal(pick?.start_percent, 0.2);
    assert.equal(pick?.end_percent, 0.8);
    // an unstamped row still refuses the window (z-image's node law)
    assert.throws(
      () => fireControlNets(ZIMAGE, params([entry({ start_percent: 0, end_percent: 0.8 })])),
      /no start\/end inputs/,
    );
  });
  it("malformed rows refuse, each naming its fault", () => {
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ type: "" })])), /names no type/);
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ model: "" })])), /carries no weight file/);
    assert.throws(() => fireControlNets(ZIMAGE, params([entry({ strength: "high" })])), /strength = high/);
    assert.throws(
      () => fireControlNets(ZIMAGE, params([entry({ start_percent: 0.5, end_percent: 0.4 })])),
      /step range/,
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
  it("a clip/mask-only pick refuses here — this lane serves STILL sources only (002 H2)", () => {
    const g = new GraphBuilder({});
    const model = g.node("UNETLoader", { unet_name: "u.safetensors" }).out();
    const vae = g.node("VAELoader", { vae_name: "v.safetensors" }).out();
    assert.throws(
      () =>
        stackControlNets(g, model, vae, [
          { type: "h3-fun", model: "h3-union.safetensors", image: "", strength: 1, clip: "pose_ref.mp4" },
        ]),
      /no still-image source.*ZImageFunControlnet lane/,
    );
  });
});
