// @melite/comfyui-card-kit — the consumption gate's rare arms
// (mods/guard.ts residual branches: the absent-mods row, the null
// controlnet row, the kind-less ip_adapter row, boot gate (d)).
// The boarding-first happy paths ride the controlnet/ip_adapter
// specs; THESE arms own the defensive fallbacks those never reach.
// Same fakes-and-laws convention: describe/it, node:assert/strict,
// LOUD refusals matched with /regex/.
// THE PER-FILE BOOT (tests/helpers/boot-models.ts): the real-decl
// arm below reads the booted registry's facts rows — this import
// stays FIRST so the cascade settles before any module init reads.
import "../../../../tests/helpers/boot-models.ts";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  declaredLaneKeys,
  laneInputsReader,
  laneStringOf,
  loadFacts,
  parseDiffusionLaneFacts,
  parseEditCap,
  type LaneInputsFacts,
  type LaneInputsReader,
  type ModelFacts,
} from "../src/facts.ts";
import {
  getModel, registryIds, registryModel,
} from "../../comfyui-cordis/src/models/models.ts";
import {
  assertModUse,
  assertPackFate,
  fireControlNets,
  fireKnob,
  fireLoras,
  refuseIPAdapterFiring,
} from "../src/mods/guard.ts";

const ZIMAGE = { id: "z-image", mods: ["loras", "controlnet", "ip_adapter"] };

describe("assertModUse (the boarding gate)", () => {
  it("a boarding atom passes (returns nothing)", () => {
    assert.equal(assertModUse(ZIMAGE, "loras"), undefined);
  });

  it("an atom with NO mods row refuses (the ?? [] arm — absent boards nothing)", () => {
    assert.throws(
      () => assertModUse({ id: "solo" }, "loras"),
      /model 'solo' does not board the 'loras' pack/,
    );
  });
});

describe("fireLoras (the empty-bag lane promise on a mods-less atom)", () => {
  it("empty picks ride inert with no gate (no mutation, no throw)", () => {
    assert.deepEqual(fireLoras({ id: "solo" }, {}), []);
  });
});

describe("fireControlNets (the null-row arm)", () => {
  it("a null row reads as the empty row — and refuses naming the missing type (the ?? {} arm)", () => {
    assert.throws(
      () => fireControlNets({ id: "z-image", mods: ["controlnet"] }, { controlnets: [null] }),
      /a controlnet entry names no type/,
    );
  });
});

describe("refuseIPAdapterFiring (the kind-less row)", () => {
  it("a kind-less entry refuses under the '?' name (the cond-expr's second arm)", () => {
    assert.throws(
      () => refuseIPAdapterFiring(ZIMAGE, { ip_adapters: [{}] }),
      /ip_adapters \[\?\] refuses: no executable IP-Adapter lane/,
    );
  });
});

describe("fireLoras", () => {
  it("a non-empty bag fires only on a boarding atom", () => {
    const picks = [{ name: "style.safetensors", strength: 0.8 }]
    assert.deepEqual(fireLoras({ id: "z-image", mods: ["loras"] }, { loras: picks }), picks)
    assert.throws(
      () => fireLoras({ id: "solo" }, { loras: picks }),
      /does not board the 'loras' pack/,
    )
  })
})

describe("fireKnob", () => {
  it("blank and absent values ride without a boarding check", () => {
    assert.equal(fireKnob({ id: "solo" }, "qvoice", "voice", undefined), "")
    assert.equal(fireKnob({ id: "solo" }, "qvoice", "voice", "  \t"), "")
  })

  it("a stated scalar asserts boarding and returns its value", () => {
    const model = { id: "z-image", mods: ["qvoice"] }
    assert.equal(fireKnob(model, "qvoice", "voice", "voice-a"), "voice-a")
    assert.equal(fireKnob(model, "qvoice", "voice", 7), 7)
    assert.throws(
      () => fireKnob({ id: "solo" }, "qvoice", "voice", "voice-a"),
      /does not board the 'qvoice' pack/,
    )
  })
})

