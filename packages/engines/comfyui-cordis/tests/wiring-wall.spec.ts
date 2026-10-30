// wiring-wall.spec.ts — THE VALUE GATE (the strictness audit's T2:
// the wiring doc carries VALUES, not names — a names-only wall
// judged nothing a graph actually said). The gates here are the
// audit's owed refusals: a combo value outside the declared enum
// and a numeric outside the declared bounds both refuse, naming
// the allowed set; a staged-artifact reference never judges (the
// upload walk rewrites it after every seat); a malformed graph or
// inputs row refuses — the wall never stands down on the one shape
// it exists to judge.
//
// THE COMPLETENESS GRAMMAR (B7, the h3 inject-keys burn's
// §CURES-OWED 5): the wall also walks the DECLARED side back — no
// composed node ships a declared-required input without an edge,
// and every optional-XOR pair in the either-or table is satisfied.
// The arms at the bottom ride the REAL boot fixture doc and the
// REAL h3 film compose (the production builder shape: primed with
// the doc's own defaults) — the RefModExtract class's wall.
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Context } from "@deepseek-ai/cordis";
import { ComposeRefusal } from "@melite/comfyui-card-kit/errors";
import { GraphBuilder, deriveDefaults, type ObjectInfoInput } from "@melite/comfyui-card-kit/graph";
import { instantiateAction } from "@melite/comfyui-card-kit";
import type { ModelFacts } from "@melite/comfyui-card-kit/facts";
import { film } from "@melite/models-h3/actions";
import { t2i as fluxKleinT2i } from "../../../models/flux-klein/src/actions.ts";
import { DECL as fluxKleinDecl } from "../../../models/flux-klein/src/index.ts";
import { t2i as mossImageT2i } from "../../../models/moss-image/src/actions.ts";
import { DECL as mossImageDecl } from "../../../models/moss-image/src/index.ts";
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
  // THE AUTOGROW SHAPE (the 2026-11-09 qwen-img-21 burn): the engine
  // declares variable-entry inputs as COMFY_AUTOGROW_V3 with a
  // template whose `min` is the ENGINE'S OWN floor — min 0 means a
  // zero-entry (fully absent) input is legal at the engine, exactly
  // like TextEncodeQwenImage21.images on the live build.
  QwenAutogrowEncoder: {
    input: {
      required: {
        clip: ["CLIP", {}],
        prompt: ["STRING", { default: "" }],
        images: ["COMFY_AUTOGROW_V3", { template: { input: { required: { image: ["IMAGE", {}] } }, min: 0, names: ["image_1"] }, tooltip: "refs" }],
      },
    },
  },
  // the min-1 autogrow stays strict: ComfyMathExpression.values (the
  // fixture's own census) refuses when nothing is wired.
  MathAutogrow: {
    input: {
      required: {
        expression: ["STRING", { default: "" }],
        values: ["COMFY_AUTOGROW_V3", { template: { input: { required: { value: ["FLOAT", {}] } }, min: 1, names: ["a"] }, tooltip: "vals" }],
      },
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
    // the satisfied case wires every required input (the reverse
    // arm demands the declared-required set ride the row)
    assertWiringAgainst(nodes, inputs, "c1", ks({
      cfg: 7.5, seed: 42, sampler_name: "euler",
      model: ["3", 0], latent_image: ["2", 0],
    }));
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

  // The video sweep (2026-10-13, F1): ComfyUI ≥ 0.38 spells combos
  // as ["COMBO", {options}] and ["COMFY_DYNAMICCOMBO_V3", {options:
  // [{key}, …]}]; the string-head arm read only the type name and
  // stood down on every modern pin — the video genre's model pins
  // were judged by nobody.
  describe("the modern combo spellings (the video sweep's F1)", () => {
    const MODERN = {
      CreateVideo: {
        input: {
          required: {
            bit_depth: ["COMBO", { options: ["auto", 8, 10] }],
            codec: ["COMBO", { options: ["libx264", "prores"] }],
          },
        },
      },
      SeedVR2LoadDiTModel: {
        input: {
          required: {
            model: ["COMFY_DYNAMICCOMBO_V3", {
              options: [
                { key: "seedvr2_fp16.safetensors", label: "fp16" },
                { key: "seedvr2_fp8.safetensors", label: "fp8" },
                { label: "a row with no key is not a choice" },
              ],
            }],
          },
        },
      },
      EmptyCombo: {
        input: {
          required: { mode: ["COMBO", { options: [] }] },
        },
      },
    };

    function modern() {
      return deriveWiringDoc(MODERN);
    }

    it("derives the enum from spec[1].options — the string-head arm no longer stands down", () => {
      const { inputs } = modern();
      assert.deepEqual(inputs.get("CreateVideo")?.get("bit_depth")?.enum, ["auto", 8, 10]);
      assert.deepEqual(inputs.get("CreateVideo")?.get("codec")?.enum, ["libx264", "prores"]);
    });

    it("derives the enum from COMFY_DYNAMICCOMBO_V3 option key rows", () => {
      const { inputs } = modern();
      assert.deepEqual(
        inputs.get("SeedVR2LoadDiTModel")?.get("model")?.enum,
        ["seedvr2_fp16.safetensors", "seedvr2_fp8.safetensors"],
      );
    });

    it("an empty options list is a declaration that says nothing — no enum, no judgment", () => {
      const { inputs } = modern();
      assert.equal(inputs.get("EmptyCombo")?.get("mode")?.enum, undefined);
    });

    it("a renamed weight on a modern pin refuses (a renamed rife47.pth cannot sail through)", () => {
      const { nodes, inputs } = modern();
      assert.throws(
        () => assertWiringAgainst(nodes, inputs, "c1",
          { "1": { class_type: "SeedVR2LoadDiTModel", inputs: { model: "rife48.pth" } } }),
        (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value" && /2 values/.test(e.message),
      );
      assertWiringAgainst(nodes, inputs, "c1",
        { "1": { class_type: "SeedVR2LoadDiTModel", inputs: { model: "seedvr2_fp16.safetensors" } } });
    });

    it("a string widget value matches a numeric member (the engine's own coercion direction)", () => {
      const { nodes, inputs } = modern();
      assertWiringAgainst(nodes, inputs, "c1",
        { "1": { class_type: "CreateVideo", inputs: { bit_depth: "8", codec: "libx264" } } });
      // a number never matches a string member — the wall is never
      // looser than the engine it guards
      assert.throws(
        () => assertWiringAgainst(nodes, inputs, "c1",
          { "1": { class_type: "CreateVideo", inputs: { bit_depth: 8, codec: 8 } } }),
        (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value",
      );
    });
  });

  it("a STAGED-ARTIFACT reference never judges against the enum (the upload walk rewrites it after every seat)", () => {
    const { nodes, inputs } = armed();
    // the upload key rides the row (the estate's own LoadImage rows
    // wire it — the forward pass carries it as a widget-serialization
    // key; the reverse arm demands the declared-required set, and the
    // real doc declares both image and upload required)
    const loader = (image: string): unknown =>
      ({ "1": { class_type: "LoadImage", inputs: { image, upload: "image" } } });
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
    // THE FOLDER-VALUE HINT (friction-report #3, 2026-10-28): a
    // run-tree mask-frames FOLDER wired to the single-image seat
    // refused with the bare "stale compose" suffix — the agent
    // re-read the engine build instead of the seat shape. A
    // path-like non-file value names the miss: folders never
    // stage, bind one file. A bare word keeps the old text.
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", loader("runs/run-abc/mask_frames")),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value"
        && /a folder path never stages/.test(e.message)
        && /bind one staged file/.test(e.message),
    );
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", loader("banana")),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value"
        && !/a folder path never stages/.test(e.message),
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
    // the full required set rides (the reverse arm demands it); the
    // connection arrays never reach the value gate
    assertWiringAgainst(nodes, inputs, "c1", ks({
      model: ["3", 0], latent_image: ["2", 0],
      seed: 1, cfg: 7, sampler_name: "euler",
    }));
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

  it("an ABSENT inputs row judges by the reverse arm: a class with declared requireds refuses; a class with none stands down", () => {
    const { nodes, inputs } = armed();
    // KSampler declares required inputs — no inputs row is every
    // required input missing at once (B7's completeness grammar)
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", { "1": { class_type: "KSampler" } }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-required"
        && /node '1' \(KSampler\) without its declared-required input/.test(e.message),
    );
    // a class declaring only optionals stands down on an absent row
    // (nothing required, nothing owed)
    const optOnly = deriveWiringDoc({
      Chill: { input: { optional: { pad: ["STRING", { default: "" }] } } },
    });
    assertWiringAgainst(optOnly.nodes, optOnly.inputs, "c1", { "1": { class_type: "Chill" } });
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

// ── THE COMPLETENESS GRAMMAR (B7 — the h3 inject-keys burn's
//  §CURES-OWED 5 / the timeline-calls burn's §CURES-OWED 6, coverage
//  rows 5/14/17): the wall walks the DECLARED side back. The arms
//  ride the REAL boot fixture doc (tests/walls/fixtures/
//  object_info.boot.json — read, never edited) and the REAL h3 film
//  compose through the production builder shape (GraphBuilder primed
//  with deriveDefaults(bootDoc) — the card-plane service's own
//  pinDefaults law). The class under wall: MiniMaxH3RefModExtract.
describe("THE COMPLETENESS GRAMMAR (B7: the reverse arm + the either-or table)", () => {
  const bootDoc = JSON.parse(
    readFileSync("tests/walls/fixtures/object_info.boot.json", "utf8"),
  ) as Record<string, { input?: ObjectInfoInput }>;

  const armedBoot = () => deriveWiringDoc(bootDoc);

  /** A MiniMaxH3RefModExtract row with the authored keys only (the
   *  name/mode/concept_type/save the h3 builder writes) — every other
   *  required input left to the arm's judgment. */
  const extract = (inputs: Record<string, unknown>): unknown =>
    ({ "9": { class_type: "MiniMaxH3RefModExtract", inputs } });

  /** The class's required row as the PRIMED builder autofills it:
   *  each declared-required input carries the default its
   *  declaration states (combo-legal by construction). */
  const autofilledExtractRow = (): Record<string, unknown> => {
    const req = ((bootDoc.MiniMaxH3RefModExtract as Record<string, any>).input ?? {}).required ?? {};
    const row: Record<string, unknown> = {};
    for (const [key, specv] of Object.entries(req)) {
      const detail = Array.isArray(specv)
        ? specv.slice(1).find((part) => part && typeof part === "object")
        : undefined;
      row[key] = (detail as { default?: unknown } | undefined)?.default;
    }
    return row;
  };

  /** The window driver's model row — the interpreter's own contract
   *  (the facts door + seed mint; the production path's shape). */
  const WINDOW_MODEL: ModelFacts = {
    id: "h3",
    card: "h3-timeline",
    defaults: {},
    lane_inputs: { unet: "minimax_h3_hybrid_fl2va_ref2va_b30-49-int8.safetensors" },
    variants: [],
    variant_groups: [],
    outputs: [],
  };

  /** The REAL film compose through the PRODUCTION builder: the
   *  primed GraphBuilder autofills the declared defaults exactly as
   *  the card-plane service does (its pinDefaults). */
  const composeFilm = (): ReturnType<GraphBuilder["toJSON"]> => {
    const g = new GraphBuilder(deriveDefaults(bootDoc));
    instantiateAction(
      film,
      {
        variant: "t4_open", length: 124, prompt: "a slow push in", seed: 42,
        loras: [{ name: "distill-8.safetensors", strength: 0.6, steps: 8 }],
        ref_mods: ["/melite-media/runs/hero/vanellope.png"],
      },
      WINDOW_MODEL, g, "b7_class_wall",
    );
    return g.toJSON();
  };

  const extractRowOf = (graph: Record<string, { class_type: string; inputs: Record<string, unknown> }>) => {
    const found = Object.entries(graph).find(([, n]) => n.class_type === "MiniMaxH3RefModExtract");
    assert.ok(found, "the film compose builds the RefModExtract creator node");
    return found;
  };

  it("(a) THE REVERSE ARM: a built node lacking a declared-required edge refuses, naming the node and the input", () => {
    const { nodes, inputs } = armedBoot();
    // the authored row alone: 13 of the class's 15 required inputs
    // are missing — the arm refuses on the first, naming node '9'
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "h3-timeline", extract({
        name: "vanellope", mode: "Compressed Reference",
      })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-required"
        && /node '9' \(MiniMaxH3RefModExtract\) without its declared-required input '(background_retention|concept_type|description|identity|latent_frames|max_tokens|merge|motion_only|multiplier|pool_h|pool_w|ref_resolution)'/.test(e.message)
        && /required input is missing/.test(e.message),
    );
    // a controlled doc names the exact input: KSampler minus its
    // model edge refuses naming 'model'
    const { nodes: kn, inputs: ki } = armed();
    assert.throws(
      () => assertWiringAgainst(kn, ki, "c1", { "1": { class_type: "KSampler", inputs: { seed: 1 } } }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-required"
        && /without its declared-required input 'model'/.test(e.message),
    );
  });

  it("(a) the reverse arm reads the dotted base: a sub-widget key carries its declared input's edge", () => {
    const { nodes, inputs } = armedBoot();
    // refs_image is declared optional; a dotted grown-slot key
    // (refs_image.ref_image_0) satisfies the base's presence the way
    // the forward pass reads it — no missing-required false refusal.
    // The either-or pair rides wired, so the dotted base is this
    // arm's only variable.
    const full = autofilledExtractRow();
    full["refs_image.ref_image_0"] = ["1", 0];
    full.vae = ["5", 0];
    assertWiringAgainst(nodes, inputs, "h3-timeline", extract(full));
  });

  it("(b) THE EITHER-OR ARM: a RefModExtract with neither av_encoder nor vae refuses with the engine's own voice", () => {
    const { nodes, inputs } = armedBoot();
    const full = autofilledExtractRow();
    // every required input rides; the pair is absent — the reverse
    // arm passes, the either-or arm speaks the pack's execute law
    // (vendor/ComfyUI-MiniMaxH3Mod/nodes.py:1768)
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "h3-timeline", extract(full)),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-required"
        && /with neither 'av_encoder' nor 'vae'/.test(e.message)
        && /connect an av_encoder \(MiniMax-H3 VAE loader\) or a standard VAE\./.test(e.message),
    );
    // EITHER half satisfies the pair — the law is at-least-one
    assertWiringAgainst(nodes, inputs, "h3-timeline", extract({ ...full, vae: ["5", 0] }));
    assertWiringAgainst(nodes, inputs, "h3-timeline", extract({ ...full, av_encoder: ["5", 0] }));
    // and a node the table does not name is judged by nothing here
    const { nodes: kn, inputs: ki } = armed();
    assertWiringAgainst(kn, ki, "c1", ks({
      model: ["3", 0], latent_image: ["2", 0], seed: 1, cfg: 7, sampler_name: "euler",
    }));
  });

  it("(c) THE SATISFIED CASE composes green: the REAL film graph, built through the production builder, walks the real doc — and its vae edge is the living proof", () => {
    const { nodes, inputs } = armedBoot();
    const graph = composeFilm();
    const [id, row] = extractRowOf(graph);
    // the primed builder autofilled the declared defaults (the
    // production shape) and the VAE EDGE rode the compose
    assert.deepEqual(row.inputs.vae, expectVaeEdge(graph, id), "the extract's vae edge rides the family VAE loader");
    // the wall greens the whole film graph as the estate composes it
    assertWiringAgainst(nodes, inputs, "h3-timeline", graph);
    // THE HERMETIC TOGGLE: the same composed row minus the vae edge —
    // exactly the 2026-11-06 burn's shape — reds AT COMPOSE with the
    // engine's voice. (The live file toggle's verbatim capture lives
    // in dev_docs/audits/journey/b7-wiring-completeness-2026-10-17.md.)
    delete row.inputs.vae;
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "h3-timeline", graph),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-required"
        && new RegExp(`node '${id}' \\(MiniMaxH3RefModExtract\\) with neither 'av_encoder' nor 'vae'`).test(e.message)
        && /connect an av_encoder \(MiniMax-H3 VAE loader\) or a standard VAE\./.test(e.message),
    );
  });

  it("(d) THE AUTOGROW LAW (the 2026-11-09 qwen-img-21 burn): a COMFY_AUTOGROW_V3 input whose template declares min 0 is satisfied by ABSENCE — the engine's own zero-entry validation — and a min-1 autogrow still refuses unnamed", () => {
    // THE BURN: the operator's engine rebuild declared
    // TextEncodeQwenImage21.images as COMFY_AUTOGROW_V3 (template
    // min 0) and every pure-t2i qwen-img-21 compose REFUSED LIVE at
    // this wall — 'built node without its declared-required input
    // images' — while the ENGINE accepts the absent key (its own
    // template floor is zero entries). The wall judged a law the
    // engine never stated; this arm pins the engine's own floor.
    const { nodes, inputs } = armed();
    // min 0 + absent: LEGAL — the zero-entry autogrow is the engine's
    // own pure-t2i shape (born red: the wall refused this exact row)
    assertWiringAgainst(nodes, inputs, "image-gen", {
      "1": { class_type: "QwenAutogrowEncoder", inputs: { clip: ["2", 0], prompt: "a cat" } },
    });
    // min 0 + dotted entries: still legal (the reference arm's shape)
    assertWiringAgainst(nodes, inputs, "image-gen", {
      "1": { class_type: "QwenAutogrowEncoder", inputs: { clip: ["2", 0], prompt: "a cat", "images.image_1": ["3", 0] } },
    });
    // min 1 + absent: REFUSES naming the input (ComfyMathExpression's
    // own floor — the strictness never loosens past the engine's)
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "image-gen", {
        "1": { class_type: "MathAutogrow", inputs: { expression: "a" } },
      }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "missing-required"
        && /without its declared-required input 'values'/.test(e.message),
    );
    // THE REAL BURN ROW against the REAL boot doc: the engine's own
    // TextEncodeQwenImage21 with no images keys walks green
    const boot = armedBoot();
    assertWiringAgainst(boot.nodes, boot.inputs, "image-gen", {
      "1": { class_type: "TextEncodeQwenImage21", inputs: { clip: ["2", 0], prompt: "a cat", negative_prompt: "", resolution: 1024 } },
    });
  });

  it("(e) THE SERVED T2I ARM (the 2026-10-20 image-gen burn + the same-day weave burn): the boarded flux-klein + moss-image t2i composes wire the sampler's declared-required inputs — the engine refused the prompt without latent_image, and moss-image now rides the template's plain KSampler", () => {
    // THE BURN: card 'image-gen' built node 'SamplerCustomAdvanced.0'
    // without its declared-required input 'latent_image' — the empty
    // latent was composed but never wired, and the engine refused the
    // prompt. The klein lane carried the dangling build. THE WEAVE
    // BURN (same day, operator order: match the original workflow):
    // moss-image's sampling core is the Comfy-Org template's plain
    // KSampler over the SLG-patched model — the klein-tuned
    // Flux2Scheduler ladder never belonged on this lane. The arm
    // composes each family's REAL t2i through the production builder
    // and walks the REAL composed sampler row against the REAL boot
    // doc — the row alone, so the wall judges the burn's own edges
    // and never the fixture's stale value census (the recording
    // predates these families' weights).
    const { nodes, inputs } = armedBoot();
    const fluxLane = fluxKleinDecl.lane_inputs;
    assert.ok(fluxLane, "the flux-klein DECL declares lane_inputs");
    const mossLane = mossImageDecl.lane_inputs;
    assert.ok(mossLane, "the moss-image DECL declares lane_inputs");
    const factsOf = (id: string, lane: typeof fluxLane): ModelFacts => ({
      id, card: "image-gen", defaults: {}, lane_inputs: lane,
      variants: [], variant_groups: [], outputs: [],
    });
    const samplerRowOf = (
      action: typeof fluxKleinT2i, facts: ModelFacts,
    ): Record<string, { class_type: string; inputs: Record<string, unknown> }> => {
      const g = new GraphBuilder(deriveDefaults(bootDoc));
      instantiateAction(action, {
        prompt: "a quiet hallway", negative_prompt: "blur",
        width: 1024, height: 1024, seed: 7, steps: 4, cfg: 1,
        sampler: "euler", scheduler: "simple",
      }, facts, g, "e_wall_t2i");
      const graph = g.toJSON() as Record<string, { class_type: string; inputs: Record<string, unknown> }>;
      const found = Object.entries(graph).find(([, n]) => n.class_type === "SamplerCustomAdvanced" || n.class_type === "KSampler");
      assert.ok(found, `the ${facts.id} t2i compose builds the sampler node (the advanced stack or the template's plain KSampler)`);
      return { [found[0]]: found[1] };
    };
    assertWiringAgainst(nodes, inputs, "image-gen", samplerRowOf(fluxKleinT2i, factsOf(fluxKleinDecl.id, fluxLane)));
    assertWiringAgainst(nodes, inputs, "image-gen", samplerRowOf(mossImageT2i, factsOf(mossImageDecl.id, mossLane)));
  });
});

/**
 * THE DYNAMIC-COMBO WIRE (the F23 burn, 2026-10-30): the rebuilt
 * MinimaxH3LatentUpscaler3D declares `mode` as a
 * COMFY_DYNAMICCOMBO_V3 whose children (`scale`, `width`, `height`,
 * `megapixels`) the engine expands into TOP-LEVEL wire keys for the
 * selected option — the shape below is the production /object_info
 * row (data/tmp/object_info_prod.json). The card's compose (the
 * multiplier arm, flat `mode` + `scale`) is CORRECT; the derivation
 * read only the top level and refused the key the engine accepts.
 */
const DYNAMIC_DOC = {
  MinimaxH3LatentUpscaler3D: {
    input: {
      required: {
        latent: ["*", { tooltip: "Input latent (image or video)." }],
        model_name: ["COMBO", {
          tooltip: "Minimax H3 upscale model.",
          options: ["minimax_h3_latent_upscaler_3d_bf16.safetensors"],
        }],
        mode: ["COMFY_DYNAMICCOMBO_V3", {
          tooltip: "How the target size is computed.",
          options: [
            { key: "scale by multiplier", inputs: { required: { scale: ["FLOAT", { tooltip: "Upscale factor.", default: 2, min: 1, max: 4, step: 0.05 }] } } },
            { key: "target dimensions", inputs: { required: {
              width: ["INT", { tooltip: "Target pixel width.", default: 1280, min: 64, max: 4096, step: 8 }],
              height: ["INT", { tooltip: "Target pixel height.", default: 704, min: 64, max: 4096, step: 8 }],
            } } },
            { key: "megapixels", inputs: { required: { megapixels: ["FLOAT", { default: 1, min: 0.1, max: 8, step: 0.1 }] } } },
          ],
        }],
        align: ["INT", { default: 32, min: 1, max: 512, step: 1 }],
        keep_proportion: ["BOOLEAN", { default: true }],
        device: ["COMBO", { default: "cuda", options: ["cuda", "cpu"] }],
        precision: ["COMBO", { default: "fp16", options: ["fp32", "fp16", "bf16"] }],
        offload_after_upscale: ["BOOLEAN", { default: false }],
      },
    },
  },
};

/** The shipped multiplier arm — chainUpscale.ts's own inputs row: a
 *  DynamicCombo child is addressed by its DOTTED path (`mode.scale`),
 *  the spelling the live receipt (prompt 46bf3a93) proved validates.
 *  This is the OTHER class's law — the flat handoff below takes a flat
 *  `scale` (its own required top-level seat). */
const UPSCALE_MULTIPLIER_ROW = {
  latent: ["1", 2],
  model_name: "minimax_h3_latent_upscaler_3d_bf16.safetensors",
  mode: "scale by multiplier", "mode.scale": 2.0,
  align: 32, keep_proportion: true,
  device: "cuda", precision: "bf16", offload_after_upscale: true,
};

describe("THE DYNAMIC-COMBO WIRE (the F23 burn: nested children ARE wire keys)", () => {
  it("a dynamic combo's option children are declared seats, and the shipped multiplier row walks green", () => {
    const { nodes, inputs } = deriveWiringDoc(DYNAMIC_DOC);
    const decl = inputs.get("MinimaxH3LatentUpscaler3D")!;
    assert.deepEqual(
      decl.get("mode")!.enum,
      ["scale by multiplier", "target dimensions", "megapixels"],
      "the option keys ride the value gate (a mode outside them still refuses)",
    );
    for (const child of ["scale", "width", "height", "megapixels"]) {
      const spec = decl.get(child);
      assert.ok(spec, `'${child}' is a declared seat of the node`);
      assert.equal(spec.required, false, `'${child}' is conditional — the flat required arm never owes it`);
    }
    assert.equal(decl.get("scale")!.min, 1, "a flattened child keeps the value facts its option declares");
    assert.equal(decl.get("scale")!.max, 4, "the factor ceiling rides the child");
    // THE BURN'S OWN ROW: red before this cure ('the node declares no
    // such input … scale'), green after — the derivation now declares
    // the combo's children, and the shipped composer addresses them
    // with the dotted `mode.child` spelling that validated live.
    assertWiringAgainst(nodes, inputs, "h3-timeline", { "3": { class_type: "MinimaxH3LatentUpscaler3D", inputs: UPSCALE_MULTIPLIER_ROW } });
  });

/**
 * THE FLAT HANDOFF'S OWN DECLARATION (production /object_info, the
 * round-6 audit's F23 blocker): MinimaxH3LatentUpscaler3DRefineHandoff
 * is a DIFFERENT node from the DynamicCombo one above — its `mode` is
 * a plain combo and `scale` is a required TOP-LEVEL FLOAT. The refine
 * composer mounts THIS class (packages/models/h3/src/refine.ts); the
 * dotted `mode.scale` spelling belongs to MinimaxH3LatentUpscaler3D
 * only. A future hand that "fixes" the refine row to the dotted child
 * reds here with unknown-input naming mode.scale.
 */
const FLAT_HANDOFF_DOC = {
  MinimaxH3LatentUpscaler3DRefineHandoff: {
    input: {
      required: {
        latent: ["LATENT"],
        noise: ["NOISE"],
        sampler: ["SAMPLER"],
        sigmas: ["SIGMAS"],
        model_name: ["COMBO", { options: ["minimax_h3_latent_upscaler_3d_bf16.safetensors"] }],
        mode: ["COMBO", { options: ["scale by multiplier", "target dimensions", "megapixels"], default: "scale by multiplier" }],
        scale: ["FLOAT", { default: 2, min: 1, max: 4, step: 0.05 }],
        width: ["INT", { default: 1280, min: 64, max: 4096, step: 8 }],
        height: ["INT", { default: 704, min: 64, max: 4096, step: 8 }],
        megapixels: ["FLOAT", { default: 1, min: 0.1, max: 8, step: 0.1 }],
        align: ["INT", { default: 32, min: 1, max: 512, step: 1 }],
        keep_proportion: ["BOOLEAN", { default: true }],
        lock_audio: ["BOOLEAN", { default: true }],
        cfg: ["FLOAT", { default: 1, min: 0, max: 100, step: 0.1 }],
        device: ["COMBO", { default: "cuda", options: ["cuda", "cpu"] }],
        precision: ["COMBO", { default: "fp16", options: ["fp32", "fp16", "bf16"] }],
        offload_after_upscale: ["BOOLEAN", { default: false }],
      },
      optional: {
        audio_latent: ["LATENT"],
        refine_state: ["REFINE_STATE"],
        model: ["MODEL"],
        positive: ["CONDITIONING"],
        negative: ["CONDITIONING"],
      },
    },
  },
};

/** The refine composer's own row (flat mode + flat required scale). */
const REFINE_FLAT_ROW = {
  latent: ["1", 0],
  noise: ["2", 0],
  sampler: ["3", 0],
  sigmas: ["4", 0],
  model_name: "minimax_h3_latent_upscaler_3d_bf16.safetensors",
  mode: "scale by multiplier", scale: 2.0,
  lock_audio: true, cfg: 1.0, device: "cuda", precision: "bf16",
  width: 1280, height: 704, megapixels: 1,
  keep_proportion: true, align: 32, offload_after_upscale: false,
};

describe("THE FLAT HANDOFF'S SPELLING (F23 blocker: the dotted child is the OTHER class's)", () => {
  it("the refine composer's flat row walks the flat class green", () => {
    const { nodes, inputs } = deriveWiringDoc(FLAT_HANDOFF_DOC);
    assertWiringAgainst(nodes, inputs, "h3-timeline", {
      "9": { class_type: "MinimaxH3LatentUpscaler3DRefineHandoff", inputs: REFINE_FLAT_ROW },
    });
  });

  it("the same row spelled with the DynamicCombo's dotted child REFUSES — the class declares no mode.scale seat, so `scale` reads MISSING", () => {
    // The engine's own voice for the round-5 mistake: `required input is
    // missing`. The flat class declares no dotted child, so the dotted
    // row loses its required `scale` and the dotted key is unknown.
    const { nodes, inputs, } = deriveWiringDoc(FLAT_HANDOFF_DOC);
    assert.equal(inputs.get("MinimaxH3LatentUpscaler3DRefineHandoff")!.has("mode.scale"), false,
      "no dotted child exists on the flat class");
    const dotted = { ...REFINE_FLAT_ROW, "mode.scale": REFINE_FLAT_ROW.scale };
    delete (dotted as Record<string, unknown>)["scale"];
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "h3-timeline", {
        "9": { class_type: "MinimaxH3LatentUpscaler3DRefineHandoff", inputs: dotted },
      }),
      (e: unknown) => e instanceof ComposeRefusal && /without its declared-required input 'scale'/.test(e.message),
    );
  });
});

  it("the value gate still judges the selection itself: a mode outside the declared options REFUSES", () => {
    const { nodes, inputs } = deriveWiringDoc(DYNAMIC_DOC);
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "h3-timeline", {
        "3": { class_type: "MinimaxH3LatentUpscaler3D", inputs: { ...UPSCALE_MULTIPLIER_ROW, mode: "scale by pixel count" } },
      }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value"
        && /scale by pixel count/.test(e.message),
    );
  });

  it("a flattened child is judged by its own declared bounds (the value facts ride the child, not the combo)", () => {
    const { nodes, inputs } = deriveWiringDoc(DYNAMIC_DOC);
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "h3-timeline", {
        "3": { class_type: "MinimaxH3LatentUpscaler3D", inputs: { ...UPSCALE_MULTIPLIER_ROW, scale: 8 } },
      }),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value"
        && /MinimaxH3LatentUpscaler3D\.scale/.test(e.message),
    );
  });
});

