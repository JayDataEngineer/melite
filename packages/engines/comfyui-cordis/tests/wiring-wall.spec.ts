// wiring-wall.spec.ts — THE VALUE GATE (the strictness audit's T2:
// the wiring doc carries VALUES, not names — a names-only wall
// judged nothing a graph actually said). The gates here are the
// audit's owed refusals: a combo value outside the declared enum
// and a numeric outside the declared bounds both refuse, naming
// the allowed set; a staged-artifact reference never judges (the
// upload walk rewrites it after every seat); a malformed graph or
// inputs row refuses — the wall never stands down on the one shape
// it exists to judge.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { Context } from "@deepseek-ai/cordis";
import { ComposeRefusal } from "../src/errors.ts";
import { cascadeInit } from "../src/models/models.ts";
import { ComfyUIService } from "../src/service.ts";

await cascadeInit();
import {
  ComfyUIWiringService,
  assertWiringAgainst,
  deriveWiringDoc,
  type WiringInputSpec,
} from "../src/wiringWall.ts";

/** The audit's own fixture, shaped exactly like the live
 *  /object_info: KSampler's sampler combo, cfg bounds, a connection
 *  type; LoadImage's server-side upload list (a DYNAMIC combo —
 *  the carve-out's reason); an optional STRING with no bounds. */
const DOC = {
  KSampler: {
    input: {
      required: {
        model: ["MODEL", { tooltip: "the model" }],
        seed: ["INT", { default: 0, min: 0, max: 18446744073709551615 }],
        cfg: ["FLOAT", { default: 8.0, min: 0.0, max: 100.0, step: 0.1 }],
        sampler_name: [["euler", "euler_ancestral", "heun", "dpmpp_2m"]],
        latent_image: ["LATENT"],
      },
    },
  },
  LoadImage: {
    input: {
      required: {
        image: [["36039.jpg", "cat.png"]],
        upload: ["IMAGEUPLOAD", { image_upload: true }],
      },
      optional: { noop: ["STRING", { default: "" }] },
    },
  },
};

function armed() {
  const { nodes, inputs } = deriveWiringDoc(DOC);
  return { nodes, inputs } as const;
}

function ks(inputs: Record<string, unknown>): unknown {
  return { "1": { class_type: "KSampler", inputs } };
}

describe("deriveWiringDoc (the value-carrying census)", () => {
  it("keeps the enum, the type, and the numeric bounds the declaration states", () => {
    const { nodes, inputs } = armed();
    assert.ok(nodes.has("KSampler") && nodes.has("LoadImage"), "node names ride the census");
    const ksampler = inputs.get("KSampler")!;
    const sampler = ksampler.get("sampler_name")!;
    assert.deepEqual(sampler.enum, ["euler", "euler_ancestral", "heun", "dpmpp_2m"], "the combo enum rides verbatim");
    assert.equal(sampler.required, true, "required-group membership rides");
    const cfg = ksampler.get("cfg")!;
    assert.equal(cfg.type, "FLOAT", "the type name rides");
    assert.equal(cfg.min, 0, "declared min rides");
    assert.equal(cfg.max, 100, "declared max rides");
    assert.equal(ksampler.get("model")!.type, "MODEL", "connection types ride");
    assert.equal(inputs.get("LoadImage")!.get("noop")!.required, false, "optional-group membership rides");
    assert.equal(ksampler.get("seed")!.max, 18446744073709551615, "INT bounds ride");
  });
});