describe("assertPackFate (boot gate (d))", () => {
  it("a fated pack passes (fired AND refused fates both ride)", () => {
    assert.equal(assertPackFate("loras"), undefined);
  });

  it("the retired pack has no fate (nothing boards it — a stray boarding would refuse loud)", () => {
    assert.throws(
      () => assertPackFate("lanpaint"),
      /pack 'lanpaint' is boarded but has no fate in this plane/,
    );
  });

  it("a fateless pack refuses loud, naming the pack", () => {
    assert.throws(
      () => assertPackFate("nope"),
      /pack 'nope' is boarded but has no fate in this plane/,
    );
  });
});

describe("the facts door's typed string reader (F7: laneStringOf)", () => {
  it("reads a non-empty string, and judges absent, non-string, and empty as undefined — never a silent default", () => {
    const raw = { a: "keep", b: 21, c: "", d: null, e: undefined };
    assert.equal(laneStringOf(raw, "a"), "keep");
    assert.equal(laneStringOf(raw, "b"), undefined, "a non-string is undefined, not its stringified form");
    assert.equal(laneStringOf(raw, "c"), undefined, "empty is undefined");
    assert.equal(laneStringOf(raw, "d"), undefined);
    assert.equal(laneStringOf(raw, "e"), undefined);
    assert.equal(laneStringOf(raw, "absent"), undefined);
    assert.equal(laneStringOf({}, "a"), undefined);
  });
});