/** The graph id of the VAELoader the film lane pins to the family's
 *  video VAE — the edge the extract's vae input must carry. */
function expectVaeEdge(
  graph: Record<string, { class_type: string; inputs: Record<string, unknown> }>,
  extractId: string,
): unknown {
  void extractId;
  const loader = Object.entries(graph).find(([, n]) =>
    n.class_type === "VAELoader"
    && String(n.inputs.vae_name ?? "").includes("minimax_h3_video_vae"));
  assert.ok(loader, "the family's H3 video VAE loader composes");
  return [loader[0], 0];
}

// ── THE DYNAMIC COMBO'S DEGENERATE DECLARATIONS (2026-11-30, the
// coverage burn): dynamicComboChildren reads a raw /object_info
// tuple, and a raw tuple can carry any shape. A detail that is not an
// object, a detail without an options list, and option rows that are
// not objects each contribute NOTHING — no child seat, no throw. The
// judge is deriveWiringDoc, the walk's one production caller: the
// derived doc is what the node gate and the completeness grammar read.
describe("the dynamic combo's degenerate declarations (a doc that says nothing seats no children)", () => {
  it("a detail that is not an object — string, number, null, array — seats no children", () => {
    const { inputs } = deriveWiringDoc({
      DegenerateCombo: {
        input: {
          required: {
            by_string: ["COMFY_DYNAMICCOMBO_V3", "not-an-object"],
            by_number: ["COMFY_DYNAMICCOMBO_V3", 7],
            by_null: ["COMFY_DYNAMICCOMBO_V3", null],
            by_array: ["COMFY_DYNAMICCOMBO_V3", ["not", "a", "detail"]],
          },
        },
      },
    });
    const row = inputs.get("DegenerateCombo")!;
    // exactly the declared top-level keys ride; no child seat exists
    // for any of them, and the derivation never throws
    assert.deepEqual([...row.keys()].sort(), ["by_array", "by_null", "by_number", "by_string"]);
    for (const spec of row.values()) {
      assert.equal(spec.type, "COMFY_DYNAMICCOMBO_V3", "the string head still names the type");
      assert.equal(spec.enum, undefined, "a dynamic combo without object options carries no enum");
    }
  });

  it("a detail whose options row is missing or not an array seats no children", () => {
    const { inputs } = deriveWiringDoc({
      OptionlessCombo: {
        input: {
          required: {
            no_row: ["COMFY_DYNAMICCOMBO_V3", { tooltip: "the declaration never lists options" }],
            not_a_list: ["COMFY_DYNAMICCOMBO_V3", { options: "two words are not a list" }],
          },
        },
      },
    });
    assert.deepEqual([...inputs.get("OptionlessCombo")!.keys()].sort(), ["no_row", "not_a_list"]);
  });

  it("option rows that are not objects are skipped; the object rows' children still seat, optional", () => {
    const { inputs } = deriveWiringDoc({
      MixedRows: {
        input: {
          required: {
            mode: ["COMFY_DYNAMICCOMBO_V3", {
              options: [
                "a bare string is not a choice",
                7,
                null,
                { key: "a.safetensors", inputs: { required: { scale: ["FLOAT", { default: 1.0, min: 0, max: 8 }] } } },
                { key: "b.safetensors", inputs: { optional: { tiling: ["BOOLEAN", { default: false }] } } },
              ],
            }],
          },
        },
      },
    });
    const row = inputs.get("MixedRows")!;
    // exactly the object rows' children seat — the flat wire keys a
    // composer can emit — and the degenerate rows contribute nothing
    assert.deepEqual([...row.keys()].sort(), ["mode", "scale", "tiling"]);
    assert.equal(row.get("scale")!.required, false, "children ride OPTIONAL seats");
    assert.equal(row.get("scale")!.type, "FLOAT", "the child keeps its own value facts");
    assert.equal(row.get("scale")!.min, 0, "the child's declared bounds ride");
    assert.equal(row.get("tiling")!.required, false, "the optional group's children seat too");
  });
});

// ── THE BOUND REFUSAL'S UNTYPED VOICE (same burn): WiringInputSpec's
// type fact is OPTIONAL at the doc-owner's seam — an inputs map may
// state bounds alone. The refusal must still read as a sentence: the
// input is 'a number', never the undefined word.
describe("the bound refusal over a spec that states bounds without a type name", () => {
  it("reads the input as 'a number' (the optional type fact never renders as undefined)", () => {
    const { nodes } = deriveWiringDoc(DOC);
    const inputs = new Map<string, Map<string, WiringInputSpec>>([
      ["KSampler", new Map([["cfg", { required: true, min: 0, max: 100 }]])],
    ]);
    assert.throws(
      () => assertWiringAgainst(nodes, inputs, "c1", ks({ cfg: -5 })),
      (e: unknown) => e instanceof ComposeRefusal && e.code === "bad-value"
        && /the input is a number and the value is below its declared min 0/.test(e.message)
        && !e.message.includes("undefined"),
    );
  });
});