describe("THE VALUE GATE (the audit's T2)", () => {
  it("a combo value outside the declared enum REFUSES, naming the allowed set (the audit's gate)", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "krea-gen", ks({ sampler_name: "banana" })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value"
        && /'krea-gen' wired 'KSampler\.sampler_name' = "banana"/.test(e.message)
        && /4 values \("euler", "euler_ancestral", "heun", "dpmpp_2m"\)/.test(e.message),
    );
  });

  it("a numeric below the declared min REFUSES, naming the bound (the audit's gate)", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "krea-gen", ks({ cfg: -999 })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value"
        && /cfg' = -999/.test(e.message) && /FLOAT/.test(e.message) && /below its declared min 0/.test(e.message),
    );
  });

  it("a numeric above the declared max refuses; a value inside the bounds passes", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", ks({ seed: -1 })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value" && /below its declared min 0/.test(e.message),
    );
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", ks({ cfg: 100.5 })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value" && /above its declared max 100/.test(e.message),
    );
    assertWiringAgainst(nodes, inputs, "c1", ks({ cfg: 7.5, seed: 42, sampler_name: "euler" }));
  });

  it("an enum member passes and a huge enum is named by count with the remainder counted", () => {
    const big: Array<string | number | boolean> = [];
    for (let i = 0; i < 25; i++) big.push(`v${i}`);
    const inputs = new Map<string, ReadonlyMap<string, WiringInputSpec>>([
      ["BigNode", new Map([["pick", { required: true, enum: big }]])],
    ]);
    const nodes = new Set(["BigNode"]);
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", { "1": { class_type: "BigNode", inputs: { pick: "banana" } } }),
      (e: unknown) => e instanceof ComposeRefusal && /25 values \("v0"/.test(e.message) && /\+5 more\)/.test(e.message),
    );
    assertWiringAgainst(nodes, inputs, "c1", { "1": { class_type: "BigNode", inputs: { pick: "v7" } } });
  });

  it("a STAGED-ARTIFACT reference never judges against the enum (the upload walk rewrites it after every seat)", () => {
    const { nodes, inputs } = armed();
    const loader = (image: string): unknown =>
      ({ "1": { class_type: "LoadImage", inputs: { image } } });
    // the audit's carve-out proof: none of these are server names yet —
    // each is rewritten to one AFTER the walk seats, so the enum waits
    assertWiringAgainst(nodes, inputs, "c1", loader("r2.png"));
    assertWiringAgainst(nodes, inputs, "c1", loader("data:image/png;base64,AAAA"));
    assertWiringAgainst(nodes, inputs, "c1", loader("https://art/runs/1/a.png"));
    assertWiringAgainst(nodes, inputs, "c1", loader("/tmp/melite-data-abc.png"));
    // a BARE word is never staged: the enum judges it
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", loader("banana")),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value" && /2 values/.test(e.message),
    );
  });

  it("an artifact-shaped string on a numeric-only enum still judges (T2's residual: a filename can never land there)", () => {
    // The upload walk rewrites to a FILENAME STRING — an enum with
    // no string members can never legally receive one, so the
    // carve-out does not apply and the stale value refuses loud
    // (the old wall let a filename-shaped escape into a mode
    // picker pass silently).
    const inputs = new Map<string, ReadonlyMap<string, WiringInputSpec>>([
      ["ModeNode", new Map([["mode", { required: true, enum: [0, 1, 2] }]])],
    ]);
    const nodes = new Set(["ModeNode"]);
    const wired = (mode: string): unknown =>
      ({ "1": { class_type: "ModeNode", inputs: { mode } } });
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", wired("r2.png")),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value" && /3 values/.test(e.message),
    );
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", wired("data:image/png;base64,AAAA")),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value",
    );
    // the same enum with a string member added reopens the carve-out
    // (a dynamic upload combo is exactly this shape)
    const mixed = new Map<string, ReadonlyMap<string, WiringInputSpec>>([
      ["ModeNode", new Map([["mode", { required: true, enum: [0, 1, "upload.png"] }]])],
    ]);
    assertWiringAgainst(nodes, mixed, "c1", wired("r2.png"));
  });

  it("a connection reference array never judges (the value is another node's output)", () => {
    const { nodes, inputs } = armed();
    assertWiringAgainst(nodes, inputs, "c1", ks({ model: ["3", 0], latent_image: ["2", 0] }));
  });

  it("a $-prefixed MERGE-SEAM SPELL never judges (the run seat walks pre-splice rows)", () => {
    const { nodes, inputs } = armed();
    // the trellis lane's own receipt: conditioning rides $src — the
    // merge seam rewrites every spell to a link tuple or a request
    // initial before the engine (rewriteSpells refuses leftovers)
    const spellDoc = deriveWiringDoc({
      Trellis2Conditioning: { input: { required: { image: [["a.png", "b.png"]] } } },
    });
    assertWiringAgainst(
      spellDoc.nodes,
      spellDoc.inputs,
      "trellis",
      { "1": { class_type: "Trellis2Conditioning", inputs: { image: "$src" } } },
    );
  });

  it("a dotted sub-widget key keeps its name-gate pass (sub-widget addressing is the widget's own)", () => {
    const inputs = new Map<string, ReadonlyMap<string, WiringInputSpec>>([
      ["VHS", new Map([["format", { required: true, enum: ["image/gif", "video/mp4"] }]])],
    ]);
    const nodes = new Set(["VHS"]);
    assertWiringAgainst(nodes, inputs, "c1", {
      "1": { class_type: "VHS", inputs: { "format.quality": 7 } },
    });
  });
});

describe("the malformed-shape refusals (the audit's two fail-opens, closed)", () => {
  it("a null graph REFUSES as malformed-graph (the wall never stands down on it)", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", null),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "malformed-graph" && /no addressable graph/.test(e.message),
    );
  });

  it("an array graph and a bare-value graph refuse (a graph is an object keyed by node id)", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", [{ class_type: "KSampler" }]),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "malformed-graph",
    );
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", "KSampler"),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "malformed-graph",
    );
  });

  it("a present-but-non-object inputs row REFUSES naming the node", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", { "1": { class_type: "KSampler", inputs: "junk" } }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "malformed-graph"
        && /node '1' \(KSampler\) with a non-object inputs row/.test(e.message),
    );
  });

  it("a null/bare node row REFUSES as malformed-graph (the third fail-open, closed)", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", { "1": null, "2": { class_type: "KSampler" } }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "malformed-graph"
        && /node '1' as a bare null/.test(e.message),
    );
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", { "1": "KSampler" }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "malformed-graph"
        && /node '1' as a bare KSampler/.test(e.message),
    );
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", { "1": ["KSampler"] }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "malformed-graph"
        && /node '1' as a bare array/.test(e.message),
    );
  });

  it("an ABSENT inputs row stands down (nothing wired, nothing to judge)", () => {
    const { nodes, inputs } = armed();
    assertWiringAgainst(nodes, inputs, "c1", { "1": { class_type: "KSampler" } });
  });

  it("unarmed (no doc) the wall stands down for every shape — the standing law", () => {
    assertWiringAgainst(null, null, "c1", null);
    assertWiringAgainst(null, undefined, "c1", ks({ sampler_name: "banana" }));
  });

  it("a names-only doc (node not in the inputs map) keeps the input gate waiting", () => {
    const nodes = new Set(["KSampler"]);
    assertWiringAgainst(nodes, new Map(), "c1", ks({ sampler_name: "banana" }));
    assertWiringAgainst(nodes, undefined, "c1", ks({ cfg: -999 }));
  });
});