// @contract models-lane-facts-reader
describe("THE TYPED LANE READER (stroke 1's reader half — refuses a lane key the DECL never declared)", () => {
  // The minimal row: the DECLARED set is the base lane_inputs ∪ every
  // variant's own — 'variant_only' declares at the variant, 'ghost'
  // declares at the base but rides no raw under test (the declared-
  // but-absent read arm), and the first variant carries NO
  // lane_inputs key at all (the declaredLaneKeys ?? {} arm). The
  // parse keys declare here too — the parser arms read them.
  const MODEL: ModelFacts = {
    id: "probe-family",
    card: "probe-card",
    defaults: {},
    lane_inputs: {
      keep: "kept.safetensors", ghost: "g.safetensors", num: 21, blank: "", nul: null,
      unet: "u.safetensors", text_encoder: "t.safetensors", vae: "v.safetensors",
      clip_type: "qwen_image", latent_node: "EmptySD3LatentImage", max_images: 16,
      sampling_shift: 0.5,
    },
    variants: [
      { id: "v", label: "V", group: "g", route: "", resolver_defaults: {}, defaults: {}, cells: [] },
      { id: "lv", label: "LV", group: "g", route: "", resolver_defaults: {}, defaults: {}, cells: [], lane_inputs: { variant_only: "v.safetensors" } },
    ],
    variant_groups: [],
    outputs: [],
  };
  const readerOf = (raw: LaneInputsFacts): LaneInputsReader => laneInputsReader(MODEL, raw, "probe act");

  it("declaredLaneKeys is the base ∪ variants union — variant-only keys and lane-less variants both ride", () => {
    assert.deepEqual([...declaredLaneKeys(MODEL)].sort(), [
      "blank", "clip_type", "ghost", "keep", "latent_node", "max_images",
      "nul", "num", "sampling_shift", "text_encoder", "unet", "vae", "variant_only",
    ]);
  });

  it("get() returns the declared value — the base key and the variant-only key alike", () => {
    assert.equal(readerOf({ keep: "kept.safetensors", variant_only: "v.safetensors" }).get("keep"), "kept.safetensors");
    assert.equal(readerOf({ keep: "kept.safetensors", variant_only: "v.safetensors" }).get("variant_only"), "v.safetensors");
  });

  it("get() of a declared-but-absent key returns undefined (absence is data, not drift)", () => {
    assert.equal(readerOf({}).get("ghost"), undefined);
    assert.equal(readerOf({}).get("keep"), undefined);
  });

  it("get() of an undeclared key refuses loud, naming the key and the DECL", () => {
    assert.throws(
      () => readerOf({ undeclared_probe: "x" }).get("undeclared_probe"),
      /^Error: probe act: lane_inputs\.undeclared_probe — the DECL never declared this key$/,
    );
  });

  it("stringOf is the laneStringOf law over declared keys: non-string, empty, null, and absent all read undefined", () => {
    const reader = readerOf({ num: 21, blank: "", nul: null });
    assert.equal(reader.stringOf("num"), undefined, "a non-string is undefined, not its stringified form");
    assert.equal(reader.stringOf("blank"), undefined, "empty is undefined");
    assert.equal(reader.stringOf("nul"), undefined);
    assert.equal(reader.stringOf("ghost"), undefined, "declared but absent is undefined");
    assert.equal(readerOf({ keep: "kept.safetensors" }).stringOf("keep"), "kept.safetensors");
  });

  it("stringOf of an undeclared key throws the same DECL refusal (the same refusal, never a silent undefined)", () => {
    assert.throws(
      () => readerOf({}).stringOf("undeclared_probe"),
      /^Error: probe act: lane_inputs\.undeclared_probe — the DECL never declared this key$/,
    );
  });

  it("requireText of an undeclared key fires the DECL refusal FIRST — never the non-empty-string one", () => {
    assert.throws(
      () => readerOf({}).requireText("undeclared_probe", "probe act"),
      /^Error: probe act: lane_inputs\.undeclared_probe — the DECL never declared this key$/,
    );
    try {
      readerOf({}).requireText("undeclared_probe", "probe act");
      assert.fail("unreachable");
    } catch (e) {
      assert.ok(e instanceof Error);
      assert.match(e.message, /the DECL never declared/);
      assert.doesNotMatch(e.message, /non-empty string/);
    }
  });

  it("requireText of a declared-but-empty key throws the pinned non-empty-string message", () => {
    assert.throws(
      () => readerOf({ blank: "" }).requireText("blank", "probe act"),
      /^Error: probe act: lane_inputs\.blank = "" — a non-empty string is required$/,
    );
    assert.throws(
      () => readerOf({ num: 21 }).requireText("num", "probe act"),
      /^Error: probe act: lane_inputs\.num = 21 — a non-empty string is required$/,
    );
    assert.equal(readerOf({ keep: "kept.safetensors" }).requireText("keep", "probe act"), "kept.safetensors");
  });

  it("parseDiffusionLaneFacts rides the reader and still parses a real row", () => {
    const gate = { key: "latent_node", node: "EmptySD3LatentImage" } as const;
    const lane: LaneInputsFacts = {
      unet: "u.safetensors",
      text_encoder: "t.safetensors",
      vae: "v.safetensors",
      clip_type: "qwen_image",
      latent_node: "EmptySD3LatentImage",
    };
    const parsed = parseDiffusionLaneFacts(readerOf(lane), "probe act", gate);
    assert.deepEqual(parsed, {
      unet: "u.safetensors",
      text_encoder: "t.safetensors",
      vae: "v.safetensors",
      clip_type: "qwen_image",
      node: "EmptySD3LatentImage",
      sampling_shift: undefined,
    });
    // a declared-but-undefined shift rides the default-true check
    assert.equal(parseDiffusionLaneFacts(readerOf({ ...lane, sampling_shift: undefined }), "probe act", gate).sampling_shift, undefined);
    // the gate refusal and the reader refusal stay distinct
    assert.throws(
      () => parseDiffusionLaneFacts(readerOf({ ...lane, latent_node: "EmptyLatentImage" }), "probe act", gate),
      /the action builds on EmptySD3LatentImage/,
    );
    // THE PARSE-LEVEL WALL: a DECL that never named a key the door
    // READS (here 'unet') refuses with the DECL refusal — never the
    // slot prose — proving the reader's check precedes every
    // requireText message.
    const SPARSE: Pick<ModelFacts, "lane_inputs" | "variants"> = {
      // latent_node declares: the parser's gate read runs before the
      // slot texts, so the DECL refusal must fire at 'unet', not the
      // gate key
      lane_inputs: { text_encoder: "t.safetensors", vae: "v.safetensors", clip_type: "qwen_image", latent_node: "EmptySD3LatentImage" },
      variants: [],
    };
    assert.throws(
      // shift=false: the parser's read order is gate → shift → the
      // four slot texts, so skipping the shift check lets 'unet' —
      // the first slot text — carry the DECL refusal
      () => parseDiffusionLaneFacts(laneInputsReader(SPARSE, lane, "probe act"), "probe act", gate, false),
      /^Error: probe act: lane_inputs\.unet — the DECL never declared this key$/,
    );
  });

  it("parseEditCap rides the reader: the floor and the number ≥ 1 refusals hold", () => {
    assert.equal(parseEditCap(readerOf({ max_images: 2.7 }), "probe act"), 2);
    assert.throws(
      () => parseEditCap(readerOf({}), "probe act"),
      /^Error: probe act: lane_inputs\.max_images = undefined — a number ≥ 1 is required$/,
    );
    assert.throws(
      () => parseEditCap(readerOf({ max_images: 0 }), "probe act"),
      /^Error: probe act: lane_inputs\.max_images = 0 — a number ≥ 1 is required$/,
    );
    // the same parse-level wall over the cap: an undeclared
    // max_images refuses with the DECL refusal, not the floor prose
    const SPARSE: Pick<ModelFacts, "lane_inputs" | "variants"> = {
      lane_inputs: { text_encoder: "t.safetensors", vae: "v.safetensors" },
      variants: [],
    };
    assert.throws(
      () => parseEditCap(laneInputsReader(SPARSE, { max_images: 4 }, "probe act"), "probe act"),
      /^Error: probe act: lane_inputs\.max_images — the DECL never declared this key$/,
    );
  });
});

describe("THE TYPED LANE READER over the real DECLs — every family row reads clean, every probe refuses", () => {
  // THE BOOT (the kit's established registry face — lanes.spec.ts):
  // the frozen slices file + the LIVE service reads derive the same
  // rows the compose doors serve. No hand matrix: every arm below
  // walks the derived roster.
  const FACTS_PATH = join(
    dirname(fileURLToPath(import.meta.url)),
    "..", "..", "..", "..",
    "packages", "engines", "comfyui-cordis", "data", "model-facts.json",
  );
  const facts = loadFacts(FACTS_PATH, { getModel, registryIds, registryModel });

  // THE DIFFUSION EIGHT: the families whose doors ride the typed
  // reader today — asserted BY FAMILY KEY (row.family, the roster's
  // own attribution), whatever the served addresses spell. (The
  // ninth member died with its family, operator 2026-11-09.)
  const EIGHT = [
    "anima", "z-image", "krea-2", "flux-klein", "moss-image",
    "qwen-img-21", "qwen-img-edit-21", "fibo2-edit",
  ];

  it("declaredLaneKeys is non-empty for every lane-declaring family — the diffusion eight at minimum", () => {
    const declaring = new Set<string>();
    for (const row of Object.values(facts.models)) {
      if (declaredLaneKeys(row).size > 0) declaring.add(row.family ?? row.id);
    }
    for (const family of EIGHT) {
      assert.ok(declaring.has(family), `the diffusion nine: '${family}' declares no lane keys (families declaring: ${[...declaring].sort().join(", ")})`);
    }
    assert.ok(declaring.size >= EIGHT.length, "the derived roster carries the nine");
  });

  it("every declared key of every row reads through the reader without refusal — and the undeclared probe refuses for EVERY family", () => {
    let rows = 0;
    let keys = 0;
    const probed = new Set<string>();
    for (const [address, row] of Object.entries(facts.models)) {
      rows++;
      const family = row.family ?? row.id;
      const reader = laneInputsReader(row, row.lane_inputs, `${family} probe`);
      for (const key of declaredLaneKeys(row)) {
        keys++;
        assert.doesNotThrow(
          () => reader.get(key),
          `${address}: declared key '${key}' refused — the declared set lied`,
        );
      }
      assert.throws(
        () => reader.get("zzz_undeclared_probe"),
        /^Error: .+ lane_inputs\.zzz_undeclared_probe — the DECL never declared this key$/,
        `${address}: the probe rode through undeclared`,
      );
      probed.add(family);
    }
    assert.ok(rows > 0, "the facts file serves rows");
    assert.ok(keys > 0, "the roster carries declared keys");
    for (const family of EIGHT) {
      assert.ok(probed.has(family), `the probe sweep covers '${family}'`);
    }
  });
});