describe("THE SEAT (the doc-owner's fence: arm, judge, disarm)", () => {
  async function seat(): Promise<{ wall: ComfyUIWiringService; ctx: Context }> {
    const ctx = new Context();
    let wall!: ComfyUIWiringService;
    await ctx.plugin({
      apply(c: Context) {
        wall = new ComfyUIWiringService(c);
      },
    });
    return { wall, ctx };
  }

  it("the wiring service mounts under its own name and starts unarmed", async () => {
    const { ctx, wall } = await seat();
    // (the seat read returns a traceable wrapper, so identity is
    // asserted by availability, never by ===)
    const mounted = ctx.comfyuiWiring;
    assert.ok(mounted !== undefined, "the seat name is the doc's one home");
    assert.equal(typeof mounted.armed, "function", "the mounted seat is the wiring wall");
    assert.equal(wall.armed(), false, "a fresh seat owns no doc");
    // unarmed, the fence call stands down for every shape
    wall.assert("c1", null);
    wall.assert("c1", ks({ sampler_name: "banana" }));
  });

  it("arm() judges through the same walk the free function runs, and null inputs ride as undefined", async () => {
    const { wall } = await seat();
    const { nodes, inputs } = armed();
    wall.arm(nodes, inputs);
    assert.equal(wall.armed(), true);
    assert.throws(
      () => wall.assert("c1", ks({ sampler_name: "banana" })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value",
    );
    // the names-only arm: null inputs keep the node gate alone
    wall.arm(nodes, null);
    wall.assert("c1", ks({ sampler_name: "banana" }));
    assert.throws(
      () => wall.assert("c1", { "1": { class_type: "NotANode" } }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-node",
    );
  });

  it("disarm() stands the whole wall down (a doc-owner whose fetch failed)", async () => {
    const { wall } = await seat();
    const { nodes, inputs } = armed();
    wall.arm(nodes, inputs);
    wall.disarm();
    assert.equal(wall.armed(), false, "the null doc never judges");
    wall.assert("c1", null);
    wall.assert("c1", { "1": { class_type: "NotANode" } });
  });

  it("ComfyUIService.setObjectInfo is the doc-owner: a doc arms the shared seat, null disarms it", async () => {
    const ctx = new Context();
    let wall!: ComfyUIWiringService;
    await ctx.plugin({
      apply(c: Context) {
        wall = new ComfyUIWiringService(c);
        new ComfyUIService(c);
      },
    });
    ctx.comfyui.setObjectInfo(DOC);
    assert.equal(wall.armed(), true, "the service derives and arms the ONE census");
    ctx.comfyui.setObjectInfo(null);
    assert.equal(wall.armed(), false, "a failed fetch disarms — the wall never judges a stale doc");
  });
});

describe("the census degrades (a declaration the doc barely shapes)", () => {
  it("an empty-array spec, a non-array/string head, and a missing detail all contribute what they actually say", () => {
    const { nodes, inputs } = deriveWiringDoc({
      WeirdNode: {
        input: {
          required: {
            empty: [],
            numbered: [42],
            plain: ["MODEL"],
            strdetail: ["INT", "not-an-object"],
          },
        },
      },
    });
    assert.ok(nodes.has("WeirdNode"));
    const row = inputs.get("WeirdNode")!;
    // [] and [42]: no enum, no type — the required flag alone
    assert.deepEqual(row.get("empty"), { required: true });
    assert.deepEqual(row.get("numbered"), { required: true });
    // ["MODEL"]: a type with no detail object carries no bounds
    assert.deepEqual(row.get("plain"), { required: true, type: "MODEL", min: undefined, max: undefined });
    assert.deepEqual(row.get("strdetail"), { required: true, type: "INT", min: undefined, max: undefined });
  });

  it("a value above the declared MAX refuses naming the ceiling (the bound string's other arm)", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", ks({ cfg: 999 })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value"
        && /the input is FLOAT and the value is above its declared max 100/.test(e.message),
    );
  });

  it("an empty or non-string class_type refuses as unknown-node (the graph is not addressable)", () => {
    const { nodes, inputs } = armed();
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", { "1": { class_type: "" } }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-node"
        && /node '1' with no class_type/.test(e.message),
    );
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", { "1": { class_type: 42 } }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "unknown-node",
    );
  });
});
